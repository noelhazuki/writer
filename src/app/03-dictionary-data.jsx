/* ============ 表現辞典（言い換え・類語の参照辞書。表現パレットとは別データ） ============
   「概念（見出し語）」単位で、複数の表現候補とタグ・ニュアンスをまとめて持つ。
   本文への挿入は表現パレットと同じ insertIntoBody を再利用し、専用の挿入処理は作らない。 */
const EXPRESSION_DICTIONARY_KEY = 'novel-world-builder-expression-dictionary-v1';

// タグ・カテゴリは固定enumではなく文字列。ここは「入力候補」の初期値に過ぎず、ユーザーが自由に増やせる。
const EXPRESSION_DICTIONARY_TAG_SUGGESTIONS = ['標準','柔らかい','直接的','婉曲','文学寄り','現代小説寄り','口語','客観的','身体的','比喩','官能・弱','官能・中','官能・強','古風'];
const EXPRESSION_DICTIONARY_CATEGORY_SUGGESTIONS = ['身体','動作','声・呼吸','視線','感情','距離','衣服','触覚','温度','比喩','その他'];

// 大量の語彙を直書きしない。今後JSON一括投入で育てていく前提の、最低限のサンプルのみ。
function defaultExpressionDictionary(){
  return {
    entries: [
      {
        id: uid('expr'), headword:'胸', aliases:['バスト','乳房'], category:'身体', notes:'',
        expressions: [
          { id: uid('exprtx'), text:'胸', tags:['標準'], note:'もっとも無難' },
          { id: uid('exprtx'), text:'胸元', tags:['柔らかい'], note:'服装・視線描写にも使いやすい' },
          { id: uid('exprtx'), text:'乳房', tags:['身体的','直接的'], note:'' },
          { id: uid('exprtx'), text:'双丘', tags:['文学寄り','比喩'], note:'やや古風に見える場合あり' },
        ],
      },
      {
        id: uid('expr'), headword:'見る', aliases:['視線を送る','目をやる'], category:'視線', notes:'',
        expressions: [
          { id: uid('exprtx'), text:'見る', tags:['標準'], note:'' },
          { id: uid('exprtx'), text:'見つめる', tags:['文学寄り'], note:'やや強い・持続的な視線' },
          { id: uid('exprtx'), text:'目を向ける', tags:['客観的'], note:'' },
          { id: uid('exprtx'), text:'視線を這わせる', tags:['比喩','官能・弱'], note:'' },
        ],
      },
      {
        id: uid('expr'), headword:'触れる', aliases:['触る'], category:'触覚', notes:'',
        expressions: [
          { id: uid('exprtx'), text:'触れる', tags:['標準'], note:'' },
          { id: uid('exprtx'), text:'触る', tags:['口語'], note:'' },
          { id: uid('exprtx'), text:'指先を這わせる', tags:['文学寄り','比喩','官能・中'], note:'' },
          { id: uid('exprtx'), text:'手を伸ばす', tags:['柔らかい'], note:'触れる直前の動作としても使える' },
        ],
      },
    ],
  };
}

// 旧データ・不正な形の混入を安全に補正する。読み込みとバックアップ復元の双方で共有する。
function normalizeExpressionDictionary(raw){
  const entries = Array.isArray(raw && raw.entries) ? raw.entries : [];
  return {
    entries: entries.map(e => ({
      id: e.id || uid('expr'),
      headword: e.headword || '',
      aliases: Array.isArray(e.aliases) ? e.aliases : [],
      category: e.category || '',
      notes: e.notes || '',
      expressions: Array.isArray(e.expressions) ? e.expressions.map(x => ({
        id: x.id || uid('exprtx'),
        text: x.text || '',
        tags: Array.isArray(x.tags) ? x.tags : [],
        note: x.note || '',
      })) : [],
    })),
  };
}

function loadExpressionDictionary(){
  try{
    const raw = localStorage.getItem(EXPRESSION_DICTIONARY_KEY);
    if(raw !== null){
      return normalizeExpressionDictionary(JSON.parse(raw));
    }
  }catch(e){}
  // 保存データが一度も存在しない（＝初回起動）時だけ初期サンプルを返す。全削除後の「空」はここで復活させない。
  return defaultExpressionDictionary();
}

function saveExpressionDictionary(ed){
  try{
    localStorage.setItem(EXPRESSION_DICTIONARY_KEY, JSON.stringify({ entries: ed.entries }));
  }catch(e){}
}

/* ============ 小説語彙辞典（俗語・造語・ジャンル固有語などを保存・分類・検索する資料辞典）
   表現辞典（ExpressionDictionary）とはデータを完全に分離する。挿入UIは持たず、コピーのみ。
   具体的な語彙は今回コードへ直書きしない。将来 { entries:[...] } 形式のJSON一括投入で育てる前提。 */
const SPECIAL_DICTIONARY_KEY = 'novel-world-builder-special-dictionary-v1';

function defaultSpecialDictionary(){
  return { entries: [] };
}

// 旧データ・不正な形の混入を安全に補正する。読み込みとバックアップ復元の双方で共有する。
// 数値項目（directness/informality/coinedness/comicRisk）は1〜5へclampする。
function normalizeSpecialDictionary(raw){
  const entries = Array.isArray(raw && raw.entries) ? raw.entries : [];
  const clampRating = (v) => clamp(Number.isFinite(Number(v)) ? Math.round(Number(v)) : 3, 1, 5);
  return {
    entries: entries.map(e => ({
      id: e.id || uid('special'),
      headword: e.headword || '',
      aliases: Array.isArray(e.aliases) ? e.aliases : [],
      category: e.category || '',
      meaning: e.meaning || '',
      tags: Array.isArray(e.tags) ? e.tags : [],
      structureParts: Array.isArray(e.structureParts) ? e.structureParts : [],
      searchHints: Array.isArray(e.searchHints) ? e.searchHints : [],
      directness: clampRating(e.directness),
      informality: clampRating(e.informality),
      coinedness: clampRating(e.coinedness),
      comicRisk: clampRating(e.comicRisk),
      note: e.note || '',
    })),
  };
}

function loadSpecialDictionary(){
  try{
    const raw = localStorage.getItem(SPECIAL_DICTIONARY_KEY);
    if(raw !== null){
      return normalizeSpecialDictionary(JSON.parse(raw));
    }
  }catch(e){}
  // 保存データが一度も存在しない（＝初回起動）時だけ空の辞典を返す。全削除後の「空」はここで復活させない（そもそも中身がないので実質同じ）。
  return defaultSpecialDictionary();
}

function saveSpecialDictionary(sd){
  try{
    localStorage.setItem(SPECIAL_DICTIONARY_KEY, JSON.stringify({ entries: sd.entries }));
  }catch(e){}
}

/* ---- 小説語彙辞典：JSON一括登録専用の正規化 ----
   normalizeSpecialDictionary() の「数値は1〜5へclamp・不正値は3」という思想を再利用しつつ、
   一括投入されたJSONを安全に受け入れるため、さらに文字列のtrimと配列の空文字除外・重複除外を行う。
   id は外部JSONの値を一切採用しない（常に呼び出し側で uid('special') を新規発行する）。 */
function normalizeImportedSpecialEntry(raw){
  const toTrimmedString = (v) => (v==null ? '' : String(v)).trim();
  const toCleanArray = (v) => {
    if(!Array.isArray(v)) return [];
    const seen = new Set();
    const out = [];
    v.forEach(item=>{
      const s = toTrimmedString(item);
      if(s && !seen.has(s)){ seen.add(s); out.push(s); }
    });
    return out;
  };
  const clampRating = (v) => {
    const n = Number(v);
    if(!Number.isFinite(n)) return 3;
    return clamp(Math.round(n), 1, 5);
  };
  return {
    headword: toTrimmedString(raw.headword),
    aliases: toCleanArray(raw.aliases),
    category: toTrimmedString(raw.category),
    meaning: toTrimmedString(raw.meaning),
    tags: toCleanArray(raw.tags),
    structureParts: toCleanArray(raw.structureParts),
    searchHints: toCleanArray(raw.searchHints),
    directness: clampRating(raw.directness),
    informality: clampRating(raw.informality),
    coinedness: clampRating(raw.coinedness),
    comicRisk: clampRating(raw.comicRisk),
    note: toTrimmedString(raw.note),
  };
}

// JSON一括登録モーダルの「JSON形式をコピー」で使う汎用テンプレート（成人向け等の具体語彙は含めない）
const SPECIAL_DICTIONARY_IMPORT_TEMPLATE = JSON.stringify({
  entries: [
    {
      headword: 'サンプル用語',
      aliases: [],
      category: 'カテゴリ',
      meaning: '意味',
      tags: ['タグA','タグB'],
      structureParts: ['要素A','要素B'],
      searchHints: ['逆引きキーワードA','逆引きキーワードB'],
      directness: 3,
      informality: 3,
      coinedness: 3,
      comicRisk: 3,
      note: '',
    },
  ],
}, null, 2);

/* ============ 令和メディア語辞典（ネット・SNS・ゲーム・配信・オタク文化・広告等で発達した語彙の資料辞典）
   小説語彙辞典（SpecialDictionary）・表現辞典（ExpressionDictionary）・本文データとは完全にデータを分離する。
   データ構造・JSON一括登録の思想は小説語彙辞典をベースにしているが、保存先・状態は別管理。
   具体的な語彙は今回コードへ直書きしない。将来 { entries:[...] } 形式のJSON一括投入で育てる前提。 */
const MEDIA_DICTIONARY_KEY = 'novel-world-builder-media-dictionary-v1';

function defaultMediaDictionary(){
  return { entries: [] };
}

// 数値項目（directness/informality/coinedness/comicRisk）は1〜5へclampする（小説語彙辞典と同じ思想）。
function normalizeMediaDictionary(raw){
  const entries = Array.isArray(raw && raw.entries) ? raw.entries : [];
  const clampRating = (v) => clamp(Number.isFinite(Number(v)) ? Math.round(Number(v)) : 3, 1, 5);
  return {
    entries: entries.map(e => ({
      id: e.id || uid('media'),
      headword: e.headword || '',
      aliases: Array.isArray(e.aliases) ? e.aliases : [],
      category: e.category || '',
      meaning: e.meaning || '',
      tags: Array.isArray(e.tags) ? e.tags : [],
      structureParts: Array.isArray(e.structureParts) ? e.structureParts : [],
      directness: clampRating(e.directness),
      informality: clampRating(e.informality),
      coinedness: clampRating(e.coinedness),
      comicRisk: clampRating(e.comicRisk),
      note: e.note || '',
    })),
  };
}

function loadMediaDictionary(){
  try{
    const raw = localStorage.getItem(MEDIA_DICTIONARY_KEY);
    if(raw !== null){
      return normalizeMediaDictionary(JSON.parse(raw));
    }
  }catch(e){}
  return defaultMediaDictionary();
}

function saveMediaDictionary(md){
  try{
    localStorage.setItem(MEDIA_DICTIONARY_KEY, JSON.stringify({ entries: md.entries }));
  }catch(e){}
}

/* ---- 令和メディア語辞典：JSON一括登録専用の正規化（小説語彙辞典と同じ思想。idは外部JSONの値を採用しない） ---- */
function normalizeImportedMediaEntry(raw){
  const toTrimmedString = (v) => (v==null ? '' : String(v)).trim();
  const toCleanArray = (v) => {
    if(!Array.isArray(v)) return [];
    const seen = new Set();
    const out = [];
    v.forEach(item=>{
      const s = toTrimmedString(item);
      if(s && !seen.has(s)){ seen.add(s); out.push(s); }
    });
    return out;
  };
  const clampRating = (v) => {
    const n = Number(v);
    if(!Number.isFinite(n)) return 3;
    return clamp(Math.round(n), 1, 5);
  };
  return {
    headword: toTrimmedString(raw.headword),
    aliases: toCleanArray(raw.aliases),
    category: toTrimmedString(raw.category),
    meaning: toTrimmedString(raw.meaning),
    tags: toCleanArray(raw.tags),
    structureParts: toCleanArray(raw.structureParts),
    directness: clampRating(raw.directness),
    informality: clampRating(raw.informality),
    coinedness: clampRating(raw.coinedness),
    comicRisk: clampRating(raw.comicRisk),
    note: toTrimmedString(raw.note),
  };
}

// JSON一括登録モーダルの「JSON形式をコピー」で使う汎用テンプレート
const MEDIA_DICTIONARY_IMPORT_TEMPLATE = JSON.stringify({
  entries: [
    {
      headword: 'サンプル用語',
      aliases: [],
      category: 'カテゴリ',
      meaning: '意味',
      tags: ['タグA','タグB'],
      structureParts: ['要素A','要素B'],
      directness: 3,
      informality: 3,
      coinedness: 3,
      comicRisk: 3,
      note: '',
    },
  ],
}, null, 2);

/* ============ 成人向け創作ツール辞典（表現辞典・小説語彙辞典・メディア語辞典・本文データとは完全に分離） ============
   単なる用語辞書ではなく、「概念（何を表現したいか）」単位で複数の表現候補（expressions）を持ち、
   各候補に 直接度／官能度／俗度／文芸度 の4指標と、地の文／セリフの区別を持たせる。
   「魔改造」（条件絞り込み）・「語句マップ」（視覚比較）は、このexpressionsを共通データソースとして参照する。
   具体的なAdult語彙は今回コードへ直書きしない。空辞典のまま、JSON一括登録で育てる前提。 */
const ADULT_DICTIONARY_KEY = 'novel-world-builder-adult-dictionary-v1';

// 地の文／セリフ／両方の3値。不正値・未指定は「両方」に寄せる。
const ADULT_PERSPECTIVE_VALUES = ['地の文','セリフ','両方'];
const normalizePerspective = (v) => ADULT_PERSPECTIVE_VALUES.includes(v) ? v : '両方';

function defaultAdultDictionary(){
  return { entries: [] };
}

function normalizeAdultExpression(x){
  const clampRating = (v) => clamp(Number.isFinite(Number(v)) ? Math.round(Number(v)) : 3, 1, 5);
  return {
    id: x.id || uid('adultex'),
    text: x.text || '',
    directness: clampRating(x.directness),
    eroticism: clampRating(x.eroticism),
    vulgarity: clampRating(x.vulgarity),
    literary: clampRating(x.literary),
    perspective: normalizePerspective(x.perspective),
    note: x.note || '',
  };
}

function normalizeAdultDictionary(raw){
  const entries = Array.isArray(raw && raw.entries) ? raw.entries : [];
  return {
    entries: entries.map(e => ({
      id: e.id || uid('adultc'),
      concept: e.concept || '',
      category: e.category || '',
      aliases: Array.isArray(e.aliases) ? e.aliases : [],
      tags: Array.isArray(e.tags) ? e.tags : [],
      expressions: Array.isArray(e.expressions) ? e.expressions.map(normalizeAdultExpression) : [],
    })),
  };
}

function loadAdultDictionary(){
  try{
    const raw = localStorage.getItem(ADULT_DICTIONARY_KEY);
    if(raw !== null){
      return normalizeAdultDictionary(JSON.parse(raw));
    }
  }catch(e){}
  return defaultAdultDictionary();
}

function saveAdultDictionary(ad){
  try{
    localStorage.setItem(ADULT_DICTIONARY_KEY, JSON.stringify({ entries: ad.entries }));
  }catch(e){}
}


