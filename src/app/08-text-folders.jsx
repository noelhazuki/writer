/* ============ 「文章」（下書き＋保管棚の統合）：フォルダ・移動・複製・ゴミ箱・移行 ============
   共通の文章データは data.drafts（IDは下書きのものを維持）。所属は folderId（null＝フォルダ外）。
   フォルダは data.textFolders、移行情報は data.textMigration。どれも dataを受け取り新しいdataを返す純関数。 */
const TEXT_MIGRATION_VERSION = 1;
function normalizeTextFolders(list, texts){
  const seen = new Set();
  let arr = (Array.isArray(list)?list:[]).filter(f=>f&&f.id&&!seen.has(f.id)&&(seen.add(f.id),true)).map(f=>({
    id:String(f.id), name:String(f.name||'無題のフォルダ'), parentId:f.parentId?String(f.parentId):null,
    createdAt:String(f.createdAt||new Date().toISOString()),
  }));
  const ids = new Set(arr.map(f=>f.id));
  arr = arr.map(f=>({...f, parentId:(f.parentId && ids.has(f.parentId) && f.parentId!==f.id)?f.parentId:null}));
  // 循環があれば、辿って輪になったフォルダを外へ出す
  arr = arr.map(f=>{
    const visited = new Set([f.id]); let cur = f.parentId;
    while(cur){ if(visited.has(cur)) return {...f, parentId:null}; visited.add(cur); const p = arr.find(x=>x.id===cur); cur = p?p.parentId:null; }
    return f;
  });
  return arr;
}
function textFolderDescendantIds(folders, id){
  const out = new Set(); const walk = (pid)=>(folders||[]).forEach(f=>{ if(f.parentId===pid && !out.has(f.id)){ out.add(f.id); walk(f.id); } });
  walk(id); return out;
}
// フォルダ自身・子孫への移動は不可
function canMoveTextFolder(folders, id, parentId){
  if(!parentId) return true;
  if(parentId===id) return false;
  return !textFolderDescendantIds(folders, id).has(parentId);
}
function textFolderPath(folders, id){
  const path = []; let cur = id; const guard = new Set();
  while(cur && !guard.has(cur)){ guard.add(cur); const f=(folders||[]).find(x=>x.id===cur); if(!f) break; path.unshift(f); cur=f.parentId; }
  return path;
}
function textAddFolder(d, name, parentId){
  const f = { id:uid('tfolder'), name:String(name||'').trim()||'新しいフォルダ', parentId:parentId||null, createdAt:new Date().toISOString() };
  return { d:{ ...d, textFolders:[...(d.textFolders||[]), f] }, folder:f };
}
function textRenameFolder(d, id, name){
  return { ...d, textFolders:(d.textFolders||[]).map(f=>f.id===id?{...f,name:String(name||'').trim()||f.name}:f) };
}
function textMoveFolder(d, id, parentId){
  if(!canMoveTextFolder(d.textFolders, id, parentId||null)) return d;
  return { ...d, textFolders:(d.textFolders||[]).map(f=>f.id===id?{...f,parentId:parentId||null}:f) };
}
// フォルダ削除：中のフォルダ・文章（ゴミ箱内も）は親へ移す。文章は消さない。
function textDeleteFolder(d, id){
  const f = (d.textFolders||[]).find(x=>x.id===id); if(!f) return d;
  const up = f.parentId||null;
  return { ...d,
    textFolders:(d.textFolders||[]).filter(x=>x.id!==id).map(x=>x.parentId===id?{...x,parentId:up}:x),
    drafts:(d.drafts||[]).map(t=>t.folderId===id?{...t,folderId:up}:t) };
}
// 文章の移動：所属フォルダだけを変える（ID・更新日時・プロット紐づけはそのまま）
function textMoveText(d, textId, folderId){
  const fid = folderId && (d.textFolders||[]).some(f=>f.id===folderId) ? folderId : null;
  return { ...d, drafts:(d.drafts||[]).map(t=>t.id===textId?{...t,folderId:fid}:t) };
}
function textDuplicate(d, textId){
  const t = (d.drafts||[]).find(x=>x.id===textId); if(!t) return { d, copy:null };
  const now = new Date().toISOString();
  const copy = normalizeDraftEntry({ ...t, id:uid('draft'), title:t.title+'（複製）', history:(t.history||[]).map(h=>({...h})),
    deleted:false, deletedAt:null, updatedAt:now, createdAt:now });
  return { d:{ ...d, drafts:[...d.drafts, copy] }, copy };
}
function textTrash(d, textId){
  return { ...d, drafts:(d.drafts||[]).map(t=>t.id===textId?{...t,deleted:true,deletedAt:new Date().toISOString()}:t),
    activeDraftId:d.activeDraftId===textId?null:d.activeDraftId };
}
function textRestore(d, textId){
  return { ...d, drafts:(d.drafts||[]).map(t=>t.id===textId?{...t,deleted:false,deletedAt:null,folderId:(t.folderId&&(d.textFolders||[]).some(f=>f.id===t.folderId))?t.folderId:null}:t) };
}
// 一覧用：あるフォルダ直下の文章（folderId=null は「フォルダ外」）
function textsInFolder(d, folderId, includeTrashed){
  return (d.drafts||[]).filter(t=>(!!t.deleted)===!!includeTrashed && (t.folderId||null)===(folderId||null));
}
// 初回だけ、下書き・保管棚を共通の文章へまとめる。textMigration.version が入っていれば二度と取り込まない。
function migrateTextsToCommon(parsed){
  parsed.drafts = Array.isArray(parsed.drafts) ? parsed.drafts : [];
  const tm = parsed.textMigration;
  if(tm && typeof tm==='object' && Number(tm.version)>=TEXT_MIGRATION_VERSION){
    parsed.textFolders = normalizeTextFolders(parsed.textFolders);
    const fids = new Set(parsed.textFolders.map(f=>f.id));
    parsed.drafts = parsed.drafts.map(t=>({...t, folderId:(t.folderId && fids.has(t.folderId))?t.folderId:null}));
    return parsed;
  }
  const now = new Date().toISOString();
  const originalDrafts = JSON.parse(JSON.stringify(parsed.drafts)); // 移行確認用の原本（以後は参照しない）
  const folders = normalizeTextFolders(parsed.textFolders);
  const mk = (name)=>{ const f={ id:uid('tfolder'), name, parentId:null, createdAt:now }; folders.push(f); return f; };
  const draftFolder = mk('下書き');
  const shelfFolder = mk('保管棚');
  const texts = parsed.drafts.map(t=>({ ...t, origin:t.origin||'draft', folderId:draftFolder.id }));
  const used = new Set(texts.map(t=>t.id));
  const shelfIdMap = {};
  const passages = Array.isArray(parsed.savedPassages) ? parsed.savedPassages : [];
  passages.forEach(p=>{
    const oldId = p.id || uid('passage');
    let newId = oldId;
    if(used.has(newId)) newId = uid('draft');
    used.add(newId);
    shelfIdMap[oldId] = newId;
    texts.push(normalizeDraftEntry({
      ...p, id:newId, title:String(p.title||'無題の塊'), body:String(p.body||''), memo:String(p.memo||''),
      version:String(p.version||'ver1'), history:Array.isArray(p.history)?p.history:[], origin:'shelf', folderId:shelfFolder.id,
      updatedAt:p.updatedAt||p.savedAt||now, createdAt:p.createdAt||p.updatedAt||p.savedAt||now,
      deleted:!!p.deleted, deletedAt:p.deletedAt||null,
    }));
  });
  // コピー元の記録（sourceType:'passage'）は新IDへ付け替える
  parsed.drafts = texts.map(t=>(t.sourceType==='passage' && t.sourceId && shelfIdMap[t.sourceId]) ? {...t, sourceId:shelfIdMap[t.sourceId]} : t);
  parsed.textFolders = folders;
  parsed.textMigration = {
    version:TEXT_MIGRATION_VERSION, migratedAt:now,
    folderIds:{ draft:draftFolder.id, shelf:shelfFolder.id },
    idMap:{ shelf:shelfIdMap, draft:Object.fromEntries(originalDrafts.map(t=>[t.id,t.id])) },
    originalDrafts, // 移行前の下書き。保管棚の原本は savedPassages にそのまま残す
    counts:{ drafts:originalDrafts.length, shelf:passages.length },
  };
  return parsed;
}

/* ---- 下書きの更新・履歴（共通処理）：執筆画面とプロットの執筆モーダルが同じ関数を使う ----
   どれも「dataを受け取って新しいdataを返す」形で、setData(d=>...) の更新関数の中で使う。
   対象の下書き1件だけを書き換えるので、古い画面内データで下書き全体を上書きしない。 */
const DRAFT_HISTORY_MAX = 5; // 履歴は直近5世代まで
function draftMap(d, draftId, fn){
  return { ...d, drafts:(d.drafts||[]).map(x => x.id===draftId ? fn(x) : x) };
}
// 本文の更新（履歴は触らない＝入力ごとに履歴を埋めない）
function draftApplyBody(d, draftId, body){
  return draftMap(d, draftId, x => (x.body===body ? x : { ...x, body, updatedAt:new Date().toISOString() }));
}
function draftApplyTitle(d, draftId, title){
  return draftMap(d, draftId, x => ({ ...x, title, updatedAt:new Date().toISOString() }));
}
// 直前版の記録。直前と同じ内容なら追加しない。最新5件まで（古いものから捨てる）。
function draftPushHistory(d, draftId, body){
  return draftMap(d, draftId, x => {
    if(x.history[0] && x.history[0].body===body) return x;
    return { ...x, history:[{ body, savedAt:new Date().toISOString() }, ...x.history].slice(0, DRAFT_HISTORY_MAX) };
  });
}
// 現在の本文を、直前版と違う時だけ履歴へ積む（定期記録・モーダルを閉じる時に使う）
function draftSnapshotIfChanged(d, draftId){
  const x = (d.drafts||[]).find(v => v.id===draftId);
  if(!x) return d;
  if(x.history[0] && x.history[0].body===x.body) return d;
  return draftPushHistory(d, draftId, x.body);
}
// 履歴の版へ戻す。現在の内容も、消えないよう先に履歴へ積んでから置き換える。
function draftRestoreHistory(d, draftId, entry){
  return draftMap(d, draftId, x => {
    const keep = (x.history[0] && x.history[0].body===x.body) ? x.history : [{ body:x.body, savedAt:new Date().toISOString() }, ...x.history].slice(0, DRAFT_HISTORY_MAX);
    return { ...x, body:entry.body, updatedAt:new Date().toISOString(), history:keep };
  });
}
// 下書きID → その下書きを関連付けているプロットの出来事（名前はIDから都度取得するので、名前変更に追従する）
function plotV2DraftUsers(plot){
  const map = new Map();
  const walk = (list) => (list||[]).forEach(n => {
    if(n.kind==='group'){ walk(n.children); return; }
    if(!n.draftId) return;
    if(!map.has(n.draftId)) map.set(n.draftId, []);
    map.get(n.draftId).push({ id:n.id, title:(n.title||'').trim() || '未定' });
  });
  walk(plot && plot.items);
  return map;
}

