# WISEPREDICTOR

A responsive black-and-gold market-monitoring dashboard for learning about forex, global shares and Kenya's Nairobi Securities Exchange (NSE).

> **Important:** This version is a front-end prototype. All quotes, percentage changes, chart history and indicator values are simulated examples. It does not provide live market data, validated forecasts, financial advice or broker execution. Do not use demo values to make investment decisions.

## Run locally

1. Clone or download this repository.
2. Open index.html in a modern browser, or use VS Code Live Server.
3. The watchlist and paper orders are saved in browser local storage. Clearing browser data removes this local practice history.

## Current features

- Responsive dark UI with gold accents.
- Demo instruments: EUR/USD, GBP/USD, USD/JPY, AAPL, NVDA, and illustrative NSE symbols SCOM, EQTY and KCB.
- Canvas chart with clearly labelled simulated price series.
- Illustrative rule-based signal panel.
- Browser-local virtual order log and paper cash balance.
- Search and add/remove watchlist controls.
- Research links to TradingView, Kenya CMA, NSE and Investor.gov.

## Before enabling live data

1. Choose a data vendor whose licensing supports your intended use and provides the forex pairs, shares and NSE instruments you need. Coverage, delays, quotas and fees vary.
2. Build a server-side API (for example Python/FastAPI or Node) to retrieve, normalize, timestamp and cache quotes. Never put API keys in browser JavaScript, client-side storage or public commits.
3. Show each quote's provider, timestamp and delay status. Mark stale or unavailable data clearly; never silently label demo data as live.
4. Calculate indicators from real historical OHLCV data and test the implementation.
5. Add walk-forward/out-of-sample evaluation. Report sample size, time period, transaction costs, drawdown and uncertainty. Do not claim guaranteed accuracy.
6. Keep paper trading separate from brokerage execution. Real-money features require appropriate regulatory, security and risk controls.

## Providers and research

- [Twelve Data](https://twelvedata.com/) — review current plans, exchange coverage, licensing and quotas.
- [Alpha Vantage](https://www.alphavantage.co/) — review current endpoints, quotas and data rights.
- [Nairobi Securities Exchange](https://www.nse.co.ke/) and [Kenya CMA](https://www.cma.or.ke/) — official Kenya market/regulatory resources.
- [TradingView](https://www.tradingview.com/) — charts and technical-analysis learning.
- [Investor.gov](https://www.investor.gov/) — investing education.

These are research starting points, not guarantees of free, real-time or redistributable data for every market.

## Deployment

The site is static and can be hosted on GitHub Pages. In repository Settings, enable Pages from the main branch and root folder. Hosting the page does not enable live market data.

## Roadmap

- [ ] Server-side provider adapters and live/stale data state
- [ ] Historical candles and tested indicator calculations
- [ ] Backtesting with transparent performance evaluation
- [ ] Paper portfolio mark-to-market and risk metrics
- [ ] Automated tests, accessibility review and deployment checks

## License

No license is included yet. Add a license before redistributing or accepting contributions under explicit terms.
