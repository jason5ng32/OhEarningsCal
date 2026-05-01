import { readJSONIfExists } from '../lib/fs.js';
import { indexFile } from '../lib/paths.js';
import { processEarnings } from '../process/earnings.js';
import { writeIcsFile } from '../generate/ics.js';
import { INDICES, CUSTOM_SLUG, SELECTED_SLUG, ALL_SLUG } from '../config/indices.js';
import { env } from '../config/env.js';

async function loadIndex(slug) {
  const rows = await readJSONIfExists(indexFile(slug));
  if (!rows) {
    console.warn(`[gen] missing data/indices/${slug}.json — run 'npm run fetch:indices' first`);
    return [];
  }
  return rows;
}

async function buildCustomWatchlist(allIndexRows) {
  if (env.customStocks.length === 0) return null;
  const lookup = new Map(allIndexRows.map((r) => [r.symbol.toUpperCase(), r]));
  return env.customStocks.map((sym) => {
    const hit = lookup.get(sym);
    return hit ?? { symbol: sym, companyName: sym, industry: '' };
  });
}

async function genForList(slug, label, watchlist) {
  const events = await processEarnings({ watchlist });
  await writeIcsFile({ slug, label, events });
  return events;
}

async function main() {
  // 1. Load each index's constituents and write their ics.
  const allIndexRows = [];
  for (const meta of INDICES) {
    const rows = await loadIndex(meta.slug);
    allIndexRows.push(...rows);
    await genForList(meta.slug, meta.label, rows);
  }

  // 2. Custom watchlist (driven by CUSTOM_STOCKS env var).
  const customWatchlist = await buildCustomWatchlist(allIndexRows);
  if (customWatchlist) {
    await genForList(CUSTOM_SLUG, 'Custom Watchlist', customWatchlist);
  } else {
    console.log('[gen] CUSTOM_STOCKS not set — skipping customstock.ics');
  }

  // 3. selected = union of all indices + custom (de-dup by symbol).
  if (env.shouldGenSelected) {
    const seen = new Set();
    const selected = [];
    for (const r of [...allIndexRows, ...(customWatchlist ?? [])]) {
      const sym = r.symbol.toUpperCase();
      if (seen.has(sym)) continue;
      seen.add(sym);
      selected.push(r);
    }
    await genForList(SELECTED_SLUG, 'Selected (Indices + Custom)', selected);
  }

  // 4. all = no filter, every ticker the API returned.
  if (env.shouldGenAll) {
    await genForList(ALL_SLUG, 'All Earnings', null);
  }

  console.log('[gen] done.');
}

await main();
