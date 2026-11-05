import re, numpy as np, pandas as pd
exec(open("bt.py").read().split("def stats")[0].replace("D = sys.argv[1]","D='data'"))
rows=[]; era=None; yr=None
eras={"平成":1988,"令和":2018}
for line in open("verify/mof_intervention_daily_utf8.csv",encoding="utf-8"):
    c=next(__import__("csv").reader([line]))
    if len(c)<8: continue
    m0=re.match(r"(平成|令和)(元|\d+)年$",c[0])
    if m0: yr=eras[m0.group(1)]+(1 if m0.group(2)=="元" else int(m0.group(2)))
    mm=re.match(r"(\d+)月$",c[1]); dd=re.match(r"(\d+)日$",c[2])
    if yr and mm and dd and c[6]:
        rows.append(dict(date=pd.Timestamp(yr,int(mm.group(1)),int(dd.group(1))),oku=float(c[6].replace(",","")),kind=c[7]))
iv=pd.DataFrame(rows)
# 2026年7-8月(日次未公表):合計のみ。7/30開始・7/31協調を代表日として追加
print(iv.groupby(iv.date.dt.year).oku.sum().tail(8))
yenbuy=iv[iv.kind.str.contains("日本円買い")]
print("\n円買い介入 日数",len(yenbuy), "期間", yenbuy.date.min().date(), yenbuy.date.max().date())
p=load("DEXJPUS")
# 介入「局面」= 30日以内に続く円買い介入をひとまとめ
yenbuy=yenbuy.sort_values("date"); ep=(yenbuy.date.diff().dt.days>30).cumsum()
print("\n## 円買い介入の局面ごとの動き(NY正午レート)")
out=[]
for k,g in yenbuy.groupby(ep):
    d0=g.date.min(); pre=p[:d0-pd.Timedelta(days=1)]
    if len(pre)<30: continue
    lvl=pre.iloc[-1]; hi20=pre.tail(20).max()
    fut=p[d0:]
    def at(n): return fut.iloc[n]-lvl if len(fut)>n else np.nan
    mn60=fut.head(60).min()-lvl if len(fut) else np.nan
    back = fut.head(250)
    reclaim = (back>=lvl).idxmax().date() if (back>=lvl).any() else "1年以内に戻らず"
    out.append(dict(開始=d0.date(),日数=len(g),合計兆円=round(g.oku.sum()/1e4,2),前日レート=lvl,直前20日高値=hi20,
                   翌日=round(at(1),2),後5日=round(at(5),2),後20日=round(at(20),2),最大下落60日内=round(mn60,2),介入前水準に戻った日=reclaim))
print(pd.DataFrame(out).to_string(index=False))
