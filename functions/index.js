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
    for (const t of Object.keys(v.tk)) { if (onlyPv && !(v.tk[t] && v.tk[t].pv)) continue; toks.push(t); own.push(d.id); }
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

/* 畑と泥棒 (v134): until it is in the main app, these go to the お試し版 phones only (pv tokens). Set FARM_PV = false at release. */
const FARM_PV = true, CROP = {ichigo: ['いちご', 3], tomato: ['トマト', 3], melon: ['メロン', 3]};  // every crop can be picked from 3 hours on
exports.pushFarmSteal = onDocumentCreated('steal/{id}', async ev => {
  const d = ev.data && ev.data.data(); if (!d || !d.o || !d.p) return;
  let nm = 'だれか'; try { const p = (await db.doc('players/' + d.p).get()).data(); if (p && p.name) nm = p.name; } catch (e) {}
  const c = (CROP[d.c] || ['作物'])[0];
  await send([d.o], 'give', d.bit ? {title: '番犬が撃退!', body: nm + 'が' + c + 'を盗もうとして噛まれました。罰金 +' + d.f + 'pt', go: 'home', tag: 'fs' + ev.params.id}
                                   : {title: c + 'を盗まれた', body: nm + 'に' + c + 'を盗まれました(-' + d.n + 'pt)。早めに収穫しよう', go: 'home', tag: 'fs' + ev.params.id}, FARM_PV);
});
/* every 10 minutes: crops that became ripe since the last run */
/* needs the Cloud Scheduler API (enable it and give the key roles/cloudscheduler.admin first), then set FARM_RIPE = true */
const FARM_RIPE = false;  // also sends 鑑定結果が届きました (same 10-minute run)
const GR_H = 24, GR_PV = true;  // GR_H = the app's GR_H. GR_PV: お試し版 phones only until release
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
const MT_PV = true;
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
