import os
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

APP_NAME = "WISEPREDICTOR Market Data API"
TWELVE_DATA_BASE = "https://api.twelvedata.com"
API_KEY = os.getenv("TWELVE_DATA_API_KEY", "").strip()
ALLOWED_SYMBOLS = {
    "AAPL": ("AAPL", "USD"),
    "MSFT": ("MSFT", "USD"),
    "NVDA": ("NVDA", "USD"),
    "AMZN": ("AMZN", "USD"),
    "GOOGL": ("GOOGL", "USD"),
}
NSE_SYMBOLS = {"SCOM", "EQTY", "KCB"}
origins = [x.strip() for x in os.getenv(
    "FRONTEND_ORIGINS",
    "https://wize2007.github.io,http://localhost:5500,http://127.0.0.1:5500"
).split(",") if x.strip()]

app = FastAPI(title=APP_NAME, version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "provider": "Twelve Data",
        "provider_key_configured": bool(API_KEY),
        "nse_feed_configured": False,
    }


def parse_timestamp(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        value = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if value.tzinfo is None:
            # Provider timestamps without offsets are not silently treated as UTC.
            return None
        return value.astimezone(timezone.utc)
    except (TypeError, ValueError):
        return None


@app.get("/api/quotes")
async def get_quotes(symbols: str = Query(default="AAPL,MSFT,NVDA,AMZN,GOOGL")) -> dict[str, Any]:
    requested = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not requested or len(requested) > 20:
        raise HTTPException(status_code=400, detail="Provide between 1 and 20 comma-separated symbols.")
    if not API_KEY:
        raise HTTPException(status_code=503, detail="Market data is not configured. Set TWELVE_DATA_API_KEY on the server.")

    quotes: dict[str, Any] = {}
    unavailable: dict[str, str] = {}
    timeout = httpx.Timeout(12.0, connect=5.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        for symbol in requested:
            if symbol in NSE_SYMBOLS:
                unavailable[symbol] = "No licensed NSE Kenya data feed is configured."
                continue
            mapping = ALLOWED_SYMBOLS.get(symbol)
            if not mapping:
                unavailable[symbol] = "This symbol is not enabled in the current provider adapter."
                continue
            provider_symbol, currency = mapping
            try:
                response = await client.get(
                    f"{TWELVE_DATA_BASE}/quote",
                    params={"symbol": provider_symbol, "apikey": API_KEY},
                )
                response.raise_for_status()
                data = response.json()
                if data.get("status") == "error" or data.get("code") or not data.get("close"):
                    unavailable[symbol] = str(data.get("message") or "Provider did not return a quote.")
                    continue
                raw_time = data.get("datetime")
                timestamp = None
                if raw_time:
                    # Twelve Data may return exchange-local timestamps without an offset.
                    # Keep the raw value for display; the client refuses to trade unless
                    # the timestamp can be parsed and is recent enough.
                    parsed = parse_timestamp(raw_time)
                    timestamp = parsed.isoformat() if parsed else str(raw_time)
                quotes[symbol] = {
                    "symbol": symbol,
                    "price": float(data["close"]),
                    "change_pct": float(data.get("percent_change") or 0),
                    "currency": currency,
                    "timestamp": timestamp,
                    "source": "Twelve Data",
                    "status": "provider_quote",
                    "exchange": data.get("exchange"),
                    "note": "Check your provider plan for live versus delayed data.",
                }
            except (httpx.HTTPError, ValueError, TypeError) as exc:
                unavailable[symbol] = f"Provider request failed: {type(exc).__name__}."
    return {
        "provider": "Twelve Data",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "quotes": quotes,
        "unavailable": unavailable,
        "disclaimer": "Quotes may be delayed or unavailable. Verify timestamp and provider entitlement.",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
