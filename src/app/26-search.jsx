/* ============ 検索 ============
   作品内検索。検索結果の表示と移動だけを担当し、作品データは書き換えない。
   ・文章（data.drafts・ゴミ箱は除く）／新プロット（data.plotV2）／本文（data.writings の章と場面）を含む。
   ・移動は openResult(req) に依頼する（App側が検索状態を解除して対象画面を開く）。 */

// 一致箇所の前後を短く切り出す。見つからなければ null。
function searchContext(text, q, radius){
  const t = String(text==null?'':text);
  if(!q || !t) return null;
  const i = t.indexOf(q);
  if(i < 0) return null;
  const r = radius || 24;
  const from = Math.max(0, i - r), to = Math.min(t.length, i + q.length + r);
  const flat = (x) => x.replace(/\s+/g, ' ');
  return {
    pre: (from > 0 ? '…' : '') + flat(t.slice(from, i)),
    hit: flat(t.slice(i, i + q.length)),
    post: flat(t.slice(i + q.length, to)) + (to < t.length ? '…' : ''),
  };
}
// fields: [{label, text}]。最初に一致した欄の前後を返す。どれも一致しなければ最初の非空欄の先頭を返す（一致が見出しだけの時）。
function searchSnippet(fields, q){
  const list = (fields||[]).filter(f => f && typeof f.text === 'string' && f.text);
  for(const f of list){
    const c = searchContext(f.text, q);
    if(c) return { label: f.label || '', ...c };
  }
  if(list.length){
    const f = list[0];
    const flat = f.text.replace(/\s+/g, ' ');
    return { label: f.label || '', pre: flat.slice(0, 60) + (flat.length > 60 ? '…' : ''), hit:'', post:'' };
  }
  return null;
}
function searchStr(v){ return typeof v === 'string' ? v : (v==null ? '' : String(v)); }

function SearchResults({ data, query, navigateTo, openResult }){
  const q = query.trim();
  if(!q) return <div className="empty-hint">作品内のキャラクター・組織・場所・世界設定・年表・ネタ・文章・プロット・本文を横断検索できます。</div>;

  const hit = (text) => typeof text === 'string' && text.includes(q);
  const arr = (x) => Array.isArray(x) ? x : [];
  const groups = [];
  const F = (label, text) => ({ label, text: searchStr(text) });

  const chars = arr(data.characters).filter(c => hit(c.name)||hit(c.summary)||hit(c.personality)||hit(c.memo));
  if(chars.length) groups.push({ label:'キャラクター', items: chars.map(c=>({id:c.id,name:c.name||'（無名）',snippet:searchSnippet([F('',c.summary),F('',c.personality),F('メモ',c.memo)],q),go:()=>navigateTo('characters', c.id)})) });

  const orgs = arr(data.organizations).filter(o => hit(o.name)||hit(o.summary)||hit(o.purpose)||hit(o.memo));
  if(orgs.length) groups.push({ label:'組織 / 勢力 / 家系', items: orgs.map(o=>({id:o.id,name:o.name||'（無名）',snippet:searchSnippet([F('',o.summary),F('',o.purpose),F('メモ',o.memo)],q),go:()=>navigateTo('organizations', o.id)})) });

  const locs = arr(data.locations).filter(l => hit(l.name)||hit(l.summary)||hit(l.memo));
  if(locs.length) groups.push({ label:'場所 / 建物', items: locs.map(l=>({id:l.id,name:l.name||'（無名）',snippet:searchSnippet([F('',l.summary),F('メモ',l.memo)],q),go:()=>navigateTo('locations', l.id)})) });

  const wsHits = [];
  arr(data.worldSettings).forEach(cat => arr(cat && cat.cards).forEach(card => {
    if(hit(card.title)||hit(card.content)) wsHits.push({id:card.id, name:`${cat.name||''} ／ ${card.title||'（無題）'}`, snippet:searchSnippet([F('',card.content)],q), go:()=>navigateTo('worldsettings')});
  }));
  if(wsHits.length) groups.push({ label:'世界設定', items: wsHits });

  const tl = arr(data.timeline).filter(t => hit(t.title)||hit(t.summary)||hit(t.detail));
  if(tl.length) groups.push({ label:'年表', items: tl.map(t=>({id:t.id,name:t.title||'（無題）',snippet:searchSnippet([F('',t.summary),F('',t.detail)],q),go:()=>navigateTo('timeline')})) });

  const ideas = arr(data.ideas).filter(i => hit(i.content));
  if(ideas.length) groups.push({ label:'ネタ箱', items: ideas.map(i=>({id:i.id,name:i.type||'ネタ',snippet:searchSnippet([F('',i.content)],q),go:()=>navigateTo('ideas')})) });

  // ---- 文章（「書く」）：削除されていない文章をID単位で一件ずつ。ゴミ箱・履歴は対象外。出来事からの参照数には影響されない。 ----
  const folders = arr(data.textFolders);
  const folderPathLabel = (fid) => {
    if(!fid) return 'フォルダ外';
    const names = []; const seen = new Set(); let cur = fid;
    while(cur && !seen.has(cur)){ seen.add(cur); const f = folders.find(x => x && x.id === cur); if(!f) break; names.unshift(f.name || '無題のフォルダ'); cur = f.parentId; }
    return names.length ? names.join(' › ') : 'フォルダ外';
  };
  const seenDraft = new Set();
  const drafts = arr(data.drafts).filter(d => {
    if(!d || !d.id || d.deleted || seenDraft.has(d.id)) return false;
    seenDraft.add(d.id);
    return hit(d.title)||hit(d.body)||hit(d.memo);
  });
  if(drafts.length) groups.push({ label:'文章', items: drafts.map(d=>({
    id:d.id, name:d.title||'（無題）', place:folderPathLabel(d.folderId),
    snippet:searchSnippet([F('',d.body),F('メモ',d.memo)],q),
    go:()=>openResult({ kind:'draft', draftId:d.id }),
  })) });

  // ---- 新プロット：まとまり／出来事。関連文章の本文は文章側で検索するので、ここでは対象にしない。 ----
  const plotGroups = [], plotEvents = [];
  const plot = data.plotV2;
  const groupName = (n) => [n.label, n.title].map(searchStr).filter(x=>x.trim()).join(' ') || 'まとまり';
  const walkPlot = (list, trail, depth) => {
    if(depth > 200) return;
    arr(list).forEach(n => {
      if(!n || typeof n !== 'object') return;
      if(n.kind === 'group'){
        if(hit(n.label)||hit(n.title)||hit(n.summary)){
          plotGroups.push({ id:n.id, name:groupName(n), place:trail.join(' › ') || '最上位',
            snippet:searchSnippet([F('',n.summary)],q),
            go:()=>openResult({ kind:'plot', nodeId:n.id, openScene:false }) });
        }
        walkPlot(n.children, trail.concat([groupName(n)]), depth + 1);
      } else if(n.kind === 'event'){
        const sc = (n.scene && typeof n.scene === 'object') ? n.scene : {};
        const fields = [F('', n.summary), F('目的', sc.goal), F('対立・障害', sc.obstacle), F('変化', sc.change), F('自由メモ', sc.memo), F('旧本文', n.detail)];
        if(hit(n.title)||fields.some(f=>hit(f.text))){
          const inScene = ['goal','obstacle','change','memo'].some(k => hit(sc[k]));
          plotEvents.push({ id:n.id, name:searchStr(n.title).trim()||'未定', place:trail.join(' › ') || '最上位',
            snippet:searchSnippet(fields,q),
            go:()=>openResult({ kind:'plot', nodeId:n.id, openScene:inScene }) });
        }
      }
    });
  };
  if(plot && typeof plot === 'object') walkPlot(plot.items, [], 0);
  if(plotGroups.length) groups.push({ label:'プロット：まとまり', items: plotGroups });
  if(plotEvents.length) groups.push({ label:'プロット：出来事', items: plotEvents });

  // ---- 本文（「まとめる」）：章タイトル＋各章の場面（タイトル・本文・メモ）。
  //      場面（blocks）がある章は blocks だけを見る（章のbodyは場面本文の連結なので、使うと二重に出る）。
  //      blocks が無い古いデータだけ、章の旧body を一件の本文として検索する。 ----
  const chapterItems = [], sceneItems = [];
  arr(data.writings).forEach(w => {
    if(!w || !w.id) return;
    const chName = searchStr(w.title).trim() || '（無題の章）';
    if(hit(w.title)) chapterItems.push({ id:'ch:'+w.id, name:chName, place:'章', snippet:null, go:()=>openResult({ kind:'chapter', chapterId:w.id, blockId:null }) });
    const blocks = arr(w.blocks);
    if(blocks.length){
      blocks.forEach(b => {
        if(!b || typeof b !== 'object') return;
        if(hit(b.title)||hit(b.body)||hit(b.memo)){
          sceneItems.push({ id:'bl:'+w.id+':'+(b.id||''), name:searchStr(b.title).trim()||'（無題の場面）', place:'章：'+chName+' ／ 場面',
            snippet:searchSnippet([F('',b.body),F('メモ',b.memo)],q),
            go:()=>openResult({ kind:'chapter', chapterId:w.id, blockId:b.id||null }) });
        }
      });
    } else if(hit(w.body)){
      sceneItems.push({ id:'ob:'+w.id, name:chName, place:'章：'+chName+' ／ 旧本文',
        snippet:searchSnippet([F('',w.body)],q),
        go:()=>openResult({ kind:'chapter', chapterId:w.id, blockId:null }) });
    }
  });
  const writingItems = chapterItems.concat(sceneItems);
  if(writingItems.length) groups.push({ label:'本文', items: writingItems });

  return (
    <div>
      <h1>🔍「{q}」の検索結果</h1>
      {groups.length===0 && <div className="empty-hint">見つかりませんでした。</div>}
      {groups.map(g=>(
        <div className="search-group" key={g.label}>
          <h4>{g.label}（{g.items.length}）</h4>
          {g.items.map(it=>(
            <button type="button" className="search-hit" key={it.id} onClick={it.go}>
              <span className="sh-name">{it.name}</span>
              {it.place && <span className="sh-place">{it.place}</span>}
              {it.snippet && <span className="sh-snippet">{it.snippet.label && <span className="sh-label">{it.snippet.label}：</span>}{it.snippet.pre}{it.snippet.hit && <mark>{it.snippet.hit}</mark>}{it.snippet.post}</span>}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
