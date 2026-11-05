import json, numpy as np, pandas as pd
c = pd.DataFrame(json.load(open("data/cot_jpy.json")))
c["d"] = pd.to_datetime(c.report_date_as_yyyy_mm_dd); c = c.set_index("d")
for k in ["noncomm_positions_long_all","noncomm_positions_short_all","open_interest_all"]: c[k]=c[k].astype(float)
c["net"] = c.noncomm_positions_long_all - c.noncomm_positions_short_all   # +なら投機筋は円買い越し
c["netpct"] = c.net / c.open_interest_all
print("COT 期間", c.index[0].date(), c.index[-1].date(), len(c))
r = json.load(open("data/ecb_usdjpy.json"))["rates"]
p = pd.Series({pd.Timestamp(k): v["JPY"] for k, v in r.items()}).sort_index()
print("ECBドル円", p.index[0].date(), p.index[-1].date(), p.iloc[-1])
# 公表は金曜(火曜時点)。翌週月曜から使う想定で +6日
c.index = c.index + pd.Timedelta(days=6)
x = c[["net","netpct"]].copy()
x["z"] = (x.netpct - x.netpct.rolling(156).mean()) / x.netpct.rolling(156).std()   # 3年Zスコア
x["chg4"] = x.netpct - x.netpct.shift(4)
pa = p.reindex(x.index, method="ffill")
for h in (4, 8, 13):
    x[f"f{h}"] = (p.reindex(x.index + pd.Timedelta(weeks=h), method="ffill").values / pa.values - 1) * 100
x = x.dropna(subset=["z"])
print("\n最新:", x.tail(3)[["net","netpct","z","chg4"]].round(3).to_string())
for per,(a,b) in {"2002-2014":("2002","2014"),"2015-2026":("2015","2026")}.items():
    y = x[a:b]
    print(f"\n## {per} 投機筋の円ポジション(3年Zスコア)別、その後のドル円変化率(%)")
    y["bin"] = pd.cut(y.z, [-9,-1.5,-0.5,0.5,1.5,9], labels=["円売り極端","円売り","中立","円買い","円買い極端"])
    print(y.groupby("bin", observed=True)[["f4","f8","f13"]].agg(["mean","count"]).round(2).to_string())
    print("相関 z vs f8:", round(y.z.corr(y.f8),3), " 4週変化 vs f8:", round(y.chg4.corr(y.f8),3))
