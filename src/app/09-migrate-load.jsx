// 既存データを壊さないための不足フィールド補完。
// 新しく追加した項目が無い旧データでも安全に動作するようにする。
function migrateData(parsed){
  // 下書き：単一のdraftingTextから複数保存できるdrafts配列へ移行する。
  // 「drafts」フィールドが存在しない（＝この機能より前の旧バックアップ）場合にのみ、
  // 中身があれば1件の下書き「旧下書き」として作成する。draftingText自体の中身は
  // draftingTextLegacyBackupへコピーして保持し、即座には削除しない（移行が誤っていても復旧できるように）。
  const hadDraftsField = Array.isArray(parsed.drafts);
  const legacyText = String(parsed.draftingText||'');
  parsed.draftingTextLegacyBackup = String(
    parsed.draftingTextLegacyBackup!==undefined && parsed.draftingTextLegacyBackup!==null
      ? parsed.draftingTextLegacyBackup : legacyText
  );
  if(!hadDraftsField){
    const migrated = legacyText.trim() ? [makeDraftEntry('旧下書き', legacyText, null, null)] : [];
    parsed.drafts = migrated;
    parsed.activeDraftId = null; // 移行直後はエディタを自動で開かず、一覧から選んで開く形にする
  } else {
    parsed.drafts = parsed.drafts.map(normalizeDraftEntry);
    const liveIds = new Set(parsed.drafts.filter(d=>!d.deleted).map(d=>d.id));
    // activeDraftIdがnull（＝一覧を表示する状態）は正常な状態としてそのまま保持する。
    // 存在しない下書きや削除済みの下書きを指しているときだけ、一覧へ戻す（null）。
    if(parsed.activeDraftId && !liveIds.has(parsed.activeDraftId)){
      parsed.activeDraftId = null;
    }
  }
  delete parsed.draftingText; // 新形式へ移行済み。中身はdraftingTextLegacyBackupに退避済みなので消えない。

  parsed.savedPassages=Array.isArray(parsed.savedPassages)?parsed.savedPassages.map(p=>({...p,id:p.id||uid('passage'),title:String(p.title||'無題の塊'),body:String(p.body||''),memo:String(p.memo||''),version:String(p.version||'ver1')})):[];
  migrateTextsToCommon(parsed); // 下書き＋保管棚 → 共通の「文章」（初回のみ。textMigration.versionで重複を防ぐ）
  parsed.sceneMaps=Array.isArray(parsed.sceneMaps)?parsed.sceneMaps.map(m=>({...m,id:m.id||uid('map'),title:String(m.title||'新しい話'),items:Array.isArray(m.items)?m.items.map(i=>({...i,id:i.id||uid('mapitem'),title:String(i.title||''),memo:String(i.memo||'')})):[]})):[];
  // 共通シーン進行（全年齢・成人向け共通の構造）。旧・成人向けシーン進行（adultSceneFlow.plans、別ストア）からの
  // 一回限りの取り込みはApp側で行う（両方のストアが揃うのを待つ必要があるため）。ここではこのデータ自身の正規化のみ。
  parsed.sceneFlowPlans = Array.isArray(parsed.sceneFlowPlans) ? parsed.sceneFlowPlans.map(normalizeFlowPlan) : [];
  parsed.sceneFlowPlansMigratedFromAdult = !!parsed.sceneFlowPlansMigratedFromAdult;
  parsed.sceneFlowLegacyMigratedIds = Array.isArray(parsed.sceneFlowLegacyMigratedIds) ? parsed.sceneFlowLegacyMigratedIds.filter(x=>typeof x==='string') : [];
  if(!parsed.worldSettings) parsed.worldSettings = initialData().worldSettings;
  if(!parsed.plot) parsed.plot = { structureType:'自由構成', chapters: [] };
  if(!parsed.writings) parsed.writings = [];
  parsed.writings = parsed.writings.map(w=>{
    const blocks=Array.isArray(w.blocks)&&w.blocks.length?w.blocks.map(b=>({
      id:b.id||uid('wblock'),title:b.title||'無題の場面',body:String(b.body||''),
      memo:String(b.memo||''),kind:b.kind==='adult'?'adult':'normal',
      status:['未定','執筆中','一旦完成'].includes(b.status)?b.status:'執筆中',
      adultNote:String(b.adultNote||'')
    })):[{id:uid('wblock'),title:w.title||'本文',body:String(w.body||''),memo:'',kind:'normal',status:'執筆中',adultNote:''}];
    return {...w,blocks,body:blocks.map(b=>b.body).filter(Boolean).join('\n\n')};
  });
  if(!parsed.ideas) parsed.ideas = [];
  if(!parsed.timeline) parsed.timeline = [];
  if(!parsed.characters) parsed.characters = [];
  if(!parsed.organizations) parsed.organizations = [];
  if(!parsed.locations) parsed.locations = [];

  if(!parsed.characterGroups) parsed.characterGroups = [];
  parsed.characters = parsed.characters.map(c => ({
    groupId: null, tags: [], ...c,
  }));

  // キャラクター設定UI改修（外見詳細・性格5段階・好み・信仰思想・目的の深掘り）で追加した項目。
  // 新項目が存在しない旧データでもエラーにならないよう、既定値を先に敷いてから旧データ(c)で上書きする。
  parsed.characters = parsed.characters.map(c => ({
    history:'',
    heightCm:null, weightKg:null, bust:'', waist:'', hip:'', bodyType:'',
    hairColor:'', hairLength:'', hairStyle:'', eyeColor:'', skinColor:'', outfit:'', appearanceFeatures:'',
    personalityScale:{}, preferenceScale:{}, beliefScale:{},
    likesText:'', dislikesText:'', weaknessText:'', fearText:'', obsessionText:'',
    religionStatus:'', religionDetail:'', believesSupernatural:'', supernaturalDetail:'',
    goalDetail:{}, characterAssessment:null,
    ...c,
    personalityScale: { ...(c.personalityScale||{}) },
    preferenceScale: { ...(c.preferenceScale||{}) },
    beliefScale: { ...(c.beliefScale||{}) },
    goalDetail: { ...(c.goalDetail||{}) },
  }));

  if(!parsed.worldSettingGroups || parsed.worldSettingGroups.length===0){
    parsed.worldSettingGroups = makeDefaultWsGroups();
  }
  const nameToGroupId = {};
  parsed.worldSettingGroups.forEach(g=>{ nameToGroupId[g.name] = g.id; });
  parsed.worldSettings = parsed.worldSettings.map(c => {
    if(c.groupId !== undefined) return c;
    const groupName = WS_CATEGORY_GROUP_MAP[c.name];
    return { ...c, groupId: (groupName && nameToGroupId[groupName]) || null };
  });

  parsed.locations = parsed.locations.map(l => ({
    parentLocationId: null, mapId: null, mapX: null, mapY: null, ...l,
  }));

  if(!parsed.entityRelations) parsed.entityRelations = [];

  // 所属情報のSingle Source of TruthをcharacterのaffiliationOrgIdsに一本化する。
  // 旧データでorganization.memberIdsにのみ記録されている所属を、一度だけaffiliationOrgIdsへ補完する。
  // memberIds自体は互換性のため残すが、以後の表示・更新には使わない。
  parsed.characters = parsed.characters.map(c => ({ affiliationOrgIds: [], ...c }));
  parsed.organizations.forEach(org => {
    (org.memberIds||[]).forEach(charId => {
      const ch = parsed.characters.find(c => c.id===charId);
      if(ch && !(ch.affiliationOrgIds||[]).includes(org.id)){
        ch.affiliationOrgIds = [...(ch.affiliationOrgIds||[]), org.id];
      }
    });
    org.memberIds = [];
  });

  migratePlotV2(parsed); // 新プロット（plotV2）の検証。無ければ空、不正なら空で上書きせず原本を保持する
  return parsed;
}

function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return initialData();
    const parsed = JSON.parse(raw);
    return migrateData(parsed);
  }catch(e){
    console.error('データ読み込み失敗', e);
    return initialData();
  }
}

