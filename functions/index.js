/* きもオタレート push notifications.
   Each player's phones are in push/{pid}: tk = {token: {t, ua}}, p = {ch, msg, give} (false = off), test = time of a test request.
   Every trigger below only reads a few documents and sends one message per phone. */
const {onDocumentCreated, onDocumentWritten, onDocumentUpdated} = require('firebase-functions/v2/firestore');
const {setGlobalOptions} = require('firebase-functions/v2');
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
async function send(pids, cat, m) {
  const docs = pids ? (await Promise.all([...new Set(pids)].filter(Boolean).map(id => db.doc('push/' + id).get()))).filter(d => d.exists)
                    : (await db.collection('push').get()).docs;
  const toks = [], own = [];
  for (const d of docs) {
    const v = d.data() || {};
    if (!v.tk || (cat && v.p && v.p[cat] === false)) continue;
    for (const t of Object.keys(v.tk)) { toks.push(t); own.push(d.id); }
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
exports.pushTest = onDocumentUpdated('push/{pid}', async ev => {
  const b = ev.data.before.data() || {}, a = ev.data.after.data() || {};
  if (!a.test || a.test === b.test) return;
  await send([ev.params.pid], null, {title: 'テスト通知', body: '通知はちゃんと届いています', go: 'home', tag: 'test'});
});
exports.pushTestNew = onDocumentCreated('push/{pid}', async ev => {
  const a = ev.data && ev.data.data(); if (!a || !a.test) return;
  await send([ev.params.pid], null, {title: 'テスト通知', body: '通知はちゃんと届いています', go: 'home', tag: 'test'});
});
/* アップデートのお知らせ: the admin's app writes config/update {v, title, body} when it opens a version not sent yet; after sending, sent:true is set here */
exports.pushUpdate = onDocumentWritten('config/update', async ev => {
  const b = ev.data.before.exists ? ev.data.before.data() : null, a = ev.data.after.exists ? ev.data.after.data() : null;
  if (!a || !a.v || a.sent) return;
  if (b && b.v === a.v && b.sent) return;
  await send(null, 'give', {title: a.title || 'アップデート', body: a.body || '新しいバージョンになりました。アプリを開いて確認してね', go: 'home', tag: 'upd' + a.v});
  await ev.data.after.ref.update({sent: true}).catch(() => {});
});
/* deploy trigger 2 */
