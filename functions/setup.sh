#!/bin/bash
# きもオタレート: 通知の仕組みをFirebaseに入れる(Cloud Shellで実行)
#   git clone https://github.com/bq28whrxyd-lgtm/rate.git && bash rate/functions/setup.sh
set -e
P=kimoota-15777
cd "$(dirname "$0")/.."
gcloud config set project $P >/dev/null 2>&1 || true
LOC=$(gcloud firestore databases describe --database='(default)' --format='value(locationId)' 2>/dev/null || true)
case "$LOC" in
  nam5) R=us-central1 ;;
  eur3) R=europe-west1 ;;
  "")   R=asia-northeast1 ;;
  *)    R=$LOC ;;
esac
echo "$R" > functions/region.txt
echo "== Firestoreの場所: ${LOC:-不明}  → 通知の仕組みの場所: $R"
echo "== 準備中(1〜2分)"
(cd functions && npm install --no-audit --no-fund --loglevel=error)
echo "== Firebaseに入れています(3〜5分)"
npx -y firebase-tools@latest deploy --only functions --project $P --force
echo ""
echo "== 完了しました。このあとアプリを開くと、みんなにアップデートの通知が届きます"
