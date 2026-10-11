function makeDefaultWsGroups(){
  return DEFAULT_WS_GROUPS.map((name,i)=>({ id: uid('wsg'), name, sortOrder:i }));
}

function initialData(){
  const wsGroups = makeDefaultWsGroups();
  const nameToGroupId = {};
  wsGroups.forEach(g=>{ nameToGroupId[g.name] = g.id; });
  return {
    project: { title: '無題の作品', createdAt: Date.now() },
    characters: [],
    characterGroups: [],
    organizations: [],
    locations: [],
    worldSettings: DEFAULT_WS_CATEGORIES.map(name => ({
      id: uid('wsc'), name, cards: [],
      groupId: nameToGroupId[WS_CATEGORY_GROUP_MAP[name]] || null,
    })),
    worldSettingGroups: wsGroups,
    timeline: [],
    ideas: [],
    plot: { structureType: '自由構成', chapters: [] },
    plotV2: emptyPlotV2(), // 新プロット（旧plotとは別。plotV2が無い旧データは空の新プロットとして扱う）
    writings: [],
    drafts: [],
    activeDraftId: null,
    draftingTextLegacyBackup: '', // 旧・単一下書き(draftingText)の安全な退避用。UIでは使用しない。
    savedPassages: [], // 保管棚の原本（移行後は参照しない。共通の文章はdraftsに入る）
    textFolders: [], // 「文章」のフォルダ（入れ子可）
    textMigration: { version: TEXT_MIGRATION_VERSION, migratedAt:null, folderIds:{draft:null,shelf:null}, idMap:{shelf:{},draft:{}}, originalDrafts:[], counts:{drafts:0,shelf:0} },
    sceneMaps: [],
    sceneFlowPlans: [], // 共通シーン進行（全年齢・成人向け共通の構造）。kind:'general'|'adult'で区別する。
    sceneFlowPlansMigratedFromAdult: false, // 旧・成人向けシーン進行(adultSceneFlow.plans)からの取り込み済みフラグ（目印。再取り込みの可否は下のIDリストで判定する）
    sceneFlowLegacyMigratedIds: [], // 取り込み済みの旧プランID。バックアップ読込後の再取り込みで重複・復活を防ぐ
    entityRelations: [],
  };
}

// シーン進行の1枚のカード：短い見出し(name)＋自由記述メモ(memo)のみ。心情等は必須にしない。
function makeFlowCard(name,memo){ return {id:uid('flowcard'),name:name||'',memo:memo||''}; }
function normalizeFlowCard(c){ c=c||{}; return {id:c.id||uid('flowcard'), name:String(c.name||''), memo:String(c.memo||'')}; }
// シーン進行：カードの自由な並び。開始・終了の位置は固定しない。行為前後の状態は任意入力。
// kind: 'general'（全年齢・共通）| 'adult'（成人向け）。データ構造・操作方法は両者で完全に同じ。
function makeFlowPlan(title, kind){ return {id:uid('flowplan'),title:title||'新しいシーン進行',kind:kind==='adult'?'adult':'general',beforeState:'',afterState:'',cards:[]}; }
function normalizeFlowPlan(p){
  p = p || {};
  return {
    id: p.id || uid('flowplan'),
    title: String(p.title||'無題のシーン進行'),
    kind: p.kind==='adult' ? 'adult' : 'general',
    beforeState: String(p.beforeState||''),
    afterState: String(p.afterState||''),
    cards: Array.isArray(p.cards) ? p.cards.map(normalizeFlowCard) : [],
  };
}
// ---- 旧・成人向けシーン進行(adultSceneFlow.plans)→共通シーン進行(data.sceneFlowPlans)の取り込み（何度呼んでも安全）----
//      ・取り込み済みIDリスト、または内容が同じ既存プランがあるものは取り込まない（重複防止）。
//      ・移行済みフラグは目印として立てるだけで、フラグを無条件に戻すことはしない。
//      ・元のadultSceneFlow.plansは削除しない。取り込む対象が無ければ同じdを返す（再描画ループ防止）。
function flowPlanSignature(p){
  return JSON.stringify([String(p.title||''), String(p.beforeState||''), String(p.afterState||''),
    (p.cards||[]).map(c=>[String(c.name||''), String(c.memo||'')])]);
}
function mergeLegacyScenePlans(d, legacyPlans){
  const legacy = Array.isArray(legacyPlans) ? legacyPlans : [];
  const doneIds = Array.isArray(d.sceneFlowLegacyMigratedIds) ? d.sceneFlowLegacyMigratedIds : [];
  const existing = d.sceneFlowPlans || [];
  const sigs = new Set(existing.map(flowPlanSignature));
  const add = [];
  const newIds = [];
  legacy.forEach(p=>{
    if(!p || !p.id || doneIds.includes(p.id)) return;
    newIds.push(p.id);
    const np = {
      id: uid('flowplan'), title: String(p.title||'無題のシーン進行'), kind:'adult',
      beforeState: String(p.beforeState||''), afterState: String(p.afterState||''),
      cards: (p.cards||[]).map(c=>({id:uid('flowcard'),name:String(c.name||''),memo:String(c.memo||'')})),
    };
    const sig = flowPlanSignature(np);
    if(sigs.has(sig)) return; // 同じ内容が既にある＝重複なので取り込まない（IDだけ取り込み済みにする）
    sigs.add(sig);
    add.push(np);
  });
  if(!add.length && !newIds.length && d.sceneFlowPlansMigratedFromAdult) return d;
  return {...d, sceneFlowPlans:[...existing, ...add], sceneFlowPlansMigratedFromAdult:true, sceneFlowLegacyMigratedIds:[...doneIds, ...newIds]};
}
// シーン進行を「下書きへ挿入」する際の、普通のテキストへの変換。空欄の項目は省略する。
function formatSceneFlowPlanForInsert(plan){
  const parts = [];
  parts.push(`【シーン進行：${plan.title||'無題のシーン進行'}】`);
  if((plan.beforeState||'').trim()) parts.push(`開始前：${plan.beforeState.trim()}`);
  const cardLines = (plan.cards||[]).map((c,i)=>{
    const head = `・${c.name || `カード${i+1}`}`;
    return (c.memo||'').trim() ? `${head}\n　メモ：${c.memo.trim()}` : head;
  });
  if(cardLines.length) parts.push(cardLines.join('\n\n'));
  if((plan.afterState||'').trim()) parts.push(`終了後：${plan.afterState.trim()}`);
  parts.push('【シーン進行ここまで】');
  return parts.join('\n\n');
}

// 下書き（複数保存）1件の初期値。sourceType/sourceIdは「塊」または「本文ブロック」からのコピー元を
// 任意で記録するためのもの（必須ではない）。historyは直近5世代までの本文スナップショット。
function makeDraftEntry(title, body, sourceType, sourceId, folderId){
  const now = new Date().toISOString();
  return {
    id: uid('draft'), title: String(title||'無題の下書き'), body: String(body||''), updatedAt: now, createdAt: now,
    sourceType: (sourceType==='passage'||sourceType==='block') ? sourceType : null,
    sourceId: sourceId ? String(sourceId) : null,
    history: [], deleted:false, deletedAt:null,
    memo:'', version:'', origin:null, folderId: folderId || null,
  };
}
// 「文章」1件の正規化。知らない項目も消さない（...d を先に敷く）。
function normalizeDraftEntry(d){
  d = d || {};
  return {
    ...d,
    id: d.id || uid('draft'),
    title: String(d.title||'無題の下書き'),
    body: String(d.body||''),
    updatedAt: String(d.updatedAt || new Date().toISOString()),
    createdAt: String(d.createdAt || d.updatedAt || new Date().toISOString()),
    sourceType: (d.sourceType==='passage'||d.sourceType==='block') ? d.sourceType : null,
    sourceId: d.sourceId ? String(d.sourceId) : null,
    history: Array.isArray(d.history) ? d.history.slice(0,5).map(h=>({
      body: String((h&&h.body)||''), savedAt: String((h&&h.savedAt)||new Date().toISOString()),
    })) : [],
    deleted: !!d.deleted,
    deletedAt: d.deletedAt ? String(d.deletedAt) : null,
    memo: String(d.memo||''),
    version: String(d.version||''),
    origin: (d.origin==='draft'||d.origin==='shelf') ? d.origin : null,
    folderId: d.folderId ? String(d.folderId) : null,
  };
}

