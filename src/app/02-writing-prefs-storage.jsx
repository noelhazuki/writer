function loadWritingLocation(){
  try{
    const r = JSON.parse(localStorage.getItem(WRITING_LOCATION_KEY)||'null');
    if(r && typeof r==='object'){
      return { tab: WRITING_TABS.includes(r.tab)?r.tab:'draft', /* 旧'shelf'も'draft'へ */ chapterId: r.chapterId?String(r.chapterId):null, blockId: r.blockId?String(r.blockId):null };
    }
  }catch(e){}
  return { tab:'draft', chapterId:null, blockId:null };
}

function loadWritingFontSize(){
  try{
    const saved = localStorage.getItem(WRITING_FONT_SIZE_KEY);
    if(saved !== null){
      const n = parseInt(saved, 10);
      if(!isNaN(n)) return clamp(n, WRITING_FONT_SIZE_MIN, WRITING_FONT_SIZE_MAX);
    }
  }catch(e){}
  // 保存済み設定が無い場合のみ、画面幅から初期値を決める
  const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width:880px)').matches;
  return isMobile ? 15 : 16;
}

// 表現パレットの初期サンプル辞書（ユーザーが自由に追加・編集・削除できる出発点）
function defaultWritingSnippets(){
  const catKana = uid('snippet-cat');
  const catSymbol = uid('snippet-cat');
  const catVoice = uid('snippet-cat');
  const mk = (categoryId, list, pinnedList) => list.map((text, i) => ({ id: uid('snippet'), categoryId, label:'', text, sortOrder:i, pinned: !!(pinnedList && pinnedList.includes(text)) }));
  return {
    categories: [
      { id: catKana, name:'小文字', sortOrder:0 },
      { id: catSymbol, name:'記号', sortOrder:1 },
      { id: catVoice, name:'声', sortOrder:2 },
    ],
    snippets: [
      ...mk(catKana, ['ぁ','ぃ','ぅ','ぇ','ぉ','っ','ゃ','ゅ','ょ'], ['ぁ','っ']),
      ...mk(catSymbol, ['……','――','ッ','！','？','、','。'], ['……','――','ッ']),
      ...mk(catVoice, ['あ','ん','ゔ','は'], ['ん']),
    ],
  };
}

// 旧データ（pinnedフィールドが無い/categoriesやsnippetsの形が古い）を安全に補正する。
// ここを通すことで、読み込み(loadWritingSnippets)とバックアップ復元(handleImportFile)の
// 双方で同じ互換ルールを共有できる。
function normalizeWritingSnippets(raw){
  const categories = Array.isArray(raw && raw.categories) ? raw.categories : [];
  const snippets = Array.isArray(raw && raw.snippets) ? raw.snippets : [];
  return {
    categories,
    snippets: snippets.map(s => ({ ...s, pinned: !!s.pinned })),
  };
}

function loadWritingSnippets(){
  try{
    const raw = localStorage.getItem(WRITING_SNIPPETS_KEY);
    if(raw !== null){
      const parsed = JSON.parse(raw);
      return normalizeWritingSnippets(parsed);
    }
  }catch(e){}
  // 保存データが一度も存在しない（＝アプリ初回起動）時だけ初期サンプルを返す。
  // ユーザーが全項目を削除した後の「空」はここで復活させない。
  return defaultWritingSnippets();
}

function saveWritingSnippets(sd){
  try{
    localStorage.setItem(WRITING_SNIPPETS_KEY, JSON.stringify({ categories: sd.categories, snippets: sd.snippets }));
  }catch(e){}
}

