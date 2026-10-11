/* ---- 成人向け創作ツール辞典：JSON一括登録専用の正規化。idは外部JSONの値を採用しない。
   重複判定は既存entryのconcept（trim済み）と照合する（小説語彙辞典のheadword判定と同じ思想）。 ---- */
function normalizeImportedAdultEntry(raw){
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
  const expressions = Array.isArray(raw.expressions) ? raw.expressions
    .filter(x => x && typeof x==='object' && !Array.isArray(x) && toTrimmedString(x.text))
    .map(x => ({
      text: toTrimmedString(x.text),
      directness: clampRating(x.directness),
      eroticism: clampRating(x.eroticism),
      vulgarity: clampRating(x.vulgarity),
      literary: clampRating(x.literary),
      perspective: normalizePerspective(x.perspective),
      note: toTrimmedString(x.note),
    })) : [];
  return {
    concept: toTrimmedString(raw.concept),
    category: toTrimmedString(raw.category),
    aliases: toCleanArray(raw.aliases),
    tags: toCleanArray(raw.tags),
    expressions,
  };
}

// JSON一括登録モーダルの「JSON形式をコピー」で使う汎用テンプレート（具体的なAdult語彙は含めない）
const ADULT_DICTIONARY_IMPORT_TEMPLATE = JSON.stringify({
  entries: [
    {
      concept: 'サンプル概念（何を表現したいか）',
      category: 'カテゴリ（身体・動作・反応・発声・心理など）',
      aliases: [],
      tags: ['タグA','タグB'],
      expressions: [
        {
          text: 'サンプル表現',
          directness: 3,
          eroticism: 3,
          vulgarity: 3,
          literary: 3,
          perspective: '両方',
          note: '',
        },
      ],
    },
  ],
}, null, 2);

