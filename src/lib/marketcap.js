// Nasdaq returns market cap as a string like "$3,983,727,339,000" or "N/A".
// Returns null when missing or unparseable so callers can decide how to bucket.
export function parseMarketCap(raw) {
  if (!raw || raw === 'N/A') return null;
  const num = Number(String(raw).replace(/[$,\s]/g, ''));
  return Number.isFinite(num) && num > 0 ? num : null;
}
