import sys, numpy as np, pandas as pd
D = sys.argv[1]

def load(name):
    s = pd.read_csv(f"{D}/fred_{name}.csv", na_values=".")
    s.columns = ["date", name]
    s["date"] = pd.to_datetime(s["date"])
    return s.set_index("date")[name].dropna()

def rsi(p, n):
    d = p.diff()
    up = d.clip(lower=0).ewm(alpha=1/n, adjust=False).mean()
    dn = (-d.clip(upper=0)).ewm(alpha=1/n, adjust=False).mean()
    return 100 - 100 / (1 + up / dn)

def stats(pos, ret, carry, cost, label, start=None, end=None):
    """pos: position decided at close t, applied to return t+1. cost: per unit of turnover."""
    pos = pos.shift(1).fillna(0)
    turn = pos.diff().abs().fillna(abs(pos.iloc[0]))
    r = pos * (ret + carry) - turn * cost
    if start: r, pos, turn = r[start:], pos[start:], turn[start:]
    if end: r, pos, turn = r[:end], pos[:end], turn[:end]
    yrs = len(r) / 252
    eq = (1 + r).cumprod()
    cagr = eq.iloc[-1] ** (1 / yrs) - 1
    vol = r.std() * np.sqrt(252)
    sharpe = r.mean() / r.std() * np.sqrt(252) if r.std() > 0 else 0
    mdd = (eq / eq.cummax() - 1).min()
    # trades
    chg = pos.ne(pos.shift()).cumsum()
    tr = r.groupby(chg).sum()[pos.groupby(chg).first() != 0]
    win = (tr > 0).mean() if len(tr) else np.nan
    return dict(strategy=label, CAGR=f"{cagr*100:5.1f}%", vol=f"{vol*100:4.1f}%", Sharpe=round(sharpe, 2),
                MaxDD=f"{mdd*100:5.1f}%", trades_per_yr=round(len(tr) / yrs, 1), win=f"{win*100:4.0f}%",
                avg_trade=f"{tr.mean()*100:5.2f}%" if len(tr) else "", exposure=f"{(pos!=0).mean()*100:3.0f}%")

def strategies(p):
    S = {}
    S["買い持ち"] = pd.Series(1.0, index=p.index)
    for f, s in [(10, 50), (20, 100), (50, 200)]:
        a, b = p.rolling(f).mean(), p.rolling(s).mean()
        S[f"MAクロス{f}/{s} 売買両方"] = np.sign(a - b)
        S[f"MAクロス{f}/{s} 買いのみ"] = (a > b).astype(float)
    S["200日線の上だけ買い"] = (p > p.rolling(200).mean()).astype(float)
    for n in (20, 55):
        hi, lo = p.rolling(n).max().shift(1), p.rolling(n).min().shift(1)
        hx, lx = p.rolling(n // 2).max().shift(1), p.rolling(n // 2).min().shift(1)
        pos, cur = [], 0
        for i in range(len(p)):
            x = p.iloc[i]
            if cur == 0:
                if x > hi.iloc[i]: cur = 1
                elif x < lo.iloc[i]: cur = -1
            elif cur == 1 and x < lx.iloc[i]: cur = 0
            elif cur == -1 and x > hx.iloc[i]: cur = 0
            pos.append(cur)
        S[f"ブレイクアウト{n}日"] = pd.Series(pos, index=p.index, dtype=float)
    for m in (63, 126, 252):
        S[f"モメンタム{m//21}か月"] = np.sign(p / p.shift(m) - 1)
    r2, ma200, ma5 = rsi(p, 2), p.rolling(200).mean(), p.rolling(5).mean()
    pos, cur = [], 0
    for i in range(len(p)):
        x = p.iloc[i]
        if cur == 0:
            if r2.iloc[i] < 10 and x > ma200.iloc[i]: cur = 1
            elif r2.iloc[i] > 90 and x < ma200.iloc[i]: cur = -1
        elif cur == 1 and x > ma5.iloc[i]: cur = 0
        elif cur == -1 and x < ma5.iloc[i]: cur = 0
        pos.append(cur)
    S["RSI2押し目買い/戻り売り(200日線方向)"] = pd.Series(pos, index=p.index, dtype=float)
    S["RSI2押し目買いのみ"] = S["RSI2押し目買い/戻り売り(200日線方向)"].clip(lower=0)
    r14 = rsi(p, 14)
    S["RSI14逆張り(30買/70売)"] = pd.Series(np.where(r14 < 30, 1, np.where(r14 > 70, -1, np.nan)), index=p.index).ffill().fillna(0)
    m, sd = p.rolling(20).mean(), p.rolling(20).std()
    S["ボリンジャー±2σ逆張り"] = pd.Series(np.where(p < m - 2*sd, 1, np.where(p > m + 2*sd, -1, np.where((p - m).abs() < 0.1*sd, 0, np.nan))), index=p.index).ffill().fillna(0)
    S["ボリンジャー±2σ順張り"] = -S["ボリンジャー±2σ逆張り"]
    e12, e26 = p.ewm(span=12).mean(), p.ewm(span=26).mean()
    macd = e12 - e26
    S["MACDシグナルクロス"] = np.sign(macd - macd.ewm(span=9).mean())
    return S

def run(p, carry, cost, periods, title):
    ret = p.pct_change().fillna(0)
    S = strategies(p)
    for (a, b) in periods:
        print(f"\n### {title}  {a}〜{b}")
        rows = [stats(pos, ret, carry, cost, k, a, b) for k, pos in S.items()]
        print(pd.DataFrame(rows).to_string(index=False))

mode = sys.argv[2]
if mode == "usdjpy":
    p = load("DEXJPUS")
    us = load("DFF").reindex(p.index).ffill()
    jp = load("IR3TIB01JPM156N").resample("D").ffill().reindex(p.index).ffill()
    carry = ((us - jp) / 100 / 252).fillna(0)  # long USD earns carry, short pays it
    p = p["2001-01-01":]
    carry = carry.reindex(p.index).fillna(0)
    # carry applied as pos*carry -> short pays. cost 1銭 per side ≈ 0.007%
    run(p, carry, 0.01 / 120, [("2003-01-01", "2014-12-31"), ("2015-01-01", "2026-12-31"), ("2003-01-01", "2026-12-31")], "ドル円(金利差スワップ込み・往復2銭)")
elif mode == "usdjpy_long":
    p = load("DEXJPUS")
    run(p, 0, 0.01/120, [("1973-01-01", "1999-12-31"), ("2000-01-01", "2026-12-31")], "ドル円(価格のみ)")
elif mode == "nikkei":
    p = load("NIKKEI225")["1985-01-01":]
    run(p, 0, 0.0005, [("1990-01-01", "2007-12-31"), ("2008-01-01", "2026-12-31")], "日経平均(片道0.05%)")
