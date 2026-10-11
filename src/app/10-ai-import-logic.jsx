/* ============ AI設定一括取り込み ============
   「バックアップの読み込み」（データ全体の置換）とは完全に別の機能。
   こちらは既存データを残したまま、名前を手がかりに追加・更新する。
   画像関連（image / iconImageId / images）は一切触らない。
*/

// ChatGPT等へ「この形式でまとめて」と渡すためのテンプレート例
const AI_IMPORT_TEMPLATE = JSON.stringify({
  characters: [
    { name:"レイン", realName:"", age:"20代後半", category:"主人公", group:"クロイス主要メンバー", tags:["メイン"],
      summary:"...", appearance:"...", personality:"...", values:"...", goal:"...", memo:"",
      organizations:["クロイス","ヴェクス一族"] }
  ],
  organizations: [
    { name:"ヴェクス一族", category:"家系 / 一族", summary:"...", purpose:"", memo:"" }
  ],
  relations: [
    { from:"ヴェクス一族", to:"アストラ軍", label:"慣例的に軍務へ従事", reverseLabel:"代々人材を輩出", note:"..." }
  ],
  locations: [
    { name:"アストラ", category:"惑星", parent:null, summary:"...", memo:"" }
  ],
  worldSettings: [
    { group:"軍事・治安", category:"軍事", title:"軍務と名家", content:"..." }
  ],
  timeline: [
    { dateLabel:"...", title:"...", summary:"...", detail:"", tags:[] }
  ],
  ideas: [
    { type:"設定", content:"...", status:"未使用", tags:[] }
  ]
}, null, 2);

const IMPORT_FIELD_LABELS = {
  name:'名前', realName:'本名', age:'年齢', category:'カテゴリ', summary:'概要', appearance:'外見', personality:'性格',
  values:'思想 / 価値観', goal:'目的', memo:'メモ', purpose:'目的', content:'内容', tags:'タグ',
  affiliationOrgIds:'所属組織', detail:'詳細', title:'タイトル', dateLabel:'日時 / 年代',
};

function indexByName(list){
  const m = new Map();
  (list||[]).forEach(item => { if(item && item.name) m.set(String(item.name).trim(), item); });
  return m;
}

// 1つのテキスト項目について、既存値と取り込み値からどう扱うべきかを判定する
function textFieldDiff(existing, incoming){
  const e = (existing||'').toString().trim();
  const i = (incoming===undefined || incoming===null) ? '' : incoming.toString().trim();
  if(!i) return null; // 取り込み側に値が無いなら何もしない
  if(!e) return { kind:'fill', value:i };
  if(e===i) return { kind:'same' };
  return { kind:'conflict', existing:e, incoming:i };
}

// 配列フィールドの重複除去つきマージ（既存は絶対に消さない・削らない）
function arrayUnionDiff(existingArr, incomingArr){
  const existing = Array.isArray(existingArr) ? existingArr : [];
  const seen = new Set(existing);
  const added = [];
  (incomingArr||[]).forEach(v=>{
    if(v===undefined || v===null || v==='') return;
    if(seen.has(v)) return;
    seen.add(v); added.push(v);
  });
  return { added };
}

// 取り込みJSON（人間・AIが書く簡潔形式）と現在のdataから、差分プラン（プレビュー用）を作る。
// このプランはdataを一切変更しない。名前で解決できない参照先は "__new__:種別:名前" というプレースホルダーで表す。
function buildImportPlan(aiData, data){
  const errors = [];
  const changes = [];
  if(!aiData || typeof aiData !== 'object' || Array.isArray(aiData)){
    errors.push('JSON全体が、{ "characters": [...] } のようなオブジェクトになっている必要があります。');
    return { errors, changes };
  }
  ['characters','organizations','relations','locations','worldSettings','timeline','ideas'].forEach(key=>{
    if(aiData[key]!==undefined && !Array.isArray(aiData[key])) errors.push(`「${key}」は配列で指定してください（この項目は無視されます）。`);
  });
  const arr = (key) => Array.isArray(aiData[key]) ? aiData[key] : [];

  // ---- 1) characterGroups（characters[].groupから収集） ----
  const existingGroupByName = indexByName(data.characterGroups);
  const seenGroupNames = new Set();
  arr('characters').forEach(c=>{
    if(c && c.group){
      const gname = String(c.group).trim();
      if(gname && !existingGroupByName.has(gname) && !seenGroupNames.has(gname)){
        seenGroupNames.add(gname);
        changes.push({ id:'cg:'+gname, section:'characterGroups', action:'create', title:'グループ「'+gname+'」', detail:null,
          targetId:null, placeholderId:'__new__:cg:'+gname, setFields:{name:gname}, arrayFields:[], conflicts:[], refs:{} });
      }
    }
  });

  // ---- 2) organizations（明示指定 ＋ characters/relationsから間接的に必要な名前も含む） ----
  const existingOrgByName = indexByName(data.organizations);
  const explicitOrgByName = indexByName(arr('organizations'));
  const orgNamesNeeded = new Set();
  arr('organizations').forEach(o=>{ if(o && o.name) orgNamesNeeded.add(String(o.name).trim()); });
  arr('characters').forEach(c=>{ (Array.isArray(c && c.organizations) ? c.organizations : []).forEach(n=>{ if(n) orgNamesNeeded.add(String(n).trim()); }); });
  arr('relations').forEach(r=>{ if(r){ if(r.from) orgNamesNeeded.add(String(r.from).trim()); if(r.to) orgNamesNeeded.add(String(r.to).trim()); } });

  orgNamesNeeded.forEach(name=>{
    if(!name) return;
    const existing = existingOrgByName.get(name);
    const incoming = explicitOrgByName.get(name) || {};
    if(!existing){
      changes.push({ id:'org:new:'+name, section:'organizations', action:'create', title:name, detail:null,
        targetId:null, placeholderId:'__new__:org:'+name,
        setFields:{ name, category:incoming.category||'', summary:incoming.summary||'', purpose:incoming.purpose||'', memo:incoming.memo||'' },
        arrayFields:[], conflicts:[], refs:{} });
    } else {
      const setFields = {}; const conflicts = []; let anyChange=false;
      ['category','summary','purpose','memo'].forEach(f=>{
        if(incoming[f]===undefined) return;
        const d = textFieldDiff(existing[f], incoming[f]);
        if(!d) return;
        if(d.kind==='fill'){ setFields[f]=d.value; anyChange=true; }
        else if(d.kind==='conflict'){ conflicts.push({field:f, existing:d.existing, incoming:d.incoming, resolution:'keep'}); anyChange=true; }
      });
      changes.push({ id:'org:'+(anyChange?'upd':'same')+':'+existing.id, section:'organizations', action: anyChange?'update':'unchanged',
        title:name, detail:null, targetId:existing.id, placeholderId:null, setFields, arrayFields:[], conflicts, refs:{} });
    }
  });

  // ---- 3) relations（組織同士） ----
  const orgTokenByName = (name) => {
    const ex = existingOrgByName.get(name);
    return ex ? ex.id : '__new__:org:'+name;
  };
  arr('relations').forEach((r,idx)=>{
    if(!r || !r.from || !r.to){ errors.push('relationsの各要素には from と to が必要です（1件スキップ）。'); return; }
    const fromName = String(r.from).trim(), toName = String(r.to).trim();
    const fromToken = orgTokenByName(fromName), toToken = orgTokenByName(toName);
    const label = r.label || '';
    const dupExisting = !fromToken.startsWith('__new__:') && !toToken.startsWith('__new__:')
      ? (data.entityRelations||[]).find(rel => rel.fromId===fromToken && rel.toId===toToken && (rel.label||'')===label)
      : null;
    if(dupExisting){
      changes.push({ id:'rel:same:'+dupExisting.id, section:'relations', action:'unchanged', title:fromName+' → '+toName, detail:label||null,
        targetId:dupExisting.id, placeholderId:null, setFields:{}, arrayFields:[], conflicts:[], refs:{} });
    } else {
      const relDeps = [fromToken, toToken].filter(t=>t && t.indexOf('__new__:')===0);
      changes.push({ id:'rel:new:'+idx+':'+fromName+':'+toName, section:'relations', action:'create', title:fromName+' → '+toName, detail:label||null,
        targetId:null, placeholderId:null,
        setFields:{ fromId:fromToken, toId:toToken, label:r.label||'', reverseLabel:r.reverseLabel||'', note:r.note||'' },
        arrayFields:[], conflicts:[], refs:{ dependsOn: relDeps } });
    }
  });

  // ---- 4) characters ----
  const existingCharByName = indexByName(data.characters);
  const charTextFields = ['realName','age','category','summary','appearance','personality','values','goal','memo'];
  arr('characters').forEach(c=>{
    if(!c || !c.name){ errors.push('charactersの各要素には name が必要です（1件スキップ）。'); return; }
    const name = String(c.name).trim();
    const existing = existingCharByName.get(name);
    const groupToken = c.group ? (existingGroupByName.has(String(c.group).trim()) ? existingGroupByName.get(String(c.group).trim()).id : '__new__:cg:'+String(c.group).trim()) : undefined;
    const orgTokens = (Array.isArray(c.organizations) ? c.organizations : []).map(n=>orgTokenByName(String(n).trim())).filter(Boolean);
    const tagList = Array.isArray(c.tags) ? c.tags.map(t=>String(t).trim()).filter(Boolean) : [];

    if(!existing){
      const setFields = { name };
      charTextFields.forEach(f=>{ if(c[f]!==undefined && String(c[f]).trim()) setFields[f]=c[f]; });
      if(groupToken!==undefined) setFields.groupId = groupToken;
      const arrayFields = [];
      if(tagList.length) arrayFields.push({ field:'tags', added:tagList });
      if(orgTokens.length) arrayFields.push({ field:'affiliationOrgIds', added:orgTokens });
      const charDeps = [ ...(groupToken!==undefined ? [groupToken] : []), ...orgTokens ].filter(t=>t && t.indexOf('__new__:')===0);
      changes.push({ id:'char:new:'+name, section:'characters', action:'create', title:name, detail:null,
        targetId:null, placeholderId:'__new__:char:'+name, setFields, arrayFields, conflicts:[], refs:{ dependsOn: charDeps } });
    } else {
      const setFields = {}; const conflicts = []; let anyChange=false;
      charTextFields.forEach(f=>{
        if(c[f]===undefined) return;
        const d = textFieldDiff(existing[f], c[f]);
        if(!d) return;
        if(d.kind==='fill'){ setFields[f]=d.value; anyChange=true; }
        else if(d.kind==='conflict'){ conflicts.push({field:f, existing:d.existing, incoming:d.incoming, resolution:'keep'}); anyChange=true; }
      });
      if(groupToken!==undefined && !existing.groupId){ setFields.groupId = groupToken; anyChange=true; }
      const arrayFields=[];
      if(tagList.length){ const {added}=arrayUnionDiff(existing.tags, tagList); if(added.length){ arrayFields.push({field:'tags', added}); anyChange=true; } }
      if(orgTokens.length){ const {added}=arrayUnionDiff(existing.affiliationOrgIds, orgTokens); if(added.length){ arrayFields.push({field:'affiliationOrgIds', added}); anyChange=true; } }
      const charUpdDeps = [];
      if(setFields.groupId && setFields.groupId.indexOf('__new__:')===0) charUpdDeps.push(setFields.groupId);
      arrayFields.forEach(af=>{ af.added.forEach(t=>{ if(t && t.indexOf('__new__:')===0) charUpdDeps.push(t); }); });
      changes.push({ id:'char:'+(anyChange?'upd':'same')+':'+existing.id, section:'characters', action: anyChange?'update':'unchanged',
        title:name, detail:null, targetId:existing.id, placeholderId:null, setFields, arrayFields, conflicts, refs:{ dependsOn: charUpdDeps } });
    }
  });

  // ---- 5) locations（親子関係は全件解決してから2パス目で反映） ----
  const existingLocByName = indexByName(data.locations);
  const locNameToToken = new Map();
  const locChanges = [];
  arr('locations').forEach(l=>{
    if(!l || !l.name){ errors.push('locationsの各要素には name が必要です（1件スキップ）。'); return; }
    const name = String(l.name).trim();
    const existing = existingLocByName.get(name);
    if(!existing){
      const token = '__new__:loc:'+name;
      locNameToToken.set(name, token);
      const setFields = { name };
      if(l.category && String(l.category).trim()) setFields.category = l.category;
      if(l.summary && String(l.summary).trim()) setFields.summary = l.summary;
      if(l.memo && String(l.memo).trim()) setFields.memo = l.memo;
      const ch = { id:'loc:new:'+name, section:'locations', action:'create', title:name, detail:null,
        targetId:null, placeholderId:token, setFields, arrayFields:[], conflicts:[], refs:{ parentName: l.parent ? String(l.parent).trim() : null } };
      changes.push(ch); locChanges.push(ch);
    } else {
      locNameToToken.set(name, existing.id);
      const setFields = {}; const conflicts = []; let anyChange=false;
      ['category','summary','memo'].forEach(f=>{
        if(l[f]===undefined) return;
        const d = textFieldDiff(existing[f], l[f]);
        if(!d) return;
        if(d.kind==='fill'){ setFields[f]=d.value; anyChange=true; }
        else if(d.kind==='conflict'){ conflicts.push({field:f, existing:d.existing, incoming:d.incoming, resolution:'keep'}); anyChange=true; }
      });
      const ch = { id:'loc:upd:'+existing.id, section:'locations', action: anyChange?'update':'unchanged', title:name, detail:null,
        targetId:existing.id, placeholderId:null, setFields, arrayFields:[], conflicts, refs:{ parentName: (l.parent!==undefined) ? (l.parent?String(l.parent).trim():'') : undefined } };
      changes.push(ch); locChanges.push(ch);
    }
  });
  locChanges.forEach(ch=>{
    const parentName = ch.refs.parentName;
    if(!parentName) return;
    let parentToken = locNameToToken.get(parentName);
    if(!parentToken){
      const exLoc = existingLocByName.get(parentName);
      if(exLoc) parentToken = exLoc.id;
    }
    if(!parentToken){
      errors.push(`場所「${ch.title}」の親「${parentName}」が見つかりませんでした（親の設定は反映されません）。`);
      return;
    }
    if(parentToken===ch.placeholderId || (ch.targetId && parentToken===ch.targetId)){
      errors.push(`場所「${ch.title}」は自分自身を親にできないため、親の設定は反映されません。`);
      return;
    }
    ch.setFields.parentLocationId = parentToken;
    if(parentToken.indexOf('__new__:')===0) ch.refs.dependsOn = [ ...(ch.refs.dependsOn||[]), parentToken ];
    if(ch.action==='unchanged') ch.action = 'update';
  });

  // ---- 6) worldSettings（大分類 → カテゴリ → カード） ----
  const existingWsGroupByName = indexByName(data.worldSettingGroups);
  const wsGroupTokenByName = new Map();
  const wsCatTokenByKey = new Map();
  arr('worldSettings').forEach(w=>{
    if(!w || !w.title || !String(w.title).trim()){ errors.push('worldSettingsの各要素には title が必要です（1件スキップ）。'); return; }
    const groupName = w.group ? String(w.group).trim() : '';
    const catName = w.category ? String(w.category).trim() : 'その他';

    let groupToken = null;
    if(groupName){
      if(wsGroupTokenByName.has(groupName)) groupToken = wsGroupTokenByName.get(groupName);
      else {
        const exG = existingWsGroupByName.get(groupName);
        if(exG) groupToken = exG.id;
        else {
          groupToken = '__new__:wsg:'+groupName;
          changes.push({ id:'wsg:'+groupName, section:'worldSettings', action:'create', title:'大分類「'+groupName+'」', detail:null,
            targetId:null, placeholderId:groupToken, setFields:{name:groupName}, arrayFields:[], conflicts:[], refs:{kind:'group'} });
        }
        wsGroupTokenByName.set(groupName, groupToken);
      }
    }

    const catKey = (groupToken||'__none__')+'::'+catName;
    let catToken;
    if(wsCatTokenByKey.has(catKey)) catToken = wsCatTokenByKey.get(catKey);
    else {
      let existingCat = null;
      if(groupToken && !groupToken.startsWith('__new__:')){
        existingCat = data.worldSettings.find(cat => cat.name===catName && (cat.groupId||null)===groupToken);
      } else if(!groupToken){
        existingCat = data.worldSettings.find(cat => cat.name===catName && (!cat.groupId || !data.worldSettingGroups.find(g=>g.id===cat.groupId)));
      }
      if(existingCat) catToken = existingCat.id;
      else {
        catToken = '__new__:wsc:'+catKey;
        const catDeps = (groupToken && groupToken.indexOf('__new__:')===0) ? [groupToken] : [];
        changes.push({ id:'wsc:'+catKey, section:'worldSettings', action:'create',
          title:'カテゴリ「'+catName+'」'+(groupName?`（${groupName}）`:''), detail:null,
          targetId:null, placeholderId:catToken, setFields:{name:catName, groupIdRef:groupToken}, arrayFields:[], conflicts:[], refs:{kind:'category', dependsOn:catDeps} });
      }
      wsCatTokenByKey.set(catKey, catToken);
    }

    const title = String(w.title).trim();
    let existingCard = null;
    if(!catToken.startsWith('__new__:')){
      const cat = data.worldSettings.find(c=>c.id===catToken);
      existingCard = cat ? (cat.cards||[]).find(cd=>cd.title===title) : null;
    }
    const cardLabel = title+'（'+catName+'）';
    if(!existingCard){
      const cardDeps = catToken.indexOf('__new__:')===0 ? [catToken] : [];
      changes.push({ id:'wsd:new:'+catKey+':'+title, section:'worldSettings', action:'create', title:cardLabel, detail:null,
        targetId:null, placeholderId:null, setFields:{ title, content:w.content||'' }, arrayFields:[], conflicts:[], refs:{kind:'card', catToken, dependsOn:cardDeps} });
    } else {
      const d = textFieldDiff(existingCard.content, w.content);
      if(!d || d.kind==='same'){
        changes.push({ id:'wsd:same:'+existingCard.id, section:'worldSettings', action:'unchanged', title:cardLabel, detail:null,
          targetId:existingCard.id, placeholderId:null, setFields:{}, arrayFields:[], conflicts:[], refs:{kind:'card', catToken, cardId:existingCard.id} });
      } else if(d.kind==='fill'){
        changes.push({ id:'wsd:upd:'+existingCard.id, section:'worldSettings', action:'update', title:cardLabel, detail:null,
          targetId:existingCard.id, placeholderId:null, setFields:{content:d.value}, arrayFields:[], conflicts:[], refs:{kind:'card', catToken, cardId:existingCard.id} });
      } else {
        changes.push({ id:'wsd:conf:'+existingCard.id, section:'worldSettings', action:'update', title:cardLabel, detail:null,
          targetId:existingCard.id, placeholderId:null, setFields:{}, arrayFields:[],
          conflicts:[{field:'content', existing:d.existing, incoming:d.incoming, resolution:'keep'}], refs:{kind:'card', catToken, cardId:existingCard.id} });
      }
    }
  });

  // ---- 7) timeline（dateLabel + titleの組で同一判定） ----
  arr('timeline').forEach((t,idx)=>{
    if(!t || !t.title || !String(t.title).trim()){ errors.push('timelineの各要素には title が必要です（1件スキップ）。'); return; }
    const title = String(t.title).trim();
    const dateLabel = t.dateLabel!==undefined ? String(t.dateLabel).trim() : '';
    const existing = data.timeline.find(e=> (e.title||'').trim()===title && (e.dateLabel||'').trim()===dateLabel);
    const displayTitle = title+(dateLabel?`（${dateLabel}）`:'');
    const tagList = Array.isArray(t.tags) ? t.tags.map(x=>String(x).trim()).filter(Boolean) : [];
    if(!existing){
      const setFields = { title, dateLabel };
      if(t.summary && String(t.summary).trim()) setFields.summary = t.summary;
      if(t.detail && String(t.detail).trim()) setFields.detail = t.detail;
      const arrayFields = [];
      if(tagList.length) arrayFields.push({field:'tags', added:tagList});
      changes.push({ id:'tl:new:'+idx+':'+title, section:'timeline', action:'create', title:displayTitle, detail:null,
        targetId:null, placeholderId:null, setFields, arrayFields, conflicts:[], refs:{} });
    } else {
      const setFields = {}; const conflicts = []; let anyChange=false;
      ['summary','detail'].forEach(f=>{
        if(t[f]===undefined) return;
        const d = textFieldDiff(existing[f], t[f]);
        if(!d) return;
        if(d.kind==='fill'){ setFields[f]=d.value; anyChange=true; }
        else if(d.kind==='conflict'){ conflicts.push({field:f, existing:d.existing, incoming:d.incoming, resolution:'keep'}); anyChange=true; }
      });
      const arrayFields = [];
      if(tagList.length){ const {added}=arrayUnionDiff(existing.tags, tagList); if(added.length){ arrayFields.push({field:'tags', added}); anyChange=true; } }
      changes.push({ id:'tl:'+(anyChange?'upd':'same')+':'+existing.id, section:'timeline', action: anyChange?'update':'unchanged',
        title:displayTitle, detail:null, targetId:existing.id, placeholderId:null, setFields, arrayFields, conflicts, refs:{} });
    }
  });

  // ---- 8) ideas（contentの完全一致で重複判定） ----
  arr('ideas').forEach((idea,idx)=>{
    if(!idea || !idea.content || !String(idea.content).trim()){ errors.push('ideasの各要素には content が必要です（1件スキップ）。'); return; }
    const content = String(idea.content).trim();
    const dup = data.ideas.find(i=> (i.content||'').trim()===content);
    const shortLabel = content.length>26 ? content.slice(0,26)+'…' : content;
    if(dup){
      changes.push({ id:'idea:same:'+dup.id, section:'ideas', action:'unchanged', title:shortLabel, detail:null,
        targetId:dup.id, placeholderId:null, setFields:{}, arrayFields:[], conflicts:[], refs:{} });
    } else {
      const tagList = Array.isArray(idea.tags) ? idea.tags.map(x=>String(x).trim()).filter(Boolean) : [];
      const arrayFields = [];
      if(tagList.length) arrayFields.push({field:'tags', added:tagList});
      changes.push({ id:'idea:new:'+idx, section:'ideas', action:'create', title:shortLabel, detail:null,
        targetId:null, placeholderId:null, setFields:{ content, type:idea.type||'アイデア', status:idea.status||'未使用' }, arrayFields, conflicts:[], refs:{} });
    }
  });

  return { errors, changes };
}

// 一括取り込みの依存関係チェック（未解決参照の検出）。
// changes配列（enabledフラグ付き）を受け取り、"new:..."参照が解決できない変更項目のidをSetで返す。
// 参照先が新規作成対象でも、それがOFF/エラー/存在しない場合は未解決として連鎖的に検出する（固定点まで反復）。
function computeDependencyBlocked(changes){
  const byPlaceholder = new Map();
  changes.forEach(c=>{ if(c.placeholderId) byPlaceholder.set(c.placeholderId, c); });
  const blocked = new Map(); // id -> [missing title, ...]
  let changedFlag = true;
  while(changedFlag){
    changedFlag = false;
    changes.forEach(c=>{
      if(blocked.has(c.id)) return;
      const deps = (c.refs && c.refs.dependsOn) || [];
      const missing = [];
      deps.forEach(token=>{
        if(!token || token.indexOf('__new__:')!==0) return;
        const depChange = byPlaceholder.get(token);
        const depOk = depChange && depChange.enabled!==false && depChange.action==='create' && !blocked.has(depChange.id);
        if(!depOk) missing.push(depChange ? depChange.title : token);
      });
      if(missing.length){ blocked.set(c.id, missing); changedFlag = true; }
    });
  }
  return blocked;
}

// プランを実際にdataへ適用する。画像関連フィールド（image/iconImageId/images）は一切書き換えない。
function applyImportPlan(plan, data){
  let next = { ...data };
  const idMap = {}; // "__new__:種別:名前" → 実際に発行したuid
  const resolve = (token) => {
    if(token===undefined || token===null) return token;
    if(typeof token==='string' && token.indexOf('__new__:')===0) return idMap[token]!==undefined ? idMap[token] : null;
    return token;
  };
  // UI側の検証に依存しない最終防御：未解決の依存関係を持つ項目は、チェックがONでも取り込まない。
  const dependencyBlocked = computeDependencyBlocked(plan.changes);
  const isOn = (c) => c.enabled!==false && c.action!=='unchanged' && c.action!=='error' && !dependencyBlocked.has(c.id);
  // setFields（name / parentLocationId / groupIdRefは個別に扱うため除外）＋ conflictsの選択結果をまとめたpatchを作る
  const buildPatch = (c) => {
    const patch = {};
    Object.keys(c.setFields||{}).forEach(k=>{
      if(k==='name' || k==='parentLocationId' || k==='groupIdRef') return;
      patch[k] = resolve(c.setFields[k]);
    });
    (c.conflicts||[]).forEach(cf=>{
      if(cf.resolution==='replace') patch[cf.field] = cf.incoming;
      else if(cf.resolution==='append') patch[cf.field] = cf.existing ? (cf.existing+'\n'+cf.incoming) : cf.incoming;
      // 'keep' の場合は何もしない（既存を維持）
    });
    return patch;
  };

  // 1) characterGroups
  let characterGroups = [...(next.characterGroups||[])];
  plan.changes.filter(c=>c.section==='characterGroups' && c.action==='create').forEach(c=>{
    if(!isOn(c)) return;
    const gid = uid('cg');
    idMap[c.placeholderId] = gid;
    characterGroups = [...characterGroups, { id:gid, name:c.setFields.name, sortOrder:characterGroups.length }];
  });
  next = { ...next, characterGroups };

  // 2) organizations（画像フィールドには触れない）
  let organizations = [...next.organizations];
  plan.changes.filter(c=>c.section==='organizations').forEach(c=>{
    if(!isOn(c)) return;
    if(c.action==='create'){
      const oid = uid('org');
      idMap[c.placeholderId] = oid;
      organizations = [...organizations, { id:oid, name:c.setFields.name, image:null, category:c.setFields.category||'',
        summary:c.setFields.summary||'', purpose:c.setFields.purpose||'', memberIds:[], locationIds:[], memo:c.setFields.memo||'', customFields:[] }];
    } else if(c.action==='update'){
      const patch = buildPatch(c);
      organizations = organizations.map(o=> o.id===c.targetId ? { ...o, ...patch } : o);
    }
  });
  next = { ...next, organizations };

  // 3) relations
  let entityRelations = [...(next.entityRelations||[])];
  plan.changes.filter(c=>c.section==='relations' && c.action==='create').forEach(c=>{
    if(!isOn(c)) return;
    const fromReal = resolve(c.setFields.fromId), toReal = resolve(c.setFields.toId);
    // 最終防御：fromId / toIdのどちらかが解決できない場合、relationを作成しない（nullを保存しない）。
    if(!fromReal || !toReal) return;
    entityRelations = [...entityRelations, { id:uid('rel'),
      fromId:fromReal, toId:toReal,
      label:c.setFields.label||'', reverseLabel:c.setFields.reverseLabel||'', note:c.setFields.note||'',
      fromType:'organization', toType:'organization' }];
  });
  next = { ...next, entityRelations };

  // 4) characters（画像フィールドには触れない）
  let characters = [...next.characters];
  plan.changes.filter(c=>c.section==='characters').forEach(c=>{
    if(!isOn(c)) return;
    if(c.action==='create'){
      const cid = uid('char');
      const base = { id:cid, name:c.setFields.name, realName:'', calledNames:[], kana:'', image:null, iconImageId:null,
        affiliationOrgIds:[], category:'', groupId:null, tags:[], age:'', summary:'', appearance:'', personality:'', values:'', goal:'', memo:'',
        customFields:[], images:[], relatedLocationIds:[], changes:[] };
      let obj = { ...base, ...buildPatch(c) };
      (c.arrayFields||[]).forEach(af=>{
        const added = af.added.map(resolve).filter(v=>v!==null && v!==undefined);
        obj = { ...obj, [af.field]: [ ...(obj[af.field]||[]), ...added ] };
      });
      characters = [...characters, obj];
    } else if(c.action==='update'){
      characters = characters.map(ch=>{
        if(ch.id!==c.targetId) return ch;
        let obj = { ...ch, ...buildPatch(c) };
        (c.arrayFields||[]).forEach(af=>{
          const added = af.added.map(resolve).filter(v=>v!==null && v!==undefined);
          const merged = [...(obj[af.field]||[])];
          added.forEach(v=>{ if(!merged.includes(v)) merged.push(v); });
          obj = { ...obj, [af.field]: merged };
        });
        return obj;
      });
    }
  });
  next = { ...next, characters };

  // 5) locations（1パス目で本体を作成・更新、2パス目で親子関係だけ反映）
  let locations = [...next.locations];
  const locRealIdByChangeId = {};
  plan.changes.filter(c=>c.section==='locations').forEach(c=>{
    if(!isOn(c)) return;
    if(c.action==='create'){
      const lid = uid('loc');
      if(c.placeholderId) idMap[c.placeholderId] = lid;
      locRealIdByChangeId[c.id] = lid;
      const sf = c.setFields;
      locations = [...locations, { id:lid, name:sf.name, image:null, category:sf.category||'', summary:sf.summary||'',
        controllingOrgId:null, relatedPersonIds:[], relatedOrgIds:[], memo:sf.memo||'', customFields:[],
        parentLocationId:null, mapId:null, mapX:null, mapY:null }];
    } else if(c.action==='update'){
      locRealIdByChangeId[c.id] = c.targetId;
      const patch = buildPatch(c);
      locations = locations.map(l=> l.id===c.targetId ? { ...l, ...patch } : l);
    }
  });
  plan.changes.filter(c=>c.section==='locations' && isOn(c) && c.setFields && c.setFields.parentLocationId!==undefined).forEach(c=>{
    const selfId = locRealIdByChangeId[c.id];
    if(!selfId) return;
    const parentReal = resolve(c.setFields.parentLocationId);
    if(!parentReal || parentReal===selfId) return;
    let cursor = parentReal, hops = 0, cyclic = false;
    while(cursor && hops<50){
      if(cursor===selfId){ cyclic=true; break; }
      const node = locations.find(l=>l.id===cursor);
      cursor = node ? node.parentLocationId : null;
      hops++;
    }
    if(cyclic) return;
    locations = locations.map(l=> l.id===selfId ? { ...l, parentLocationId:parentReal } : l);
  });
  next = { ...next, locations };

  // 6) worldSettings（大分類 → カテゴリ → カードの順で作成）
  let worldSettingGroups = [...next.worldSettingGroups];
  plan.changes.filter(c=>c.section==='worldSettings' && c.refs.kind==='group').forEach(c=>{
    if(!isOn(c)) return;
    const gid = uid('wsg');
    idMap[c.placeholderId] = gid;
    worldSettingGroups = [...worldSettingGroups, { id:gid, name:c.setFields.name, sortOrder:worldSettingGroups.length }];
  });
  next = { ...next, worldSettingGroups };

  let worldSettings = [...next.worldSettings];
  plan.changes.filter(c=>c.section==='worldSettings' && c.refs.kind==='category').forEach(c=>{
    if(!isOn(c)) return;
    const cid = uid('wsc');
    idMap[c.placeholderId] = cid;
    worldSettings = [...worldSettings, { id:cid, name:c.setFields.name, groupId:resolve(c.setFields.groupIdRef)||null, cards:[] }];
  });
  plan.changes.filter(c=>c.section==='worldSettings' && c.refs.kind==='card').forEach(c=>{
    if(!isOn(c)) return;
    const catId = resolve(c.refs.catToken);
    if(!catId) return;
    if(c.action==='create'){
      worldSettings = worldSettings.map(cat=> cat.id===catId ? { ...cat, cards:[...cat.cards, { id:uid('wsd'), title:c.setFields.title, content:c.setFields.content||'' }] } : cat);
    } else if(c.action==='update'){
      const patch = buildPatch(c);
      worldSettings = worldSettings.map(cat=> cat.id!==catId ? cat : { ...cat, cards: cat.cards.map(cd=> cd.id===c.refs.cardId ? { ...cd, ...patch } : cd) });
    }
  });
  next = { ...next, worldSettings };

  // 7) timeline
  let timeline = [...next.timeline];
  plan.changes.filter(c=>c.section==='timeline').forEach(c=>{
    if(!isOn(c)) return;
    if(c.action==='create'){
      const ev = { id:uid('tl'), dateLabel:c.setFields.dateLabel||'', title:c.setFields.title||'', summary:c.setFields.summary||'',
        detail:c.setFields.detail||'', personIds:[], orgIds:[], locationIds:[], tags:[], sortOrder:timeline.length };
      (c.arrayFields||[]).forEach(af=>{ ev[af.field] = [ ...(ev[af.field]||[]), ...af.added ]; });
      timeline = [...timeline, ev];
    } else if(c.action==='update'){
      const patch = buildPatch(c);
      timeline = timeline.map(ev=>{
        if(ev.id!==c.targetId) return ev;
        let obj = { ...ev, ...patch };
        (c.arrayFields||[]).forEach(af=>{
          const merged = [...(obj[af.field]||[])];
          af.added.forEach(v=>{ if(!merged.includes(v)) merged.push(v); });
          obj = { ...obj, [af.field]: merged };
        });
        return obj;
      });
    }
  });
  next = { ...next, timeline };

  // 8) ideas
  let ideas = [...next.ideas];
  plan.changes.filter(c=>c.section==='ideas' && c.action==='create').forEach(c=>{
    if(!isOn(c)) return;
    const idea = { id:uid('idea'), content:c.setFields.content, type:c.setFields.type||'アイデア', tags:[],
      personIds:[], orgIds:[], locationIds:[], status:c.setFields.status||'未使用', usedIn:'', createdAt:Date.now() };
    (c.arrayFields||[]).forEach(af=>{ idea[af.field] = [ ...(idea[af.field]||[]), ...af.added ]; });
    ideas = [...ideas, idea];
  });
  next = { ...next, ideas };

  return next;
}

