import * as cheerio from 'cheerio';
import { fetchWithRetry } from '../lib/http.js';
import { writeJSON, readJSONIfExists } from '../lib/fs.js';
import { indexFile } from '../lib/paths.js';
import { INDICES } from '../config/indices.js';

// Column header candidates, ordered by preference. Matched as a case-insensitive prefix
// so we tolerate footnote markers like "ICB Industry[14]".
const TICKER_HEADERS = ['ticker', 'symbol'];
const NAME_HEADERS = ['company', 'security'];
const INDUSTRY_HEADERS = [
  'gics sub-industry',
  'icb subsector',
  'gics sector',
  'icb industry',
  'industry',
  'sector',
];

function pickColumn(headers, candidates) {
  const lc = headers.map((h) => h.toLowerCase().trim());
  for (const cand of candidates) {
    const idx = lc.findIndex((h) => h === cand || h.startsWith(cand));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseSingleTable($, table) {
  const allRows = table.find('tr').toArray();
  // The header row is the first row whose children are all <th>.
  let headerIdx = allRows.findIndex((tr) => {
    const children = $(tr).children().toArray();
    return children.length > 0 && children.every((c) => c.tagName === 'th');
  });
  if (headerIdx === -1) headerIdx = 0;

  const headers = $(allRows[headerIdx]).find('th').map((_, el) => $(el).text().trim()).get();
  if (headers.length === 0) return null;

  const tickerCol = pickColumn(headers, TICKER_HEADERS);
  const nameCol = pickColumn(headers, NAME_HEADERS);
  const industryCol = pickColumn(headers, INDUSTRY_HEADERS);
  if (tickerCol === -1 || nameCol === -1) return null;

  const rows = [];
  for (const tr of allRows.slice(headerIdx + 1)) {
    // Some wiki rows put the first cell as <th> (row header). Include both.
    const cells = $(tr).find('th, td').map((_, el) => $(el).text().trim()).get();
    if (cells.length === 0) continue;
    const ticker = cells[tickerCol]?.replace(/\s+/g, '');
    const name = cells[nameCol];
    if (!ticker || !name) continue;
    rows.push({
      symbol: ticker,
      companyName: name,
      industry: industryCol !== -1 ? cells[industryCol] ?? '' : '',
    });
  }
  return rows;
}

// Pages like "Dow Jones Industrial Average" contain multiple wikitables (sector breakdown,
// historical components, current components). Try each and return the first that yields
// rows whose tickers look like real symbols.
function parseWikiTable(html) {
  const $ = cheerio.load(html);
  const tables = $('table.wikitable').toArray();
  if (tables.length === 0) throw new Error('no wikitable found');

  let best = null;
  for (const t of tables) {
    const rows = parseSingleTable($, $(t));
    if (!rows || rows.length === 0) continue;
    const validShare = rows.filter((r) => /^[A-Z][A-Z.\-]{0,9}$/.test(r.symbol)).length / rows.length;
    if (validShare >= 0.9) {
      if (!best || rows.length > best.length) best = rows;
    }
  }
  if (!best) throw new Error('no wikitable parsed into valid ticker rows');
  return best;
}

function parseDatasetsCSV(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(',');
  const tickerCol = pickColumn(headers, TICKER_HEADERS);
  const nameCol = pickColumn(headers, NAME_HEADERS);
  const industryCol = pickColumn(headers, INDUSTRY_HEADERS);
  return lines
    .map((line) => splitCSVLine(line))
    .filter((cols) => cols.length > tickerCol && cols[tickerCol])
    .map((cols) => ({
      symbol: cols[tickerCol].trim(),
      companyName: cols[nameCol]?.trim() ?? '',
      industry: industryCol !== -1 ? cols[industryCol]?.trim() ?? '' : '',
    }));
}

// Minimal CSV split that handles quoted fields with commas (sufficient for the datasets feed).
function splitCSVLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else {
      if (ch === ',') { out.push(cur); cur = ''; }
      else if (ch === '"') inQuotes = true;
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

// Wikipedia's UA policy asks bots to identify themselves with a contact URL.
// See https://meta.wikimedia.org/wiki/User-Agent_policy
const WIKIPEDIA_UA =
  'oh-earnings-cal/2.0.0 (+https://github.com/jason5ng32/OhEarningsCal)';

async function fetchFromSource(source) {
  if (source.type === 'wikipedia') {
    const res = await fetchWithRetry(source.url, {
      headers: { 'user-agent': WIKIPEDIA_UA },
    });
    return parseWikiTable(await res.text());
  }
  if (source.type === 'datasets-csv') {
    const res = await fetchWithRetry(source.url);
    return parseDatasetsCSV(await res.text());
  }
  throw new Error(`unknown source type: ${source.type}`);
}

function validate(rows, expectedCount, slug) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`[${slug}] empty result`);
  }
  // Allow 10% slack — index membership shifts a few names per year.
  const min = Math.floor(expectedCount * 0.9);
  const max = Math.ceil(expectedCount * 1.1);
  if (rows.length < min || rows.length > max) {
    throw new Error(
      `[${slug}] row count ${rows.length} outside expected range [${min}, ${max}]`,
    );
  }
  const badTickers = rows.filter((r) => !/^[A-Z][A-Z.\-]{0,9}$/.test(r.symbol));
  if (badTickers.length > 0) {
    throw new Error(`[${slug}] suspicious tickers: ${badTickers.slice(0, 5).map((r) => r.symbol).join(', ')}`);
  }
}

export async function fetchIndex(meta) {
  const { slug, source, fallback, expectedCount } = meta;
  const sources = [source, ...(fallback ? [fallback] : [])];
  for (const s of sources) {
    try {
      const rows = await fetchFromSource(s);
      validate(rows, expectedCount, slug);
      await writeJSON(indexFile(slug), rows);
      console.log(`[indices] ${slug}: ${rows.length} rows from ${s.type}`);
      return { slug, count: rows.length, source: s.type, status: 'ok' };
    } catch (err) {
      console.warn(`[indices] ${slug}: ${s.type} failed — ${err.message}`);
    }
  }
  // All sources failed — keep whatever's already on disk.
  const cached = await readJSONIfExists(indexFile(slug));
  if (cached) {
    console.warn(`[indices] ${slug}: all sources failed, keeping cached (${cached.length} rows)`);
    return { slug, count: cached.length, source: 'cache', status: 'stale' };
  }
  throw new Error(`[indices] ${slug}: no source succeeded and no cache available`);
}

export async function fetchAllIndices() {
  const summary = [];
  for (const meta of INDICES) {
    try {
      summary.push(await fetchIndex(meta));
    } catch (err) {
      summary.push({ slug: meta.slug, status: 'failed', error: err.message });
      console.error(err.message);
    }
  }
  return summary;
}
