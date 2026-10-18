/* きもオタレート push notifications.
   Each player's phones are in push/{pid}: tk = {token: {t, ua}}, p = {ch, msg, give} (false = off), test = time of a test request.
   Every trigger below only reads a few documents and sends one message per phone. */
const {onDocumentCreated, onDocumentWritten, onDocumentUpdated} = require('firebase-functions/v2/firestore');
const {setGlobalOptions} = require('firebase-functions/v2');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const fs = require('fs');
admin.initializeApp();
const db = admin.firestore();
const REGION = (() => { try { return fs.readFileSync(__dirname + '/region.txt', 'utf8').trim() || 'asia-northeast1'; } catch (e) { return 'asia-northeast1'; } })();
setGlobalOptions({region: REGION, maxInstances: 3, memory: '256MiB', timeoutSeconds: 60});

const BUILTIN = {ygo: '遊戯王', dm: 'デュエル・マスターズ'};
async function genreName(g) {
  if (g === 'tcg') return 'きもオタTCG';
  try { const d = (await db.doc('config/genres').get()).data(); const x = ((d && d.list) || []).find(x => x.id === g); if (x && x.n) return x.n; } catch (e) {}
  return BUILTIN[g] || '対戦';
}
const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

/* pids: list of player ids, or null for everyone. cat: ch / msg / give, or null to ignore the player's choices (test) */
async function send(pids, cat, m, onlyPv) {
  const docs = pids ? (await Promise.all([...new Set(pids)].filter(Boolean).map(id => db.doc('push/' + id).get()))).filter(d => d.exists)
                    : (await db.collection('push').get()).docs;
  const toks = [], own = [];
  for (const d of docs) {
    const v = d.data() || {};
    if (!v.tk || (cat && v.p && v.p[cat] === false)) continue;
    /* (10/16) one notice per phone: someone with both the main app and お試し版 got everything twice.
       Normal notices go to the main app's tokens (お試し版 only if that is all they have); お試し版-only notices to お試し版.
       The same phone registered twice (same browser string) keeps only its newest token */
    const ks = Object.keys(v.tk), pv = t => !!(v.tk[t] && v.tk[t].pv), main = ks.filter(t => !pv(t));
    const use = onlyPv ? ks.filter(pv) : (main.length ? main : ks), best = {};
    for (const t of use) { const u = (v.tk[t] && v.tk[t].ua) || t; if (!best[u] || (+v.tk[t].t || 0) > (+v.tk[best[u]].t || 0)) best[u] = t; }
    for (const t of Object.values(best)) { toks.push(t); own.push(d.id); }
  }
  for (let i = 0; i < toks.length; i += 500) {
    const part = toks.slice(i, i + 500);
    const r = await admin.messaging().sendEachForMulticast({
      tokens: part,
      data: {title: cut(m.title, 60) || 'きもオタレート', body: cut(m.body, 140), go: m.go || 'home', tag: m.tag || (cat || 'test')},
      webpush: {headers: {Urgency: 'high', TTL: '86400'}}
    });
    /* phones that uninstalled the app or turned notifications off: forget their tokens */
    const dead = [];
    r.responses.forEach((x, j) => {
      const c = x.error && x.error.code;
      if (!x.success && ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument'].includes(c)) dead.push([own[i + j], part[j]]);
    });
    for (const [pid, t] of dead) await db.doc('push/' + pid).update(new admin.firestore.FieldPath('tk', t), admin.firestore.FieldValue.delete()).catch(() => {});
  }
}

/* 対戦の申し込み (every genre) */
exports.pushChallenge = onDocumentCreated('challenges/{id}', async ev => {
  const c = ev.data && ev.data.data(); if (!c || c.st !== 'pending' || !c.b) return;
  const g = await genreName(c.g);
  await send([c.b], 'ch', {title: '対戦の申し込み', body: (c.an || '友達') + ' から ' + g + ' の対戦申し込み' + (c.tid ? '(大会)' : '') + (c.bet ? '  ·  賭け ' + c.bet + 'pt' : ''), go: 'battle', tag: 'ch' + ev.params.id});
});
/* きもオタTCG の対戦申し込み */
exports.pushTcg = onDocumentCreated('tcgm/{id}', async ev => {
  const d = ev.data && ev.data.data(); if (!d || d.st !== 'wait' || !d.b) return;
  await send([d.b], 'ch', {title: 'きもオタTCG', body: (d.an || '友達') + ' から対戦の申し込み' + (d.tid ? '(大会)' : ''), go: 'tcg', tag: 'tcg' + ev.params.id});
});
/* お知らせ */
exports.pushMsg = onDocumentCreated('msgs/{id}', async ev => {
  const m = ev.data && ev.data.data(); if (!m) return;
  await send(null, 'msg', {title: m.title || 'お知らせ', body: m.x || '', go: 'home', tag: 'msg' + ev.params.id});
});
/* 配布 (points, tickets, cards) */
exports.pushGrant = onDocumentCreated('grants/{id}', async ev => {
  const g = ev.data && ev.data.data(); if (!g || !g.pid || g.kind === 'ban' || g.kind === 'unban') return;
  const k = g.kind || 'pt';
  const body = k === 'buy' ? '購入ポイント +' + g.pt + 'pt が届きました'
             : k === 'pt' ? (g.pt > 0 ? '+' + g.pt + 'pt が届きました' : 'ポイントが調整されました') + (g.note ? '  ·  ' + g.note : '')
             : (g.note || 'プレゼントが届きました');
  await send([g.pid], 'give', {title: '配布', body, go: k === 'pt' || k === 'buy' ? 'home' : 'gacha', tag: 'g' + ev.params.id});
});
/* 新しいガチャ・イベント */
const started = (b, a) => a && a.start && a.end > Date.now() && (!b || b.start !== a.start);
exports.pushBanner = onDocumentWritten('config/banner', async ev => {
  const b = ev.data.before.exists ? ev.data.before.data() : null, a = ev.data.after.exists ? ev.data.after.data() : null;
  if (!started(b, a)) return;
  await send(null, 'give', {title: '限定ガチャ', body: a.start > Date.now() + 60000 ? '新しい限定ガチャがもうすぐ始まります' : '新しい限定ガチャが始まりました', go: 'gacha', tag: 'banner'});
});
exports.pushCoin = onDocumentWritten('config/coinev', async ev => {
  const b = ev.data.before.exists ? ev.data.before.data() : null, a = ev.data.after.exists ? ev.data.after.data() : null;
  if (!started(b, a)) return;
  await send(null, 'give', {title: 'コインガチャ', body: 'コインガチャのイベントが始まりました', go: 'gacha', tag: 'coinev'});
});
exports.pushTour = onDocumentCreated('tours/{id}', async ev => {
  const t = ev.data && ev.data.data(); if (!t || t.st !== 'entry') return;
  const g = await genreName(t.g);
  await send(null, 'give', {title: '大会', body: '「' + (t.n || '大会') + '」(' + g + ')のエントリー受付が始まりました', go: 'battle', tag: 'tour' + ev.params.id});
});
exports.pushGweek = onDocumentWritten('config/gweek', async ev => {
  const b = ev.data.before.exists ? (ev.data.before.data().list || []) : [], a = ev.data.after.exists ? (ev.data.after.data().list || []) : [];
  const seen = new Set(b.map(x => x.g + '|' + x.s)), nw = a.filter(x => !seen.has(x.g + '|' + x.s) && x.e > Date.now());
  for (const x of nw) {
    const g = await genreName(x.g);
    await send(null, 'give', {title: 'ジャンル週間', body: g + '週間が始まりました(対戦のポイントが1.5倍)', go: 'battle', tag: 'gw' + x.s});
  }
});
/* テスト通知: the app sets push/{pid}.test */
/* test = {ap: time}: 抜き打ちガチャ trial (v134), only to this player's お試し版 */
const apTrial = (pid, a) => send([pid], null, {title: '抜き打ちガチャ', body: 'いまから10分だけ、1回無料で引けます', go: 'home', tag: 'ap' + a.test.ap}, true);
exports.pushTest = onDocumentUpdated('push/{pid}', async ev => {
  const b = ev.data.before.data() || {}, a = ev.data.after.data() || {};
  if (!a.test || JSON.stringify(a.test) === JSON.stringify(b.test)) return;
  if (typeof a.test === 'object') { if (a.test.ap) await apTrial(ev.params.pid, a); return; }
  await send([ev.params.pid], null, {title: 'テスト通知', body: '通知はちゃんと届いています', go: 'home', tag: 'test'});
});
exports.pushTestNew = onDocumentCreated('push/{pid}', async ev => {
  const a = ev.data && ev.data.data(); if (!a || !a.test) return;
  if (typeof a.test === 'object') { if (a.test.ap) await apTrial(ev.params.pid, a); return; }
  await send([ev.params.pid], null, {title: 'テスト通知', body: '通知はちゃんと届いています', go: 'home', tag: 'test'});
});
/* アップデートのお知らせ: the admin's app writes config/update {v, title, body} when it opens a version not sent yet; after sending, sent:true is set here */
exports.pushUpdate = onDocumentWritten('config/update', async ev => {
  const b = ev.data.before.exists ? ev.data.before.data() : null, a = ev.data.after.exists ? ev.data.after.data() : null;
  if (!a || !a.v || a.sent) return;
  if (b && b.v === a.v && b.sent) return;
  /* (10/16) send each version once, newer only: a phone still on an old version must not send its old notice again.
     config/updsent {v} keeps the newest version sent (v133 had already gone out) */
  const no = v => +((String(v || '').match(/v(\d+)/) || [])[1] || 0), sref = db.doc('config/updsent');
  const top = Math.max(133, no(((await sref.get()).data() || {}).v));
  if (no(a.v) <= top) { await ev.data.after.ref.update({sent: true}).catch(() => {}); return; }
  await sref.set({v: a.v, t: Date.now()});
  await send(null, 'give', {title: a.title || 'アップデート', body: a.body || '新しいバージョンになりました。アプリを開いて確認してね', go: 'home', tag: 'upd' + a.v});
  await ev.data.after.ref.update({sent: true}).catch(() => {});
});
/* 取引所 (v134): a new listing goes to everyone but the seller. The app posts the listing to the timeline as feed/l_<auction id>
   (with the card's name), so the text is taken from there */
exports.pushAucList = onDocumentCreated('feed/{id}', async ev => {
  const f = ev.data && ev.data.data(); if (!f || !/^l_/.test(ev.params.id) || f.k !== 'mkt') return;
  const ps = (await db.collection('players').get()).docs.map(d => d.id).filter(id => id !== f.by);
  await send(ps, 'give', {title: '取引所に出品', body: f.x || '新しい出品があります', go: 'gacha', tag: 'auc' + ev.params.id});
});
/* someone bid higher: tell the one who was on top. A buy-now: tell the seller */
exports.pushAucBid = onDocumentUpdated('auc/{id}', async ev => {
  const b = ev.data.before.data() || {}, a = ev.data.after.data() || {};
  if (!a.hp || b.hp === a.hp && b.hb === a.hb) return;
  let nm = 'カード';
  try { const f = (await db.doc('feed/l_' + ev.params.id).get()).data(); const m = f && /「(.+?)」/.exec(f.x || ''); if (m) nm = '「' + m[1] + '」'; } catch (e) {}
  if (b.hp && b.hp !== a.hp) await send([b.hp], 'give', {title: '入札が抜かれました', body: nm + ' がいま ' + a.hb + 'pt。取り返すなら取引所へ', go: 'gacha', tag: 'ob' + ev.params.id});
  if (a.bn > 0 && a.hb >= a.bn && !(b.hb >= a.bn)) await send([a.s], 'give', {title: '即決で売れました', body: nm + ' が ' + a.hb + 'pt で売れました', go: 'gacha', tag: 'bn' + ev.params.id});
});

/* 賞金首 (v134): someone reached 3+ wins in a row (the app posts feed/bw_<match>) → everyone else. BOUNTY_PV: お試し版 phones only until release */
const BOUNTY_PV = false;
exports.pushBounty = onDocumentCreated('feed/{id}', async ev => {
  const f = ev.data && ev.data.data(); if (!f || !/^bw_/.test(ev.params.id) || f.k !== 'bounty') return;
  const ps = (await db.collection('players').get()).docs.map(d => d.id).filter(id => id !== f.by);
  await send(ps, 'give', {title: '賞金首が出た', body: (f.x || '賞金首が出ました') + '。レートの対戦で倒すと賞金がもらえる', go: 'battle', tag: 'bw' + ev.params.id}, BOUNTY_PV);
});
/* 抜き打ちガチャ (v134): the same start time as the app (apDay: from the day number, 10:00-24:00 JST, 10 minutes). Checked every minute.
   Needs Cloud Scheduler like the farm (SCHED). AP_PV: お試し版 phones only until release */
const AP_PV = false, AP_MIN = 10;
const hsh = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
const AP_FIX = {20742: Date.UTC(2026, 9, 16, 8, 0)};  // same as the app
const apStart = d => AP_FIX[d] || (d * 864e5 - 4 * 3600000) + 5 * 3600000 + (hsh('ap' + d) % (14 * 3600 - AP_MIN * 60)) * 1000;
const dayNo = t => Math.floor((t + 4 * 3600000) / 864e5);
/* 畑と泥棒 (v134): until it is in the main app, these go to the お試し版 phones only (pv tokens). Set FARM_PV = false at release. */
const FARM_PV = false, CROP = {ichigo: ['いちご', 3], tomato: ['トマト', 3], melon: ['メロン', 3], pumpkin: ['かぼちゃ', 3]};  // every crop can be picked from 3 hours on
exports.pushFarmSteal = onDocumentCreated('steal/{id}', async ev => {
  const d = ev.data && ev.data.data(); if (!d || !d.o || !d.p) return;
  let nm = 'だれか'; try { const p = (await db.doc('players/' + d.p).get()).data(); if (p && p.name) nm = p.name; } catch (e) {}
  const c = (CROP[d.c] || ['作物'])[0];
  await send([d.o], 'give', d.bit ? {title: '番犬が撃退!', body: nm + 'が' + c + 'を盗もうとして噛まれました。罰金 +' + d.f + 'pt', go: 'home', tag: 'fs' + ev.params.id}
                                   : {title: c + 'を盗まれた', body: nm + 'に' + c + 'を盗まれました(-' + d.n + 'pt)。早めに収穫しよう', go: 'home', tag: 'fs' + ev.params.id}, FARM_PV);
});
/* every 10 minutes: crops that became ripe since the last run */
/* needs the Cloud Scheduler API (enable it and give the key roles/cloudscheduler.admin first), then set FARM_RIPE = true */
const FARM_RIPE = true;  // (10/17) on: 抜き打ちガチャ・畑の実り・鑑定結果 (Cloud Scheduler)
if (FARM_RIPE) exports.pushAp = onSchedule({schedule: 'every 1 minutes', timeZone: 'Asia/Tokyo'}, async () => {
  const nowt = Date.now(), st = apStart(dayNo(nowt));
  if (st > nowt || nowt - st >= 90000) return;  // within 1.5 minutes after the start (runs every minute)
  const ref = db.doc('config/appush'), d = dayNo(nowt);
  if (((await ref.get()).data() || {}).d === d) return;
  await ref.set({d, t: nowt});
  await send(null, 'give', {title: '抜き打ちガチャ', body: 'いまから10分だけ、1回無料で引けます。急いで', go: 'home', tag: 'ap' + d}, AP_PV);
});  // also sends 鑑定結果が届きました (same 10-minute run)
const GR_H = 24, GR_PV = false;  // GR_H = the app's GR_H. GR_PV: お試し版 phones only until release
if (FARM_RIPE) exports.pushFarmRipe = onSchedule({schedule: 'every 10 minutes', timeZone: 'Asia/Tokyo'}, async () => {
  const ref = db.doc('config/farmpush'), last = ((await ref.get()).data() || {}).t || Date.now() - 6e5, nowt = Date.now();
  const docs = (await db.collection('farm').get()).docs;
  for (const d of docs) {
    const P = (d.data() || {}).p || {}, ripe = [];
    for (const k of Object.keys(P)) { const x = P[k]; if (!x || !CROP[x.c]) continue; const at = (+x.t || 0) + CROP[x.c][1] * 36e5; if (at > last && at <= nowt) ripe.push(CROP[x.c][0]); }
    if (ripe.length) await send([d.id], 'give', {title: ripe.join('・') + 'が実りました', body: '仲間に盗まれる前に収穫しよう', go: 'home', tag: 'fr' + d.id + nowt}, FARM_PV);
  }
  /* 鑑定 (v134): a card sent for grading (inv/{pid}.tcg.sl {t: sent, s: score once opened}) has its result GR_H hours later */
  for (const d of (await db.collection('inv').get()).docs) {
    const sl = (((d.data() || {}).tcg) || {}).sl || [], n = sl.filter(x => x && !x.s && (+x.t || 0) + GR_H * 36e5 > last && (+x.t || 0) + GR_H * 36e5 <= nowt).length;
    if (n) await send([d.id], 'give', {title: '鑑定結果が届きました', body: (n > 1 ? n + '枚の' : '') + '鑑定結果が届いています。開けて点数を見てみよう', go: 'home', tag: 'gr' + d.id + nowt}, GR_PV);
  }
  await ref.set({t: nowt});
});

/* 師匠と弟子 (v134): the request, the answer and the graduation. お試し版 phones only until release (MT_PV) */
const MT_PV = false;
/* ハロウィン (v135): トリック・オア・トリート. Asked → the friend; answered → the one who asked. お試し版 phones only until release (TOT_PV) */
const TOT_PV = false;
const totNm = async pid => { try { const p = (await db.doc('players/' + pid).get()).data(); return (p && p.name) || 'だれか'; } catch (e) { return 'だれか'; } };
exports.pushTot = onDocumentWritten('tot/{id}', async ev => {
  const b = ev.data.before.exists ? ev.data.before.data() : null, a = ev.data.after.exists ? ev.data.after.data() : null;
  if (!a || !a.f || !a.o) return;
  if (!b && a.st === 'ask') await send([a.o], 'give', {title: 'トリック・オア・トリート!', body: (await totNm(a.f)) + 'がお菓子をねだっています。1日以内にあげないと、いたずらで20個とられる', go: 'home', tag: 'tot' + ev.params.id}, TOT_PV);
  else if (b && b.st === 'ask' && a.st !== 'ask') {
    /* (10/17) いたずらは1日1人1回 (same as the app): a guard, or a trick that already happened to this friend for the same ask day → nothing moves */
    let why = '';
    if (a.st !== 'give') { try {
      const at = +a.at || Date.now(), g = ((await db.doc('hwp/' + a.o).get()).data() || {}).L || [], guard = t => g.map(Number).some(s => t >= s && t < s + 864e5);
      if (guard(+a.t || 0)) why = 'safe';
      else { const q = await db.collection('tot').where('o', '==', a.o).get();
        if (q.docs.some(d => { const x = d.data(); if (d.id === ev.params.id || +x.d !== +a.d || guard(+x.t || 0)) return false; const e = x.st === 'no' ? (+x.at || +x.t || 0) : x.st === 'ask' ? (+x.t || 0) + 864e5 : Infinity; return e < at || (e === at && d.id < ev.params.id); })) why = 'late'; }
    } catch (e) {} }
    const nm = await totNm(a.o);
    await send([a.f], 'give', a.st === 'give' ? {title: 'お菓子をもらった', body: nm + 'がお菓子を10個くれました', go: 'home', tag: 'tota' + ev.params.id}
      : why === 'safe' ? {title: 'いたずら失敗', body: nm + 'はいたずらよけのお守りを持っていました', go: 'home', tag: 'tota' + ev.params.id}
      : why === 'late' ? {title: 'いたずら失敗', body: nm + 'は今日もう先にいたずらされていました(お菓子はなし)', go: 'home', tag: 'tota' + ev.params.id}
      : {title: 'いたずら成功', body: nm + 'はお菓子をくれなかったので、いたずらで20個もらいました', go: 'home', tag: 'tota' + ev.params.id}, TOT_PV);
  }
});
/* 友達招待 (v135): a new player who came from an invite (inv = the inviter) → tell the inviter */
exports.pushInvite = onDocumentCreated('players/{id}', async ev => {
  const p = ev.data && ev.data.data(); if (!p || !p.inv || p.inv === ev.params.id) return;
  await send([p.inv], 'give', {title: '招待した友達が来た', body: (p.name || '友達') + 'があなたの招待で参加しました。5戦するとふたりにごほうび', go: 'profile', tag: 'inv' + ev.params.id});
});
exports.pushMentor = onDocumentWritten('mentor/{id}', async ev => {
  const b = ev.data.before.exists ? ev.data.before.data() : null, a = ev.data.after.exists ? ev.data.after.data() : null;
  if (!a) return;
  const nm = async pid => { try { const p = (await db.doc('players/' + pid).get()).data(); return (p && p.name) || 'だれか'; } catch (e) { return 'だれか'; } };
  if (!b && a.st === 'req') await send([a.m], 'give', {title: '弟子入りの申し込み', body: (await nm(a.a)) + 'があなたに弟子入りしたいそうです', go: 'home', tag: 'mt' + ev.params.id}, MT_PV);
  else if (b && b.st === 'req' && a.st === 'ok') await send([a.a], 'give', {title: '弟子入りが決まりました', body: (await nm(a.m)) + 'があなたを弟子にしました。分身の経験値が1.5倍', go: 'home', tag: 'mt' + ev.params.id}, MT_PV);
  else if (b && !b.g && a.g) { const A = await nm(a.a), M = await nm(a.m);
    await send([a.a], 'give', {title: '卒業おめでとう', body: M + '師匠に追いつきました。+300pt', go: 'home', tag: 'mg' + ev.params.id}, MT_PV);
    await send([a.m], 'give', {title: '弟子が卒業しました', body: A + 'があなたに追いつきました。+500pt', go: 'home', tag: 'mg' + ev.params.id}, MT_PV); }
});

/* ===== (10/18) 申し込み → Discord. A player creates orders/{id} ({pid, pn, kind, code, t, st:'wait'}) in the app and pays by PayPay
   (outside the app) with the code in the memo. This posts the order to the admin's Discord channel with 承認 / 却下 buttons;
   pressing 承認 gives the item exactly like the admin card in the app (pass/{pid}, grants, suplog).
   Setup (GitHub secrets, written to functions/.env when deploying): DISCORD_BOT_TOKEN, DISCORD_PUBLIC_KEY, DISCORD_CHANNEL_ID,
   DISCORD_ADMIN_ID (user ids allowed to press the buttons, comma separated). Without them nothing is posted and the endpoint refuses. */
const {onRequest} = require('firebase-functions/v2/https');
const crypto = require('crypto');
const DC = {token: process.env.DISCORD_BOT_TOKEN || '', pub: (process.env.DISCORD_PUBLIC_KEY || '').trim(), ch: (process.env.DISCORD_CHANNEL_ID || '').trim(),
  admins: (process.env.DISCORD_ADMIN_ID || '').split(',').map(s => s.trim()).filter(Boolean)};
const HW0 = Date.UTC(2026, 9, 18, 20, 0);
const ORDER = {
  hwpass: {n: 'ハロウィンパス', price: 2000, key: 'hw', need: [['ltk', 1, 'ハロウィンパス: 限定ガチャチケット ×1', true]]},
  hwset: {n: 'ハロウィン限定セット', price: 2000, key: 'hs', need: [['ltk', 8, 'ハロウィン限定セット: 限定ガチャチケット ×8', true], ['tp1_h', 5, 'ハロウィン限定セット: TCG ハロウィンパック券 ×5', false]]}
};
async function dcApi(method, path, body) {
  if (!DC.token) return null;
  try {
    const r = await fetch('https://discord.com/api/v10' + path, {method, headers: {Authorization: 'Bot ' + DC.token, 'Content-Type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});
    if (!r.ok) { console.error('discord', r.status, (await r.text()).slice(0, 300)); return null; }
    return r.status === 204 ? {} : await r.json();
  } catch (e) { console.error('discord', e.message); return null; }
}
const orderText = (o, P, head) => (head ? head + '\n' : '') + '**' + cut(o.pn, 30) + '** さんの申し込み\n' + P.n + '  ' + P.price.toLocaleString('ja-JP') + ' 応援値\n送金メモの番号: **' + cut(o.code, 12) + '**';
const orderBtns = id => [{type: 1, components: [{type: 2, style: 3, label: '承認(付ける)', custom_id: 'ok:' + id}, {type: 2, style: 4, label: '却下', custom_id: 'ng:' + id}]}];
exports.orderNotify = onDocumentCreated('orders/{id}', async ev => {
  const o = ev.data && ev.data.data(); const P = o && ORDER[o.kind]; if (!P || o.st !== 'wait' || !DC.ch) return;
  const had = +(((await db.doc('pass/' + o.pid).get()).data() || {})[P.key]) || 0;
  const m = await dcApi('POST', '/channels/' + DC.ch + '/messages', {content: orderText(o, P, had ? '(注意: この人はもう持っています。承認しても何も付きません)' : '') + '\nPayPayで同じ番号の送金が届いているか確かめてから「承認」を押してください。', components: orderBtns(ev.params.id), allowed_mentions: {parse: []}});
  if (m && m.id) await ev.data.ref.set({dm: m.id}, {merge: true});
});
/* gives the item for one order (once): the same writes as the admin card in the app */
async function orderApprove(id, by) {
  const ref = db.doc('orders/' + id);
  const r = await db.runTransaction(async tx => {
    const s = await tx.get(ref); if (!s.exists) return {msg: '申し込みが見つかりません(取り消されたかもしれません)'};
    const o = s.data(); if (o.st !== 'wait') return {msg: o.st === 'ok' ? 'もう承認されています' : o.st === 'dup' ? 'もう持っていたので、付けずに閉じています' : 'もう却下されています', o};
    tx.update(ref, {st: 'go', by, ut: Date.now()}); return {go: true, o};
  });
  if (!r.go) return r;
  const o = r.o, P = ORDER[o.kind], t = Date.now();
  if (!P) { await ref.update({st: 'ng', ut: t}); return {msg: '知らない商品です', o}; }
  const had = +(((await db.doc('pass/' + o.pid).get()).data() || {})[P.key]) || 0;
  const gs = (await db.collection('grants').where('pid', '==', o.pid).get()).docs.map(d => d.data());
  const missing = P.need.filter(([kind, , note]) => !gs.some(g => g.kind === kind && g.note === note));
  if (had && !missing.length) { await ref.update({st: 'dup', ut: t}); return {msg: 'もう持っていたので、何も付けていません(返金してください)', o, dup: true}; }
  if (!had) await db.doc('pass/' + o.pid).set({[P.key]: t}, {merge: true});
  for (const [kind, n, note, ev] of missing) await db.collection('grants').add(Object.assign({pid: o.pid, pn: o.pn || '', kind, n, pt: 0, note, t}, ev ? {ev: HW0} : {}));
  if (!had) await db.collection('suplog').add({pid: o.pid, v: P.price, note: P.n, t});
  await ref.update({st: 'ok', ut: Date.now()});
  return {ok: true, o};
}
const DER = hex => Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(hex, 'hex')]);
function dcVerify(ts, raw, sig) {
  try { const key = crypto.createPublicKey({key: DER(DC.pub), format: 'der', type: 'spki'});
    return crypto.verify(null, Buffer.concat([Buffer.from(ts, 'utf8'), raw]), key, Buffer.from(sig, 'hex')); } catch (e) { return false; }
}
/* Discord calls this when a button is pressed (set it as the app's INTERACTIONS ENDPOINT URL) */
exports.discordInteract = onRequest({invoker: 'public', timeoutSeconds: 20}, async (req, res) => {
  const sig = req.get('X-Signature-Ed25519'), ts = req.get('X-Signature-Timestamp');
  if (req.method !== 'POST' || !DC.pub || !sig || !ts || !req.rawBody || !dcVerify(ts, req.rawBody, sig)) { res.status(401).send('invalid request signature'); return; }
  const b = req.body || {};
  if (b.type === 1) { res.json({type: 1}); return; }
  if (b.type !== 3) { res.status(400).send('unsupported'); return; }
  const uid = (b.member && b.member.user && b.member.user.id) || (b.user && b.user.id) || '';
  const [act, id] = String((b.data && b.data.custom_id) || '').split(':');
  if (!DC.admins.includes(uid)) { res.json({type: 4, data: {content: '承認できるのは管理者だけです', flags: 64}}); return; }
  const base = String((b.message && b.message.content) || '').split('\nPayPay')[0];
  try {
    if (act === 'ok') {
      const r = await orderApprove(id, 'discord:' + uid);
      res.json({type: 7, data: {content: base + '\n\n' + (r.ok ? '【承認済み】アプリに付けました(' + new Date().toLocaleString('ja-JP', {timeZone: 'Asia/Tokyo'}) + ')' : '【' + r.msg + '】'), components: [], allowed_mentions: {parse: []}}});
    } else if (act === 'ng') {
      const ref = db.doc('orders/' + id), s = await ref.get();
      if (s.exists && s.data().st === 'wait') await ref.update({st: 'ng', by: 'discord:' + uid, ut: Date.now()});
      res.json({type: 7, data: {content: base + '\n\n【却下しました】', components: [], allowed_mentions: {parse: []}}});
    } else res.json({type: 4, data: {content: '知らないボタンです', flags: 64}});
  } catch (e) { console.error('interact', e); res.json({type: 4, data: {content: 'うまくいきませんでした: ' + cut(e.message, 120) + '(もう一度押すか、アプリの管理画面から承認してください)', flags: 64}}); }
});
/* the app's 承認 / 却下 (admin) only changes st; this keeps the Discord message in step */
exports.orderSync = onDocumentUpdated('orders/{id}', async ev => {
  const b = ev.data.before.data(), a = ev.data.after.data(); if (!a || !a.dm || !DC.ch || b.st === a.st || !['ok', 'ng', 'dup'].includes(a.st) || String(a.by || '').startsWith('discord:')) return;
  const P = ORDER[a.kind]; if (!P) return;
  await dcApi('PATCH', '/channels/' + DC.ch + '/messages/' + a.dm, {content: orderText(a, P) + '\n\n' + (a.st === 'ok' ? '【アプリで承認済み】' : a.st === 'dup' ? '【もう持っていたので付けていません】' : '【アプリで却下】'), components: []});
});
