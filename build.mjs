// 物語の机 ビルドスクリプト（Node.js標準機能のみ）
// 使い方: node build.mjs
// src 内の分割ファイルを結合して public/index.html を生成する。
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = (name) => join(root, 'src', name);
const outPath = join(root, 'public', 'index.html');

function fail(msg) {
  console.error('[build] エラー: ' + msg);
  process.exit(1);
}

function read(name) {
  const p = src(name);
  if (!existsSync(p)) fail('入力ファイルが見つかりません: src/' + name);
  return readFileSync(p, 'utf8');
}

// マーカーがちょうど1箇所あることを確認して、置換関数で差し込む（$ などの特殊文字が解釈されない）
function insertOnce(text, marker, value, label) {
  const first = text.indexOf(marker);
  if (first === -1) fail(label + ' に挿入位置 ' + marker + ' がありません');
  if (text.indexOf(marker, first + marker.length) !== -1) fail(label + ' に挿入位置 ' + marker + ' が複数あります');
  return text.slice(0, first) + value + text.slice(first + marker.length);
}

const template = read('index.template.html');
const styles = read('styles.css');
// 結合順序（明示）。フォルダの自動列挙やファイル名の並びには依存しない。
// この順序は分割前の src/app-before-plot.jsx の行順そのまま。
const APP_BEFORE_PLOT_FILES = [
  'app/01-constants-utils.jsx',
  'app/02-writing-prefs-storage.jsx',
  'app/03-dictionary-data.jsx',
  'app/04-adult-tools-data.jsx',
  'app/05-scene-story-data.jsx',
  'app/06-adult-import-data.jsx',
  'app/07-app-data-model.jsx',
  'app/08-text-folders.jsx',
  'app/09-migrate-load.jsx',
  'app/10-ai-import-logic.jsx',
  'app/11-image-storage.jsx',
  'app/12-common-ui.jsx',
  'app/13-character-list.jsx',
  'app/14-height-compare.jsx',
  'app/15-location-list.jsx',
  'app/16-character-detail.jsx',
  'app/17-organization-location-detail.jsx',
  'app/18-world-timeline-ideas.jsx',
  'app/19-old-plot.jsx',
  'app/20-writing-screen.jsx',
  'app/21-writing-support.jsx',
  'app/22-writing-snippet-modal.jsx',
  'app/23-dictionary-panels.jsx',
  'app/24-dictionary-editors.jsx',
  'app/25-ai-import-screen.jsx',
  'app/26-search.jsx',
  'app/27-writing-overview-adult-badges.jsx',
  'app/28-story-tools.jsx',
  'app/29-adult-tools-expression.jsx',
  'app/30-adult-import-remix-flow.jsx',
  'app/31-scene-flow-plans.jsx',
  'app/32-adult-onomatopoeia.jsx',
  'app/33-adult-remix-wordmap.jsx',
  'app/34-dashboard-settings-sync.jsx',
];
const before = APP_BEFORE_PLOT_FILES.map(read).join('');
const plotJsx = read('plot.jsx');
const plotCss = read('plot.css');
const app = read('app.jsx');

// plot.css を安全な JavaScript 文字列リテラルへ（バッククォート・${...}・バックスラッシュ等でも壊れない）
// JSON 文字列は JS として有効。U+2028/2029 は念のためエスケープする。
const cssLiteral = JSON.stringify(plotCss)
  .split(String.fromCharCode(0x2028)).join('\\u2028')
  .split(String.fromCharCode(0x2029)).join('\\u2029');

const plot = insertOnce(plotJsx, '@@PLOTV2_CSS@@', cssLiteral, 'src/plot.jsx');

const code = before + plot + app;

let html = insertOnce(template, '{{GLOBAL_CSS}}\n', styles.endsWith('\n') ? styles : styles + '\n', 'src/index.template.html');
html = insertOnce(html, '{{APP_CODE}}\n', code.endsWith('\n') ? code : code + '\n', 'src/index.template.html');

// すべて成功してから出力（一時ファイル経由で置き換える）。public 内の他ファイルには触れない。
mkdirSync(dirname(outPath), { recursive: true });
const tmp = outPath + '.tmp';
writeFileSync(tmp, html, 'utf8');
renameSync(tmp, outPath);
console.log('[build] 生成しました: public/index.html (' + Buffer.byteLength(html) + ' bytes)');
