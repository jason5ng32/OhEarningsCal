# OhEarningsCal

<a href="https://trendshift.io/repositories/8148" target="_blank"><img src="https://trendshift.io/api/badge/repositories/8148" alt="jason5ng32%2FOhEarningsCal | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>

Subscribe to US stock earnings dates from your calendar app. This started as a tool I built for myself — I'd rather glance at my calendar than open a brokerage app — and turned out useful enough to open-source.

## Just use it

Visit [https://earnings.beavern.com/](https://earnings.beavern.com/), pick a calendar, copy the link, then add it as a calendar subscription in your app of choice.

The calendars cover the US market only, in a rolling window of ±30 days around today (anything further out isn't accurate enough to matter).

## Calendars

| File | Contents |
| --- | --- |
| `all.ics` | Every company that reports earnings in the window |
| `nasdaq100.ics` | Nasdaq-100 constituents |
| `sp500.ics` | S&P 500 constituents |
| `dow30.ics` | Dow Jones Industrial Average constituents |
| `customstock.ics` | A custom watchlist driven by the `CUSTOM_STOCKS` env var |
| `selected.ics` | Union of the four above, deduplicated |

## Self-hosting

1. Fork this repo
2. **Settings → Pages → Source** → switch to **GitHub Actions**
3. **Settings → Secrets and variables → Actions → Variables** → add:
   - `SHOULD_GEN_SELECTED` = `true` / `false`
   - `SHOULD_GEN_ALL` = `true` / `false`
   - `CUSTOM_STOCKS` = comma-separated tickers, e.g. `PDD,BABA,TCEHY` (leave empty to skip `customstock.ics`)
4. Wait for the next scheduled run, or kick off **Actions → Update earnings calendar → Run workflow** manually.

## Automation

| Workflow | Schedule | What it does |
| --- | --- | --- |
| `earnings.yml` | Daily 04:34 / 16:34 UTC | Fetch earnings → build ics → deploy to GitHub Pages |
| `indices.yml` | Mondays 06:17 UTC | Refresh index constituents from Wikipedia, commit `data/indices/` |

Earnings data is cached in GitHub Actions cache, never in git — `main` only carries source code and the index constituents.

## Local development

```sh
npm install
cp .env.example .env   # edit env vars

npm run fetch:indices  # first run / when refreshing constituents
npm run fetch          # pull yesterday + next 30 days into data/earnings/
npm run gen            # write docs/ics/*.ics
npm run dev            # http://localhost:18302
```

Convenience endpoints on the dev server:

- `GET /dev/fetch` — trigger one `fetch`
- `GET /dev/fetch-indices` — trigger one `fetch:indices`
- `GET /dev/gen` — trigger one `gen`

## Layout

```
src/
├── lib/        # shared helpers (date, paths, http, fs)
├── config/     # env parsing, index metadata
├── fetch/      # data sources: Nasdaq earnings, Wikipedia constituents
├── process/    # filter + dedupe earnings rows
├── generate/   # build .ics files
├── cli/        # entrypoints (fetch / fetch-indices / gen)
└── server.js   # local dev server
data/
├── earnings/   # daily JSON cache (gitignored, GH Actions cache between runs)
└── indices/    # index constituents, refreshed weekly (in git)
docs/
├── index.html  # static landing page
├── CNAME
└── ics/        # generated .ics files (gitignored, written by build)
```
