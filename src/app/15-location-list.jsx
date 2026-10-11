/* ---- 場所 / 建物（親子関係のツリー表示） ---- */
function buildLocationChildrenMap(locations){
  const byParent = {};
  locations.forEach(l => {
    const validParent = l.parentLocationId && locations.find(x=>x.id===l.parentLocationId) ? l.parentLocationId : null;
    (byParent[validParent] = byParent[validParent] || []).push(l);
  });
  return byParent;
}

function LocationTreeNode({ loc, byParent, depth, onOpen, collapsed, toggleCollapse }){
  const children = byParent[loc.id] || [];
  const hasChildren = children.length>0;
  const isCollapsed = collapsed[loc.id];
  return (
    <div>
      <div className="loc-tree-row" style={{paddingLeft: depth*18 + 4}}>
        {hasChildren ? (
          <button className="twisty" onClick={()=>toggleCollapse(loc.id)}>{isCollapsed ? '▶' : '▼'}</button>
        ) : <span style={{width:16, display:'inline-block', flexShrink:0}} />}
        <button className="loc-open" onClick={()=>onOpen(loc.id)}>
          <span style={{fontWeight:700}}>{loc.name || '（無名）'}</span>
          {loc.category && <span style={{fontSize:12, color:'var(--ink-soft)', marginLeft:6}}>（{loc.category}）</span>}
          {loc.summary && <div className="ec-summary" style={{margin:'2px 0 0'}}>{loc.summary}</div>}
        </button>
      </div>
      {hasChildren && !isCollapsed && children.map(c=>(
        <LocationTreeNode key={c.id} loc={c} byParent={byParent} depth={depth+1} onOpen={onOpen} collapsed={collapsed} toggleCollapse={toggleCollapse} />
      ))}
    </div>
  );
}

function LocationListView({ data, onOpen, onCreate }){
  const [collapsed, setCollapsed] = useState({});
  const toggleCollapse = (id) => setCollapsed(c=>({...c, [id]:!c[id]}));
  const byParent = buildLocationChildrenMap(data.locations);
  const roots = byParent[null] || [];
  return (
    <div>
      <div className="toolbar">
        <h1>📍 場所 / 建物</h1>
        <div className="filler" />
        <button className="btn btn-primary" onClick={onCreate}>＋ 新規追加</button>
      </div>
      {data.locations.length===0 ? (
        <div className="empty-hint">まだ何も登録されていません。「＋ 新規追加」から、必要になったぶんだけ増やしていけます。</div>
      ) : (
        <div className="card" style={{marginTop:10}}>
          {roots.map(r => (
            <LocationTreeNode key={r.id} loc={r} byParent={byParent} depth={0} onOpen={onOpen} collapsed={collapsed} toggleCollapse={toggleCollapse} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- キャラクター設定UI改修：選択式で人物像を作るための定義データ ----
   表現パレット等とは無関係の、キャラクター詳細画面専用の定義。 */

