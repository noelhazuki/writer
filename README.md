# 物語の机 開発用ファイル（第二段階の分割）

## 編集とビルド
- 編集するのは `src` 内のファイルです。`public/index.html` は生成物なので直接編集しません。
- ビルド: `node build.mjs`（Node.js標準機能のみ）。入力ファイルの不足や挿入位置の不備はエラーで終了し、`public/index.html` は更新されません。
- GitHubには `src` 一式と `build.mjs` を同じコミットで反映してください（Cloudflareの自動公開が走るため）。

## GitHub上の配置
```
build.mjs
README.md
src/
  index.template.html
  styles.css
  app/            （34ファイル）
  plot.jsx
  plot.css
  app.jsx
public/
  index.html
```

## 結合順序
1. `src/index.template.html` の `{{GLOBAL_CSS}}` に `src/styles.css`
2. `{{APP_CODE}}` に次の順で結合し、一つの `text/babel` スクリプトにする
   1. `src/app/01…` から `src/app/34…` まで（番号順。`build.mjs` の `APP_BEFORE_PLOT_FILES` に明示。フォルダの自動列挙はしない）
   2. `src/plot.jsx`（`@@PLOTV2_CSS@@` の位置に `src/plot.css` をJS文字列化して代入）
   3. `src/app.jsx`

番号は実行順そのものです。元のコードの定義順を保つため、同じ機能が複数ファイルに分かれている箇所があります（辞書・成人向け・シーン設計など）。新しいファイルを足すときは `build.mjs` の一覧にも追記してください。

## ファイルの役割と大きさ
| ファイル | 役割 | 行数 | 容量 |
|---|---|---|---|
| src/app/01-constants-utils.jsx | 共通定数・補助関数・共通フック（画面定義、保存キー、uid、同期設定、キーボード/高さ計測フック） | 161 | 9KB |
| src/app/02-writing-prefs-storage.jsx | 執筆の端末内設定（位置・文字サイズ・定型句）の保存/読み込み | 74 | 3KB |
| src/app/03-dictionary-data.jsx | 表現辞典・小説語彙辞典・令和メディア語辞典の初期データ・正規化・保存/読み込み・取り込み用正規化 | 348 | 14KB |
| src/app/04-adult-tools-data.jsx | 成人向け辞典・語句魔改造・オノマトペ・シーン進行の初期データ・正規化・保存/読み込み | 328 | 24KB |
| src/app/05-scene-story-data.jsx | 汎用シーン設計・物語パターン・全体構成（旧）の初期データ・正規化・保存/読み込み | 70 | 19KB |
| src/app/06-adult-import-data.jsx | 成人向け辞典の取り込み用正規化と取り込みテンプレート | 62 | 2KB |
| src/app/07-app-data-model.jsx | 作品データの初期値、シーン進行カード/プラン、文章（draft）の生成・正規化 | 137 | 8KB |
| src/app/08-text-folders.jsx | 文章フォルダ・移動・複製・ゴミ箱操作、文章の移行、履歴、プロット参照 | 171 | 10KB |
| src/app/09-migrate-load.jsx | migrateData（データ移行）とloadData（読み込み） | 123 | 7KB |
| src/app/10-ai-import-logic.jsx | AI設定一括取り込みのテンプレート・差分・計画作成・適用処理 | 602 | 32KB |
| src/app/11-image-storage.jsx | IndexedDB（画像保存）と画像圧縮 | 133 | 5KB |
| src/app/12-common-ui.jsx | 共通UI部品（モーダル、入力欄、リンク選択、画像欄、アイコン切り抜き等） | 644 | 28KB |
| src/app/13-character-list.jsx | エンティティ一覧、グループ管理、キャラクタータグ、キャラクター一覧 | 256 | 12KB |
| src/app/14-height-compare.jsx | 身長比較（シルエット・チャート） | 395 | 21KB |
| src/app/15-location-list.jsx | 場所ツリー・場所一覧 | 61 | 3KB |
| src/app/16-character-detail.jsx | キャラクター詳細（性格・信念・好み等の入力部品を含む） | 469 | 39KB |
| src/app/17-organization-location-detail.jsx | 組織詳細・場所詳細 | 173 | 11KB |
| src/app/18-world-timeline-ideas.jsx | 世界設定・年表・ネタ箱 | 357 | 20KB |
| src/app/19-old-plot.jsx | 旧プロット画面 | 85 | 5KB |
| src/app/20-writing-screen.jsx | 執筆画面（書く／まとめる・フォルダ・文章編集）のWritingコンポーネント | 1089 | 82KB |
| src/app/21-writing-support.jsx | 執筆の補助部品（表現バー、句読点バー、シート、定型句、評価入力） | 246 | 12KB |
| src/app/22-writing-snippet-modal.jsx | 定型句・辞典モーダル（WritingSnippetDictionaryModal） | 238 | 13KB |
| src/app/23-dictionary-panels.jsx | 辞典パネル（表現・語彙・メディア語・成人向け・オノマトペ・シーン進行参照） | 591 | 35KB |
| src/app/24-dictionary-editors.jsx | 辞典の編集・取り込みモーダル | 883 | 47KB |
| src/app/25-ai-import-screen.jsx | AI設定一括取り込み画面 | 214 | 12KB |
| src/app/26-search.jsx | 作品内検索 | 51 | 3KB |
| src/app/27-writing-overview-adult-badges.jsx | 成人向け評価バッジ、本文ブロック概要 | 72 | 7KB |
| src/app/28-story-tools.jsx | 物語設計（全体構成ボード・汎用シーン設計・物語パターン） | 157 | 37KB |
| src/app/29-adult-tools-expression.jsx | 成人向け創作画面の入口と表現辞典タブ | 311 | 16KB |
| src/app/30-adult-import-remix-flow.jsx | 成人向け辞典の取り込みモーダル、リミックス、シーン進行タブ | 242 | 13KB |
| src/app/31-scene-flow-plans.jsx | シーン進行プラン編集・ライブラリ | 249 | 25KB |
| src/app/32-adult-onomatopoeia.jsx | 成人向けオノマトペタブ | 125 | 13KB |
| src/app/33-adult-remix-wordmap.jsx | 語句魔改造タブ・語句マップ | 411 | 20KB |
| src/app/34-dashboard-settings-sync.jsx | ホーム（ダッシュボード）、設定の入口、同期設定画面 | 87 | 5KB |
| src/index.template.html | | 28 | 2KB |
| src/styles.css | | 945 | 80KB |
| src/plot.jsx | | 1545 | 115KB |
| src/plot.css | | 366 | 28KB |
| src/app.jsx | | 604 | 44KB |

## 修正するときに渡すファイルの対応表
| やりたいこと | 渡すファイル |
|---|---|
| 画面定義・保存キー・共通フック | src/app/01 |
| 辞書の初期データ・保存処理 | src/app/03, 04, 06 |
| シーン設計・物語パターン・全体構成のデータ | src/app/05 |
| 作品データの初期値・移行・読み込み | src/app/07, 09 |
| 文章のフォルダ・ゴミ箱・履歴・プロット参照 | src/app/08 |
| AI一括取り込みの処理／画面 | src/app/10 ／ 25 |
| 画像保存 | src/app/11 |
| 共通の入力欄・ボタン・モーダル | src/app/12 |
| キャラクター | src/app/13, 14, 16 |
| 組織・場所 | src/app/15, 17 |
| 世界設定・年表・ネタ箱 | src/app/18 |
| 旧プロット | src/app/19 |
| 執筆（書く／まとめる・フォルダ・編集） | src/app/20, 21, 22 |
| 辞書の検索・編集・取り込み画面 | src/app/23, 24 |
| 作品内検索 | src/app/26 |
| 物語設計（全体構成・汎用シーン・パターン） | src/app/28 |
| 成人向け創作・シーン進行 | src/app/27, 29〜33 |
| ホーム・設定・同期設定 | src/app/34 |
| 新プロット | src/plot.jsx, src/plot.css |
| App本体・起動処理 | src/app.jsx |
| 全体の見た目 | src/styles.css |
| ビルド方法 | build.mjs |

## 今回の更新と不要ファイル
- 追加: `src/app/` の34ファイル
- 更新: `build.mjs`、`README.md`、`public/index.html`（内容は更新前と同一）
- 変更なし: `src/plot.jsx`、`src/plot.css`、`src/app.jsx`、`src/index.template.html`、`src/styles.css`、`worker.js`、`schema.sql`、`wrangler.toml`
- 不要になったファイル: `src/app-before-plot.jsx`（ビルドから参照していません。新構成で動作確認できたら、GitHub上で手動削除してください。ZIPを上書きしても旧ファイルは自動では消えません）
