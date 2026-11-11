/* 圧縮アリーナ: ゲームの外の画面(ホーム・クエスト・キャラ・ガチャ・その他)。D-080〜D-086
   (v2.0 D-099) 見た目を「A 王道」にそろえる: 紺のすりガラスに細い金の線、明朝の見出し、金の厚いボタン。
   上の帯(プレイヤーと pt)と下のバー(まん中にクエスト)は全画面で同じ位置。押すと沈み、待機中も少し動く。
   中身はこの端末だけに保存(localStorage)。pt はきもオタレートとまだつながっていないので、テスト用の pt で動く。
   数値はすべて【仮設定】。 */
const A = window.CA_API;
const $ = id => document.getElementById(id);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- キャラと素材のデータ ---------- */
/* ★5 の4人は戦闘に出られる(battle)。★4・★3 は D-085 で Codex が案を出し、山本さんが選ぶまで「仮」 */
const CHARS = [
  { id: 'jin', name: 'ジン', el: '炎', rar: 5, hp: 2600, atk: 1.0, battle: true, evoName: 'ジン(進化)' },
  { id: 'riz', name: 'リズ', el: '木', rar: 5, hp: 2900, atk: .9, battle: true, evoName: 'リズ(進化)' },
  { id: 'gekka', name: '月華', el: '水', rar: 5, hp: 2400, atk: 1.05, battle: true, evoName: '月華(進化)' },
  { id: 'seira', name: 'セイラ', el: '光', rar: 5, hp: 2500, atk: 1.1, battle: true, evoName: 'セイラ(進化)' },
  /* (v69) ★4・★3 の8人(D-105)。数字は index.html の ROSTER と同じ */
  /* (v109) 新しい★5の4人(D-128)。数字は index.html の ROSTER と同じ */
  ...['beni', 'shion', 'ibara', 'lumie'].map(k => { const r = A.ROSTER[k]; return { id: k, name: r.name, el: r.el, rar: 5, hp: r.hp0, atk: r.atk0, battle: true, evoName: r.name + '(進化)' }; }),
  ...['kagura', 'yomogi', 'minamo', 'lux', 'pom', 'pukuru', 'futa', 'tomori', 'hinoko', 'kurumi', 'nagi', 'kirara'].map(k => { const r = A.ROSTER[k]; return { id: k, name: r.name, el: r.el, rar: r.rar, hp: r.hp0, atk: r.atk0, battle: true }; }),
  /* (11/9) 降臨ボスの化身。降臨で25%で落ちる★5(ガチャには出ない)。数字は index.html の ROSTER と同じ */
  ...['garou', 'mizuchi', 'mokuren', 'seres'].map(k => { const r = A.ROSTER[k]; return { id: k, name: r.name, el: r.el, rar: 5, hp: r.hp0, atk: r.atk0, battle: true, evoName: r.name + '(進化)', drop: r.drop }; }),
  /* (11/10) ゲームバカイベントのゲーマー女子。lim = 限定ガチャだけ(英雄召喚には出ない)。ソラは降臨の化身 */
  ...['gbpro', 'gbsnp', 'gbrhy', 'gbret', 'gbfgt', 'gbhea', 'gbstr', 'gbpzl'].map(k => { const r = A.ROSTER[k]; return Object.assign({ id: k, name: r.name, el: r.el, rar: r.rar, hp: r.hp0, atk: r.atk0, battle: true }, r.rar === 5 ? { evoName: r.name + '(進化)' } : {}, r.drop ? { drop: r.drop } : { lim: 1 }); }),
];
/* ゲーマー女子の二つ名(キャラ画面などで使う) */
const GB_TITLE = { gbret: 'ドット森の妖精', gbsnp: '蒼眼の狙撃姫', gbfgt: '紅蓮の拳姫', gbrhy: '天奏の歌姫', gbhea: '森癒の賢者', gbstr: '爆盛り配信姫', gbpro: '孤高の電脳覇者', gbpzl: '蒼き解答者' };
const CH = Object.fromEntries(CHARS.map(c => [c.id, c]));
const LEAD = Object.fromEntries(Object.values(A.ROSTER).map(a => [a.key, a.ln]));
const OLDID = { t40: 'kagura', t41: 'yomogi', t42: 'minamo', t43: 'lux', t30: 'hinoko', t31: 'kurumi', t32: 'nagi', t33: 'kirara' };
const MATS = {
  expS: { name: '経験値の竜・小', exp: 800, ico: 'S' },
  expM: { name: '経験値の竜・中', exp: 3000, ico: 'M' },
  expL: { name: '経験値の竜・大', exp: 12000, ico: 'L' },
  orb_炎: { name: '炎の宝珠', el: '炎', ico: '炎' }, orb_木: { name: '木の宝珠', el: '木', ico: '木' },
  orb_水: { name: '水の宝珠', el: '水', ico: '水' }, orb_光: { name: '光の宝珠', el: '光', ico: '光' },
};
const MAXLV = { 3: 30, 4: 50, 5: 70, 6: 90 }, EVO_MAX = 90, EVO_ORBS = 3;
/* (v84) 進化できるのは★5だけ(★5→★6)。★3・★4は進化しない(D-112) */
const EVO_COST = { 5: 5 }, EVOK = { 5: 1.25 };
const canEvo = u => CH[u.id].rar === 5 && !u.evo;
const rarOf = u => CH[u.id].rar + (u.evo ? 1 : 0);
/* アビリティ: ★5は最初から1つ、★6に進化すると2つ目。★4は最初から1つ。★3はなし(D-112) */
const ABIL = {
  shellBreak: { n: '殻割り', d: 'ぶつかると殻の竜の殻を割る' }, antiAnchor: { n: 'ふんばり無視', d: 'ふんばり竜にもダメージがそのまま通る' },
  antiFog: { n: '毒霧無効', d: '毒霧を通ってもダメージを受けない' }, antiBomb: { n: '爆発無効', d: '爆弾・ふくらみ竜の爆発でダメージを受けない' },
  bossKiller: { n: 'ボスキラー', d: '中ボス・ラスボスへのダメージ1.5倍' }, crit: { n: '会心', d: '20%で、ぶつかったダメージが2倍' },
  regen: { n: '手番回復', d: '手番の終わりにチームHPを2%回復' }, guard: { n: '守り', d: '敵の攻撃で受けるダメージが3割へる' },
  /* (11/9) 降臨キャラの特効。ボスの種類は、そのステージのラスボスの形で決まる */
  killTree: { n: '樹キラー', d: '樹のボスがいるステージで、中ボス・ラスボスへのダメージ2倍(翠緑の巨樹王・古樹の巨人モルグなど)' },
  killBeast: { n: '獣キラー', d: '獣のボスがいるステージで、中ボス・ラスボスへのダメージ2倍(紅蓮の獣王・炎角獣ザルガンなど)' },
  killDragon: { n: '竜キラー', d: '竜のボスがいるステージで、中ボス・ラスボスへのダメージ1.5倍' },
  killGuard: { n: '番人キラー', d: '中ボスへのダメージ1.5倍' },
  /* (11/10) ゲームバカイベント */
  antiGlitch: { n: 'グリッチ無効', d: 'グリッチゾーンに入っても向きが曲がらない' }, killGacha: { n: '魔神キラー', d: 'ガチャ魔神(ゲームバカの限定降臨)へのダメージ2倍' },
};
const CABIL = { gbpro: ['antiGlitch', 'killGacha'], gbsnp: ['antiFog', 'antiGlitch'], gbrhy: ['killGacha', 'regen'], gbpzl: ['antiGlitch', 'killGacha'], gbret: ['antiGlitch'], gbfgt: ['killGacha'], gbhea: ['antiFog'], gbstr: ['antiBomb'], garou: ['killTree', 'crit'], mizuchi: ['killBeast', 'guard'], mokuren: ['killDragon', 'regen'], seres: ['killGuard', 'antiAnchor'], beni: ['antiBomb', 'crit'], shion: ['guard', 'regen'], ibara: ['antiFog', 'shellBreak'], lumie: ['bossKiller', 'antiAnchor'], pom: ['antiBomb'], pukuru: ['guard'], futa: ['antiAnchor'], tomori: ['regen'], jin: ['shellBreak', 'bossKiller'], riz: ['antiFog', 'regen'], gekka: ['antiAnchor', 'crit'], seira: ['antiBomb', 'guard'], kagura: ['shellBreak'], yomogi: ['regen'], minamo: ['antiAnchor'], lux: ['guard'] };
const abilOf = u => { const a = CABIL[u.id] || []; return CH[u.id].rar === 5 && !u.evo ? a.slice(0, 1) : a; };
const GACHA = { one: 100, ten: 900, rate: { 5: .02, 4: .26, 3: .72 } };   /* (11/7) ★5は2%(山本さん) */
   /* D-082: 装備ガチャと同じ値段。10連は★4以上1体確定 */
const need = lv => Math.floor(20 * Math.pow(lv, 1.3));            /* lv → lv+1 に要る経験値 */
const maxLv = u => MAXLV[rarOf(u)];
/* (v102) 凸(D-124): 同じキャラを重ねると、1凸ごとに体力・攻撃 +3%(4凸まで)。2凸と4凸でスキルの手番が1つ短くなる。
   ★4の4凸(最大Lv)は ★5の0凸(最大Lv)より弱いままになる数字にしてある */
const TOT_MAX = 4, TOT_K = .03;
const totOf = u => Math.min(TOT_MAX, u.tot || 0), skCut = u => (totOf(u) >= 2 ? 1 : 0) + (totOf(u) >= 4 ? 1 : 0);
const mult = u => (1 + (u.lv - 1) * .029)/* (11/8) レベルが効くように: Lv70で約3倍(前は1.5倍) */ * (u.evo ? (EVOK[CH[u.id].rar] || 1) : 1) * (1 + TOT_K * totOf(u));   /* 体力と攻撃の倍率(進化で★が上がると大きく上がる) */
const feedExp = (u, base) => { const c = CH[u.id]; const e = 150 * c.rar * c.rar * u.lv; return Math.round(e * (base && CH[base.id].el === c.el ? 1.5 : 1)); };
const elCol = el => '#' + A.OEL[el].c.toString(16).padStart(6, '0');
const elDeep = el => '#' + A.OEL[el].e.toString(16).padStart(6, '0');

/* ---------- 保存 ---------- */
/* (v120) きもオタレートの「分身」の中で動くとき(外の画面に CAHOST がある)は、pt とセーブをアプリにつなぐ。
   pt はアプリのものを使い、セーブはアプリのサーバーに置く。ひとりで開いたとき(試作のページ)は今までどおりこの端末に保存 */
const HOST = (() => { try { return window.parent !== window && window.parent.CAHOST ? window.parent.CAHOST : null; } catch (e) { return null; } })();
const KEY = 'ca_save_v1';
function putS() { if (HOST) { try { HOST.save('s', S); } catch (e) { } return; } try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }   /* (v125) ひとりで開いたときに自分を呼び続けて止まっていたのを直す */
const ptNow = () => HOST ? HOST.points() : S.pt;
const ptSpend = (n, kind) => { if (HOST) return HOST.spend(n, kind); if (S.pt < n) return false; S.pt -= n; return true; };
const ptGain = n => { if (HOST) return HOST.earn(n); S.pt += n; return n; };
/* (v125) スキン(山本さん 11/7): 前の分身のスキンを、どのキャラにもつけられる。能力は変わらず、立ち絵・顔・バトルの駒が変わる。
   1つのスキンは1人にだけつけられる。アプリの中では持っているものだけ(HOST.skins)、ひとりで開いたときは全部試せる */
const SKINS = { hood: { n: 'オーバーサイズ' }, chibi: { n: 'ふくれっつら' }, vt1: { n: 'ひだまりニット' }, vt2: { n: 'はなかんむり' }, vt3: { n: '堕ちた天使' }, hw: { n: '夜宴の小悪魔' }, knight: { n: 'かぼちゃ頭の騎士' } };
const skinsOwned = () => { try { return HOST ? (HOST.skins ? HOST.skins() || [] : []) : Object.keys(SKINS); } catch (e) { return []; } };
const skinArt = v => !!(PORT['skin_' + v] || (A.PORT && A.PORT.img && A.PORT.img['skin_' + v]));
/* (v126) スキンは編成の枠につける(山本さん「設定した場所に編成したら、そのキャラがスキンに変わる」)。S.sslot[枠]=スキン */
const slotSkin = i => { const v = (S.sslot || [])[i]; return v && SKINS[v] && skinsOwned().includes(v) ? v : null; };
const skinOf = id => { const i = (S.team || []).findIndex(uid => { const x = S.units.find(y => y.u === uid); return x && x.id === id; }); return i < 0 ? null : slotSkin(i); };
/* (11/7 山本さん) はじめはキャラ0人。最初に無料の10回召喚(ふつうの確率)を1回引ける(free10) */
function fresh() { return { v: 1, pt: 3000, next: 5, st2: 1, free10: 1, units: [], party: {}, team: [], mats: {}, newIds: [], home: null, name: 'プレイヤー', lead: null, stars: {}, evt: {}, pity: 0, box: [], dm: { date: '', win: 0, power: 0, gacha: 0, got: [] }, hd: { date: '', n: {} } }; }
let S = fresh();
let OLD0 = false;
try { const o = HOST ? HOST.load('s') : JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && o.v === 1) { OLD0 = !o.st2; S = Object.assign(fresh(), o); } } catch (e) { }
/* (11/7) 前のはじめ方(★5の4人つき)のセーブ: その4人(番号1〜4)を消して、無料の10回召喚を1回わたす。ガチャで引いた同じキャラは残る */
if (OLD0) { const gone = new Set(S.units.filter(x => x.u <= 4 && ['jin', 'riz', 'gekka', 'seira'].includes(x.id)).map(x => x.u)); S.units = S.units.filter(x => !gone.has(x.u)); S.newIds = (S.newIds || []).filter(u => !gone.has(u)); S.team = (S.team || []).filter(u => !gone.has(u)); S.party = {}; S.st2 = 1; S.free10 = 1; if (!S.units.some(x => x.id === S.home)) S.home = null; }
if (HOST) { try { S.name = HOST.name() || S.name; } catch (e) { } }
if (S.skin) { S.sslot = S.sslot || [null, null, null, null]; (S.team || []).forEach((uid, i) => { const x = S.units.find(y => y.u === uid); if (x && S.skin[x.id] && !S.sslot.includes(S.skin[x.id])) S.sslot[i] = S.skin[x.id]; }); delete S.skin; }
/* (v69) 古いセーブ: 仮の★4・★3を新しいキャラに置きかえ、編成を4つの枠(team)にする */
for (const x of S.units) if (OLDID[x.id]) x.id = OLDID[x.id];
S.units = S.units.filter(x => CH[x.id]);
/* (11/11) 山本さん「ボックス…上限決めた方がいい」: キャラBOXは100体まで。100ptで+10体ずつ、最大200体まで広げられる。いっぱいのときはガチャと出撃を止める(モンストと同じ)。
   上限を入れる前から多く持っていた人は、今の数+10体(10体きざみ)を最初の上限にする(急に遊べなくならないように) */
const BOX_CAP0 = 100, BOX_STEP = 10, BOX_MAX = 200, BOX_COST = 100;
if (!S.cap) S.cap = S.units.length >= BOX_CAP0 ? Math.ceil((S.units.length + BOX_STEP) / BOX_STEP) * BOX_STEP : BOX_CAP0;
const boxCap = () => S.cap || BOX_CAP0, boxFull = n => S.units.length + (n || 0) > boxCap();
/* (v98) 章を足してイベントの番号がずれたので、★の記録(n12 など)を新しい番号に移す */
if ((S.mn || 8) !== A.MAIN_N) { const mn = S.mn || 8, ns = {}; for (const k in S.stars) { const j = +k.slice(1); ns[k[0] + (j < mn ? j : j - mn + A.MAIN_N)] = S.stars[k]; } S.stars = ns; S.mn = A.MAIN_N; putS(); }
/* (v84) ★3・★4の進化をなくしたので、進化ずみの子は元にもどし、使った宝珠を返す */
S.mats = S.mats || {};
for (const x of S.units) { const r = CH[x.id].rar; if (x.evo && r < 5) { x.evo = 0; x.lv = Math.min(x.lv, MAXLV[r]); const k = 'orb_' + CH[x.id].el; S.mats[k] = (S.mats[k] || 0) + ({ 3: 1, 4: 3 }[r] || 0); putS(); } }
if (!Array.isArray(S.team)) S.team = []; S.team = S.team.filter(uid => unit0(uid));
function unit0(uid) { return S.units.find(x => x.u === uid); }
fixTeam();
/* 編成を4人(ちがうキャラ)にそろえる。足りないときは強い順に入れる。リーダーとホームのキャラも決める */
function fixTeam() { const used = new Set(S.team.map(uid => unit0(uid).id)); for (const x of S.units.slice().sort((a, b) => CH[b.id].rar - CH[a.id].rar || b.lv - a.lv)) { if (S.team.length >= 4) break; if (used.has(x.id)) continue; used.add(x.id); S.team.push(x.u); } if (S.team.length && !S.team.some(uid => unit0(uid).id === S.lead)) S.lead = unit0(S.team[0]).id; if (!S.team.length) S.lead = null; if (!S.units.some(x => x.id === S.home)) S.home = S.lead; }
putS();
function save() { putS(); syncParty(); renderTop(); }
/* (11/8 山本さん) 管理者が経験値の竜を回収する。アプリの caadj/{pid} に書かれた分を、分身を開いたときに1回だけ引く。
   持っている竜から引き、足りない分はキャラのレベルから経験値を引いて下げる(レベルの高いキャラから) */
const totExp = u => { let T = u.exp || 0; for (let l = 1; l < u.lv; l++) T += need(l); return T; };
function setTot(u, T) { let lv = 1; const ml = maxLv(u); while (lv < ml && T >= need(lv)) { T -= need(lv); lv++; } u.lv = lv; u.exp = lv >= ml ? 0 : Math.max(0, Math.round(T)); }
function applyAdj() {
  if (!HOST || !HOST.adj) return; let L = []; try { L = HOST.adj() || []; } catch (e) { } S.adjDone = S.adjDone || []; const out = [];
  for (const a of L) {
    if (!a || !a.id || S.adjDone.includes(a.id)) continue;
    if (a.g) { const L2 = ['expS', 'expM', 'expL'].map(k => ({ k: 'mat', id: k, n: Math.max(0, Math.floor(+a[k] || 0)) })).filter(r => r.n); addBox(L2, '管理者から'); S.adjDone.push(a.id); if (L2.length) out.push({ g: 1, tk: L2.map(r => MATS[r.id].name.replace('経験値の竜・', '') + '×' + r.n), down: 0 }); continue; }  /* (11/8) 配布: プレゼント箱へ */
    let lost = 0, down = 0; const tk = [];
    for (const k of ['expS', 'expM', 'expL']) { const n = Math.max(0, Math.floor(+a[k] || 0)); if (!n) continue; const have = S.mats[k] || 0, t = Math.min(have, n); S.mats[k] = have - t; lost += (n - t) * MATS[k].exp; tk.push(MATS[k].name.replace('経験値の竜・', '') + '×' + n); }
    for (const u of S.units.slice().sort((x, y) => y.lv - x.lv || y.exp - x.exp)) { if (lost <= 0) break; const T = totExp(u), k = Math.min(T, lost); if (k <= 0) continue; const b = u.lv; setTot(u, T - k); lost -= k; down += b - u.lv; }
    S.adjDone.push(a.id); if (S.adjDone.length > 100) S.adjDone = S.adjDone.slice(-100); out.push({ tk, down });
  }
  if (!out.length) return; save();
  const gv = out.filter(o => o.g), tk = out.filter(o => !o.g); if (gv.length && !tk.length) { setTimeout(() => flash('プレゼント箱に経験値の竜が届きました(' + gv.map(o => o.tk.join('・')).join(' / ') + ')'), 1200); renderNow(); return; }
  setTimeout(() => modal('経験値の竜の回収', (b, close) => { b.innerHTML = `<p style="text-align:center">管理者が経験値の竜を回収しました。<br><b>${tk.map(o => o.tk.join('・')).join(' / ')}</b>${gv.length ? '<br><span style="font-size:12px">プレゼント箱にも届いています(' + gv.map(o => o.tk.join('・')).join(' / ') + ')</span>' : ''}${tk.some(o => o.down) ? `<br><span style="font-size:12px">持っている竜で足りない分は、キャラのレベルから引きました(合計 Lv −${tk.reduce((a, o) => a + o.down, 0)})</span>` : ''}</p>`; const r = h('div', 'orow'); r.style.padding = '0'; r.appendChild(btn('shine', 'OK', close)); b.appendChild(r); }), 1200);
}
function unit(uid) { return S.units.find(x => x.u === uid); }
function teamUnits() { return S.team.map(unit).filter(Boolean); }
function syncParty() { const P = {}, AB = {}, T = teamUnits(); for (const x of T) { P[x.id] = mult(x); AB[x.id] = abilOf(x); } window.CA_PARTY = P; window.CA_ABIL = AB; window.CA_EVO = Object.fromEntries(T.map(x => [x.id, x.evo ? 1 : 0])); window.CA_SKIN = Object.fromEntries(T.map(x => [x.id, skinOf(x.id)]).filter(e => e[1])); window.CA_TEAM = T.map(x => x.id); window.CA_SKCUT = Object.fromEntries(T.map(x => [x.id, skCut(x)])); window.CA_LEAD = Math.max(0, T.findIndex(x => x.id === S.lead)); }
syncParty();

/* ---------- 絵 ---------- */
let CHIBI = {}, PORT = {};
import('./chibi.js?v=83').then(m => { CHIBI = m.C; renderNow(); }).catch(() => { });
import('./portraits.js?v=83').then(m => { PORT = m.P; renderNow(); }).catch(() => { });
const faceCache = {};
/* (v84) 進化した★6は進化後の絵(jin6 など)。絵がまだないときは元の絵(D-112) */
const evoArt = (id, evo, raw) => { const v = !raw && skinOf(id); if (v && PORT['skin_' + v]) return 'skin_' + v; return evo && PORT[id + '6'] ? id + '6' : id; };
const homeEvo = () => S.units.some(x => x.id === S.home && x.evo);
function faceURL(id, evo, raw) {
  const sv = !raw && skinOf(id), k = sv && A.PORT.img['skin_' + sv] ? 'skin_' + sv : evo && A.PORT.img[id + '6'] ? id + '6' : id;
  if (faceCache[k]) return faceCache[k];
  if (!A.PORT.ready || !A.PORT.img[k] || !CH[id]) return null;
  try { faceCache[k] = A.portCanvas(k, CH[id].el, 256, 50, false).toDataURL('image/webp', .9); } catch (e) { return null; }
  return faceCache[k];
}
const UI = './assets/ui/', ST = './assets/stages/';
/* 属性のひし形 */
const elGem = (el, sz) => `<i class="aG" style="--ec:${elCol(el)};--ed:${elDeep(el)};${sz ? `width:${sz}px;height:${sz}px;font-size:${Math.round(sz * .5)}px` : ''}">${esc(el)}</i>`;
const stars = n => `<span class="aSt">${'★'.repeat(n)}</span>`;

/* キャラのカード(BOX・編成・ガチャ結果で同じ形) */
/* (v96) 長押しでくわしい画面。iPhoneで絵を長押しすると「画像を保存」のメニューが出て止まるので、
   絵には触れないようにして(CSS)、指が少し動いても続ける。長押しのあとのタップは止める */
function longPress(e, fn) {
  let lp = 0, fired = false, x0 = 0, y0 = 0;
  const stop = () => clearTimeout(lp);
  e.addEventListener('pointerdown', ev => { fired = false; x0 = ev.clientX; y0 = ev.clientY; stop(); lp = setTimeout(() => { fired = true; try { navigator.vibrate && navigator.vibrate(15); } catch (er) { } fn(); }, 450); });
  e.addEventListener('pointermove', ev => { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 12) stop(); });
  for (const ev of ['pointerup', 'pointercancel']) e.addEventListener(ev, stop);
  e.addEventListener('click', ev => { if (fired) { ev.stopImmediatePropagation(); ev.preventDefault(); fired = false; } }, true);
  e.addEventListener('contextmenu', ev => ev.preventDefault());
  e.style.webkitTouchCallout = 'none'; e.style.webkitUserSelect = 'none'; e.style.userSelect = 'none';
}
function icon(u, opts) {
  const c = CH[u.id], f = faceURL(u.id, u.evo), o = opts || {};
  const e = h('button', 'aCard r' + rarOf(u) + (u.evo ? ' evo' : '') + (o.sel ? ' sel' : '') + (o.dim ? ' dim' : '') + (o.big ? ' big' : ''));
  e.type = 'button'; e.style.setProperty('--ec', elCol(c.el)); e.style.setProperty('--ed', elDeep(c.el));
  e.innerHTML = `<span class="fr"><span class="pic">${f ? `<img alt="" src="${f}">` : `<span class="ph"><b>${esc(c.el)}</b><i>準備中</i></span>`}</span>${elGem(c.el)}<b class="lv">Lv<i>${u.lv}</i></b>${stars(rarOf(u))}${totOf(u) ? `<b class="tt${totOf(u) >= TOT_MAX ? ' mx' : ''}">${totOf(u) >= TOT_MAX ? '完' : totOf(u)}</b>` : ''}</span>` + (o.tag ? `<em class="${o.tag === 'NEW' ? 'nw' : ''}">${esc(o.tag)}</em>` : '');
  e.setAttribute('aria-label', `${c.name} ★${rarOf(u)} Lv${u.lv}(長押しでくわしく)`);
  /* 長押しでくわしい画面(押したまま0.5秒)。そのときはふつうのタップを止める */
  longPress(e, () => detail(u));
  return e;
}

/* ---------- 見た目 ---------- */
const CSS = `
:root{--mi:"Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho",serif;--zk:"Zen Kaku Gothic New","M PLUS 1p","Hiragino Kaku Gothic ProN",system-ui,sans-serif;
  --aInk:#ffffff;--aDim:#c3cbe6;--aMut:#97a2c6;--aG1:#fff2c2;--aG:#e8c878;--aG2:#c99b3c;--aG3:#7a5a1e;--aN0:#050b22;--aN1:#0e1842;--aN2:#17265c;--aLine:rgba(232,200,120,.5);--aPanel:#0f1a45}
/* 下のバー(高さ56): まん中のクエストだけ金の丸 */
#onav{position:absolute;left:0;right:0;bottom:0;z-index:40;height:calc(env(safe-area-inset-bottom,0px) + 56px);display:grid;grid-template-columns:repeat(5,1fr);align-items:end;padding:0 max(4px,env(safe-area-inset-right,0px)) env(safe-area-inset-bottom,0px) max(4px,env(safe-area-inset-left,0px));background:linear-gradient(180deg,#121d4c,#070d28);box-shadow:0 -1px 0 var(--aG),0 -6px 16px rgba(0,0,0,.45);pointer-events:auto}
#onav button{position:relative;border:0;background:none;cursor:pointer;display:grid;justify-items:center;gap:2px;padding:0 0 7px;color:#9aa6cc;font:700 10px var(--zk);transition:transform .1s,color .15s}
#onav svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
#onav button[aria-current="page"]{color:var(--aG1)}
#onav button[aria-current="page"]::before{content:"";position:absolute;top:0;left:22%;right:22%;height:2px;background:var(--aG1);box-shadow:0 0 8px rgba(255,210,120,.8)}
#onav .mid{padding-bottom:6px;color:var(--aG1)}
#onav .mid::before{display:none}
#onav .mid .md{width:48px;height:48px;margin-top:-16px;border-radius:50%;display:grid;place-items:center;color:#3a2404;background:radial-gradient(circle at 50% 30%,#fff6d2,#f0c45a 48%,#a8701c 82%);box-shadow:0 0 0 2px #2a1a00,0 0 0 3.5px var(--aG),0 4px 10px rgba(0,0,0,.6)}
#onav .mid .md svg{width:24px;height:24px;stroke-width:2.4}
#onav button:active{transform:scale(.92)}
#onav button:focus-visible{outline:2px solid var(--aG1);outline-offset:-2px;border-radius:8px}
/* 上の帯(高さ40) */
#ohud{position:absolute;left:0;right:0;top:0;z-index:41;box-sizing:border-box;display:flex;gap:6px;align-items:center;height:calc(env(safe-area-inset-top,0px) + 44px);padding:env(safe-area-inset-top,0px) max(8px,env(safe-area-inset-right,0px)) 0 max(8px,env(safe-area-inset-left,0px));background:linear-gradient(180deg,rgba(5,10,32,.92),rgba(5,10,32,.55));pointer-events:none}
#ohud>*{pointer-events:auto}
.aPl{display:flex;align-items:center;gap:7px;min-width:0;flex:1;max-width:150px;padding:3px 10px 3px 3px;border-radius:20px;cursor:pointer;border:0;color:#fff;font:inherit;text-align:left;background:rgba(14,24,66,.9);box-shadow:inset 0 0 0 1px var(--aLine)}
.aAv{width:30px;height:30px;flex:none;border-radius:50%;background:#1a2654 center/cover no-repeat;box-shadow:0 0 0 1.5px var(--aG)}
.aPn{display:block;font:700 12px var(--zk);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.aRk{display:flex;align-items:center;gap:5px;font:700 9px var(--zk);color:var(--aMut)}
.aRk b{font:900 11px var(--zk);color:var(--aG1)}
.aRk .bar{width:52px;height:3px;border-radius:2px;background:rgba(255,255,255,.15);overflow:hidden}.aRk .bar i{display:block;height:100%;background:var(--aG)}
.aCur{margin-left:auto;display:flex;align-items:center;gap:5px;height:26px;padding:0 3px 0 7px;border-radius:13px;font-variant-numeric:tabular-nums;background:rgba(14,24,66,.9);box-shadow:inset 0 0 0 1px var(--aLine)}
.aCur svg{width:15px;height:15px;flex:none}
.aCur b{min-width:48px;text-align:right;font:900 13px var(--zk);color:#fff}
.aCur small{font:700 8px var(--zk);color:#ffb0b8}
.aCur button{width:20px;height:20px;border:0;border-radius:5px;cursor:pointer;display:grid;place-items:center;font:900 14px/1 var(--zk);color:#3a2706;background:linear-gradient(#fff2c2,#c99b3c)}
/* 板: 不透明の紺+金の細線(文字が読みやすいように透かさない) */
.aGl{background:var(--aPanel);box-shadow:inset 0 0 0 1px var(--aLine),0 2px 8px rgba(0,0,0,.4)}
.aPanel{position:relative;border-radius:8px;padding:12px}
.aPanel h3{margin:0 0 4px;font:900 15px var(--zk);color:#fff}
.aPanel p{margin:0;font:500 13px/1.6 var(--zk);color:var(--aDim)}
/* 中身の入れ物 */
#oroot{position:absolute;inset:0;z-index:35;pointer-events:auto;display:flex;flex-direction:column;background:var(--aN0);padding:calc(env(safe-area-inset-top,0px) + 48px) max(10px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 60px) max(10px,env(safe-area-inset-left,0px));overflow:hidden;isolation:isolate}
#oroot[hidden]{display:none}
#oroot>.aBg{position:absolute;inset:0;z-index:-1;pointer-events:none;background:url(${UI}home-bg.webp) center top/cover no-repeat,#0b1a45;opacity:.32;filter:saturate(.7) blur(2px)}
#oroot>.aBg::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,11,34,.5),rgba(5,11,34,.92) 40%)}
#oroot>.aBg.qbg{background:url(${ST}chapter-01-normal.webp) center top/cover no-repeat,#0b2a6a;opacity:1;filter:none}
#oroot>.aBg.qbg.hd{background:url(${ST}chapter-01-hard.webp) center top/cover no-repeat,#200d23}
#oroot>.aBg.qbg::after{background:linear-gradient(180deg,rgba(4,10,34,.2),rgba(4,10,34,.5) 30%,rgba(4,10,34,.45) 62%,rgba(4,10,34,.1))}
#oroot>.aBg.qbg.hd::after{background:linear-gradient(180deg,rgba(26,4,14,.2),rgba(26,4,14,.5) 30%,rgba(26,4,14,.45) 62%,rgba(26,4,14,.1))}
.qin{animation:qIn .38s cubic-bezier(.16,1,.3,1) both}
@keyframes qIn{from{opacity:0;transform:translateX(26px)}to{opacity:1;transform:none}}
.qPl.cur.qin{animation:qIn .38s cubic-bezier(.16,1,.3,1) both,qPulse 1.6s ease-in-out .5s infinite}
.qMore{position:relative;display:flex;align-items:center;gap:10px;min-height:56px;margin-top:2px;padding:8px 14px;border-radius:10px;background:rgba(6,10,30,.55);box-shadow:inset 0 0 0 1.5px rgba(233,197,106,.45);overflow:hidden}
.qMore .lks{display:flex;gap:2px;color:#e9c56a;opacity:.85}
.qMore .t{font:800 14px var(--zk);color:#d6dcf0;white-space:nowrap}.qMore .t b{font-size:18px;color:#fff;-webkit-text-stroke:3px #0a1030;paint-order:stroke fill}
.qMore .lb{margin-left:auto;display:flex;align-items:center;gap:6px}
.qMore .lb img{position:static;height:46px;width:auto;max-width:none;filter:brightness(0) drop-shadow(0 0 6px rgba(255,90,90,.7));opacity:.9}
.qMore .lb em{font:800 11px var(--zk);font-style:normal;color:#ff9a9a}
.qDf button .lk{display:inline-flex;vertical-align:-2px;margin-right:4px}.qDf button small{display:block;margin-top:-2px;font:700 10px var(--zk);color:#c6cbe0;-webkit-text-stroke:0}
.qDf button:disabled{opacity:.7;line-height:1.2}
.aTitle{display:flex;align-items:baseline;gap:8px;margin:2px 2px 6px}
.aTitle h2{margin:0;font:800 20px var(--mi);color:#fff;letter-spacing:.08em}
.aTitle small{font:700 9px var(--cin);letter-spacing:.3em;color:var(--aG)}
.aTabs,.ssqt{display:flex;gap:4px;margin:0 0 8px;padding:4px;border-radius:11px;background:linear-gradient(#0c1640,#060c28);box-shadow:inset 0 0 0 1.5px rgba(232,200,120,.55),0 3px 8px rgba(0,0,0,.4)}
.aTabs button,.ssqt button{flex:1;border:0;cursor:pointer;height:36px;border-radius:8px;background:none;color:#aeb8de;font:900 14px var(--zk);transition:background .15s}
.aTabs button[aria-selected="true"],.ssqt button[aria-selected="true"]{color:#2b1a02;background:linear-gradient(180deg,#fff6d0,#f0c868 50%,#c08a2c);box-shadow:inset 0 2px 0 rgba(255,255,255,.6),inset 0 -2px 0 rgba(90,50,8,.5),0 2px 0 #3a2404}
.obody{flex:1;min-height:0;overflow-y:auto;padding-bottom:12px;scrollbar-width:none;animation:aIn .18s ease-out}
.obody::-webkit-scrollbar{display:none}
@keyframes aIn{from{opacity:0}}
/* ボタン(高さ44): 金=主、紺=副 */
.aBtn{position:relative;overflow:hidden;border:0;cursor:pointer;min-height:44px;padding:8px 14px;border-radius:8px;font:900 15px var(--zk);letter-spacing:.06em;color:#2b1a02;background:linear-gradient(180deg,#fff2c2 0%,#f0c968 42%,#c58a26 58%,#e8b54a 100%);box-shadow:inset 0 1px 0 #fff8e0,inset 0 -2px 0 rgba(90,55,0,.45),0 0 0 1px #5a3c08,0 3px 8px rgba(0,0,0,.45);transition:transform .1s,filter .15s}
.aBtn small{display:block;font:700 11px var(--zk);letter-spacing:0;margin-top:1px}
.aBtn::after{content:"";position:absolute;top:-30%;bottom:-30%;width:30%;left:-60%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-20deg);pointer-events:none}
.aBtn.shine::after{animation:aSweep 4.6s ease-in-out infinite 1.2s}
@keyframes aSweep{0%,75%{left:-60%}100%{left:135%}}
.aBtn.sub{color:#fff;background:linear-gradient(180deg,#24336e,#121b4a);box-shadow:inset 0 0 0 1px var(--aG),0 3px 8px rgba(0,0,0,.4)}
.aBtn.red{color:#fff;background:linear-gradient(180deg,#ff8a8a,#c8283a);box-shadow:0 0 0 1px #3a0610,0 3px 8px rgba(0,0,0,.45)}
.aBtn.sm{min-height:34px;padding:5px 10px;font-size:13px}
.aBtn:active{transform:scale(.96)}
.aBtn:disabled{filter:grayscale(1) brightness(.55);cursor:default}
.aBtn:focus-visible,.aCard:focus-visible,.aIb:focus-visible,.aPl:focus-visible,.aQr:focus-visible,.aSlot:focus-visible{outline:2px solid var(--aG1);outline-offset:2px}
.aRing{position:absolute;inset:0;border-radius:inherit;pointer-events:none;animation:aRing .35s ease-out forwards}
@keyframes aRing{from{box-shadow:0 0 0 0 rgba(255,236,180,.7)}to{box-shadow:0 0 0 10px rgba(255,236,180,0)}}
.orow{display:flex;gap:8px;align-items:stretch}.orow>*{flex:1}
.aTot{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px}
.aTot .tn{font:900 15px var(--zk);color:#3a2604;white-space:nowrap}.aTot .tn b{font-size:26px;color:#c0761a;margin:0 2px}.aTot .tn small{font-size:12px;color:#7a6440}
.aTot .td{display:flex;gap:4px}.aTot .td i{width:14px;height:14px;transform:rotate(45deg);border:2px solid #b89a5a;background:#fff8e6;border-radius:2px}.aTot .td i.on{background:linear-gradient(135deg,#fff3b8,#e2a43a);border-color:#fff1c4;box-shadow:0 0 8px #ffc85a}
.aTot .te{flex:1;text-align:right;font:700 11.5px/1.5 var(--zk);color:#6a5434}.aTot .te b{color:#2b1a02;font-size:13px}
.osec{display:flex;align-items:center;gap:8px;margin:12px 2px 6px;font:900 13px var(--zk);color:var(--aG1)}
.osec::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--aLine),transparent)}
.osec small{font:500 11px var(--zk);color:var(--aMut)}
.onote{margin:0 2px 8px;font:500 12px/1.6 var(--zk);color:var(--aMut)}
/* 属性のひし形・星 */
.aG{display:inline-grid;place-items:center;width:18px;height:18px;font:900 10px/1 var(--zk);font-style:normal;color:#fff;background:linear-gradient(135deg,var(--ec),var(--ed));clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);text-shadow:0 1px 1px rgba(0,0,0,.6);flex:none}
.aSt{color:#ffd76a;letter-spacing:-.06em;text-shadow:0 1px 0 #3a2400,0 0 2px #000}
/* キャラのアイコン(1行5つ): ★5 金 / ★4 銀 / ★3 銅 */
.ogrid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.aCard{position:relative;border:0;padding:0;cursor:pointer;background:none;aspect-ratio:1;transition:transform .1s}
.aCard .fr{position:absolute;inset:0;border-radius:7px;padding:2px;background:linear-gradient(160deg,#c7b08a,#6e5a3a 50%,#a88a5c);box-shadow:0 2px 5px rgba(0,0,0,.5)}
.aCard.r4 .fr{background:linear-gradient(160deg,#f4f7ff,#9aa6c4 45%,#5a6684 70%,#d8e0f4)}
.aCard.r5 .fr{background:linear-gradient(160deg,#fff4c8,#f0c860 30%,#a7731f 62%,#f3d27a)}
.aCard.r6 .fr{background:linear-gradient(160deg,#ffd6f4,#8ad8ff 25%,#ffe27a 50%,#c78bff 75%,#ffd6f4)}
.aAb{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0 0}.aAb span{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:5px;font:800 11px var(--zk);color:#2b1a02;background:linear-gradient(#ffe9a8,#f0c050)}.aAb span.lk{color:#6b5b45;background:#e8e1cf}.aAb small{font:700 10px var(--zk);color:inherit;opacity:.8}
.aCard .pic{position:relative;display:block;width:100%;height:100%;border-radius:5px;overflow:hidden;background:radial-gradient(90% 80% at 50% 25%,var(--ec),var(--ed) 75%,#0a0f22)}
.aCard .pic img{display:block;width:100%;height:100%;object-fit:cover}
.aCard .pic::after{content:"";position:absolute;left:0;right:0;bottom:0;height:42%;background:linear-gradient(180deg,transparent,rgba(0,0,0,.85))}
.aCard .ph,.aTc .f .p .ph{position:absolute;inset:0;display:grid;place-items:center;background:radial-gradient(70% 60% at 50% 38%,color-mix(in srgb,var(--ec) 55%,transparent),transparent 70%),linear-gradient(180deg,color-mix(in srgb,var(--ed) 70%,#0a1236),#060b1c)}
.aCard .ph::before,.aTc .f .p .ph::before{content:"";position:absolute;left:50%;top:44%;width:44%;aspect-ratio:1;transform:translate(-50%,-50%) rotate(45deg);border:1.5px solid color-mix(in srgb,var(--ec) 80%,#fff)}
.aCard .ph b,.aTc .f .p .ph b{position:relative;font:900 18px var(--zk);color:#fff;transform:translateY(-6%)}
.aCard .ph i,.aTc .f .p .ph i{display:none}
.aCard .aG{position:absolute;left:3px;top:3px;z-index:2;width:15px;height:15px;font-size:8px}
.aCard .lv{position:absolute;left:4px;bottom:2px;z-index:2;font:900 11px var(--zk);color:#fff;text-shadow:0 1px 2px #000}
.aCard .lv i{font-style:normal}
.aCard .aSt{position:absolute;right:3px;bottom:3px;z-index:2;font-size:7px}
.aCard em{position:absolute;left:50%;top:-5px;z-index:3;transform:translateX(-50%);padding:0 5px;border-radius:3px;font:900 9px/14px var(--zk);font-style:normal;white-space:nowrap;color:#2b1a02;background:linear-gradient(#fff2c2,#e3ac3a);box-shadow:0 1px 3px rgba(0,0,0,.5)}
.aCard em.nw{color:#fff;background:#e0304a}
.aCard.evo .fr::after{content:"進";position:absolute;right:3px;top:3px;width:14px;height:14px;border-radius:3px;font:900 9px/14px var(--zk);text-align:center;color:#fff;background:#e0304a}
.aCard.sel .fr{box-shadow:0 0 0 2px #fff,0 0 10px rgba(255,255,255,.6)}
.aCard.sel::after{content:"✓";position:absolute;right:-4px;top:-4px;z-index:4;width:18px;height:18px;border-radius:50%;font:900 11px/18px var(--zk);text-align:center;color:#2b1a02;background:var(--aG1);box-shadow:0 0 0 1.5px #2b1a02}
.aCard.dim{opacity:.35}
.aCard:active{transform:scale(.93)}
.aChips{display:flex;gap:5px;margin:0 0 8px;overflow-x:auto;scrollbar-width:none}
.aChips button{flex:none;border:0;cursor:pointer;height:28px;padding:0 11px;border-radius:14px;font:700 12px var(--zk);color:#c3cbe6;background:#0e1842;box-shadow:inset 0 0 0 1px rgba(232,200,120,.3)}
.aChips button[aria-pressed="true"]{color:#2b1a02;background:var(--aG)}
.aSrt{align-items:center;flex-wrap:wrap;row-gap:5px}.aSrt .lb{flex:none;font:800 11px var(--zk);color:var(--aMut);margin-right:2px}.aSrt button.dir[aria-pressed="false"]{background:transparent;box-shadow:inset 0 0 0 1px rgba(232,200,120,.5);color:#ffe6a8}
/* ホーム */
.aHome{position:absolute;inset:0;z-index:0}
.aHome .hbg{position:absolute;inset:-2%;background:url(${UI}home-bg.webp) center 30%/cover no-repeat,#0b1a45;animation:aDrift 26s ease-in-out infinite alternate}
@keyframes aDrift{to{transform:scale(1.03) translateY(-6px)}}
.aHome .vig{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(4,10,32,.25),transparent 16%,transparent 58%,rgba(4,10,32,.85) 84%,#040a20)}
.aHome .motes i{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff6d8;box-shadow:0 0 6px #ffd98a;opacity:0;animation:aMote linear infinite}
@keyframes aMote{0%{opacity:0;transform:translateY(0)}15%{opacity:.8}100%{opacity:0;transform:translateY(-150px)}}
.aHero{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 118px);height:52%;transform:translateX(-50%);display:flex;justify-content:center;pointer-events:none}
.aHero img{height:100%;width:auto;max-width:none;filter:drop-shadow(0 12px 20px rgba(0,0,0,.5));transform-origin:50% 100%;animation:aBreathe 4.2s ease-in-out infinite;pointer-events:auto;cursor:pointer}
@keyframes aBreathe{50%{transform:scale(1.006,1.01) translateY(-2px)}}
.aHero img.out{animation:none;transition:transform .18s ease-in,opacity .18s;transform:translateX(-20%) scale(.97);opacity:0}
.aHero img.in{animation:none;transform:translateX(20%) scale(.97);opacity:0}
.aNm{position:absolute;left:max(12px,env(safe-area-inset-left,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 124px);z-index:3;pointer-events:none;padding:6px 12px 6px 10px;border-radius:8px;background:linear-gradient(90deg,rgba(5,11,34,.85),rgba(5,11,34,0))}
.aNm .ld{font:700 11px var(--zk);color:var(--aG1)}
.aNm .nm{display:flex;align-items:center;gap:6px;font:900 20px/1.25 var(--zk);color:#fff;text-shadow:0 1px 3px #000}
.aNm .aSt{font-size:11px}
.aTalk{position:absolute;right:max(12px,env(safe-area-inset-right,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 190px);z-index:3;max-width:170px;padding:8px 11px;border-radius:9px;font:700 12px/1.55 var(--zk);color:#1b2448;background:#fffaf0;box-shadow:inset 0 0 0 1px var(--aG2),0 4px 10px rgba(0,0,0,.4);opacity:0;transform:translateY(4px);transition:.22s ease-out;pointer-events:none}
.aTalk.on{opacity:1;transform:none}
.aSide{position:absolute;top:calc(env(safe-area-inset-top,0px) + 52px);z-index:3;display:flex;flex-direction:column;gap:8px}
.aSide.r{right:max(8px,env(safe-area-inset-right,0px))}.aSide.l{left:max(8px,env(safe-area-inset-left,0px))}
.aIb{position:relative;border:0;padding:0;background:none;cursor:pointer;width:46px;display:grid;justify-items:center;gap:2px;color:var(--aG1);transition:transform .1s}
.aIb .ic{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(14,24,66,.92);box-shadow:inset 0 0 0 1px var(--aLine),0 2px 6px rgba(0,0,0,.45)}
.aIb svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linejoin:round;stroke-linecap:round}
.aIb span{font:700 10px var(--zk);color:#fff;text-shadow:0 1px 2px #000,0 0 3px #000;white-space:nowrap}
.aIb .bd{position:absolute;top:-3px;right:2px;min-width:15px;height:15px;padding:0 3px;border-radius:8px;font:900 9px/15px var(--zk);color:#fff;background:#ff3b5c}
.aIb:active{transform:scale(.92)}
.aBan{width:118px;border:0;padding:0;cursor:pointer;border-radius:6px;overflow:hidden;text-align:left;color:#fff;box-shadow:0 0 0 1px var(--aLine),0 2px 8px rgba(0,0,0,.5);transition:transform .1s}
.aBan .im{display:block;height:48px;background:#16255a center/cover no-repeat}
.aBan .tx{display:block;padding:3px 6px;font:700 10px var(--zk);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#0e1842}
.aBan:active{transform:scale(.95)}
.aDots{display:flex;gap:4px;justify-content:center;margin-top:4px}.aDots i{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.35)}.aDots i.on{background:var(--aG)}
.aCta{position:absolute;left:max(12px,env(safe-area-inset-left,0px));right:max(12px,env(safe-area-inset-right,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 66px);z-index:4;display:flex;gap:8px}
.aCta .aBtn{flex:1;min-height:52px;font-size:18px;letter-spacing:.12em;padding:5px 10px}
.aCta .aBtn small{font-size:11px;letter-spacing:0}
.aCta .aBtn.sub{flex:0 0 64px;font-size:11px;letter-spacing:0;padding:4px;display:grid;justify-items:center;align-content:center;gap:1px}
.aCta .aBtn.sub svg{width:18px;height:18px;fill:none;stroke:var(--aG1);stroke-width:1.9;stroke-linejoin:round}
/* クエスト: 章の帯+ステージの一覧(1行=1ステージ) */
.aEvr .wdy{margin-left:6px;padding:1px 6px;border-radius:4px;font:900 11px var(--zk);font-style:normal;color:#2b1a02;background:linear-gradient(#fff3c4,#e8b84a)}.aEvr .wdc{font:800 12px var(--zk);font-style:normal;color:#c3cbe6}
.aMsT{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:0 0 6px}.aMsT button{position:relative;border:0;cursor:pointer;padding:8px 0;border-radius:8px;font:900 14px var(--zk);color:#fff;background:#24346f}.aMsT button.on{color:#2b1a02;background:linear-gradient(#fff3c4,#e8b84a)}.aMsT i{position:absolute;right:6px;top:-6px;min-width:18px;height:18px;border-radius:9px;font:900 11px/18px var(--zk);font-style:normal;color:#fff;background:#e0304a}
.aRkL{display:grid;gap:4px;max-height:52vh;overflow-y:auto}.aRkL .rr{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:#fff;box-shadow:inset 0 0 0 1px rgba(160,120,40,.35);color:#2a2117}.aRkL .rr .no{flex:0 0 28px;height:28px;border-radius:50%;display:grid;place-items:center;font:900 14px var(--zk);color:#fff;background:#6b5b45}.aRkL .rr.t1 .no{background:linear-gradient(#ffe48a,#d49a1a)}.aRkL .rr.t2 .no{background:linear-gradient(#e8eef8,#9aa8bc)}.aRkL .rr.t3 .no{background:linear-gradient(#f0b07a,#a8642a)}.aRkL .rr .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:800 14px var(--zk)}.aRkL .rr b{font:900 16px var(--zk)}.aRkL .rr.me{box-shadow:0 0 0 2px #e8b84a;background:#fff7dc}
.aChal{display:grid;gap:10px}.aCc{position:relative;display:grid;gap:3px;text-align:left;border:0;cursor:pointer;padding:14px 14px 12px;border-radius:12px;color:#fff;min-height:108px;box-shadow:inset 0 0 0 1.5px rgba(232,200,120,.55),0 3px 10px rgba(0,0,0,.4)}
.aCc.tw{background:radial-gradient(120% 140% at 85% 20%,#7a5ad0,#2a1a5a 60%,#0a1236)}.aCc.rd{background:radial-gradient(120% 140% at 85% 20%,#c23a3a,#4a1020 60%,#0a1236)}.aCc.ex{background:radial-gradient(120% 140% at 85% 20%,#e0602a,#4a1408 60%,#0a1236)}
.aExB{margin:10px 0;padding:12px;border-radius:12px;background:radial-gradient(120% 140% at 90% 0%,var(--ed),#0c1338 70%);box-shadow:inset 0 0 0 1.5px var(--ec),0 3px 10px rgba(0,0,0,.4)}
.aExB .hd{display:flex;align-items:center;gap:8px}.aExB .hd b{font:900 18px var(--zk);color:#fff}.aExB p{margin:4px 0 8px;font:700 12.5px/1.5 var(--zk);color:#dfe6ff}
.aExR{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.aExT{display:grid;gap:2px;justify-items:center;padding:10px 4px;border:0;border-radius:10px;cursor:pointer;color:#fff;background:linear-gradient(#2a3a78,#141d4a);box-shadow:inset 0 0 0 1.5px rgba(232,200,120,.6),0 2px 6px rgba(0,0,0,.4)}
.aExT b{font:900 17px var(--zk)}.aExT small{font:700 11px var(--zk);color:#ffe7a1}
.aExT.t1{background:linear-gradient(#7a2a5a,#3a0c2a)}.aExT.t2{background:linear-gradient(#8a1a1a,#2a0408)}
.aExT.clr b::after{content:" ✓";color:#7dffa6}.aExT.lock{filter:grayscale(.8) brightness(.6)}
.aLev{margin-bottom:12px;padding:12px;border-radius:12px;background:radial-gradient(120% 140% at 90% 0%,var(--ec),var(--ed) 45%,#0c1338 85%);box-shadow:inset 0 0 0 2px #e8c46a,0 3px 12px rgba(0,0,0,.5)}
.aLev .hd{display:flex;justify-content:space-between;align-items:center}.aLev .tg{padding:2px 9px;border-radius:5px;font:900 11.5px var(--zk);color:#fff;background:#d02a3a}.aLev .hd small{font:800 12px var(--zk);color:#ffe7a1}
.aLev .nm{display:block;margin-top:6px;font:900 21px var(--zk);color:#fff;text-shadow:0 2px 4px #000}.aLev p{margin:4px 0 10px;font:700 12.5px/1.5 var(--zk);color:#eef}
.aLev .ft{display:flex;align-items:center;justify-content:space-between;margin-top:10px;font:800 14px var(--zk);color:#fff}
.aMd{font-size:18px;color:#ffd76a}
.aShop{display:grid;gap:4px;margin-bottom:10px}
/* (v107) クエスト画面の部品(D-126): 絵のバナー・金のふちの板・ふちどりの題名 */
.qOl{-webkit-text-stroke:4px #140a02;paint-order:stroke fill;text-shadow:0 2px 0 #140a02,0 3px 6px rgba(0,0,0,.6)}
.qBn,.qChH,.qHd{position:relative;display:block;width:100%;padding:0;border:0;background:none;color:#fff;text-align:left;cursor:pointer;margin:14px 0 10px}
.qChH,.qHd{cursor:default}
.qBn .fr,.qChH .fr,.qHd .fr{position:relative;display:block;aspect-ratio:2.5/1;border-radius:10px;overflow:hidden;padding:2.5px;background:linear-gradient(160deg,#fff4c8,#d6a443 22%,#7a5216 48%,#e9c56a 70%,#8a5f1c);box-shadow:0 4px 0 #2a1806,0 6px 14px rgba(0,0,0,.55)}
.qBn .art,.qChH .art,.qHd .art{position:absolute;inset:2.5px;border-radius:8px;background:#16255a center/cover no-repeat}
.qBn .sh,.qChH .sh,.qHd .sh{position:absolute;inset:2.5px;border-radius:8px;background:linear-gradient(90deg,rgba(6,10,30,.82),rgba(6,10,30,.35) 48%,transparent 70%),linear-gradient(0deg,rgba(6,10,30,.85),transparent 42%);box-shadow:inset 0 0 0 1px rgba(255,240,200,.35),inset 0 0 18px rgba(0,0,0,.5)}
.qBn .tt,.qChH .tt,.qHd .tt{position:absolute;left:14px;top:12px;right:42%;display:grid;gap:3px;z-index:2}
.qBn .tt small,.qChH .tt small,.qHd .tt small{justify-self:start;padding:2px 8px;border-radius:4px;font:900 11px var(--zk);color:#2b1a02;background:linear-gradient(#fff3c4,#e8b84a);box-shadow:0 1px 0 #5a3a08}
.qBn .tt b,.qChH .tt b,.qHd .tt b{font:900 23px/1.15 var(--zk);color:#fff;-webkit-text-stroke:5px #140a02;paint-order:stroke fill;text-shadow:0 3px 0 #140a02,0 4px 8px rgba(0,0,0,.7);letter-spacing:.02em}
.qBn .bar,.qChH .bar,.qHd .bar{position:absolute;left:2.5px;right:2.5px;bottom:2.5px;display:flex;align-items:center;gap:8px;min-height:30px;padding:4px 12px;border-radius:0 0 8px 8px;background:linear-gradient(180deg,rgba(10,14,40,.55),rgba(6,8,26,.92));box-shadow:inset 0 1px 0 rgba(255,220,140,.6);font:800 12.5px var(--zk);color:#ffe7a1;text-shadow:0 1px 2px #000}
.qBn .bar b,.qChH .bar b,.qHd .bar b{font-size:16px;color:#fff}
.qBn .rb{position:absolute;left:-2px;top:8px;padding:3px 12px 3px 10px;font:900 12px var(--zk);color:#fff;background:linear-gradient(#ff5a6a,#c01a2e);clip-path:polygon(0 0,100% 0,92% 50%,100% 100%,0 100%);box-shadow:0 2px 0 #5a0a14;z-index:2}
.qBn .rb~.tt{top:40px}.qBn .dl{position:absolute;right:8px;top:8px;padding:3px 9px;border-radius:12px;font:800 11.5px var(--zk);color:#fff;background:rgba(6,8,26,.8);box-shadow:inset 0 0 0 1px rgba(255,220,140,.6);z-index:2}
.qBn .bs,.qChH .bs,.qHd .bs{position:absolute;right:4px;bottom:31px;height:96%;max-width:42%;object-fit:contain;pointer-events:none;filter:drop-shadow(0 4px 6px rgba(0,0,0,.7)) drop-shadow(0 0 10px rgba(255,220,160,.25))}
.qBn .bs.b2{right:27%;height:80%}
.qBn:active .fr{transform:translateY(2px);box-shadow:0 2px 0 #2a1806,0 3px 8px rgba(0,0,0,.5)}
.qBn.sm .fr{aspect-ratio:3.5/1}.qBn.sm{margin:8px 0}.qBn.sm .tt b{font-size:20px}.qBn.sm .tt{right:30%}
.qBn.lk .fr{filter:grayscale(.7) brightness(.6)}
.qBn .orb{position:absolute;right:7%;top:50%;width:64px;height:64px;transform:translateY(-62%);border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,var(--ec) 35%,var(--ed) 80%);box-shadow:0 0 22px var(--ec),0 0 60px var(--ec)}
.qBn .wdy{padding:1px 7px;border-radius:4px;font:900 11px var(--zk);color:#fff;background:#d02a3a}
.qPills{display:flex;gap:4px}.qPills i{padding:1px 7px;border-radius:9px;font:800 11px var(--zk);font-style:normal;color:#dfe6ff;background:rgba(255,255,255,.12)}.qPills i.on{color:#2b1a02;background:linear-gradient(#fff3c4,#e8b84a)}
.qChH .ar{position:absolute;top:50%;transform:translateY(-70%);width:34px;height:46px;border:0;cursor:pointer;font:900 30px/1 var(--zk);color:#fff3c4;background:rgba(6,8,26,.55);border-radius:8px;box-shadow:inset 0 0 0 1.5px rgba(255,220,140,.7);text-shadow:0 2px 0 #000;z-index:3}
.qChH .ar.l{left:-6px}.qChH .ar.r{right:-6px}.qChH .ar:disabled{opacity:.25}
.qChH .tt{left:30px}.qChH .bs{right:28px}
.qChH .pg{flex:1;height:8px;border-radius:4px;background:#1a1030;box-shadow:inset 0 0 0 1px rgba(255,220,140,.5);overflow:hidden}.qChH .pg i{display:block;height:100%;background:linear-gradient(90deg,#ffe39a,#e8a83a)}
.qChH .dots{position:absolute;left:0;right:0;bottom:-14px;display:flex;justify-content:center;gap:6px}.qChH .dots i{width:7px;height:7px;border-radius:50%;background:#3a4a80}.qChH .dots i.on{background:#ffd76a;box-shadow:0 0 6px #ffd76a}
.qHd .bk{position:absolute;left:8px;top:8px;width:36px;height:36px;border:0;cursor:pointer;border-radius:9px;font:900 26px/1 var(--zk);color:#2b1a02;background:linear-gradient(#fff3c4,#e8b84a);box-shadow:0 2px 0 #5a3a08;z-index:3}
.qHd .tt{left:54px}
.qDf{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:18px 0 10px}
.qDf button{position:relative;height:40px;border:0;cursor:pointer;border-radius:9px;font:900 15px var(--zk);color:#9aa6cc;background:linear-gradient(#1a2658,#0c1438);box-shadow:inset 0 0 0 1.5px rgba(255,220,140,.35),0 3px 0 #050a20}
.qDf button[aria-pressed="true"]{color:#fff;background:linear-gradient(#4a7ae8,#1c3a9a);box-shadow:inset 0 0 0 2px #ffe39a,inset 0 2px 0 rgba(255,255,255,.4),0 3px 0 #0a1a50,0 0 14px rgba(110,160,255,.5);-webkit-text-stroke:3px #0a1a50;paint-order:stroke fill}
.qDf button.h[aria-pressed="true"]{background:linear-gradient(#ff6a5a,#a8182a);box-shadow:inset 0 0 0 2px #ffe39a,inset 0 2px 0 rgba(255,255,255,.4),0 3px 0 #4a0810,0 0 14px rgba(255,90,90,.5);-webkit-text-stroke:3px #4a0810}
.qDf button:disabled{opacity:.4}
.qL{display:grid;gap:8px}
.qPl{position:relative;display:flex;align-items:center;gap:10px;width:100%;min-height:64px;padding:8px 12px 8px 8px;border:0;cursor:pointer;text-align:left;color:#fff;border-radius:10px;background:linear-gradient(160deg,#e9c56a,#7a5216 50%,#c99a3c) padding-box;box-shadow:0 3px 0 #1a1004,0 5px 10px rgba(0,0,0,.45)}
.qPl::before{content:"";position:absolute;inset:2px;border-radius:8px;background:repeating-linear-gradient(135deg,rgba(255,255,255,.025) 0 6px,transparent 6px 12px),linear-gradient(180deg,#26346e,#121a44 60%,#0c1236);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),inset 0 0 12px rgba(0,0,0,.5)}
.qPl>*{position:relative}
.qPl:active{transform:translateY(2px);box-shadow:0 1px 0 #1a1004,0 2px 6px rgba(0,0,0,.45)}
.qPl .cn{flex:none;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,#3a5ab0,#14205a 70%);box-shadow:0 0 0 2.5px #e9c56a,0 0 0 4px #5a3a08,inset 0 2px 4px rgba(255,255,255,.35)}
.qPl .cn b{font:900 15px var(--zk);color:#fff;-webkit-text-stroke:3px #0a1030;paint-order:stroke fill}
.qPl .cn img{width:58px;height:58px;object-fit:contain;margin-top:-10px;filter:drop-shadow(0 2px 3px #000)}
.qPl .md{flex:1;min-width:0;display:grid;gap:4px}
.qPl .md>b{font:900 16px var(--zk);color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;-webkit-text-stroke:3px #0a1030;paint-order:stroke fill}
.qPl .md>span{display:flex;align-items:center;gap:4px;font:700 11.5px var(--zk);color:#aeb8de}
.qPl .md>span img{width:20px;height:20px;object-fit:contain}
.qPl .sv{display:inline-flex;gap:2px;margin-left:4px}.qPl .sv i{width:7px;height:7px;transform:rotate(45deg);background:#ff6a5a;box-shadow:0 0 4px #ff6a5a}.qPl .sv i.o{background:#3a2a50;box-shadow:none}
.qPl .rt{flex:none;display:grid;justify-items:end;gap:3px}
.qPl .st3{display:flex;gap:1px}.qPl .st3 i{font:900 17px/1 var(--zk);font-style:normal;color:#3a4270;-webkit-text-stroke:2px #0a1030;paint-order:stroke fill}.qPl .st3 i.on{color:#ffd23a;text-shadow:0 0 6px rgba(255,210,58,.7)}
.qPl .fr2{display:flex;align-items:center;gap:3px;padding:1px 7px;border-radius:9px;font:800 11px var(--zk);font-style:normal;color:#2b1a02;background:linear-gradient(#fff3c4,#e8b84a)}.qPl .fr2 svg{width:12px;height:12px}
.qPl .nx{position:absolute;right:-4px;top:-9px;padding:2px 10px;border-radius:5px;font:900 11.5px var(--cin,var(--zk));font-style:normal;color:#fff;background:linear-gradient(#ff5a6a,#c01a2e);box-shadow:0 2px 0 #5a0a14;letter-spacing:.06em}
.qPl.cur{animation:qPulse 1.6s ease-in-out infinite}
@keyframes qPulse{0%,100%{box-shadow:0 3px 0 #1a1004,0 0 0 0 rgba(255,220,120,0),0 5px 10px rgba(0,0,0,.45)}50%{box-shadow:0 3px 0 #1a1004,0 0 0 3px rgba(255,220,120,.55),0 5px 14px rgba(255,200,90,.35)}}
.qPl.boss::before{background:repeating-linear-gradient(135deg,rgba(255,255,255,.03) 0 6px,transparent 6px 12px),linear-gradient(180deg,#6a1a2a,#3a0a18 60%,#1a0610)}
.qPl.boss .cn{background:radial-gradient(circle at 35% 30%,#c03a3a,#4a0a14 70%)}
.qPl.hd .cn{background:radial-gradient(circle at 35% 30%,#d04a4a,#5a0a14 70%)}
.qPl.lock{filter:saturate(.25) brightness(.62)}
.qPl.lock .md>b{color:#c6cbe0}
.qPl .lk{color:#e9c56a}
.qPl .ck{position:absolute;left:40px;top:44px;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;font:900 12px/1 var(--zk);color:#fff;background:#2aa84a;box-shadow:0 0 0 2px #0a1030}
.qPl.t0 .cn{background:radial-gradient(circle at 35% 30%,#4ad07a,#0a4a24 70%)}.qPl.t1 .cn{background:radial-gradient(circle at 35% 30%,#4a8ae8,#0a2460 70%)}.qPl.t2 .cn{background:radial-gradient(circle at 35% 30%,#e84a4a,#5a0a14 70%)}
.qPl .cn b.s{font-size:13px}
.qPl .ar2{font:900 24px/1 var(--zk);color:#e9c56a}
.qTi{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:6px 0 4px}
.qTi button{position:relative;display:grid;gap:2px;justify-items:center;padding:12px 4px 10px;border:0;cursor:pointer;border-radius:10px;color:#fff;background:linear-gradient(160deg,#fff4c8,#b8862e 40%,#6a4612);box-shadow:0 3px 0 #1a1004,0 5px 10px rgba(0,0,0,.5)}
.qTi button::before{content:"";position:absolute;inset:2.5px;border-radius:8px;background:var(--tb);box-shadow:inset 0 2px 0 rgba(255,255,255,.35),inset 0 -10px 16px rgba(0,0,0,.35)}
.qTi button>*{position:relative}
.qTi b{font:900 20px var(--zk);-webkit-text-stroke:4px #140a02;paint-order:stroke fill;text-shadow:0 2px 0 #140a02}
.qTi small{font:800 11px var(--zk);color:#ffe7a1;text-shadow:0 1px 2px #000}
.qTi.t4{grid-template-columns:repeat(4,1fr)}.qTi .tx{--tb:linear-gradient(#c84aff,#3a0a5a)!important}
.qTi .t0{--tb:linear-gradient(#3ab06a,#0e4a2a)}.qTi .t1{--tb:linear-gradient(#4a7ae8,#16307a)}.qTi .t2{--tb:linear-gradient(#e0403a,#5a0a14)}
.qTi .x0{--tb:linear-gradient(#b87a3a,#4a2a10)}.qTi .x1{--tb:linear-gradient(#8a5ad8,#2a1060)}.qTi .x2{--tb:linear-gradient(#e8303a,#300408)}
.qTi .lock{filter:grayscale(.85) brightness(.55)}
.qTi .clr::after{content:"CLEAR";position:absolute;right:4px;top:-8px;padding:1px 6px;border-radius:4px;font:900 10px var(--cin,var(--zk));color:#fff;background:#2aa84a;box-shadow:0 2px 0 #0a3a1a;transform:rotate(6deg)}
.qBox{margin:4px 0 16px;padding:10px;border-radius:12px;background:linear-gradient(180deg,rgba(20,30,74,.9),rgba(8,12,36,.95));box-shadow:inset 0 0 0 1.5px rgba(255,220,140,.45),0 4px 10px rgba(0,0,0,.4)}
.qBox .ft{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px;font:800 14px var(--zk);color:#fff}
.qBox .ft .aMd{font-size:20px}
.qBox>p{margin:0 0 6px;font:700 12px/1.5 var(--zk);color:#c8d0ee}
.aGo .tt.qSt{display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-end;gap:2px;min-height:86px;margin:-12px -12px 0;padding:12px 14px 10px;border-radius:14px 14px 0 0;background-size:cover!important;background-position:center!important;box-shadow:inset 0 -2px 0 #e9c56a}
.aGo .tt.qSt b{padding:1px 8px;border-radius:4px;font-size:12px!important;color:#2b1a02!important;background:linear-gradient(#fff3c4,#e8b84a)}
.aGo .tt.qSt span{font:900 21px var(--zk)!important;color:#fff!important;-webkit-text-stroke:4px #140a02;paint-order:stroke fill;text-shadow:0 2px 0 #140a02}
.qNext{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:10px 0 4px;padding:10px 12px;border-radius:10px;background:rgba(10,16,48,.85);box-shadow:inset 0 0 0 1.5px rgba(255,220,140,.4);font:800 13px var(--zk);color:#dfe6ff}.qNext b{color:#ffe7a1}.qNext span{display:inline-flex;align-items:center;gap:4px}
.qRk{display:block;width:100%;margin:6px 0 10px;height:46px;border:0;cursor:pointer;border-radius:10px;font:900 15px var(--zk);color:#fff;background:linear-gradient(#3a4a9a,#16205a);box-shadow:inset 0 0 0 2px #e9c56a,inset 0 2px 0 rgba(255,255,255,.3),0 3px 0 #050a20;-webkit-text-stroke:3px #0a1030;paint-order:stroke fill}
.aTw .aTf{border-radius:10px!important}

.aShr{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px}.aShr small{flex:1;min-width:0;white-space:nowrap;font:700 11px var(--zk);color:var(--aMut)}.aShr button{flex:0 0 auto;min-width:84px;white-space:nowrap;padding:8px 10px;font-size:13px}
.aCc.sc{background:radial-gradient(120% 140% at 85% 20%,#2a8a8a,#0a3a4a 60%,#0a1236)}
.aCc .tg{justify-self:start;padding:2px 9px;border-radius:5px;font:900 11.5px var(--zk);color:#2b1a02;background:linear-gradient(#fff3c4,#e8b84a)}.aCc b{font:900 19px var(--zk);color:#fff}.aCc small{font:700 12.5px/1.5 var(--zk);color:#dfe6ff}.aCc .if{font:800 13px var(--zk);color:#ffe7a1}.aCc .if b{font-size:17px;color:#fff}
.aTw{display:grid;gap:6px}.aTf{position:relative;display:flex;align-items:center;gap:10px;width:100%;border:0;cursor:pointer;text-align:left;padding:8px 10px;border-radius:10px;background:#16255a;color:#fff;box-shadow:inset 0 0 0 1px rgba(232,200,120,.35)}
.aTf .fl{flex:0 0 54px;display:grid;place-items:center;height:44px;border-radius:8px;font:900 20px/1 var(--zk);color:#fff;background:#24346f}.aTf .fl small{font-size:10px}.aTf .md{display:grid;gap:2px;min-width:0}.aTf .md b{font:900 14px var(--zk)}.aTf .md span{font:700 12px var(--zk);color:#c3cbe6}.aTf .sv{font-style:normal;color:#ff8a6a;letter-spacing:-1px}
.aTf.done{opacity:.62}.aTf.done .fl{background:#2e6a4f}.aTf.lock{opacity:.4}.aTf.bs .fl{background:linear-gradient(#a8323a,#5a1420)}.aTf.nx{background:linear-gradient(#2a3a8a,#16255a);box-shadow:0 0 0 2px #ffe7a1,0 0 14px rgba(255,231,161,.5)}.aTf .nxt{margin-left:auto;padding:2px 8px;border-radius:5px;font:900 11px var(--zk);font-style:normal;color:#2b1a02;background:linear-gradient(#fff3c4,#e8b84a)}
.aChT{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin-bottom:8px}.aChT button{border:0;cursor:pointer;padding:8px 0;border-radius:8px;font:900 13px var(--zk);color:#fff;background:#16255a;box-shadow:inset 0 0 0 1px rgba(232,200,120,.4)}.aChT button.on{color:#2b1a02;background:linear-gradient(#fff3c4,#e8b84a)}.aChT button.lk{opacity:.45}
.aCh{position:relative;display:flex;align-items:flex-end;height:74px;border-radius:8px;overflow:hidden;margin-bottom:8px;background:#16255a center/cover no-repeat;box-shadow:inset 0 0 0 1px var(--aLine)}
.aCh::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,11,34,.9),rgba(5,11,34,.35) 70%,transparent)}
.aCh .t{position:relative;padding:8px 12px;display:grid;gap:1px}
.aCh .t small{font:700 10px var(--zk);color:var(--aG1)}
.aCh .t b{font:800 20px var(--mi);color:#fff;letter-spacing:.06em;text-shadow:0 1px 3px #000}
.aCh .pg{position:absolute;right:10px;bottom:8px;font:700 11px var(--zk);color:#fff;padding:2px 8px;border-radius:10px;background:rgba(5,11,34,.75);box-shadow:inset 0 0 0 1px var(--aLine)}
.aCh .pg b{color:var(--aG1)}
.aDiff{display:flex;gap:4px;margin:0 0 8px}
.aDiff button{flex:1;border:0;cursor:pointer;height:30px;border-radius:7px;font:700 12px var(--zk);color:#c3cbe6;background:#0e1842;box-shadow:inset 0 0 0 1px rgba(232,200,120,.3)}
.aDiff button[aria-pressed="true"]{color:#2b1a02;background:var(--aG)}
.aDiff button.h[aria-pressed="true"]{color:#fff;background:linear-gradient(180deg,#ff8a8a,#c8283a)}
.aDiff button:disabled{opacity:.4}
.aQ{display:grid;gap:6px}
.aQr{position:relative;display:flex;align-items:center;gap:10px;width:100%;min-height:58px;padding:7px 10px;border:0;border-radius:8px;cursor:pointer;text-align:left;color:#fff;background:var(--aPanel);box-shadow:inset 0 0 0 1px rgba(232,200,120,.28);transition:transform .1s}
.aQr .no{flex:none;width:40px;height:40px;border-radius:7px;display:grid;place-items:center;font:900 13px var(--zk);color:#fff;background:linear-gradient(180deg,#2a3b80,#141d4c);box-shadow:inset 0 0 0 1px var(--aLine)}
.aQr .no img{width:34px;height:34px;object-fit:contain}
.aQr .md{flex:1;min-width:0;display:grid;gap:3px}
.aQr .md b{font:900 15px var(--zk);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.aQr .md span{display:flex;align-items:center;gap:3px;font:500 11px var(--zk);color:var(--aMut)}
.aQr .md span img{width:18px;height:18px;object-fit:contain}
.aQr .md span .sv{margin-left:4px;letter-spacing:-.04em;color:#ff9a8a}
.aQr .rt{flex:none;display:grid;justify-items:end;gap:2px;font:900 10px var(--zk)}
.aQr .rt .ok{color:#2b1a02;background:var(--aG);padding:1px 6px;border-radius:3px}
.aQr .rt .nx{color:#fff;background:#e0304a;padding:1px 6px;border-radius:3px}
.aQr .rt .lk{color:var(--aMut);font-size:16px}
.aQr .ar{color:var(--aG);font:400 18px var(--zk)}
.aQr.cur{box-shadow:inset 0 0 0 1.5px var(--aG1),0 0 12px rgba(255,210,120,.35)}
.aQr.cur .no{color:#2b1a02;background:linear-gradient(180deg,#fff2c2,#c99b3c)}
.aQr.boss .no{background:linear-gradient(180deg,#8a2030,#3a0812)}
.aQr.lock{opacity:.45;cursor:default}
.aQr.hd{background:linear-gradient(90deg,#3a0f20,var(--aPanel) 40%)}
.aQr:not(.lock):active{transform:scale(.98)}
.aEvr .no{width:64px;height:40px;background:#16255a center/cover no-repeat}
/* 出撃の確認(下から出る板) */
.aGo{position:absolute;inset:0;z-index:47;display:flex;flex-direction:column;justify-content:flex-end;background:rgba(2,6,18,.6);pointer-events:auto;animation:aFade .15s}
.aGo .sh{display:grid;gap:9px;padding:12px max(12px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 12px) max(12px,env(safe-area-inset-left,0px));border-radius:12px 12px 0 0;background:#0e1842;box-shadow:0 -1px 0 var(--aG),0 -8px 24px rgba(0,0,0,.6);animation:aUp .22s cubic-bezier(.2,.8,.2,1)}
@keyframes aUp{from{transform:translateY(40%);opacity:0}}
.aGo .tt{display:flex;align-items:baseline;gap:8px}
.aGo .tt b{font:900 15px var(--zk);color:var(--aG1)}
.aGo .tt span{font:900 17px var(--zk);color:#fff}
.aGo p{margin:0;font:500 13px/1.6 var(--zk);color:var(--aDim)}
.aGo .inf{display:flex;flex-wrap:wrap;gap:5px}
.aGo .inf span{display:inline-flex;align-items:center;gap:3px;height:24px;padding:0 8px 0 4px;border-radius:12px;font:700 11px var(--zk);color:#e8ecf8;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(232,200,120,.25)}
.aGo .inf span img{width:18px;height:18px}
.aGo .inf span.nw{color:#2b1a02;background:var(--aG)}
.aGo .pty{display:flex;align-items:center;gap:6px;padding:7px 8px;border-radius:8px;background:#0a1236;box-shadow:inset 0 0 0 1px rgba(232,200,120,.25)}
.aGo .pty .f{position:relative;width:38px;height:38px;border-radius:6px;background:#16255a center/cover no-repeat;box-shadow:0 0 0 1.5px var(--aG)}
.aGo .pty .f i{position:absolute;left:-4px;top:-6px;font:900 9px/13px var(--zk);font-style:normal;padding:0 3px;border-radius:3px;color:#2b1a02;background:var(--aG1)}
.aGo .pty .lt{flex:1;min-width:0;font:700 11px/1.4 var(--zk);color:var(--aDim)}
.aGo .pty .lt b{display:block;font-size:12px;color:#fff}
/* 編成: 上に4枠、下に入れかえ候補 */
.aParty{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.aSlot{position:relative;border:0;padding:0;cursor:pointer;aspect-ratio:3/3.8;border-radius:8px;overflow:hidden;background:radial-gradient(100% 80% at 50% 20%,var(--ec),var(--ed) 70%,#060b1c);box-shadow:inset 0 0 0 1px var(--aLine),0 3px 8px rgba(0,0,0,.45);transition:transform .1s}
.aSlot img{position:absolute;left:50%;top:0;height:150%;transform:translateX(-50%);max-width:none}
.aSlot::after{content:"";position:absolute;left:0;right:0;bottom:0;height:45%;background:linear-gradient(180deg,transparent,rgba(4,8,24,.95))}
.aSlot .t{position:absolute;left:0;right:0;bottom:4px;z-index:1;display:grid;justify-items:center;gap:0}
.aSlot .t b{font:900 12px var(--zk);color:#fff}
.aSlot .t span{font:700 10px var(--zk);color:var(--aG1)}
.aSlot .aG{position:absolute;left:4px;top:4px;z-index:1}
.aSlot .ld{position:absolute;right:4px;top:4px;z-index:1;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font:900 10px var(--zk);color:#2b1a02;background:var(--aG1);box-shadow:0 0 0 1.5px #2b1a02}
.aSlot.on{box-shadow:inset 0 0 0 2.5px #fff,0 0 12px rgba(255,236,180,.6)}
.aSlot:active{transform:scale(.95)}
.aEvoG{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}.aEvoG button{position:relative;border:0;border-radius:10px;padding:0;cursor:pointer;aspect-ratio:3/4;max-width:100%;overflow:hidden;background:radial-gradient(circle at 50% 35%,#fff 0,var(--ec) 45%,var(--ed) 100%);box-shadow:inset 0 0 0 2px rgba(255,231,161,.8)}.aEvoG img{position:absolute;inset:4px 4px 26px;width:calc(100% - 8px);height:calc(100% - 30px);object-fit:contain}.aEvoG b{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;gap:4px;padding:5px 0;font:900 14px var(--zk);color:#fff!important;text-shadow:0 1px 2px #000;background:rgba(6,10,30,.82)}
.tmP{border-radius:12px;overflow:hidden;background:linear-gradient(#fffaf0,#f1e2bd);box-shadow:inset 0 0 0 2px #c9a14a,0 4px 14px rgba(0,0,0,.45);color:#2a2117}
.tmH{display:flex;align-items:center;gap:8px;padding:8px 12px;background:linear-gradient(#24346f,#121c46);box-shadow:inset 0 -2px 0 #c9a14a}.tmH b{font:900 16px var(--zk);color:#ffe7a1!important;letter-spacing:.1em}.tmH span{margin-left:auto;font:700 12px var(--zk);color:#dfe6ff!important}
.tmRow{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,3fr);gap:6px;padding:10px 10px 6px}
.tmL,.tmS{display:grid;gap:4px;align-content:start}.tmL{padding-right:6px;border-right:2px dashed rgba(160,120,40,.45)}
.tmL .lab,.tmS .lab{justify-self:start;padding:1px 8px;border-radius:4px;font:900 11.5px/1.4 var(--zk);color:#fff!important;background:#b0353a}.tmS .lab{background:#3d5a9e}
.tmS .r3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.tmSlot{border:0;background:none;padding:0;cursor:pointer;display:grid;justify-items:center;gap:1px;min-width:0;-webkit-tap-highlight-color:transparent}
.tmSlot .ic{position:relative;width:100%;aspect-ratio:1;border-radius:9px;padding:3px;box-sizing:border-box;background:linear-gradient(150deg,#fff,var(--ec) 35%,var(--ed));box-shadow:0 2px 5px rgba(0,0,0,.45),inset 0 0 0 1px rgba(0,0,0,.35);transition:transform .1s}
.tmSlot .ic img{width:100%;height:100%;display:block;border-radius:6px;object-fit:cover}
.tmSlot .ic .aG{position:absolute;left:-3px;top:-3px}
.tmSlot .lv{position:absolute;left:0;right:0;bottom:2px;text-align:center;font:900 14px/1 var(--zk);color:#fff!important;paint-order:stroke fill;-webkit-text-stroke:3.5px #111;letter-spacing:.02em}
.tmSlot .st{font:900 11px/1.2 var(--zk);color:#d48a00!important;letter-spacing:-.08em;text-shadow:0 1px 0 #fff}
.tmSlot .nm{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:900 13px/1.2 var(--zk);color:#2a2117!important}
.tmSlot:active .ic{transform:scale(.93)}.tmSlot:focus-visible{outline:2px solid #e8b84a;outline-offset:2px}
.tmSt{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:4px 10px 8px}.tmSt div{display:flex;align-items:baseline;justify-content:space-between;gap:6px;padding:6px 10px;border-radius:7px;background:#fff;box-shadow:inset 0 0 0 1px rgba(160,120,40,.4)}
.tmSt span{font:800 12px var(--zk);color:#6b5b45!important}.tmSt b{font:900 16px var(--zk);color:#2a2117!important}
.tmLS{margin:0 10px 10px;border-radius:8px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(160,120,40,.5)}.tmLS .t{padding:5px 10px;font:900 13px var(--zk);color:#fff!important;background:linear-gradient(#a8323a,#7a1e26)}.tmLS .d{padding:7px 10px;font:700 13.5px/1.55 var(--zk);color:#2a2117!important;background:#fff}
.tmML{display:grid;gap:6px}.tmMr{display:flex;align-items:center;gap:10px;width:100%;border:0;cursor:pointer;text-align:left;padding:7px 10px;border-radius:10px;background:linear-gradient(#fffaf0,#f3e6c6);box-shadow:inset 0 0 0 1.5px #c9a14a}
.tmMr img{flex:0 0 auto;width:44px;height:44px;border-radius:8px;object-fit:cover}.tmMr span{display:grid;gap:2px;min-width:0}.tmMr b{font:900 14px var(--zk);color:#2a2117!important}.tmMr b small{font:800 12px var(--zk);color:#6b5b45!important}.tmMr b i{margin-right:6px;padding:1px 6px;border-radius:4px;font:900 11px var(--zk);font-style:normal;color:#fff;background:#b0353a}.tmMr em{font:700 12.5px/1.5 var(--zk);font-style:normal;color:#3d3326!important}
.aPick{position:absolute;inset:0;z-index:46;pointer-events:auto;overflow-y:auto;padding:calc(env(safe-area-inset-top,0px) + 0px) max(12px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 20px) max(12px,env(safe-area-inset-left,0px));background:linear-gradient(#0e1842,#050b22);animation:aFade .15s}
.aPick .hd{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;margin:0 -12px 10px;padding:10px 12px;background:linear-gradient(#24346f,#121c46);box-shadow:inset 0 -2px 0 #c9a14a}.aPick .hd b{font:900 16px var(--zk);color:#ffe7a1}
.aPick .bk{border:0;cursor:pointer;padding:7px 12px;border-radius:8px;font:900 14px var(--zk);color:#2b1a02;background:linear-gradient(#fff3c4,#e8b84a)}
.aPick .now{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;background:linear-gradient(#fffaf0,#f3e6c6);box-shadow:inset 0 0 0 1.5px #c9a14a}.aPick .now span{font:900 12px var(--zk);color:#fff;background:#3d5a9e;padding:2px 8px;border-radius:4px}.aPick .now img{width:44px;height:44px;border-radius:8px;object-fit:cover}.aPick .now b{font:900 16px var(--zk);color:#2a2117}.aPick .now small{margin-left:auto;font:800 13px var(--zk);color:#6b5b45}
.aPick .srt{display:flex;align-items:center;gap:6px;margin:12px 0 10px}.aPick .srt span{font:800 13px var(--zk);color:#dfe6ff;margin-right:2px}.aPick .srt button{border:0;cursor:pointer;padding:7px 12px;border-radius:16px;font:800 13px var(--zk);color:#fff;background:#24346f;box-shadow:inset 0 0 0 1px rgba(232,200,120,.5)}.aPick .srt button.on{color:#2b1a02;background:linear-gradient(#fff3c4,#e8b84a)}
.aPick .g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px 8px}.aPick .pc{display:grid;gap:3px;justify-items:center;min-width:0}.aPick .pc .aCard{width:100%}.aPick .pc .n{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:800 13px/1.2 var(--zk);color:#fff}.aPick .pc.cur .n{color:#ffe7a1}
.aPick .pc .aCard .aSt{font-size:9px}.aPick .pc .aCard .lv{font-size:12px}.aPick .pc .aCard em{font-size:10.5px;line-height:16px}
.aPick .ft{margin:14px 0 0;font:700 12.5px var(--zk);color:#c3cbe6;text-align:center}
.aSel{display:grid;grid-template-columns:1fr auto;gap:6px 10px;align-items:center;margin-top:8px;padding:10px 12px;border-radius:8px}
.aSel .n{font:900 15px var(--zk);color:#fff;display:flex;align-items:center;gap:6px}
.aSel .s{grid-column:1/-1;font:500 12px/1.6 var(--zk);color:var(--aDim)}
.aSel .s b{color:var(--aG1)}
.aSum{display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding:8px 12px;border-radius:8px}
.aSum span{font:700 12px var(--zk);color:var(--aDim)}
.aSum b{font:900 17px var(--zk);color:#fff;font-variant-numeric:tabular-nums}
/* 素材 */
.aMi{position:relative;display:inline-grid;place-items:center;width:26px;height:26px;flex:none}
.aMi img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 1px 2px rgba(0,0,0,.7))}
.aMi b{position:absolute;right:-3px;bottom:-3px;min-width:13px;height:13px;border-radius:7px;font:900 8px/13px var(--zk);text-align:center;color:#2b1a02;background:var(--aG)}
.aMi svg{width:100%;height:100%}
.omat{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
.omat>div{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font:700 12px var(--zk);color:#fff}
.omat>div .aMi{width:32px;height:32px}
.omat>div b.n{margin-left:auto;font:900 16px var(--zk);color:#fff;font-variant-numeric:tabular-nums}
.omat>div b.n::before{content:"×";font-size:11px;color:var(--aMut);margin-right:1px}
/* 強化 */
.aPw{display:grid;grid-template-columns:64px 1fr;gap:10px;align-items:center;padding:10px;border-radius:8px}
.aPw h3{margin:0;font:900 15px var(--zk);color:#fff}
.aPw .lv{font:700 11px var(--zk);color:var(--aMut);margin-top:2px}
.aPw .lv b{font:900 17px var(--zk);color:#fff}
.aPw .lv b.up{color:#8dffb4}
.aExp{position:relative;height:7px;margin-top:5px;border-radius:4px;background:#060c24;box-shadow:inset 0 0 0 1px rgba(232,200,120,.35);overflow:hidden}
.aExp i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#c99b3c,#fff2c2)}
.aExp i.pv{background:rgba(141,255,180,.7)}
.aPw .gain{margin-top:4px;font:700 11px var(--zk);color:var(--aDim)}
.aPw .gain b{color:#8dffb4}
.aFeed{display:flex;gap:5px;margin-top:8px}
.aPwH{display:flex;align-items:center;gap:6px;margin-top:6px}.aPwH .osec{flex:1;margin:0}.aPwH .aBtn,.aPwH button{min-height:34px;padding:0 14px;font-size:13px}
.opick button.mx{width:auto;padding:0 10px;font:800 12px var(--zk)}
.aPwBar{position:sticky;bottom:0;z-index:5;display:flex;align-items:center;gap:10px;margin:14px -4px 0;padding:10px 10px calc(10px + env(safe-area-inset-bottom,0px));border-radius:14px 14px 0 0;background:rgba(9,14,40,.96);box-shadow:0 -6px 18px rgba(0,0,0,.45),inset 0 1px 0 rgba(232,200,120,.45);backdrop-filter:blur(6px)}
.aPwBar .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.aPwBar .lv{font:700 12px var(--zk);color:#c3cbe6}.aPwBar .lv b{font:900 18px var(--zk);color:#fff}.aPwBar .lv b.up{color:#8dffb4}.aPwBar .lv small{color:var(--aMut)}
.aPwBar .u{font:700 11px var(--zk);color:var(--aDim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.aPwBar .aBtn,.aPwBar button{flex:none;min-width:120px;min-height:46px}
.aFeed i{flex:1;aspect-ratio:1;max-width:52px;border-radius:50%;display:grid;place-items:center;font-style:normal;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(232,200,120,.35)}
.aFeed i.on{background:rgba(255,236,180,.15);box-shadow:inset 0 0 0 1.5px var(--aG1)}
.aFeed i .aMi{width:70%;height:70%}
.aFeed i img.f{width:86%;height:86%;border-radius:50%;object-fit:cover}
.opick{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;margin-bottom:6px}
.opick .n{flex:1;min-width:0;font:700 13px var(--zk);color:#fff}
.opick .n small{display:block;font:500 11px var(--zk);color:var(--aMut)}
.opick b{min-width:22px;text-align:center;font:900 16px var(--zk);color:#fff}
.opick button{width:36px;height:32px;border:0;border-radius:7px;cursor:pointer;font:900 17px var(--zk);color:var(--aG1);background:#1a2760;box-shadow:inset 0 0 0 1px var(--aG)}
.opick button:active{transform:scale(.9)}
.opick button:disabled{opacity:.3;cursor:default}
/* キャラの詳しい画面 */
.dSh{display:flex;flex-direction:column;background:linear-gradient(#0e1842,#050b22)!important}
.dTop{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:calc(env(safe-area-inset-top,0px) + 8px) max(12px,env(safe-area-inset-right,0px)) 8px max(10px,env(safe-area-inset-left,0px));background:linear-gradient(#24346f,#121c46);box-shadow:inset 0 -3px 0 var(--ec),0 2px 8px rgba(0,0,0,.5);z-index:2}
.dTop .st .tt{margin-left:6px;padding:1px 6px;border-radius:6px;font:900 12px var(--zk);color:#2b1a02;background:linear-gradient(#fff3c4,#e8b84a);letter-spacing:0;text-shadow:none;vertical-align:3px}
.aCard .tt{position:absolute;right:3px;top:3px;z-index:3;min-width:17px;height:17px;padding:0 3px;border-radius:5px;font:900 11px/17px var(--zk);text-align:center;color:#fff;background:#3a2c66;border:1px solid #e8c46a;box-shadow:0 1px 3px #000}.aCard .tt.mx{color:#2b1a02;background:linear-gradient(#fff3c4,#e8b84a)}
.dTop .bk{flex:0 0 auto;width:38px;height:38px;border:0;border-radius:9px;cursor:pointer;font:900 26px/1 var(--zk);color:#2b1a02;background:linear-gradient(#fff3c4,#e8b84a)}
.dTop .nm{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:900 20px var(--zk);color:#fff}
.dTop .st{margin-left:auto;flex:0 0 auto;font:900 15px var(--zk);color:#ffd76a;letter-spacing:-.06em;text-shadow:0 1px 0 #3a2400,0 0 3px #000}
.dScr{flex:1 1 auto;overflow-y:auto;padding:0 max(12px,env(safe-area-inset-right,0px)) 12px max(12px,env(safe-area-inset-left,0px));display:flex;flex-direction:column;gap:8px}
.dScr>*{flex:0 0 auto}
.dArt{position:relative;margin:0 -12px;height:clamp(300px,52vh,460px);background:radial-gradient(80% 70% at 50% 45%,var(--ec),var(--ed) 60%,#050b22 100%)}
.dArt .im{position:absolute;left:50%;top:6px;bottom:0;height:calc(100% - 6px);transform:translateX(-50%);filter:drop-shadow(0 8px 14px rgba(0,0,0,.5))}
.dArt .crest{position:absolute;left:50%;top:30%;transform:translateX(-50%);width:110px;height:110px;display:grid;place-items:center;font:900 46px var(--zk);color:#fff;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);background:var(--ed)}
.dArt .lv{position:absolute;left:14px;bottom:10px;display:flex;align-items:baseline;gap:3px;font:900 16px var(--zk);color:#fff;paint-order:stroke fill;-webkit-text-stroke:4px #0a0f24}.dArt .lv b{font-size:34px;line-height:1}.dArt .lv small{font-size:16px;color:#ffe7a1}
.dArt .aFrm{top:10px;left:12px}
.dPv{margin:0;padding:6px 10px;border-radius:8px;font:800 13px var(--zk);color:#2b1a02;background:linear-gradient(#fff3c4,#e8b84a);text-align:center}
.dBars{display:grid;gap:5px}
.dBars .br{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto 7px;column-gap:10px;align-items:center;padding:7px 10px;border-radius:9px;background:#0a1236;box-shadow:inset 0 0 0 1px rgba(232,200,120,.35)}
.dBars .lb{grid-row:1/3;padding:4px 10px;border-radius:6px;font:900 13px var(--zk);color:#fff;min-width:46px;text-align:center}
.dBars b{justify-self:end;font:900 20px/1.1 var(--zk);color:#fff}
.dBars i{grid-column:2;height:7px;border-radius:4px;background:#1b2550;overflow:hidden}.dBars i em{display:block;height:100%;border-radius:4px}
.dBars .bh .lb{background:#2e9e4f}.dBars .bh em{background:linear-gradient(90deg,#3ad46a,#a8ff7a)}
.dBars .ba .lb{background:#c23a3a}.dBars .ba em{background:linear-gradient(90deg,#ff5a4a,#ffb36a)}
.dBars .bw .lb{background:#7a5a2e}.dBars .bw em{background:linear-gradient(90deg,#b88a4a,#ffd59a)}.dBars b small{font-size:12px;color:#c3cbe6;margin-left:2px}.dBars .wtn{margin:-2px 2px 0;font:700 12px/1.5 var(--zk);color:#c3cbe6}
.dBars .bx .lb{background:#3d6fd1}.dBars .bx em{background:linear-gradient(90deg,#4a9bff,#9ae0ff)}.dBars .bx b{font-size:15px}
.dSec{position:relative;padding:22px 12px 10px;margin-top:10px;border-radius:10px;background:linear-gradient(#fffaf0,#f3e6c6);box-shadow:inset 0 0 0 1.5px #c9a14a}
.dSec .tg{position:absolute;left:10px;top:-10px;padding:3px 12px;border-radius:6px;font:900 13px var(--zk);color:#fff;box-shadow:0 2px 4px rgba(0,0,0,.35)}
.dSec.sk .tg{background:#d9731a}.dSec.ld .tg{background:#b0353a}.dSec.rs .tg{background:#7a44c2}.dSec.ab .tg{background:#1f8a8a}
.dSec h4{margin:0 0 3px;font:900 16px var(--zk);color:#2a2117}
.dSec p{margin:0;font:700 14px/1.6 var(--zk);color:#3d3326}
.dSec .ab{display:grid;gap:1px;padding:6px 0;border-bottom:1px dashed rgba(160,120,40,.45)}.dSec .ab:last-child{border-bottom:0}
.dSec .ab b{font:900 15px var(--zk);color:#14706f}.dSec .ab span{font:700 13.5px/1.5 var(--zk);color:#3d3326}
.dSec .ab.lk b{color:#8a7d68}.dSec .ab.lk span{color:#8a7d68}
.dSh .aCmp{margin:4px 0 0;background:linear-gradient(#fffaf0,#f3e6c6);color:#2a2117}
.dAct{flex:0 0 auto;padding:10px max(12px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 10px) max(12px,env(safe-area-inset-left,0px));background:linear-gradient(#121c46,#0a1236);box-shadow:0 -2px 8px rgba(0,0,0,.5),inset 0 2px 0 rgba(232,200,120,.4)}
.aCard img,.tmSlot img,.tmMr img,.aPick img,.aSl2 img{pointer-events:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;-webkit-user-drag:none}
.aSheet{position:absolute;inset:0;z-index:46;pointer-events:auto;overflow:hidden;background:#040a20;animation:aFade .2s}
.aSheet .back{position:absolute;inset:0;background:radial-gradient(90% 55% at 50% 28%,var(--ec),var(--ed) 55%,#040a20 90%);opacity:.5}
.aSheet .art{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 20px);height:46%;transform:translateX(-50%);filter:drop-shadow(0 10px 18px rgba(0,0,0,.55))}
.aSheet .crest{position:absolute;left:50%;top:16%;transform:translateX(-50%);width:110px;height:110px;display:grid;place-items:center;font:900 46px var(--zk);color:#fff;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);background:linear-gradient(135deg,var(--ec),var(--ed))}
.aFrm{position:absolute;left:max(10px,env(safe-area-inset-left,0px));top:calc(env(safe-area-inset-top,0px) + 10px);z-index:2;display:flex;gap:2px;padding:3px;border-radius:20px;background:rgba(6,10,30,.78);box-shadow:inset 0 0 0 1px rgba(255,231,161,.6)}.aFrm button{border:0;border-radius:16px;padding:7px 16px;cursor:pointer;font:900 15px/1 var(--zk);color:#fff!important;background:transparent}.aFrm button.on{color:#3a2400!important}
.aCmp{margin:6px 0 2px;padding:8px 10px;border-radius:8px;background:rgba(232,184,74,.16);box-shadow:inset 0 0 0 1px rgba(200,150,40,.5)}.aCmp b{font:900 13px var(--zk)}.aCmp ul{margin:4px 0 0;padding:0;list-style:none;display:grid;gap:2px;font:700 12.5px/1.45 var(--zk)}.aCmp span{opacity:.7}.aCmp em{font-style:normal;font-weight:900;color:#c0392b}.aFrm button.on{color:#3a2400;background:linear-gradient(#fff3c4,#e8b84a)}
.aSheet .x{position:absolute;right:max(10px,env(safe-area-inset-right,0px));top:calc(env(safe-area-inset-top,0px) + 10px);z-index:2;width:36px;height:36px;border:0;border-radius:50%;cursor:pointer;color:#fff;font:400 20px/1 var(--zk)}
.aSheet .info{position:absolute;left:0;right:0;bottom:0;z-index:1;padding:12px max(12px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 12px) max(12px,env(safe-area-inset-left,0px));border-radius:12px 12px 0 0;display:grid;gap:8px;background:#0e1842;box-shadow:0 -1px 0 var(--aG)}
.aSheet .nmr{display:flex;align-items:center;gap:6px}
.aSheet .nmr b{font:900 19px var(--zk);color:#fff}
.aSheet .nmr .aSt{margin-left:auto;font-size:12px}
.aSheet .ldr{font:700 12px var(--zk);color:var(--aG1)}
.aStat{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.aStat div{display:grid;gap:1px;padding:6px 8px;border-radius:6px;background:#0a1236;box-shadow:inset 0 0 0 1px rgba(232,200,120,.2)}
.aStat span{font:700 10px var(--zk);color:var(--aMut)}
.aStat b{font:900 15px var(--zk);color:#fff;font-variant-numeric:tabular-nums}
.aStat b small{font-size:10px;color:var(--aMut);margin-left:1px}
/* 確認の窓 */
.omodal{position:absolute;inset:0;z-index:47;display:grid;place-items:center;padding:20px;background:rgba(2,6,18,.7);pointer-events:auto;animation:aFade .15s}
@keyframes aFade{from{opacity:0}}
.omodal .aDlg{width:min(320px,100%);max-height:calc(100% - 24px);overflow-y:auto;border-radius:10px;padding:0 0 12px;display:grid;gap:10px;animation:aPop .2s ease-out}
@keyframes aPop{from{opacity:0;transform:scale(.95)}}
.aDlg .hd{padding:10px 14px;text-align:center;font:900 15px var(--zk);color:#fff;background:linear-gradient(180deg,rgba(232,200,120,.2),rgba(232,200,120,0));border-bottom:1px solid var(--aLine)}
.aDlg .bdy{padding:0 14px;display:grid;gap:8px;font:500 13px/1.65 var(--zk);color:var(--aDim)}
.aDlg .bdy p{margin:0}
.oflash{position:absolute;left:50%;top:42%;z-index:50;transform:translate(-50%,-50%);padding:10px 18px;border-radius:9px;font:900 15px var(--zk);color:#fff;white-space:nowrap;pointer-events:none}
/* ガチャ */
.aGa{position:absolute;inset:0;z-index:0;overflow:hidden}
#ohud .aX{flex:none;width:34px;height:34px;margin-left:6px;border:0;border-radius:50%;cursor:pointer;font:900 18px/1 var(--zk);color:#2a2117;background:linear-gradient(#fffaf0,#efe0bb);box-shadow:0 0 0 1.5px #c9a14a,0 2px 0 #6b4f1c}
.aGa .gbg{position:absolute;inset:0;background:url(${UI}gacha-bg.webp) center/cover no-repeat,#0c1240}
.aGa .chars{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 170px);height:48%;pointer-events:none;transition:opacity .25s}.aGa .chars.sw{opacity:0}
.aGa .chars img{position:absolute;bottom:0;max-width:none;filter:drop-shadow(0 10px 16px rgba(0,0,0,.55))}
.aGa .chars img.fr{left:50%;height:100%;transform:translateX(-50%);animation:aBreathe 4.2s ease-in-out infinite}
.aGa .chars img.bl,.aGa .chars img.br{height:68%;bottom:14%;opacity:.75;filter:brightness(.62)}
.aGa .chars img.bl{left:-20%}.aGa .chars img.br{right:-20%}
.aGa .hd{position:absolute;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 52px);z-index:2;display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:rgba(14,24,66,.88);box-shadow:inset 0 0 0 1px var(--aLine)}
.aGa .hd b{font:900 16px var(--zk);color:#fff}
.aGa .hd span{font:700 11px var(--zk);color:var(--aDim)}
.aGa .hd .rate{margin-left:auto;border:0;cursor:pointer;height:28px;padding:0 10px;border-radius:6px;font:700 11px var(--zk);color:var(--aG1);background:#1a2760;box-shadow:inset 0 0 0 1px var(--aLine)}
.gbl .gWho .gTi{display:block;font:800 12px/1.2 var(--zk);letter-spacing:.12em;color:#ffd6ec;-webkit-text-stroke:3px #1a0a30;paint-order:stroke fill;margin-bottom:2px}
.gPk{display:flex;gap:8px;justify-content:center;margin:10px 0 14px}.gPkB{flex:1;max-width:110px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 4px;border-radius:12px;border:1.5px solid var(--ec);background:#0e1838;color:#fff}
.gPkB img{width:64px;height:64px;border-radius:10px}.gPkB small{font-size:10px;opacity:.8}.gPkB b{font-size:14px}
.aGa .gBan{position:absolute;left:max(12px,env(safe-area-inset-left,0px));right:max(12px,env(safe-area-inset-right,0px));top:calc(env(safe-area-inset-top,0px) + 112px);z-index:4;display:flex;gap:6px}
.aGa .gBt{flex:1;min-height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.25);background:rgba(8,12,30,.72);color:#dfe6ff;font:800 12.5px var(--zk);display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer}
.aGa .gBt.on{background:linear-gradient(180deg,#fff2c2,#e8b54a);color:#2b1a02;border-color:transparent}.aGa .gBt.lim.on{background:linear-gradient(90deg,#59f0ff,#ff5ad8);color:#07070d}
.aGa .gBt em{font-style:normal;font-size:10px;padding:1px 5px;border-radius:4px;background:#ff3b6b;color:#fff}
.aGa.gbl .gbg{background:radial-gradient(60% 40% at 30% 30%,#ff5ad855,transparent),radial-gradient(60% 40% at 75% 60%,#36d6ff55,transparent),linear-gradient(180deg,#1a1236,#07070d)!important}
.aGa .btns{position:absolute;left:max(12px,env(safe-area-inset-left,0px));right:max(12px,env(safe-area-inset-right,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 68px);z-index:3;display:flex;gap:8px}
.aGa .btns .aBtn{flex:1;min-height:52px;padding:5px 6px;font-size:15px}
.aGa .btns .aBtn small{display:flex;align-items:center;justify-content:center;gap:3px;font:900 12px var(--zk)}
.aGa .btns .aBtn small svg{width:13px;height:13px}
.aGa .own{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 126px);z-index:3;text-align:center;font:700 12px var(--zk);color:#fff;text-shadow:0 1px 3px #000}
/* 召喚の演出 */
.aSum2{position:absolute;inset:0;z-index:60;pointer-events:auto;overflow:hidden;background:#02050f}
.aSum2 .cv{position:absolute;inset:0;width:100%;height:100%}
.aSum2 .skip{position:absolute;right:max(12px,env(safe-area-inset-right,0px));top:calc(env(safe-area-inset-top,0px) + 10px);z-index:3;border:0;cursor:pointer;height:30px;padding:0 12px;border-radius:15px;font:700 12px var(--zk);color:#fff;background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 1px rgba(232,200,120,.4)}
.aRes{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;justify-content:center;gap:14px;padding:calc(env(safe-area-inset-top,0px) + 40px) max(12px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 20px) max(12px,env(safe-area-inset-left,0px));background:linear-gradient(180deg,rgba(2,5,15,.25),rgba(2,5,15,.6))}
.aRes .hd{text-align:center;font:800 20px var(--mi);letter-spacing:.14em;color:var(--aG1);text-shadow:0 2px 6px #000}
.aRg{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.aRg.one{grid-template-columns:minmax(0,150px);justify-content:center}
.aTc{position:relative;aspect-ratio:3/4.4;perspective:600px}
.aTc .in{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .45s cubic-bezier(.3,1.3,.5,1)}
.aTc.open .in{transform:rotateY(180deg)}
.aTc .f,.aTc .b{position:absolute;inset:0;border-radius:7px;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden}
.aTc .b{background:linear-gradient(160deg,#22306a,#0b1236);box-shadow:inset 0 0 0 1.5px var(--rc),0 0 12px var(--rg)}
.aTc .b::before{content:"";position:absolute;left:50%;top:50%;width:42%;aspect-ratio:1;transform:translate(-50%,-50%) rotate(45deg);border:1.5px solid var(--rc)}
.aTc .f{transform:rotateY(180deg);padding:2px;background:var(--rf)}
.aTc .f .p{position:relative;width:100%;height:100%;border-radius:5px;overflow:hidden;background:radial-gradient(100% 80% at 50% 25%,var(--ec),var(--ed) 70%,#060b1c)}
.aTc .f .p img{position:absolute;left:50%;top:-2%;height:140%;transform:translateX(-50%);max-width:none}
.aTc .f .p::after{content:"";position:absolute;left:0;right:0;bottom:0;height:40%;background:linear-gradient(180deg,transparent,rgba(0,0,0,.85))}
.aTc .f .aSt{position:absolute;left:0;right:0;bottom:3px;z-index:1;text-align:center;font-size:8px}
.aTc .f .aG{position:absolute;left:3px;top:3px;z-index:1;width:15px;height:15px;font-size:8px}
.aTc em{position:absolute;left:50%;top:-5px;z-index:3;transform:translateX(-50%);padding:0 5px;border-radius:3px;font:900 9px/14px var(--zk);font-style:normal;color:#fff;background:#e0304a;opacity:0;transition:opacity .2s .35s}
.aTc.open em{opacity:1}
.aTc.r5.open{animation:aR5 .55s ease-out .2s}
@keyframes aR5{30%{transform:scale(1.1)}}
.aTc .pl{position:absolute;left:10%;right:10%;bottom:40%;height:200%;background:linear-gradient(0deg,var(--rg),transparent);filter:blur(6px);opacity:0;pointer-events:none;transform-origin:50% 100%}
.aTc.open .pl{animation:aPl .8s ease-out}
@keyframes aPl{0%{opacity:0;transform:scaleY(.2)}25%{opacity:1}100%{opacity:0;transform:scaleY(1)}}
.aRes .orow{opacity:0;transition:opacity .25s}.aRes.done .orow{opacity:1}
/* その他 */
.aList{display:grid;border-radius:8px;overflow:hidden}
.aList button{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;border:0;background:none;cursor:pointer;padding:8px 12px;text-align:left;font:700 14px var(--zk);color:#fff;border-bottom:1px solid rgba(232,200,120,.15)}
.aList>:last-child{border-bottom:0}
.aList svg{width:20px;height:20px;flex:none;fill:none;stroke:var(--aG);stroke-width:1.9;stroke-linejoin:round;stroke-linecap:round}
.aList small{display:block;font:500 11px var(--zk);color:var(--aMut);margin-top:1px}
.aList .ar{margin-left:auto;color:var(--aG);font:400 18px var(--zk)}
.aList button:active{background:rgba(232,200,120,.08)}
/* 戦闘の結果・メニュー・説明の窓も同じ見た目に */
#res:not(.fail){background:linear-gradient(180deg,rgba(3,7,18,.35),rgba(3,7,18,.6)),url(${UI}result-bg.webp) center/cover no-repeat,#030712}
#res .rc,#mn .mc,#ov .card,#skp{border-radius:10px;background:#0e1842;box-shadow:inset 0 0 0 1px var(--aLine),0 10px 26px rgba(0,0,0,.6)}
#res .rs div{border-radius:7px;background:#0a1236;box-shadow:inset 0 0 0 1px rgba(232,200,120,.25)}
#res .rs b{font:900 22px var(--zk);font-variant-numeric:tabular-nums}
#res .btn,#mn .btn,#ov .btn,#skp .btn{min-height:44px;border-radius:8px;font:900 15px var(--zk);color:#fff;background:linear-gradient(180deg,#24336e,#121b4a);box-shadow:inset 0 0 0 1px var(--aG),0 3px 8px rgba(0,0,0,.4)}
#res .btn.go,#ov .btn,#skp .btn.go,#mn #mnc{color:#2b1a02;background:linear-gradient(180deg,#fff2c2 0%,#f0c968 42%,#c58a26 58%,#e8b54a 100%);box-shadow:inset 0 1px 0 #fff8e0,inset 0 -2px 0 rgba(90,55,0,.45),0 0 0 1px #5a3c08,0 3px 8px rgba(0,0,0,.45)}
#skp .btn.go:disabled{filter:grayscale(1) brightness(.55)}
#res .btn:active,#mn .btn:active,#ov .btn:active,#skp .btn:active{transform:scale(.96)}
@media (prefers-reduced-motion:reduce){#oroot *,#onav *,.aSheet,.aSheet *,.aSum2 *,.aGo,.aGo *{animation:none!important;transition:none!important}}
/* ===== (v2.2) 読みやすさ: 情報の板は明るいクリームに濃い文字(D-101)。紺は背景・上下の帯・ボタンだけ ===== */
:root{--cr:#fbf3df;--cr2:#f3e6c6;--crTx:#2a2117;--crSub:#6b5b45;--crLine:#c9a14a;--crGold:#8a5d0c}
.aGl,.aQr,.aGo .sh,.aSheet .info,.aList,.aStat div,#res .rc,#mn .mc,#ov .card,#skp{background:var(--cr)!important;color:var(--crTx);box-shadow:inset 0 0 0 2px var(--crLine),0 3px 10px rgba(0,0,0,.45)!important}
.aPl.aGl,.aCur.aGl{background:rgba(14,24,66,.95)!important;color:#fff;box-shadow:inset 0 0 0 1.5px var(--aG)!important}
.aCur.aGl b,.aPl.aGl .aPn{color:#fff!important}.aPl.aGl .aRk b{color:var(--aG1)!important}
.aEvr .no{background-size:cover!important;background-position:75% center!important}
.aGl h3,.aGl b,.aGl .n,.aPanel h3{color:var(--crTx)}
.aPanel p,.aGl p{color:var(--crSub)}
.onote{font-size:13px;color:#d6dcf0}
.osec{font-size:14px}
/* ステージの一覧 */
.aQr{min-height:62px;color:var(--crTx)}
.aQr .md b{font:900 16px var(--zk);color:var(--crTx)}
.aQr .md span{font:700 12px var(--zk);color:var(--crSub)}
.aQr .md span .sv{color:#c0392b}
.aQr .no{color:#fff;background:linear-gradient(180deg,#2a3b80,#141d4c);box-shadow:none}
.aQr.cur{box-shadow:inset 0 0 0 3px #e0a020,0 0 14px rgba(255,190,60,.55)!important}
.aQr.cur .no{color:#2b1a02;background:linear-gradient(180deg,#ffe28a,#e0a020)}
.aQr.hd{background:linear-gradient(90deg,#ffe2e2,var(--cr) 45%)!important}
.aQr.lock{opacity:1;background:#cfd3df!important;box-shadow:inset 0 0 0 2px #a8aec0!important}
.aQr.lock .md b,.aQr.lock .md span{color:#5a6070}
.aQr .ar{color:var(--crGold)}
.aQr .rt{gap:3px}
.aQr .st3 i{font-style:normal;font-size:15px;color:#cbbd9c;letter-spacing:-1px}.aQr .st3 i.on{color:#e8a000;text-shadow:0 1px 0 #7a4a00}
.aQr .rt .fr{display:inline-flex;align-items:center;gap:2px;font:900 10px var(--zk);color:#1a4a8a}.aQr .rt .fr svg{width:12px;height:12px}
.aQr .rt .nx{font-size:10px}
.aQr .rt .lk{color:#5a6070}
.aCh .pg{background:rgba(5,11,34,.85)}
/* 出撃の確認 */
.aGo .sh{border-radius:14px 14px 0 0}
.aGo .tt b{color:var(--crGold);font-size:15px}.aGo .tt span{color:var(--crTx);font-size:18px}
.aGo p{color:var(--crSub);font-size:13px}
.aGo .hdn{color:#b02030!important;font-weight:700}
.aGo .inf span{color:var(--crTx);background:#fff;box-shadow:inset 0 0 0 1.5px #e0cfa6}
.aGo .inf span.nw{background:#ffe08a}
.aGo .pty{background:#fff;box-shadow:inset 0 0 0 1.5px #e0cfa6}
.aGo .pty .lt{color:var(--crSub)}.aGo .pty .lt b{color:var(--crTx)}
.aSb{display:grid;gap:4px;padding:8px 10px;border-radius:8px;background:#fff;box-shadow:inset 0 0 0 1.5px #e0cfa6}
.aSb>div{display:flex;align-items:center;gap:6px;font:700 13px var(--zk);color:var(--crTx)}
.aSb>div i{font-style:normal;font-size:16px;color:#cbbd9c}
.aSb>div.on i{color:#e8a000}
.aSb>div em{margin-left:auto;display:inline-flex;align-items:center;gap:2px;font:900 11px var(--zk);font-style:normal;color:#1a4a8a}.aSb>div em svg{width:12px;height:12px}
.aSb>div.on em{color:#2a8a3a}
.aSb .fst{justify-content:center;margin-top:2px;padding:4px;border-radius:6px;font:900 12px var(--zk);color:#1a4a8a;background:#e6f0ff}.aSb .fst svg{width:13px;height:13px}
.aSb .sk{justify-content:center;font:700 12px var(--zk);color:#2a8a3a}
/* 報酬のチップ */
.aRw{display:inline-flex;align-items:center;gap:4px;height:28px;padding:0 9px 0 5px;border-radius:14px;background:#fff;box-shadow:inset 0 0 0 1.5px #e0cfa6;font:700 12px var(--zk);color:var(--crTx);white-space:nowrap}
.aRw svg{width:16px;height:16px}.aRw .aMi{width:20px;height:20px}
.aRw i{font-style:normal;font-weight:900;color:#1a4a8a}
.aRl{display:flex;flex-wrap:wrap;gap:5px;justify-content:center}
.aRl small{width:100%;text-align:center;font:900 11px var(--zk);color:#1a4a8a}
/* 結果画面の★と報酬 */
#ores{display:grid;gap:8px;width:100%}
.aRs{display:grid;gap:3px}
.aRs>div{display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;font:700 13px var(--zk);color:#7a6d55;background:#fff}
.aRs>div i{font-style:normal;font-size:17px;color:#d4c8aa}
.aRs>div.on{color:var(--crTx)}.aRs>div.on i{color:#e8a000;text-shadow:0 1px 0 #7a4a00}
.aRs>div em{margin-left:auto;font:900 10px var(--zk);font-style:normal;color:#fff;background:#e0304a;padding:1px 6px;border-radius:3px}
#res .rk{color:#8a5d0c;text-shadow:0 1px 0 #fff}
#res.fail .rk{color:#b02030}
#res .rn{color:var(--crTx)}
#res .rs div{background:#fff!important;box-shadow:inset 0 0 0 1.5px #e0cfa6!important}
#res .rs span{color:var(--crSub)}#res .rs b{color:var(--crTx)}
#res .rx{color:var(--crSub)!important}
#mn h3,#ov h2,#skp h3{color:var(--crTx)!important;text-shadow:none!important}
#ov p,#skp p{color:var(--crSub)!important}
/* 確認の窓 */
.aDlg .hd{color:var(--crTx);background:var(--cr2);border-bottom:2px solid var(--crLine)}
.aDlg .bdy{color:var(--crSub);font-size:14px}
.aDlg .bdy b{color:var(--crTx)}
/* ミッション・プレゼント */
.aLb{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
.aLb>div{display:grid;justify-items:center;gap:2px;padding:6px 2px;border-radius:7px;background:#fff;box-shadow:inset 0 0 0 1.5px #e0cfa6;font:900 12px var(--zk);color:var(--crTx)}
.aLb>div small{font:700 10px var(--zk);color:var(--crSub)}
.aLb>div svg,.aLb>div .aMi{width:22px;height:22px}
.aLb>div.got{opacity:.45}
.aLb>div.now{background:#ffe9a8;box-shadow:inset 0 0 0 2.5px #e0a020}
.aLb>div:last-child{grid-column:span 2}
.aMs-h{margin:0!important;font-size:11px!important;text-align:center}
.aMs{display:grid;gap:5px}
.aMs>div{display:grid;grid-template-columns:1fr auto;gap:4px 8px;align-items:center;padding:8px 10px;border-radius:8px;background:#fff;box-shadow:inset 0 0 0 1.5px #e0cfa6}
.aMs .t{font:700 13px var(--zk);color:var(--crTx)}.aMs .t small{margin-left:6px;font-weight:900;color:#1a4a8a}
.aMs .r{grid-column:1;display:flex;gap:4px}
.aMs button{grid-column:2;grid-row:1/3;border:0;cursor:pointer;min-width:72px;height:36px;border-radius:7px;font:900 13px var(--zk);color:#2b1a02;background:linear-gradient(180deg,#fff2c2,#e0a020)}
.aMs button:disabled{color:#7a7a7a;background:#e6e2d8;cursor:default}
.aMs>div.done{opacity:.6}
.aBx{display:grid;gap:5px;max-height:46vh;overflow-y:auto}
.aBx>div{display:grid;grid-template-columns:1fr auto;gap:2px 8px;align-items:center;padding:7px 9px;border-radius:8px;background:#fff;box-shadow:inset 0 0 0 1.5px #e0cfa6}
.aBx small{grid-column:1;font:700 11px var(--zk);color:var(--crSub)}
.aBx button{grid-column:2;grid-row:1/3;border:0;cursor:pointer;height:34px;padding:0 12px;border-radius:7px;font:900 13px var(--zk);color:#2b1a02;background:linear-gradient(180deg,#fff2c2,#e0a020)}
/* 天井 */
.aPity{position:absolute;left:max(12px,env(safe-area-inset-left,0px));right:max(12px,env(safe-area-inset-right,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 128px);z-index:3;display:flex;align-items:center;gap:8px;padding:6px 8px 6px 12px;border-radius:9px;background:rgba(251,243,223,.97);box-shadow:inset 0 0 0 2px var(--crLine)}
.aPity span:first-child{font:700 12px var(--zk);color:var(--crSub);white-space:nowrap}.aPity b{font:900 16px var(--zk);color:var(--crTx)}
.aPity .bar{flex:1;height:8px;border-radius:4px;background:#e6dcc4;overflow:hidden}.aPity .bar i{display:block;height:100%;background:linear-gradient(90deg,#e0a020,#ffd36a)}
.aPity .aBtn{flex:none}
.aGa .btns .aBtn small{font-size:11px}
/* 板の中の文字の色 */
.aSel .s{color:var(--crTx);font-size:13.5px;line-height:1.6}.aSel .s b{color:var(--crGold)}.aSel .n{font-size:17px}
.aSum span{color:var(--crSub)}.aSum b{color:var(--crTx)}
.aPw h3{color:var(--crTx)}.aPw .lv{color:var(--crSub)}.aPw .lv b{color:var(--crTx)}.aPw .lv b.up{color:#1a8a3a}.aPw .gain{color:var(--crSub)}.aPw .gain b{color:#1a8a3a}
.aExp{background:#e6dcc4;box-shadow:none}
.opick .n{color:var(--crTx)}.opick .n small{color:var(--crSub)}.opick b{color:var(--crTx)}
.opick button{color:#fff;background:#24336e;box-shadow:none}
.omat>div{color:var(--crTx)}.omat>div b.n{color:var(--crTx)}
.aList button{color:var(--crTx);border-bottom:1px solid #e6d6ae}.aList small{color:var(--crSub)}.aList svg{stroke:var(--crGold)}.aList .ar{color:var(--crGold)}
.aSheet .nmr b{color:var(--crTx)}.aSheet .ldr{color:var(--crGold)}
.aStat span{color:var(--crSub)}.aStat b{color:var(--crTx)}
.oflash{color:var(--crTx)!important}
/* 絵の上の文字は白+濃いふち */
.aNm .nm,.aNm .ld,.aIb span,.aCh .t b,.aCh .t small,.aGa .hd b{paint-order:stroke fill;-webkit-text-stroke:3px rgba(6,10,30,.9)}
.aGa .hd{background:rgba(251,243,223,.97);box-shadow:inset 0 0 0 2px var(--crLine)}
.aGa .hd b{color:var(--crTx);-webkit-text-stroke:0}.aGa .hd span{color:var(--crSub)}
.aSlot .t b{paint-order:stroke fill;-webkit-text-stroke:3px rgba(6,10,30,.9);font-size:13px}
/* (v2.3) 隠れないように: 下から出る板・窓・結果は画面の高さをこえたら中でスクロール。上の帯と下のバーの分をあける */
.aGo .sh{max-height:calc(100% - env(safe-area-inset-top,0px) - 20px);overflow-y:auto;overscroll-behavior:contain}
.omodal{padding:calc(env(safe-area-inset-top,0px) + 12px) 14px calc(env(safe-area-inset-bottom,0px) + 12px)}
.omodal .aDlg{max-height:100%}
#res{padding:calc(env(safe-area-inset-top,0px) + 10px) 12px calc(env(safe-area-inset-bottom,0px) + 10px)!important}
#res .rc{max-height:100%;overflow-y:auto;overscroll-behavior:contain;gap:8px!important;padding:14px 14px 12px!important}
.aRes{overflow-y:auto}
/* 低い画面(高さ720未満)では、ホームとガチャの絵を小さくして文字やボタンと重ならないように */
@media (max-height:720px){
 .aHero{height:44%;bottom:calc(env(safe-area-inset-bottom,0px) + 128px)}
 .aNm{bottom:calc(env(safe-area-inset-bottom,0px) + 122px)}
 .aTalk{display:none}
 .aSide{gap:5px}.aIb .ic{width:34px;height:34px}.aIb span{font-size:9px}
 .aBan{width:100px}.aBan .im{height:40px}
 .aGa .chars{height:40%;bottom:calc(env(safe-area-inset-bottom,0px) + 172px)}
 .aCh{height:58px}
 .aQr{min-height:54px;padding:5px 9px}
}

/* 下のバーのまん中の金の丸(上に16pxはみ出す)に隠れないように、下の余白を広げる。
   --nb は実際の下のバーの高さ(JSで測る。スマホのアプリの中だと env() だけでは合わないため) */
#oroot{padding-bottom:calc(var(--nb,90px) + 20px)}
.aCta{bottom:calc(var(--nb,90px) + 22px)}
.aNm{bottom:calc(var(--nb,90px) + 80px)}
.aHero{bottom:calc(var(--nb,90px) + 74px)}
.aGa .btns{bottom:calc(var(--nb,90px) + 22px)}
.aPity{bottom:calc(var(--nb,90px) + 82px)}
.aGa .chars{bottom:calc(var(--nb,90px) + 126px)}
@media (max-height:720px){.aHero{bottom:calc(var(--nb,90px) + 84px)}.aNm{bottom:calc(var(--nb,90px) + 78px)}.aGa .chars{bottom:calc(var(--nb,90px) + 124px)}}

.tmW{display:grid;gap:3px;min-width:0}
.tmSk{display:flex;align-items:center;gap:3px;min-width:0;height:24px;padding:0 6px 0 3px;border:0;border-radius:12px;cursor:pointer;font:800 9.5px/1 var(--zk);color:#6b5b45;background:#efe4c8;box-shadow:inset 0 0 0 1px #d8c49a}
.tmSk span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tmSk img,.tmSk i{flex:none;width:18px;height:18px;border-radius:50%;object-fit:cover;background:#d8c9a6}
.tmSk.on{color:#fff;background:linear-gradient(#d0508a,#9a2a62);box-shadow:inset 0 0 0 1px #ffd0e4}
.dSec.sn .tg{background:#c0407a}.dSec.sn p{margin:0 0 8px}.snL{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.snL button{display:grid;justify-items:center;gap:2px;padding:5px 2px 6px;border:0;border-radius:8px;cursor:pointer;color:var(--crTx);background:#fff;box-shadow:inset 0 0 0 1.5px #e0cfa6}
.snL button.on{box-shadow:inset 0 0 0 2.5px #e0a020,0 0 8px rgba(224,160,32,.5);background:#fff8e0}
.snL button[disabled]{opacity:.5;cursor:default}
.snL img,.snL i{width:100%;aspect-ratio:1;border-radius:6px;object-fit:cover;background:#e8e0cc}
.snL b{font:800 10.5px/1.2 var(--zk);text-align:center}.snL small{font:700 8.5px/1.2 var(--zk);color:#8a6a3a;text-align:center}
/* (v114) ガチャ画面: ほかのゲームと同じく、絵を大きく、ガチャの名前と★5の名前は絵の上にロゴ文字で。説明は「詳細」の中 */
.aGa .gLogo{position:absolute;left:16px;top:calc(env(safe-area-inset-top,0px) + 60px);z-index:3;display:grid;pointer-events:none}
.aGa .gLogo small{font:900 11px Cinzel,var(--mi);letter-spacing:.32em;color:#ffe7a1;-webkit-text-stroke:3px #1a0e02;paint-order:stroke fill}
.aGa .gLogo b{font:800 40px/1.05 var(--mi);letter-spacing:.04em;color:#fff6d8;-webkit-text-stroke:7px #1a0e02;paint-order:stroke fill;text-shadow:0 3px 0 #1a0e02,0 0 18px rgba(255,200,90,.55)}
.aGa .gDt{position:absolute;right:12px;top:calc(env(safe-area-inset-top,0px) + 58px);z-index:3;height:32px;padding:0 14px;border:0;border-radius:16px;cursor:pointer;font:900 13px var(--zk);color:#2a2117;background:linear-gradient(#fffaf0,#efe0bb);box-shadow:0 0 0 1.5px #c9a14a,0 3px 0 #6b4f1c}
.aGa .gDt:active{transform:translateY(2px);box-shadow:0 0 0 1.5px #c9a14a,0 1px 0 #6b4f1c}
.aGa .chars{top:calc(env(safe-area-inset-top,0px) + 96px);bottom:calc(var(--nb,90px) + 140px);height:auto}
.aGa .chars{display:flex;justify-content:center;align-items:flex-end}
.aGa .chars img.fr{position:relative;left:auto;transform:none;flex:none;width:auto;height:100%;transform-origin:50% 100%;animation:aBreathe 4.2s ease-in-out infinite}
.aGa .chars.sw,.aGa .gWho.sw{opacity:0}
.aGa .gWho{position:absolute;right:14px;bottom:calc(var(--nb,90px) + 196px);z-index:3;display:grid;justify-items:end;gap:2px;pointer-events:none;transition:opacity .2s}
.aGa .gWho .st{font:900 20px/1 var(--zk);letter-spacing:-1px;color:#ffd84a;-webkit-text-stroke:4px #3a2200;paint-order:stroke fill}
.aGa .gWho b{font:800 38px/1.1 var(--mi);color:#fff;-webkit-text-stroke:7px #0a0e24;paint-order:stroke fill;text-shadow:0 3px 0 #0a0e24}
.aGa .gWho .el{display:flex;align-items:center;gap:6px;font:900 14px var(--zk);color:#fff;-webkit-text-stroke:4px #0a0e24;paint-order:stroke fill}
.aGa .gFs{position:absolute;left:12px;right:12px;bottom:calc(var(--nb,90px) + 138px);z-index:3;display:flex;justify-content:center;gap:6px}
.aGa .gF{position:relative;width:40px;height:40px;flex:none;padding:0;border:0;border-radius:50%;overflow:hidden;cursor:pointer;background:var(--ec);box-shadow:0 0 0 2px rgba(10,14,36,.9),0 2px 6px rgba(0,0,0,.6);opacity:.78;transition:transform .12s,opacity .12s}
.aGa .gF img{width:100%;height:100%;object-fit:cover;display:block}.aGa .gF b{font:900 13px var(--zk);color:#fff}
.aGa .gF:active{transform:scale(.92)}
.aGa .gF.on{opacity:1;transform:scale(1.12);box-shadow:0 0 0 2px #fff,0 0 0 4px #e0a020,0 0 12px rgba(255,190,60,.85)}
.aGa .gPt{position:absolute;left:max(12px,env(safe-area-inset-left,0px));right:max(12px,env(safe-area-inset-right,0px));bottom:calc(var(--nb,90px) + 94px);z-index:3;display:flex;align-items:center;gap:8px;height:34px;padding:0 4px 0 12px;border-radius:17px;background:rgba(8,12,34,.86);box-shadow:inset 0 0 0 1px rgba(232,200,120,.5)}
.aGa .gPt>span:first-child{font:800 12px var(--zk);color:#d8def2;white-space:nowrap}.aGa .gPt b{font-size:15px;color:#fff}
.aGa .gPt .bar{flex:1;height:7px;border-radius:4px;background:rgba(255,255,255,.15);overflow:hidden}.aGa .gPt .bar i{display:block;height:100%;background:linear-gradient(90deg,#e0a020,#ffd36a)}
.aGa .gPt .aBtn{flex:none;height:26px;min-height:0;padding:0 10px;border-radius:13px;font-size:11px}
.aGa .gPt.ok{box-shadow:inset 0 0 0 1.5px #ffd36a,0 0 14px rgba(255,200,80,.6)}.aGa .gPt.ok .aBtn{animation:gGlow 1.4s ease-in-out infinite}
@keyframes gGlow{50%{box-shadow:0 0 0 2px #fff,0 0 14px rgba(255,210,100,.95)}}
.aGa .btns .aBtn{position:relative;font-size:16px}
.aGa .btns .aBtn small{font-size:13px}
.xpLeft{margin:6px 12px 2px;padding:8px 12px;border-radius:12px;background:rgba(255,248,230,.95);color:#2a1c08;font:800 14px var(--zk);text-align:center;box-shadow:0 0 0 1.5px #e8c070}.xpLeft b{font-size:18px;color:#b0420a}.xpLeft small{display:block;font:700 11px var(--zk);color:#5a4420}
.xpNote{margin:4px 0 0;text-align:center;font:800 13px var(--zk)}.xpNote b{font-size:16px;color:#ffd36a}
.aGa .gFirst{position:absolute;left:50%;top:50%;transform:translateX(-50%);z-index:3;width:min(86%,340px);padding:10px 14px;border-radius:14px;text-align:center;background:rgba(255,248,230,.95);color:#2a1c08;box-shadow:0 6px 18px rgba(0,0,0,.45),0 0 0 1.5px #e8c070;pointer-events:none;animation:gFirstIn .5s cubic-bezier(.2,.9,.3,1.2)}
.aGa .gFirst b{display:block;font:900 17px var(--zk)}.aGa .gFirst span{display:block;margin-top:2px;font:700 12px var(--zk);color:#5a4420}
@keyframes gFirstIn{from{opacity:0;transform:translate(-50%,-8px) scale(.94)}}
.aBtn.free{animation:gFree 1.6s ease-in-out infinite}@keyframes gFree{50%{box-shadow:0 0 0 2px #fff6d8,0 0 26px rgba(255,214,120,.9)}}
.aGa .gK{position:absolute;left:calc(75% + 2px);top:-10px;z-index:2;pointer-events:none;transform:translateX(-50%);white-space:nowrap;padding:2px 9px;border-radius:10px;font:900 10.5px var(--zk);font-style:normal;color:#fff;background:linear-gradient(#ff6a5a,#d42a3a);box-shadow:0 0 0 1.5px #fff,0 2px 0 #6a0a14}
.gRs{display:grid;gap:10px;margin-bottom:8px}
.gRw p{margin:0 0 5px;font:700 12.5px var(--zk)}.gRw p b{font-size:14px}.gRw p small{margin-left:4px;font-size:11px;opacity:.75}
.gRw .s5{color:#c88a00}.gRw .s4{color:#8a4ad0}.gRw .s3{color:#3e64a8}
.gIc{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.gIc span{display:grid;justify-items:center;gap:2px}
.gIc img{width:100%;aspect-ratio:1;border-radius:7px;object-fit:cover;background:var(--ec);box-shadow:inset 0 0 0 2px rgba(0,0,0,.2)}
.gIc i{font:800 10.5px var(--zk);font-style:normal;text-align:center;line-height:1.2}
@media (max-height:720px){.aGa .gLogo b{font-size:32px}.aGa .gWho b{font-size:30px}.aGa .gWho{bottom:calc(var(--nb,90px) + 188px)}}

/* (v63) 素材アイコンが一覧・チップの中でつぶれないように(S/M/L の印が切れていた) */
.aQr .md .aMi,.aGo .inf span .aMi{display:inline-grid;width:22px;height:22px;padding:0;gap:0;border-radius:0;background:none;box-shadow:none;font:inherit}
.aQr .md .aMi img,.aGo .inf span .aMi img{width:100%;height:100%}
.aQr .md .aMi b,.aGo .inf span .aMi b{position:absolute;right:-4px;bottom:-3px;min-width:13px;height:13px;padding:0 2px;border-radius:7px;overflow:visible;white-space:nowrap;font:900 8px/13px var(--zk)!important;text-align:center;color:#2b1a02!important;background:var(--aG)}
/* (v63) イベントの 初級・中級・上級 */
.aQr .md .tqs{gap:4px}
.aQr .tq{display:inline-flex;align-items:center;gap:2px;height:18px;padding:0 6px;border-radius:9px;font:800 10px var(--zk);font-style:normal;color:#5a6070;background:#e6e1d3}
.aQr .tq em{font-style:normal;font-size:9px;letter-spacing:-1px;color:#9a917c}
.aQr .tq.on{color:#2a2117;background:#f3dfa6}.aQr .tq.on em{color:#b07800}
.aQr .tq.full{background:linear-gradient(#ffe28a,#e0a020);color:#2b1a02}.aQr .tq.full em{color:#7a4a00}
.aTier{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:2px 0 4px}
.aTier button{display:grid;justify-items:center;gap:1px;min-height:50px;padding:5px 2px;border:0;border-radius:8px;cursor:pointer;color:var(--crTx);background:#fff;box-shadow:inset 0 0 0 1.5px #e0cfa6}
.aTier button b{font:900 14px var(--zk)}
.aTier button small{font:700 9px var(--zk);letter-spacing:-.04em;color:#c0392b}
.aTier button em{font-style:normal;font-size:10px;line-height:1;color:#e8a000;min-height:10px}
.aTier button[aria-pressed="true"]{background:linear-gradient(#fff3c4,#ffd56a);box-shadow:inset 0 0 0 3px #e0a020,0 2px 8px rgba(224,160,32,.4)}
.aTier button.t2[aria-pressed="true"]{background:linear-gradient(#ffe2dc,#ffb3a1);box-shadow:inset 0 0 0 3px #d0402a}
.aGo .inf span small{margin-left:3px;padding:0 4px;border-radius:3px;font:900 9px var(--zk);color:#fff;background:#d0402a}
.aGo .inf .sv{font-style:normal;color:#c0392b;letter-spacing:-.04em}
/* (v64) イベントの難易度の一覧(ブルアカ・パズドラのように、イベントを押すと縦に並ぶ) */
.aEvH{position:relative;display:flex;align-items:center;gap:10px;margin:0 0 8px;padding:6px 10px 6px 4px;border-radius:10px;background:#0e1842;box-shadow:0 0 0 1.5px var(--aG),0 2px 8px rgba(0,0,0,.5)}
.aEvH .bk{flex:none;width:40px;height:44px;border:0;border-radius:8px;cursor:pointer;font:400 30px/1 var(--zk);color:var(--aG1);background:none}
.aEvH .im{flex:none;width:72px;height:44px;border-radius:7px;display:grid;place-items:center;background:#16255a center/cover no-repeat}
.aEvH .tx{display:grid;gap:2px;min-width:0}
.aEvH .tx b{font:900 17px var(--zk);color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.aEvH .tx small{font:700 11px var(--zk);color:#c8cde0}
.aTl{gap:8px}
.aTr{min-height:70px!important}
.aTr .no{width:54px!important;height:48px!important;font:900 16px var(--zk)!important;color:#fff!important;border-radius:8px}
.aTr.t0 .no{background:linear-gradient(180deg,#3fae6a,#1d6b3e)!important}
.aTr.t1 .no{background:linear-gradient(180deg,#e8a531,#a8650e)!important}
.aTr.t2 .no{background:linear-gradient(180deg,#e2503a,#8e1d12)!important}
.aTr .md b{display:flex;align-items:baseline;gap:8px}
.aTr .md b .sv{font-style:normal;font-size:13px;letter-spacing:-.04em;color:#c0392b}
.aTr .md b small{font:700 11px var(--zk);color:var(--crSub)}
.aTr .md span{gap:10px!important}
.aTr .dp{display:inline-flex;align-items:center;gap:3px}
.aTr .dp i{font:900 13px var(--zk);font-style:normal;color:var(--crTx)}
.aTr .dp i.mb{font:700 10px var(--zk);color:var(--crSub)}
.aTr .dp .aMi{width:26px!important;height:26px!important}
.aTr .st3 i{font-size:17px!important}
.aTr .rt .ok{font:900 9px var(--zk);color:#fff;background:#2a7a4a;padding:1px 5px;border-radius:3px}
.aTr.cur{box-shadow:inset 0 0 0 3px #e0a020,0 0 14px rgba(255,190,60,.5)!important}
.aGo .tt .tb{padding:2px 9px;border-radius:5px;color:#fff!important}
.aGo .tt .tb.t0{background:#2a8a52}.aGo .tt .tb.t1{background:#c98318}.aGo .tt .tb.t2{background:#c23a26}
.oload{position:absolute;inset:0;z-index:80;display:grid;place-content:center;justify-items:center;gap:8px;background:radial-gradient(70% 50% at 50% 45%,#16245e,#070c24);color:#fff;font:900 16px var(--zk)}
.oload small{font:700 11px var(--zk);color:#c8cde0}
.oload .sp{width:40px;height:40px;border-radius:50%;border:3px solid rgba(255,214,120,.25);border-top-color:#ffd678;animation:oSpin .8s linear infinite}
@keyframes oSpin{to{transform:rotate(360deg)}}
.aSheet .x{color:var(--crTx)!important;font-weight:700}
.aBan.aGl{background:#0e1842!important;box-shadow:0 0 0 1.5px var(--aG),0 2px 8px rgba(0,0,0,.5)!important}.aBan .tx{color:#fff}
`;
document.head.appendChild(h('style', null, CSS + `
/* (11/9) スタミナ */
.aSta{display:flex;align-items:center;gap:3px;height:26px;padding:0 7px;border:0;border-radius:13px;cursor:pointer;color:#fff;position:relative;flex:none}
.aSta i{font-style:normal;font-size:12px}.aSta b{font:900 12px var(--zk);font-variant-numeric:tabular-nums}.aSta small{font:700 9px var(--zk);color:#c3cbe6;font-variant-numeric:tabular-nums}
.aSta .dot{position:absolute;right:-2px;top:-2px;width:9px;height:9px;border-radius:50%;background:#ff4d6a;box-shadow:0 0 0 1.5px #0e1842}
.aStaM{text-align:center}.aStaM .big{font:900 28px var(--zk);color:#2a2117}.aStaM .big b{font-size:36px}
.aStaH{margin:10px 0 4px;font:900 13px var(--zk);color:#6b5b45}
.aStaP{display:grid;gap:4px;max-height:34vh;overflow-y:auto}.aStaR{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:#fff;box-shadow:inset 0 0 0 1px rgba(160,120,40,.35)}
.aStaR span{flex:1;min-width:0;font:800 14px var(--zk);color:#2a2117;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.aStaR .aBtn{min-height:32px;padding:4px 12px;font-size:12px;flex:none}
/* (11/9) フレンド */
.aFrB{position:absolute;right:calc(max(12px,env(safe-area-inset-right,0px)) + 48px);top:calc(env(safe-area-inset-top,0px) + 54px);z-index:5;height:40px;display:flex;align-items:center;gap:5px;padding:0 12px;border:0;border-radius:20px;cursor:pointer;color:var(--aG1);font:800 12px var(--zk);background:rgba(14,24,66,.92);box-shadow:inset 0 0 0 1px var(--aLine)}
.aFrB svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9}.aFrB span{color:#fff}
.aFrB i{position:absolute;right:-3px;top:-3px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;font:900 10px/16px var(--zk);font-style:normal;color:#fff;background:#ff4d6a}
.aStaR .aBtn+.aBtn{margin-left:2px}
/* (11/9) プロフィール */
.aGear{position:absolute;right:max(12px,env(safe-area-inset-right,0px));top:calc(env(safe-area-inset-top,0px) + 54px);z-index:5;width:40px;height:40px;border:0;border-radius:50%;display:grid;place-items:center;cursor:pointer;color:var(--aG1);background:rgba(14,24,66,.92);box-shadow:inset 0 0 0 1px var(--aLine)}
.aGear svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9}
.aProf{display:grid;gap:8px}
.aProf .pc{position:relative;display:flex;align-items:center;gap:12px;min-height:92px;padding:12px 14px;border-radius:12px;background-size:cover;background-position:center;box-shadow:inset 0 0 0 1.5px var(--aG),0 4px 12px rgba(0,0,0,.45);color:#fff}
.aProf .av{flex:0 0 64px;height:64px;border-radius:10px;background:#16255a center/cover;box-shadow:0 0 0 2px var(--aG)}
.aProf .who{display:grid;gap:2px;min-width:0}.aProf .who b{font:900 20px var(--zk);text-shadow:0 1px 3px #000}.aProf .who small{font:800 11px var(--zk);letter-spacing:.12em;color:#c3cbe6}.aProf .who small i{font-style:normal;font-size:15px;color:var(--aG1)}
.aProf .who em{font:700 12px/1.4 var(--zk);font-style:normal;color:#e6ebff;text-shadow:0 1px 2px #000}
.aProf .ed{position:absolute;right:10px;bottom:8px;border:0;border-radius:6px;padding:4px 10px;font:800 11px var(--zk);color:#2b1a02;background:linear-gradient(#fff2c2,#e8b84a);cursor:pointer}
.aProf h4{margin:6px 2px 0;font:900 13px var(--zk);color:var(--aG1);letter-spacing:.1em}
.aProf .pfs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.aProf .pf{position:relative;height:150px;border-radius:10px;overflow:hidden;background:radial-gradient(120% 90% at 50% 20%,#2a3a80,#0b1236);box-shadow:inset 0 0 0 1.5px var(--aLine);cursor:pointer}
.aProf .pf img{position:absolute;left:50%;top:-2%;height:230%;transform:translateX(-50%);object-fit:contain;max-width:none}
.aProf .pf .pn{position:absolute;left:0;right:0;bottom:0;padding:16px 4px 3px;font:900 12px var(--zk);color:#fff;text-align:center;background:linear-gradient(transparent,rgba(5,8,24,.95))}
.aProf .pf .pl{position:absolute;right:4px;top:4px;padding:1px 5px;border-radius:4px;font:800 10px var(--zk);color:#fff;background:rgba(5,8,24,.7)}
.aProf .pst{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.aProf .pst div{display:grid;gap:1px;padding:8px 10px;border-radius:9px;background:rgba(14,24,66,.92);box-shadow:inset 0 0 0 1px var(--aLine)}
.aProf .pst small{font:700 11px var(--zk);color:#c3cbe6}.aProf .pst b{font:900 19px var(--zk);color:#fff;font-variant-numeric:tabular-nums}.aProf .pst b small{font-size:11px;color:#97a2c6}
.aPe .sh{max-height:92vh;display:flex;flex-direction:column}
.aPe .pTop{display:flex;gap:10px;align-items:center;margin:4px 0 8px}
.aPe .pAv{flex:0 0 auto;border:0;background:none;cursor:pointer;display:grid;justify-items:center;gap:2px;color:#2a2117;font:800 11px var(--zk)}
.aPe .pAv span{width:58px;height:58px;border-radius:10px;background:#16255a center/cover;box-shadow:0 0 0 2px #c9a14a}
.aPe .pMsg{flex:1;display:grid;gap:2px;font:800 11px var(--zk);color:#6b5b45}.aPe .pMsg input{width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1.5px solid #c9a14a;font:700 15px var(--zk);background:#fff;color:#1a1530}
.aPe .pTabs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:8px}.aPe .pTabs button{border:0;border-radius:8px;padding:9px 0;font:900 13px var(--zk);color:#fff;background:#24346f;cursor:pointer}.aPe .pTabs button.on{color:#2b1a02;background:linear-gradient(#fff2c2,#e8b84a)}
.aPe .pSlots{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.aPe .ps{position:relative;height:118px;border:0;border-radius:10px;overflow:hidden;cursor:pointer;background:radial-gradient(120% 90% at 50% 20%,#2a3a80,#0b1236);box-shadow:inset 0 0 0 2px #c9a14a}
.aPe .ps img{position:absolute;left:50%;top:-2%;height:230%;transform:translateX(-50%);max-width:none}
.aPe .ps b{position:absolute;left:0;right:0;bottom:0;padding:14px 2px 3px;font:900 12px var(--zk);color:#fff;background:linear-gradient(transparent,rgba(5,8,24,.95))}
.aPe .ps i{position:absolute;left:4px;top:4px;width:20px;height:20px;border-radius:5px;font:900 13px/20px var(--zk);font-style:normal;color:#2b1a02;background:#e8c878}
.aPe .ps u{position:absolute;right:4px;top:4px;padding:2px 6px;border-radius:5px;font:800 10px var(--zk);text-decoration:none;color:#fff;background:rgba(5,8,24,.75)}
.aPe .ps.em{display:grid;place-content:center;justify-items:center;color:#c3cbe6;background:rgba(14,24,66,.5);box-shadow:inset 0 0 0 2px dashed}.aPe .ps.em span{font:900 26px var(--zk);color:#e8c878}.aPe .ps.em small{font:800 11px var(--zk)}
.aPe .pHint{margin:6px 2px;font:700 12px/1.5 var(--zk);color:#6b5b45}
.aPe .pGrid{flex:1;min-height:0;overflow-y:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:2px}
.aPe .pGrid.card{grid-template-columns:repeat(2,1fr)}
.aPe .pc{position:relative;border:0;border-radius:10px;padding:0 0 4px;cursor:pointer;display:grid;justify-items:center;gap:1px;background:#fff;box-shadow:inset 0 0 0 1.5px rgba(160,120,40,.4);overflow:hidden}
.aPe .pc img{width:100%;aspect-ratio:1;object-fit:cover;max-width:100%}
.aPe .pc b{font:900 11px var(--zk);color:#2a2117;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}.aPe .pc small{font:800 9px var(--zk);color:#b58a1e;min-height:11px}
.aPe .pc.on{box-shadow:0 0 0 3px #e8b84a,inset 0 0 0 1.5px #e8b84a;background:#fff6d8}
.aPe .pc i{position:absolute;left:4px;top:4px;width:20px;height:20px;border-radius:5px;font:900 13px/20px var(--zk);font-style:normal;color:#2b1a02;background:#e8c878;box-shadow:0 1px 3px rgba(0,0,0,.4)}
.aPe .pcd{position:relative;height:70px;border:0;border-radius:8px;cursor:pointer;background:#16255a center/cover}.aPe .pcd span{position:absolute;left:0;right:0;bottom:0;padding:3px;font:900 12px var(--zk);color:#fff;background:rgba(5,8,24,.7)}.aPe .pcd.on{box-shadow:0 0 0 3px #e8b84a}
.aPe .pBtm{padding:10px 0 0}
.aCards{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.aCards button{position:relative;height:44px;border:0;border-radius:6px;background:#16255a center/cover;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.3)}
.aCards button span{position:absolute;left:0;right:0;bottom:0;font:800 10px var(--zk);color:#fff;background:rgba(5,8,24,.7)}.aCards button.on{box-shadow:0 0 0 3px #e8c878}
`));

const IC = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
  quest: '<path d="M5 19 19 5"/><path d="M14 5h5v5"/><path d="M5 14l5 5"/><path d="M8 16l-3 3"/>',
  chara: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.9-4 3.8-6 7.5-6s6.6 2 7.5 6"/>',
  gacha: '<path d="M12 2.5 14.6 9 21 9.6 16.2 14 17.6 20.5 12 17.2 6.4 20.5 7.8 14 3 9.6 9.4 9z"/>',
  other: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="11" r="2.3"/><path d="M5.8 16.2c.6-1.7 1.8-2.5 3.2-2.5s2.6.8 3.2 2.5M14 10h4M14 13.5h3"/>',
  news: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  party: '<circle cx="8" cy="8" r="3"/><circle cx="16.5" cy="8" r="3"/><path d="M2.5 20c0-4 2.6-6 5.5-6s5.5 2 5.5 6M14 14.3c.8-.3 1.6-.3 2.5-.3 3 0 5.5 2 5.5 6"/>',
  power: '<path d="M12 3v14M6 9l6-6 6 6"/><path d="M5 21h14"/>',
  ev: '<path d="M12 2.5l2.6 6.5 6.4.6-4.8 4.4 1.4 6.5L12 17.2 6.4 20.5 7.8 14 3 9.6 9.4 9z"/>',
  pt: '<circle cx="8" cy="8" r="6.6" fill="#ffd36a" stroke="#8a5a12" stroke-width="1.2"/><circle cx="8" cy="8" r="4.9" fill="none" stroke="#c98a1e" stroke-width=".8"/><path d="M6.4 11.3V4.8h2.1a1.8 1.8 0 0 1 0 3.6H6.4" fill="none" stroke="#6b3f06" stroke-width="1.5" stroke-linejoin="round"/>',
  gem: '<path d="M8 1.5 14.5 6 8 15 1.5 6z" fill="#8feaff" stroke="#1d5f8a" stroke-width="1"/><path d="M8 1.5 10.5 6h-5z" fill="#fff" opacity=".75"/><path d="M1.5 6h13" stroke="#1d5f8a" stroke-width=".8"/>',
  data: '<path d="M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  name: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  mission: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 3.5h6v3H9zM8.5 11l2 2 4-4M8.5 16.5h7"/>',
  gift: '<rect x="3.5" y="9" width="17" height="11.5" rx="1"/><path d="M3.5 9h17M12 9v11.5M12 9c-2.5-5-7-3-3.5 0M12 9c2.5-5 7-3 3.5 0"/>',
};
const svg = (k, vb) => `<svg viewBox="${vb || '0 0 24 24'}" aria-hidden="true">${IC[k]}</svg>`;

/* (11/9 試し) 「ソシャゲ寄り」の見た目(山本さん「色や雰囲気そのもの」「動きがない」)。?ui=b か ca_ui=b のときだけ。
   モンスト・パズドラの画面を1コマずつ見て分かったこと: 地は紺のままでも、押す所は水色・橙・赤のあざやかな立体ボタン、
   下のバーは色つきの絵のアイコン、行や板は金属・木のような厚み、どの行にも絵がある、ずっと何かが動いている */
const BRT = (() => { try { const q = new URLSearchParams(location.search).get('ui'); if (q) localStorage.setItem('ca_ui', q); return (q || localStorage.getItem('ca_ui')) !== 'a'; } catch (e) { return true; } })();
const NI = {
  home: '<defs><linearGradient id="niR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a4a"/><stop offset="1" stop-color="#e2401e"/></linearGradient></defs><path d="M6 15v12h20V15" fill="#fff4d6" stroke="#2a1606" stroke-width="2.2" stroke-linejoin="round"/><path d="M3 16 16 5l13 11" fill="url(#niR)" stroke="#2a1606" stroke-width="2.4" stroke-linejoin="round"/><rect x="13" y="19" width="6" height="8" rx="1" fill="#8a4a1a" stroke="#2a1606" stroke-width="2"/>',
  chara: '<defs><linearGradient id="niB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd8ff"/><stop offset="1" stop-color="#2a6ae0"/></linearGradient></defs><path d="M5 28c0-6 5-10 11-10s11 4 11 10z" fill="url(#niB)" stroke="#0a1838" stroke-width="2.2" stroke-linejoin="round"/><circle cx="16" cy="11" r="6.5" fill="#ffe2c4" stroke="#0a1838" stroke-width="2.2"/><path d="M9.6 10c1-5 11-6 12.8 0-3-1.5-7-1.8-12.8 0z" fill="#3a2a5a" stroke="#0a1838" stroke-width="1.6" stroke-linejoin="round"/>',
  quest: '<path d="M6 25 24 7l1.5 4L10 27z" fill="#e8f4ff" stroke="#08203a" stroke-width="2" stroke-linejoin="round"/><path d="M26 25 8 7 6.5 11 22 27z" fill="#e8f4ff" stroke="#08203a" stroke-width="2" stroke-linejoin="round"/><path d="M4 23l5 5M28 23l-5 5" stroke="#ffc83a" stroke-width="4" stroke-linecap="round"/><path d="M4 23l5 5M28 23l-5 5" stroke="#08203a" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".5"/>',
  gacha: '<defs><linearGradient id="niG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb0f0"/><stop offset=".5" stop-color="#d040e0"/><stop offset="1" stop-color="#7a18b8"/></linearGradient></defs><path d="M16 3 26 13 16 29 6 13z" fill="url(#niG)" stroke="#2a0838" stroke-width="2.2" stroke-linejoin="round"/><path d="M6 13h20M16 3l-4 10 4 16 4-16z" fill="none" stroke="#fff" stroke-width="1.2" opacity=".7"/>',
  other: '<defs><linearGradient id="niP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ff0a8"/><stop offset="1" stop-color="#1ea85a"/></linearGradient></defs><rect x="3.5" y="7" width="25" height="18" rx="3" fill="url(#niP)" stroke="#06301a" stroke-width="2.2"/><circle cx="11" cy="15" r="3.6" fill="#fff" stroke="#06301a" stroke-width="1.6"/><path d="M6.5 22c.8-3 2.4-4 4.5-4s3.7 1 4.5 4" fill="#fff" stroke="#06301a" stroke-width="1.6"/><path d="M18 13h7M18 17.5h5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
};
const NIMG = { home: 'nav_home', chara: 'nav_chara', quest: 'nav_quest', gacha: 'nav_gacha', other: 'nav_profile' };   /* (11/9) Codex T-026 の絵 */
const niSvg = k => NIMG[k] ? `<img class="ni" alt="" src="${UI}nav/${NIMG[k]}.webp">` : `<svg class="ni" viewBox="0 0 32 32" aria-hidden="true">${NI[k]}</svg>`;
if (BRT) document.head.appendChild(h('style', null, `
#lay.brt{--rd:"RocknRoll One","M PLUS Rounded 1c","M PLUS 1p","Zen Kaku Gothic New",system-ui,sans-serif;--cy1:#8ff4ff;--cy2:#1fb4ff;--cy3:#0a5ad0;--or1:#ffd08a;--or2:#ff8a1a;--or3:#c84a06}
#lay.brt #onav{height:calc(env(safe-area-inset-bottom,0px) + 62px);background:linear-gradient(180deg,#1c2e78,#0a1440 60%,#060c2a);box-shadow:0 -2px 0 #4ab8ff,0 -3px 0 #0a1a50,0 -8px 18px rgba(0,0,0,.6)}
#lay.brt #onav button{color:#fff;font:900 10.5px var(--rd);-webkit-text-stroke:2.5px #071030;paint-order:stroke fill;padding-bottom:6px;margin:5px 2px 0;border-radius:9px 9px 0 0}
#lay.brt #onav .ni{width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 2px 0 rgba(0,0,0,.5))}
#lay.brt #onav button[aria-current="page"]:not(.mid){background:linear-gradient(180deg,var(--cy1),var(--cy2) 45%,var(--cy3));box-shadow:inset 0 2px 0 rgba(255,255,255,.7),inset 0 0 0 2px #072050}
#lay.brt #onav button[aria-current="page"]::before{display:none}
#lay.brt #onav button:not(.mid):not([aria-current="page"]) .ni{filter:drop-shadow(0 2px 0 rgba(0,0,0,.5)) saturate(.85)}
#lay.brt #onav .mid{margin-top:0}
#lay.brt #onav .mid .md{width:58px;height:58px;margin-top:-22px;color:#fff;background:radial-gradient(circle at 50% 28%,#e8ffff,var(--cy2) 45%,var(--cy3) 80%);box-shadow:0 0 0 3px #e8f4ff,0 0 0 5.5px #0a3070,0 0 0 7px #8fd8ff,0 5px 12px rgba(0,0,0,.6),0 0 22px rgba(80,200,255,.6);animation:brPulse 2.2s ease-in-out infinite}
#lay.brt #onav .mid .md .ni{width:40px;height:40px}
@keyframes brPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
#lay.brt .aIb{width:58px}
#lay.brt .aIb .ic{width:52px;height:52px;background:radial-gradient(circle at 50% 35%,#3a5ab8,#14246a 70%);box-shadow:0 0 0 2.5px #e8f4ff,0 0 0 4.5px #0a2060,0 4px 8px rgba(0,0,0,.5)}
#lay.brt .aIb .ic img{width:46px;height:46px;object-fit:contain;filter:drop-shadow(0 2px 0 rgba(0,0,0,.45))}
#lay.brt .aIb span{font:900 11px var(--rd);-webkit-text-stroke:3px #071030;paint-order:stroke fill}
#lay.brt .aIb .bd{font:900 11px/18px var(--rd);min-width:18px;height:18px;top:-4px;right:0;background:linear-gradient(#ff7a8a,#e8183a);box-shadow:0 0 0 2px #fff,0 2px 0 #4a0410}
#lay.brt .ssqt{background:linear-gradient(#22357e,#0e1a50);box-shadow:inset 0 0 0 2px #6ab0ff,inset 0 3px 0 rgba(255,255,255,.18),0 3px 0 #050c2a}
#lay.brt .ssqt button{font:900 15px var(--rd);color:#cfe0ff;-webkit-text-stroke:3px #071030;paint-order:stroke fill}
#lay.brt .ssqt button[aria-selected="true"]{color:#fff;background:linear-gradient(180deg,var(--or1),var(--or2) 50%,var(--or3));box-shadow:inset 0 2px 0 rgba(255,255,255,.75),inset 0 -3px 0 rgba(120,40,0,.55),0 2px 0 #3a1400;-webkit-text-stroke:3.5px #5a2000}
#lay.brt .qDf button{font:900 17px var(--rd);height:44px;border-radius:12px;color:#9fb4e8;background:linear-gradient(#2a3c88,#121e58);box-shadow:inset 0 0 0 2px #5a78c8,inset 0 2px 0 rgba(255,255,255,.2),0 4px 0 #050c2a;-webkit-text-stroke:3px #071030;paint-order:stroke fill}
#lay.brt .qDf button[aria-pressed="true"]{color:#fff;background:linear-gradient(180deg,var(--cy1),var(--cy2) 48%,var(--cy3));box-shadow:inset 0 0 0 2px #e8faff,inset 0 3px 0 rgba(255,255,255,.6),0 4px 0 #031a50,0 0 16px rgba(60,190,255,.6);-webkit-text-stroke:3.5px #052a6a}
#lay.brt .qDf button.h[aria-pressed="true"]{background:linear-gradient(180deg,#ffb0b8,#ff3a50 48%,#a8102a);box-shadow:inset 0 0 0 2px #ffe8ea,inset 0 3px 0 rgba(255,255,255,.6),0 4px 0 #4a0410,0 0 16px rgba(255,70,90,.6);-webkit-text-stroke:3.5px #5a0414}
#lay.brt .qPl{min-height:70px;border-radius:12px;padding:8px 12px 8px 8px;background:linear-gradient(180deg,#e8f6ff,#5a9ae8 30%,#2a5ab8 70%,#9ac8ff);box-shadow:0 4px 0 #061440,0 6px 12px rgba(0,0,0,.5)}
#lay.brt .qPl::before{inset:2.5px;border-radius:10px;background:linear-gradient(105deg,rgba(255,255,255,.14) 0 30%,transparent 30.5%),linear-gradient(180deg,#3a74d8,#1d48a8 55%,#14347e);box-shadow:inset 0 2px 0 rgba(255,255,255,.35),inset 0 -2px 0 rgba(0,0,0,.25)}
#lay.brt .qPl.boss{background:linear-gradient(180deg,#fff0e0,#e85a4a 30%,#a8202a 70%,#ffb0a0)}
#lay.brt .qPl.boss::before{background:linear-gradient(105deg,rgba(255,255,255,.14) 0 30%,transparent 30.5%),linear-gradient(180deg,#d8443a,#a01e2a 55%,#6a0e1e)}
#lay.brt .qPl.hd::before{background:linear-gradient(105deg,rgba(255,255,255,.12) 0 30%,transparent 30.5%),linear-gradient(180deg,#a83a8a,#6a1a5a 55%,#3a0a34)}
#lay.brt .qPl.hd{background:linear-gradient(180deg,#ffe0f4,#c84aa0 30%,#7a1a6a 70%,#ffb0e0)}
#lay.brt .qPl .cn{width:50px;height:50px;background:radial-gradient(circle at 40% 30%,#ffffff,#bfe8ff 30%,#2a8ae0 75%);box-shadow:0 0 0 3px #f4fbff,0 0 0 5px #0a2a6a,inset 0 -3px 4px rgba(0,30,90,.4)}
#lay.brt .qPl .cn b{font:900 16px var(--rd);color:#fff;-webkit-text-stroke:4px #08245a}
#lay.brt .qPl .md>b{font:900 17px var(--rd);-webkit-text-stroke:4px #061440}
#lay.brt .qPl .md>span{color:#e0ecff;font-weight:800}
#lay.brt .qPl .fr2{font:900 11.5px var(--rd);color:#fff;-webkit-text-stroke:2.5px #6a2400;paint-order:stroke fill;background:linear-gradient(180deg,var(--or1),var(--or2) 55%,var(--or3));box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 2px 0 #3a1400;padding:2px 9px}
#lay.brt .qPl .st3 i{font-size:19px;color:#0e2a6a;-webkit-text-stroke:2.5px #e8f4ff}
#lay.brt .qPl .st3 i.on{color:#ffd23a;-webkit-text-stroke:2.5px #6a3a00}
#lay.brt .qPl .nx{font:900 12px var(--rd);top:-10px;padding:3px 12px;border-radius:6px;background:linear-gradient(#ff8a9a,#f0203e 55%,#b00a22);box-shadow:inset 0 1px 0 rgba(255,255,255,.6),0 2px 0 #4a0410;animation:brBob 1.2s ease-in-out infinite}
@keyframes brBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
#lay.brt .qPl.cur::after{content:"";position:absolute;inset:2.5px;border-radius:10px;pointer-events:none;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.45) 45%,transparent 60%) no-repeat;background-size:220% 100%;animation:brSweep 2.6s ease-in-out infinite;will-change:transform}
@keyframes brSweep{0%,55%{background-position:160% 0}100%{background-position:-60% 0}}
#lay.brt .qPl.art{min-height:78px}
#lay.brt .qPl.art::before{background:linear-gradient(90deg,#1a44a4 0,#1a44a4 26%,rgba(26,68,164,.78) 44%,rgba(26,68,164,.15) 70%,rgba(26,68,164,0)),var(--art) right center/auto 100% no-repeat,#1a44a4}
#lay.brt .qPl.art.boss::before{background:linear-gradient(90deg,#9a1e2a 0,#9a1e2a 26%,rgba(154,30,42,.8) 44%,rgba(154,30,42,.15) 70%,rgba(154,30,42,0)),var(--art) right center/auto 100% no-repeat,#9a1e2a}
#lay.brt .qPl.art.hd::before{background:linear-gradient(90deg,#6a1a5a 0,#6a1a5a 26%,rgba(106,26,90,.8) 44%,rgba(106,26,90,.2) 70%,rgba(106,26,90,.05)),var(--art) right center/auto 100% no-repeat,#6a1a5a}
#lay.brt .qPl.art .rt{text-shadow:0 1px 3px #000}
#lay.brt .qPl.lock{filter:none;background:linear-gradient(180deg,#8a94b0,#3a4460 50%,#6a7490)}
#lay.brt .qPl.lock::before{background:linear-gradient(180deg,#2a3250,#1a2038)}
#lay.brt .qPl.lock .cn{background:radial-gradient(circle at 40% 30%,#8a94b0,#3a4460 75%);box-shadow:0 0 0 3px #aab4cc,0 0 0 5px #141a30}
#lay.brt .qPl.lock .md>b,#lay.brt .qPl.lock .md>span{color:#9aa4c0}
#lay.brt .qPl .ck{left:auto;right:auto;top:-8px;left:6px;width:auto;height:auto;padding:1px 8px;border-radius:5px;font:900 10.5px var(--rd);background:linear-gradient(#9af0a0,#22b04a 55%,#0a7a2a);box-shadow:inset 0 1px 0 rgba(255,255,255,.6),0 2px 0 #043a14;-webkit-text-stroke:2px #04401a;paint-order:stroke fill}
#lay.brt .qMore{background:linear-gradient(180deg,#2a3a78,#141e50);box-shadow:inset 0 0 0 2px #6a90e0,inset 0 2px 0 rgba(255,255,255,.2),0 4px 0 #050c2a}
#lay.brt .qMore .t{font-family:var(--rd)}
#lay.brt #oroot>.aBg.qbg{animation:brDrift 24s ease-in-out infinite alternate}
@keyframes brDrift{from{transform:scale(1.06) translateX(-10px)}to{transform:scale(1.06) translateX(10px)}}
#lay.brt .qChH .bs{animation:brFloat 3.2s ease-in-out infinite}
@keyframes brFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}

/* (11/9) T-027 金属と金の飾り(9スライス)。四すみはそのまま、辺は伸ばす */
#lay.brt .ssqt{padding:6px;background:none;box-shadow:0 4px 8px rgba(0,0,0,.45);border:14px solid transparent;border-image:url(${UI}frame/tabbar.webp) 44 fill / 14px stretch;margin:0 0 8px;padding:0}
#lay.brt .ssqt button{height:38px;border-radius:0;background:none;box-shadow:none;border:0}
#lay.brt .ssqt button{border:12px solid transparent;border-image:url(${UI}frame/btn_steel.webp) 48 fill / 12px stretch;margin:-10px 0;height:44px}
#lay.brt .ssqt button[aria-selected="true"]{background:none;box-shadow:none;border-image:url(${UI}frame/btn_orange.webp) 48 fill / 12px stretch}
#lay.brt .qDf button,#lay.brt .qDf button[aria-pressed="true"],#lay.brt .qDf button.h[aria-pressed="true"]{background:none;box-shadow:0 4px 8px rgba(0,0,0,.45);border-radius:0;border:14px solid transparent;border-image:url(${UI}frame/btn_steel.webp) 48 fill / 14px stretch;height:50px;padding:0}
#lay.brt .qDf button[aria-pressed="true"]{border-image-source:url(${UI}frame/btn_blue.webp);box-shadow:0 4px 8px rgba(0,0,0,.45),0 0 16px rgba(60,140,255,.45)}
#lay.brt .qDf button.h[aria-pressed="true"]{border-image-source:url(${UI}frame/btn_red.webp);box-shadow:0 4px 8px rgba(0,0,0,.45),0 0 16px rgba(255,60,60,.45)}
#lay.brt .qDf button:disabled{opacity:.85}
#lay.brt .qPl{background:none;box-shadow:0 5px 10px rgba(0,0,0,.5);border-radius:6px}
#lay.brt .qPl::before{inset:4px;border-radius:4px}
#lay.brt .qPl .frm{position:absolute;inset:0;z-index:3;pointer-events:none;border:18px solid transparent;border-image:url(${UI}frame/plate_blue.webp) 56 / 18px stretch}
#lay.brt .qPl.boss .frm{border-image-source:url(${UI}frame/plate_red.webp)}
#lay.brt .qPl.hd .frm{border-image-source:url(${UI}frame/plate_purple.webp)}
#lay.brt .qPl.lock .frm{border-image-source:url(${UI}frame/plate_iron.webp)}
#lay.brt .qPl.lock,#lay.brt .qPl.hd,#lay.brt .qPl.boss{background:none}
#lay.brt .qPl .cn,#lay.brt .qPl.lock .cn{width:54px;height:54px;background:url(${UI}frame/medal.webp) center/contain no-repeat;box-shadow:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.55))}
#lay.brt .qPl.boss .cn,#lay.brt .qPl.hd .cn{background-image:url(${UI}frame/medal_red.webp)}
#lay.brt .qPl.lock .cn{filter:grayscale(.85) brightness(.75)}
#lay.brt .qPl .ck,#lay.brt .qPl .nx,#lay.brt .qPl .fr2{background:none;box-shadow:none;border-radius:0;border:0 solid transparent;border-width:0 9px;border-image:url(${UI}frame/ribbon_green.webp) 0 28 fill / 0 9px stretch;padding:2px 2px 3px;z-index:4;filter:drop-shadow(0 2px 2px rgba(0,0,0,.5))}
#lay.brt .qPl .nx{border-image-source:url(${UI}frame/ribbon_red.webp)}
#lay.brt .qPl .fr2{border-image-source:url(${UI}frame/ribbon_orange.webp)}
#lay.brt .qPl .ck{top:-9px;left:10px}
#lay.brt .qPl .nx{top:-11px;right:6px}
#lay.brt .qPl .md,#lay.brt .qPl .rt,#lay.brt .qPl .cn{z-index:4}
#lay.brt .qMore{background:linear-gradient(180deg,#1a2240,#0e1430);box-shadow:0 4px 8px rgba(0,0,0,.45);border:16px solid transparent;border-image:url(${UI}frame/plate_iron.webp) 56 fill / 16px stretch;padding:0 4px;min-height:40px}
#lay.brt .qMore{background-clip:padding-box}
#lay.brt .qMore .lb em{white-space:nowrap;font-size:10px}
#lay.brt .qChH .fr{background:none;padding:0;box-shadow:0 5px 12px rgba(0,0,0,.55)}
#lay.brt .qChH .fr .art,#lay.brt .qChH .fr .sh{inset:6px;border-radius:2px}
#lay.brt .qChH .fr::after{content:"";position:absolute;inset:0;z-index:3;pointer-events:none;border:20px solid transparent;border-image:url(${UI}frame/chapter_frame.webp) 64 / 20px stretch}
#lay.brt #onav{background:none;box-shadow:0 -6px 16px rgba(0,0,0,.6);border:solid transparent;border-width:13px 20px 0;border-image:url(${UI}frame/navbar.webp) 40 60 0 60 fill / 13px 20px 0 20px stretch}

/* (11/9) ほかの画面もそろえる(T-027 の部品を共通の部品に) */
#lay.brt{--mi:var(--rd)}
#lay.brt .aTitle{margin:2px 2px 8px}
#lay.brt .aTitle h2{font:400 22px var(--rd);letter-spacing:.04em;-webkit-text-stroke:4px #071030;paint-order:stroke fill;text-shadow:0 3px 0 rgba(0,0,0,.4)}
#lay.brt .aTitle small{display:none}
#lay.brt .aTabs{padding:0;background:none;box-shadow:0 4px 8px rgba(0,0,0,.45);border:14px solid transparent;border-image:url(${UI}frame/tabbar.webp) 44 fill / 14px stretch;border-radius:0}
#lay.brt .aTabs button{margin:-10px 0;height:44px;border-radius:0;background:none;box-shadow:none;border:12px solid transparent;border-image:url(${UI}frame/btn_steel.webp) 48 fill / 12px stretch;font:400 14px var(--rd);color:#cfe0ff;-webkit-text-stroke:3px #071030;paint-order:stroke fill;padding:0}
#lay.brt .aTabs button[aria-selected="true"]{color:#fff;background:none;box-shadow:none;border-image-source:url(${UI}frame/btn_orange.webp);-webkit-text-stroke:3.5px #5a2000}
#lay.brt .aBtn{border-radius:0;background:none;box-shadow:0 4px 8px rgba(0,0,0,.45);border:14px solid transparent;border-image:url(${UI}frame/btn_orange.webp) 48 fill / 14px stretch;padding:0 6px;min-height:52px;color:#fff;font:400 16px var(--rd);letter-spacing:.04em;-webkit-text-stroke:3.5px #5a2000;paint-order:stroke fill;overflow:visible}
#lay.brt .aBtn small{font:700 10.5px var(--zk);-webkit-text-stroke:2.5px #5a2000}
#lay.brt .aBtn::after{display:none}
#lay.brt .aBtn.sub{border-image-source:url(${UI}frame/btn_steel.webp);-webkit-text-stroke:3px #071030}
#lay.brt .aBtn.sub small{-webkit-text-stroke:2.5px #071030}
#lay.brt .aBtn.blue{border-image-source:url(${UI}frame/btn_blue.webp);-webkit-text-stroke:3.5px #062060}
#lay.brt .aBtn.red{border-image-source:url(${UI}frame/btn_red.webp);-webkit-text-stroke:3.5px #4a0410}
#lay.brt .aBtn.sm{min-height:40px;border-width:11px;border-image-width:11px;font-size:13px}
#lay.brt .aPanel{border-radius:0;background:none;box-shadow:0 5px 12px rgba(0,0,0,.5);border:18px solid transparent;border-image:url(${UI}frame/panel.webp) 72 fill / 18px stretch;padding:0}
#lay.brt .aPanel h3{font:400 16px var(--rd);-webkit-text-stroke:3px #071030;paint-order:stroke fill}
#lay.brt .aChips{gap:2px;padding:2px 0}
#lay.brt .aChips button{height:36px;padding:0 4px;border-radius:0;background:none;box-shadow:none;border:10px solid transparent;border-image:url(${UI}frame/btn_steel.webp) 48 fill / 10px stretch;font:400 12.5px var(--rd);color:#d6e2ff;-webkit-text-stroke:2.5px #071030;paint-order:stroke fill}
#lay.brt .aChips button[aria-pressed="true"]{color:#fff;background:none;border-image-source:url(${UI}frame/btn_blue.webp);-webkit-text-stroke:2.5px #062060}
#lay.brt .aChips .lb{font:400 12px var(--rd);color:#e9c56a}
#lay.brt .aPl,#lay.brt .aCur,#lay.brt .aSta{border-radius:0;background:none;box-shadow:0 2px 5px rgba(0,0,0,.5);border:9px solid transparent;border-image:url(${UI}frame/btn_steel.webp) 48 fill / 9px stretch;height:auto;min-height:34px;padding:0 2px}
#lay.brt .aPl{padding:0 4px 0 0}
#lay.brt .aCur b,#lay.brt .aSta b{font:400 13px var(--rd);-webkit-text-stroke:2.5px #071030;paint-order:stroke fill}
#lay.brt .aCard .fr{background:linear-gradient(160deg,#fff4c8,#e2b347 22%,#9a6a16 50%,#f2cf6a 78%,#8a5a12);padding:2.5px;box-shadow:0 0 0 1px #3a2200,0 3px 6px rgba(0,0,0,.55)}

#lay.brt .aCta{align-items:stretch}
#lay.brt .aCta .aBtn{min-height:62px;font-size:20px;letter-spacing:.1em}
#lay.brt .aCta .aBtn.shine{border-image-source:url(${UI}frame/btn_blue.webp);-webkit-text-stroke:4px #062060}
#lay.brt .aCta .aBtn.shine small{-webkit-text-stroke:2.5px #062060}
#lay.brt .aCta .aBtn.sub{flex:0 0 74px;border-width:10px;border-image-width:10px;font-size:11px;padding:0;min-height:62px}
#lay.brt .aCta .aBtn.sub svg{width:20px;height:20px}
#lay.brt .gLogo small{display:none}
#lay.brt .gLogo b{font-family:var(--rd);font-weight:400}
#lay.brt .aPe .pst>div,#lay.brt .pst>div{border-radius:0;background:none;box-shadow:0 3px 6px rgba(0,0,0,.4);border:12px solid transparent;border-image:url(${UI}frame/panel.webp) 72 fill / 12px stretch;padding:0 2px}
#lay.brt .pst b{font-family:var(--rd);font-weight:400;-webkit-text-stroke:2.5px #071030;paint-order:stroke fill}
#lay.brt .aSta i{font-size:13px}#lay.brt .aSta b{-webkit-text-stroke:2px #071030;letter-spacing:.02em}
#lay.brt .aSta b,#lay.brt .aCur b{color:#fff!important;opacity:1}#lay.brt .aSta i{color:#ffd23a;filter:drop-shadow(0 1px 0 #3a2000)}
/* (11/9) ホームのクエスト欄をなくした分、キャラを下へ */
#lay.brt .aHero{bottom:calc(env(safe-area-inset-bottom,0px) + 70px);height:58%}
#lay.brt .aNm{bottom:calc(env(safe-area-inset-bottom,0px) + 82px);border-radius:0;background:none;box-shadow:0 3px 8px rgba(0,0,0,.5);border:12px solid transparent;border-image:url(${UI}frame/panel.webp) 72 fill / 12px stretch;padding:0 4px}
#lay.brt .aNm .nm{font:400 20px/1.25 var(--rd);-webkit-text-stroke:3px #071030;paint-order:stroke fill;text-shadow:none}
#lay.brt .aNm .ld{font:400 11px var(--rd);color:#e9c56a}
#lay.brt .aTalk{bottom:calc(env(safe-area-inset-bottom,0px) + 150px)}
/* (11/9) 動き。モンストの画面を1コマずつ見て: 切りかえは0.3秒ほどで下からすっと出る、押すと沈んで離すと少しはねる、ホームは光や粒がいつも動いている */
#lay.brt #oroot.enter>*:not(.aBg):not(.aHero):not(.aMotes):not(.aTalk){animation:scIn .34s cubic-bezier(.16,1,.3,1) both}
#lay.brt #oroot.enter>*:nth-child(3){animation-delay:.04s}#lay.brt #oroot.enter>*:nth-child(4){animation-delay:.08s}#lay.brt #oroot.enter>*:nth-child(5){animation-delay:.12s}#lay.brt #oroot.enter>*:nth-child(6){animation-delay:.16s}#lay.brt #oroot.enter>*:nth-child(n+7){animation-delay:.2s}
@keyframes scIn{from{opacity:0;transform:translateY(16px) scale(.985)}to{opacity:1;transform:none}}
#lay.brt #oroot.enter>.aHero{animation:heroIn .5s cubic-bezier(.16,1,.3,1) both}
@keyframes heroIn{from{opacity:0;transform:translateX(-46%) translateY(10px)}to{opacity:1;transform:translateX(-50%)}}
#lay.brt #oroot.enter .aCard{animation:cardIn .32s cubic-bezier(.34,1.4,.64,1) both;animation-delay:calc(var(--i,0) * 25ms + .1s)}
@keyframes cardIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}
#lay.brt #oroot.enter .aSide .aIb{animation:ibIn .4s cubic-bezier(.34,1.5,.64,1) both}
#lay.brt #oroot.enter .aSide .aIb:nth-child(2){animation-delay:.05s}#lay.brt #oroot.enter .aSide .aIb:nth-child(3){animation-delay:.1s}#lay.brt #oroot.enter .aSide .aIb:nth-child(4){animation-delay:.15s}#lay.brt #oroot.enter .aSide .aIb:nth-child(5){animation-delay:.2s}
@keyframes ibIn{from{opacity:0;transform:translateX(24px) scale(.8)}to{opacity:1;transform:none}}
/* 押した時: すぐ沈む(0.06秒)、離すと少しはねてもどる */
#lay.brt .aBtn,#lay.brt .aTabs button,#lay.brt .ssqt button,#lay.brt .qDf button,#lay.brt .aChips button,#lay.brt .qPl,#lay.brt .aIb .ic,#lay.brt #onav button,#lay.brt .aCard{transition:transform .2s cubic-bezier(.34,1.8,.64,1),filter .2s}
#lay.brt .aBtn:active,#lay.brt .aTabs button:active,#lay.brt .ssqt button:active,#lay.brt .qDf button:active,#lay.brt .aChips button:active,#lay.brt .aIb:active .ic,#lay.brt #onav button:active{transform:translateY(2px) scale(.94);filter:brightness(.88);transition-duration:.06s}
#lay.brt .qPl:active,#lay.brt .aCard:active{transform:scale(.97);filter:brightness(.9);transition-duration:.06s}
/* 下のバー: 選んだアイコンがぽんとはねる */
#lay.brt #onav button[aria-current="page"]:not(.mid) .ni{animation:niPop .45s cubic-bezier(.34,1.8,.64,1)}
@keyframes niPop{0%{transform:scale(.7) translateY(4px)}60%{transform:scale(1.18) translateY(-4px)}100%{transform:none}}
/* ホーム: 右のアイコンが少しずつずれてゆれる、赤い数字が脈打つ、光の粒 */
#lay.brt .aSide.r .aIb .ic img{animation:ibBob 3.2s ease-in-out infinite}
#lay.brt .aSide.r .aIb:nth-child(2) .ic img{animation-delay:-.6s}#lay.brt .aSide.r .aIb:nth-child(3) .ic img{animation-delay:-1.2s}#lay.brt .aSide.r .aIb:nth-child(4) .ic img{animation-delay:-1.8s}#lay.brt .aSide.r .aIb:nth-child(5) .ic img{animation-delay:-2.4s}
@keyframes ibBob{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-3px) rotate(-3deg)}}
#lay.brt .aIb .bd{animation:bdPulse 1.4s ease-in-out infinite}
@keyframes bdPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
#lay.brt .aMotes{position:absolute;inset:0;pointer-events:none;z-index:1;overflow:hidden}
#lay.brt .aMotes i{position:absolute;bottom:18%;border-radius:50%;background:radial-gradient(circle,#fffbe6 0 30%,rgba(255,220,120,.6) 45%,rgba(255,220,120,0) 70%);will-change:transform,opacity;opacity:0;animation:mote var(--d) linear infinite}
@keyframes mote{0%{opacity:0;transform:translateY(0)}15%{opacity:.9}80%{opacity:.6}100%{opacity:0;transform:translateY(-55vh) translateX(14px)}}
/* 大事なボタン(オレンジ・青)に、ときどき光が走る */
#lay.brt .aBtn.shine::before{content:"";position:absolute;inset:-14px;pointer-events:none;background:linear-gradient(100deg,transparent 35%,rgba(255,255,255,.4) 48%,transparent 60%) no-repeat;background-size:250% 100%;animation:btnSweep 3.4s ease-in-out infinite;will-change:transform}#lay.brt .aBtn.shine::after{animation:none;display:none}
@keyframes btnSweep{0%,62%{background-position:170% 0}100%{background-position:-70% 0}}
#lay.brt .aHero img,#lay.brt .aGa .chars img.fr,#lay.brt .aSide.r .aIb .ic img,#lay.brt .aIb .bd,#lay.brt #onav .mid .md{will-change:transform}
@media (prefers-reduced-motion:reduce){#lay.brt *{animation:none!important}}
`));

/* 押したときの光の輪(どのボタンにも) */
document.addEventListener('pointerdown', e => {
  const b = e.target.closest && e.target.closest('.aBtn,.aIb .ic,.aCard .fr,.aSlot');
  if (!b || RM) return; const r = h('i', 'aRing'); b.appendChild(r); setTimeout(() => r.remove(), 420);
}, { passive: true });

/* ---------- 画面の骨組み ---------- */
const TABS = [['home', 'ホーム'], ['chara', 'キャラ'], ['quest', 'クエスト'], ['gacha', 'ガチャ'], ['other', 'プロフィール']];
const lay = $('lay'); if (BRT) lay.classList.add('brt');
const nav = h('nav'); nav.id = 'onav'; nav.setAttribute('aria-label', 'メニュー');
for (const [k, label] of TABS) {
  const mid = k === 'quest';
  const ic = BRT ? niSvg(k) : svg(k);   /* (11/9 試し) 色つきのアイコン */
  const b = h('button', mid ? 'mid' : null, mid ? `<span class="md">${ic}</span><span>${label}</span>` : `${ic}<span>${label}</span>`);
  b.type = 'button'; b.dataset.k = k; b.onclick = () => go(k); nav.appendChild(b);
}
const hud = h('div'); hud.id = 'ohud';
const root = h('div'); root.id = 'oroot'; root.hidden = true;
lay.appendChild(root); lay.appendChild(hud); lay.appendChild(nav);
/* 下のバーの本当の高さを測って --nb に入れる(ボタンや一覧が下のバーに隠れないように) */
function fitNav() { if (nav.hidden) return; const L = lay.getBoundingClientRect(), n = nav.getBoundingClientRect(); if (!n.height) return; const v = Math.max(56, Math.round(L.bottom - n.top)) + 'px'; if (lay.style.getPropertyValue('--nb') !== v) lay.style.setProperty('--nb', v); }
window.addEventListener('resize', fitNav); if (window.visualViewport) visualViewport.addEventListener('resize', fitNav); setInterval(fitNav, 800);
let TAB = 'home', SUB = { quest: 'main', chara: 'box' }, PICK = null;

function rankInfo() { const n = A.PROG.n.filter(Boolean).length + A.PROG.h.filter(Boolean).length; const lvSum = S.units.reduce((a, u) => a + u.lv, 0); const xp = n * 120 + lvSum * 6; const rk = 1 + Math.floor(xp / 100); return { rk, f: (xp % 100) / 100 }; }
function renderTop() {
  const ri = HOST && HOST.rank ? HOST.rank() : rankInfo(), f = myAv();   /* アプリの中ではアプリのランク(レベル)を出す */
  hud.innerHTML = `<button class="aPl aGl" type="button" aria-label="ホームに出すキャラを変える"><span class="aAv" style="${f ? `background-image:url(${f})` : ''}"></span><span style="min-width:0"><span class="aPn">${esc(S.name)}</span><span class="aRk">RANK <b>${ri.rk}</b><span class="bar"><i style="width:${Math.round(ri.f * 100)}%"></i></span></span></span></button>
  <button class="aSta aGl" type="button" aria-label="スタミナ"><i>⚡</i><b></b><small></small>${staGift ? '<em class="dot"></em>' : ''}</button><div class="aCur aGl" title="きもオタレートと共通のポイント。ガチャに使う。ステージの初回クリア・★・ミッションでもらえる">${svg('pt', '0 0 16 16')}<b>${ptNow().toLocaleString()}</b>${HOST ? '' : '<button type="button" aria-label="ptを足す(テスト用)">+</button>'}</div>${HOST ? '<button class="aX" type="button" aria-label="アプリに戻る">×</button>' : ''}`;
  hud.querySelector('.aPl').onclick = () => { if (TAB !== 'home') go('home'); else nextHome(); };
  hud.querySelector('.aSta').onclick = staMenu; staTick();
  if (!HOST) hud.querySelector('.aCur button').onclick = () => { S.pt += 1000; save(); flash('+1,000pt(テスト用)'); };
  else hud.querySelector('.aX').onclick = () => { try { HOST.close(); } catch (e) { } };
}
function shell(title, en, opts) {
  root.innerHTML = '<div class="aBg"></div>';
  if (title) root.appendChild(h('div', 'aTitle', `<h2>${esc(title)}</h2><small>${esc(en)}</small>`));
  if (opts && opts.tabs) {
    const t = h('div', 'aTabs'); t.setAttribute('role', 'tablist');
    for (const [k, label] of opts.tabs) { const b = h('button', null, label); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(SUB[TAB] === k)); b.onclick = () => { SUB[TAB] = k; PICK = null; renderNow(); }; t.appendChild(b); }
    root.appendChild(t);
  }
  const body = h('div', 'obody'); root.appendChild(body); return body;
}
let QIN = '';
function go(k) { if (k !== TAB) QIN = ''; TAB = k; PICK = null; renderNow(); }
/* (11/7) 4人そろっていなくて、無料の10回召喚が残っているあいだは、ガチャとその他だけ */
function needFree() { return S.free10 && new Set(S.units.map(x => x.id)).size < 4; }
function canGo() { if (teamUnits().length >= 4) return true; modal('仲間が足りません', (b, close) => { b.innerHTML = `<p style="text-align:center">出撃には4人の仲間が必要です。<br>ガチャで仲間を呼びましょう。</p>`; const r = h('div', 'orow'); r.style.padding = '0'; r.append(btn('sub', '閉じる', close), btn('shine', 'ガチャへ', () => { close(); go('gacha'); })); b.appendChild(r); }); return false; }
function renderNow() {
  if (!document.body.classList.contains('navon')) return;
  renderTop();
  nav.querySelectorAll('button').forEach(b => b.setAttribute('aria-current', b.dataset.k === TAB ? 'page' : 'false'));
  root.hidden = false; $('ss').hidden = true;
  if (needFree() && TAB !== 'gacha' && TAB !== 'other') { if (TAB !== 'home') flash('まずは無料の10回召喚で仲間を呼ぼう'); TAB = 'gacha'; nav.querySelectorAll('button').forEach(b => b.setAttribute('aria-current', b.dataset.k === TAB ? 'page' : 'false')); }
  ({ home: renderHome, quest: renderQuest, chara: renderChara, gacha: renderGacha, other: renderOther })[TAB]();
  /* (11/9) 動き: 画面を切りかえた時だけ、中身が下から順に出てくる(同じ画面を描き直した時は出さない) */
  const ek = TAB + ':' + (SUB[TAB] || '');
  if (BRT && !RM && ek !== ENTERK) { root.classList.remove('enter'); void root.offsetWidth; root.classList.add('enter'); root.querySelectorAll('.aCard').forEach((c, i) => c.style.setProperty('--i', Math.min(i, 18))); clearTimeout(ENTERT); ENTERT = setTimeout(() => root.classList.remove('enter'), 1400); }
  ENTERK = ek;
  fitNav();
}
let ENTERK = '', ENTERT = 0;
function qTabs() {
  const t = h('div', 'ssqt'); t.setAttribute('role', 'tablist');
  for (const [k, label] of [['main', 'メイン'], ['event', 'イベント'], ['chal', 'チャレンジ']]) { const b = h('button', null, label); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(SUB.quest === k)); b.onclick = () => { SUB.quest = k; EVSEL = null; renderNow(); }; t.appendChild(b); }
  return t;
}
function modal(title, build) {
  const m = h('div', 'omodal'); const c = h('div', 'aDlg aGl'); c.appendChild(h('div', 'hd', esc(title))); const bdy = h('div', 'bdy'); c.appendChild(bdy); m.appendChild(c);
  const close = () => m.remove(); build(bdy, close, c);
  m.addEventListener('click', e => { if (e.target === m) close(); }); lay.appendChild(m); const f = c.querySelector('button'); f && f.focus(); return m;
}
function btn(cls, html, fn) { const b = h('button', 'aBtn' + (cls ? ' ' + cls : ''), html); b.type = 'button'; b.onclick = fn; return b; }
function flash(t) { const d = h('div', 'oflash aGl', esc(t)); lay.appendChild(d); d.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(1.25)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .15 }, { opacity: 1, offset: .8 }, { opacity: 0 }], { duration: 1600 }).onfinish = () => d.remove(); }

/* 素材のアイコン: 経験値の竜は敵の竜の絵、宝珠は属性色の玉 */
function matIcon(id) {
  const m = MATS[id];
  if (m.el) return `<span class="aMi"><svg viewBox="0 0 32 32"><defs><radialGradient id="og${id}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${elCol(m.el)}"/><stop offset="1" stop-color="${elDeep(m.el)}"/></radialGradient></defs><circle cx="16" cy="16" r="12" fill="url(#og${id})" stroke="#e8c878" stroke-width="1.5"/><path d="M10 11a8 8 0 0 1 6-3" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/></svg></span>`;
  return `<span class="aMi"><img alt="" src="./assets/icons/enemy.png" style="filter:drop-shadow(0 1px 2px #000) ${id === 'expL' ? 'hue-rotate(0deg) saturate(1.6) brightness(1.15)' : id === 'expM' ? 'grayscale(.6) brightness(1.2)' : 'sepia(.6) brightness(.95)'}"><b>${m.ico}</b></span>`;
}

/* ---------- ホーム ---------- */
function nextMain() { const i = A.STAGES.findIndex((s, j) => !s.ev && (j === 0 || A.PROG.n[j - 1]) && !A.PROG.n[j]); return i < 0 ? A.MAIN_N - 1 : i; }
const HOMES = ['jin', 'riz', 'gekka', 'seira'];
let talkT = 0, banT = 0, banI = 0, gaT = 0, gaI = 0;
function nextHome() { const L = [...new Set(S.units.map(x => x.id))].filter(k => CH[k].rar >= 5).concat([...new Set(teamUnits().map(x => x.id))]).filter((k, i, a) => a.indexOf(k) === i); if (!L.length) return; S.home = L[(L.indexOf(S.home) + 1) % L.length]; save(); swapHero(); }
function talkLines() {
  const ni = nextMain(), st = A.STAGES[ni], lines = [`つづきは ${st.id}「${st.n}」。`];
  const big = S.units.filter(u => u.lv < maxLv(u)).length; if ((S.mats.expS || 0) + (S.mats.expM || 0) + (S.mats.expL || 0) > 0 && big) lines.push('経験値の竜があるよ。強化してみよう。');
  if (ptNow() >= GACHA.ten) lines.push('ptがたまってる。ガチャで仲間を増やそう。');
  lines.push('リーダーで圧縮のしかたが変わるよ。', '赤い予告の外へ、味方を逃がそう。');
  return lines;
}
function talk() { const t = root.querySelector('.aTalk'); if (!t) return; const L = talkLines(); t.textContent = L[Math.floor(Math.random() * L.length)]; t.classList.add('on'); clearTimeout(talkT); talkT = setTimeout(() => t.classList.remove('on'), 2800); }
function heroSrc(k) { const e = evoArt(k, k === S.home && homeEvo()); return PORT[e] || CHIBI[e] || ''; }
function swapHero() {
  const img = root.querySelector('.aHero img:not(.lx)'); if (!img) { renderNow(); return; }
  root.querySelectorAll('.aHero .lx').forEach(e => e.remove()); setTimeout(homeLux, RM ? 30 : 640);
  const apply = () => { img.src = heroSrc(S.home); const c = CH[S.home]; const nm = root.querySelector('.aNm'); nm.innerHTML = nameHTML(c); renderTop(); };
  if (RM) { apply(); return; }
  img.classList.add('out');
  setTimeout(() => { img.classList.remove('out'); img.classList.add('in'); apply(); requestAnimationFrame(() => requestAnimationFrame(() => { img.style.transition = 'transform .36s cubic-bezier(.2,.9,.25,1.15),opacity .26s'; img.classList.remove('in'); setTimeout(() => img.style.transition = '', 420); })); setTimeout(talk, 300); }, 200);
}
function nameHTML(c) { const e = c.id === S.home && homeEvo(); return `<div class="ld">リーダー ${esc(LEAD[c.id] || '')}</div><div class="nm">${elGem(c.el, 24)}${esc(e ? (c.evoName || c.name) : c.name)}</div>${stars(c.rar + (e ? 1 : 0))}`; }
const BANS = [
  { t: 'キャラガチャ 開催中', img: 'banner-gacha.webp', k: 'seira', go: () => go('gacha') },
  { t: '経験値の竜の巣', img: 'banner-exp.webp', k: 'gekka', go: () => { TAB = 'quest'; SUB.quest = 'event'; EVSEL = 'exp'; renderNow(); } },
  { t: '第1章 天空の闘技場', img: 'banner-ch1.webp', k: 'riz', go: () => { TAB = 'quest'; SUB.quest = 'main'; renderNow(); } },
];
function banBg(b) { return `url(${UI}${b.img}),url(${PORT[b.k] || ''})`; }
function renderHome() {
  root.innerHTML = ''; clearInterval(banT);
  const w = h('div', 'aHome'); root.appendChild(w);
  w.innerHTML = `<div class="hbg"></div><div class="motes"></div><div class="aHero"><div class="glow"></div><img alt="" src="${heroSrc(S.home)}"></div><div class="vig"></div>`;
  const mo = w.querySelector('.motes'); if (!RM) for (let i = 0; i < 16; i++) { const m = h('i'); m.style.left = Math.random() * 100 + '%'; m.style.top = 35 + Math.random() * 55 + '%'; m.style.animationDuration = 5 + Math.random() * 6 + 's'; m.style.animationDelay = -Math.random() * 9 + 's'; mo.appendChild(m); }
  w.querySelector('.aHero img').onclick = () => { nextHome(); }; setTimeout(homeLux, 60);
  const c = CH[S.home]; root.appendChild(h('div', 'aNm', nameHTML(c)));
  root.appendChild(h('div', 'aTalk'));
  /* 左: 切り替わるバナー */
  const L = h('div', 'aSide l'); const bn = h('button', 'aBan aGl'); bn.type = 'button';
  const setBan = () => { const b = BANS[banI]; bn.innerHTML = `<span class="im" style="background-image:${banBg(b)};background-size:cover,auto 260%;background-position:center,center 18%"></span><span class="tx">${esc(b.t)}</span>`; bn.onclick = b.go; dots.querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i === banI)); };
  const dots = h('div', 'aDots', BANS.map(() => '<i></i>').join('')); L.append(bn, dots); root.appendChild(L); setBan();
  banT = setInterval(() => { if (TAB !== 'home' || root.hidden) return; banI = (banI + 1) % BANS.length; setBan(); }, 3600);
  /* 右: 丸いボタン */
  const R = h('div', 'aSide r');
  const HIMG = { news: 'home_news', mission: 'home_mission', gift: 'home_gift', party: 'home_party', ev: 'home_event' };
  const ib = (k, label, fn, bd) => { const b = h('button', 'aIb', `<span class="ic">${BRT && HIMG[k] ? `<img alt="" src="${UI}home/${HIMG[k]}.webp">` : svg(k)}</span><span>${label}</span>${bd ? `<i class="bd">${bd}</i>` : ''}`); b.type = 'button'; b.onclick = fn; return b; };
  const nNew = S.newIds.length;
  R.append(ib('news', 'お知らせ', news), ib('mission', 'ミッション', missions, dmClaimable()), ib('gift', 'プレゼント', presents, S.box.length), ib('party', '編成', () => { TAB = 'chara'; SUB.chara = 'party'; renderNow(); }));
  if (BRT) R.append(ib('ev', 'イベント', () => { TAB = 'quest'; SUB.quest = 'event'; renderNow(); }));
  if (MPC.ok()) R.append(ib('party', 'マルチ', mpJoinAsk));
  root.appendChild(R);
  /* (v121) 上の帯(名前の札・pt・閉じるボタン)の下から並べる。(v122) 札が縦に伸びていたのは、ランキングの一覧と見た目の名前(.aRk)がかぶっていたため。一覧は .aRkL にした。アプリの中では札が大きくなって重なっていた */
  const fitSide = () => { const hb = Math.max(0, ...[...hud.children].map(e => e.getBoundingClientRect().bottom)), rt = root.getBoundingClientRect().top; if (hb > 0) { L.style.top = R.style.top = Math.round(hb - rt + 8) + 'px'; } }; requestAnimationFrame(fitSide); setTimeout(fitSide, 400);
  /* 下: 出撃 */
  const ni = nextMain(), st = A.STAGES[ni];
  const cta = h('div', 'aCta');
  cta.append(btn('shine', `クエスト<small>つづきから ${esc(st.id)} ${esc(st.n)}</small>`, () => goSheet(ni, false)), btn('sub', `${svg('ev')}イベント`, () => { TAB = 'quest'; SUB.quest = 'event'; renderNow(); }));
  if (!BRT) root.appendChild(cta);
  if (BRT && !RM) {   /* (11/9) 動き: ホームに、ゆっくり上る光の粒 */
    const mo = h('div', 'aMotes'); let hs = '';
    for (let i = 0; i < 10; i++) { const x = (i * 61 + 7) % 100, d = 6 + (i * 37 % 50) / 10, dl = -((i * 1.7) % d), sz = 6 + (i % 3) * 2; hs += `<i style="left:${x}%;--d:${d}s;animation-delay:${dl.toFixed(1)}s;width:${sz}px;height:${sz}px"></i>`; }
    mo.innerHTML = hs; root.insertBefore(mo, root.firstChild.nextSibling);
  }   /* (11/9) 山本さん「ホームのクエスト欄いらない」。クエストは下のバーのまん中から。イベントは右のアイコンへ */
  setTimeout(talk, 700);
}
function news() {
  modal('お知らせ', (b, close) => {
    b.innerHTML = `<p><b>ガチャはpt(きもオタレートと共通)で引きます</b><br>ステージの初回クリア・★・デイリーミッションでもptがもらえます。</p>
    <p><b>ステージに★3つ</b><br>クリア/体力を半分以上のこす/決まった手数以内。★3つでスキップ(戦わずに報酬だけ)が使えます。ハードは宝珠が出ます(1日3回)。</p>
    <p><b>ガチャ</b><br>10連は★4以上が1体確定。1回で交換pt1、100たまると★5確定の1回召喚が引ける(次のガチャにも持ち越し)。</p>
    <p><b>デイリーミッション・プレゼント箱</b>を追加しました。ログインボーナスはきもオタレートの方でもらえます。</p>`;
    const r = h('div', 'orow'); r.style.padding = '0'; r.appendChild(btn('sub', '閉じる', close)); b.appendChild(r);
  });
}

/* ---------- クエスト: 章の帯+ステージの一覧。押すと下から出撃の確認 ---------- */
const Q = { hard: false, ch: null };
const CHC = ['#2a4a9a', '#2f6f6a', '#8a3a1a', '#5a3a9a'];   /* 章の帯の色(絵がない章) */
const LOCK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
/* (v107) クエスト画面の部品(D-126) */
const CHBG = ['banner-ch1', 'banner-ch2', 'banner-ch3', 'banner-ch4'], CHBOSS = ['base', 'mist', 'magma', 'star'];
const LEVBG = { beast: 'ev-hunt', tree: 'ev-forest', mist: 'ev-moon', star: 'ev-star' };
const bossImg = (k, css, cls) => `<img class="bs${cls ? ' ' + cls : ''}" alt="" src="${UI}boss-${k}.webp"${css ? ` style="${css}"` : ''}>`;
function qBanner(o) {
  const e = h(o.div ? 'div' : 'button', 'qBn' + (o.cls ? ' ' + o.cls : '')); if (!o.div) e.type = 'button';
  e.innerHTML = `<span class="fr"><span class="art" style="${o.bgCss || `background-image:url(${UI}${o.bg}.webp)`}"></span><span class="sh"></span>${o.extra || ''}${o.rb ? `<span class="rb">${o.rb}</span>` : ''}${o.dl ? `<span class="dl">${o.dl}</span>` : ''}<span class="tt">${o.sm ? `<small>${o.sm}</small>` : ''}<b>${o.tt}</b></span>${o.bar ? `<span class="bar">${o.bar}</span>` : ''}</span>${o.boss || ''}`;
  if (o.label) e.setAttribute('aria-label', o.label); if (o.onclick) e.onclick = o.onclick; return e;
}
function qHead(b, o) {
  const e = h('div', 'qHd'); e.innerHTML = `<span class="fr"><span class="art" style="${o.bgCss || `background-image:url(${UI}${o.bg}.webp)`}"></span><span class="sh"></span><span class="tt">${o.sm ? `<small>${o.sm}</small>` : ''}<b>${o.tt}</b></span>${o.bar ? `<span class="bar">${o.bar}</span>` : ''}</span>${o.boss || ''}<button type="button" class="bk" aria-label="もどる">‹</button>`;
  e.querySelector('.bk').onclick = o.back; b.appendChild(e); return e;
}
/* 出撃の板の上に出す絵(ステージの種類ごと) */
function stageBg(st) {
  const ex = ['banner-raid', 'ev-forest'], k = !st.ev ? CHBG[st.ch] : st.ev === 'exp' ? 'banner-exp' : st.ev === 'tower' ? 'banner-tower' : st.ev === 'raid' ? 'banner-raid' : st.ev === 'score' ? 'banner-score' : st.ev === 'ex' ? ex[st.bi] : st.ev === 'lev' ? LEVBG[A.LEV.boss] : null;
  return k ? `background-image:linear-gradient(90deg,rgba(6,10,30,.85),rgba(6,10,30,.2) 70%),url(${UI}${k}.webp)` : `background:radial-gradient(90% 160% at 80% 50%,${elCol(st.el || '光')},${elDeep(st.el || '光')} 55%,#0a1236)`;
}
const svGem = (n, mx) => `<span class="sv">${Array.from({ length: mx || 5 }, (_, k) => `<i class="${k < n ? '' : 'o'}"></i>`).join('')}</span>`;
const raidBoss = () => { const R = A.RAID; if (R.model) return bossImg(R.model); const f = { '水': 'hue-rotate(185deg) saturate(1.6)', '光': 'sepia(.6) saturate(2.2) hue-rotate(5deg) brightness(1.05)' }[R.el] || ''; return bossImg('base', f ? `filter:${f} drop-shadow(0 4px 6px rgba(0,0,0,.7))` : ''); };
function kindImgs(i, max) { return A.stageKinds(i).filter(k => !k.startsWith('g_')).slice(0, max).map(k => `<img alt="" src="./assets/icons/${k}.png">`).join(''); }
function renderQuest() {
  const b = shell(null); root.insertBefore(qTabs(), b);
  /* (11/9) 画面くらべ: クエストは画面ごとの背景(ノーマルは青空・ハードは赤)。入ったときだけ行が順に出る */
  const qIn = QIN !== TAB + SUB.quest + (Q.hard ? 'h' : 'n') + Q.ch; QIN = TAB + SUB.quest + (Q.hard ? 'h' : 'n') + Q.ch;
  if (SUB.quest === 'main') { root.querySelector('.aBg').classList.add('qbg'); if (Q.hard) root.querySelector('.aBg').classList.add('hd'); }
  if (SUB.quest === 'event') { renderEvents(b); return; }
  if (SUB.quest === 'chal') { renderChal(b); return; }
  const MN = A.MAIN_N, hard = Q.hard, clr = i => hard ? A.PROG.h[i] : A.PROG.n[i];
  /* (v98) 章のタブ(D-116)。章の最初のステージが開いていれば選べる */
  const CHS = A.CHAPS, chOf = i => A.STAGES[i].ch, first = c => A.STAGES.findIndex(st => !st.ev && st.ch === c);
  if (Q.ch == null) { const c0 = A.STAGES.slice(0, MN).findIndex((_, i) => A.stageOpen(i, hard) && !clr(i)); Q.ch = c0 >= 0 ? chOf(c0) : chOf(MN - 1); }
  const B0 = first(Q.ch), N0 = A.STAGES.filter(st => !st.ev && st.ch === Q.ch).length, N = B0 + N0;
  let nC = 0; for (let i = B0; i < N; i++) if (clr(i)) nC++;
  /* 章の見出し: 章の絵+ラスボス。左右の矢印で章をかえる */
  const chOpen = c => c >= 0 && c < CHS.length && A.stageOpen(first(c), false);
  const hd = h('div', 'qChH'); hd.innerHTML = `<span class="fr"><span class="art" style="background-image:url(${UI}${CHBG[Q.ch] || CHBG[0]}.webp)"></span><span class="sh"></span><span class="tt"><small>${esc(CHS[Q.ch].no)}</small><b>${esc(CHS[Q.ch].n)}</b></span><span class="bar"><span class="pg"><i style="width:${Math.round(nC / N0 * 100)}%"></i></span><span>クリア <b>${nC}</b> / ${N0}</span></span></span>${bossImg(CHBOSS[Q.ch] || 'base')}<button type="button" class="ar l" aria-label="前の章">‹</button><button type="button" class="ar r" aria-label="次の章">›</button><span class="dots">${CHS.map((_, c) => `<i class="${c === Q.ch ? 'on' : ''}"></i>`).join('')}</span>`;
  const [aL, aR] = hd.querySelectorAll('.ar'); aL.disabled = Q.ch <= 0; aR.disabled = Q.ch >= CHS.length - 1;
  aL.onclick = () => { Q.ch--; renderNow(); }; aR.onclick = () => { if (!chOpen(Q.ch + 1)) { flash('この章をクリアすると次の章が開きます'); return; } Q.ch++; renderNow(); };
  b.appendChild(hd);
  const df = h('div', 'qDf'); const anyN = A.PROG.n.slice(0, MN).some(Boolean);
  const bN = h('button', null, 'ノーマル'), bH = h('button', 'h', 'ハード'); bN.type = bH.type = 'button';
  bN.setAttribute('aria-pressed', String(!hard)); bH.setAttribute('aria-pressed', String(hard)); bH.disabled = !anyN;
  if (!anyN) bH.innerHTML = `<span class="lk">${LOCK}</span>ハード<small>1-1をクリアで開く</small>`;   /* (11/9) 説明の文をやめてボタンの中に */
  bN.onclick = () => { Q.hard = false; renderNow(); }; bH.onclick = () => { Q.hard = true; renderNow(); }; df.append(bN, bH); b.appendChild(df);
  const L = h('div', 'qL'); b.appendChild(L); let curEl = null;
  const cur = A.STAGES.slice(0, MN).findIndex((_, i) => A.stageOpen(i, hard) && !clr(i));
  let firstLock = -1; for (let i = B0; i < N; i++) if (!A.stageOpen(i, hard)) { firstLock = i; break; }
  for (let i = B0; i < N; i++) {
    if (firstLock >= 0 && i > firstLock) {   /* (11/9) まだ開いていないステージは1行にまとめる(「？？？」の板がならぶと画面がからっぽに見える) */
      const rest = N - i, lb = A.STAGES[N - 1], m = h('div', 'qMore');
      m.innerHTML = `<span class="lks">${LOCK.repeat(Math.min(rest, 3))}</span><span class="t">あと <b>${rest}</b> ステージ</span>${lb.boss ? `<span class="lb">${bossImg(CHBOSS[Q.ch] || 'base')}<em>ラスボスが待っている</em></span>` : ''}`;
      L.appendChild(m); break;
    }
    const st = A.STAGES[i], open = A.stageOpen(i, hard), c = clr(i), sv = A.stageStrength(i, hard), bits = S.stars[skey(i, hard)] || 0;
    const r = h('button', 'qPl' + (st.boss ? ' boss' : '') + (open ? '' : ' lock') + (i === cur ? ' cur' : '') + (hard ? ' hd' : '')); r.type = 'button';
    if (BRT && open && /^\d-\d$/.test(st.id)) { r.classList.add('art'); r.style.setProperty('--art', `url(${UI}stage/s${st.id}.webp)`); }
   /* (11/9) Codex T-026 のステージの帯の絵 */
    r.innerHTML = `<span class="cn">${st.boss && open ? `<img alt="" src="${UI}boss-${CHBOSS[st.ch] || 'base'}.webp">` : `<b>${esc(st.id)}</b>`}</span>${c ? `<i class="ck">${BRT ? 'CLEAR' : '✓'}</i>` : ''}
      <span class="md"><b>${st.boss && open ? esc(st.id) + ' ' : ''}${open ? esc(st.n) : '？？？'}</b><span>${open ? kindImgs(i, 5) + svGem(sv) : '前のステージをクリアすると開く'}</span></span>
      <span class="rt">${open ? `<span class="st3">${[0, 1, 2].map(k => `<i class="${bits >> k & 1 ? 'on' : ''}">★</i>`).join('')}</span>` : `<span class="lk">${LOCK}</span>`}${!c && open ? `<i class="fr2">${svg('pt', '0 0 16 16')}初回 ${RW.first}</i>` : ''}</span>${i === cur ? '<i class="nx">NEXT</i>' : ''}`;
    r.setAttribute('aria-label', `${st.id} ${open ? st.n : 'まだ開いていない'}${c ? ' クリア済み' : ''}`);
    if (BRT) r.insertAdjacentHTML('beforeend', '<i class="frm"></i>');   /* (11/9) Codex T-027 の金属のわく(innerHTML のあとに足す) */
    r.onclick = () => { if (!open) { flash(hard ? 'ノーマルでクリアすると開きます' : '前のステージをクリアすると開きます'); return; } goSheet(i, hard); };
    if (i === cur) curEl = r; L.appendChild(r);
  }
  if (qIn && !RM) [...L.children].forEach((e, k) => { e.style.animationDelay = (k * 45) + 'ms'; e.classList.add('qin'); });
  if (curEl) requestAnimationFrame(() => { const br = b.getBoundingClientRect(), r = curEl.getBoundingClientRect(); if (r.bottom > br.bottom - 8) b.scrollTop += r.top - br.top - b.clientHeight / 2 + r.height / 2; });
}
function starBox(i, hard, ev) {
  const b = S.stars[skey(i, hard)] || 0, c = conds(i), first = !ev && !(hard ? A.PROG.h[i] : A.PROG.n[i]);
  return `<div class="aSb">${c.map((t, k) => `<div class="${b >> k & 1 ? 'on' : ''}"><i>★</i>${esc(t)}<em>${b >> k & 1 ? '達成' : svg('pt', '0 0 16 16') + RW.star + 'pt'}</em></div>`).join('')}${first ? `<div class="fst">${svg('pt', '0 0 16 16')}初回クリア報酬 ${RW.first}pt</div>` : ''}${b === 7 ? '<div class="sk">★3つ達成: 戦わずに報酬だけもらえる「スキップ」が使えます</div>' : ''}</div>`;
}
function goSheet(i, hard, op) {
  op = op || {}; const st = A.STAGES[i], before = A.kindsBefore(i), sv = A.stageStrength(i, hard);
  const o = h('div', 'aGo'); const sh = h('div', 'sh'); o.appendChild(sh);
  const stI = A.STAGES[i], kName = k => k === 'boss' && stI.mbName ? stI.mbName : k === 'lb' && stI.lbName ? stI.lbName : A.KNAME[k]; /* (11/10) ボスの名前はステージのものを出す */
  const kinds = A.stageKinds(i).map(k => `<span class="${before.has(k) ? '' : 'nw'}">${k.startsWith('g_') || k === 'glitch' ? '' : `<img alt="" src="./assets/icons/${k}.png">`}${esc(kName(k))}${before.has(k) ? '' : ' NEW'}</span>`).join('');
  const lead = A.ROSTER[S.lead] || A.ALLIES[0];
  const faces = teamUnits().map(x => { const k = x.id, f = faceURL(k, x.evo); return `<span class="f" style="${f ? `background-image:url(${f})` : `background:${elCol(CH[k].el)}`}">${k === S.lead ? '<i>L</i>' : ''}</span>`; }).join('');
  let hp = 0; for (const x of teamUnits()) hp += stats(x).hp;
  sh.innerHTML = `<div class="tt qSt" style="${stageBg(st)}"><b>${esc(st.id)}${hard ? ' ハード' : ''}</b><span>${esc(st.n)}</span></div><p>${esc(st.d)}</p>
    <div class="inf"><span>ウェーブ ${st.waves.length}</span><span>敵の強さ ${'■'.repeat(sv)}${'□'.repeat(5 - sv)}</span>${kinds}</div>
    ${hard ? `<p class="hdn">ハード: 敵の体力1.7倍・攻撃1.5倍・攻撃までの手番が1つ早い。宝珠は1日3回まで(今日あと ${3 - ((S.hd.date === today() && S.hd.n[i]) || 0)}回)</p>` : ''}
    ${op.rw ? `<div class="aSb"><div class="fst">${op.rw}</div></div>` : starBox(i, hard)}
    <div class="pty">${faces}<span class="lt"><b>リーダー ${esc(lead.name)}「${esc(lead.ln)}」</b>チームの体力 ${hp.toLocaleString()}</span></div><div class="orow"></div>`;
  const close = () => o.remove();
  const pe = btn('sub sm', '編成', () => { close(); TAB = 'chara'; SUB.chara = 'party'; PICK = null; renderNow(); }); pe.style.flex = '0 0 auto'; sh.querySelector('.pty').appendChild(pe);
  const r = sh.querySelector('.orow'); const bk = btn('sub', 'もどる', close); bk.style.flex = '0 0 26%'; r.append(bk);
  if (!op.rw && ((S.stars[skey(i, hard)] || 0) & 7) === 7) { const sk = btn('sub', 'スキップ', () => { close(); skipStage(i, hard); }); sk.style.flex = '0 0 28%'; r.append(sk); }
  if (MPC.ok()) { const mb = btn('sub', 'マルチ募集', () => { close(); mpCreate(i, hard); }); mb.style.flex = '0 0 28%'; r.append(mb); }
  r.append(btn('shine', '出撃', () => { close(); if (canGo()) A.startStage(i, hard); }));
  o.addEventListener('click', e => { if (e.target === o) close(); }); lay.appendChild(o);
}
/* イベント: 1行に1つのイベント。押すと下から 初級・中級・上級 を選んで出撃(D-103) */
const evIdx = (g, t) => A.STAGES.findIndex(s => s.grp === g && s.tier === t);
/* (v98) 曜日クエスト(D-117): 宝珠の祭壇は曜日で開く。経験値の竜の巣はいつでも。金・土・日は全部 */
/* (v108) 宝珠の祭壇は2つずつ、毎日入れかわる(D-127): 炎・木 の日と 水・光 の日が交互 */
const ALT_PAIR = [['炎', '木'], ['水', '光']];
const dayNo = (off = 0) => { const d = new Date(); d.setHours(0, 0, 0, 0); return Math.round(d.getTime() / 864e5) + off; };
const altOf = (off = 0) => ALT_PAIR[((dayNo(off) % 2) + 2) % 2];
const evOpen = st => st.ev !== 'evo' || altOf().includes(st.el);
const evDay = el => altOf().includes(el) ? '今日' : '明日';
const hoursLeft = () => { const d = new Date(), e = new Date(d); e.setHours(24, 0, 0, 0); return Math.max(1, Math.ceil((e - d) / 36e5)); };
/* (v98) チャレンジ: 塔(月替わり30階)・降臨(毎月1体)・スコアアタック(週替わり)。D-118〜120 */
function chFresh() {
  if (!S.tower || S.tower.ym !== A.YM) S.tower = { ym: A.YM, top: 0 };
  if (!S.raid || S.raid.wk !== A.WKID) S.raid = { wk: A.WKID, win: 0 };   /* (11/9) 降臨は週ごと */
  if (!S.score || S.score.wk !== A.WKID) S.score = { wk: A.WKID, best: 0, last: 0, n: 0 };
  if (!S.ex) S.ex = {};
  if (!S.lev || S.lev.id !== A.LEV.id) S.lev = { id: A.LEV.id, medal: 0, buy: {}, win: [0, 0, 0] };
}
/* (v102) 高難度(D-123)と期間限定イベント(D-125) */
const exIdx = (bi, ti) => A.STAGES.findIndex(st => st.ev === 'ex' && st.bi === bi && st.ti === ti);
const exOpen = (bi, ti) => ti === 0 || !!S.ex[bi + '-' + (ti - 1)];
const EXRW = [{ f: [{ k: 'pt', n: 300 }, { k: 'orb', n: 3 }], r: [{ k: 'orb', n: 1, p: .6 }] }, { f: [{ k: 'pt', n: 600 }, { k: 'orb', n: 5 }, { k: 'mat', id: 'expL', n: 2 }], r: [{ k: 'orb', n: 2, p: 1 }] }, { f: [{ k: 'pt', n: 1500 }, { k: 'orb', n: 8 }, { k: 'mat', id: 'expL', n: 3 }], r: [{ k: 'orb', n: 3, p: 1 }, { k: 'mat', id: 'expL', n: 1, p: .5 }] }];
const exRw = (list, el) => list.map(r => r.k === 'orb' ? Object.assign({}, r, { k: 'mat', id: 'orb_' + el }) : r);
const levIdx = ti => A.STAGES.findIndex(st => st.ev === 'lev' && st.ti === ti);
const levLeft = () => Math.max(0, Math.ceil((A.LEV.end - Date.now()) / 864e5));
const LSHOP = [{ id: 'o炎', n: 15, lim: 5, r: { k: 'mat', id: 'orb_炎', n: 1 } }, { id: 'o水', n: 15, lim: 5, r: { k: 'mat', id: 'orb_水', n: 1 } }, { id: 'o木', n: 15, lim: 5, r: { k: 'mat', id: 'orb_木', n: 1 } }, { id: 'o光', n: 15, lim: 5, r: { k: 'mat', id: 'orb_光', n: 1 } },
  { id: 'xL', n: 12, lim: 10, r: { k: 'mat', id: 'expL', n: 1 } }, { id: 'xM', n: 4, lim: 20, r: { k: 'mat', id: 'expM', n: 1 } }, { id: 'pt', n: 20, lim: 10, r: { k: 'pt', n: 200 } }];
function levShop() {
  chFresh();
  modal('イベント交換所', (b, close) => {
    const draw = () => {
      b.innerHTML = `<p class="aMs-h">メダル <b class="aMd">${S.lev.medal}</b> 枚 ・ あと${levLeft()}日で終わり(残ったメダルは消えます)</p>`;
      const L = h('div', 'aShop'); b.appendChild(L);
      for (const it of LSHOP) { const got = S.lev.buy[it.id] || 0, left = it.lim - got; const r = h('div', 'aShr aGl', `${rwChip(it.r)}<small>あと ${left} 回</small>`);
        const bb = btn(left && S.lev.medal >= it.n ? '' : 'sub', `メダル ${it.n}`, () => { if (!left || S.lev.medal < it.n) return; S.lev.medal -= it.n; S.lev.buy[it.id] = got + 1; give([it.r]); save(); flash('交換した: ' + rwText([it.r])); draw(); }); bb.disabled = !left || S.lev.medal < it.n; r.appendChild(bb); L.appendChild(r); }
      const row = h('div', 'orow'); row.style.padding = '0'; row.appendChild(btn('sub', '閉じる', close)); b.appendChild(row);
    };
    draw();
  });
}
function renderEx(b) {
  qHead(b, { bg: 'banner-ch3', sm: 'チャレンジ', tt: '高難度', bar: '試練 → 極限 → 絶界 の順に開く', back: () => { CHSEL = null; renderNow(); } });
  const EXBG = ['banner-raid', 'ev-forest'];
  A.EXB.forEach((B, bi) => {
    const BX = h('div', 'qBox');
    BX.appendChild(qBanner({ div: 1, bg: EXBG[bi] || 'banner-raid', sm: B.el + '属性', tt: esc(B.n), bar: esc(B.d), boss: bossImg(B.key) })); BX.lastChild.style.margin = '0 0 10px';
    const T = h('div', 'qTi');
    A.EXT.forEach((X, ti) => { const op = exOpen(bi, ti), cl = !!S.ex[bi + '-' + ti]; const e = h('button', 'x' + ti + (op ? '' : ' lock') + (cl ? ' clr' : ''), `<b>${esc(X.n)}</b><small>${op ? (cl ? 'クリア済み' : '挑戦できる') : '前をクリアで開く'}</small>`); e.type = 'button';
      e.onclick = () => { if (!op) { flash('先に「' + A.EXT[ti - 1].n + '」をクリアしてください'); return; } const rw = cl ? exRw(EXRW[ti].r, B.el) : exRw(EXRW[ti].f, B.el); goSheet(exIdx(bi, ti), false, { rw: `${esc(X.d)}<br>${cl ? '勝つたびに(ときどき): ' : 'はじめてのクリア: '}${rwText(rw)}` }); }; T.appendChild(e); });
    BX.appendChild(T); b.appendChild(BX);
  });
}
const towerIdx = f => A.STAGES.findIndex(st => st.ev === 'tower' && st.fl === f);
const raidIdx = () => A.STAGES.findIndex(st => st.ev === 'raid');
const scoreIdx = () => A.STAGES.findIndex(st => st.ev === 'score');
const towerRw = f => { const r = [{ k: 'pt', n: 20 + f * 4 }]; if (f % 5 === 0) r.push({ k: 'mat', id: 'orb_' + ['炎', '水', '木', '光'][(f / 5) % 4], n: 1 }); if (f % 10 === 0) r.push({ k: 'mat', id: 'expL', n: 1 }); if (f === A.TOWER.n) r.push({ k: 'pt', n: 500 }); return r; };
const daysLeft = () => { const d = new Date(), e = new Date(d.getFullYear(), d.getMonth() + 1, 1); return Math.ceil((e - d) / 864e5); };
function scoreOf(info) { const t = A.SCORE.t; if (t === 'combo') return info.cm * 100 + Math.round(info.hp / info.hpMax * 100); if (t === 'turn') return Math.max(100, 3000 - info.turn * 120) + Math.round(info.hp / info.hpMax * 100); return Math.round(info.hp / info.hpMax * 3000) + Math.max(0, 30 - info.turn) * 5; }
let CHSEL = null;
/* (v98) 仲間内ランキング(D-120)。アーティファクトの共有データ scores/<自分のid> に今週のベストを書く。
   使えない画面(共有していない・ログインしていない)では null になるので、ランキングを出さずに遊べるようにする */
let RKP = null;
function rkApi() { if (!RKP) RKP = (async () => { try { if (!window.claude || !window.claude.use) return null; const db = await window.claude.use('db'), us = await window.claude.use('user'); if (!db || !us) return null; const id = await us.id(); return id ? { db, us, id } : null; } catch (e) { return null; } })(); return RKP; }
window.CA_SCORE = async (sc, nb) => { if (!nb) return; const r = await rkApi(); if (!r) return; try { await r.db.doc('scores/' + r.id).set({ wk: A.WKID, best: S.score.best, nick: String(S.name || '').slice(0, 10), at: Date.now() }); } catch (e) { } };
function ranking() {
  chFresh();
  if (HOST) { modal('今週のランキング', (b, close) => { b.innerHTML = '<p>きもオタレートの中のランキングは準備中です。友達との順位は、あとで出すマルチプレイといっしょに作ります。</p>'; const r = h('div', 'orow'); r.style.padding = '0'; r.appendChild(btn('sub', '閉じる', close)); b.appendChild(r); }); return; }
  modal('今週のランキング', (b, close) => {
    b.innerHTML = `<p class="aMs-h">お題「${esc(A.SCORE.n)}」 ・ 月曜日にリセット</p><div class="aRkL"><p class="onote">読み込み中…</p></div>`;
    const row = h('div', 'orow'); row.style.padding = '0'; row.appendChild(btn('sub', '閉じる', close)); b.appendChild(row);
    const box = b.querySelector('.aRkL'), to = setTimeout(() => { box.innerHTML = '<p class="onote">ランキングにつながりません。少したってから開き直してください。</p>'; }, 10000);
    rkApi().then(async r => {
      if (!r) { clearTimeout(to); box.innerHTML = '<p class="onote">ランキングは、このゲームを共有した仲間どうしで見られます。いまの画面では使えません(自己ベストはこの端末に残ります)。</p>'; return; }
      try {
        const q = await r.db.collection('scores').where('wk', '==', A.WKID).get(); clearTimeout(to);
        const L = q.docs.map(d => Object.assign({ id: d.id }, d.data())).filter(x => typeof x.best === 'number').sort((a, b) => b.best - a.best).slice(0, 50);
        if (S.score.best && !L.some(x => x.id === r.id)) { try { await r.db.doc('scores/' + r.id).set({ wk: A.WKID, best: S.score.best, nick: String(S.name || '').slice(0, 10), at: Date.now() }); L.push({ id: r.id, best: S.score.best, nick: S.name }); L.sort((a, b) => b.best - a.best); } catch (e) { } }
        if (!L.length) { box.innerHTML = '<p class="onote">まだだれも記録がありません。最初の1人になろう。</p>'; return; }
        let ps = {}; try { ps = await r.us.profiles(L.map(x => x.id)); } catch (e) { }
        box.innerHTML = ''; L.forEach((x, k) => { const d = h('div', 'rr' + (x.id === r.id ? ' me' : '') + (k < 3 ? ' t' + (k + 1) : '')); d.innerHTML = `<span class="no">${k + 1}</span><span class="nm"></span><b>${x.best.toLocaleString()}</b>`; d.querySelector('.nm').textContent = (x.nick || (ps[x.id] && ps[x.id].name) || 'だれか') + (x.id === r.id ? '(あなた)' : ''); box.appendChild(d); });
      } catch (e) { clearTimeout(to); console.warn('ranking', e); box.innerHTML = '<p class="onote">ランキングを読めませんでした。</p>' + (location.hash === '#t-rk' ? `<p class="onote">${esc(String(e && (e.code || e.message) || e))}</p>` : ''); }
    });
  });
}
function renderChal(b) {
  chFresh();
  if (CHSEL === 'tower') { renderTower(b); return; }
  if (CHSEL === 'ex') { renderEx(b); return; }
  const exN = Object.keys(S.ex).length;
  b.appendChild(qBanner({ bg: 'banner-tower', sm: '月替わり', dl: `あと${daysLeft()}日`, tt: esc(A.TOWER.name), bar: `いま <b>${S.tower.top}</b> / ${A.TOWER.n} 階 ・ 上ほど報酬アップ`, label: A.TOWER.name, onclick: () => { CHSEL = 'tower'; renderNow(); } }));
  const dc = dropChar() && hasArt(dropChar().id) ? dropChar() : null;
  b.appendChild(qBanner({ bg: 'banner-raid', sm: '今週の降臨', tt: esc(A.RAID.n), boss: raidBoss(), bar: (S.raid.win ? `今週 <b>${S.raid.win}</b> 回勝利` : `${esc(A.RAID.el)}の宝珠が手に入る`) + (dc ? `・${esc(dc.name)}が仲間になることも` : ''), label: A.RAID.n, onclick: () => goSheet(raidIdx(), false, { rw: `勝つたびに ${esc(A.RAID.el)}の宝珠 ×2${S.raid.win ? '' : '・今週はじめて勝つと 300pt'}${dc ? `<br>勝つと25%で <b>${esc(dc.name)}(★5)</b> が仲間になる(${esc(A.RAID.n)}の化身。同じキャラは凸に使える)` : ''}` }) }));
  b.appendChild(qBanner({ bg: 'banner-ch3', sm: '高難度', tt: '試練・極限・絶界', boss: bossImg('tree', '', 'b2') + bossImg('beast'), bar: `クリア <b>${exN}</b> / ${A.EXB.length * A.EXT.length}`, label: '高難度', onclick: () => { CHSEL = 'ex'; renderNow(); } }));
  b.appendChild(qBanner({ bg: 'banner-score', sm: '今週のお題', tt: 'スコアアタック<br>「' + esc(A.SCORE.n) + '」', bar: `自己ベスト <b>${S.score.best.toLocaleString()}</b> 点`, label: 'スコアアタック', onclick: () => goSheet(scoreIdx(), false, { rw: `今週のお題「${esc(A.SCORE.n)}」 ${esc(A.SCORE.d)} 自己ベスト ${S.score.best.toLocaleString()}点` }) }));
  const rb = h('button', 'qRk', '仲間のランキングを見る'); rb.type = 'button'; rb.onclick = ranking; b.appendChild(rb);
}
function renderTower(b) {
  qHead(b, { bg: 'banner-tower', sm: '月替わり', tt: esc(A.TOWER.name), bar: `いま <b>${S.tower.top}</b> / ${A.TOWER.n} 階 ・ あと${daysLeft()}日でリセット`, back: () => { CHSEL = null; renderNow(); } });
  const L = h('div', 'qL'); b.appendChild(L); let curEl = null;
  for (let f = A.TOWER.n; f >= 1; f--) {
    const i = towerIdx(f), st = A.STAGES[i], done = f <= S.tower.top, nx = f === S.tower.top + 1, bs = f % 5 === 0, sv = A.stageStrength(i, false);
    const r = h('button', 'qPl' + (nx ? ' cur' : '') + (!done && !nx ? ' lock' : '') + (bs ? ' boss' : '')); r.type = 'button';
    r.innerHTML = `<span class="cn"><b>${f}<small style="font-size:10px">階</small></b></span>${done ? '<i class="ck">✓</i>' : ''}<span class="md"><b>${f === A.TOWER.n ? '塔の主' : bs ? '番人の階' : 'ウェーブ ' + st.waves.length}${svGem(sv)}</b><span>${done ? 'クリア済み' : esc(rwText(towerRw(f)))}</span></span>${nx ? '<i class="nx">NEXT</i>' : ''}`;
    r.onclick = () => { if (!nx && !done) { flash('下の階をクリアすると開きます'); return; } goSheet(i, false, { rw: done ? 'クリア済み(報酬はもらった)' : 'はじめてクリア: ' + rwText(towerRw(f)) }); };
    if (nx) curEl = r; L.appendChild(r);
  }
  if (curEl) requestAnimationFrame(() => curEl.scrollIntoView({ block: 'center' }));
}
function evGroups() { const out = []; A.STAGES.forEach((st, i) => { if (st.ev && st.tier === 0) out.push({ g: st.grp, st, i }); }); return out; }
let EVSEL = null;   /* 開いているイベント(難易度の一覧を出す) */
function renderEvents(b) {
  if (EVSEL) { renderTiers(b, EVSEL); return; }
  chFresh();
  /* 期間限定: 大きな絵のバナー+3つの難しさ+メダルと交換所 */
  const BX = h('div', 'qBox'); BX.style.marginTop = '14px';
  BX.appendChild(qBanner(A.LEV.gb ? { div: 1, bg: 'ev-gb', rb: 'ゲームバカ', dl: `あと${levLeft()}日`, tt: esc(A.LEV.n), bar: 'グリッチゾーンに注意(中級から)' } : { div: 1, bg: LEVBG[A.LEV.boss] || 'ev-forest', rb: '期間限定', dl: `あと${levLeft()}日`, tt: esc(A.LEV.n), bar: `最後に ${esc(A.LEV.bn)} が現れる`, boss: bossImg(A.LEV.boss) }));
  BX.lastChild.style.margin = '0 0 10px';
  const GBL = !!A.LEV.gb, NT = A.STAGES.filter(st => st.ev === 'lev').length;
  const T = h('div', 'qTi' + (NT > 3 ? ' t4' : '')); for (let ti = 0; ti < NT; ti++) { const j = levIdx(ti), st = A.STAGES[j]; const e = h('button', 't' + Math.min(ti, 2) + (ti > 2 ? ' tx' : ''), GBL ? `<b>${esc(st.tier)}</b><small>メダル ${st.gbm}</small>` : `<b>${esc(st.tier)}</b><small>メダル ${st.md[0]}〜${st.md[1]}</small>`); e.type = 'button'; e.onclick = () => goSheet(j, false, { rw: GBL ? `勝つとゲーセンメダル ${st.gbm}枚${S.lev.win[ti] ? '' : '・はじめて勝つと 100pt'}` : `勝つとイベントメダル ${st.md[0]}〜${st.md[1]}枚${S.lev.win[ti] ? '' : '・はじめて勝つと 100pt'}` }); T.appendChild(e); }
  BX.appendChild(T);
  if (!GBL) { const F = h('div', 'ft'); F.innerHTML = `<span>メダル <b class="aMd">${S.lev.medal}</b> 枚</span>`; F.appendChild(btn('', '交換所', levShop)); BX.appendChild(F); }
  else { const F = h('div', 'ft'); F.innerHTML = '<span>ゲーセンメダルは、きもオタレートのゲームバカイベントで使えます</span>'; BX.appendChild(F); }
  b.appendChild(BX);
  /* (11/10) ゲームバカの限定降臨 */
  { const j = A.STAGES.findIndex(st => st.ev === 'gbr'); if (j >= 0) { const st = A.STAGES[j]; const e = qBanner({ cls: 'sm', bgCss: 'background:radial-gradient(90% 160% at 80% 50%,#ff5ad8,#2a1650 55%,#07070d)', sm: '限定降臨', dl: 'ゲームバカ', tt: esc(st.n.replace('限定降臨 ', '')), onclick: () => goSheet(j, false, { rw: `勝つとゲーセンメダル ${st.gbm}枚・25%でガチャ魔神の化身` }) }); b.appendChild(e); } }
  /* いつものイベント: 経験値の竜の巣・宝珠の祭壇 */
  for (const { g, st } of evGroups()) {
    const op = evOpen(st), tiers = [0, 1, 2].map(t => { const j = evIdx(g, t), n = bitsN(S.stars[skey(j, false)] || 0); return `<i class="${n ? 'on' : ''}">${esc(A.STAGES[j].tn)}${n ? ' ' + '★'.repeat(n) : ''}</i>`; }).join('');
    if (!op) continue;   /* 今日あいていない祭壇は出さない */
    const isExp = st.ev === 'exp';
    const e = qBanner({ cls: 'sm', bgCss: isExp ? `background-image:url(${UI}banner-exp.webp)` : `background:radial-gradient(90% 160% at 80% 50%,${elCol(st.el)},${elDeep(st.el)} 55%,#0a1236)`, extra: isExp ? '' : `<span class="orb" style="--ec:${elCol(st.el)};--ed:${elDeep(st.el)}"></span>`, sm: isExp ? 'いつでも' : '今日の祭壇', dl: isExp ? `今日あと${xpLeft()}回` : `あと${hoursLeft()}時間`, tt: esc(st.n), bar: `<span class="qPills">${tiers}</span>`, label: st.n,
      onclick: () => { EVSEL = g; renderNow(); } });
    b.appendChild(e);
  }
  const nx = altOf(1); b.appendChild(h('div', 'qNext', `<b>明日の祭壇</b>${nx.map(el => `<span>${elGem(el, 20)}${esc(el)}の宝珠の祭壇</span>`).join('')}`));
  b.appendChild(h('p', 'onote', 'どのイベントも 初級・中級・上級 があります。上ほど敵が強く、いい素材が出ます。宝珠の祭壇は毎日2つずつ、「炎・木」と「水・光」が交互に開きます。'));
}
/* 難易度の一覧(簡単なのが上)。行に 強さ・★・必ず出る物。押すと確認の板 */
function dropSum(st) {
  const ids = [...new Set(st.drops.map(d => d.id))].slice(0, 2);
  return ids.map(id => { const sure = st.drops.filter(d => d.id === id && d.p >= 1).reduce((a, d) => a + d.n, 0); return `<span class="dp">${matIcon(id)}<i class="${sure ? '' : 'mb'}">${sure ? '×' + sure : 'ときどき'}</i></span>`; }).join('');
}
function renderTiers(b, g) {
  const st0 = A.STAGES[evIdx(g, 0)], isExp = st0.ev === 'exp';
  qHead(b, { bgCss: isExp ? `background-image:url(${UI}banner-exp.webp)` : `background:radial-gradient(90% 160% at 80% 50%,${elCol(st0.el)},${elDeep(st0.el)} 55%,#0a1236)`, sm: 'イベント', tt: esc(st0.n), bar: '難易度を選んでください', back: () => { EVSEL = null; renderNow(); } });
  const L = h('div', 'qL'); b.appendChild(L); const last = S.evt[g];
  for (let t = 0; t < 3; t++) {
    const i = evIdx(g, t), st = A.STAGES[i], bits = S.stars[skey(i, false)] || 0, sv = A.stageStrength(i, false);
    const r = h('button', `qPl t${t}${t === last ? ' cur' : ''}`); r.type = 'button';
    r.innerHTML = `<span class="cn"><b class="s">${esc(st.tn)}</b></span><span class="md"><b>ウェーブ ${st.waves.length}${svGem(sv)}</b><span>${dropSum(st)}</span></span><span class="rt"><span class="st3">${[0, 1, 2].map(k => `<i class="${bits >> k & 1 ? 'on' : ''}">★</i>`).join('')}</span>${(bits & 7) === 7 ? '<i class="fr2">スキップ可</i>' : ''}</span><span class="ar2">›</span>`;
    r.setAttribute('aria-label', `${st.n} ${st.tn}`);
    r.onclick = () => goSheetEv(g, t); L.appendChild(r);
  }
  if (isExp) b.insertBefore(h('div', 'xpLeft', `今日の挑戦 あと <b>${xpLeft()}</b> / ${XP_MAX} 回<small>(初級・中級・上級あわせて。朝5時に戻る)</small>`), L);
  b.appendChild(h('p', 'onote', '◆ は敵の強さ。最初から全部の難易度に挑戦できます。'));
}
function goSheetEv(g, t) {
  if (typeof g === 'number') { t = A.STAGES[g].tier || 0; g = A.STAGES[g].grp; }
  if (t == null) t = S.evt[g] != null ? S.evt[g] : 0;
  S.evt[g] = t; save(); if (EVSEL === g) renderNow();
  document.querySelectorAll('.aGo').forEach(e => e.remove());
  const i = evIdx(g, t), st = A.STAGES[i], sv = A.stageStrength(i, false);
  const o = h('div', 'aGo'); const sh = h('div', 'sh'); o.appendChild(sh);
  const drops = [...new Set(st.drops.map(d => d.id))].map(id => { const sure = st.drops.some(d => d.id === id && d.p >= 1); return `<span class="${sure ? 'nw' : ''}">${matIcon(id)}${esc(MATS[id].name)}${sure ? '<small>確定</small>' : ''}</span>`; }).join('');
  sh.innerHTML = `<div class="tt"><b class="tb t${t}">${esc(st.tn)}</b><span>${esc(st.n)}</span></div><p>${esc(st.d)}</p><div class="inf"><span>ウェーブ ${st.waves.length}</span><span>敵の強さ <i class="sv">${'■'.repeat(sv)}</i></span></div><div class="inf drp">${drops}</div>${starBox(i, false, true)}<div class="orow"></div>`;
  const close = () => o.remove(); const r = sh.querySelector('.orow'); const bk = btn('sub', 'もどる', close); bk.style.flex = '0 0 26%'; r.append(bk);
  if (((S.stars[skey(i, false)] || 0) & 7) === 7) { const sk = btn('sub', 'スキップ', () => { close(); skipStage(i, false); }); sk.style.flex = '0 0 28%'; r.append(sk); }
  if (MPC.ok()) { const mb = btn('sub', 'マルチ募集', () => { close(); mpCreate(i, false); }); mb.style.flex = '0 0 28%'; r.append(mb); }
  const go = btn('shine', `${esc(st.tn)}に出撃`, () => { close(); if (canGo()) A.startStage(i, false); }); r.append(go);
  if (st.ev === 'exp') { r.insertAdjacentHTML('beforebegin', `<p class="xpNote">今日の挑戦 あと <b>${xpLeft()}</b> / ${XP_MAX} 回</p>`); if (!xpLeft()) { go.disabled = true; go.innerHTML = '今日はもう挑戦できません'; r.querySelectorAll('button').forEach(x => { if (x.textContent === 'スキップ') x.disabled = true; }); } }
  o.addEventListener('click', e => { if (e.target === o) close(); }); lay.appendChild(o);
}
/* ===== (11/9) マルチ(協力)。4人まで・1人1体・部屋の4けたの番号で入る(山本さん)
   - 募集した人(host)が「始める」。チームは 参加した人のキャラ(入った順)+足りない枠は募集した人の編成から
   - 手は部屋の mv に1つずつ足し、全員の端末で同じ順に打つ(index.html の mpShot/mpSkill)。手が終わると、募集した人の盤面(sn)で合わせなおす
   - 番が来て30秒たったら自動で引く。抜けた人の番は募集した人が動かす
   - 初回クリア・★・はじめての週・塔の上の階などの報酬はなし。ドロップ・イベントメダル・降臨の仲間はある ===== */
const MPC = { code: null, room: null, unsub: null, ai: 0, play: false, hb: null, pump: null, tKey: -1, tAt: 0, snK: -1, fix: 0, endSent: false,
  ok: () => !!(HOST && HOST.room && HOST.room.me()) };
const mpVer = () => { try { return (location.search.match(/v=(\d+)/) || [])[1] || 'dev'; } catch (e) { return 'dev'; } };
const mpPack = u => ({ id: u.id, lv: u.lv, evo: u.evo ? 1 : 0, tot: totOf(u), pm: +mult(u).toFixed(4), ab: abilOf(u), sc: skCut(u) });
/* (11/9) 連れていくのは自分の編成のキャラ。リーダースキルは自分の編成のリーダーのもの(山本さん) */
const mpLeadU = () => { const T = teamUnits(); return T[Math.max(0, T.findIndex(x => x.id === S.lead))] || T[0]; };
const mpLd = () => { const u = mpLeadU(), r = u && A.ROSTER[u.id]; return r ? { lead: r.lead, ln: r.ln, by: r.name } : null; };
const mpMe = () => (HOST && HOST.room && HOST.room.me()) || { pid: '?', n: '' };
const mpMem = () => (MPC.room && MPC.room.mem) || {};
const mpAbsent = pid => { const m = mpMem()[pid]; return !m || m.left || (Date.now() - (m.at || 0) > 30000); };
/* 枠(0〜3)の持ち主 */
function mpSlots() { const R = MPC.room; if (!R) return []; if (Array.isArray(R.sl) && R.sl.length) return R.sl.map(x => ({ pid: x.p, u: x.u })); const M = R.mem || {}, out = [];
  for (const pid of (R.order || [])) if (M[pid] && M[pid].u) out.push({ pid, u: M[pid].u });
  const hostFill = (M[R.host] && M[R.host].fill) || [];
  for (const u of hostFill) { if (out.length >= 4) break; if (!out.some(x => x.u.id === u.id)) out.push({ pid: R.host, u, fill: 1 }); }
  return out.slice(0, 4); }
const mpOwner = s => { const L = mpSlots(); return L[s] ? L[s].pid : (MPC.room && MPC.room.host); };
const mpIsHost = () => MPC.room && MPC.room.host === mpMe().pid;
function mpErr(e) {
  const m = String((e && (e.code || e.message)) || e || ''); console.warn('マルチ: エラー', e);
  const t = /permission|insufficient/i.test(m) ? '部屋に書きこむ許可がありませんでした(ルールの問題)' : /unavailable|network|offline/i.test(m) ? '電波が弱いか、つながっていません' : /ログイン/.test(m) ? m : 'うまくいきませんでした';
  modal('マルチ', (b, close) => { b.innerHTML = `<p style="text-align:center">${esc(t)}</p><p class="onote" style="font-size:10px;opacity:.6;word-break:break-all">${esc(m.slice(0, 160))}</p>`; const r = h('div', 'orow'); r.style.padding = '10px 0 0'; r.append(btn('', 'OK', close)); b.appendChild(r); });
}
/* 募集する */
async function mpCreate(i, hd) {
  const st = A.STAGES[i]; if (!canGo()) return;
  if (st.ev === 'exp' && !xpLeft()) { flash('経験値の竜の巣は今日はもう挑戦できません'); return; }
  const lead = mpLeadU();
  try { const code = await HOST.room.create({ st: i, hd, seed: (Math.random() * 4294967296) >>> 0, ver: mpVer(), m: { u: mpPack(lead), ld: mpLd(), pt: teamUnits().map(mpPack), at0: Date.now() } }); mpOpen(code); } catch (e) { mpErr(e); }
}
/* 番号で入る */
function mpJoinAsk() {
  modal('マルチに参加', (b, close) => {
    b.innerHTML = `<p class="onote" style="margin:0 0 8px">募集した人から聞いた、部屋の4けたの番号を入れてください。募集は、クエストのステージを開いて「マルチ募集」から。</p><input inputmode="numeric" maxlength="4" pattern="[0-9]*" style="width:100%;font:900 32px var(--zk);letter-spacing:.4em;text-align:center;padding:8px;border-radius:10px;border:2px solid #c9a14a;background:#fff;color:#1a1530">`;
    const inp = b.querySelector('input'); setTimeout(() => inp.focus(), 50);
    const r = h('div', 'orow'); r.style.padding = '12px 0 0'; b.appendChild(r);
    r.append(btn('sub', 'やめる', close), btn('shine', '参加する', async () => {
      const code = (inp.value || '').replace(/\D/g, ''); if (code.length !== 4) { flash('4けたの番号を入れてください'); return; }
      if (await mpJoinCode(code)) close();
    }));
  });
}
async function mpJoinCode(code) {
  const u = mpLeadU(); if (!u) { flash('キャラがいません'); return false; }
  try { const res = await HOST.room.join(code, { u: mpPack(u), ld: mpLd(), pt: teamUnits().map(mpPack), at0: Date.now() }); if (res !== 'ok') { flash({ none: 'その番号の部屋はありません', started: 'その部屋はもう始まっています', full: 'その部屋は4人そろっています' }[res] || 'はいれませんでした'); return false; } mpOpen(code); return true; } catch (e) { mpErr(e); return false; }
}
/* 部屋の画面(待つ間) */
function mpOpen(code) {
  mpLeave(true); MPC.code = code; MPC.ai = 0; MPC.play = false; MPC.snK = -1; MPC.fix = 0; MPC.endSent = false; MPC.endAt = 0;
  const o = h('div', 'aGo mpLobby'); const sh = h('div', 'sh'); o.appendChild(sh); lay.appendChild(o); MPC.lobby = o;
  const draw = () => { const R = MPC.room; if (!R) { sh.innerHTML = '<p style="text-align:center">部屋を読みこんでいます…</p>'; return; }
    const st = A.STAGES[R.st], me = mpMe().pid, host = R.host === me, M = R.mem || {}, pids = Object.keys(M).sort((a, b) => (M[a].at0 || M[a].at || 0) - (M[b].at0 || M[b].at || 0));
    const hostFirst = [R.host, ...pids.filter(p => p !== R.host)].filter(p => M[p]);
    const ver = R.ver && R.ver !== mpVer();
    sh.innerHTML = `<div class="tt"><b class="tb">マルチ</b><span>${esc(st ? st.n : '')}${R.hd ? '(ハード)' : ''}</span></div>
      <div style="text-align:center;margin:6px 0 10px"><small style="opacity:.8">部屋の番号(LINEなどで伝えてください)</small><div style="font:900 44px/1.1 var(--zk);letter-spacing:.25em;color:#ffd36a">${esc(code)}</div></div>
      ${ver ? '<p class="onote" style="color:#ff8a8a">アプリの版がちがいます。アプリを閉じて開き直してください。</p>' : ''}
      <div class="mpMem" style="display:grid;gap:6px">${[0, 1, 2, 3].map(k => { const p = hostFirst[k], m = p && M[p];
        if (!m) return `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.08);opacity:.6"><span style="width:44px;height:44px;border-radius:8px;background:rgba(255,255,255,.1)"></span><span>あき(2人なら1人2体ずつ、3人なら募集した人が2体)</span></div>`;
        const c = m.u && CH[m.u.id];
        return `<div class="mpRow" data-pid="${esc(p)}" data-n="${esc(m.n || '')}" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.14);cursor:pointer"><img alt="" src="${c ? bigFaceURL(c.id, m.u.evo) : ''}" style="width:44px;height:44px;border-radius:8px;object-fit:cover"><span style="flex:1;min-width:0"><b>${esc(m.n || '')}</b>${p === R.host ? ' <small style="color:#ffd36a">募集した人</small>' : ''}${p === me ? ' <small>(あなた)</small>' : ''}<br><small>${c ? esc(c.name) + ' Lv' + m.u.lv + (m.u.evo ? '・★6' : '') : 'キャラを選んでいます'}${m.ld ? '<br>リーダースキル: ' + esc(m.ld.ln) : ''}</small></span></div>`; }).join('')}</div>
      <div class="orow" style="margin-top:12px"></div>`;
    sh.querySelectorAll('.mpRow').forEach(e => e.onclick = () => profOpen(e.dataset.pid, e.dataset.n));
    const r = sh.querySelector('.orow');
    r.append(btn('sub', host ? '解散する' : '抜ける', () => mpLeave(false)), btn('sub', 'キャラを選ぶ', mpPick));
    if (host) r.append(btn('shine', '始める', mpStart));
    else r.insertAdjacentHTML('afterend', '<p class="onote" style="text-align:center;margin:8px 0 0">募集した人が始めるのを待っています</p>');
  };
  MPC.draw = draw; draw();
  MPC.unsub = HOST.room.watch(code, R => { const was = MPC.room; MPC.room = R;
    if (!R) { if (MPC.play) { flash('部屋がなくなりました'); } mpLeave(true); return; }
    if (!MPC.play && R.state === 'play') mpBegin();
    else if (!MPC.play) draw();
    if (MPC.play) mpPump(); });
  MPC.hb = setInterval(() => { if (MPC.code) HOST.room.mine(MPC.code, {}).catch(() => { }); }, 10000);
}
function mpPick() {
  const R = MPC.room; if (!R) return; const me = mpMe().pid, M = R.mem || {};
  const taken = new Set(Object.keys(M).filter(p => p !== me && M[p].u).map(p => M[p].u.id));
  modal('連れていくキャラ', (b, close) => {
    b.innerHTML = '<p class="onote" style="margin:0 0 8px">自分の編成の中から1体。ほかの人が選んだキャラは選べません。リーダースキルは、いつも自分の編成のリーダーのものになります。2人(や3人の募集した人)は、編成の次のキャラがもう1体、自動で入ります。</p>'; const g = h('div', 'ogrid'); g.style.maxHeight = '50vh'; g.style.overflowY = 'auto'; b.appendChild(g);
    const seen = new Set(); for (const u of teamUnits()) { if (seen.has(u.id)) continue; seen.add(u.id); const e = icon(u); if (taken.has(u.id)) e.style.opacity = '.3'; else e.onclick = async () => { close(); try { await HOST.room.mine(MPC.code, { u: mpPack(u), ld: mpLd() }); } catch (er) { mpErr(er); } }; g.appendChild(e); }
  });
}
async function mpStart() {
  const R = MPC.room; if (!R || !mpIsHost()) return; const M = R.mem || {};
  const pids = [R.host, ...Object.keys(M).filter(p => p !== R.host && !M[p].left && M[p].u).sort((a, b) => (M[a].at0 || 0) - (M[b].at0 || 0))];
  const ids = new Set(pids.map(p => M[p].u.id)); if (ids.size !== pids.length) { flash('同じキャラを選んでいる人がいます'); return; }
  if (pids.length < 2) { flash('ほかの人が入るのを待ってください(1人なら、ふつうに出撃できます)'); return; }
  if (!staCan()) { staOut(); return; }
  /* (11/9 山本さん) 2人なら2体ずつ(交互)、3人なら募集した人が2体・ほかは1体、4人なら1体ずつ */
  const used = new Set(ids), second = p => { const L = (M[p].pt || []).filter(u => !used.has(u.id)); const u = L[0]; if (u) used.add(u.id); return u; };
  let sl = pids.map(p => ({ p, u: M[p].u }));
  if (pids.length === 2) { const a2 = second(pids[0]), b2 = second(pids[1]); sl = [sl[0], sl[1]]; if (a2) sl.push({ p: pids[0], u: a2 }); if (b2) sl.push({ p: pids[1], u: b2 }); }
  else if (pids.length === 3) { const a2 = second(pids[0]); if (a2) sl.push({ p: pids[0], u: a2 }); }
  for (const u of teamUnits().map(mpPack)) { if (sl.length >= 4) break; if (!used.has(u.id)) { used.add(u.id); sl.push({ p: R.host, u }); } }   /* 足りなければ募集した人のキャラで */
  try { if (await HOST.room.host(MPC.code, { order: pids, sl: sl.slice(0, 4), state: 'play' })) staUse(); } catch (e) { mpErr(e); }
}
/* 全員: 始まった。チームを組んで、同じ種で出撃 */
function mpBegin() {
  const R = MPC.room, L = mpSlots(); if (!R || L.length < 1) return;
  if (!(R.mem || {})[mpMe().pid]) { flash('この部屋のメンバーではありません'); mpLeave(true); return; }
  MPC.play = true; if (MPC.lobby) { MPC.lobby.remove(); MPC.lobby = null; }
  window.CA_TEAM = L.map(x => x.u.id); window.CA_PARTY = Object.fromEntries(L.map(x => [x.u.id, x.u.pm])); window.CA_ABIL = Object.fromEntries(L.map(x => [x.u.id, x.u.ab || []]));
  window.CA_EVO = Object.fromEntries(L.map(x => [x.u.id, x.u.evo ? 1 : 0])); window.CA_SKCUT = Object.fromEntries(L.map(x => [x.u.id, x.u.sc || 0])); window.CA_SKIN = {}; window.CA_LEAD = 0;
  window.CA_MP = { mine: s => { const o = mpOwner(s), me = mpMe().pid; return o === me || (mpIsHost() && mpAbsent(o)); },
    name: s => { const o = mpOwner(s), m = mpMem()[o]; return (m ? m.n : '') + (mpAbsent(o) && o !== mpMe().pid ? '(代わりに募集した人)' : ''); },
    lead: s => { const m = mpMem()[mpOwner(s)]; return m && m.ld; },
    send: mv => mpSend(mv), idle: s => { MPC.tKey = MPC.ai; MPC.tAt = Date.now(); } };
  A.__CA_MPON = true; window.__CA.mpOn(R.seed >>> 0);
  A.startStage(R.st, !!R.hd);
  if (!MPC.pump) MPC.pump = setInterval(mpPump, 300);
}
async function mpSend(mv) {
  const G = window.__CA.G; if (!MPC.code || !MPC.room) { G.mpWait = false; return; } const k = (MPC.room.mv || []).length;
  try { const ok = await HOST.room.move(MPC.code, Object.assign({ k, by: mpMe().pid, t: Date.now() }, mv)); if (!ok) { G.mpWait = false; mpSay('ほかの手が先に届きました。もう一度引いてください'); } }
  catch (e) { G.mpWait = false; console.warn('マルチ: 手を送れない', e); mpSay('手を送れませんでした(' + String(e && (e.code || e.message) || e).slice(0, 60) + ')。もう一度引いてください'); }
}
/* バトル中は外の画面のお知らせが見えないので、バトルの画面に出す */
function mpSay(t) { try { const ht = document.getElementById('ht'), hb = document.getElementById('hint'); if (ht) ht.textContent = t; if (hb) hb.style.opacity = 1; } catch (e) { } flash(t); }
/* 手を順に打つ・合わせなおす・30秒の自動・終わり */
function mpPump() {
  if (!MPC.play || !MPC.room) return; const C = window.__CA, G = C.G, R = MPC.room, mv = R.mv || [];
  const idle = G.phase === 'idle' && !G.busy && !G.over;
  if (idle && MPC.ai < mv.length) { const m = mv[MPC.ai]; const ok = m.ty === 'skill' ? C.mpSkill(MPC.ai, m.i, m.pre) : C.mpShot(MPC.ai, { x: m.x, z: m.z }, m.p, m.bu, m.pre); if (ok) { MPC.ai++; G.mpWait = false; } return; }
  if (idle && MPC.ai === mv.length) {
    const sn = R.sn || {};
    if (mpIsHost() && MPC.snK < MPC.ai && MPC.ai > 0) { MPC.snK = MPC.ai; const d = C.mpSnap(); HOST.room.snap(MPC.code, { k: MPC.ai, h: C.mpHash(d), d: JSON.stringify(d) }).catch(e => console.warn('マルチ: まとめ', e)); }
    if (!mpIsHost() && sn.k === MPC.ai && MPC.snK < sn.k) { MPC.snK = sn.k; if (C.mpHash(C.mpSnap()) !== sn.h) { C.mpApply(sn.d); MPC.fix++; console.warn('マルチ: 盤面を合わせなおした', sn.k); } }
    /* 30秒たったら自動で引く(番の人、または募集した人が少し遅れて) */
    const s = C.mpSlot(), mine = window.CA_MP.mine(s), wait = Date.now() - MPC.tAt;
    if (MPC.tKey === MPC.ai && !G.mpWait && ((mine && wait > 30000) || (mpIsHost() && wait > 36000))) { MPC.tAt = Date.now() + 99999; const e = G.bodies.filter(b => b.alive && b.k !== 'ally'); let x = 0, z = 0; for (const b of e) { x += b.x; z += b.z; } const n = e.length || 1; G.mpWait = true; mpSend({ ty: 'shot', x: +(x / n).toFixed(3), z: +(z / n).toFixed(3), p: .8, bu: 0, auto: 1, pre: JSON.stringify(C.mpSnap()) }); }
    if (mine && MPC.tKey === MPC.ai && wait > 20000 && wait < 30000) { const left = Math.ceil((30000 - wait) / 1000); const ht = document.getElementById('ht'); if (ht) ht.textContent = 'あなたの番 ─ あと' + left + '秒で自動で引きます'; }
  }
  /* 募集した人が終わったのに、自分の画面がまだ続いているときは、募集した人の結果に合わせる */
  if (!mpIsHost() && R.state === 'end' && R.res && !G.over) { MPC.endAt = MPC.endAt || Date.now(); if (Date.now() - MPC.endAt > 4000 && G.phase === 'idle') { try { R.res.win ? C.stageClear() : C.stageFail(); } catch (e) { } } }
  if (G.over && !MPC.endSent) { MPC.endSent = true; if (mpIsHost()) HOST.room.host(MPC.code, { state: 'end', res: { win: G.hp > 0, t: Date.now() } }).catch(() => { }); setTimeout(() => { if (MPC.play) mpLeave(true); }, 2500); }
}
function mpLeave(quiet) {
  const code = MPC.code, wasHost = mpIsHost();
  if (MPC.unsub) { try { MPC.unsub(); } catch (e) { } } clearInterval(MPC.hb); clearInterval(MPC.pump); MPC.unsub = null; MPC.hb = null; MPC.pump = null;
  if (MPC.lobby) { MPC.lobby.remove(); MPC.lobby = null; }
  if (code && !quiet) { if (wasHost) HOST.room.del(code); else HOST.room.mine(code, { left: true }).catch(() => { }); }
  MPC.code = null; MPC.room = null; MPC.play = false; window.CA_MP = null; try { if (window.__CA) window.__CA.mpOff(); } catch (e) { } try { syncParty(); } catch (e) { }
}
window.__MP = { MPC, create: mpCreate, join: mpJoinCode, start: mpStart, slots: mpSlots };   /* 確認用 */
/* マルチで勝ったときの報酬: 初回・★・はじめての週などはなし */
function multiClear(st, info) {
  const rewards = []; let msg = 'マルチで勝った! ';
  if (st.ev === 'lev') { const m = st.md[0] + Math.floor(Math.random() * (st.md[1] - st.md[0] + 1)); S.lev.medal += m; S.lev.win[st.ti]++; msg += `イベントメダル ${m}枚(いま ${S.lev.medal}枚)。`; }
  else if (st.ev === 'raid') { for (const d of st.drops) for (let k = 0; k < d.n; k++) if (Math.random() < d.p) rewards.push({ k: 'mat', id: d.id, n: 1 }); S.raid.win++; wmFresh(); S.wm.raid++; const dc = raidDrop(); if (dc) msg += dc; }
  else if (st.ev === 'ex') { const R = EXRW[st.ti]; if (R && R.r) for (const r of exRw(R.r, st.el)) if (Math.random() < (r.p || 1)) rewards.push({ k: r.k, id: r.id, n: r.n }); }
  else if (st.ev === 'tower' || st.ev === 'score') { msg += '(塔・スコアアタックはマルチでは報酬なし)'; }
  else { rewards.push(...repeatDrops(st, info.i, !!info.h)); }
  const merged = {}; for (const r of rewards) { const k = r.k === 'pt' ? 'pt' : r.id; merged[k] = merged[k] ? Object.assign({}, merged[k], { n: merged[k].n + r.n }) : Object.assign({}, r); }
  const rw = Object.values(merged); give(rw); dmFresh(); S.dm.win++; wmFresh(); S.wm.win++; save(); LAST = null;
  return msg + (rw.length ? '手に入れた: ' + rwText(rw) : '');
}
/* 戦闘で勝ったら呼ばれる。手に入れた物を足して、結果画面に出す文を返す */
window.CA_OUT = { onClear: (st, info) => onClearStage(st, info || {}) };

/* ---------- キャラ(BOX・編成・強化・素材) ---------- */
function sortedUnits() { return [...S.units].sort((a, b) => rarOf(b) - rarOf(a) || mult(b) - mult(a) || a.u - b.u); }
function inParty(u) { return S.team.includes(u.u); }
function renderChara() {
  const b = shell('キャラ', 'CHARACTERS', { tabs: [['box', 'BOX'], ['party', '編成'], ['power', '強化'], ['mats', '素材']] });
  ({ box: charaBox, party: charaParty, power: charaPower, mats: charaMats })[SUB.chara](b);
}

{ const st = document.createElement('style'); st.textContent = `
.aPwB{display:flex;gap:6px;margin:0 0 6px}.aPwB .aBtn,.aPwB button{flex:1 1 0;min-width:0;min-height:36px;padding:0 4px;font-size:12.5px;white-space:nowrap}
.bxHd{display:flex;align-items:center;gap:10px;margin:0 0 8px;padding:8px 10px;border-radius:10px;background:#0c1538;box-shadow:inset 0 0 0 1px rgba(232,200,120,.35)}
.bxN{flex:none;display:flex;align-items:baseline;gap:4px;font:900 13px var(--zk);color:#c3cbe6}
.bxN b{font-size:22px;line-height:1;color:#fff}
.bxN em{font-style:normal;margin-left:4px;padding:1px 7px;border-radius:99px;font-size:11px;color:#fff;background:#e0304a}
.bxBar{flex:1 1 auto;min-width:30px;height:8px;border-radius:99px;background:#1c2756;overflow:hidden}
.bxBar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#67e8f9,#8b7bff)}
.bxHd.near .bxBar i{background:linear-gradient(90deg,#ffd76a,#ff9a3a)}
.bxHd.full .bxBar i{background:#e0304a}
.bxEx{flex:none;border:0;cursor:pointer;height:32px;padding:0 12px;border-radius:8px;font:900 13px var(--zk);color:#2b1a02;background:linear-gradient(#fff3c4,#e8b84a)}
.bxEx:disabled{opacity:.5;cursor:default}
.bxCt{display:flex;align-items:center;gap:6px;margin:0 0 10px}
.bxEl{display:flex;gap:4px;flex:none}
.bxEl button{width:34px;height:34px;border:0;border-radius:8px;cursor:pointer;display:grid;place-items:center;font:900 13px var(--zk);color:#c3cbe6;background:#0e1842;box-shadow:inset 0 0 0 1px rgba(232,200,120,.25);opacity:.55}
.bxEl button[aria-pressed="true"]{opacity:1;box-shadow:inset 0 0 0 2px #ffd76a;color:#fff}
.bxSel{flex:1 1 0;min-width:0;position:relative}
.bxSel select{width:100%;height:34px;padding:0 20px 0 8px;border:0;border-radius:8px;font:800 13px var(--zk);color:#fff;background:#0e1842;box-shadow:inset 0 0 0 1px rgba(232,200,120,.35);appearance:none;-webkit-appearance:none}
.bxSel::after{content:"▾";position:absolute;right:7px;top:50%;transform:translateY(-50%);font-size:12px;color:#ffd76a;pointer-events:none}
.bxDir{flex:none;width:34px;height:34px;border:0;border-radius:8px;cursor:pointer;font:900 13px var(--zk);color:#ffd76a;background:#0e1842;box-shadow:inset 0 0 0 1px rgba(232,200,120,.35)}
.bxSec{display:flex;align-items:center;gap:8px;margin:12px 0 8px;padding:5px 10px;border-radius:8px;font:900 14px var(--zk);color:#fff;background:linear-gradient(90deg,rgba(255,215,106,.26),rgba(255,215,106,0))}
.bxSec:first-of-type{margin-top:0}
.bxSec b{font-size:16px;color:#ffd76a}
.bxSec span{font-size:12px;color:#ffe7a1}
.bxSec i{margin-left:auto;font-style:normal;font-size:12px;color:#c3cbe6}
.bxSec.r6{background:linear-gradient(90deg,rgba(255,150,220,.3),rgba(120,210,255,.2),rgba(255,226,122,0))}
.bxSec.r4{background:linear-gradient(90deg,rgba(190,205,240,.22),rgba(190,205,240,0))}.bxSec.r4 b{color:#dfe6fb}
.bxSec.r3{background:linear-gradient(90deg,rgba(200,170,120,.2),rgba(200,170,120,0))}.bxSec.r3 b{color:#d9c19a}
.bxG{grid-template-columns:repeat(4,1fr);gap:8px 7px;margin-bottom:4px}
.aCard.bx{aspect-ratio:auto;padding-bottom:17px}
.aCard.bx .fr{inset:0 0 17px 0;aspect-ratio:1;height:auto;position:relative;display:block}
.aCard.bx .lv,.aCard.bx .aSt{display:none}
.aCard.bx .pic::after{height:34%}
.aCard.bx .aG{width:19px;height:19px;font-size:10px}
.aCard.bx .bxB{position:absolute;left:2px;right:2px;bottom:2px;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:1px 5px;border-radius:0 0 5px 5px;background:rgba(6,10,30,.82);font:900 12px var(--zk);color:#fff}
.aCard.bx .bxB i{font-style:normal;color:#ffd76a}
.aCard.bx.r6 .bxB i{color:#ffb0ec}
.aCard.bx.r4 .bxB i{color:#dfe6fb}.aCard.bx.r3 .bxB i{color:#d9c19a}
.aCard.bx .bxNm{position:absolute;left:0;right:0;top:100%;margin-top:2px;font:700 10.5px/15px var(--zk);color:#dfe5fb;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.aCard.bx em{top:-6px;font-size:10px;line-height:16px}
`; document.head.appendChild(st); }
/* (11/8 山本さん「BOXが見にくい」) 並び替えを5つ(新しい順・レア・レベル・属性・名前)+ 上下の切りかえ、レアの絞り込み。選んだ並びは覚えておく(パズドラの並び替え・絞り込みを参考に、このゲームに要るものだけ) */
const BOXF = Object.assign({ el: 'all', rar: 0, sort: 'rar', asc: false }, (() => { try { return JSON.parse(localStorage.getItem('ca_boxf') || '{}'); } catch (e) { return {}; } })());
const boxfSave = () => { try { localStorage.setItem('ca_boxf', JSON.stringify(BOXF)); } catch (e) { } };
const BOXSORT = [['new', '新しい順'], ['rar', 'レア順'], ['lv', 'レベル順'], ['el', '属性順'], ['name', '名前順']];
function boxSort(list) {
  const ord = { 炎: 0, 水: 1, 木: 2, 光: 3 }, tie = (a, c) => rarOf(c) - rarOf(a) || c.lv - a.lv || c.u - a.u;
  const f = { new: (a, c) => c.u - a.u, rar: (a, c) => rarOf(c) - rarOf(a) || mult(c) - mult(a) || c.u - a.u, lv: (a, c) => c.lv - a.lv || tie(a, c), el: (a, c) => ord[CH[a.id].el] - ord[CH[c.id].el] || tie(a, c), name: (a, c) => CH[a.id].name.localeCompare(CH[c.id].name, 'ja') || tie(a, c) }[BOXF.sort] || ((a, c) => 0);
  const L = list.sort(f); return BOXF.asc ? L.reverse() : L;
}
function boxExpand(after) {
  if (boxCap() >= BOX_MAX) { flash('BOXはこれ以上広げられません'); return; }
  modal('BOXを広げる', (b, close) => {
    b.innerHTML = `<p style="text-align:center">${BOX_COST}pt で <b>+${BOX_STEP}体</b> 広げます<br><span style="font-size:12px">${boxCap()}体 → ${Math.min(BOX_MAX, boxCap() + BOX_STEP)}体(最大${BOX_MAX}体) ・ いまのpt ${ptNow().toLocaleString()}</span></p>`;
    const r = h('div', 'orow'); r.style.padding = '0'; r.append(btn('sub', 'やめる', close), btn('shine', '広げる', () => { if (!ptSpend(BOX_COST, 'sta')) { flash('ptが足りません'); return; } S.cap = Math.min(BOX_MAX, boxCap() + BOX_STEP); save(); close(); flash('BOXが ' + boxCap() + '体 になりました'); renderNow(); if (after) after(); })); b.appendChild(r);
  });
}
/* BOXに空きが足りないとき。n=これから増える数(出撃は0) */
function boxFullAsk(n) {
  modal('BOXがいっぱいです', (b, close) => {
    const need = S.units.length + (n || 1) - boxCap();
    b.innerHTML = `<p style="text-align:center">いま <b>${S.units.length} / ${boxCap()}体</b><br>${n ? 'あと ' + need + '体ぶんの空きが要ります。' : '空きを1体ぶん作ると出撃できます。'}</p><p class="onote" style="text-align:center">「強化」で素材にする・同じキャラを重ねると、数を減らせます。</p>`;
    const r = h('div', 'orow'); r.style.padding = '0'; r.append(btn('sub', 'BOXを整理する', () => { close(); document.querySelectorAll('.aSheet').forEach(x => x.remove()); TAB = 'chara'; SUB.chara = 'power'; showOut('chara'); renderNow(); }));
    if (boxCap() < BOX_MAX) r.append(btn('shine', BOX_COST + 'ptで広げる', () => { close(); boxExpand(); })); b.appendChild(r);
  });
}
function charaBox(b) {
  /* (11/11) 山本さん「ボックスが見にくい」(2回目): 上の絞り込みが4段もあって絵が小さく見えていた。
     参考: モンストのBOX(上に数/上限、並び替えは1つのボタン)、パズドラ(レアごとに枠の色)。まねではなく考え方だけ。
     上は2段だけ(数と上限 / 属性・レア・並び)。一覧はレアごとに見出しで区切り、下の帯に Lv と ★の数字をはっきり出す */
  const n = S.units.length, cap = boxCap(), hd = h('div', 'bxHd' + (n >= cap ? ' full' : n >= cap - 5 ? ' near' : ''));
  hd.innerHTML = `<div class="bxN"><b>${n}</b><span>/ ${cap}体</span>${n >= cap ? '<em>いっぱい</em>' : ''}</div><div class="bxBar"><i style="width:${Math.min(100, n / cap * 100)}%"></i></div>`;
  const ex = h('button', 'bxEx', cap >= BOX_MAX ? '最大' : '+ 広げる'); ex.type = 'button'; ex.disabled = cap >= BOX_MAX; ex.onclick = () => boxExpand(); hd.appendChild(ex); b.appendChild(hd);
  const ct = h('div', 'bxCt'), els = h('div', 'bxEl');
  for (const el of ['all', '炎', '水', '木', '光']) { const x = h('button', el === 'all' ? 'all' : '', el === 'all' ? '全' : elGem(el, 20)); x.type = 'button'; x.setAttribute('aria-pressed', String(BOXF.el === el)); x.setAttribute('aria-label', el === 'all' ? 'すべての属性' : el + '属性だけ'); x.onclick = () => { BOXF.el = el; boxfSave(); renderNow(); }; els.appendChild(x); }
  const sel = (opts, val, fn, label) => { const w = h('label', 'bxSel'), se = document.createElement('select'); se.setAttribute('aria-label', label); for (const [v, t] of opts) { const o = document.createElement('option'); o.value = v; o.textContent = t; if (String(v) === String(val)) o.selected = true; se.appendChild(o); } se.onchange = () => { fn(se.value); boxfSave(); renderNow(); }; w.appendChild(se); return w; };
  const dir = h('button', 'bxDir', BOXF.asc ? '▲' : '▼'); dir.type = 'button'; dir.setAttribute('aria-label', '並びを逆にする'); dir.onclick = () => { BOXF.asc = !BOXF.asc; boxfSave(); renderNow(); };
  ct.append(els, sel([[0, '★全て'], [6, '★6'], [5, '★5'], [4, '★4'], [3, '★3']], BOXF.rar, v => { BOXF.rar = +v; }, 'レアで絞る'), sel(BOXSORT, BOXF.sort, v => { BOXF.sort = v; BOXF.asc = false; }, '並び替え'), dir); b.appendChild(ct);
  const list = boxSort(S.units.filter(u => (BOXF.el === 'all' || CH[u.id].el === BOXF.el) && (!BOXF.rar || rarOf(u) === BOXF.rar)));
  if (!list.length) { b.appendChild(h('p', 'onote', 'この条件のキャラはいません。')); return; }
  const add = (g, u) => { const e = icon(u, { tag: inParty(u) ? '編成中' : (S.newIds.includes(u.u) ? 'NEW' : '') }); e.classList.add('bx'); e.querySelector('.fr').insertAdjacentHTML('beforeend', `<span class="bxB"><b>Lv${u.lv}</b><i>★${rarOf(u)}</i></span><span class="bxNm">${esc(CH[u.id].name)}</span>`); e.onclick = () => { S.newIds = S.newIds.filter(x => x !== u.u); save(); detail(u); }; g.appendChild(e); };
  if (BOXF.sort === 'rar') { /* レア順のときは、★ごとに見出しで区切る */
    let cur = null, g = null; for (const u of list) { const r = rarOf(u); if (r !== cur) { cur = r; const cnt = list.filter(x => rarOf(x) === r).length; b.appendChild(h('div', 'bxSec r' + r, `<b>★${r}</b><span>${r === 6 ? '進化' : ''}</span><i>${cnt}体</i>`)); g = h('div', 'ogrid bxG'); b.appendChild(g); } add(g, u); }
  } else { if (list.length !== n) b.appendChild(h('p', 'onote', `${list.length}体を表示`)); const g = h('div', 'ogrid bxG'); b.appendChild(g); for (const u of list) add(g, u); }
}
/* (v97) 攻撃力は数字で見せる(戦闘の攻撃の倍率×1000)。重さは戦闘の重さ×100(レベルでは変わらない) */
function stats(u) { const c = CH[u.id], m = mult(u); return { hp: Math.round(c.hp * m), atk: (c.atk * m).toFixed(2), ap: Math.round(c.atk * m * 1000), wt: Math.round(((A.ROSTER[u.id] || {}).m || 1) * 100) }; }
/* (v88) ★6で変わること(★5の最大Lvと★6の最大Lvでくらべる) */
function evoDiff(id) {
  const a = { id, lv: MAXLV[5], evo: 0 }, b = { id, lv: MAXLV[6], evo: 1 }, sa = stats(a), sb = stats(b), ab = (CABIL[id] || [])[1];
  return `<div class="aCmp"><b>★6で変わること</b><ul><li>最大レベル <span>${MAXLV[5]}</span> → <em>${MAXLV[6]}</em></li><li>体力(最大レベル) <span>${sa.hp.toLocaleString()}</span> → <em>${sb.hp.toLocaleString()}</em></li><li>攻撃力(最大レベル) <span>${sa.ap.toLocaleString()}</span> → <em>${sb.ap.toLocaleString()}</em></li>${ab ? `<li>アビリティ <em>+「${esc(ABIL[ab].n)}」</em>(${esc(ABIL[ab].d)})</li>` : ''}<li>絵が <em>進化後の姿</em> になる</li></ul></div>`;
}
/* (v94) くわしい画面: モンスト・パズドラを見て作り直した(D-115)。
   上に名前の帯、大きな絵(左下にLv)、色つきの棒で体力・攻撃・レベル、
   その下に色ラベルつきの段(スキル・リーダースキル・共鳴技・アビリティ)、いちばん下にボタン */
function detail(u0, pv) {
  const u = pv == null ? u0 : Object.assign({}, u0, { evo: pv, lv: Math.min(u0.lv, MAXLV[CH[u0.id].rar + pv]) });
  const c = CH[u.id], s = stats(u), ml = maxLv(u), nx = u.lv >= ml ? 0 : need(u.lv), ro = A.ROSTER[c.id], sk = A.SKD[ro.sk] || {};
  const top = c.rar === 5 ? stats({ id: u.id, lv: MAXLV[6], evo: 1 }) : stats({ id: u.id, lv: MAXLV[c.rar], evo: 0 });
  const ri = A.RESK ? A.RESK[c.id] : null, rs = ri != null ? A.RES[ri] : null;
  const ab = (CABIL[u.id] || []).map((k, i) => { const on = i < abilOf(u).length; return `<div class="ab${on ? '' : ' lk'}"><b>${esc(ABIL[k].n)}</b><span>${on ? esc(ABIL[k].d) : '★6に進化すると使える: ' + esc(ABIL[k].d)}</span></div>`; }).join('');
  const sh = h('div', 'aSheet dSh'); sh.style.setProperty('--ec', elCol(c.el)); sh.style.setProperty('--ed', elDeep(c.el));
  const art = PORT[u.id] ? `<img class="im" alt="" src="${PORT[evoArt(u.id, u.evo)]}">` : `<div class="crest">${esc(c.el)}</div>`;
  sh.innerHTML = `<div class="dTop"><button type="button" class="bk" aria-label="もどる">‹</button>${elGem(c.el, 26)}<b class="nm">${esc(u.evo ? (c.evoName || c.name + '(進化)') : c.name)}</b><span class="st">${'★'.repeat(rarOf(u))}${totOf(u) ? `<small class="tt">${totOf(u) >= TOT_MAX ? '完凸' : totOf(u) + '凸'}</small>` : ''}</span></div>
   <div class="dScr">
    <div class="dArt">${art}<span class="lv">Lv<b>${u.lv}</b><small>/${ml}</small></span></div>
    ${pv === 1 && !u0.evo ? '<p class="dPv">いまは ★6 に進化したあとの見本です</p>' : ''}
    <div class="dBars">
     <div class="br bh"><span class="lb">体力</span><b>${s.hp.toLocaleString()}</b><i><em style="width:${Math.min(100, s.hp / top.hp * 100)}%"></em></i></div>
     <div class="br ba"><span class="lb">攻撃力</span><b>${s.ap.toLocaleString()}</b><i><em style="width:${Math.min(100, s.ap / top.ap * 100)}%"></em></i></div>
     <div class="br bw"><span class="lb">重さ</span><b>${s.wt}<small>${s.wt >= 115 ? ' 重い' : s.wt <= 85 ? ' 軽い' : ' ふつう'}</small></b><i><em style="width:${Math.min(100, s.wt / 140 * 100)}%"></em></i></div>
     <p class="wtn">重いほど敵を強く押しのけ、自分は飛ばされにくい。軽いほど吸い込みでよく動く。</p>
     <div class="br bx"><span class="lb">経験値</span><b>${nx ? 'あと ' + (nx - u.exp).toLocaleString() : 'レベル最大'}</b><i><em style="width:${nx ? Math.min(100, u.exp / nx * 100) : 100}%"></em></i></div>
    </div>
    ${pv === 1 && !u0.evo ? evoDiff(u.id) : ''}
    <div class="dSec sk"><span class="tg">スキル</span><h4>「${esc(sk.n || '')}」</h4><p>${esc(sk.d || '')}</p></div>
    <div class="dSec ld"><span class="tg">リーダースキル</span>${ro.lead === 'none' ? '<h4>なし</h4><p>リーダーにすると、ふつうの圧縮になります。</p>' : `<h4>「${esc(ro.ln)}」</h4><p>${esc((A.LEADS[ro.lead] || {}).d || '')}</p>`}</div>
    ${rs ? `<div class="dSec rs"><span class="tg">共鳴技</span><h4>「${esc(rs.n)}」</h4><p>${esc(rs.d)}(このキャラが編成にいれば使える)</p></div>` : ''}
    <div class="dSec ab"><span class="tg">アビリティ</span>${ab || '<p>★3にはアビリティがありません。</p>'}</div>
    ${skinSec(u0, pv)}
   </div>
   <div class="dAct orow"></div>`;
  sh.querySelectorAll('.dSec.sn button').forEach(b2 => b2.onclick = () => { const v = b2.dataset.v || null; if (v && !skinArt(v)) return; S.skin = S.skin || {}; for (const k in S.skin) if (S.skin[k] === v) delete S.skin[k]; if (v) S.skin[u0.id] = v; else delete S.skin[u0.id]; save(); syncParty(); flash(v ? c.name + ' に「' + SKINS[v].n + '」をつけた' : c.name + ' のスキンを外した'); sh.remove(); detail(u0, pv); renderNow(); });
  if (c.rar === 5 && PORT[u.id + '6']) {   /* ★5と★6を切りかえて見られる */
    const f = h('div', 'aFrm');
    for (const [n, e] of [['★5', 0], ['★6', 1]]) { const b2 = h('button', (u.evo ? 1 : 0) === e ? 'on' : '', n); b2.type = 'button'; b2.onclick = () => { if ((u.evo ? 1 : 0) === e) return; sh.remove(); detail(u0, e === (u0.evo ? 1 : 0) ? null : e); }; f.appendChild(b2); }
    sh.querySelector('.dArt').appendChild(f);
  }
  const close = () => sh.remove();
  sh.querySelector('.bk').onclick = close;
  const r = sh.querySelector('.dAct');
  if (u.u >= 0 && pv == null) r.appendChild(btn('sub', '強化する', () => { close(); TAB = 'chara'; SUB.chara = 'power'; PICK = { base: u.u, mats: {}, units: [] }; renderNow(); }));
  if (canEvo(u0) && u.u >= 0) r.appendChild(btn('', '★6に進化', () => { close(); evolve(u0); }));
  if (c.battle && S.home !== u.id && u.u >= 0 && pv == null) r.appendChild(btn('sub', 'ホームに出す', () => { S.home = u.id; save(); close(); flash(c.name + ' をホームに出しました'); }));
  if (!r.children.length) r.appendChild(btn('sub', '閉じる', close));
  lay.appendChild(sh);
  /* (11/11) ★6の絵は、後ろの光・足元の円・ホロの照り・きらめきで豪華に */ if (u.evo && PORT[u.id + '6'] && evoArt(u.id, u.evo) === u.id + '6') lux6(sh.querySelector('.dArt'), sh.querySelector('.dArt .im'), c.el);
}
function evolve(u) {
  const c = CH[u.id], key = 'orb_' + c.el, have = S.mats[key] || 0, need = EVO_COST[c.rar], lvN = MAXLV[c.rar], okLv = u.lv >= lvN, okOrb = have >= need;
  const ab = (CABIL[u.id] || []).slice(1).map(k => ABIL[k].n).join('・');
  modal(`${c.name} を ★${c.rar + 1} に進化`, (b, close) => {
    b.innerHTML = `<p>進化すると ★${c.rar} → <b>★${c.rar + 1}</b> になります。体力と攻撃が ${Math.round((EVOK[c.rar] - 1) * 100)}% 上がり、最大レベルが ${MAXLV[c.rar + 1]} になります。<br>2つ目のアビリティ「${esc(ab)}」が使えるようになり、絵も進化後の姿に変わります。</p>
      <div class="omat"><div class="aGl"><span class="aMi" style="font:800 12px var(--cin);color:#ffe7a1">Lv</span>レベル ${lvN}<b class="n" style="font-size:14px">${okLv ? 'OK' : u.lv + '/' + lvN}</b></div><div class="aGl">${matIcon(key)}${esc(MATS[key].name)}<b class="n" style="font-size:14px">${have}/${need}</b></div></div>
      <p class="onote">${esc(MATS[key].name)}は、イベントの「${esc(c.el)}の宝珠の祭壇」で手に入ります。</p>`;
    const r = h('div', 'orow'); r.style.padding = '0';
    r.append(btn('sub', 'やめる', close));
    const ok = btn('', '進化する', () => { S.mats[key] -= need; u.evo = 1; save(); close(); /* (11/11) 進化の瞬間の演出 */ evoShow(u.id, () => { flash(`${c.name} が ★${c.rar + 1} に進化した!`); renderNow(); }); }); ok.disabled = !(okLv && okOrb); r.appendChild(ok); b.appendChild(r);
  });
}
/* (v91) 編成: パズドラ・モンストを見て作り直した(D-113)。
   1つの板に「リーダー(左の枠)+サブ3つ」を顔のアイコンで並べ、下に合計とリーダースキル。
   枠を押すと、別の画面でキャラの一覧から選ぶ(一覧はアイコンの格子、並べかえつき) */
const bigFace = {};
/* ================= (11/11) ★6の豪華な飾りと、進化の瞬間の演出 =================
   山本さん「キャラ星6になったらもっとキャラ自体絵豪華にしたい」→ 絵の描き直し(指示文)とコードの飾りの両方、まずノアで見本、場所は「詳細・ホームの立ち絵」と「進化した瞬間」。
   参考: プリコネの★6(才能開花で絵と背景が変わり、動く)、FGOの最終再臨、スタレ・原神の入手演出(白い人影 → 色がつく)。まねではなく、仕組み(後ろの光・足元の円・ホロの照り・前の粒の4層)だけ借りる。
   動かすのは canvas と transform/opacity だけ。時間 t から毎回描く(同じ絵をコマ送りで確かめられる)。「動きを減らす」設定では止め絵 */
{ const st = document.createElement('style'); st.textContent = `
.lxBox{isolation:isolate}
.lx{pointer-events:none;position:absolute}
.lxB{z-index:-2;left:50%;top:0;height:100%;width:100%;transform:translateX(-50%)}
.aHero .lxB{top:-22%;height:128%;width:min(100vw,560px)}
.lxAu{z-index:-1;filter:blur(13px) brightness(1.7) saturate(1.5);opacity:.55}
.lxFo{z-index:1;mix-blend-mode:screen}
.lxF{z-index:2;left:50%;top:0;height:100%;width:100%;transform:translateX(-50%)}
.aHero .lxF{top:-22%;height:128%;width:min(100vw,560px)}
.dArt .lxAu,.dArt .lxFo{left:50%;top:6px;height:calc(100% - 6px);width:auto;transform:translateX(-50%)}
.aHero .lxAu,.aHero .lxFo{left:50%;top:0;height:100%;width:auto;max-width:none;transform:translateX(-50%);transform-origin:50% 100%;animation:aBreatheC 4.2s ease-in-out infinite}
@keyframes aBreatheC{50%{transform:translateX(-50%) scale(1.006,1.01) translateY(-2px)}}
.dArt .lv,.dArt .aFrm{z-index:3}
.dArt .lx6{position:absolute;right:12px;top:10px;z-index:3;font:900 13px var(--zk);letter-spacing:.04em;color:#3a2400;padding:3px 10px 3px 8px;border-radius:99px;background:linear-gradient(100deg,#fff6cf,#ffd76a 45%,#fff 55%,#e8b84a);box-shadow:0 0 0 1.5px #7a4c00,0 0 14px rgba(255,220,120,.7)}
.lxEv{position:fixed;inset:0;z-index:9000;background:#040716;overflow:hidden;touch-action:manipulation;cursor:pointer}
.lxEv canvas{position:absolute;inset:0;width:100%;height:100%}
.lxEvT{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 11%);text-align:center;pointer-events:none}
.lxEvT .s6{display:flex;justify-content:center;gap:2px;font:900 34px var(--zk);color:#ffd76a;text-shadow:0 2px 0 #7a4c00,0 0 16px rgba(255,210,100,.9)}
.lxEvT .s6 i{font-style:normal;opacity:0;display:inline-block}
.lxEvT .cap{margin-top:2px;font:900 15px var(--zk);letter-spacing:.3em;color:#fff3c4;opacity:0}
.lxEvT .nm{margin-top:4px;font:900 30px var(--zk);color:#fff;paint-order:stroke fill;-webkit-text-stroke:5px #0a0f24;opacity:0}
.lxEvT .hint{margin-top:14px;font:700 12px var(--zk);color:#b9c4ee;opacity:0}
`; document.head.appendChild(st); }
const LUXC = { 光: ['#ffe9a8', '#67e8f9', '#b79bff'], 水: ['#8fd8ff', '#c8f4ff', '#7a8cff'], 炎: ['#ffb070', '#ffe08a', '#ff6a9a'], 木: ['#9dffb4', '#f4ffa8', '#67e8c9'], _: ['#ffe9a8', '#9fe8ff', '#b79bff'] };
const lxH = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
function lxRGBA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function lxDia(g, x, y, s) { g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * .62, y); g.lineTo(x, y + s); g.lineTo(x - s * .62, y); g.closePath(); g.fill(); }
function lxGlint(g, x, y, s, col) { if (s <= 0) return; const r = g.createRadialGradient(x, y, 0, x, y, s); r.addColorStop(0, 'rgba(255,255,255,.95)'); r.addColorStop(.25, lxRGBA(col, .5)); r.addColorStop(1, lxRGBA(col, 0)); g.fillStyle = r; g.beginPath(); g.arc(x, y, s, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.ellipse(x, y, s * 1.5, s * .07, 0, 0, 6.283); g.fill(); g.beginPath(); g.ellipse(x, y, s * .07, s * 1.5, 0, 0, 6.283); g.fill(); }
/* 後ろの層: にじむ光・回る光の筋・背中の輪(目盛りと六角)・足元の円・のぼる粒。k=強さ(0〜1) */
function lxBack(g, W, H, t, C, k, cy0) {
  const cx = W / 2, cy = H * (cy0 || .42); g.save(); g.globalCompositeOperation = 'lighter';
  let r = g.createRadialGradient(cx, cy, 0, cx, cy, H * .62); const pu = .8 + .2 * Math.sin(t * 1.7);
  r.addColorStop(0, lxRGBA(C[0], .5 * k * pu)); r.addColorStop(.45, lxRGBA(C[1], .2 * k * pu)); r.addColorStop(1, lxRGBA(C[2], 0)); g.fillStyle = r; g.fillRect(0, 0, W, H);
  for (let s = 0; s < 2; s++) for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + (s ? -t * .09 + .26 : t * .13), wd = (.035 + .06 * lxH(i * 3.1 + s * 9)) * (s ? .6 : 1), L = H * (.5 + .4 * lxH(i * 7.7 + s * 5)) * (.92 + .08 * Math.sin(t * 2 + i));
    const gr = g.createRadialGradient(cx, cy, H * .05, cx, cy, L); gr.addColorStop(0, lxRGBA(C[s ? 1 : 0], .3 * k)); gr.addColorStop(1, lxRGBA(C[s ? 2 : 0], 0)); g.fillStyle = gr;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a - wd) * L, cy + Math.sin(a - wd) * L); g.lineTo(cx + Math.cos(a + wd) * L, cy + Math.sin(a + wd) * L); g.closePath(); g.fill(); }
  /* 背中の輪 */
  const R = Math.min(W * .44, H * .34); g.lineWidth = Math.max(1.5, W * .004); g.strokeStyle = lxRGBA(C[0], .75 * k); g.beginPath(); g.arc(cx, cy, R, 0, 6.283); g.stroke();
  g.strokeStyle = lxRGBA(C[1], .5 * k); g.beginPath(); g.arc(cx, cy, R * .86, t * .4, t * .4 + 4.2); g.stroke(); g.beginPath(); g.arc(cx, cy, R * 1.1, -t * .3, -t * .3 + 2.6); g.stroke();
  for (let i = 0; i < 48; i++) { const a = i / 48 * 6.283 + t * .1, l = i % 4 ? .03 : .075; g.strokeStyle = lxRGBA(C[i % 4 ? 1 : 0], (i % 4 ? .4 : .8) * k); g.beginPath(); g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineTo(cx + Math.cos(a) * R * (1 + l), cy + Math.sin(a) * R * (1 + l)); g.stroke(); }
  for (let s = 0; s < 2; s++) { g.strokeStyle = lxRGBA(C[2 - s], .42 * k); g.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * 6.283 + (s ? .5236 : 0) - t * .16; const x = cx + Math.cos(a) * R * .74, y = cy + Math.sin(a) * R * .74; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + t * .35; g.fillStyle = lxRGBA(i % 2 ? C[1] : '#ffffff', .9 * k); lxDia(g, cx + Math.cos(a) * R, cy + Math.sin(a) * R, W * .018 * (1 + .25 * Math.sin(t * 3 + i))); }
  /* 足元の円(ななめから見た形) */
  g.save(); g.translate(cx, H * .93); g.scale(1, .26); const FR = W * .42;
  r = g.createRadialGradient(0, 0, 0, 0, 0, FR); r.addColorStop(0, lxRGBA(C[0], .42 * k)); r.addColorStop(.7, lxRGBA(C[1], .14 * k)); r.addColorStop(1, lxRGBA(C[1], 0)); g.fillStyle = r; g.beginPath(); g.arc(0, 0, FR, 0, 6.283); g.fill();
  g.lineWidth = Math.max(2, W * .006); g.strokeStyle = lxRGBA(C[0], .9 * k); g.beginPath(); g.arc(0, 0, FR * .92, 0, 6.283); g.stroke(); g.setLineDash([FR * .16, FR * .07]); g.lineDashOffset = -t * FR * .2; g.strokeStyle = lxRGBA(C[1], .7 * k); g.beginPath(); g.arc(0, 0, FR * .74, 0, 6.283); g.stroke(); g.setLineDash([]);
  g.strokeStyle = lxRGBA(C[2], .7 * k); g.beginPath(); for (let i = 0; i <= 6; i++) { const a = (i * 2 % 6) / 6 * 6.283 + t * .3 + (i > 2 && i < 6 ? 0 : 0); const j = i * 2; const aa = j / 6 * 6.283 + t * .3; const x = Math.cos(aa) * FR * .7, y = Math.sin(aa) * FR * .7; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  g.beginPath(); for (let i = 0; i <= 3; i++) { const aa = (i * 2 + 1) / 6 * 6.283 + t * .3; const x = Math.cos(aa) * FR * .7, y = Math.sin(aa) * FR * .7; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.restore();
  /* のぼる粒 */
  for (let i = 0; i < 34; i++) { const sp = .05 + .09 * lxH(i * 2.3), ph = (t * sp + lxH(i * 5.1)) % 1, x = W * (.06 + .88 * lxH(i * 9.7)) + Math.sin(t * .9 + i) * W * .02, y = H * (1.02 - ph * 1.05), s = W * (.006 + .013 * lxH(i * 4.4)), tw = .5 + .5 * Math.sin(t * (2 + 3 * lxH(i)) + i * 2);
    g.fillStyle = lxRGBA(i % 3 === 0 ? '#ffffff' : C[i % 3], Math.sin(ph * 3.1416) * (.35 + .65 * tw) * k); lxDia(g, x, y, s); }
  g.restore(); }
/* 前の層: きらめき(十字の光)と、手前をのぼる粒 */
function lxFront(g, W, H, t, C, k) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) { const per = 2.2 + 2.4 * lxH(i * 3.3), cyc = Math.floor(t / per + lxH(i * 8.1)), ph = (t / per + lxH(i * 8.1)) % 1; if (ph > .32) continue; const x = W * (.14 + .72 * lxH(i * 5.7 + cyc * 1.3)), y = H * (.1 + .78 * lxH(i * 2.9 + cyc * 3.7)); lxGlint(g, x, y, W * (.03 + .035 * lxH(i * 6.1)) * Math.sin(ph / .32 * 3.1416) * k, C[i % 3]); }
  for (let i = 0; i < 10; i++) { const sp = .07 + .08 * lxH(i * 2.9 + 50), ph = (t * sp + lxH(i * 5.3 + 50)) % 1, x = W * (.1 + .8 * lxH(i * 9.1 + 50)) + Math.sin(t * 1.1 + i) * W * .03, y = H * (1 - ph), s = W * (.012 + .016 * lxH(i * 4.9 + 50)); g.fillStyle = lxRGBA(i % 2 ? C[1] : '#ffffff', Math.sin(ph * 3.1416) * .85 * k); lxDia(g, x, y, s); }
  g.restore(); }
/* ホロの照り: ななめの虹の帯が、絵の形の中だけを流れる */
function lxFoil(g, W, H, t, img, C, k) {
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
  const per = 3.4, p = ((t % per) / per) * 2.4 - .7, x0 = p * W, gr = g.createLinearGradient(x0 - W * .5, H * .15, x0 + W * .5, -H * .15 + H * .3);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.36, lxRGBA(C[1], .16 * k)); gr.addColorStop(.47, 'rgba(255,255,255,' + (.5 * k) + ')'); gr.addColorStop(.54, lxRGBA(C[2], .24 * k)); gr.addColorStop(.64, lxRGBA(C[0], .1 * k)); gr.addColorStop(.7, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const g2 = g.createLinearGradient(0, H * (.2 + .1 * Math.sin(t * .7)), W, H * (.9 + .1 * Math.cos(t * .6))); g2.addColorStop(0, lxRGBA(C[1], .07 * k)); g2.addColorStop(.5, lxRGBA(C[2], .06 * k)); g2.addColorStop(1, lxRGBA(C[0], .07 * k)); g.fillStyle = g2; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'destination-in'; g.drawImage(img, 0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
/* 立ち絵に飾りを付ける。box=絵の入れもの(.dArt / .aHero) img=絵 el=属性 */
function lux6(box, img, el) {
  if (!box || !img) return; box.querySelectorAll('.lx').forEach(e => e.remove()); box.classList.add('lxBox');
  const C = LUXC[el] || LUXC._, dpr = Math.min(1.5, window.devicePixelRatio || 1), mk = cls => { const c = document.createElement('canvas'); c.className = 'lx ' + cls; return c; };
  const cb = mk('lxB'), cf = mk('lxF'), fo = mk('lxFo'), au = document.createElement('img'); au.className = 'lx lxAu'; au.alt = ''; au.src = img.src;
  box.append(cb, au, fo, cf); if (box.classList.contains('dArt')) box.appendChild(h('span', 'lx lx6', '★6 進化'));
  let on = true, n = 0; const t0 = performance.now();
  const size = () => { const r = cb.getBoundingClientRect(); if (r.width < 2) return false; cb.width = cf.width = Math.round(r.width * dpr); cb.height = cf.height = Math.round(r.height * dpr); const ih = Math.min(900, Math.round((img.getBoundingClientRect().height || 400) * dpr)), nw = img.naturalWidth || 1, nh = img.naturalHeight || 1; fo.height = ih; fo.width = Math.round(ih * nw / nh); return true; };
  const sync = () => { try { const a = img.getAnimations()[0]; if (a) for (const e of [au, fo]) { const b = e.getAnimations()[0]; if (b) b.startTime = a.startTime; } } catch (e) { } };
  const draw = t => { const gb = cb.getContext('2d'), gf = cf.getContext('2d'); gb.clearRect(0, 0, cb.width, cb.height); lxBack(gb, cb.width, cb.height, t, C, 1, box.classList.contains('aHero') ? .5 : .42); gf.clearRect(0, 0, cf.width, cf.height); lxFront(gf, cf.width, cf.height, t, C, 1); lxFoil(fo.getContext('2d'), fo.width, fo.height, t, img, C, 1); };
  const go = () => { if (!size()) { if (box.isConnected) setTimeout(go, 120); return; } sync(); if (RM) { draw(1.2); return; } const loop = () => { if (!on || !box.isConnected || !cb.isConnected) return; requestAnimationFrame(loop); if (window.__LXT != null) { draw(window.__LXT); return; } if (n++ % 2) return; draw((performance.now() - t0) / 1000); }; loop(); };
  (img.complete && img.naturalWidth ? Promise.resolve() : new Promise(r => { img.addEventListener('load', r, { once: true }); setTimeout(r, 1500); })).then(() => requestAnimationFrame(go));
  return () => { on = false; }; }
function homeLux() { const w = root.querySelector('.aHero'); if (!w) return; w.querySelectorAll('.lx').forEach(e => e.remove()); if (homeEvo() && PORT[S.home + '6'] && !skinOf(S.home)) lux6(w, w.querySelector('img:not(.lx)'), CH[S.home].el); }
/* 進化の瞬間。★5の絵に光が集まる → 白い人影になる → まっ白 → ★6の絵があらわれ、星が6つ順に打たれる。押すと最後まで飛ぶ、もう一度押すと閉じる */
function evoShow(id, done, opt) {
  const c = CH[id], C = LUXC[c.el] || LUXC._, ov = h('div', 'lxEv'), cv = document.createElement('canvas'), dpr = Math.min(1.5, window.devicePixelRatio || 1)/* 全画面に光を重ねるので、細かさは1.5倍まで(重くしない) */; ov.appendChild(cv);
  const tx = h('div', 'lxEvT', `<div class="s6">${'<i>★</i>'.repeat(6)}</div><div class="cap">★6 進化</div><div class="nm">${esc(c.evoName || c.name)}</div><div class="hint">画面を押すと閉じます</div>`); ov.appendChild(tx); document.body.appendChild(ov);
  const st = [...tx.querySelectorAll('.s6 i')], cap = tx.querySelector('.cap'), nm = tx.querySelector('.nm'), hint = tx.querySelector('.hint');
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  const END = 4.2; let t0 = 0, raf = 0, closed = false, W = 0, H = 0, A0, A1, wh, fo;
  const eo = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3), cl = (x, a, b) => Math.min(1, Math.max(0, (x - a) / (b - a)));
  const close = () => { if (closed) return; closed = true; cancelAnimationFrame(raf); ov.remove(); if (done) done(); };
  const fit = () => { const r = ov.getBoundingClientRect(); W = cv.width = Math.round(r.width * dpr); H = cv.height = Math.round(r.height * dpr); };
  const art = (g, im, sc, al, dx, dy) => { if (!im || al <= 0) return; const ah = H * .6 * sc, aw = ah * im.width / im.height; g.globalAlpha = al; g.drawImage(im, W / 2 - aw / 2 + (dx || 0), H * .46 - ah / 2 + (dy || 0), aw, ah); g.globalAlpha = 1; };
  function render(t) { const g = cv.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#040716'; g.fillRect(0, 0, W, H); const cx = W / 2, cy = H * .44;
    const kB = cl(t, .5, 1.9), rev = t >= 1.95, kD = cl(t, 1.95, 2.5);
    if (!rev) { /* ためる */
      g.save(); g.globalCompositeOperation = 'lighter'; let r = g.createRadialGradient(cx, cy, 0, cx, cy, H * (.2 + .4 * kB)); r.addColorStop(0, lxRGBA(C[0], .2 + .6 * kB)); r.addColorStop(1, lxRGBA(C[1], 0)); g.fillStyle = r; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283 + t * (1 + kB * 2.5), wd = .03 + .05 * lxH(i * 3.1), L = H * (.3 + .5 * lxH(i * 7.7)) * (.3 + .9 * kB); const gr = g.createRadialGradient(cx, cy, 0, cx, cy, L); gr.addColorStop(0, lxRGBA(C[i % 3], .38 * kB)); gr.addColorStop(1, lxRGBA(C[i % 3], 0)); g.fillStyle = gr; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a - wd) * L, cy + Math.sin(a - wd) * L); g.lineTo(cx + Math.cos(a + wd) * L, cy + Math.sin(a + wd) * L); g.closePath(); g.fill(); }
      for (let i = 0; i < 3; i++) { const ph = (t * 1.1 + i / 3) % 1; g.strokeStyle = lxRGBA(C[i], (1 - ph) * .9 * cl(t, .4, .8)); g.lineWidth = W * .006; g.beginPath(); g.arc(cx, cy, H * .5 * (1 - ph) + 4, 0, 6.283); g.stroke(); } g.restore();
      const sh = kB * kB * W * .012; art(g, A0, 1 + .05 * kB, cl(t, 0, .45), Math.sin(t * 61) * sh, Math.cos(t * 53) * sh); art(g, wh, 1 + .05 * kB, kB * kB * 1.1, Math.sin(t * 61) * sh, Math.cos(t * 53) * sh);
      g.save(); g.globalCompositeOperation = 'lighter'; /* 宝珠5つが、うずを巻いて胸に入る */
      for (let i = 0; i < 5; i++) for (let k = 0; k < 9; k++) { const tt = Math.max(0, cl(t, .45, 1.8) - k * .018), rr = Math.pow(1 - tt, 1.3) * W * .55, a = i / 5 * 6.283 + tt * 7.5, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * .8, s = W * (.03 - k * .0028) * (1 - tt * .5); if (s <= 0 || tt >= 1 || t < .45) continue; const r2 = g.createRadialGradient(x, y, 0, x, y, s); r2.addColorStop(0, 'rgba(255,255,255,' + (k ? .5 : 1) + ')'); r2.addColorStop(.4, lxRGBA(C[0], k ? .3 : .8)); r2.addColorStop(1, lxRGBA(C[0], 0)); g.fillStyle = r2; g.beginPath(); g.arc(x, y, s, 0, 6.283); g.fill(); }
      g.restore(); }
    else { /* あらわれる */
      lxBack(g, W, H, t, C, .35 + .65 * kD, .44);
      g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 2; i++) { const kk = cl(t, 1.95 + i * .14, 2.9 + i * .14); if (kk <= 0 || kk >= 1) continue; g.strokeStyle = lxRGBA(i ? '#ffffff' : C[0], (1 - kk) * .9); g.lineWidth = W * .012 * (1 - kk) + 1; g.beginPath(); g.arc(cx, cy, eo(kk) * H * .7, 0, 6.283); g.stroke(); } g.restore();
      const sc = 1.22 - .22 * eo(cl(t, 1.95, 2.55)); art(g, A1, sc, 1);
      if (A1 && fo) { const fg = fo.getContext('2d'); lxFoil(fg, fo.width, fo.height, (t - 2.15) * 1.5 + .2, A1, C, t > 2.15 ? 1 : 0); g.save(); g.globalCompositeOperation = 'screen'; const ah = H * .6 * sc, aw = ah * A1.width / A1.height; g.drawImage(fo, cx - aw / 2, H * .46 - ah / 2, aw, ah); g.restore(); }
      lxFront(g, W, H, t + 3, C, kD);
      g.save(); g.globalCompositeOperation = 'lighter'; /* 光の粒がふりそそぐ */
      for (let i = 0; i < 60; i++) { const tt = (t - 1.95) * (.35 + .5 * lxH(i * 3.7)) - lxH(i * 1.9) * .25; if (tt < 0 || tt > 1) continue; const a = lxH(i * 5.3) * 6.283, d = eo(tt * 1.6) * H * (.2 + .5 * lxH(i * 7.1)); g.fillStyle = lxRGBA(i % 3 ? C[i % 3] : '#ffffff', (1 - tt) * .95); lxDia(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d * .9 + tt * tt * H * .22, W * (.008 + .016 * lxH(i * 2.2)) * (1 - tt * .5)); } g.restore(); }
    /* まっ白 */ const fl = t < 1.95 ? Math.pow(cl(t, 1.72, 1.95), 2) : 1 - cl(t, 1.95, 2.5); if (fl > 0) { g.fillStyle = 'rgba(255,255,255,' + fl + ')'; g.fillRect(0, 0, W, H); }
    st.forEach((e, i) => { const k = cl(t, 2.45 + i * .1, 2.67 + i * .1); e.style.opacity = k > 0 ? 1 : 0; e.style.transform = `scale(${k > 0 ? 2.4 - 1.4 * eo(k) : 1}) rotate(${(1 - eo(k)) * -40}deg)`; });
    cap.style.opacity = cl(t, 3.0, 3.25); nm.style.opacity = cl(t, 3.1, 3.4); nm.style.transform = `translateY(${(1 - eo(cl(t, 3.1, 3.45))) * 14}px)`; hint.style.opacity = cl(t, 3.8, 4.1) * .9; }
  ov.onclick = () => { const t = (performance.now() - t0) / 1000; if (t < 3.6) t0 = performance.now() - 3900; else close(); };
  Promise.all([load(PORT[id] || ''), load(PORT[id + '6'] || PORT[id] || '')]).then(([a, b]) => { if (closed) return; A0 = a; A1 = b || a; fit();
    if (a) { wh = document.createElement('canvas'); wh.width = a.width; wh.height = a.height; const wg = wh.getContext('2d'); wg.drawImage(a, 0, 0); wg.globalCompositeOperation = 'source-in'; wg.fillStyle = '#fff'; wg.fillRect(0, 0, wh.width, wh.height); }
    if (A1) { fo = document.createElement('canvas'); fo.height = Math.min(900, A1.height); fo.width = Math.round(fo.height * A1.width / A1.height); }
    if (opt && opt.at != null) { render(opt.at); ov.__render = render; return; }
    if (RM) { render(END); return; } t0 = performance.now(); const loop = () => { if (closed) return; raf = requestAnimationFrame(loop); render(window.__EVT != null ? window.__EVT : Math.min(END + 60, (performance.now() - t0) / 1000)); }; loop(); });
  ov.__render = render; return ov; }
/* (v125) くわしい画面のスキンの段。持っているスキンを、絵(アイコン)で選ぶ。能力は変わらない */
function skinSec(u0, pv) {
  return '';
  const own = skinsOwned(); if (!own.length || pv != null && pv !== (u0.evo ? 1 : 0) || !(u0.u > 0)) return '';
  const cur = (S.skin || {})[u0.id], who = v => Object.keys(S.skin || {}).find(k => S.skin[k] === v && k !== u0.id);
  const chip = (v, n, img, note, on, off) => `<button type="button" class="${on ? 'on' : ''}" data-v="${v}"${off ? ' disabled' : ''}>${img ? `<img alt="" src="${img}">` : '<i></i>'}<b>${esc(n)}</b>${note ? `<small>${esc(note)}</small>` : ''}</button>`;
  const ic = v => { const k = 'skin_' + v; try { return A.PORT && A.PORT.img && A.PORT.img[k] ? A.portCanvas(k, CH[u0.id].el, 128, 50, false).toDataURL('image/webp', .85) : ''; } catch (e) { return ''; } };
  return `<div class="dSec sn"><span class="tg">スキン</span><p>見た目だけが変わります(立ち絵・顔・バトルの駒)。強さは変わりません。1つのスキンは1人にだけつけられます。</p><div class="snL">${chip('', 'なし', faceURL(u0.id, u0.evo, 1), '', !cur, false)}${own.map(v => chip(v, SKINS[v].n, ic(v), !skinArt(v) ? '絵の準備中' : who(v) ? CH[who(v)].name + 'がつけている' : '', cur === v, !skinArt(v))).join('')}</div></div>`;
}
function bigFaceURL(id, evo) { const sv = skinOf(id), k = sv && A.PORT.img['skin_' + sv] ? 'skin_' + sv : evo && A.PORT.img[id + '6'] ? id + '6' : id; if (bigFace[k]) return bigFace[k]; if (!A.PORT.ready || !A.PORT.img[k]) return faceURL(id, evo); try { bigFace[k] = A.portCanvas(k, CH[id].el, 256, 46, false).toDataURL('image/webp', .9); } catch (e) { return null; } return bigFace[k]; }
function fixLead() { const u = unit(S.team[0]); if (u) S.lead = u.id; }
function tmSlot(u, i) {
  const c = CH[u.id], f = bigFaceURL(u.id, u.evo);
  const d = h('button', 'tmSlot'); d.type = 'button'; d.style.setProperty('--ec', elCol(c.el)); d.style.setProperty('--ed', elDeep(c.el));
  d.innerHTML = `<span class="ic">${f ? `<img alt="" src="${f}">` : ''}${elGem(c.el, 18)}<b class="lv">Lv${u.lv}</b></span><span class="st">${'★'.repeat(rarOf(u))}</span><span class="nm">${esc(c.name)}</span>`;
  d.setAttribute('aria-label', `${i === 0 ? 'リーダー ' : ''}${c.name} ★${rarOf(u)} Lv${u.lv}。押すと入れかえ`);
  d.onclick = () => pickSheet(i); longPress(d, () => detail(u));
  if (!skinsOwned().length) return d;
  const w = h('div', 'tmW'); w.appendChild(d); const v = slotSkin(i);
  const sb = h('button', 'tmSk' + (v ? ' on' : ''), `${v && skinIcon(v, c.el) ? `<img alt="" src="${skinIcon(v, c.el)}">` : '<i></i>'}<span>${v ? esc(SKINS[v].n) : 'スキンなし'}</span>`); sb.type = 'button'; sb.onclick = () => skinPick(i); w.appendChild(sb); return w;
}
const skinIcCache = {};
function skinIcon(v, el) { const k = 'skin_' + v, ck = k + el; if (skinIcCache[ck]) return skinIcCache[ck]; try { if (!A.PORT || !A.PORT.img || !A.PORT.img[k]) return ''; return skinIcCache[ck] = A.portCanvas(k, el, 96, 50, false).toDataURL('image/webp', .85); } catch (e) { return ''; } }
/* (v126) 枠のスキンを選ぶ。その枠に入れたキャラが、スキンの姿になる(強さは同じ)。1つのスキンは1つの枠だけ */
function skinPick(i) {
  const u = unit(S.team[i]); if (!u) return; const c = CH[u.id];
  modal(`${i === 0 ? 'リーダー' : 'サブ' + i}の枠のスキン`, (b, close) => {
    b.innerHTML = `<p class="onote" style="margin:0 0 8px">この枠に入れたキャラが、スキンの姿になります(立ち絵・顔・バトルの駒)。強さは変わりません。キャラを入れかえても、スキンは枠に残ります。</p><div class="snL"></div>`;
    const L = b.querySelector('.snL'), cur = slotSkin(i);
    const add = (v, n, img, note, off) => { const e = h('button', cur === v || (!v && !cur) ? 'on' : '', `${img ? `<img alt="" src="${img}">` : '<i></i>'}<b>${esc(n)}</b>${note ? `<small>${esc(note)}</small>` : ''}`); e.type = 'button'; e.disabled = !!off;
      e.onclick = () => { S.sslot = S.sslot || [null, null, null, null]; for (let j = 0; j < 4; j++) if (v && S.sslot[j] === v) S.sslot[j] = null; S.sslot[i] = v; save(); close(); flash(v ? `${i === 0 ? 'リーダー' : 'サブ' + i}の枠に「${SKINS[v].n}」` : 'スキンを外した'); renderNow(); }; L.appendChild(e); };
    add(null, 'なし', faceURL(u.id, u.evo, 1), '', false);
    for (const v of skinsOwned()) { const j = (S.sslot || []).indexOf(v); add(v, SKINS[v].n, skinIcon(v, c.el), !skinArt(v) ? '絵の準備中' : j >= 0 && j !== i ? (j === 0 ? 'リーダー' : 'サブ' + j) + 'の枠から移す' : '', !skinArt(v)); }
    const r = h('div', 'orow'); r.style.padding = '8px 0 0'; r.appendChild(btn('sub', '閉じる', close)); b.appendChild(r);
  });
}
function charaParty(b) {
  fixLead();
  const T = teamUnits(); let hp = 0, atk = 0, wt = 0; for (const x of T) { const st = stats(x); hp += st.hp; atk += st.ap; wt += st.wt; }
  const lu = T[0], la = A.ROSTER[lu.id], res = T.filter(x => CH[x.id].rar === 5).length;
  const P = h('div', 'tmP'); b.appendChild(P);
  P.appendChild(h('div', 'tmH', `<b>チーム</b><span>押すと入れかえ・長押しでくわしく</span>`));
  const row = h('div', 'tmRow'); P.appendChild(row);
  const L = h('div', 'tmL'); L.appendChild(h('span', 'lab', 'リーダー')); L.appendChild(tmSlot(T[0], 0)); row.appendChild(L);
  const Sb = h('div', 'tmS'); Sb.appendChild(h('span', 'lab', 'サブ')); const r3 = h('div', 'r3'); for (let i = 1; i < 4; i++) r3.appendChild(tmSlot(T[i], i)); Sb.appendChild(r3); row.appendChild(Sb);
  P.appendChild(h('div', 'tmSt', `<div><span>チームの体力</span><b>${hp.toLocaleString()}</b></div><div><span>攻撃力(合計)</span><b>${atk.toLocaleString()}</b></div><div><span>共鳴技</span><b>${res}つ</b></div><div><span>アビリティ</span><b>${T.reduce((a, x) => a + abilOf(x).length, 0)}こ</b></div>`));
  P.appendChild(h('div', 'tmLS', `<div class="t">リーダースキル「${esc(la.lead === 'none' ? 'なし' : la.ln)}」</div><div class="d">${esc(la.lead === 'none' ? 'ふつうの圧縮(リーダーにするならスキルのある子がおすすめ)' : (A.LEADS[la.lead] || {}).d || '')}</div>`));
  const ob = h('div', 'orow'); ob.style.padding = '10px 0 0';
  ob.appendChild(btn('sub', 'おまかせ(強い順)', () => { const pick = [], used = new Set(); for (const x of sortedUnits()) { if (used.has(x.id)) continue; used.add(x.id); pick.push(x.u); if (pick.length === 4) break; } S.team = pick; fixLead(); save(); flash('強い順にそろえました'); renderNow(); }));
  b.appendChild(ob);
  /* メンバーのスキル(1人1行) */
  b.appendChild(h('p', 'osec', 'メンバーのスキル'));
  const ml = h('div', 'tmML'); b.appendChild(ml);
  T.forEach((x, i) => { const c = CH[x.id], sk = A.SKD[A.ROSTER[x.id].sk] || {}; const r = h('button', 'tmMr'); r.type = 'button'; r.innerHTML = `<img alt="" src="${faceURL(x.id, x.evo) || ''}"><span><b>${i === 0 ? '<i>リーダー</i>' : ''}${esc(c.name)} <small>★${rarOf(x)} Lv${x.lv}</small></b><em>「${esc(sk.n || '')}」${esc(sk.d || '')}</em></span>`; r.onclick = () => detail(x); ml.appendChild(r); });
}
/* キャラを選ぶ画面(枠 i に入れる) */
let PSORT = 'pow';
function pickSheet(i) {
  const cur = unit(S.team[i]);
  const sh = h('div', 'aPick'); lay.appendChild(sh);
  const close = () => sh.remove();
  const draw = () => {
    const where = new Map(S.team.map((uid, j) => [uid, j]));
    const others = new Set(S.team.filter((_, j) => j !== i).map(uid => unit(uid).id));
    let list = S.units.filter(x => where.has(x.u) || !others.has(x.id));
    const ord = { 炎: 0, 木: 1, 水: 2, 光: 3 };
    list.sort(PSORT === 'lv' ? (a, b) => b.lv - a.lv || rarOf(b) - rarOf(a) : PSORT === 'el' ? (a, b) => ord[CH[a.id].el] - ord[CH[b.id].el] || rarOf(b) - rarOf(a) || mult(b) - mult(a) : (a, b) => rarOf(b) - rarOf(a) || mult(b) - mult(a) || a.u - b.u);
    const c0 = CH[cur.id];
    sh.innerHTML = `<div class="hd"><button type="button" class="bk">‹ もどる</button><b>${i === 0 ? 'リーダー' : 'サブ' + i}に入れるキャラ</b></div>
      <div class="now"><span>いま</span><img alt="" src="${faceURL(cur.id, cur.evo) || ''}"><b>${esc(c0.name)}</b><small>★${rarOf(cur)} Lv${cur.lv}</small></div>
      <div class="srt"><span>ならび</span>${[['pow', '強い順'], ['lv', 'レベル順'], ['el', '属性順']].map(([k, n]) => `<button type="button" data-k="${k}" class="${PSORT === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="g"></div><p class="ft">押すと入れかわります。長押しでくわしく見られます。</p>`;
    sh.querySelector('.bk').onclick = close;
    sh.querySelectorAll('.srt button').forEach(e => e.onclick = () => { PSORT = e.dataset.k; draw(); });
    const g = sh.querySelector('.g');
    for (const x of list) {
      const j = where.get(x.u), w = h('div', 'pc' + (j === i ? ' cur' : ''));
      const e = icon(x, { sel: j === i, tag: j == null ? '' : j === 0 ? 'リーダー' : '編成中' });
      e.onclick = () => {
        if (j === i) { close(); return; }
        if (j != null) [S.team[i], S.team[j]] = [S.team[j], S.team[i]]; else S.team[i] = x.u;
        fixLead(); save(); close(); flash(CH[x.id].name + (i === 0 ? ' をリーダーにしました' : ' を入れました')); renderNow();
      };
      w.appendChild(e); w.appendChild(h('span', 'n', esc(CH[x.id].name))); g.appendChild(w);
    }
  };
  draw();
}
function charaMats(b) {
  const g = h('div', 'omat'); b.appendChild(g); let any = 0;
  for (const id in MATS) { const n = S.mats[id] || 0; if (!n) continue; any++; g.appendChild(h('div', 'aGl', `${matIcon(id)}<span>${esc(MATS[id].name)}</span><b class="n">${n}</b>`)); }
  if (!any) b.appendChild(h('p', 'onote', 'まだ素材がありません。イベントクエストで手に入ります。'));
}
/* 強化: ベースを1体選び、素材(経験値の竜・ほかのキャラ)を食べさせる。
   (11/8 山本さん「強化ボタンやりにくい」) 竜は何個でも(キャラは10体まで)。「おまかせ」で最大Lvまでの竜を自動で選ぶ(ブルアカの自動選択を参考)。各竜に「最大」。強化ボタンは画面の下に固定 */
const MAXFEED = 50;   /* (11/11) 山本さん「強化する時一気にできないのやりにくい」: 一度に素材にできるキャラを 10体 → 50体。まとめて選ぶボタンと、凸をまとめて重ねるボタンを足す */
const toMax = (u, ml) => { let t = -u.exp; for (let l = u.lv; l < ml; l++) t += need(l); return Math.max(0, t); };
function autoFeed(base, ml) { let R = toMax(base, ml); for (const uid of PICK.units) R -= feedExp(unit(uid), base); const pick = {}; const ids = ['expL', 'expM', 'expS'];
  for (const id of ids) { const v = MATS[id].exp, n = Math.min(S.mats[id] || 0, Math.floor(Math.max(0, R) / v)); if (n) { pick[id] = n; R -= n * v; } }
  if (R > 0) for (const id of ['expS', 'expM', 'expL']) { if ((S.mats[id] || 0) > (pick[id] || 0)) { pick[id] = (pick[id] || 0) + 1; R -= MATS[id].exp; break; } }
  PICK.mats = pick; }
function charaPower(b) {
  if (!PICK || !PICK.base || !unit(PICK.base)) PICK = { base: null, mats: {}, units: [] };
  const base = unit(PICK.base);
  if (!base) {
    b.appendChild(h('p', 'onote', '強化するキャラ(ベース)を選んでください。'));
    const g = h('div', 'ogrid'); b.appendChild(g);
    for (const u of sortedUnits()) { const e = icon(u); e.onclick = () => { PICK.base = u.u; renderNow(); }; g.appendChild(e); }
    return;
  }
  const c = CH[base.id], ml = maxLv(base);
  const cnt = PICK.units.length;
  let gain = 0; for (const id in PICK.mats) gain += MATS[id].exp * PICK.mats[id]; for (const uid of PICK.units) gain += feedExp(unit(uid), base);
  const after = simulate(base, gain), nx = base.lv >= ml ? 0 : need(base.lv);
  const top = h('div', 'aPw aGl'); const bi = icon(base); bi.onclick = () => { PICK = { base: null, mats: {}, units: [] }; renderNow(); };
  const pvW = after.lv > base.lv ? 100 : nx ? Math.min(100, (base.exp + gain) / nx * 100) : 100;
  const right = h('div', null, `<h3>${esc(base.evo ? c.evoName : c.name)}</h3><div class="lv">LV <b>${base.lv}</b> → <b class="${after.lv > base.lv ? 'up' : ''}">${after.lv}</b> / ${ml}</div>
    <div class="aExp"><i class="pv" style="width:${gain ? pvW : 0}%"></i><i style="width:${nx ? Math.min(100, base.exp / nx * 100) : 100}%"></i></div><div class="gain">もらえる経験値 <b>+${gain.toLocaleString()}</b></div>`);
  top.append(bi, right); b.appendChild(top);

  if (base.lv >= ml) b.appendChild(h('p', 'onote', 'このキャラはレベルが最大です。' + (canEvo(base) ? '★6に進化できます(BOXから)。' : '')));
  const full = after.lv >= ml;
  { const hd = h('div', 'aPwH'); hd.appendChild(h('p', 'osec', '経験値の竜'));
    const au = btn(full ? 'sub' : '', 'おまかせ', () => { autoFeed(base, ml); renderNow(); }); au.disabled = base.lv >= ml || !['expS', 'expM', 'expL'].some(id => S.mats[id]); au.setAttribute('aria-label', '最大レベルまでの竜をおまかせで選ぶ');
    const cl = btn('sub', 'はずす', () => { PICK.mats = {}; PICK.units = []; renderNow(); }); cl.disabled = !gain;
    hd.append(au, cl); b.appendChild(hd); }
  for (const id of ['expS', 'expM', 'expL']) {
    const have = S.mats[id] || 0, sel = PICK.mats[id] || 0;
    const r = h('div', 'opick aGl', `${matIcon(id)}<span class="n">${esc(MATS[id].name)}<small>+${MATS[id].exp.toLocaleString()} ・ 持っている ${have}</small></span>`);
    const mi = h('button', null, '−'); mi.type = 'button'; mi.disabled = !sel; mi.setAttribute('aria-label', MATS[id].name + 'を減らす'); mi.onclick = () => { PICK.mats[id] = sel - 1; renderNow(); };
    const nb = h('b', null, String(sel));
    const pl = h('button', null, '+'); pl.type = 'button'; pl.disabled = sel >= have || full; pl.setAttribute('aria-label', MATS[id].name + 'を増やす'); pl.onclick = () => { PICK.mats[id] = sel + 1; renderNow(); };
    const mx = h('button', 'mx', '最大'); mx.type = 'button'; mx.disabled = sel >= have || full; mx.setAttribute('aria-label', MATS[id].name + 'を最大レベルまで使う');
    mx.onclick = () => { const v = MATS[id].exp, R = toMax(base, ml) - gain; PICK.mats[id] = Math.min(have, sel + Math.max(1, Math.ceil(R / v))); renderNow(); };
    r.append(mi, nb, pl, mx); b.appendChild(r);
  }
  /* (v102) 凸: 同じキャラを重ねる(D-124) */
  const tt = totOf(base), dups = sortedUnits().filter(u => u.u !== base.u && u.id === base.id && !inParty(u));
  b.appendChild(h('p', 'osec', '凸(同じキャラを重ねる)'));
  b.appendChild(h('div', 'aTot aGl', `<span class="tn">凸 <b>${tt}</b><small>/ ${TOT_MAX}</small></span><span class="td">${'<i class="on"></i>'.repeat(tt)}${'<i></i>'.repeat(TOT_MAX - tt)}</span><span class="te">体力・攻撃 <b>+${Math.round(tt * TOT_K * 100)}%</b><br>スキル <b>${skCut(base) ? '−' + skCut(base) + '手番' : 'そのまま'}</b></span>`));
  if (tt >= TOT_MAX) b.appendChild(h('p', 'onote', '完凸です(4凸)。'));
  else if (!dups.length) b.appendChild(h('p', 'onote', `同じ「${esc(c.name)}」がいると重ねられます。1凸ごとに体力・攻撃 +3%、2凸と4凸でスキルが1手番早くたまります(編成中のキャラは使えません)。`));
  else { if (dups.length > 1) { const hd = h('div', 'aPwH'); hd.appendChild(h('p', 'onote', `同じキャラが ${dups.length}体 います。`)); hd.firstChild.style.cssText = 'flex:1;margin:0'; hd.appendChild(btn('', 'まとめて重ねる', () => totUpAll(base, dups))); b.appendChild(hd); }
    const g = h('div', 'ogrid'); b.appendChild(g); for (const u of dups) { const e = icon(u, { tag: '凸' }); e.onclick = () => totUp(base, u); g.appendChild(e); } }
  const others = sortedUnits().filter(u => u.u !== base.u && !inParty(u) && u.id !== base.id);
  { b.appendChild(h('p', 'osec', 'キャラを素材にする')); const hd = h('div', 'aPwB');
    /* まとめて選ぶ: ★の低い順・レベルの低い順に、50体まで。進化したキャラと凸したキャラは入れない(まちがって消さないように) */
    const bulk = r => { const L = others.filter(u => rarOf(u) <= r && !u.evo && !totOf(u) && !PICK.units.includes(u.u)).sort((a, c) => rarOf(a) - rarOf(c) || a.lv - c.lv); for (const u of L) { if (PICK.units.length >= MAXFEED) break; PICK.units.push(u.u); } renderNow(); };
    const n3 = others.filter(u => rarOf(u) <= 3 && !u.evo && !totOf(u)).length, n4 = others.filter(u => rarOf(u) <= 4 && !u.evo && !totOf(u)).length;
    const b3 = btn('sub', '★3全部', () => bulk(3)), b4 = btn('sub', '★4以下全部', () => bulk(4)), bc = btn('sub', 'はずす', () => { PICK.units = []; renderNow(); }); b3.disabled = !n3 || base.lv >= ml; b4.disabled = !n4 || base.lv >= ml; bc.disabled = !cnt;
    hd.append(b3, b4, bc); b.appendChild(hd);
    if (others.length) b.appendChild(h('p', 'onote', `えらんだ数 ${cnt} / ${MAXFEED}体 ・ ★の低い順にならんでいます`)); }
  others.sort((a, c) => rarOf(a) - rarOf(c) || a.lv - c.lv || a.u - c.u);
  if (!others.length) b.appendChild(h('p', 'onote', '素材にできるキャラがいません(編成中のキャラは使えません)。ガチャのかぶりなどが使えます。'));
  else {
    const g = h('div', 'ogrid'); b.appendChild(g);
    for (const u of others) { const on = PICK.units.includes(u.u); const e = icon(u, { sel: on, tag: on ? '素材' : '' }); e.onclick = () => { if (on) PICK.units = PICK.units.filter(x => x !== u.u); else if (cnt < MAXFEED && base.lv < ml) PICK.units.push(u.u); renderNow(); }; g.appendChild(e); }
  }
  const go1 = btn(gain ? 'shine' : '', '強化する', null); go1.disabled = !gain || base.lv >= ml;
  go1.onclick = () => {
    const fed = PICK.units.map(unit).filter(Boolean);
    if (fed.some(u => CH[u.id].rar >= 5) && !go1.dataset.ok) { go1.dataset.ok = '1'; go1.textContent = '★5を素材にします。もう一度押すと強化'; return; }
    for (const id in PICK.mats) S.mats[id] = (S.mats[id] || 0) - PICK.mats[id];
    S.units = S.units.filter(u => !PICK.units.includes(u.u));
    const before = base.lv; const r = simulate(base, gain); base.lv = r.lv; base.exp = r.exp; dmFresh(); S.dm.power++; wmFresh(); S.wm.power++; save();
    PICK = { base: base.u, mats: {}, units: [] };
    flash(r.lv > before ? `LEVEL UP!  Lv${before} → Lv${r.lv}` : `経験値 +${gain.toLocaleString()}`); renderNow();
  };
  /* 画面の下に固定するバー: いま選んでいる竜・キャラと、上がるレベル */
  const used = ['expS', 'expM', 'expL'].filter(id => PICK.mats[id]).map(id => MATS[id].name.replace('経験値の竜・', '') + '×' + PICK.mats[id]).concat(PICK.units.length ? ['キャラ×' + PICK.units.length] : []);
  const bar = h('div', 'aPwBar', `<div class="t"><span class="lv">Lv <b>${base.lv}</b> → <b class="${after.lv > base.lv ? 'up' : ''}">${after.lv}</b><small> / ${ml}</small></span><span class="u">${used.length ? esc(used.join('・')) : '竜かキャラを選んでください'}</span></div>`);
  bar.appendChild(go1); b.appendChild(bar);
}
/* 凸をまとめて: 完凸になるまで、要る数だけ重ねる(あまりは残す) */
function totUpAll(base, dups) {
  const c = CH[base.id], t0 = totOf(base); let t1 = t0; const use = [];
  for (const d of [...dups].sort((a, e) => totOf(e) - totOf(a) || a.lv - e.lv)) { if (t1 >= TOT_MAX) break; use.push(d); t1 = Math.min(TOT_MAX, t1 + 1 + totOf(d)); }
  if (!use.length) return;
  modal(`${c.name} をまとめて凸する`, (b, close) => {
    b.innerHTML = `<p>${esc(c.name)} を <b>${use.length}体</b> 重ねて、凸 <b>${t0}</b> → <b>${t1}</b> にします。重ねたキャラはいなくなります。${dups.length > use.length ? `<br>あまりの ${dups.length - use.length}体 は残ります。` : ''}</p>
      <p>体力・攻撃 +${Math.round(t0 * TOT_K * 100)}% → <b>+${Math.round(t1 * TOT_K * 100)}%</b>${skCut({ tot: t1 }) > skCut(base) ? '<br>スキルが早くたまるようになります。' : ''}</p>`;
    const r = h('div', 'orow'); r.style.padding = '0'; r.append(btn('sub', 'やめる', close));
    r.appendChild(btn('', 'まとめて重ねる', () => { const gone = new Set(use.map(d => d.u)); base.tot = t1; S.units = S.units.filter(u => !gone.has(u.u)); PICK.units = PICK.units.filter(u => !gone.has(u)); save(); syncParty(); close(); flash(t1 >= TOT_MAX ? `${c.name} が完凸した!` : `凸 ${t0} → ${t1}`); renderNow(); })); b.appendChild(r);
  });
}
function totUp(base, d) {
  const c = CH[base.id], t0 = totOf(base), t1 = Math.min(TOT_MAX, t0 + 1 + totOf(d));
  modal(`${c.name} を凸する`, (b, close) => {
    b.innerHTML = `<p>${esc(c.name)}(Lv${d.lv}${d.evo ? '・★6' : ''})を重ねて、凸 <b>${t0}</b> → <b>${t1}</b> にします。重ねたキャラはいなくなります。</p>
      <p>体力・攻撃 +${Math.round(t0 * TOT_K * 100)}% → <b>+${Math.round(t1 * TOT_K * 100)}%</b>${skCut({ tot: t1 }) > skCut(base) ? '<br>スキルが1手番早くたまるようになります。' : ''}</p>`;
    const r = h('div', 'orow'); r.style.padding = '0'; r.append(btn('sub', 'やめる', close));
    r.appendChild(btn('', '重ねる', () => { base.tot = t1; S.units = S.units.filter(u => u.u !== d.u); save(); syncParty(); close(); flash(t1 >= TOT_MAX ? `${c.name} が完凸した!` : `凸 ${t0} → ${t1}`); renderNow(); })); b.appendChild(r);
  });
}
function simulate(u, gain) { let lv = u.lv, exp = u.exp + gain; const ml = maxLv(u); while (lv < ml && exp >= need(lv)) { exp -= need(lv); lv++; } if (lv >= ml) exp = 0; return { lv, exp }; }

/* ---------- ガチャ ---------- */
/* (v109) 新しい8人は、絵(portraits.js)が入るまでガチャに出さない */
const NEW8 = ['beni', 'shion', 'ibara', 'lumie', 'pom', 'pukuru', 'futa', 'tomori'];
function pool(r) { return CHARS.filter(c => c.rar === r && !c.drop && !c.lim && (!NEW8.includes(c.id) || (A.PORT && A.PORT.img && A.PORT.img[c.id]))); }
function rollOne(ban) { const x = Math.random(); const r = x < GACHA.rate[5] ? 5 : x < GACHA.rate[5] + GACHA.rate[4] ? 4 : 3; if (ban === 'gb') { const pk = gbPick(r); if (pk && Math.random() < GBG.share[r]) return pk; } const p = pool(r); return p[Math.floor(Math.random() * p.length)].id; }
const circleSVG = `<svg viewBox="0 0 200 200" fill="none" stroke="#f3d27a"><circle cx="100" cy="100" r="96" stroke-width=".8"/><circle cx="100" cy="100" r="88" stroke-width="2.2"/><circle cx="100" cy="100" r="70" stroke-width=".8" stroke-dasharray="2 4"/><circle cx="100" cy="100" r="44" stroke-width="1.4"/><path d="M100 12 176 144H24Z" stroke-width="1.1"/><path d="M100 188 24 56h152Z" stroke-width="1.1"/>${Array.from({ length: 24 }, (_, i) => { const a = i / 24 * Math.PI * 2; return `<circle cx="${100 + Math.cos(a) * 79}" cy="${100 + Math.sin(a) * 79}" r="${i % 3 ? 1.2 : 2.6}" fill="#f3d27a" stroke="none"/>`; }).join('')}</svg>`;
/* (v114) ガチャの一覧。ほかのゲームと同じく「恒常」などとは書かず、ガチャごとに名前を付ける。
   限定ガチャを作るときは、ここに足すと下にガチャの切りかえが出る */
const BANNERS = [{ id: 'std', name: '英雄召喚', en: 'HERO SUMMON' }, { id: 'gb', name: 'ゲーマー女子召喚', en: 'GAMER GIRLS', lim: 1 }];
/* (11/10) ゲームバカイベントの限定ガチャ(山本さん): 1回150pt・10連1350pt・100回で★5のピックアップと交換。
   ピックアップは★5・★4・★3の1人ずつ。各レア度のうち share の割合でピックアップが出る。キャラの絵がそろうまでは「準備中」 */
const GBG = { one: 150, ten: 1350, pity: 100, pick: { 5: ['gbpro', 'gbsnp', 'gbrhy'], 4: ['gbret', 'gbfgt', 'gbhea', 'gbstr'] }, share: { 5: .5, 4: .4 } };
const GB_KESHIN = 'gbpzl';   /* 限定降臨「ガチャ魔神」の化身 = ソラ */
const gbBanOn = () => { try { if (HOST && HOST.gbOn) return !!HOST.gbOn(); } catch (e) { } const t = Date.now(); return t >= Date.UTC(2026, 10, 13, 20) && t < Date.UTC(2026, 10, 28, 20); };
const gbPicks = r => (GBG.pick[r] || []).filter(id => CH[id] && A.PORT && A.PORT.img && A.PORT.img[id]);
const gbPick = r => { const L = gbPicks(r); return L.length ? L[Math.floor(Math.random() * L.length)] : null; };
const gbReady = () => gbPicks(5).length > 0 && gbPicks(4).length > 0;
const banList = () => BANNERS.filter(b => !b.lim || gbBanOn());
let gaSel = null, gaB = 'std';
function renderGacha() {
  root.innerHTML = '';
  if (!banList().some(b => b.id === gaB)) gaB = 'std';
  const bn = BANNERS.find(x => x.id === gaB) || BANNERS[0], LIM = gaB === 'gb';
  if (LIM) return renderGbGacha(bn);
  const p5 = pool(5);
  if (!gaSel || !p5.some(c => c.id === gaSel)) gaSel = p5[gaI % p5.length].id;
  const w = h('div', 'aGa'); root.appendChild(w);
  w.innerHTML = `<div class="gbg"></div><div class="chars"></div>
    <div class="gLogo"><small>${esc(bn.en)}</small><b>${esc(bn.name)}</b></div><button class="gDt" type="button">詳細</button>
    <div class="gWho"></div><div class="gFs"></div>`;
  const cs = w.querySelector('.chars'), who = w.querySelector('.gWho'), fs = w.querySelector('.gFs');
  /* まん中に★5を大きく。名前と★は絵の上に直接置く */
  const show = id => {
    gaSel = id; const c = CH[id];
    cs.innerHTML = PORT[id] ? `<img class="fr" alt="" src="${PORT[id]}">` : '';
    who.innerHTML = `<span class="st">★★★★★</span><b>${esc(c.name)}</b><span class="el">${elGem(c.el, 20)}${esc(LEAD[id] || '')}</span>`;
    fs.querySelectorAll('button').forEach(e => e.classList.toggle('on', e.dataset.id === id));
  };
  for (const c of p5) { const f = faceURL(c.id, 0, 1); const e = h('button', 'gF', f ? `<img alt="" src="${f}">` : `<b>${esc(c.el)}</b>`); e.type = 'button'; e.dataset.id = c.id; e.style.setProperty('--ec', elCol(c.el)); e.setAttribute('aria-label', c.name); e.onclick = () => { clearInterval(gaT); swap(c.id); }; fs.appendChild(e); }
  const swap = id => { if (id === gaSel) return; cs.classList.add('sw'); who.classList.add('sw'); setTimeout(() => { show(id); cs.classList.remove('sw'); who.classList.remove('sw'); }, 200); };
  show(gaSel);
  clearInterval(gaT); if (!RM) gaT = setInterval(() => { if (TAB !== 'gacha' || root.hidden) return; gaI++; const l = pool(5); swap(l[(l.findIndex(c => c.id === gaSel) + 1) % l.length].id); }, 4200);
  w.querySelector('.gDt').onclick = rates;
  const bs = h('div', 'btns');
  const b10 = S.free10 ? btn('shine free', `無料 10回召喚<small>はじめの1回だけ</small>`, () => doPull(10, 0, 1)) : btn('shine', `10回召喚<small>${svg('pt', '0 0 16 16')}${GACHA.ten}</small>`, () => pull(10, GACHA.ten));
  bs.append(btn('sub', `1回召喚<small>${svg('pt', '0 0 16 16')}${GACHA.one}</small>`, () => pull(1, GACHA.one)), b10);
  bs.insertAdjacentHTML('beforeend', S.free10 ? '<em class="gK">無料・★4以上1体確定</em>' : '<em class="gK">★4以上1体確定</em>');
  if (needFree()) w.appendChild(h('div', 'gFirst', '<b>まずは仲間を呼ぼう</b><span>無料の10回召喚で、最初の仲間がそろいます</span>'));
  const pt = h('div', 'gPt', `<span>交換pt <b>${S.pity}</b>/${PITY}</span><span class="bar"><i style="width:${Math.min(100, S.pity / PITY * 100)}%"></i></span>`); const tr = btn('sm', '★5確定召喚', pityTrade); tr.disabled = S.pity < PITY; if (S.pity >= PITY) pt.classList.add('ok'); pt.appendChild(tr); w.appendChild(pt);
  w.appendChild(bs); banTabs(w);
}
/* ガチャの切りかえ(限定ガチャがあるときだけ) */
function banTabs(w) { const L = banList(); if (L.length < 2) return; const t = h('div', 'gBan'); for (const b of L) { const e = h('button', 'gBt' + (b.id === gaB ? ' on' : '') + (b.lim ? ' lim' : ''), `${b.lim ? '<em>限定</em>' : ''}${esc(b.name)}`); e.type = 'button'; e.onclick = () => { if (b.id === gaB) return; gaB = b.id; gaSel = null; renderNow(); }; t.appendChild(e); } w.appendChild(t); }
function renderGbGacha(bn) {
  clearInterval(gaT); const w = h('div', 'aGa gbl'); root.appendChild(w); const ok = gbReady();
  w.innerHTML = `<div class="gbg"></div><div class="chars"></div>
    <div class="gLogo"><small>${esc(bn.en)}</small><b>${esc(bn.name)}</b></div><button class="gDt" type="button">詳細</button>
    <div class="gWho"></div><div class="gFs"></div>`;
  const cs = w.querySelector('.chars'), who = w.querySelector('.gWho');
  /* (11/10) ピックアップ7人を順に大きく見せる(★5の3人が先)。下の顔を押すとその子に切りかわる */
  const ids = [...gbPicks(5), ...gbPicks(4)], fs = w.querySelector('.gFs');
  if (ids.length) {
    if (!ids.includes(gaSel)) gaSel = ids[0];
    const show = id => { gaSel = id; const c = CH[id]; cs.innerHTML = PORT[id] ? `<img class="fr" alt="" src="${PORT[id]}">` : ''; who.innerHTML = `<span class="st">${'★'.repeat(c.rar)}</span><small class="gTi">${esc(GB_TITLE[id] || '')}</small><b>${esc(c.name)}</b><span class="el">${elGem(c.el, 20)}ピックアップ</span>`; fs.querySelectorAll('button').forEach(e => e.classList.toggle('on', e.dataset.id === id)); };
    const swap = id => { if (id === gaSel) return; cs.classList.add('sw'); who.classList.add('sw'); setTimeout(() => { show(id); cs.classList.remove('sw'); who.classList.remove('sw'); }, 200); };
    for (const id of ids) { const c = CH[id], f = faceURL(id, 0, 1); const e = h('button', 'gF', f ? `<img alt="" src="${f}">` : `<b>${esc(c.el)}</b>`); e.type = 'button'; e.dataset.id = id; e.style.setProperty('--ec', elCol(c.el)); e.setAttribute('aria-label', c.name); e.onclick = () => { clearInterval(gaT); swap(id); }; fs.appendChild(e); }
    show(gaSel);
    if (!RM) gaT = setInterval(() => { if (TAB !== 'gacha' || root.hidden) return; swap(ids[(ids.indexOf(gaSel) + 1) % ids.length]); }, 3600);
  }
  else who.innerHTML = '<b>ゲーマー女子 7人</b><span class="el">ピックアップ  ·  準備中</span>';
  w.querySelector('.gDt').onclick = rates;
  const bs = h('div', 'btns');
  const b1 = btn('sub', `1回召喚<small>${svg('pt', '0 0 16 16')}${GBG.one}</small>`, () => pull(1, GBG.one)), b10 = btn('shine', `10回召喚<small>${svg('pt', '0 0 16 16')}${GBG.ten.toLocaleString()}</small>`, () => pull(10, GBG.ten));
  if (!ok) { b1.disabled = b10.disabled = true; }
  bs.append(b1, b10); bs.insertAdjacentHTML('beforeend', ok ? '<em class="gK">★4以上1体確定</em>' : '<em class="gK">キャラの準備中です</em>');
  const lp = S.lp || 0, pt = h('div', 'gPt', `<span>限定の交換pt <b>${lp}</b>/${GBG.pity}</span><span class="bar"><i style="width:${Math.min(100, lp / GBG.pity * 100)}%"></i></span>`), tr = btn('sm', '★5と交換', gbPityPull); tr.disabled = lp < GBG.pity || !gbPick(5); if (lp >= GBG.pity) pt.classList.add('ok'); pt.appendChild(tr); w.appendChild(pt);
  /* (11/11) 限定セットDXを買った人: 無料の10連を1回 */
  { let ts = 0; try { ts = HOST && HOST.gbTen ? +HOST.gbTen() || 0 : 0; } catch (e) { } if (ts && S.gbt10 !== ts && ok) { const fb = btn('shine', 'セットの無料10連を引く', () => { if (boxFull(10)) { boxFullAsk(10); return; } doPull(10, 0, false, ts); }); fb.style.cssText = 'display:block;width:calc(100% - 24px);margin:8px 12px 0'; w.appendChild(fb); } }
  w.appendChild(bs); banTabs(w);
}
function gbPityPull() { const L = gbPicks(5); if (!L.length || (S.lp || 0) < GBG.pity) return; if (boxFull(1)) { boxFullAsk(1); return; }
  const give = id => { if ((S.lp || 0) < GBG.pity) return; S.lp -= GBG.pity; const isNew = !S.units.some(u => u.id === id); const u = { u: S.next++, id, lv: 1, exp: 0, evo: 0 }; S.units.push(u); S.newIds.push(u.u); save(); summon([{ u, isNew }], 1, 0); };
  modal('★5と交換', (b, close) => { b.innerHTML = `<p class="onote">限定の交換pt ${GBG.pity} で、好きな★5のピックアップ1人と交換できます。</p>`; const r = h('div', 'gPk'); for (const id of L) { const c = CH[id], f = faceURL(id, 0, 1); const e = h('button', 'gPkB', `${f ? `<img alt="" src="${f}">` : ''}<small>${esc(GB_TITLE[id] || '')}</small><b>${esc(c.name)}</b>`); e.type = 'button'; e.style.setProperty('--ec', elCol(c.el)); e.onclick = () => { close(); give(id); }; r.appendChild(e); } b.appendChild(r); const o = h('div', 'orow'); o.style.padding = '0'; o.appendChild(btn('sub', 'やめる', close)); b.appendChild(o); }); }
function rates() {
  if (gaB === 'gb') return gbRates();
  modal(`${(BANNERS.find(x => x.id === gaB) || BANNERS[0]).name} の詳細`, (b, close) => {
    const row = r => { const p = pool(r), each = GACHA.rate[r] / p.length * 100; return `<div class="gRw"><p><b class="s${r}">${'★'.repeat(r)}</b> 合計 <b>${Math.round(GACHA.rate[r] * 100)}%</b><small>(1人あたり ${each.toFixed(2)}%)</small></p><div class="gIc">${p.map(c => { const f = faceURL(c.id, 0, 1); return `<span style="--ec:${elCol(c.el)}">${f ? `<img alt="" src="${f}">` : ''}<i>${esc(c.name)}</i></span>`; }).join('')}</div></div>`; };
    b.innerHTML = `<div class="gRs">${row(5)}${row(4)}${row(3)}</div><p class="onote">10回召喚は、★4以上が1体も出なかったとき、最後の1体が★4以上になります。<br>1回引くごとに交換ptが1たまり、${PITY}たまると★5が必ず出る1回召喚が引けます(どの★5かはランダム)。<br>かぶったキャラは強化や凸に使えます。${HOST ? '' : 'pt はテスト用です。'}</p>`;
    const r = h('div', 'orow'); r.style.padding = '0'; r.appendChild(btn('sub', '閉じる', close)); b.appendChild(r);
  });
}
function gbRates() { modal('ゲーマー女子召喚 の詳細', (b, close) => { const row = r => { const L = gbPicks(r), all = Math.round(GACHA.rate[r] * 1000) / 10, each = L.length ? GACHA.rate[r] * (GBG.share[r] || 0) / L.length * 100 : 0; return `<div class="gRw"><p><b class="s${r}">${'★'.repeat(r)}</b> 合計 <b>${all}%</b>${L.length ? `<small>(ピックアップ 1人あたり ${each.toFixed(2)}%)</small>` : ''}</p>${L.length ? `<div class="gIc">${L.map(id => { const c = CH[id], f = faceURL(id, 0, 1); return `<span style="--ec:${elCol(c.el)}">${f ? `<img alt="" src="${f}">` : ''}<i>${esc(c.name)}</i></span>`; }).join('')}</div>` : ''}</div>`; };
  b.innerHTML = `<div class="gRs">${row(5)}${row(4)}${row(3)}</div><p class="onote">期間: ゲームバカイベントの間。1回 ${GBG.one}pt、10回 ${GBG.ten.toLocaleString()}pt。10回召喚は★4以上が1体確定。<br>この召喚を1回引くごとに限定の交換ptが1たまり、${GBG.pity}たまると★5のピックアップと交換できます。ピックアップ以外は「英雄召喚」と同じキャラが出ます。ゲーマー女子はこの召喚だけで出ます(ソラは限定降臨「ガチャ魔神」でだけ仲間になります)。</p>`;
  const r = h('div', 'orow'); r.style.padding = '0'; r.appendChild(btn('sub', '閉じる', close)); b.appendChild(r); }); }
function pull(n, cost) {
  if (boxFull(n)) { boxFullAsk(n); return; }
  if (ptNow() < cost) { modal('ptが足りません', (b, close) => { b.innerHTML = `<p>あと ${(cost - ptNow()).toLocaleString()}pt 必要です。ステージの初回クリア・★・デイリーミッションでもらえます。</p>`; const r = h('div', 'orow'); r.style.padding = '0'; r.appendChild(btn('sub', '閉じる', close)); b.appendChild(r); }); return; }
  modal(n === 1 ? '1回召喚' : '10回召喚', (b, close) => {
    b.innerHTML = `<p style="text-align:center">${cost.toLocaleString()}pt 使います<br><span style="font-size:12px">のこり ${(ptNow() - cost).toLocaleString()}pt</span></p>`;
    const r = h('div', 'orow'); r.style.padding = '0'; r.append(btn('sub', 'やめる', close), btn('shine', '召喚する', () => { close(); doPull(n, cost); })); b.appendChild(r);
  });
}
function doPull(n, cost, free, gift) {
  if (!free && boxFull(n)) { boxFullAsk(n); return; }
  /* (11/11) gift = 限定セットDXの無料10連(付いた時刻)。pt は使わず、使ったことを覚えておく */
  if (free) { if (!S.free10) return; S.free10 = 0; } else if (gift) { if (S.gbt10 === gift) return; S.gbt10 = gift; } else if (!ptSpend(cost, n)) { flash('ptが足りません'); return; } const got = [];
  const lim = gaB === 'gb' && !free && gbReady(); const ids = []; for (let k = 0; k < n; k++) ids.push(rollOne(lim ? 'gb' : 0));
  /* 無料の10回召喚は、編成の4人がそろうように、ちがうキャラが4人以上になるまで同じレア度で引き直す(確率は変えない) */
  const have = new Set(S.units.map(x => x.id));
  if (free) for (let g = 0; g < 50 && new Set([...have, ...ids]).size < 4; g++) { const j = ids.findIndex((id, k) => ids.indexOf(id) !== k); const p = pool(CH[ids[j]].rar); ids[j] = p[Math.floor(Math.random() * p.length)].id; }
  /* 10連は★4以上を1枠確定: 1つも無ければ最後を★4以上に引き直す(★5:★4 = 4:26) */
  if (n === 10 && !ids.some(id => CH[id].rar >= 4)) { const r = Math.random() < GACHA.rate[5] / (GACHA.rate[5] + GACHA.rate[4]) ? 5 : 4, p = pool(r), pk = lim && gbPick(r); ids[9] = pk && Math.random() < GBG.share[r] ? pk : p[Math.floor(Math.random() * p.length)].id; }
  for (const id of ids) { const isNew = !S.units.some(u => u.id === id); const u = { u: S.next++, id, lv: 1, exp: 0, evo: 0 }; S.units.push(u); S.newIds.push(u.u); got.push({ u, isNew }); }
  if (lim) S.lp = (S.lp || 0) + n; else S.pity += n; dmFresh(); S.dm.gacha += n; fixTeam();
  save(); summon(got, n, cost, free);
}
/* 召喚の演出: 魔法陣が回って光が集まる → 光の柱の色でレア度が先に分かる → カードがめくれる。押すと飛ばせる */
const RC = { 3: ['#c9a27a', 'rgba(110,170,255,.85)', 'linear-gradient(160deg,#c7b08a,#6e5a3a 50%,#a88a5c)'], 4: ['#d8b4ff', 'rgba(190,120,255,.9)', 'linear-gradient(160deg,#f4f7ff,#9aa6c4 45%,#5a6684 70%,#d8e0f4)'], 5: ['#fff2c2', 'rgba(255,200,80,.95)', 'linear-gradient(160deg,#fff4c8,#f0c860 30%,#a7731f 62%,#f3d27a)'] };
function summon(got, n, cost, free) {
  const top = Math.max(...got.map(g => CH[g.u.id].rar));
  const ov = h('div', 'aSum2'); const cv = h('canvas', 'cv'); ov.appendChild(cv); const sk = btn('', 'スキップ', null); sk.className = 'skip'; ov.appendChild(sk); lay.appendChild(ov);
  const g = cv.getContext('2d'); let W, H, dpr = Math.min(2, devicePixelRatio || 1);
  const rs = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); }; rs();
  const col = top >= 5 ? [255, 206, 90] : top >= 4 ? [190, 130, 255] : [120, 180, 255];
  const parts = Array.from({ length: 140 }, () => ({ a: Math.random() * Math.PI * 2, r: .5 + Math.random() * .7, s: .6 + Math.random() * .8, z: Math.random() }));
  let t0 = performance.now(), raf = 0, done = false; const T = RM ? .2 : 2.3;
  const frame = now => {
    const t = Math.max(0, (performance.now() - t0) / 1000); const cx = W / 2, cy = H * .5, R = Math.min(W, H) * .42;
    g.fillStyle = '#02050f'; g.fillRect(0, 0, W, H);
    const k = Math.min(1, t / T), e = k * k;
    /* 魔法陣 */
    g.save(); g.translate(cx, cy); g.scale(1, .42); g.rotate(t * (.6 + e * 4));
    g.strokeStyle = `rgba(243,210,122,${.25 + .6 * Math.min(1, t * 1.5)})`; g.lineWidth = 2;
    for (const rr of [1, .92, .62, .38]) { g.beginPath(); g.arc(0, 0, R * rr * (.85 + .15 * Math.min(1, t * 2)), 0, Math.PI * 2); g.stroke(); }
    for (let i = 0; i < 2; i++) { g.beginPath(); for (let j = 0; j < 4; j++) { const a = (i ? Math.PI : 0) + j / 3 * Math.PI * 2 - Math.PI / 2; const x = Math.cos(a) * R * .88, y = Math.sin(a) * R * .88; j ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    g.restore();
    /* 光の粒が中心へ集まる(後半は当たりの色) */
    for (const p of parts) { const rr = R * 1.6 * p.r * (1 - Math.min(1, e * p.s * 1.2)); if (rr < 2) continue; const a = p.a + t * 1.4 * p.s; const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * .5 - p.z * 30; const c = k > .6 ? col : [255, 236, 190]; g.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${.3 + .7 * p.z})`; g.beginPath(); g.arc(x, y, 1 + 2 * p.z, 0, Math.PI * 2); g.fill(); }
    /* 光の柱 */
    const pw = R * (.15 + .6 * e); const gr = g.createLinearGradient(0, 0, 0, cy); gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},${.15 + .6 * e})`);
    g.fillStyle = gr; g.fillRect(cx - pw / 2, 0, pw, cy);
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, R * (.3 + e)); rg.addColorStop(0, `rgba(255,255,255,${.4 * e})`); rg.addColorStop(.4, `rgba(${col[0]},${col[1]},${col[2]},${.35 * e})`); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
    if (t > T) { g.fillStyle = `rgba(255,255,255,${Math.max(0, 1 - (t - T) * 4)})`; g.fillRect(0, 0, W, H); if (!done) { done = true; reveal(); } }
    if (t < T + .4) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  let resEl = null;
  function reveal() {
    resEl = h('div', 'aRes'); resEl.appendChild(h('div', 'hd', top >= 5 ? '★5 召喚!' : '召喚結果'));
    const grid = h('div', 'aRg' + (n === 1 ? ' one' : ''));
    got.forEach(x => {
      const c = CH[x.u.id], r = RC[c.rar]; const d = h('div', 'aTc r' + c.rar); d.style.setProperty('--rc', r[0]); d.style.setProperty('--rg', r[1]); d.style.setProperty('--rf', r[2]); d.style.setProperty('--ec', elCol(c.el)); d.style.setProperty('--ed', elDeep(c.el));
      d.innerHTML = `<div class="pl"></div><div class="in"><div class="b"></div><div class="f"><div class="p">${PORT[c.id] ? `<img alt="" src="${PORT[c.id]}">` : `<span class="ph"><b>${esc(c.el)}</b><i>準備中</i></span>`}</div>${elGem(c.el)}${stars(c.rar)}</div></div>${x.isNew ? '<em>NEW</em>' : ''}`;
      d.setAttribute('aria-label', `${c.name} ★${c.rar}`); grid.appendChild(d);
    });
    resEl.appendChild(grid);
    const r = h('div', 'orow'); r.append(btn('sub', 'BOXを見る', () => { ov.remove(); TAB = 'chara'; SUB.chara = 'box'; renderNow(); }), free ? btn('shine', 'ホームへ', () => { ov.remove(); go('home'); }) : btn('shine', 'もう一度', () => { ov.remove(); if (cost) pull(n, cost); else tRoute(); })); resEl.appendChild(r);
    ov.appendChild(resEl); sk.textContent = 'ぜんぶ見る';
    const cards = [...grid.children]; let i = 0;
    const flip = () => { if (i >= cards.length) { resEl.classList.add('done'); sk.remove(); return; } const d = cards[i++]; d.classList.add('open'); setTimeout(flip, RM ? 0 : d.classList.contains('r5') ? 420 : 130); };
    setTimeout(flip, RM ? 0 : 250);
    sk.onclick = () => { cards.forEach(d => d.classList.add('open')); i = cards.length; resEl.classList.add('done'); sk.remove(); };
  }
  sk.onclick = () => { t0 = performance.now() - T * 1000; };
  renderNow();
}

/* ---------- ★6の姿(v87) ---------- */
const EVO4 = ['jin', 'riz', 'gekka', 'seira', 'beni', 'shion', 'ibara', 'lumie'];
function evoGallery() {
  modal('★6の姿', (b, close) => {
    b.innerHTML = `<p class="onote" style="margin:0 0 8px">★5を宝珠5個で進化させると★6になります。<br>変わること: 最大レベル70→90、体力と攻撃が1.25倍、アビリティが1つ増える、絵が進化後の姿になる。<br>絵を押すと、くわしい数字が見られます。</p><div class="aEvoG">${EVO4.filter(k => A.PORT.img[k + '6']).map(k => `<button type="button" data-k="${k}" style="--ec:${elCol(CH[k].el)};--ed:${elDeep(CH[k].el)}"><img alt="" src="${PORT[k + '6'] || PORT[k] || ''}"><b>${elGem(CH[k].el)}${esc(CH[k].name)} ★6</b></button>`).join('')}</div>`;
    b.querySelectorAll('.aEvoG button').forEach(e => e.onclick = () => { const k = e.dataset.k, u = S.units.find(x => x.id === k && x.evo); close(); if (u) detail(u); else detail(S.units.find(x => x.id === k) || { u: -1, id: k, lv: 1, exp: 0, evo: 0 }, 1); });
    const r = h('div', 'orow'); r.style.padding = '0'; r.append(btn('sub', '閉じる', close), btn('', '★6の4人で戦ってみる', () => { close(); evoTrial(); })); b.appendChild(r);
  });
}
/* ★6の4人(Lv90)で1-2を遊ぶ。セーブは変えない */
function evoTrial() {
  const T = EVO4.slice(0, 4).map(k => ({ u: -1, id: k, lv: 90, exp: 0, evo: 1 }));
  window.CA_PARTY = Object.fromEntries(T.map(x => [x.id, mult(x)])); window.CA_ABIL = Object.fromEntries(T.map(x => [x.id, abilOf(x)])); window.CA_EVO = Object.fromEntries(T.map(x => [x.id, 1])); window.CA_TEAM = T.map(x => x.id); window.CA_LEAD = 0;
  A.startStage(1, false);
}

/* ---------- その他 ---------- */
/* ===== (11/9) スタミナ(山本さん): 最大7(はじめ10→11/9に7)・30分で1つ回復・出撃1回で1つ(マルチは募集した人だけ)。
   100ptで満タン(何回でも)。仲間に3時間に1回1つ送れる(ツムツム風)。もらった分は最大を超えて貯まる ===== */
const STA_MAX = 7, STA_MS = 30 * 60 * 1000, STA_GIFT_MS = 3 * 3600 * 1000;
let staGift = 0;
function staNow() {
  const o = S.sta = S.sta || { v: STA_MAX, t: Date.now() }, now = Date.now();
  if (o.v < STA_MAX) { const n = Math.floor((now - o.t) / STA_MS); if (n > 0) { o.v = Math.min(STA_MAX, o.v + n); o.t += n * STA_MS; } if (o.v >= STA_MAX) o.t = now; } else o.t = now;
  return { v: o.v, next: o.v < STA_MAX ? STA_MS - (now - o.t) : 0, full: o.v < STA_MAX ? (STA_MAX - o.v - 1) * STA_MS + (STA_MS - (now - o.t)) : 0 };
}
const staCan = () => staNow().v >= 1;
function staUse() { const s0 = staNow(); if (s0.v >= STA_MAX) S.sta.t = Date.now(); S.sta.v = Math.max(0, S.sta.v - 1); save(); staTick(); }
const mmss = ms => { const m = Math.ceil(ms / 1000), h0 = Math.floor(m / 3600), mm = Math.floor(m % 3600 / 60), ss = m % 60; return (h0 ? h0 + ':' + String(mm).padStart(2, '0') : mm) + ':' + String(ss).padStart(2, '0'); };
function staTick() { const e = hud.querySelector('.aSta'); if (!e) return; const n = staNow(); e.querySelector('b').textContent = `${n.v}/${STA_MAX}`; e.querySelector('small').textContent = n.v < STA_MAX ? mmss(n.next) : ''; }
setInterval(staTick, 1000);
/* 仲間からのスタミナが届いているか(1分ごと) */
async function staPeek() { try { if (HOST && HOST.sta) { const g = await HOST.sta.peek(); const was = staGift; staGift = g.length; if (!!was !== !!staGift) renderTop(); } } catch (e) { } }
setInterval(staPeek, 60000); setTimeout(staPeek, 3000);
function staOut() { flash('スタミナが足りません'); staMenu(); }
function staMenu() {
  modal('スタミナ', async (b, close) => {
    const n = staNow();
    b.innerHTML = `<div class="aStaM"><div class="big">⚡ <b>${n.v}</b> / ${STA_MAX}</div><p class="onote">${n.v < STA_MAX ? `次の1つまで ${mmss(n.next)}・満タンまで ${mmss(n.full)}` : '満タンです'}(30分で1つ回復・出撃1回で1つ)</p></div>
      <div class="orow" style="padding:6px 0"></div><h4 class="aStaH">仲間からのスタミナ</h4><div class="aStaG"><p class="onote">確かめています…</p></div><h4 class="aStaH">フレンドに送る(1人に3時間に1回)</h4><div class="aStaP"></div>`;
    const r = b.querySelector('.orow');
    r.append(btn('shine', '100ptで満タンにする', () => { if (staNow().v >= STA_MAX) { flash('もう満タンです'); return; } if (!ptSpend(100, 'sta')) { flash('ptが足りません'); return; } S.sta.v = Math.max(S.sta.v, STA_MAX); S.sta.t = Date.now(); save(); renderTop(); close(); flash('スタミナが満タンになりました'); }));
    /* もらう */
    const G = b.querySelector('.aStaG');
    if (!(HOST && HOST.sta)) G.innerHTML = '<p class="onote">アプリの中で使えます</p>';
    else { try { const g = await HOST.sta.peek(); if (!g.length) G.innerHTML = '<p class="onote">届いていません</p>'; else { G.innerHTML = `<p class="onote">${g.slice(0, 6).map(x => esc(x.fn || '')).join('・')}${g.length > 6 ? ' ほか' : ''}から ${g.length}つ</p>`; G.appendChild(btn('', `${g.length}つ受け取る`, async () => { try { const got = await HOST.sta.take(); staNow(); S.sta.v = Math.min(99, S.sta.v + got.length); save(); staGift = 0; renderTop(); close(); flash(`スタミナを ${got.length} 受け取りました`); } catch (e) { flash('受け取れませんでした'); } })); } } catch (e) { G.innerHTML = '<p class="onote">読み込めませんでした</p>'; } }
    /* 送る */
    const P = b.querySelector('.aStaP');
    let L = HOST && HOST.sta ? HOST.sta.players() : [];
    if (HOST && HOST.friend) { try { const F = await HOST.friend.get(); L = L.filter(p => F.f.includes(p.id)); } catch (e) { L = []; } }
    if (!L.length) { P.innerHTML = HOST ? '<p class="onote">フレンドにだけ送れます。プロフィールの「フレンド」から申請してください。</p>' : '<p class="onote">アプリの中で、仲間に送れます</p>'; }
    S.staSent = S.staSent || {};
    for (const p of L) {
      const left = (S.staSent[p.id] || 0) + STA_GIFT_MS - Date.now();
      const row = h('div', 'aStaR', `<span>${esc(p.n)}</span>`);
      const bt = btn(left > 0 ? 'sub' : '', left > 0 ? `あと${mmss(left)}` : '送る', async () => { if ((S.staSent[p.id] || 0) + STA_GIFT_MS > Date.now()) return; bt.disabled = true; try { if (await HOST.sta.send(p.id)) { S.staSent[p.id] = Date.now(); save(); bt.textContent = '送った'; bt.className = 'aBtn sub'; } else { bt.disabled = false; flash('送れませんでした'); } } catch (e) { bt.disabled = false; flash('送れませんでした'); } });
      if (left > 0) bt.disabled = true; row.appendChild(bt); P.appendChild(row);
    }
    const r2 = h('div', 'orow'); r2.style.padding = '10px 0 0'; r2.appendChild(btn('sub', '閉じる', close)); b.appendChild(r2);
  });
}
/* ===== (11/9) フレンド(山本さん): 申請して相手が承認・上限なし。スタミナを送れるのはフレンドだけ ===== */
let frIn = 0;
async function frPeek() { try { if (HOST && HOST.friend) { const F = await HOST.friend.get(); const was = frIn; frIn = F.in.length; if (was !== frIn && TAB === 'other') renderNow(); } } catch (e) { } }
setInterval(frPeek, 60000); setTimeout(frPeek, 4000);
function frMenu() {
  modal('フレンド', async (b, close) => {
    if (!(HOST && HOST.friend)) { b.innerHTML = '<p class="onote">アプリの中で使えます</p>'; const r = h('div', 'orow'); r.appendChild(btn('sub', '閉じる', close)); b.appendChild(r); return; }
    const draw = async () => {
      b.innerHTML = '<p class="onote">読み込み中…</p>';
      let F; try { F = await HOST.friend.get(); } catch (e) { b.innerHTML = '<p class="onote">読み込めませんでした</p>'; return; }
      const all = HOST.sta.players(), nm = id => (all.find(p => p.id === id) || {}).n || '(いない人)';
      frIn = F.in.length;
      b.innerHTML = `${F.in.length ? `<h4 class="aStaH">届いた申請</h4><div class="aStaP fIn"></div>` : ''}<h4 class="aStaH">フレンド(${F.f.length}人)</h4><div class="aStaP fF"></div><h4 class="aStaH">申請する</h4><div class="aStaP fAdd"></div>`;
      const row = (name, ...btns) => { const r = h('div', 'aStaR', `<span>${esc(name)}</span>`); btns.forEach(x => r.appendChild(x)); return r; };
      const act = (label, kind, fn) => { const x = btn(kind, label, async () => { x.disabled = true; try { await fn(); } catch (e) { flash('うまくいきませんでした'); } draw(); }); return x; };
      const I = b.querySelector('.fIn'); if (I) for (const x of F.in) I.appendChild(row(x.n || nm(x.p), act('ことわる', 'sub', () => HOST.friend.decline(x.p)), act('承認', '', () => HOST.friend.accept(x.p))));
      const L = b.querySelector('.fF'); if (!F.f.length) L.innerHTML = '<p class="onote">まだいません。下から申請してください。</p>';
      for (const id of F.f) { const pv = btn('sub', 'プロフィール', () => profOpen(id, nm(id))); const rm = btn('sub', 'はずす', async () => { if (rm.dataset.ok !== '1') { rm.dataset.ok = '1'; rm.textContent = 'もう一度押す'; return; } rm.disabled = true; try { await HOST.friend.remove(id); } catch (e) { } draw(); }); L.appendChild(row(nm(id), pv, rm)); }
      const A = b.querySelector('.fAdd'); const rest = all.filter(p => !F.f.includes(p.id) && !F.in.some(x => x.p === p.id));
      if (!rest.length) A.innerHTML = '<p class="onote">申請できる人はいません</p>';
      for (const p of rest) A.appendChild(row(p.n, F.out.includes(p.id) ? Object.assign(btn('sub', '申請中', () => { }), { disabled: true }) : act('申請', '', async () => { const r = await HOST.friend.request(p.id); flash(r === 'friend' ? 'フレンドになりました' : r === 'full' ? '相手の申請がいっぱいです' : '申請しました'); })));
      const r = h('div', 'orow'); r.style.padding = '10px 0 0'; r.appendChild(btn('sub', '閉じる', () => { close(); if (TAB === 'other') renderNow(); })); b.appendChild(r);
    };
    draw();
  });
}
/* ===== (11/9) 「その他」→ プロフィール(山本さん)。参考: 原神・スターレイルのプロフィール(名刺・キャラの展示・実績の数・高難度の進み具合)、
   ウマ娘のトレーナー情報(代表・称号・ファン数)、ブルアカの先生のプロフィール。ほかの人もマルチの部屋から見られる(caprof/{pid}) ===== */
const REC0 = () => ({ win: 0, cm: 0, dm: 0, raid: 0, multi: 0, tw: 0, since: Date.now() });
function recWin(st, info) {
  const R = S.rec = Object.assign(REC0(), S.rec || {}); R.win++; R.cm = Math.max(R.cm, info.cm || 0); R.dm = Math.max(R.dm, info.dm || 0);
  if (st.ev === 'raid') R.raid++; if (info.multi) R.multi++; if (st.ev === 'tower') R.tw = Math.max(R.tw, (st.fl || 0));
  profDirty = true;
}
let profDirty = true;
function profStats() {
  const R = Object.assign(REC0(), S.rec || {}), ids = new Set(S.units.map(u => u.id)), all = Object.keys(CH).length;
  let stars = 0, starMax = 0; for (let i = 0; i < A.STAGES.length; i++) { const st = A.STAGES[i]; if (st.ev) continue; for (const hd of [false, true]) { starMax += 3; stars += bitsN(S.stars[skey(i, hd)] || 0); } }
  const clr = A.PROG.n.filter(Boolean).length + A.PROG.h.filter(Boolean).length;
  const r5 = [...ids].filter(id => CH[id] && CH[id].rar === 5).length, evo = S.units.filter(u => u.evo).length;
  return [
    ['★を取った数', `${stars}<small> / ${starMax}</small>`], ['クリアしたステージ', `${clr}`],
    ['最高コンボ', `${R.cm}`], ['1回の最大ダメージ', `${(R.dm || 0).toLocaleString()}`],
    ['集めたキャラ', `${ids.size}<small> / ${all}</small>`], ['★5のキャラ', `${r5}`],
    ['★6に進化', `${evo}`], ['勝った回数', `${R.win}`],
    ['降臨で勝った', `${R.raid}`], ['マルチで勝った', `${R.multi}`],
    ['塔の最高', `${Math.max(R.tw || 0, (S.tower && S.tower.top) || 0)}<small>階</small>`], ['始めた日', `${new Date(R.since).toLocaleDateString('ja-JP')}`],
  ];
}
const favUnits = () => { const F = (S.fav || []).map(id => S.units.filter(u => u.id === id).sort((a, b) => b.lv - a.lv)[0]).filter(Boolean); if (F.length) return F.slice(0, 3); return S.units.slice().sort((a, b) => rarOf(b) - rarOf(a) || b.lv - a.lv).filter((u, i, L) => L.findIndex(x => x.id === u.id) === i).slice(0, 3); };
/* ほかの人に見せる分(caprof/{pid})。名前・ランク・ひとこと・お気に入り3体・記録 */
function profPack() { const ri = HOST && HOST.rank ? HOST.rank() : rankInfo(); return { n: String(S.name || '').slice(0, 12), rk: ri.rk || 1, msg: String(S.msg || '').slice(0, 30), card: S.card || 'banner-ch1', ai: S.av && CH[S.av.id] ? S.av : (S.home ? { id: S.home, evo: homeEvo() ? 1 : 0 } : null), fav: favUnits().map(u => ({ id: u.id, lv: u.lv, evo: u.evo ? 1 : 0 })), st: profStats().map(([k, v]) => ({ k, v: String(v).replace(/<[^>]+>/g, '') })), t: Date.now() }; }   /* Firestore は配列の中の配列を保存できないので {k,v} */
function profPush() { if (!profDirty || !(HOST && HOST.prof)) return; profDirty = false; HOST.prof.save(profPack()).catch(() => { profDirty = true; }); }
const CARDS = [['banner-ch1', '第1章'], ['banner-ch2', '第2章'], ['banner-ch3', '第3章'], ['banner-ch4', '第4章'], ['banner-raid', '降臨'], ['banner-tower', '塔'], ['banner-gacha', '召喚']];
function profView(P, mine) {
  const w = h('div', 'aProf');
  const fav = (P.fav || []).map(f => { const c = CH[f.id]; if (!c) return ''; const src = PORT[evoArt(f.id, !!f.evo)] || CHIBI[evoArt(f.id, !!f.evo)] || ''; return `<div class="pf" data-id="${esc(f.id)}"><img alt="" src="${src}"><span class="pn">${esc(c.name)}</span><span class="pl">Lv${f.lv}${f.evo ? '・★6' : ''}</span></div>`; }).join('');
  w.innerHTML = `<div class="pc" style="background-image:linear-gradient(90deg,rgba(5,8,24,.92),rgba(5,8,24,.55) 60%,rgba(5,8,24,.2)),url(${UI}${esc(P.card || 'banner-ch1')}.webp)">
      <span class="av" style="${(P.av || (P.ai && CH[P.ai.id] && faceURL(P.ai.id, !!P.ai.evo))) ? `background-image:url(${P.av || faceURL(P.ai.id, !!P.ai.evo)})` : ''}"></span>
      <span class="who"><b>${esc(P.n || '')}</b><small>RANK <i>${P.rk || 1}</i></small><em>${esc(P.msg || (mine ? 'ひとことを書けます' : ''))}</em></span>${mine ? '<button class="ed" type="button">編集</button>' : ''}</div>
    <h4>お気に入り</h4><div class="pfs">${fav || '<p class="onote">まだいません</p>'}</div>
    <h4>記録</h4><div class="pst">${(P.st || []).map(x => { const k = Array.isArray(x) ? x[0] : x.k, v = Array.isArray(x) ? x[1] : esc(x.v); return `<div><small>${esc(k)}</small><b>${v}</b></div>`; }).join('')}</div>`;
  return w;
}
function renderOther() {
  const b = shell('プロフィール', 'PROFILE');
  const fb = h('button', 'aFrB', `${svg('party')}<span>フレンド</span>${frIn ? `<i>${frIn}</i>` : ''}`); fb.type = 'button'; fb.onclick = frMenu; root.appendChild(fb);
  const g = h('button', 'aGear', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/><circle cx="12" cy="12" r="6.4"/></svg>'); g.type = 'button'; g.setAttribute('aria-label', '設定・お知らせ'); g.onclick = settingsMenu; root.appendChild(g);
  const P = Object.assign(profPack(), { st: profStats(), av: myAv() });
  const v = profView(P, true); b.appendChild(v);
  v.querySelector('.ed').onclick = profEdit;
  v.querySelectorAll('.pf').forEach(e => e.onclick = profEdit);
  profPush();
}
/* (11/9) 編集は全画面(山本さん「お気に入り設定するとき見にくい」「アイコン変えれない」)。上に今の3枠、下にキャラを大きめの札で並べる */
const myAv = () => (S.av && CH[S.av.id]) ? faceURL(S.av.id, !!S.av.evo) : (S.home ? faceURL(S.home, homeEvo()) : '');
function profEdit() {
  const o = h('div', 'aGo aPe'); const sh = h('div', 'sh'); o.appendChild(sh); lay.appendChild(o);
  let card = S.card || 'banner-ch1', fav = favUnits().map(u => u.id), av = S.av && CH[S.av.id] ? Object.assign({}, S.av) : (S.home ? { id: S.home, evo: homeEvo() ? 1 : 0 } : null), mode = 'fav';
  const owned = []; const seen = new Set(); for (const u of S.units.slice().sort((a, b) => rarOf(b) - rarOf(a) || b.lv - a.lv)) { if (seen.has(u.id)) continue; seen.add(u.id); owned.push(u); }
  const best = id => S.units.filter(u => u.id === id).sort((a, b) => (b.evo ? 1 : 0) - (a.evo ? 1 : 0) || b.lv - a.lv)[0];
  const draw = () => {
    const slot = k => { const id = fav[k], u = id && best(id), c = id && CH[id]; return `<button type="button" class="ps${id ? '' : ' em'}" data-k="${k}">${c ? `<img alt="" src="${PORT[evoArt(id, !!(u && u.evo))] || ''}"><b>${esc(c.name)}</b><i>${k + 1}</i><u>はずす</u>` : `<span>${k + 1}</span><small>あき</small>`}</button>`; };
    sh.innerHTML = `<div class="tt"><b class="tb">編集</b><span>プロフィール</span></div>
      <div class="pTop"><button type="button" class="pAv"><span style="${av ? `background-image:url(${faceURL(av.id, !!av.evo)})` : ''}"></span><small>アイコン</small></button>
        <label class="pMsg"><small>ひとこと(30文字まで)</small><input maxlength="30" value="${esc(S.msg || '')}"></label></div>
      <div class="pTabs"><button type="button" data-m="fav" class="${mode === 'fav' ? 'on' : ''}">お気に入り</button><button type="button" data-m="av" class="${mode === 'av' ? 'on' : ''}">アイコン</button><button type="button" data-m="card" class="${mode === 'card' ? 'on' : ''}">名刺の背景</button></div>
      ${mode === 'fav' ? `<div class="pSlots">${[0, 1, 2].map(slot).join('')}</div><p class="pHint">下のキャラを押すと、あいている枠に入ります。枠を押すと外れます。</p>` : mode === 'av' ? '<p class="pHint">アイコンにする顔を選んでください(★6に進化したキャラは、進化後の顔も選べます)。</p>' : '<p class="pHint">名刺の背景を選んでください。</p>'}
      <div class="pGrid ${mode}"></div>
      <div class="orow pBtm"></div>`;
    const G = sh.querySelector('.pGrid');
    if (mode === 'fav') for (const u of owned) { const c = CH[u.id], k = fav.indexOf(u.id); const e = h('button', 'pc' + (k >= 0 ? ' on' : ''), `<img alt="" src="${faceURL(u.id, !!u.evo)}"><b>${esc(c.name)}</b><small>${'★'.repeat(rarOf(u))}</small>${k >= 0 ? `<i>${k + 1}</i>` : ''}`); e.type = 'button'; e.onclick = () => { const j = fav.indexOf(u.id); if (j >= 0) fav.splice(j, 1); else if (fav.length < 3) fav.push(u.id); else flash('3体まで。上の枠を押して外してください'); draw(); }; G.appendChild(e); }
    if (mode === 'av') for (const u of owned) for (const ev of (best(u.id).evo ? [0, 1] : [0])) { const c = CH[u.id], on = av && av.id === u.id && !!av.evo === !!ev; const e = h('button', 'pc' + (on ? ' on' : ''), `<img alt="" src="${faceURL(u.id, !!ev)}"><b>${esc(c.name)}</b><small>${ev ? '★6' : ''}</small>`); e.type = 'button'; e.onclick = () => { av = { id: u.id, evo: ev }; draw(); }; G.appendChild(e); }
    if (mode === 'card') for (const [k, n] of CARDS) { const e = h('button', 'pcd' + (card === k ? ' on' : ''), `<span>${n}</span>`); e.type = 'button'; e.style.backgroundImage = `url(${UI}${k}.webp)`; e.onclick = () => { card = k; draw(); }; G.appendChild(e); }
    sh.querySelectorAll('.ps').forEach(e => e.onclick = () => { const k = +e.dataset.k; if (fav[k]) { fav.splice(k, 1); draw(); } });
    sh.querySelectorAll('.pTabs button').forEach(e => e.onclick = () => { S.msgDraft = sh.querySelector('.pMsg input').value; mode = e.dataset.m; draw(); sh.querySelector('.pMsg input').value = S.msgDraft; });
    sh.querySelector('.pAv').onclick = () => { S.msgDraft = sh.querySelector('.pMsg input').value; mode = 'av'; draw(); sh.querySelector('.pMsg input').value = S.msgDraft; };
    const r = sh.querySelector('.pBtm');
    r.append(btn('sub', 'やめる', () => { delete S.msgDraft; o.remove(); }), btn('shine', '保存', () => { S.msg = sh.querySelector('.pMsg input').value.trim().slice(0, 30); delete S.msgDraft; S.card = card; S.fav = fav.slice(0, 3); if (av) S.av = av; save(); profDirty = true; o.remove(); renderTop(); renderNow(); }));
  };
  draw();
}
/* ほかの人のプロフィール(マルチの部屋から) */
async function profOpen(pid, name) {
  modal(`${name || ''}のプロフィール`, async (b, close) => {
    b.innerHTML = '<p class="onote">読み込み中…</p>';
    let P = null; try { P = HOST && HOST.prof ? await HOST.prof.load(pid) : null; } catch (e) { }
    b.innerHTML = ''; if (!P) b.innerHTML = '<p class="onote">まだプロフィールがありません(その人が一度プロフィールを開くと見られるようになります)</p>'; else b.appendChild(profView(P, false));
    const r = h('div', 'orow'); r.style.padding = '10px 0 0'; r.appendChild(btn('sub', '閉じる', close)); b.appendChild(r);
  });
}
function settingsMenu() {
  modal('設定・お知らせ', (b, closeM) => {
  const L = h('div', 'aList aGl'); b.appendChild(L);
  const item = (k, t, sub, fn) => { const e = h('button', null, `${svg(k)}<span>${esc(t)}<small>${esc(sub)}</small></span><span class="ar">›</span>`); e.type = 'button'; e.onclick = fn; L.appendChild(e); return e; };
  if (HOST) item('home', 'アプリに戻る', 'きもオタレートのホームへ', () => { try { HOST.close(); } catch (e) { } });
  /* (11/11) 画質: 最高 → 標準 → 軽い の順に切りかわる(山本さん「設定で選べるように」) */
  { const QN = { max: ['最高', '前と同じ。いちばんきれい(重い端末ではカクつくことがある)'], std: ['標準', '細かさはそのまま、ふちの仕上げだけ省く。かなり軽くなる'], lite: ['軽い', '重いときだけ少しぼやける(細かさを自動で下げる)。いちばん軽い'] }, ORD = ['max', 'std', 'lite'];
    const cur = () => { try { return A.getQuality(); } catch (e) { return 'max'; } };
    const e = item('ev', 'バトルの画質', '', () => { const q = ORD[(ORD.indexOf(cur()) + 1) % 3]; try { A.setQuality(q); } catch (er) { } show(); });
    const show = () => { const q = cur(); e.querySelector('small').textContent = '今: ' + QN[q][0] + ' ― ' + QN[q][1] + '(押すと切りかえ)'; }; show(); }
  item('ev', '画面の見た目(試し)', BRT ? '今: ソシャゲ寄り(押すと前の見た目にする)' : '今: 前の見た目(押すとソシャゲ寄りにもどす)', () => { try { localStorage.setItem('ca_ui', BRT ? 'a' : 'b'); } catch (e) { } location.reload(); });   /* (11/9) 見くらべ用 */
  if (!HOST) item('name', 'プレイヤー名', S.name, () => modal('プレイヤー名', (bd, close) => {
    bd.innerHTML = `<input maxlength="10" value="${esc(S.name)}" aria-label="プレイヤー名" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:0;font:700 16px var(--zk);color:#fff;background:#060c24;box-shadow:inset 0 0 0 1px var(--aG)">`;
    const r = h('div', 'orow'); r.style.padding = '0'; r.append(btn('sub', 'やめる', close), btn('', '決める', () => { const v = bd.querySelector('input').value.trim(); if (v) { S.name = v.slice(0, 10); save(); } close(); renderNow(); })); bd.appendChild(r);
  }));
  if (!HOST) for (const [k, n, nm] of [['jin', '紅蓮の号令', 'ジン'], ['riz', '深緑の結界', 'リズ'], ['gekka', '時の水鏡', '月華'], ['seira', '天光の雨', 'セイラ']]) item('ev', '演出の見本: ' + n, nm + 'のスキルをくり返し見る(試作)', () => A.demoFire(k));
  if (!HOST) item('ev', '演出の見本: 共鳴技', '共鳴技4つを順番にくり返し見る(試作)', () => A.demoRes());
  if (!HOST) item('plus', 'pt を +1,000', 'テスト用', () => { S.pt += 1000; save(); flash('+1,000pt'); });
  if (!HOST) item('power', '素材を少しもらう', 'テスト用。経験値の竜・中×3、大×1', () => { S.mats.expM = (S.mats.expM || 0) + 3; S.mats.expL = (S.mats.expL || 0) + 1; save(); flash('経験値の竜をもらった'); });
  item('news', 'お知らせ', '最近の変更', news);
  const rs = HOST ? null : item('data', 'データを初めに戻す', 'キャラ・素材・pt・ステージの進み具合を消す', null);
  if (rs) rs.onclick = () => modal('データを初めに戻す', (bd, close) => {
    bd.innerHTML = '<p>この端末のキャラ・素材・pt・ステージの進み具合を消して、最初の状態にします。もとに戻せません。</p>';
    const r = h('div', 'orow'); r.style.padding = '0'; r.append(btn('sub', 'やめる', close), btn('red', '初めに戻す', () => { S = fresh(); save(); try { localStorage.removeItem('ca_prog_v1'); } catch (e) { } A.PROG.n.fill(false); A.PROG.h.fill(false); close(); flash('最初の状態に戻しました'); renderNow(); })); bd.appendChild(r);
  });
  item('info', 'このゲームについて', HOST ? '分身(圧縮アリーナ)' : '圧縮アリーナ 試作', () => modal('このゲームについて', (bd, close) => { bd.innerHTML = HOST ? '<p>分身(圧縮アリーナ)。押した所に敵や球を吸い寄せて、まとめてぶつけるバトルです。ptはアプリと共通です。</p>' : '<p>圧縮アリーナ 試作。きもオタレートの「分身バトル」の新しいバージョンです。</p>'; const r = h('div', 'orow'); r.style.padding = '0'; r.appendChild(btn('sub', '閉じる', close)); bd.appendChild(r); }));
  const r = h('div', 'orow'); r.style.padding = '10px 0 0'; r.appendChild(btn('sub', '閉じる', closeM)); b.appendChild(r);
  });
}


/* ---------- (v2.2 D-101 / D-102) pt・★3つ・初回報酬・スキップ・ミッション・プレゼント ---------- */
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const RW = { first: 50, star: 10 };                        /* 初回クリア 50pt、★1つ新しく取るごとに 10pt【仮設定】 */
const skey = (i, hd) => (hd ? 'h' : 'n') + i;
const starN = i => A.STAGES[i].waves.length * 2 + 1;     /* ★3: この手数以内でクリア */
function conds(i) { return ['クリア', 'チームの体力を半分以上のこしてクリア', `${starN(i)}手以内でクリア`]; }
const bitsN = b => (b & 1) + (b >> 1 & 1) + (b >> 2 & 1);
const isPt = r => r.k === 'pt' || r.k === 'gem';
function rwText(list) { return list.map(r => isPt(r) ? `${r.n.toLocaleString()}pt` : `${MATS[r.id].name} ×${r.n}`).join('、'); }
function give(list) { for (const r of list) { if (isPt(r)) ptGain(r.n); else S.mats[r.id] = (S.mats[r.id] || 0) + r.n; } }
function rwChip(r) { return isPt(r) ? `<span class="aRw">${svg('pt', '0 0 16 16')}<b>${r.n.toLocaleString()}</b><i>pt</i></span>` : `<span class="aRw">${matIcon(r.id)}<b>${esc(MATS[r.id].name)}</b><i>×${r.n}</i></span>`; }
/* (11/8 山本さん) 経験値の竜の巣は、初級・中級・上級あわせて一日5回まで(挑戦した回数。スキップも1回)。朝5時に戻る */
const XP_MAX = 5;
const day5 = () => { const d = new Date(Date.now() - 5 * 3600e3); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
function xpFresh() { if (!S.xp || S.xp.d !== day5()) S.xp = { d: day5(), n: 0 }; }
function xpLeft() { xpFresh(); return Math.max(0, XP_MAX - S.xp.n); }
function xpTake(i) { const st = A.STAGES[i]; if (!st || st.ev !== 'exp') return true; if (xpLeft() <= 0) { flash('経験値の竜の巣は今日はもう挑戦できません(朝5時に戻ります)'); return false; } S.xp.n++; save(); return true; }
window.CA_GATE = (i) => { if (S.units.length >= boxCap()) { boxFullAsk(0); return false; } if (MPC.play) return xpTake(i); if (!staCan()) { staOut(); return false; } if (!xpTake(i)) return false; staUse(); return true; };   /* (11/9) スタミナ1つ(マルチは募集した人だけ・始めるときに) */
function dmFresh() { if (S.dm.date !== today()) S.dm = { date: today(), win: 0, power: 0, gacha: 0, got: [] }; }
/* くり返しクリアの報酬(初回とは別)。ハードは1日3回まで宝珠が出る */
function repeatDrops(st, i, hd) {
  if (st.ev) { const got = {}; for (const d of st.drops) for (let k = 0; k < d.n; k++) if (Math.random() < d.p) got[d.id] = (got[d.id] || 0) + 1; return Object.entries(got).map(([id, n]) => ({ k: 'mat', id, n })); }
  const out = [{ k: 'mat', id: 'expS', n: 1 + Math.floor(i / 3) }]; if (Math.random() < .25 + i * .05) out.push({ k: 'mat', id: 'expM', n: 1 });
  if (hd) { if (S.hd.date !== today()) S.hd = { date: today(), n: {} }; const c = S.hd.n[i] || 0; if (c < 3) { S.hd.n[i] = c + 1; out.push({ k: 'mat', id: 'orb_' + ['炎', '木', '水', '光'][Math.floor(Math.random() * 4)], n: 1 }); } }
  return out;
}
/* (11/9) 降臨ボスの化身が25%で仲間になる(山本さん)。絵がまだ無いキャラは落とさない。window.__DROPK でお試しの確率を変えられる */
const DROP_P = .25;
const dropChar = () => CHARS.find(c => c.drop === A.RAID.n);
const hasArt = id => !!(A.PORT && A.PORT.img && A.PORT.img[id]);
function raidDrop() {
  const c = dropChar(); if (!c || !hasArt(c.id)) return '';
  if (Math.random() >= (window.__DROPK != null ? +window.__DROPK : DROP_P)) return '';
  const isNew = !S.units.some(u => u.id === c.id); const u = { u: S.next++, id: c.id, lv: 1, exp: 0, evo: 0 }; S.units.push(u); S.newIds.push(u.u);
  S.raid.drop = (S.raid.drop || 0) + 1; LASTDROP = { u, isNew };
  return `${c.name}(★5)が仲間になった!${isNew ? '' : '(同じキャラを重ねると凸で強くなる)'} `;
}
let LASTDROP = null;
function dropModal(d) {
  const c = CH[d.u.id]; modal('仲間になった!', (b, close) => {
    b.innerHTML = `<div style="text-align:center"><img alt="" src="${bigFaceURL(c.id, 0)}" style="width:150px;height:150px;border-radius:24px;border:3px solid ${elCol(c.el)};box-shadow:0 0 24px ${elCol(c.el)}"><p style="margin:10px 0 4px;font-size:20px;font-weight:900">${esc(c.name)} <span style="color:#ffd36a">★5</span></p><p class="onote" style="margin:0">${esc(c.drop)}の化身。${d.isNew ? 'キャラのBOXに入りました。' : '同じキャラを強化の素材にすると凸で強くなります。'}<br>特効: ${esc((CABIL[c.id] || []).map(k => ABIL[k].n).filter(n => /キラー/.test(n)).join('・'))}</p></div>`;
    const r = h('div', 'orow'); r.style.padding = '12px 0 0'; r.append(btn('shine', 'OK', close)); b.appendChild(r);
  });
}
let LAST = null;
function onClearStage(st, info) {
  recWin(st, info);
  try { if (HOST && HOST.gb) HOST.gb(info.multi ? 'm' : 's', st.gbm || 0); } catch (e) { } /* (11/10) ゲームバカイベントのメダル(イベントのステージは決まった枚数) */
  if (info.multi) return multiClear(st, info);
  if (st.ev === 'tower' || st.ev === 'raid' || st.ev === 'score' || st.ev === 'ex' || st.ev === 'lev' || st.ev === 'gbr') {
    chFresh(); const rewards = []; let msg = '';
    if (st.ev === 'ex') { const key = st.bi + '-' + st.ti, first = !S.ex[key], R = EXRW[st.ti]; if (first) { S.ex[key] = 1; rewards.push(...exRw(R.f, st.el)); msg = `${A.EXB[st.bi].n}【${st.tier}】をはじめてクリア! ${st.ti < 2 ? '「' + A.EXT[st.ti + 1].n + '」が開きました。' : ''}`; } else { for (const r of exRw(R.r, st.el)) if (Math.random() < (r.p || 1)) rewards.push({ k: r.k, id: r.id, n: r.n }); msg = `${A.EXB[st.bi].n}【${st.tier}】に勝った! `; } }
    if (st.ev === 'gbr') { msg = `ゲーセンメダル ${st.gbm}枚。`; const kid = GB_KESHIN; if (CH[kid] && Math.random() < .25) { const isNew = !S.units.some(u => u.id === kid); const u = { u: S.next++, id: kid, lv: 1, exp: 0, evo: 0 }; S.units.push(u); S.newIds.push(u.u); msg += `${CH[kid].name}(ガチャ魔神の化身)が仲間になった!${isNew ? '' : '(かぶり)'} `; } }
    if (st.ev === 'lev' && st.gbm) { msg = `ゲーセンメダル ${st.gbm}枚。`; }
    else if (st.ev === 'lev') { const m = st.md[0] + Math.floor(Math.random() * (st.md[1] - st.md[0] + 1)); S.lev.medal += m; if (!S.lev.win[st.ti]) rewards.push({ k: 'pt', n: 100 }); S.lev.win[st.ti]++; msg = `イベントメダル ${m}枚(いま ${S.lev.medal}枚)。`; }
    if (st.ev === 'tower') { if (st.fl === S.tower.top + 1) { S.tower.top = st.fl; rewards.push(...towerRw(st.fl)); wmFresh(); S.wm.tower++; msg = st.fl + '階をクリア! '; } else msg = st.fl + '階(クリア済み)。'; }
    if (st.ev === 'raid') { if (!S.raid.win) rewards.push({ k: 'pt', n: 300 }); for (const d of st.drops) for (let k = 0; k < d.n; k++) if (Math.random() < d.p) rewards.push({ k: 'mat', id: d.id, n: 1 }); S.raid.win++; wmFresh(); S.wm.raid++; msg = A.RAID.n + 'に勝った! '; const dc = raidDrop(); if (dc) msg += dc; }
    if (st.ev === 'score') { const sc = scoreOf(info), nb = sc > S.score.best; S.score.last = sc; S.score.n++; if (nb) S.score.best = sc; wmFresh(); S.wm.score++; msg = `スコア ${sc.toLocaleString()} 点${nb ? '(自己ベスト更新!)' : `(ベスト ${S.score.best.toLocaleString()})`} `; try { window.CA_SCORE && window.CA_SCORE(sc, nb); } catch (e) { } }
    const merged = {}; for (const r of rewards) { const k = r.k === 'pt' ? 'pt' : r.id; merged[k] = merged[k] ? Object.assign({}, merged[k], { n: merged[k].n + r.n }) : Object.assign({}, r); }
    const rw = Object.values(merged); give(rw); dmFresh(); S.dm.win++; wmFresh(); S.wm.win++; save(); LAST = null;
    return msg + (rw.length ? '手に入れた: ' + rwText(rw) : '');
  }
  const i = info.i, hd = !!info.h, key = skey(i, hd), old = S.stars[key] || 0;
  let bits = 1; if (info.hpMax && info.hp / info.hpMax >= .5) bits |= 2; if (info.turn <= starN(i)) bits |= 4;
  const nb = bits & ~old, rewards = [];
  if (!st.ev && info.first) rewards.push({ k: 'pt', n: RW.first });
  if (nb) rewards.push({ k: 'pt', n: bitsN(nb) * RW.star });
  rewards.push(...repeatDrops(st, i, hd));
  S.stars[key] = old | bits; give(rewards); dmFresh(); S.dm.win++; wmFresh(); S.wm.win++; save();
  LAST = { i, hd, bits, nb, rewards, first: info.first && !st.ev };
  return st.ev ? (rewards.length ? '手に入れた: ' + rwText(rewards) : '今回は何も落ちませんでした。') : '';
}
/* 結果画面に ★3つ と もらった物 を出す */
function resultBlock(ok) {
  document.querySelectorAll('#ores').forEach(e => e.remove()); if (!ok || !LAST) return;
  const rc = document.querySelector('#res .rc'), rr = $('rr'); if (!rc || !rr) return;
  const c = conds(LAST.i), d = h('div'); d.id = 'ores';
  d.innerHTML = `<div class="aRs">${c.map((t, k) => { const on = LAST.bits >> k & 1, nw = LAST.nb >> k & 1; return `<div class="${on ? 'on' : ''}"><i>★</i><span>${esc(t)}</span>${nw ? '<em>NEW</em>' : ''}</div>`; }).join('')}</div>
    ${LAST.rewards.length ? `<div class="aRl">${LAST.first ? '<small>初回クリア報酬つき</small>' : ''}${LAST.rewards.map(rwChip).join('')}</div>` : ''}`;
  rc.insertBefore(d, rr); LAST = null;
}
/* スキップ(★3を取ったステージだけ): 戦わずにくり返しの報酬をもらう */
function skipStage(i, hd) {
  if (!staCan()) { staOut(); return; }
  if (!xpTake(i)) return; staUse();
  const st = A.STAGES[i], r = repeatDrops(st, i, hd); give(r); dmFresh(); S.dm.win++; save();
  try { if (HOST && HOST.gb) HOST.gb('s'); } catch (e) { } /* (11/10) スキップもソロのクリアとして数える */
  modal('スキップ', (b, close) => { b.innerHTML = `<p style="text-align:center">${esc(st.id || '')} ${esc(st.n)} をスキップしました</p><div class="aRl">${r.length ? r.map(rwChip).join('') : '<p>今回は何も落ちませんでした</p>'}</div>`; const row = h('div', 'orow'); row.style.padding = '0'; row.append(btn('sub', '閉じる', close), btn('', 'もう一度', () => { close(); skipStage(i, hd); })); b.appendChild(row); });
  renderNow();
}
function addBox(list, from) { for (const r of list) S.box.push(Object.assign({ from, t: Date.now() }, r)); }
/* ログインボーナスは入れない(きもオタレートのポイントと共通のため。D-102) */
/* デイリーミッション */
const DM = [
  { id: 'win', t: 'バトルに3回勝つ(スキップも数える)', ok: () => S.dm.win >= 3, pg: () => Math.min(3, S.dm.win) + '/3', r: [{ k: 'mat', id: 'expM', n: 1 }] },
  { id: 'power', t: 'キャラを1回強化する', ok: () => S.dm.power >= 1, pg: () => Math.min(1, S.dm.power) + '/1', r: [{ k: 'pt', n: 20 }] },
  { id: 'gacha', t: 'ガチャを1回引く', ok: () => S.dm.gacha >= 1, pg: () => Math.min(1, S.dm.gacha) + '/1', r: [{ k: 'pt', n: 20 }] },
];
const DM_ALL = { id: 'all', t: '今日のミッションを全部達成', r: [{ k: 'pt', n: 50 }] };
/* (v98) ウィークリーミッション(D-117)。月曜にリセット */
const weekId = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
function wmFresh() { if (!S.wm || S.wm.wk !== weekId()) S.wm = { wk: weekId(), win: 0, power: 0, tower: 0, raid: 0, score: 0, got: [] }; }
const WMQ = (id, t, key, n, r) => ({ id, t, ok: () => S.wm[key] >= n, pg: () => Math.min(n, S.wm[key]) + '/' + n, r });
const WM = [
  WMQ('w_win', 'バトルに15回勝つ', 'win', 15, [{ k: 'pt', n: 200 }]),
  WMQ('w_power', 'キャラを5回強化する', 'power', 5, [{ k: 'mat', id: 'expL', n: 1 }]),
  WMQ('w_tower', '塔を3階のぼる', 'tower', 3, [{ k: 'pt', n: 200 }]),
  WMQ('w_raid', '降臨ボスに1回勝つ', 'raid', 1, [{ k: 'pt', n: 200 }]),
  WMQ('w_score', 'スコアアタックに1回挑戦', 'score', 1, [{ k: 'pt', n: 150 }]),
];
const WM_ALL = { id: 'w_all', t: '今週のミッションを全部達成', r: [{ k: 'pt', n: 500 }] };
function dmClaimable() { dmFresh(); wmFresh(); let n = 0; for (const m of WM) if (m.ok() && !S.wm.got.includes(m.id)) n++; if (WM.every(m => S.wm.got.includes(m.id)) && !S.wm.got.includes('w_all')) n++; for (const m of DM) if (m.ok() && !S.dm.got.includes(m.id)) n++; if (DM.every(m => S.dm.got.includes(m.id)) && !S.dm.got.includes('all')) n++; return n; }
let MTAB = 'd';
function missions() {
  dmFresh(); wmFresh();
  modal('ミッション', (b, close) => {
    const draw = () => {
      const wk = MTAB === 'w', L = wk ? WM : DM, ALL = wk ? WM_ALL : DM_ALL, st = wk ? S.wm : S.dm;
      const allDone = L.every(m => st.got.includes(m.id));
      const nd = DM.filter(m => m.ok() && !S.dm.got.includes(m.id)).length, nw = WM.filter(m => m.ok() && !S.wm.got.includes(m.id)).length;
      b.innerHTML = `<div class="aMsT"><button type="button" data-t="d" class="${wk ? '' : 'on'}">デイリー${nd ? `<i>${nd}</i>` : ''}</button><button type="button" data-t="w" class="${wk ? 'on' : ''}">ウィークリー${nw ? `<i>${nw}</i>` : ''}</button></div>
        <p class="aMs-h">${wk ? '毎週月曜日にリセットされます' : '日付が変わるとリセットされます'}</p><div class="aMs">${[...L, ALL].map(m => { const done = st.got.includes(m.id), ok = m.id === ALL.id ? allDone : m.ok(); return `<div class="${done ? 'done' : ok ? 'ok' : ''}"><span class="t">${esc(m.t)}${m.pg ? `<small>${m.pg()}</small>` : ''}</span><span class="r">${m.r.map(rwChip).join('')}</span><button type="button" data-id="${m.id}" ${done || !ok ? 'disabled' : ''}>${done ? '受取済' : ok ? '受け取る' : '未達成'}</button></div>`; }).join('')}</div>`;
      b.querySelectorAll('.aMsT button').forEach(x => x.onclick = () => { MTAB = x.dataset.t; draw(); });
      b.querySelectorAll('.aMs button').forEach(x => x.onclick = () => { const m = [...L, ALL].find(q => q.id === x.dataset.id); give(m.r); st.got.push(m.id); save(); flash(rwText(m.r) + ' をもらった'); draw(); renderNow(); });
      const row = h('div', 'orow'); row.style.padding = '0'; row.appendChild(btn('sub', '閉じる', close)); b.appendChild(row);
    };
    draw();
  });
}
/* プレゼント箱 */
function presents() {
  modal('プレゼント箱', (b, close) => {
    const draw = () => {
      b.innerHTML = S.box.length ? `<div class="aBx">${S.box.map((r, k) => `<div>${rwChip(r)}<small>${esc(r.from)}</small><button type="button" data-k="${k}">受け取る</button></div>`).join('')}</div>` : '<p style="text-align:center">プレゼントはありません</p>';
      b.querySelectorAll('.aBx button').forEach(x => x.onclick = () => { const r = S.box.splice(+x.dataset.k, 1); give(r); save(); draw(); renderNow(); });
      const row = h('div', 'orow'); row.style.padding = '0'; row.appendChild(btn('sub', '閉じる', close));
      if (S.box.length) row.appendChild(btn('', 'まとめて受け取る', () => { const all = S.box.splice(0); give(all); save(); flash(rwText(all) + ' を受け取った'); draw(); renderNow(); }));
      b.appendChild(row);
    };
    draw();
  });
}
/* ガチャの天井(v116): 1回で1ポイント。100たまると「★5確定の1回召喚」が引ける(どの★5かはランダム)。ポイントは次のガチャにも持ち越す */
const PITY = 100;
function pityTrade() {
  if (S.pity < PITY) return;
  modal('★5確定召喚', (b, close) => {
    b.innerHTML = `<p style="text-align:center">交換ptを ${PITY} 使って、<b>★5が必ず出る1回召喚</b>をします。<br><span style="font-size:12px">どの★5が出るかはランダムです(いま ${S.pity}pt)</span></p>`;
    const r = h('div', 'orow'); r.style.padding = '0'; r.append(btn('sub', 'やめる', close), btn('shine', '召喚する', () => { close(); pityPull(); })); b.appendChild(r);
  });
}
function pityPull() {
  if (S.pity < PITY) return; if (boxFull(1)) { boxFullAsk(1); return; }
  const p = pool(5), id = p[Math.floor(Math.random() * p.length)].id;
  S.pity -= PITY; const isNew = !S.units.some(u => u.id === id); const u = { u: S.next++, id, lv: 1, exp: 0, evo: 0 }; S.units.push(u); S.newIds.push(u.u);
  save(); summon([{ u, isNew }], 1, 0);
}
/* ---------- 戦闘との行き来 ---------- */
function showOut(tab) { if (!showOut.adj) { showOut.adj = 1; try { applyAdj(); } catch (e) { console.warn('adj', e); } } if (LASTDROP) { const d = LASTDROP; LASTDROP = null; setTimeout(() => dropModal(d), 300); } document.body.classList.add('navon'); nav.hidden = false; hud.hidden = false; if (tab) TAB = tab; renderNow(); loadCover(); if (S.free10 && !needFree() && !showOut.f) { showOut.f = 1; setTimeout(() => flash('ガチャで無料の10回召喚が引けます'), 900); } }
/* (v68) 絵が読み終わるまで「読み込み中」を出す。読み終わったら描き直す(スマホで立ち絵や背景が出ないままだったため) */
let LDC = null;
function artReady() { return !!(A.PORT && A.PORT.ready) && !!window.CA_UIOK; }
function loadCover() {
  if (artReady() || LDC) return;
  LDC = h('div', 'oload', `<div class="sp"></div><b>読み込み中</b><small>キャラの絵と背景を読んでいます</small>`); lay.appendChild(LDC);
  const t0 = Date.now(), tick = setInterval(() => { if (artReady() || Date.now() - t0 > 30000) { clearInterval(tick); if (LDC) { LDC.remove(); LDC = null; } for (const k in faceCache) delete faceCache[k]; renderNow(); } }, 300);
}
for (const ev of ['ca:port', 'ca:uiok']) window.addEventListener(ev, () => { for (const k in faceCache) delete faceCache[k]; for (const k in bigFace) delete bigFace[k]; renderNow(); });
function hideOut() { document.body.classList.remove('navon'); nav.hidden = true; hud.hidden = true; root.hidden = true; clearInterval(banT); clearInterval(gaT); document.querySelectorAll('.omodal,.aSheet,.aSum2,.aGo').forEach(m => m.remove()); }
window.addEventListener('ca:screen', e => {
  const s = e.detail.s;
  if (s === 'battle' || s === 'result') { hideOut(); if (s === 'result') setTimeout(() => resultBlock(e.detail.ok), 30); }
  else if (s === 'select') { if (!document.body.classList.contains('navon')) { SUB.quest = 'main'; showOut('quest'); } }
  else if (s === 'event') { SUB.quest = 'event'; showOut('quest'); }
  else if (s === 'challenge') { SUB.quest = 'chal'; showOut('quest'); }
});
/* 起動したとき: ステージ選択の代わりにホームを出す(#s や #w で直接始めたときは戦闘のまま) */
if (!$('ss').hidden) { showOut('home'); } else hideOut();
const waitPort = setInterval(() => { if (A.PORT.ready) { clearInterval(waitPort); renderNow(); } }, 500);
/* 確認用: #o-chara などでその画面を直接開く(デモ・確認のため) */
function route() { const m = /^#o-(home|chara|quest|gacha|other)(?:-(box|party|power|mats|event|main))?$/.exec(location.hash); if (m) { if (m[2]) { if (m[1] === 'quest') SUB.quest = m[2]; else SUB.chara = m[2]; } PICK = null; showOut(m[1]); } }
/* 確認用の見本(保存しない): #t-sum10 #t-sum1 で召喚の演出、#t-detail でキャラの詳しい画面、#t-news でお知らせ */
function tRoute() {
  const hs = location.hash;
  if (hs === '#t-sum10' || hs === '#t-sum1' || hs === '#t-sum5') { showOut('gacha'); const n = hs === '#t-sum1' ? 1 : 10; const got = []; for (let k = 0; k < n; k++) { const id = hs === '#t-sum5' && k === 3 ? 'seira' : rollOne(); got.push({ u: { u: -1 - k, id, lv: 1, exp: 0, evo: 0 }, isNew: k % 4 === 0 }); } setTimeout(() => summon(got, n, 0), 600); }
  if (hs === '#t-detail') { showOut('chara'); setTimeout(() => detail(unit(S.team[0])), 600); }
  if (hs === '#t-news') { showOut('home'); setTimeout(news, 600); }
  /* (v70) 新キャラの確認用(保存しない) */
  if (hs === '#t-np' || hs === '#t-nb') { let u = 900; for (const k of ['kagura', 'yomogi', 'minamo', 'lux', 'hinoko', 'kurumi', 'nagi', 'kirara']) if (!S.units.some(x => x.id === k)) S.units.push({ u: u++, id: k, lv: 1, exp: 0, evo: 0 }); const id = k => S.units.find(x => x.id === k).u; S.team = [id('kagura'), id('minamo'), id('lux'), id('kirara')]; S.lead = 'kagura'; syncParty();
    if (hs === '#t-np') { SUB.chara = 'party'; PICK = { slot: 0 }; showOut('chara'); } else setTimeout(() => A.startStage(3, false), 1500); }
  /* (v85) ★6の絵の確認用(保存しない): #t-evo6 で詳しい画面、#t-evob で戦闘 */
  if (hs === '#t-evo6') { showOut('other'); setTimeout(evoGallery, 600); }
  /* (11/11) ★6の豪華な飾りの確認用(保存しない): #t-lux6 で詳しい画面、#t-evos で進化の瞬間、#t-luxh でホーム */
  /* (11/11) BOXの見え方の確認用(保存しない): #t-box で、いろいろなキャラを70体持っている状態 */
  if (hs === '#t-box') { const ids = Object.keys(CH).filter(k => CH[k].battle); let u = 5000; S.units = []; for (let i = 0; i < 70; i++) { const id = ids[(i * 7 + (i >> 2)) % ids.length]; S.units.push({ u: u++, id, lv: 1 + (i * 13) % (MAXLV[CH[id].rar] || 50), exp: 0, evo: CH[id].rar === 5 && i % 5 === 0 ? 1 : 0 }); } S.team = S.units.slice(0, 4).map(x => x.u); S.free10 = 0; S.newIds = S.units.slice(8, 12).map(x => x.u); TAB = 'chara'; SUB.chara = 'box'; showOut('chara'); renderNow(); }
  if (hs === '#t-pw') { const ids = Object.keys(CH).filter(k => CH[k].battle); let u = 5000; S.units = []; for (let i = 0; i < 70; i++) { const id = ids[(i * 7 + (i >> 2)) % ids.length]; S.units.push({ u: u++, id, lv: 1 + (i * 5) % 20, exp: 0, evo: 0 }); } S.team = S.units.slice(0, 4).map(x => x.u); S.free10 = 0; S.mats.expS = 30; S.mats.expM = 12; S.mats.expL = 4; TAB = 'chara'; SUB.chara = 'power'; PICK = { base: S.units[5].u, mats: {}, units: [] }; showOut('chara'); renderNow(); }
  if (hs === '#t-lux6') { showOut('chara'); setTimeout(() => detail({ u: -1, id: 'gbpro', lv: 90, exp: 0, evo: 1 }), 600); }
  if (hs === '#t-evos') { showOut('chara'); setTimeout(() => evoShow('gbpro', () => detail({ u: -1, id: 'gbpro', lv: 70, exp: 0, evo: 1 })), 600); }
  if (hs === '#t-luxh') { if (!S.units.some(x => x.id === 'gbpro')) S.units.push({ u: 990, id: 'gbpro', lv: 70, exp: 0, evo: 1 }); else S.units.find(x => x.id === 'gbpro').evo = 1; S.home = 'gbpro'; S.free10 = 0; TAB = 'home'; showOut('home'); renderNow(); }
  if (hs === '#t-evob') setTimeout(evoTrial, 1500);
  /* (v99) 章のラスボス竜の確認用: #t-lb2 #t-lb3 #t-lb4 でその章の最後のウェーブから */
  /* (v103) 高難度ボスの確認用: #t-exb(炎角獣) #t-ext(古樹の巨人)。#t-tot で凸の画面(かぶりを1体仮に足す。保存しない) */
  /* (v112) 新キャラの確認用(保存しない): #t-n5 で新しい★5の4人、#t-n4 で新しい★4の4人で戦う。(v118) スキルはいつでも使える */
  if (hs === '#t-n5' || hs === '#t-n4') setTimeout(() => { const T = (hs === '#t-n5' ? ['beni', 'shion', 'ibara', 'lumie'] : ['pom', 'pukuru', 'futa', 'tomori']).map(k => ({ u: -1, id: k, lv: 50, exp: 0, evo: 0 })); window.CA_PARTY = Object.fromEntries(T.map(x => [x.id, mult(x)])); window.CA_ABIL = Object.fromEntries(T.map(x => [x.id, abilOf(x)])); window.CA_EVO = {}; window.CA_SKCUT = {}; window.CA_TEAM = T.map(x => x.id); window.CA_LEAD = 0; A.startStage(2, false);
    /* (v118) 技の見た目を確かめやすいように、スキルを最初からためておく。使ったあとも手番ごとにためなおす */
    const fill = () => { const C = window.__CA; if (C && C.G && C.G.sk) { C.G.sk = C.G.sk.map(() => 99); } }; setTimeout(fill, 2500); setInterval(() => { const C = window.__CA; if (C && C.G && C.G.phase === 'idle') fill(); }, 1500); }, 1500);
  if (hs === '#t-exb' || hs === '#t-ext') setTimeout(() => { const C = window.__CA, i = C.STAGES.findIndex(st => st.ev === 'ex' && st.bi === (hs === '#t-exb' ? 0 : 1) && st.ti === 0); C.startStage(i, false); setTimeout(() => C.loadWave(C.STAGES[i].waves.length - 1), 800); }, 1500);
  if (hs === '#t-tot') { const b0 = unit(S.team[0]); S.units.push({ u: 990, id: b0.id, lv: 1, exp: 0, evo: 0 }); SUB.chara = 'power'; PICK = { base: b0.u, mats: {}, units: [] }; showOut('chara'); }
  if (/^#t-lb[234]$/.test(hs)) setTimeout(() => { const C = window.__CA; C.startStage({ 2: 15, 3: 23, 4: 31 }[hs[5]], false); setTimeout(() => C.loadWave(3), 800); }, 1500);
  if (hs === '#t-skin') setTimeout(() => { showOut('chara'); detail(unit(S.team[0])); }, 2500);  /* 確認用: くわしい画面のスキンの段 */
  if (hs === '#t-pity') { S.pity = PITY; showOut('gacha'); }  /* 確認用: 天井がたまった画面(保存はしない。引くと保存される) */
  if (hs === '#t-ev') { TAB = 'quest'; SUB.quest = 'event'; EVSEL = 'orb_炎'; showOut('quest'); }
  if (hs === '#t-evs') { TAB = 'quest'; SUB.quest = 'event'; EVSEL = 'orb_炎'; showOut('quest'); setTimeout(() => goSheetEv('orb_炎', 2), 1800); }
  if (hs === '#t-clear') { A.startStage(0, false); setTimeout(() => window.__CA.stageClear(), 4000); }
  /* 全部の画面を5秒ずつ順に出す(PCでまとめて確認するため。保存はしない) */
  if (hs === '#t-tour') {
    const close = () => document.querySelectorAll('.omodal,.aSheet,.aSum2,.aGo').forEach(m => m.remove());
    const steps = [() => showOut('home'), () => { SUB.chara = 'party'; showOut('chara'); PICK = { slot: 1 }; renderNow(); }, () => { SUB.quest = 'main'; showOut('quest'); setTimeout(() => goSheet(0, false), 300); }, () => { SUB.chara = 'power'; showOut('chara'); PICK = { base: S.party.jin, mats: {}, units: [] }; renderNow(); }, () => { SUB.chara = 'box'; showOut('chara'); }, () => { SUB.chara = 'mats'; showOut('chara'); },
      () => { SUB.quest = 'event'; showOut('quest'); }, () => { SUB.quest = 'main'; showOut('quest'); }, () => showOut('gacha'), () => detail(unit(S.team[3])), () => { close(); showOut('other'); }, () => { showOut('home'); missions(); }, () => { close(); showOut('home'); presents(); }, () => { close(); showOut('gacha'); pityTrade(); }];
    let i = 0; const tick = () => { close(); steps[i++ % steps.length](); setTimeout(tick, 6000); }; showOut('home'); setTimeout(tick, 800);
  }
}
route(); tRoute(); addEventListener('hashchange', () => { route(); tRoute(); });
/* (v120) アプリの中で開いたとき: 読み込みの札を消してもらう */
if (HOST) setTimeout(() => { try { HOST.ready(); } catch (e) { } }, 300);
