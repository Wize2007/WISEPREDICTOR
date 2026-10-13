(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const currencyLabels = { KES: "KSh", USD: "US$" };
  const instruments = {
    AAPL: { name: "Apple Inc.", market: "US shares", currency: "USD" },
    MSFT: { name: "Microsoft", market: "US shares", currency: "USD" },
    NVDA: { name: "NVIDIA", market: "US shares", currency: "USD" },
    AMZN: { name: "Amazon", market: "US shares", currency: "USD" },
    GOOGL: { name: "Alphabet", market: "US shares", currency: "USD" },
    SCOM: { name: "Safaricom PLC", market: "NSE Kenya", currency: "KES" },
    EQTY: { name: "Equity Group", market: "NSE Kenya", currency: "KES" },
    KCB: { name: "KCB Group", market: "NSE Kenya", currency: "KES" }
  };
  const storageKey = "wisepredictor.livePaper.v1";
  const defaultState = () => ({ cash: { KES: 100000, USD: 1000 }, positions: {}, trades: [] });
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved && saved.cash && saved.positions && Array.isArray(saved.trades)) return saved;
    } catch (_) {}
    return defaultState();
  }
  let state = loadState();
  let quotes = {};
  let unavailable = {};
  let feedReady = false;
  let loading = false;
  const apiBase = String(window.WISE_CONFIG && window.WISE_CONFIG.marketApiBaseUrl || "").trim().replace(/\/$/, "");
  const money = (amount, currency) => (currencyLabels[currency] || currency + " ") + Number(amount).toLocaleString(currency === "KES" ? "en-KE" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const pct = value => (Number(value) >= 0 ? "+" : "") + Number(value).toFixed(2) + "%";
  function icons() { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); }
  function quoteAge(q) {
    if (!q || !q.timestamp) return Infinity;
    const timestamp = Date.parse(q.timestamp);
    return Number.isFinite(timestamp) && timestamp <= Date.now() + 5 * 60 * 1000 ? Math.max(0, Date.now() - timestamp) : Infinity;
  }
  function quoteUsable(q) {
    return Boolean(q && Number.isFinite(Number(q.price)) && Number(q.price) > 0 &&
      q.status === "provider_quote" && quoteAge(q) <= 36 * 60 * 60 * 1000);
  }
  function quoteStatus(q, symbol) {
    if (!q) return { label: unavailable[symbol] || "Not connected", css: "missing" };
    if (q.status === "error") return { label: "Unavailable", css: "error" };
    if (!q.timestamp || quoteAge(q) > 36 * 60 * 60 * 1000) return { label: "Stale / check time", css: "stale" };
    return { label: "Provider quote", css: "" };
  }
  function setFeed(message, mode) {
    const badge = $("#liveFeedBadge");
    const banner = $("#liveFeedMessage");
    if (badge) {
      badge.textContent = mode === "connected" ? "PROVIDER CONNECTED" : mode === "error" ? "FEED ERROR" : "FEED NOT CONNECTED";
      badge.className = "tag " + (mode === "connected" ? "tag-green" : "tag-amber");
    }
    if (banner) banner.innerHTML = '<i data-lucide="radio-tower"></i><span>' + escapeHTML(message) + '</span><button class="button button-quiet" id="refreshLiveQuotes" type="button">Refresh quotes</button>';
    icons();
    const refresh = $("#refreshLiveQuotes");
    if (refresh) refresh.addEventListener("click", refreshQuotes);
  }
  function renderQuotes() {
    const body = $("#liveQuotesBody");
    if (!body) return;
    body.innerHTML = Object.entries(instruments).map(([symbol, meta]) => {
      const q = quotes[symbol];
      const status = quoteStatus(q, symbol);
      const price = quoteUsable(q) ? money(Number(q.price), q.currency || meta.currency) : "—";
      const change = quoteUsable(q) && Number.isFinite(Number(q.change_pct)) ?
        '<span class="change-pill ' + (Number(q.change_pct) < 0 ? "down" : "") + '">' + pct(Number(q.change_pct)) + '</span>' : "—";
      const timestamp = q && q.timestamp ? escapeHTML(q.timestamp) : "—";
      return '<tr><td><div class="asset-cell"><span class="asset-icon">' + escapeHTML(symbol.slice(0,2)) + '</span><span class="asset-name"><strong>' + escapeHTML(symbol) + '</strong><span>' + escapeHTML(meta.name) + '</span></span></div></td><td class="market-cell">' + escapeHTML(meta.market) + '</td><td class="price-cell">' + price + '</td><td>' + change + '</td><td class="quote-time">' + timestamp + '</td><td><span class="quote-status ' + status.css + '">' + escapeHTML(status.label) + '</span></td></tr>';
    }).join("");
    const selector = $("#liveTradeSymbol");
    const previous = selector.value;
    selector.innerHTML = Object.entries(instruments).map(([symbol, meta]) => '<option value="' + symbol + '">' + escapeHTML(meta.name + " · " + symbol + (meta.currency === "KES" ? " (NSE)" : "")) + '</option>').join("");
    if (instruments[previous]) selector.value = previous;
    updateOrderEstimate();
    $("#livePlaceOrder").disabled = !quoteUsable(quotes[selector.value]);
    icons();
  }
  function renderPortfolio() {
    $("#liveCashKES").textContent = money(state.cash.KES, "KES");
    $("#liveCashUSD").textContent = money(state.cash.USD, "USD");
    const open = Object.values(state.positions).filter(p => p.quantity > 0);
    $("#livePositionCount").textContent = String(open.length);
    const list = $("#livePositionsList");
    if (!open.length) {
      list.innerHTML = '<div class="empty-state"><i data-lucide="notebook-tabs"></i><strong>No holdings yet</strong><span>Buy shares using a valid provider quote to begin.</span></div>';
    } else {
      list.innerHTML = open.map(p => {
        const meta = instruments[p.symbol];
        const q = quotes[p.symbol];
        const current = quoteUsable(q) ? Number(q.price) : Number(p.averagePrice);
        const pnl = (current - Number(p.averagePrice)) * Number(p.quantity);
        return '<div class="position-item"><div><div class="position-title">' + escapeHTML(p.symbol) + ' · ' + p.quantity + ' share(s)</div><div class="position-meta">Average cost ' + money(p.averagePrice, meta.currency) + ' · ' + escapeHTML(meta.name) + '</div></div><div><div class="position-value">' + money(current * p.quantity, meta.currency) + '</div><div class="position-pnl ' + (pnl < 0 ? "negative" : "") + '">' + (pnl >= 0 ? "+" : "") + money(pnl, meta.currency) + ' unrealised</div></div></div>';
      }).join("");
    }
    icons();
  }
  function updateOrderEstimate() {
    const symbol = $("#liveTradeSymbol").value;
    const q = quotes[symbol];
    const meta = instruments[symbol];
    const units = Math.max(0, Math.floor(Number($("#liveTradeUnits").value) || 0));
    $("#liveOrderQuote").textContent = quoteUsable(q) ? money(Number(q.price), q.currency || meta.currency) + " / share" : "No usable quote";
    $("#livePlaceOrder").disabled = !quoteUsable(q) || units < 1;
    if ($("#livePlaceOrder").disabled && $("#liveTradeMessage").textContent.startsWith("Ready")) {
      $("#liveTradeMessage").textContent = "This order needs a timestamped provider quote. Demo prices cannot be used here.";
    }
  }
  async function refreshQuotes() {
    if (loading) return;
    if (!apiBase) {
      feedReady = false;
      quotes = {};
      unavailable = { SCOM: "NSE feed not configured", EQTY: "NSE feed not configured", KCB: "NSE feed not configured" };
      setFeed("No market-data API URL is configured yet. The live-practice board will not substitute demo prices. Deploy the API and set marketApiBaseUrl in config.js; NSE shares need a supported licensed data source.", "offline");
      renderQuotes(); renderPortfolio();
      return;
    }
    loading = true;
    setFeed("Contacting the configured market-data service…", "offline");
    try {
      const response = await fetch(apiBase + "/api/quotes?symbols=" + encodeURIComponent(Object.keys(instruments).join(",")), { headers: { "Accept": "application/json" }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Market-data service returned HTTP " + response.status);
      quotes = data.quotes || {};
      unavailable = data.unavailable || {};
      feedReady = Object.values(quotes).some(quoteUsable);
      const count = Object.values(quotes).filter(quoteUsable).length;
      const nseMissing = ["SCOM","EQTY","KCB"].some(symbol => !quoteUsable(quotes[symbol]));
      setFeed(count ? count + " instrument(s) have timestamped provider quotes. Check each quote time and your provider's plan for real-time versus delayed data." + (nseMissing ? " NSE Kenya quotes are not available from the currently configured provider." : "") : "The API responded, but no fresh, usable provider quotes were returned. Practice orders remain disabled.", count ? "connected" : "error");
      if (data.provider) $("#liveFeedBadge").title = "Provider: " + data.provider;
    } catch (error) {
      feedReady = false; quotes = {};
      setFeed("Could not retrieve market data: " + (error && error.message ? error.message : "unknown error") + ". No live quote is being assumed.", "error");
    } finally {
      loading = false;
      renderQuotes(); renderPortfolio();
    }
  }
  function placeOrder(event) {
    event.preventDefault();
    const symbol = $("#liveTradeSymbol").value;
    const q = quotes[symbol];
    const meta = instruments[symbol];
    const units = Math.floor(Number($("#liveTradeUnits").value));
    const side = $("#liveTradeSide").value;
    if (!Number.isInteger(units) || units < 1) { $("#liveTradeMessage").textContent = "Enter a whole number of shares."; return; }
    if (!quoteUsable(q)) { $("#liveTradeMessage").textContent = "Order blocked: a fresh timestamped provider quote is required."; return; }
    const currency = q.currency || meta.currency;
    const price = Number(q.price);
    const value = price * units;
    let position = state.positions[symbol];
    if (side === "buy") {
      if (state.cash[currency] < value) { $("#liveTradeMessage").textContent = "Not enough virtual " + currency + " cash. This simulator does not exchange currencies."; return; }
      state.cash[currency] -= value;
      if (!position) position = state.positions[symbol] = { symbol, quantity: 0, averagePrice: 0 };
      const totalCost = position.quantity * position.averagePrice + value;
      position.quantity += units;
      position.averagePrice = totalCost / position.quantity;
    } else {
      if (!position || position.quantity < units) { $("#liveTradeMessage").textContent = "You can only sell shares already held in this virtual portfolio."; return; }
      state.cash[currency] += value;
      position.quantity -= units;
      if (position.quantity === 0) delete state.positions[symbol];
    }
    state.trades.push({ symbol, side, units, price, currency, value, timestamp: new Date().toISOString() });
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) {}
    renderPortfolio();
    $("#liveTradeMessage").textContent = "Virtual " + side + " recorded at " + money(price, currency) + ". No broker or payment service was contacted.";
    updateOrderEstimate();
  }
  function init() {
    if (!$("#live-practice")) return;
    $("#liveTradeForm").addEventListener("submit", placeOrder);
    $("#liveTradeSymbol").addEventListener("change", updateOrderEstimate);
    $("#liveTradeUnits").addEventListener("input", updateOrderEstimate);
    $("#refreshLiveQuotes").addEventListener("click", refreshQuotes);
    $("#resetLivePractice").addEventListener("click", () => {
      if (window.confirm("Reset virtual KES/USD cash, holdings and practice history?")) {
        state = defaultState();
        try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) {}
        renderPortfolio();
        $("#liveTradeMessage").textContent = "Virtual portfolio reset. No real funds were affected.";
      }
    });
    renderPortfolio();
    refreshQuotes();
    if (apiBase) window.setInterval(refreshQuotes, 60000);
  }
  document.addEventListener("DOMContentLoaded", init);
})();