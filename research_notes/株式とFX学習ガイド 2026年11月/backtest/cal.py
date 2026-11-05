import sys, numpy as np, pandas as pd
exec(open("bt.py").read().split("def strategies")[0].replace("D = sys.argv[1]","D='data'"))
for name, start, cost in [("NIKKEI225","1990-01-01",0.0005),("DEXJPUS","1990-01-01",0.0001)]:
    p = load(name)[start:]; r = p.pct_change().dropna()
    print(f"\n##### {name} 日次リターン平均(bp)と上昇確率  {start}〜")
    for lab, (a,b) in {"1990-2007":("1990","2007"),"2008-2026":("2008","2026")}.items():
        x = r[a:b]
        dow = x.groupby(x.index.dayofweek).agg(["mean","count",lambda s:(s>0).mean()])
        dow.index=["月","火","水","木","金"][:len(dow)]; dow.columns=["平均","n","上昇率"]; dow["平均"]*=1e4
        print(f"[{lab}] 曜日\n", dow.round(2).to_string())
        mon = x.groupby(x.index.month).mean()*21*100
        print(f"[{lab}] 月別(月間平均%):", " ".join(f"{m}月{v:+.1f}" for m,v in mon.items()))
        # turn of month: last trading day + first 3
        g = x.groupby([x.index.year, x.index.month])
        rank = g.cumcount(); rrank = g.cumcount(ascending=False)
        tom = (rank<3)|(rrank==0)
        print(f"[{lab}] 月末月初4日 平均{x[tom].mean()*1e4:.1f}bp 上昇率{(x[tom]>0).mean():.0%} / その他 平均{x[~tom].mean()*1e4:.1f}bp 上昇率{(x[~tom]>0).mean():.0%}")
        hal = x.index.month.isin([11,12,1,2,3,4])
        print(f"[{lab}] 11-4月 年率{x[hal].mean()*252*100:.1f}% / 5-10月 年率{x[~hal].mean()*252*100:.1f}%")
        if name=="DEXJPUS":
            gd = x.index.day.isin([5,10,15,20,25,30])
            print(f"[{lab}] ゴトー日(NY正午レート) 平均{x[gd].mean()*1e4:.1f}bp 上昇率{(x[gd]>0).mean():.0%} / その他 {x[~gd].mean()*1e4:.1f}bp {(x[~gd]>0).mean():.0%}")
