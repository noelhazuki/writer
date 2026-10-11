/* ============ 検索 ============ */
function SearchResults({ data, query, navigateTo }){
  const q = query.trim();
  if(!q) return <div className="empty-hint">作品内のキャラクター・組織・場所・世界設定・年表・ネタ・本文を横断検索できます。</div>;

  const hit = (text) => text && text.includes(q);
  const groups = [];

  const chars = data.characters.filter(c => hit(c.name)||hit(c.summary)||hit(c.personality)||hit(c.memo));
  if(chars.length) groups.push({ label:'キャラクター', items: chars.map(c=>({id:c.id,name:c.name||'（無名）',snippet:c.summary,go:()=>navigateTo('characters', c.id)})) });

  const orgs = data.organizations.filter(o => hit(o.name)||hit(o.summary)||hit(o.purpose)||hit(o.memo));
  if(orgs.length) groups.push({ label:'組織 / 勢力 / 家系', items: orgs.map(o=>({id:o.id,name:o.name||'（無名）',snippet:o.summary,go:()=>navigateTo('organizations', o.id)})) });

  const locs = data.locations.filter(l => hit(l.name)||hit(l.summary)||hit(l.memo));
  if(locs.length) groups.push({ label:'場所 / 建物', items: locs.map(l=>({id:l.id,name:l.name||'（無名）',snippet:l.summary,go:()=>navigateTo('locations', l.id)})) });

  const wsHits = [];
  data.worldSettings.forEach(cat => cat.cards.forEach(card => {
    if(hit(card.title)||hit(card.content)) wsHits.push({id:card.id, name:`${cat.name} ／ ${card.title||'（無題）'}`, snippet:card.content, go:()=>navigateTo('worldsettings')});
  }));
  if(wsHits.length) groups.push({ label:'世界設定', items: wsHits });

  const tl = data.timeline.filter(t => hit(t.title)||hit(t.summary)||hit(t.detail));
  if(tl.length) groups.push({ label:'年表', items: tl.map(t=>({id:t.id,name:t.title||'（無題）',snippet:t.summary,go:()=>navigateTo('timeline')})) });

  const ideas = data.ideas.filter(i => hit(i.content));
  if(ideas.length) groups.push({ label:'ネタ箱', items: ideas.map(i=>({id:i.id,name:i.type,snippet:i.content,go:()=>navigateTo('ideas')})) });

  const writings = data.writings.filter(w => hit(w.title)||hit(w.body));
  if(writings.length) groups.push({ label:'本文', items: writings.map(w=>({id:w.id,name:w.title,snippet:w.body.slice(0,60),go:()=>navigateTo('writing', w.id)})) });

  return (
    <div>
      <h1>🔍「{q}」の検索結果</h1>
      {groups.length===0 && <div className="empty-hint">見つかりませんでした。</div>}
      {groups.map(g=>(
        <div className="search-group" key={g.label}>
          <h4>{g.label}（{g.items.length}）</h4>
          {g.items.map(it=>(
            <div className="search-hit" key={it.id} onClick={it.go}>
              <div className="sh-name">{it.name}</div>
              {it.snippet && <div className="sh-snippet">{it.snippet.slice(0,60)}</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

