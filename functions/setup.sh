#!/bin/bash
# きもオタレート: 通知の仕組みをFirebaseに入れる(Cloud Shellで実行)
#   git clone https://github.com/bq28whrxyd-lgtm/rate.git && bash rate/functions/setup.sh
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
echo "== 先に、次から自動で入るように鍵に権限を渡しています(1分ほど)"
SA=firebase-adminsdk-fbsvc@$P.iam.gserviceaccount.com
gcloud services enable cloudscheduler.googleapis.com --project $P --quiet >/dev/null 2>&1 && echo "   OK 時間で動く仕組み(Cloud Scheduler)" || echo "   (Cloud Scheduler を有効にできませんでした)"
for ROLE in roles/cloudfunctions.admin roles/run.admin roles/iam.serviceAccountUser roles/artifactregistry.admin roles/cloudbuild.builds.editor roles/eventarc.admin roles/serviceusage.serviceUsageConsumer roles/firebaseextensions.viewer roles/cloudscheduler.admin; do
  gcloud projects add-iam-policy-binding $P --member="serviceAccount:$SA" --role="$ROLE" --condition=None --quiet >/dev/null && echo "   OK $ROLE" || echo "   (渡せませんでした: $ROLE)"
done
echo "== 準備中(1〜2分)"
(cd functions && npm install --no-audit --no-fund --loglevel=error)
echo "== Firebaseに入れています(3〜5分)"
npx -y firebase-tools@latest deploy --only functions --project $P --force && OK=1 || OK=0
echo ""
if [ "$OK" = 1 ]; then echo "== 完了しました。この画面の最後をスクリーンショットで送ってください"; else echo "== 通知の仕組みを入れるところで止まりました。この画面の最後をスクリーンショットで送ってください"; fi
