"""毎朝の売買指示を作るスクリプト。

使い方:  python3 -I market/daily.py  > 出力をそのまま指示として読む
データ:  ECB参照レート(api.frankfurter.dev) / FRED / CFTC(publicreporting.cftc.gov) / 財務省 介入実績
ルール:  reports/売買指示書 2026年11月.md の検証済みルールをそのまま機械化したもの
"""
import io, json, datetime as dt, urllib.request, urllib.parse
import numpy as np, pandas as pd

JST = dt.timezone(dt.timedelta(hours=9))
TODAY = dt.datetime.now(JST).date()

# ---- 設定(指示書のルール) -------------------------------------------------
CAPITAL = 100_000          # 資金(円)
RISK_PER_TRADE = 0.02      # 1回の許容損失
LOT = 1_000                # 通貨数
INTERVENTION_ZONE = 160.0  # ここ以上は持たない
HARD_STOP = 155.0          # もみ合い下限の損切り
NO_BUY_ABOVE = 159.0

# 新規で建てない日(日本時間)。期限が来たら更新すること。
EVENTS = {
    "2026-11-06": "米雇用統計(夜)", "2026-11-10": "米CPI(夜)", "2026-11-13": "日経ミニSQ",
    "2026-12-04": "米雇用統計(夜)", "2026-12-08": "FOMC初日", "2026-12-09": "FOMC結果(翌朝)",
    "2026-12-10": "米CPI(夜)/FOMC結果発表", "2026-12-11": "メジャーSQ",
    "2026-12-17": "日銀会合初日", "2026-12-18": "日銀会合結果", "2027-01-08": "米雇用統計(夜)/SQ",
    "2027-01-21": "日銀会合初日", "2027-01-22": "日銀会合結果+展望レポート",
    "2027-01-26": "FOMC初日", "2027-01-27": "FOMC結果(翌朝)",
}
CLOSE_BEFORE = {"2026-12-17": "日銀会合の前日までにドル円の買いを決済"}


def get(url, params=None, timeout=60):
    if params:
        url += "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return r.read()


def fred(series):
    raw = get("https://fred.stlouisfed.org/graph/fredgraph.csv", {"id": series}).decode()
    s = pd.read_csv(io.StringIO(raw), na_values=".")
    s.columns = ["d", "v"]
    return s.assign(d=pd.to_datetime(s.d)).set_index("d").v.dropna()


def rsi(p, n):
    d = p.diff()
    up = d.clip(lower=0).ewm(alpha=1 / n, adjust=False).mean()
    dn = (-d.clip(upper=0)).ewm(alpha=1 / n, adjust=False).mean()
    return 100 - 100 / (1 + up / dn)


out, warn = [], []
P = out.append

# ---- ドル円 ---------------------------------------------------------------
start = (TODAY - dt.timedelta(days=500)).isoformat()
r = json.loads(get(f"https://api.frankfurter.dev/v1/{start}..", {"base": "USD", "symbols": "JPY"}))["rates"]
uj = pd.Series({pd.Timestamp(k): v["JPY"] for k, v in r.items()}).sort_index()
last, ld = uj.iloc[-1], uj.index[-1].date()
ma20, sd20 = uj.rolling(20).mean().iloc[-1], uj.rolling(20).std().iloc[-1]
ma200 = uj.rolling(200).mean()
lower15, lower2 = ma20 - 1.5 * sd20, ma20 - 2 * sd20
flat200 = abs(ma200.iloc[-1] / ma200.iloc[-21] - 1) < 0.01
hi20, lo20 = uj.tail(20).max(), uj.tail(20).min()

# ---- 介入(財務省 月次公表の最新期) ----------------------------------------
try:
    mof = get("https://www.mof.go.jp/policy/international_policy/reference/feio/foreign_exchange_intervention_operations.csv").decode("cp932", "ignore")
    import csv, re
    yr, last_iv = None, None
    for row in csv.reader(io.StringIO(mof)):
        if len(row) < 8:
            continue
        m = re.match(r"(平成|令和)(元|\d+)年", row[0])
        if m:
            yr = {"平成": 1988, "令和": 2018}[m.group(1)] + (1 if m.group(2) == "元" else int(m.group(2)))
        if "円買い" in row[7] and row[1] and row[2]:
            last_iv = (yr, row[1], row[2], row[6])
        last_total = row if "期計" in row[0] else locals().get("last_total")
    iv_note = (f"直近の円買い介入(財務省の日次データ):{last_iv[0]}年{last_iv[1]}{last_iv[2]} {last_iv[3]}億円。"
               f"最新の公表期間:{last_total[0]} 合計{last_total[6]}億円")
except Exception as e:  # 公表形式が変わったら
    iv_note = f"財務省データ取得失敗({e.__class__.__name__})"

# ---- 投機筋の円ポジション(CFTC) ------------------------------------------
try:
    cot = json.loads(get("https://publicreporting.cftc.gov/resource/6dca-aqww.json", {
        "cftc_contract_market_code": "097741", "$order": "report_date_as_yyyy_mm_dd DESC", "$limit": "160",
        "$select": "report_date_as_yyyy_mm_dd,noncomm_positions_long_all,noncomm_positions_short_all,open_interest_all"}))
    c = pd.DataFrame(cot).astype({"noncomm_positions_long_all": float, "noncomm_positions_short_all": float, "open_interest_all": float})
    c["pct"] = (c.noncomm_positions_long_all - c.noncomm_positions_short_all) / c.open_interest_all
    z = (c.pct.iloc[0] - c.pct.iloc[:156].mean()) / c.pct.iloc[:156].std()
    net = c.noncomm_positions_long_all.iloc[0] - c.noncomm_positions_short_all.iloc[0]
    cot_note = (f"投機筋の円: {'買い越し' if net > 0 else '売り越し'} {abs(net):,.0f}枚(3年Zスコア {z:+.1f}、"
                f"{c.report_date_as_yyyy_mm_dd.iloc[0][:10]}時点)。")
    if z > 1.5:
        cot_note += " 円買いが過去3年で極端 → 日銀が利上げを見送るなどで円買いが巻き戻ると、ドル円が急に上がりやすい。"
    elif z < -1.5:
        cot_note += " 円売りが極端 → 介入や日銀サプライズで急落しやすい(2024年7月型)。"
except Exception as e:
    cot_note = f"CFTCデータ取得失敗({e.__class__.__name__})"

# ---- 株・金利・VIX(FRED) --------------------------------------------------
nk, sp, vix, us2, us10 = (fred(s) for s in ("NIKKEI225", "SP500", "VIXCLS", "DGS2", "DGS10"))
nk_ma200 = nk.rolling(200).mean()
nk_r2 = rsi(nk, 2).iloc[-1]

# ---- イベント --------------------------------------------------------------
today_s = TODAY.isoformat()
next3 = [(d, e) for d, e in EVENTS.items() if today_s <= d <= (TODAY + dt.timedelta(days=3)).isoformat()]
no_new = today_s in EVENTS
close_flag = any(today_s >= (pd.Timestamp(d) - pd.Timedelta(days=1)).date().isoformat() and today_s <= d for d in CLOSE_BEFORE)
if max(EVENTS) < (TODAY + dt.timedelta(days=14)).isoformat():
    warn.append("イベント表の期限切れが近い。market/daily.py の EVENTS を更新すること。")

# ---- 判断 ------------------------------------------------------------------
buy_px = round(min(lower15, NO_BUY_ABOVE), 2)
stop_px = HARD_STOP
risk_yen = (buy_px - stop_px) * LOT
tp1, tp2 = round(ma20, 2), round(min(hi20, INTERVENTION_ZONE - 1.2), 2)

if last >= INTERVENTION_ZONE:
    fx_action = f"**全決済・新規禁止**:{INTERVENTION_ZONE}円以上は介入ゾーン。"
elif close_flag:
    fx_action = f"**決済**:{list(CLOSE_BEFORE.values())[0]}。"
elif last < HARD_STOP:
    fx_action = f"**買わない**:{HARD_STOP}円割れ=もみ合い終了。次の日銀会合まで様子見。"
elif no_new:
    fx_action = f"**新規は見送り**(今日は {EVENTS[today_s]})。持っている分は損切り・利確注文をそのまま。"
elif risk_yen > CAPITAL * RISK_PER_TRADE * 1.25:
    fx_action = (f"**待つ**:買い場({buy_px})と損切り({stop_px})が離れすぎ(損失{risk_yen:,.0f}円 > 許容)。"
                 f"ボラティリティが下がるのを待つ。")
else:
    fx_action = (f"**買い指値 {buy_px}円 / 1,000通貨**(今日〜明朝まで有効)。"
                 f" 逆指値(損切り) {stop_px}円、利確 {tp1}円で半分・{tp2}円で残り。"
                 f" 想定損失 約{risk_yen:,.0f}円。")
if not flat200 and last < ma200.iloc[-1] * 0.98:
    warn.append("200日線が下向きで価格も下 → 下落トレンドの可能性。買いは数量を半分に。")

nk_trend = nk.iloc[-1] > nk_ma200.iloc[-1]
if nk_trend and nk_r2 < 10:
    nk_action = "練習シグナル点灯:RSI(2)<10 かつ200日線の上 → デモで買い、5日線を上回る終値で決済、−4%で損切り。"
elif not nk_trend:
    nk_action = f"見送り:200日線({nk_ma200.iloc[-1]:,.0f})の下。上回るまで買わない。"
else:
    nk_action = "シグナルなし(待つ)。"

# ---- 出力 ------------------------------------------------------------------
P(f"# 今日の指示 {today_s}(日本時間)\n")
P("## ドル円")
P(f"- 結論:{fx_action}")
P(f"- 直近:{last:.2f}円(ECB参照レート {ld}、日本時間の前夜0時ごろの値)。注文前に業者の画面で現在値を確認。")
P(f"- 20日線 {ma20:.2f} / −1.5σ {lower15:.2f} / −2σ {lower2:.2f} / 20日の高値 {hi20:.2f}・安値 {lo20:.2f} / 200日線 {ma200.iloc[-1]:.2f}({'横ばい' if flat200 else '傾きあり'})")
P(f"- 金利:米2年 {us2.iloc[-1]:.2f}%({us2.index[-1].date()})、米10年 {us10.iloc[-1]:.2f}%")
P(f"- {cot_note}")
P(f"- {iv_note}")
P("\n## 日経平均")
P(f"- 結論:{nk_action}")
P(f"- 終値 {nk.iloc[-1]:,.0f}({nk.index[-1].date()})、200日線 {nk_ma200.iloc[-1]:,.0f}、RSI(2) {nk_r2:.0f}")
P(f"- S&P500 {sp.iloc[-1]:,.0f}({sp.index[-1].date()})、VIX {vix.iloc[-1]:.1f}{'(警戒水準)' if vix.iloc[-1] > 25 else ''}")
P("\n## この先3日のイベント")
P("\n".join(f"- {d}:{e}" for d, e in next3) or "- なし")
P("\n## 毎回のルール")
P("- 1回の損失は2,000円まで/残高が入金額の−20%で全停止/160円以上は持たない/注文と同時に逆指値")
if warn:
    P("\n## 注意")
    P("\n".join(f"- {w}" for w in warn))
print("\n".join(out))
