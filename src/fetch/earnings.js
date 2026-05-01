import { fetchWithRetry, sleep } from '../lib/http.js';
import { writeJSON, readJSONIfExists } from '../lib/fs.js';
import { earningsCacheFile } from '../lib/paths.js';
import { dateRange, parseNasdaqAsOf, shiftDays, todayISO } from '../lib/date.js';

const NASDAQ_URL = 'https://api.nasdaq.com/api/calendar/earnings';

// Window we keep on disk: yesterday + next 30 days.
const BEFORE_DAYS = 1;
const AHEAD_DAYS = 31;

async function fetchOneDay(isoDate) {
  const res = await fetchWithRetry(`${NASDAQ_URL}?date=${isoDate}`, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9',
      origin: 'https://www.nasdaq.com',
      referer: 'https://www.nasdaq.com/',
    },
  });
  const payload = await res.json();
  const asOf = parseNasdaqAsOf(payload?.data?.asOf) ?? isoDate;
  const rows = payload?.data?.rows ?? null; // null on weekends/holidays
  return { date: asOf, data: rows };
}

/**
 * Fetch the rolling earnings window starting `BEFORE_DAYS` before `anchor`.
 * Writes one JSON file per date into `data/earnings/`.
 * On per-day failure, keeps any existing cached file (best-effort, never throws).
 */
export async function fetchEarningsWindow(anchor = todayISO()) {
  const start = shiftDays(anchor, -BEFORE_DAYS);
  const dates = [...dateRange(start, AHEAD_DAYS)];
  const results = { saved: 0, kept: 0, failed: 0 };

  for (const date of dates) {
    try {
      const day = await fetchOneDay(date);
      await writeJSON(earningsCacheFile(date), day);
      results.saved++;
      console.log(`[earnings] saved ${date} (${day.data?.length ?? 0} rows)`);
    } catch (err) {
      const cached = await readJSONIfExists(earningsCacheFile(date));
      if (cached) {
        results.kept++;
        console.warn(`[earnings] ${date} fetch failed, kept cached copy`);
      } else {
        results.failed++;
        console.error(`[earnings] ${date} failed and no cache: ${err.message}`);
      }
    }
    await sleep(120);
  }

  console.log(
    `[earnings] window done — saved=${results.saved} kept=${results.kept} failed=${results.failed}`,
  );
  return results;
}
