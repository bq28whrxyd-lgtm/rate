import glob, lzma, struct, sys, numpy as np, pandas as pd
D = sys.argv[1]
rows = []
for f in sorted(glob.glob(f"{D}/h_*.bi5")):
    y, m = map(int, f.split("/")[-1][2:-4].split("_"))
    base = pd.Timestamp(year=y, month=m + 1, day=1, tz="UTC")
    raw = open(f, "rb").read()
    if not raw or raw[:1] == b"{":
        continue
    d = lzma.decompress(raw)
    for i in range(len(d) // 24):
        t, o, c, lo, hi, v = struct.unpack(">5if", d[i*24:(i+1)*24])
        rows.append((base + pd.Timedelta(seconds=t), o/1000, hi/1000, lo/1000, c/1000, v))
h = pd.DataFrame(rows, columns=["t", "o", "h", "l", "c", "v"]).set_index("t")
h = h[h.v > 0]
h.index = h.index.tz_convert("Asia/Tokyo")
print(f"時間足 {len(h)}本  {h.index[0]} 〜 {h.index[-1]}")
h["ret"] = h.c / h.o - 1
h["rng"] = (h.h - h.l)
h["hr"] = h.index.hour
h["yr"] = h.index.year

# 1) 時間帯別のボラティリティ(JST)
print("\n## 時間帯(日本時間)別:平均値幅(銭)と平均リターン(bp)  2012-2026")
g = h.groupby("hr").agg(値幅銭=("rng", lambda s: s.mean()*100), 平均bp=("ret", lambda s: s.mean()*1e4), 上昇率=("ret", lambda s: (s > 0).mean()))
print(g.round(2).T.to_string())

# 2) 仲値:日本時間 8:00〜10:00 の動き(8時足の始値 → 9時足の終値)
days = []
for d, x in h.groupby(h.index.date):
    xx = x[(x.hr >= 8) & (x.hr <= 9)]
    if len(xx) == 2 and pd.Timestamp(d).dayofweek < 5:
        aft = x[(x.hr >= 10) & (x.hr <= 14)]
        days.append(dict(date=pd.Timestamp(d), r810=xx.c.iloc[-1] - xx.o.iloc[0],
                         r1015=(aft.c.iloc[-1] - aft.o.iloc[0]) if len(aft) == 5 else np.nan))
dd = pd.DataFrame(days).set_index("date")
# ゴトー日:5,10,15,20,25,末日(土日なら前営業日に繰上げ)
bd = dd.index
def gotobi_flag(idx):
    flags = pd.Series(False, index=idx)
    for y in range(idx.year.min(), idx.year.max() + 1):
        for m in range(1, 13):
            last = (pd.Timestamp(year=y, month=m, day=1) + pd.offsets.MonthEnd(0)).day
            for day in (5, 10, 15, 20, 25, last):
                t = pd.Timestamp(year=y, month=m, day=day)
                c = idx[idx <= t]
                if len(c) and (t - c[-1]).days <= 3:
                    flags[c[-1]] = True
    return flags
dd["gotobi"] = gotobi_flag(bd)
dd["kind"] = np.where(dd.gotobi, "ゴトー日", "その他")
print("\n## 仲値前(8:00→10:00 日本時間)の動き  単位:銭")
for per, (a, b) in {"2012-2019": ("2012", "2019"), "2020-2026": ("2020", "2026")}.items():
    x = dd[a:b]
    t = x.groupby("kind").agg(日数=("r810", "size"), 平均銭=("r810", lambda s: s.mean()*100), 上昇率=("r810", lambda s: (s > 0).mean()), 中央値銭=("r810", lambda s: s.median()*100))
    print(f"[{per}]\n{t.round(2).to_string()}")
print("\n## 年別:ゴトー日に8時買い→10時売り(0.3銭コスト込み)の合計損益 銭/1ドル")
x = dd[dd.gotobi].copy()
x["pnl"] = (x.r810 - 0.003) * 100
yr = x.groupby(x.index.year).agg(回数=("pnl", "size"), 合計銭=("pnl", "sum"), 勝率=("pnl", lambda s: (s > 0).mean()))
print(yr.round(2).T.to_string())
xo = dd[~dd.gotobi].copy(); xo["pnl"] = (xo.r810 - 0.003) * 100
print(f"参考 ゴトー日以外の毎日8→10時買い:合計{xo.pnl.sum():.0f}銭 勝率{(xo.pnl>0).mean():.0%}")
print("\n## 仲値後(10:00→15:00)の動き 銭")
print(dd.groupby("kind").r1015.agg(lambda s: s.mean()*100).round(2).to_string())

# 3) 曜日×時間帯
h["dow"] = h.index.dayofweek
h.to_pickle(f"{D}/hourly.pkl")
dd.to_pickle(f"{D}/fix.pkl")
