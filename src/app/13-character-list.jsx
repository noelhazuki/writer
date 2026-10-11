/* ============ 各エンティティ画面（キャラクター / 組織 / 場所 共通の考え方） ============ */

function EntityListView({ title, icon, items, onOpen, onCreate, onDelete, subLabel }){
  return (
    <div>
      <div className="toolbar">
        <h1>{icon} {title}</h1>
        <div className="filler" />
        <button className="btn btn-primary" onClick={onCreate}>＋ 新規追加</button>
      </div>
      {items.length===0 ? (
        <div className="empty-hint">まだ何も登録されていません。「＋ 新規追加」から、必要になったぶんだけ増やしていけます。</div>
      ) : (
        <div className="grid-cards">
          {items.map(it => (
            <button key={it.id} className="entity-card" onClick={()=>onOpen(it.id)} style={{textAlign:'left', cursor:'pointer'}}>
              <Thumb imageId={it.image} />
              <div className="ec-body">
                <div className="ec-name">{it.name || '（名称未設定）'}</div>
                {subLabel && <div className="ec-sub">{subLabel(it)}</div>}
                {it.summary && <div className="ec-summary">{it.summary}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// グループ（characterGroups / worldSettingGroups）の追加・名前変更・削除・並び替えを行う共通モーダル
function GroupsManagerModal({ title, groups, onAdd, onRename, onDelete, onMove, onClose, deleteHint }){
  const [newName, setNewName] = useState('');
  return (
    <Modal title={title} onClose={onClose}>
      {groups.length===0 && <div className="empty-hint">まだグループがありません。下から追加できます。</div>}
      {groups.map((g,i)=>(
        <div className="groups-manager-row" key={g.id}>
          <input type="text" value={g.name} onChange={e=>onRename(g.id, e.target.value)} />
          <div className="gm-actions">
            <button onClick={()=>onMove(g.id,-1)} disabled={i===0}>↑</button>
            <button onClick={()=>onMove(g.id,1)} disabled={i===groups.length-1}>↓</button>
            <button style={{color:'#8a3a3a'}} onClick={()=>onDelete(g.id)}>削除</button>
          </div>
        </div>
      ))}
      {deleteHint && <p style={{fontSize:12, color:'var(--ink-soft)', margin:'4px 0 10px'}}>{deleteHint}</p>}
      <div style={{display:'flex', gap:8, marginTop:6}}>
        <input type="text" placeholder="新しいグループ名" value={newName} onChange={e=>setNewName(e.target.value)}
          style={{flex:1, padding:'7px 9px', border:'1px solid var(--line)', borderRadius:6}} />
        <button className="btn btn-sm btn-primary" onClick={()=>{ if(newName.trim()){ onAdd(newName.trim()); setNewName(''); } }}>追加</button>
      </div>
      <div className="modal-actions"><button className="btn btn-primary" onClick={onClose}>閉じる</button></div>
    </Modal>
  );
}

/* ---- キャラクタータグ共通処理 ----
   全キャラクターの tags 配列を正本として、タグ名と使用人数を集計する。
   タグマスターは持たず、常に data.characters から都度導出することで、
   使われなくなったタグは自然に一覧から消える。 */
function collectCharacterTagUsage(characters){
  const counts = new Map();
  (characters||[]).forEach(c=>{
    (c.tags||[]).forEach(raw=>{
      const t = String(raw||'').trim();
      if(!t) return;
      counts.set(t, (counts.get(t)||0)+1);
    });
  });
  return Array.from(counts.entries())
    .map(([tag,count])=>({tag,count}))
    .sort((a,b)=> b.count-a.count || a.tag.localeCompare(b.tag,'ja'));
}

// 既存タグ一覧（折りたたみ）：キャラクター編集画面・一覧の絞り込みで共通利用。
// selected に含まれるタグは選択済みとして色分けし、押すたびに onToggle(tag) を呼ぶ。
function TagUsagePicker({ tagUsage, selected, onToggle, label }){
  const [open, setOpen] = useState(false);
  const selectedSet = new Set(selected||[]);
  if(!tagUsage || tagUsage.length===0) return null;
  return (
    <div className="tagpicker">
      <button type="button" className="tagpicker-toggle" onClick={()=>setOpen(o=>!o)}>
        <span className="chev" style={{display:'inline-block', transform: open?'rotate(90deg)':'none'}}>▶</span>
        {label}（{tagUsage.length}）
      </button>
      {open && (
        <div className="tagpicker-list">
          {tagUsage.map(({tag,count})=>(
            <button type="button" key={tag}
              className={"tagpicker-option"+(selectedSet.has(tag)?" selected":"")}
              onClick={()=>onToggle(tag)}>
              {selectedSet.has(tag) ? '✓ ' : ''}{tag}
              <span className="tagpicker-option-count">{count}人</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// キャラクター編集画面のタグ欄：チップ表示＋新規追加＋既存タグからの流用をまとめたもの。
// tags は当該キャラクターの ch.tags そのもの（正本）、allCharacters は使用数集計用。
function CharacterTagEditor({ tags, allCharacters, onChange }){
  const [draft, setDraft] = useState('');
  const list = tags || [];
  const tagUsage = collectCharacterTagUsage(allCharacters);

  const addTag = (raw) => {
    const v = String(raw||'').trim();
    if(!v){ setDraft(''); return; }
    if(!list.includes(v)) onChange([...list, v]);
    setDraft('');
  };
  const removeAt = (idx) => onChange(list.filter((_,i)=>i!==idx));
  const toggleExisting = (tag) => {
    if(list.includes(tag)) onChange(list.filter(t=>t!==tag));
    else onChange([...list, tag]);
  };
  const handleKeyDown = (e) => {
    if(e.key==='Enter' || e.key===','){
      e.preventDefault();
      addTag(draft.replace(/,$/,''));
    }
  };

  return (
    <div className="chip-editor">
      {list.length>0 && (
        <div className="chip-editor-chips">
          {list.map((t,i)=>(
            <span className="chip-editor-chip" key={t+'-'+i}>
              {t}
              <button type="button" onClick={()=>removeAt(i)} aria-label={`${t}を解除`}>×</button>
            </span>
          ))}
        </div>
      )}
      <div className="chip-editor-add-row">
        <input type="text" value={draft} placeholder="新しいタグを入力"
          onChange={e=>setDraft(e.target.value)}
          onKeyDown={handleKeyDown} />
        <button type="button" className="btn btn-sm" onClick={()=>addTag(draft)}>追加</button>
      </div>
      <TagUsagePicker tagUsage={tagUsage} selected={list} onToggle={toggleExisting} label="既存タグから選ぶ" />
    </div>
  );
}

/* ---- キャラクター（グループ・タグでの整理） ---- */
function CharacterListView({ data, setData, onOpen, onCreate, onOpenHeightCompare }){
  const [filterTags, setFilterTags] = useState([]);
  const [managingGroups, setManagingGroups] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  const groups = [...data.characterGroups].sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
  const tagUsage = collectCharacterTagUsage(data.characters);

  const visibleChars = filterTags.length===0 ? data.characters : data.characters.filter(c=>(c.tags||[]).some(t=>filterTags.includes(t)));
  const knownGroupIds = new Set(groups.map(g=>g.id));
  const toggleFilterTag = (tag) => setFilterTags(prev => prev.includes(tag) ? prev.filter(t=>t!==tag) : [...prev, tag]);

  const buckets = groups.map(g => ({ group:g, items: visibleChars.filter(c=>c.groupId===g.id) }));
  const unassigned = visibleChars.filter(c => !c.groupId || !knownGroupIds.has(c.groupId));
  buckets.push({ group:{ id:CHAR_UNASSIGNED, name:'未分類' }, items: unassigned });

  const addGroup = (name) => setData(d=>({...d, characterGroups:[...d.characterGroups, {id:uid('cg'), name, sortOrder:d.characterGroups.length}]}));
  const renameGroup = (id, name) => setData(d=>({...d, characterGroups:d.characterGroups.map(g=>g.id===id?{...g,name}:g)}));
  const deleteGroup = (id) => {
    if(!confirm('このグループを削除しますか？中のキャラクターは「未分類」になります。')) return;
    setData(d=>({...d, characterGroups:d.characterGroups.filter(g=>g.id!==id), characters:d.characters.map(c=>c.groupId===id?{...c,groupId:null}:c)}));
  };
  const moveGroup = (id, dir) => {
    const list = [...data.characterGroups].sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
    const idx = list.findIndex(g=>g.id===id); const j = idx+dir;
    if(j<0||j>=list.length) return;
    [list[idx],list[j]]=[list[j],list[idx]];
    setData(d=>({...d, characterGroups: list.map((g,i)=>({...g, sortOrder:i}))}));
  };
  const toggle = (gid) => setCollapsed(c=>({...c, [gid]: !c[gid]}));

  return (
    <div>
      <div className="toolbar">
        <h1>🧑 キャラクター</h1>
        <div className="filler" />
        <button className="btn btn-sm" onClick={onOpenHeightCompare}>身長比較</button>
        <button className="btn btn-sm" onClick={()=>setManagingGroups(true)}>グループを管理</button>
        <button className="btn btn-primary" onClick={onCreate}>＋ 新規追加</button>
      </div>

      {tagUsage.length>0 && (
        <div className="tag-filter-row">
          {filterTags.length>0 && (
            <div className="chip-editor-chips">
              {filterTags.map(t=>(
                <span className="chip-editor-chip selected-chip" key={t}>
                  {t}
                  <button type="button" onClick={()=>toggleFilterTag(t)} aria-label={`${t}の絞り込みを解除`}>×</button>
                </span>
              ))}
              <button type="button" className="btn btn-sm" onClick={()=>setFilterTags([])}>絞り込み解除</button>
            </div>
          )}
          <TagUsagePicker tagUsage={tagUsage} selected={filterTags} onToggle={toggleFilterTag} label="タグで絞り込む" />
        </div>
      )}

      {data.characters.length===0 ? (
        <div className="empty-hint">まだ何も登録されていません。「＋ 新規追加」から、必要になったぶんだけ増やしていけます。</div>
      ) : (
        buckets.map(b => b.items.length===0 ? null : (
          <div className="group-block" key={b.group.id}>
            <div className="group-head" onClick={()=>toggle(b.group.id)}>
              <span className="chev" style={{transform: collapsed[b.group.id]?'none':'rotate(90deg)'}}>▶</span>
              <h3 style={{margin:0}}>{b.group.name}</h3>
              <span className="idea-tag-pill">{b.items.length}</span>
            </div>
            {!collapsed[b.group.id] && (
              <div className="roster-grid">
                {b.items.map(it=>(
                  <button key={it.id} className="roster-card" onClick={()=>onOpen(it.id)}>
                    <IconThumb imageId={it.iconImageId || it.image} size={80} />
                    <div className="roster-body">
                      <div className="roster-name">{it.name || '（名称未設定）'}</div>
                      {it.category && <div className="roster-sub">{it.category}</div>}
                      {(it.tags||[]).length>0 && (
                        <div style={{marginTop:4}}>
                          {it.tags.map(t=><span key={t} className="idea-tag-pill" style={{marginRight:4, marginBottom:4, display:'inline-block'}}>{t}</span>)}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))
      )}

      {managingGroups && (
        <GroupsManagerModal title="キャラクターグループを管理" groups={groups}
          onAdd={addGroup} onRename={renameGroup} onDelete={deleteGroup} onMove={moveGroup}
          onClose={()=>setManagingGroups(false)}
          deleteHint="グループを削除しても、中のキャラクター自体は削除されません（未分類になります）。" />
      )}
    </div>
  );
}

/* ---- 人物身長比較表 ----
   身長データの正本は characters[].heightCm のみ。比較表専用のマスターや複製は持たず、
   選択状態・並び順・基準人物は画面内の一時的なUI状態としてこのコンポーネント内に閉じる。 */

