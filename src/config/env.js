import 'dotenv/config';

function bool(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

function parseTickers(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export const env = {
  shouldGenSelected: bool(process.env.SHOULD_GEN_SELECTED, true),
  shouldGenAll: bool(process.env.SHOULD_GEN_ALL, true),
  customStocks: parseTickers(process.env.CUSTOM_STOCKS),
  port: Number(process.env.PORT ?? 18302),
};
