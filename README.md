小説ビルダー Cloudflare版

構成
public/index.html : アプリ本体
worker.js         : 同期API
schema.sql        : D1初期化
wrangler.toml     : Cloudflare設定

初回配備
1. SurfaceへNode.jsをインストールする
2. このフォルダで npx wrangler login を実行する
3. npx wrangler d1 create novel-builder-db を実行する
4. 表示された database_id を wrangler.toml の該当箇所へ貼る
5. npx wrangler d1 execute novel-builder-db --remote --file=schema.sql を実行する
6. 推測されにくい同期キーを決め、npx wrangler secret put SYNC_KEY で登録する
7. npx wrangler deploy を実行する
8. 表示されたURLをスマホとSurfaceで開く
9. 左メニューまたはスマホの「その他」から「クラウド同期」を開き、同じ同期キーを入力する

最初の端末
「同期を開始」→「今すぐクラウドへ保存」

二台目の端末
「同期を開始」→「クラウドから読み込む」

注意
・本文、設定、辞典、シーン設計は同期対象です。
・画像は端末内（IndexedDB）に残り、現在は同期しません。
・端末内のlocalStorage保存とJSONバックアップは引き続き使えます。
・競合時は自動上書きを停止します。
小説ビルダー Cloudflare版

構成
public/index.html : アプリ本体
worker.js         : 同期API
schema.sql        : D1初期化
wrangler.toml     : Cloudflare設定

初回配備
1. SurfaceへNode.jsをインストールする
2. このフォルダで npx wrangler login を実行する
3. npx wrangler d1 create novel-builder-db を実行する
4. 表示された database_id を wrangler.toml の該当箇所へ貼る
5. npx wrangler d1 execute novel-builder-db --remote --file=schema.sql を実行する
6. 推測されにくい同期キーを決め、npx wrangler secret put SYNC_KEY で登録する
7. npx wrangler deploy を実行する
8. 表示されたURLをスマホとSurfaceで開く
9. 左メニューまたはスマホの「その他」から「クラウド同期」を開き、同じ同期キーを入力する

最初の端末
「同期を開始」→「今すぐクラウドへ保存」

二台目の端末
「同期を開始」→「クラウドから読み込む」

注意
・本文、設定、辞典、シーン設計は同期対象です。
・画像は端末内（IndexedDB）に残り、現在は同期しません。
・端末内のlocalStorage保存とJSONバックアップは引き続き使えます。
・競合時は自動上書きを停止します。
