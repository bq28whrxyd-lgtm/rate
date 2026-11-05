import numpy as np, pandas as pd
exec(open("bt.py").read().split("def stats")[0].replace("D = sys.argv[1]","D='data'"))
for name in ["DEXJPUS","NIKKEI225","SP500"]:
    p = load(name)
    last = p.iloc[-1]
    print(f"\n== {name} 最新 {p.index[-1].date()} = {last:,.2f}")
    print("直近10日:", ", ".join(f"{d.strftime('%m/%d')} {v:,.2f}" for d,v in p.tail(10).items()))
    for n in (5,20,50,100,200):
        ma = p.rolling(n).mean().iloc[-1]; print(f"  {n}日線 {ma:,.2f} (乖離 {100*(last/ma-1):+.1f}%)  {n}日線の傾き(20日前比) {100*(ma/p.rolling(n).mean().iloc[-21]-1):+.2f}%")
    print(f"  RSI2 {rsi(p,2).iloc[-1]:.0f}  RSI14 {rsi(p,14).iloc[-1]:.0f}")
    m,sd = p.rolling(20).mean().iloc[-1], p.rolling(20).std().iloc[-1]
    print(f"  ボリンジャー20: -2σ {m-2*sd:,.2f} / +2σ {m+2*sd:,.2f}")
    e12,e26 = p.ewm(span=12).mean(), p.ewm(span=26).mean(); macd=e12-e26; sig=macd.ewm(span=9).mean()
    print(f"  MACD {macd.iloc[-1]:.2f} シグナル {sig.iloc[-1]:.2f}")
    y = p[p.index >= p.index[-1]-pd.Timedelta(days=365)]
    print(f"  1年高値 {y.max():,.2f} ({y.idxmax().date()}) 安値 {y.min():,.2f} ({y.idxmin().date()})  高値から {100*(last/y.max()-1):+.1f}%")
    dv = p.pct_change().tail(20).std()
    print(f"  日次変動(20日標準偏差) {dv*100:.2f}% ≈ {dv*last:,.2f}  / 20日高値 {p.tail(20).max():,.2f} 安値 {p.tail(20).min():,.2f}")
    print(f"  12か月リターン {100*(last/p.asof(p.index[-1]-pd.Timedelta(days=365))-1):+.1f}%  3か月 {100*(last/p.asof(p.index[-1]-pd.Timedelta(days=91))-1):+.1f}%")
us, jp = load("DFF"), load("IR3TIB01JPM156N")
print(f"\nFF実効 {us.iloc[-1]} ({us.index[-1].date()}), 日本3か月金利 {jp.iloc[-1]:.2f} ({jp.index[-1].date()}), 米2年 {load('DGS2').iloc[-1]}, 米10年 {load('DGS10').iloc[-1]}, VIX {load('VIXCLS').iloc[-1]}")
