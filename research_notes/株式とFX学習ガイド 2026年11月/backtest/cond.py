import numpy as np, pandas as pd
exec(open("bt.py").read().split("def stats")[0].replace("D = sys.argv[1]","D='data'"))
def fwd(p, mask, label, hs=(1,5,10,20)):
    out=[label, f"n={int(mask.sum())}"]
    for h in hs:
        f = (p.shift(-h)/p-1)[mask].dropna()
        out.append(f"{h}日後 平均{f.mean()*100:+.2f}% 上昇{(f>0).mean():.0%} 最悪{f.min()*100:+.1f}%")
    print(" | ".join(out))
p = load("NIKKEI225")["1985":]
ma200=p.rolling(200).mean(); r2=rsi(p,2); slope=ma200>ma200.shift(20)
base = pd.Series(True,index=p.index)
for per,(a,b) in {"1990-2007":("1990","2007"),"2008-2026":("2008","2026-12")}.items():
    q=p[a:b]; m=lambda s:s.reindex(q.index).fillna(False)
    print(f"\n### 日経 {per}")
    fwd(q, m(base), "全日(基準)")
    fwd(q, m(r2<5), "RSI2<5")
    fwd(q, m((r2<5)&(p>ma200)), "RSI2<5 & 200日線上")
    fwd(q, m((r2<5)&(p<ma200)), "RSI2<5 & 200日線下")
    fwd(q, m((r2<5)&(p<ma200)&(p>ma200*0.97)&slope), "★RSI2<5 & 200日線の0〜3%下 & 200日線上向き(今の状況)")
    dd = p/p.rolling(252).max()-1
    fwd(q, m((dd<-0.13)&(dd>-0.18)&slope), "1年高値から-13〜-18% & 200日線上向き")
    down = (p.pct_change()<0).astype(int); streak=down.groupby((down==0).cumsum()).cumsum()
    fwd(q, m(streak>=4), "4日以上続落")
print("\n### RSI2押し目買い(200日線上)のパラメータ感度  日経 2008-2026 / 1990-2007")
for th in (5,10,15,20):
  for ex in ("ma5","rsi70"):
    res=[]
    for a,b in (("2008","2026-12"),("1990","2007")):
        pos,cur=[],0
        ma5=p.rolling(5).mean()
        for i in range(len(p)):
            x=p.iloc[i]
            if cur==0 and r2.iloc[i]<th and x>ma200.iloc[i]: cur=1
            elif cur==1 and ((ex=="ma5" and x>ma5.iloc[i]) or (ex=="rsi70" and r2.iloc[i]>70)): cur=0
            pos.append(cur)
        pos=pd.Series(pos,index=p.index,dtype=float).shift(1).fillna(0)
        rr=(pos*p.pct_change()-pos.diff().abs()*0.0005)[a:b]; pp=pos[a:b]
        g=pp.ne(pp.shift()).cumsum(); tr=rr.groupby(g).sum()[pp.groupby(g).first()==1]
        res.append(f"{a}: 取引{len(tr)} 勝率{(tr>0).mean():.0%} 平均{tr.mean()*100:+.2f}% 損益比{tr[tr>0].mean()/-tr[tr<0].mean():.2f} 最大負け{tr.min()*100:.1f}%")
    print(f"RSI2<{th} 手仕舞い={ex}: "+" / ".join(res))
