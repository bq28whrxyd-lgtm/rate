import numpy as np, pandas as pd
exec(open("bt.py").read().split("def strategies")[0].replace("D = sys.argv[1]","D='data'"))
p = load("DEXJPUS")["2001":]
us = load("DFF").reindex(p.index).ffill()
jp = load("IR3TIB01JPM156N").resample("D").ffill().reindex(p.index).ffill()
carry = ((us - jp)/100/252).fillna(0); ret=p.pct_change().fillna(0)
m, sd = p.rolling(20).mean(), p.rolling(20).std(); ma200=p.rolling(200).mean()
flat = (ma200/ma200.shift(20)-1).abs()<0.01
for k in (1.5,2.0):
  for stopk in (None, 1.5):
    for filt in ("なし","200日線横ばい時のみ"):
        pos,cur,stop=[],0,None
        for i in range(len(p)):
            x=p.iloc[i]
            if cur==0 and x < m.iloc[i]-k*sd.iloc[i] and (filt=="なし" or flat.iloc[i]):
                cur=1; stop = x - stopk*1.0 if stopk else None   # stop in yen
            elif cur==1 and (x>m.iloc[i] or (stop and x<stop)): cur=0
            pos.append(cur)
        pos=pd.Series(pos,index=p.index,dtype=float)
        for a,b in (("2003","2014"),("2015","2026-12")):
            print(f"買いのみ -{k}σ買い→中心線売り 損切り{str(stopk)+'円' if stopk else 'なし'} フィルタ{filt} {a}-{b[:4]}:", stats(pos,ret,carry,0.01/120,"",a,b))
