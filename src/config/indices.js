// Metadata for each index that powers an .ics calendar.
// `slug` is the public-facing filename (must not change to keep subscriptions valid).

export const INDICES = [
  {
    slug: 'dow30',
    label: 'Dow 30',
    expectedCount: 30,
    source: {
      type: 'wikipedia',
      url: 'https://en.wikipedia.org/wiki/Dow_Jones_Industrial_Average',
      tableId: 'constituents',
    },
  },
  {
    slug: 'nasdaq100',
    label: 'Nasdaq-100',
    expectedCount: 100,
    source: {
      type: 'wikipedia',
      url: 'https://en.wikipedia.org/wiki/Nasdaq-100',
      tableId: 'constituents',
    },
  },
  {
    slug: 'sp500',
    label: 'S&P 500',
    expectedCount: 500,
    source: {
      type: 'wikipedia',
      url: 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies',
      tableId: 'constituents',
    },
    fallback: {
      type: 'datasets-csv',
      url: 'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv',
    },
  },
];

export const CUSTOM_SLUG = 'customstock';
export const SELECTED_SLUG = 'selected';
export const ALL_SLUG = 'all';

// Market-cap tiers — boundaries are USD, applied to the marketCapValue field
// produced by process/earnings.js. Companies with N/A market cap are skipped.
const B = 1_000_000_000;
export const MARKETCAP_TIERS = [
  { slug: 'megacap',  label: 'Mega Cap (>$200B)',      min: 200 * B, max: Infinity },
  { slug: 'largecap', label: 'Large Cap ($10B–$200B)', min: 10 * B,  max: 200 * B },
  { slug: 'midcap',   label: 'Mid Cap ($2B–$10B)',     min: 2 * B,   max: 10 * B },
  { slug: 'smallcap', label: 'Small Cap (<$2B)',       min: 0,       max: 2 * B },
];

export function indexBySlug(slug) {
  return INDICES.find((i) => i.slug === slug) ?? null;
}
