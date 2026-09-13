# Inflation Rate Explorer

An interactive page for class: month-to-month inflation (bars, always annualized) against a longer-window annualized rate (line) for four measures — CPI headline, CPI core, PCE headline, and PCE core. A slider moves the line's window continuously from 3 months to 12; the underlying rate is recalculated in real time as the window changes, not just visually animated between fixed points, so any value the slider lands on is a genuine annualized rate over that many months.

**Live demo:** https://USERNAME.github.io/inflation-explorer/
*(replace `USERNAME` after enabling GitHub Pages)*

## How it's organized

- **`index.html`** — the page itself. No build step, no libraries; loads `data/inflation.js` and draws everything on a `<canvas>`.
- **`fetch-data.mjs`** — a Node script that pulls raw monthly index levels for the four series from the FRED API and writes `data/inflation.js`. All the annualized-rate math happens in the browser from those raw levels, not in this script.
- **`data/inflation.js`** — the committed snapshot of FRED data the page actually reads (a plain `window.INFLATION_DATA = {...}` assignment, loaded with a normal `<script>` tag rather than `fetch()` — see below). This is what needs refreshing when new BLS/BEA numbers come out.

## Why the data loads via a `<script>` tag instead of `fetch()`

Two separate constraints shaped this:

1. A GitHub Pages site is static HTML/JS running in the visitor's browser — there's no server to hide a secret on. A FRED API key embedded in the page's JavaScript would be visible to anyone who views the page source. So the data is fetched **ahead of time** by a script you run yourself, and the page only ever reads a data file that's part of the repo. Your API key never ships to a browser and never gets committed.
2. That data file could have been JSON, loaded with `fetch()` — but browsers block `fetch()` of local files when a page is opened directly by double-click (`file://`), which is how a student is likely to first try opening a downloaded copy. A plain `<script src="data/inflation.js">` tag isn't subject to that restriction, so it loads correctly both when double-clicked and when served over `http(s)://`. That's why the data file is JavaScript (`window.INFLATION_DATA = {...}`) rather than a `.json` file.

## Refreshing the data each month

1. Get a free FRED API key at https://fred.stlouisfed.org/docs/api/api_key.html if you don't already have one.
2. In this folder, create a file named `.env.local` (already covered by `.gitignore` — it will never be committed) containing:
   ```
   FRED_API_KEY=your_key_here
   ```
3. Run:
   ```bash
   node fetch-data.mjs
   ```
   This overwrites `data/inflation.js` with the latest observations for all four series.
4. Commit and push the updated file:
   ```bash
   git add data/inflation.js
   git commit -m "Refresh inflation data"
   git push
   ```

Requires Node.js 18 or newer (for built-in `fetch`) — no npm packages are needed.

## Running it locally

Just double-click `index.html`, the same as the other two class apps — no server needed.

## Deploying (free) with GitHub Pages

1. Push this folder to a **public** GitHub repository named `inflation-explorer`.
2. **Settings → Pages → Source:** *Deploy from a branch* → branch `main`, folder `/ (root)` → **Save**.
3. Wait about a minute, then copy the live URL GitHub shows you and update the link at the top of this file.

## The four measures

| Option | FRED series | What it measures |
|---|---|---|
| CPI — All Urban Consumers | `CPIAUCSL` | Headline consumer price index |
| CPI — Core | `CPILFESL` | CPI excluding food and energy |
| PCE — All Items | `PCEPI` | Headline personal consumption expenditures price index (the Fed's preferred gauge) |
| PCE — Core | `PCEPILFE` | PCE excluding food and energy |

## The math

For a price index level *P* at month *t*, the annualized rate over an *n*-month window is:

```
rate(n) = (P[t] / P[t-n]) ^ (12/n) - 1
```

The one-month bars are just this formula with *n* = 1. For the slider's fractional window widths (e.g. 7.4 months), `P[t-n]` is found by linearly interpolating the price index's *logarithm* between the two neighboring months — which is what makes the line change continuously and smoothly as the slider moves, rather than jumping between three fixed curves.

**Data gaps:** BLS/BEA occasionally miss a month's release (e.g., the CPI has no October 2025 reading, due to that year's government shutdown). The bar and line are only left blank on the exact month whose own reading is missing; a longer window that merely *looks back across* that gap falls back to the nearest available neighboring month instead of leaving a hole, so a single missing month doesn't blank out the following year of the 12-month line.

## License

MIT — see [LICENSE](LICENSE).
