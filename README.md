# WISEPREDICTOR

A responsive black-and-gold market-monitoring dashboard for learning about forex, global shares and Kenya's Nairobi Securities Exchange (NSE).

> **Important:** The existing overview charts, indicator panel and legacy paper-trading card still use illustrative demo data. The new Live-data paper trading workspace only accepts timestamped quotes from its configured backend. It does not place real orders, connect to M-Pesa, or provide personalised financial advice.

## Current features

- Responsive black-and-gold dashboard.
- Demo overview for EUR/USD, GBP/USD, USD/JPY, AAPL, NVDA and illustrative NSE symbols SCOM, EQTY and KCB.
- Canvas chart and technical snapshot explicitly labelled as illustrative.
- Existing browser-local demo paper order log.
- New Live-data paper trading workspace with a separate virtual KES balance (KSh 100,000) and virtual USD balance (US$ 1,000).
- The new practice order ticket requires a timestamped quote from the configured API and only allows selling shares already held.
- Virtual balances and positions are stored in browser local storage. Clearing browser data removes the local practice history.
- Kenya market research links and provider verification reminders.

## Live-data integration status

The website is static on GitHub Pages. It **cannot fetch protected market data securely by itself**, so the new workspace starts with its feed disconnected until a separate API is deployed and configured.

The included `api/main.py` is a small FastAPI adapter for a Twelve Data account. It currently supports these international share symbols: AAPL, MSFT, NVDA, AMZN and GOOGL. It does not guarantee real-time quotes: data entitlement, market hours, exchange coverage, delays and quotas depend on the provider plan. Check every returned timestamp and your provider agreement.

**Kenyan NSE shares are intentionally unavailable in this first adapter.** Before enabling SCOM, EQTY or KCB, select and configure a legitimate data source that supports NSE Kenya and permits the intended use. Do not substitute hard-coded demo values and call them live.

### Deploy the API

1. Deploy the `api/` folder to a Python hosting service that supports a persistent HTTPS API. GitHub Pages cannot host this backend.
2. Install dependencies from `api/requirements.txt`.
3. Set `TWELVE_DATA_API_KEY` as a secret environment variable on the API host. Never put this key in `config.js`, browser JavaScript, or a public commit.
4. Set `FRONTEND_ORIGINS` to the exact website origin(s) allowed to call the API, for example `https://wize2007.github.io`.
5. Test `/health` and `/api/quotes?symbols=AAPL,MSFT,NVDA` on the deployed API. Confirm the provider's current data entitlement and timestamps.
6. Edit `config.js` and set `marketApiBaseUrl` to the deployed HTTPS API base URL (no trailing slash). Commit that public base URL only; it is not a secret.
7. Reload the website and check the Live-data practice status. If the API or quote is missing/stale, the practice order remains disabled.

For local API development:

```bash
cd api
python -m venv .venv
# Activate the virtual environment, then:
pip install -r requirements.txt
# Set TWELVE_DATA_API_KEY in your shell environment.
uvicorn main:app --reload --port 8000
```

For local frontend development, serve the repository root with VS Code Live Server and temporarily set `marketApiBaseUrl: "http://localhost:8000"` in `config.js`. The local origin must be included in `FRONTEND_ORIGINS`.

## Provider and security notes

- Review [Twelve Data](https://twelvedata.com/) plans, supported exchanges, delay status, rate limits, and licensing before relying on any quote.
- For NSE Kenya, check the [Nairobi Securities Exchange](https://www.nse.co.ke/) and [Capital Markets Authority](https://www.cma.or.ke/) for official market and regulatory information.
- API keys belong only in the backend host's secret manager/environment. Do not commit a real key.
- This adapter makes requests per symbol and is a starter implementation, not a production quote service. Before wider use, add caching, rate-limit handling, provider health monitoring, automated tests, and more explicit market-hours/staleness rules.
- The paper-trading simulator uses separate virtual KES and USD cash balances and does not convert between currencies. No real money, broker, or M-Pesa account is accessed.
- If you are under 18, keep the project educational and involve a parent/guardian for any future real investment-account questions.

## Deployment

The front end can be hosted on GitHub Pages from the repository root. The market-data API must be hosted separately over HTTPS. A successful Pages deployment alone does not make quotes live.

## Roadmap

- [x] Live-data practice workspace and quote-gated virtual orders
- [x] Separate server-side market-data adapter for selected international shares
- [ ] Configure and test a real provider account and backend deployment
- [ ] Add a licensed NSE Kenya data adapter
- [ ] Add historical candles for live-data charts
- [ ] Add transparent backtesting and risk metrics
- [ ] Automated tests, accessibility review and deployment checks

## License

No license is included yet. Add a license before redistributing or accepting contributions under explicit terms.
