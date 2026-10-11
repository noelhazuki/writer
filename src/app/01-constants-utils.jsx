const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ============ 定数 ============ */
const NAV_ITEMS = [
  { key:'dashboard', label:'ダッシュボード', icon:'🏠' },
  { key:'characters', label:'キャラクター', icon:'🧑' },
  { key:'organizations', label:'組織 / 勢力 / 家系', icon:'🏳' },
  { key:'locations', label:'場所 / 建物', icon:'📍' },
  { key:'worldsettings', label:'世界設定', icon:'🌍' },
  { key:'timeline', label:'年表', icon:'📜' },
  { key:'ideas', label:'ネタ箱', icon:'💡' },
  { key:'plot', label:'プロット', icon:'🧩' },
  { key:'plotOld', label:'旧プロット', icon:'🗂' },
  { key:'storyTools', label:'シーン・物語設計', icon:'🎬' },
  { key:'sceneFlow', label:'シーン進行', icon:'🧵' },
  { key:'writing', label:'執筆', icon:'✍️' },
  { key:'aiimport', label:'設定を一括取り込み', icon:'🤖' },
  { key:'adultTools', label:'成人向け創作', icon:'🔞' },
];

// スマホ下部ナビ（5項目固定・横スクロールなし）：ホーム／執筆／プロット／設定／その他。
// 「執筆」は screen==='writing'。中の「文章／本文」の切り替えと前回の場所の復元はWriting画面側（writingTab等）で行う。
// 「設定」は作品の設定資料（人物・組織・場所・世界設定・年表・ネタ箱）をまとめた入口画面 'settingsHub'。
// NAV_ITEMSはPC左サイドバー用のため変更せず、表示専用に別定義する。
const MOBILE_TAB_ITEMS = [
  { key:'dashboard', label:'ホーム', icon:'🏠' },
  { key:'writing', label:'執筆', icon:'✍️', primary:true },
  { key:'plot', label:'プロット', icon:'🧩' },
  { key:'settingsHub', label:'設定', icon:'📚' },
  { key:'more', label:'その他', icon:'☰' },
];
// 「設定」入口画面に並べる画面（NAV_ITEMSのラベル/アイコンを流用）
const SETTINGS_SCREEN_KEYS = ['characters','organizations','locations','worldsettings','timeline','ideas'];
// 「その他」ボトムシートに表示する画面（NAV_ITEMSのラベル/アイコンをそのまま流用）
// 全体構成・物語設計（storyTools）・シーン進行・一括取り込み・成人向け創作。バックアップ／クラウド同期はシート内の専用ボタン。
const MORE_SCREEN_KEYS = ['plotOld','storyTools','sceneFlow','aiimport','adultTools'];
const isMoreScreen = (screen) => MORE_SCREEN_KEYS.includes(screen);
const isSettingsScreen = (screen) => screen==='settingsHub' || SETTINGS_SCREEN_KEYS.includes(screen);
// 画面の戻る操作＝一つ上の階層へ。親が無い画面（ホーム）は戻る先が無い（ブラウザ／端末の戻るへ委ねる）。
const SCREEN_PARENT = {
  settingsHub:'dashboard', writing:'dashboard', plot:'dashboard',
  characters:'settingsHub', organizations:'settingsHub', locations:'settingsHub', worldsettings:'settingsHub', timeline:'settingsHub', ideas:'settingsHub',
  plotOld:'dashboard', storyTools:'dashboard', sceneFlow:'dashboard', aiimport:'dashboard', adultTools:'dashboard',
};
const SCREEN_PARENT_LABEL = { dashboard:'ホーム', settingsHub:'設定' };

// 「本文」の1単位の画面上の呼び名。将来「話」へ切り替える時はここだけ変える（保存データのキー・構造には一切関係しない表示専用の値）。
const WRITING_UNIT = '章';

const DEFAULT_WS_CATEGORIES = [
  '法律','金銭','言語','文明','男女 / セクシャリティ','現代との違い','政治','宗教','教育',
  '医療','交通','通信','軍事','犯罪','労働','家族制度','食文化','娯楽','死生観'
];

// 世界設定の大分類（推奨初期セット）。「探したい時にどこを開くか」を基準にした直感的な分類。
// ユーザーが自由に追加・削除・並び替えできる。
const DEFAULT_WS_GROUPS = ['社会・文化','暮らし','政治・法律','経済','軍事・治安','科学・技術','宗教・思想','地理・環境','歴史'];
// 旧データ・初期データのカテゴリを、どの大分類へ振り分けるかの対応表。
// ここに無いカテゴリは「その他（未分類）」に入る。
const WS_CATEGORY_GROUP_MAP = {
  '言語':'社会・文化', '男女 / セクシャリティ':'社会・文化', '家族制度':'社会・文化', '教育':'社会・文化', '娯楽':'社会・文化',
  '食文化':'暮らし', '労働':'暮らし', '現代との違い':'暮らし',
  '政治':'政治・法律', '法律':'政治・法律',
  '金銭':'経済',
  '軍事':'軍事・治安', '犯罪':'軍事・治安',
  '文明':'科学・技術', '医療':'科学・技術', '通信':'科学・技術', '交通':'科学・技術',
  '宗教':'宗教・思想', '死生観':'宗教・思想',
};
// グループ未設定（groupId:null、または参照先が消えている）カテゴリ・キャラクターを表す仮想グループのID
const WS_UNASSIGNED = '__ws_unassigned__';
const CHAR_UNASSIGNED = '__char_unassigned__';

const IDEA_TYPES = ['セリフ','シーン','設定','伏線','ギャグ','描写','アイデア','要確認'];
const IDEA_STATUSES = ['未使用','使用予定','使用済み'];
const PLOT_PRESETS = {
  '起承転結': ['起','承','転','結'],
  '序破急': ['序','破','急'],
  '三幕構成': ['第一幕', '第二幕', '第三幕'],
  '五幕構成': ['導入','上昇','クライマックス','下降','結末'],
  '自由構成': [],
};

const STORAGE_KEY = 'novel-world-builder-data-v1';
const CLOUD_SYNC_CONFIG_KEY = 'novel-world-builder-cloud-sync-v1';
const CLOUD_SYNC_API = '/api/sync';
const WRITING_FONT_SIZE_KEY = 'novel-world-builder-writing-font-size-v1'; // 本文エディタの文字サイズ（UI設定。小説データ本体とは別保存）
const WRITING_FONT_SIZE_MIN = 14;
const WRITING_FONT_SIZE_MAX = 18;
const WRITING_LOCATION_KEY = 'novel-world-builder-writing-location-v1'; // 執筆画面で最後に開いていた場所（UI設定。小説データ本体・クラウド同期・バックアップには含めない）
const WRITING_TABS = ['draft','chapters','map']; // 'draft'＝「文章」（下書き＋保管棚を統合）。旧'shelf'は'draft'へ寄せる
const WRITING_SNIPPETS_KEY = 'novel-world-builder-writing-snippets-v1'; // 表現パレット辞書（UI設定。小説データ本体とは別保存）

/* ============ ユーティリティ ============ */
function uid(prefix){
  return (prefix||'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
}

function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

function loadCloudSyncConfig(){
  try{
    const parsed = JSON.parse(localStorage.getItem(CLOUD_SYNC_CONFIG_KEY)||'{}');
    return { enabled:!!parsed.enabled, key:String(parsed.key||''), revision:Number(parsed.revision||0), lastSyncedAt:String(parsed.lastSyncedAt||'') };
  }catch(e){ return { enabled:false, key:'', revision:0, lastSyncedAt:'' }; }
}
function saveCloudSyncConfig(config){
  try{ localStorage.setItem(CLOUD_SYNC_CONFIG_KEY, JSON.stringify(config)); }catch(e){}
}

// ソフトウェアキーボード表示時、fixed要素がキーボードの裏へ隠れないための追加オフセット。
// visualViewportが使える環境だけ計算し、使えない環境は常に0（＝通常のfixed表示にフォールバック）。
function useKeyboardInset(){
  const [inset, setInset] = useState(0);
  useEffect(()=>{
    const vv = window.visualViewport;
    if(!vv) return;
    const update = () => {
      const gap = window.innerHeight - (vv.height + vv.offsetTop);
      setInset(gap > 1 ? Math.round(gap) : 0);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []);
  return inset;
}

// 指定した要素（ref）の実表示高さを継続的に測る。ResizeObserverが無い環境では初回のみ計測。
function useMeasuredHeight(ref, deps){
  const [height, setHeight] = useState(0);
  useEffect(()=>{
    const el = ref.current;
    if(!el){ setHeight(0); return; }
    if(typeof ResizeObserver === 'undefined'){ setHeight(el.offsetHeight||0); return; }
    const ro = new ResizeObserver(()=>{ setHeight(el.offsetHeight||0); });
    ro.observe(el);
    setHeight(el.offsetHeight||0);
    return ()=>ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return height;
}

// CSSセレクタで指定した要素（bottom-tabsなど、自コンポーネント外のDOM）の実表示高さを測る。
// 対象が無い/非表示（display:none）の場合は0になる。
function useSelectorHeight(selector, enabled){
  const [height, setHeight] = useState(0);
  useEffect(()=>{
    if(!enabled){ setHeight(0); return; }
    const el = document.querySelector(selector);
    if(!el){ setHeight(0); return; }
    if(typeof ResizeObserver === 'undefined'){ setHeight(el.offsetHeight||0); return; }
    const ro = new ResizeObserver(()=>{ setHeight(el.offsetHeight||0); });
    ro.observe(el);
    setHeight(el.offsetHeight||0);
    return ()=>ro.disconnect();
  }, [selector, enabled]);
  return height;
}

