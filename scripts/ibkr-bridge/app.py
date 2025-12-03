from fastapi import FastAPI, Header, HTTPException, Query

from pydantic import BaseModel

from typing import List, Optional

from datetime import datetime, timedelta

import httpx



# -------------------------------------------------

# CONFIG

# -------------------------------------------------



BRIDGE_KEY = "agentyc-bridge-9u1Px"  # MUST match Vercel IBKR_BRIDGE_KEY

IB_GATEWAY_URL = "https://localhost:5000/v1/api"



app = FastAPI(title="Agentyc IBKR Bridge", version="1.0.0")





# -------------------------------------------------

# SECURITY HELPER

# -------------------------------------------------



def verify_key(header_key: Optional[str]):

    if header_key != BRIDGE_KEY:

        raise HTTPException(status_code=401, detail="Invalid or missing API key")


# Alias for consistency with spec
verify = verify_key


async def ib_get(path: str) -> dict:

    """

    Call IBKR Client Portal Gateway GET /v1/api/{path}

    - Verify=False because IBKR uses a self-signed cert by default

    - Raises HTTPException on non-2xx responses

    """

    url = f"{IB_GATEWAY_URL.rstrip('/')}/{path.lstrip('/')}"

    try:

        async with httpx.AsyncClient(verify=False, timeout=10) as client:

            resp = await client.get(url)

    except httpx.RequestError as e:

        raise HTTPException(

            status_code=502,

            detail=f"IBKR gateway connection error: {str(e)}"

        )

    if resp.status_code >= 400:

        raise HTTPException(

            status_code=resp.status_code,

            detail=f"IBKR gateway error {resp.status_code}: {resp.text}"

        )

    return resp.json()





# -------------------------------------------------

# MODELS

# -------------------------------------------------



class PriceSnapshot(BaseModel):

    symbol: str

    last: float

    bid: Optional[float] = None

    ask: Optional[float] = None

    timestamp: datetime





class QuoteRequest(BaseModel):

    symbols: List[str]





class OrderBookLevel(BaseModel):

    price: float

    size: float





class Candle(BaseModel):

    ts: datetime

    open: float

    high: float

    low: float

    close: float

    volume: float





class InstrumentSummary(BaseModel):

    symbol: str

    description: str

    asset_class: str

    exchange: Optional[str] = None

    currency: str





class AccountSummary(BaseModel):

    equity: float

    cash: float

    margin_available: float

    maintenance_margin: float

    pnl_day: float

    pnl_unrealized: float

    pnl_realized: float

    currency: str





class Position(BaseModel):

    symbol: str

    asset_class: str

    qty: float

    avg_price: float

    market_price: float

    market_value: float

    unrealized_pnl: float

    realized_pnl_day: float

    currency: str

    exchange: Optional[str] = None





class Balance(BaseModel):

    currency: str

    cash: float

    settled_cash: float

    buying_power: float





class Order(BaseModel):

    id: str

    symbol: str

    side: str            # "buy" | "sell"

    type: str            # "market" | "limit" | ...

    status: str          # "open" | "filled" | "cancelled" | ...

    qty: float

    filled_qty: float

    limit_price: Optional[float] = None

    stop_price: Optional[float] = None

    time_in_force: Optional[str] = None

    created_at: datetime

    updated_at: datetime





class PlaceOrderRequest(BaseModel):

    symbol: str

    side: str                    # "buy" | "sell"

    type: str                    # "market" | "limit" | "stop" | "stop_limit"

    qty: float

    limit_price: Optional[float] = None

    stop_price: Optional[float] = None

    time_in_force: Optional[str] = "DAY"





class PlaceOrderResponse(BaseModel):

    ok: bool

    order_id: str

    status: str

    symbol: str

    side: str

    type: str

    qty: float

    limit_price: Optional[float] = None

    stop_price: Optional[float] = None

    time_in_force: Optional[str] = None

    submitted_at: datetime





class CancelOrderRequest(BaseModel):

    order_id: str





class CancelOrderResponse(BaseModel):

    ok: bool

    order_id: str

    status: str





class Trade(BaseModel):

    trade_id: str

    order_id: str

    symbol: str

    side: str

    qty: float

    price: float

    fee: float

    timestamp: datetime





# -------------------------------------------------

# UTILITY ROUTES

# -------------------------------------------------



@app.get("/health")

async def health(x_bridge_key: str = Header(None)):

    verify_key(x_bridge_key)

    return {"ok": True, "service": "ibkr-bridge", "status": "running"}





@app.get("/ping")

async def ping(x_bridge_key: str = Header(None)):

    verify_key(x_bridge_key)

    return {"ok": True, "pong": True, "ts": datetime.utcnow()}





# -------------------------------------------------

# MARKET DATA

# -------------------------------------------------



@app.get("/price", response_model=PriceSnapshot)

async def get_price(

    symbol: str = Query(..., description="Symbol, e.g. AAPL or BTC-USD"),

    x_bridge_key: str = Header(None),

):

    verify_key(x_bridge_key)



    # TODO: replace with real IBKR market data call

    now = datetime.utcnow()

    return PriceSnapshot(

        symbol=symbol,

        last=123.45,

        bid=123.40,

        ask=123.50,

        timestamp=now,

    )





@app.post("/quotes")

async def get_quotes(

    req: QuoteRequest,

    x_bridge_key: str = Header(None),

):

    verify_key(x_bridge_key)



    # TODO: real multi-symbol snapshot

    now = datetime.utcnow()

    quotes = [

        PriceSnapshot(

            symbol=sym,

            last=100.0 + i,

            bid=99.5 + i,

            ask=100.5 + i,

            timestamp=now,

        )

        for i, sym in enumerate(req.symbols)

    ]



    return {"ok": True, "data": quotes}





@app.get("/orderbook")

async def get_orderbook(

    symbol: str = Query(...),

    depth: int = Query(25, ge=1, le=100),

    x_bridge_key: str = Header(None),

):

    verify_key(x_bridge_key)



    # TODO: replace with real order book

    mid = 100.0

    bids = [

        OrderBookLevel(price=mid - 0.1 * i, size=0.5 + i * 0.1)

        for i in range(depth)

    ]

    asks = [

        OrderBookLevel(price=mid + 0.1 * i, size=0.4 + i * 0.1)

        for i in range(depth)

    ]



    return {"ok": True, "symbol": symbol, "bids": bids, "asks": asks}





@app.get("/history/price")

async def get_price_history(

    symbol: str = Query(...),

    tf: str = Query("1h", description="Timeframe, e.g. 1m, 5m, 1h, 1d"),

    bars: int = Query(200, ge=1, le=5000),

    x_bridge_key: str = Header(None),

):

    verify_key(x_bridge_key)



    # TODO: replace with real historical data

    now = datetime.utcnow()

    candles: List[Candle] = []

    price = 100.0

    for i in range(bars):

        ts = now - timedelta(minutes=i)

        c = Candle(

            ts=ts,

            open=price,

            high=price + 0.5,

            low=price - 0.5,

            close=price + 0.1,

            volume=1000 + i * 10,

        )

        candles.append(c)

        price += 0.01



    candles.reverse()

    return {"ok": True, "symbol": symbol, "tf": tf, "data": candles}





@app.get("/instruments/search")

async def search_instruments(

    q: str = Query(..., description="Search text, e.g. TSLA"),

    x_bridge_key: str = Header(None),

):

    verify_key(x_bridge_key)



    # TODO: real contract search via IBKR

    results = [

        InstrumentSummary(

            symbol=q.upper(),

            description=f"Dummy instrument for {q.upper()}",

            asset_class="STK",

            exchange="SMART",

            currency="USD",

        )

    ]



    return {"ok": True, "query": q, "data": results}





# -------------------------------------------------

# ACCOUNT / POSITIONS / BALANCES

# -------------------------------------------------


@app.get("/account")
async def account(x_bridge_key: str = Header(None)):
    verify(x_bridge_key)

    # 1) Get list of accounts from IBKR
    data = await ib_get("portfolio/accounts")

    # Expect a list; take the first account as "primary"
    if not isinstance(data, list) or not data:
        raise HTTPException(status_code=500, detail="No IBKR accounts returned")

    acct = data[0]
    account_id = acct.get("accountId") or acct.get("id") or acct.get("account")

    if not account_id:
        raise HTTPException(status_code=500, detail="Unable to determine IBKR account id")

    # 2) Get balances / summary for that account
    # NOTE: endpoint name/schema must be checked against IBKR Client Portal docs.
    # This mapping is an example and may need adjustment based on the actual payload.
    summary = await ib_get(f"portfolio/{account_id}/summary")

    # Very conservative mapping: pull the fields if present, otherwise 0
    def safe_get(obj, key, default=0.0):
        try:
            v = obj.get(key, default)
            return float(v) if isinstance(v, (int, float, str)) else default
        except Exception:
            return default

    balance = safe_get(summary, "cashbalance", 0.0)
    equity = safe_get(summary, "netliquidation", balance)
    unrealized_pnl = safe_get(summary, "unrealizedpnl", 0.0)
    buying_power = safe_get(summary, "availablefunds", 0.0)

    return {
        "ok": True,
        "accountId": account_id,
        "balance": balance,
        "equity": equity,
        "unrealizedPnl": unrealized_pnl,
        "buyingPower": buying_power,
    }


@app.get("/positions")
async def positions(x_bridge_key: str = Header(None)):
    verify(x_bridge_key)

    # Get accounts again
    accts = await ib_get("portfolio/accounts")
    if not isinstance(accts, list) or not accts:
        raise HTTPException(status_code=500, detail="No IBKR accounts returned")

    account_id = (
        accts[0].get("accountId")
        or accts[0].get("id")
        or accts[0].get("account")
    )

    if not account_id:
        raise HTTPException(status_code=500, detail="Unable to determine IBKR account id")

    # Positions endpoint
    pos = await ib_get(f"portfolio/{account_id}/positions")

    # Normalize to our internal shape
    normalized = []
    if isinstance(pos, list):
        for p in pos:
            symbol = p.get("contract", {}).get("symbol") or p.get("symbol")
            if not symbol:
                continue
            qty = p.get("position") or p.get("positionQty") or p.get("qty") or 0
            avg_price = p.get("avgPrice") or p.get("avgCost") or 0
            mkt_price = p.get("mktPrice") or p.get("marketPrice") or 0
            unrealized = p.get("unrealizedPnl") or 0

            try:
                qty = float(qty)
                avg_price = float(avg_price)
                mkt_price = float(mkt_price)
                unrealized = float(unrealized)
            except Exception:
                continue

            normalized.append(
                {
                    "symbol": symbol,
                    "quantity": qty,
                    "avgPrice": avg_price,
                    "marketPrice": mkt_price,
                    "unrealizedPnl": unrealized,
                }
            )

    return {"ok": True, "positions": normalized}


@app.get("/orders")
async def orders(x_bridge_key: str = Header(None)):
    verify(x_bridge_key)

    # Open orders endpoint
    # NOTE: endpoint path may differ; verify against IBKR Client Portal docs.
    raw = await ib_get("iserver/account/orders")

    orders = []
    if isinstance(raw, list):
        for o in raw:
            try:
                orders.append(
                    {
                        "id": o.get("orderId") or o.get("id"),
                        "symbol": (
                            o.get("contract", {}).get("symbol")
                            or o.get("symbol")
                        ),
                        "side": o.get("side") or o.get("action"),
                        "quantity": float(
                            o.get("quantity")
                            or o.get("orderQty")
                            or o.get("totalQuantity")
                            or 0
                        ),
                        "status": o.get("status"),
                        "limitPrice": float(o.get("lmtPrice") or o.get("limitPrice") or 0)
                        if o.get("lmtPrice") or o.get("limitPrice")
                        else None,
                    }
                )
            except Exception:
                continue

    return {"ok": True, "orders": orders}


@app.get("/account/summary", response_model=AccountSummary)

async def account_summary(x_bridge_key: str = Header(None)):

    verify_key(x_bridge_key)



    # TODO: IBKR account summary

    return AccountSummary(

        equity=100000.0,

        cash=25000.0,

        margin_available=50000.0,

        maintenance_margin=20000.0,

        pnl_day=350.0,

        pnl_unrealized=1200.0,

        pnl_realized=800.0,

        currency="USD",

    )





@app.get("/account/positions")

async def account_positions(x_bridge_key: str = Header(None)):

    verify_key(x_bridge_key)



    # TODO: IBKR portfolio positions

    positions = [

        Position(

            symbol="AAPL",

            asset_class="STK",

            qty=100,

            avg_price=180.0,

            market_price=190.0,

            market_value=19000.0,

            unrealized_pnl=1000.0,

            realized_pnl_day=200.0,

            currency="USD",

            exchange="NASDAQ",

        ),

        Position(

            symbol="BTC-USD",

            asset_class="CRYPTO",

            qty=0.5,

            avg_price=60000.0,

            market_price=83000.0,

            market_value=41500.0,

            unrealized_pnl=11500.0,

            realized_pnl_day=0.0,

            currency="USD",

            exchange="COINBASE",

        ),

    ]



    return {"ok": True, "data": positions}





@app.get("/account/balances")

async def account_balances(x_bridge_key: str = Header(None)):

    verify_key(x_bridge_key)



    # TODO: IBKR cash balances per currency

    balances = [

        Balance(currency="USD", cash=20000.0, settled_cash=19500.0, buying_power=60000.0),

        Balance(currency="EUR", cash=5000.0, settled_cash=5000.0, buying_power=0.0),

    ]



    return {"ok": True, "data": balances}





# -------------------------------------------------

# ORDERS

# -------------------------------------------------



@app.get("/orders/open")

async def open_orders(x_bridge_key: str = Header(None)):

    verify_key(x_bridge_key)

    now = datetime.utcnow()



    # TODO: IBKR open orders

    orders = [

        Order(

            id="O-123",

            symbol="AAPL",

            side="buy",

            type="limit",

            status="open",

            qty=100,

            filled_qty=0,

            limit_price=185.0,

            stop_price=None,

            time_in_force="DAY",

            created_at=now - timedelta(minutes=10),

            updated_at=now - timedelta(minutes=5),

        )

    ]



    return {"ok": True, "data": orders}





@app.get("/orders/history")

async def orders_history(

    days: int = Query(7, ge=1, le=365),

    x_bridge_key: str = Header(None),

):

    verify_key(x_bridge_key)

    now = datetime.utcnow()



    # TODO: IBKR order history

    orders = [

        Order(

            id="O-111",

            symbol="MSFT",

            side="buy",

            type="market",

            status="filled",

            qty=50,

            filled_qty=50,

            limit_price=None,

            stop_price=None,

            time_in_force="DAY",

            created_at=now - timedelta(days=1),

            updated_at=now - timedelta(days=1),

        ),

        Order(

            id="O-112",

            symbol="BTC-USD",

            side="sell",

            type="limit",

            status="cancelled",

            qty=0.2,

            filled_qty=0.0,

            limit_price=90000.0,

            stop_price=None,

            time_in_force="GTC",

            created_at=now - timedelta(days=2),

            updated_at=now - timedelta(days=1),

        ),

    ]



    return {"ok": True, "days": days, "data": orders}





@app.post("/orders/place", response_model=PlaceOrderResponse)

async def place_order(

    req: PlaceOrderRequest,

    x_bridge_key: str = Header(None),

):

    verify_key(x_bridge_key)



    # TODO: real IBKR order placement, return real order id & status

    now = datetime.utcnow()

    fake_order_id = f"SIM-{int(now.timestamp())}"



    return PlaceOrderResponse(

        ok=True,

        order_id=fake_order_id,

        status="submitted",

        symbol=req.symbol,

        side=req.side,

        type=req.type,

        qty=req.qty,

        limit_price=req.limit_price,

        stop_price=req.stop_price,

        time_in_force=req.time_in_force,

        submitted_at=now,

    )





@app.post("/orders/cancel", response_model=CancelOrderResponse)

async def cancel_order(

    req: CancelOrderRequest,

    x_bridge_key: str = Header(None),

):

    verify_key(x_bridge_key)



    # TODO: call IBKR cancel endpoint

    return CancelOrderResponse(ok=True, order_id=req.order_id, status="cancel_requested")





# -------------------------------------------------

# TRADES / EXECUTIONS

# -------------------------------------------------



@app.get("/trades")

async def get_trades(

    days: int = Query(7, ge=1, le=365),

    x_bridge_key: str = Header(None),

):

    verify_key(x_bridge_key)

    now = datetime.utcnow()



    # TODO: IBKR executions

    trades = [

        Trade(

            trade_id="T-1001",

            order_id="O-111",

            symbol="MSFT",

            side="buy",

            qty=50,

            price=400.5,

            fee=1.5,

            timestamp=now - timedelta(days=1, minutes=5),

        ),

        Trade(

            trade_id="T-1002",

            order_id="O-200",

            symbol="AAPL",

            side="sell",

            qty=25,

            price=190.1,

            fee=1.2,

            timestamp=now - timedelta(days=2, minutes=15),

        ),

    ]



    return {"ok": True, "days": days, "data": trades}

