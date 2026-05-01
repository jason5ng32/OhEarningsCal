import { readJSONIfExists } from '../lib/fs.js';
import { earningsCacheFile } from '../lib/paths.js';
import { dateRange, shiftDays, todayISO } from '../lib/date.js';

const DEFAULT_WINDOW = { before: 30, after: 30 };

function normalizeTime(raw) {
  if (raw === 'time-pre-market') return 'Pre-market';
  if (raw === 'time-after-hours' || raw === 'time-after-market') return 'After-hours';
  return '';
}

function toEvent(row, dateISO, watchlistEntry) {
  return {
    symbol: row.symbol,
    date: dateISO,
    marketCap: row.marketCap || 'N/A',
    fiscalQuarterEnding: row.fiscalQuarterEnding || '',
    time: normalizeTime(row.time),
    epsForecast: row.epsForecast || '',
    noOfEsts: row.noOfEsts || '',
    companyName: watchlistEntry?.companyName || row.name || row.symbol,
    industry: watchlistEntry?.industry || '',
  };
}

/**
 * Read every cached earnings day in [anchor-before, anchor+after] and produce
 * a normalized, deduplicated, date-sorted list of events.
 *
 * @param {object} opts
 * @param {string} [opts.anchor]    YYYY-MM-DD, defaults to today
 * @param {{before:number, after:number}} [opts.window]
 * @param {Array<{symbol:string, companyName?:string, industry?:string}> | null} [opts.watchlist]
 *        null = no filter (include every ticker the API returned)
 *        []   = filter everything out (returns [])
 *        [..] = keep only listed tickers, enriching companyName/industry from the entry
 */
export async function processEarnings({
  anchor = todayISO(),
  window = DEFAULT_WINDOW,
  watchlist = null,
} = {}) {
  const start = shiftDays(anchor, -window.before);
  const totalDays = window.before + window.after + 1;

  const filterMap = watchlist ? new Map(watchlist.map((w) => [w.symbol.toUpperCase(), w])) : null;
  const events = [];

  for (const date of dateRange(start, totalDays)) {
    const day = await readJSONIfExists(earningsCacheFile(date));
    if (!day || !Array.isArray(day.data)) continue; // weekend / missing / no data

    for (const row of day.data) {
      const sym = row.symbol?.toUpperCase();
      if (!sym) continue;
      if (filterMap && !filterMap.has(sym)) continue;
      events.push(toEvent(row, day.date || date, filterMap?.get(sym)));
    }
  }

  // Dedup by symbol — keeps the latest occurrence (Map overwrites on duplicate keys).
  const dedup = Array.from(new Map(events.map((e) => [e.symbol, e])).values());
  dedup.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return dedup;
}
