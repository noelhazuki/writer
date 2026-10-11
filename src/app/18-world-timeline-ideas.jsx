/* ============ 世界設定 ============ */
// 世界設定：大分類 → 設定カテゴリ → カード の3階層。トップは大分類カードのみを表示し、
// 開くとその中のカテゴリ一覧（従来の折りたたみカード表示）が出る。
function WorldSettings({ data, setData }){
  const [openGroupId, setOpenGroupId] = useState(null); // null=トップ画面
  const [showEmpty, setShowEmpty] = useState(false);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [managingGroups, setManagingGroups] = useState(false);

  const patchCategory = (catId, patch) => {
    setData(d => ({...d, worldSettings: d.worldSettings.map(c=>c.id===catId?{...c,...patch}:c)}));
  };
  const addCard = (catId) => {
    setData(d => ({...d, worldSettings: d.worldSettings.map(c=>{
      if(c.id!==catId) return c;
      return {...c, cards:[...c.cards, {id: uid('wsd'), title:'', content:''}]};
    })}));
  };
  const updateCard = (catId, cardId, patch) => {
    setData(d => ({...d, worldSettings: d.worldSettings.map(c=>{
      if(c.id!==catId) return c;
      return {...c, cards: c.cards.map(card=>card.id===cardId?{...card,...patch}:card)};
    })}));
  };
  const removeCard = (catId, cardId) => {
    setData(d => ({...d, worldSettings: d.worldSettings.map(c=>{
      if(c.id!==catId) return c;
      return {...c, cards: c.cards.filter(card=>card.id!==cardId)};
    })}));
  };
  const removeCategory = (catId) => {
    if(!confirm('このカテゴリを削除しますか？中のカードも削除されます。')) return;
    setData(d => ({...d, worldSettings: d.worldSettings.filter(c=>c.id!==catId)}));
  };
  const addCategory = () => {
    if(!newCatName.trim()) return;
    const gid = openGroupId===WS_UNASSIGNED ? null : openGroupId;
    setData(d => ({...d, worldSettings: [...d.worldSettings, {id: uid('wsc'), name:newCatName.trim(), groupId: gid, cards:[]}]}));
    setNewCatName(''); setAddingCat(false);
  };

  const addGroup = (name) => setData(d=>({...d, worldSettingGroups:[...d.worldSettingGroups, {id:uid('wsg'), name, sortOrder:d.worldSettingGroups.length}]}));
  const renameGroup = (id, name) => setData(d=>({...d, worldSettingGroups:d.worldSettingGroups.map(g=>g.id===id?{...g,name}:g)}));
  const deleteGroup = (id) => {
    if(!confirm('この大分類を削除しますか？中のカテゴリは「その他」になります。')) return;
    setData(d=>({...d, worldSettingGroups:d.worldSettingGroups.filter(g=>g.id!==id), worldSettings:d.worldSettings.map(c=>c.groupId===id?{...c,groupId:null}:c)}));
    if(openGroupId===id) setOpenGroupId(null);
  };
  const moveGroup = (id, dir) => {
    const list = [...data.worldSettingGroups].sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
    const idx = list.findIndex(g=>g.id===id); const j = idx+dir;
    if(j<0||j>=list.length) return;
    [list[idx],list[j]]=[list[j],list[idx]];
    setData(d=>({...d, worldSettingGroups: list.map((g,i)=>({...g, sortOrder:i}))}));
  };

  const groups = [...data.worldSettingGroups].sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
  const knownGroupIds = new Set(groups.map(g=>g.id));

  // ---- トップ画面：大分類カードのみ ----
  if(openGroupId===null){
    const groupStats = groups.map(g => {
      const cats = data.worldSettings.filter(c=>c.groupId===g.id);
      return { group:g, catCount:cats.length, cardCount: cats.reduce((s,c)=>s+c.cards.length,0) };
    });
    const unassignedCats = data.worldSettings.filter(c=> !c.groupId || !knownGroupIds.has(c.groupId));
    groupStats.push({ group:{id:WS_UNASSIGNED, name:'その他'}, catCount:unassignedCats.length, cardCount:unassignedCats.reduce((s,c)=>s+c.cards.length,0) });

    return (
      <div>
        <h1>🌍 世界設定</h1>
        <p style={{color:'var(--ink-soft)', fontSize:13, marginTop:-6}}>全項目を埋める必要はありません。書いたぶんだけ表示されます。まずは大分類を選んでください。</p>
        <div className="dash-nav-grid">
          {groupStats.map(gs=>(
            <button key={gs.group.id} className="dash-nav-item ws-group-card" onClick={()=>setOpenGroupId(gs.group.id)}>
              <div className="icon">🗂</div>
              <div className="label">{gs.group.name}</div>
              <span className="count">{gs.catCount}カテゴリ ／ 設定{gs.cardCount}件</span>
            </button>
          ))}
        </div>
        <div style={{marginTop:16}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>setManagingGroups(true)}>大分類を管理</button>
        </div>
        {managingGroups && (
          <GroupsManagerModal title="世界設定の大分類を管理" groups={groups}
            onAdd={addGroup} onRename={renameGroup} onDelete={deleteGroup} onMove={moveGroup}
            onClose={()=>setManagingGroups(false)}
            deleteHint="大分類を削除しても、中の設定カテゴリ自体は削除されません（「その他」になります）。" />
        )}
      </div>
    );
  }

  // ---- 大分類の中身：設定カテゴリ一覧（従来の折りたたみカード） ----
  const currentGroupName = openGroupId===WS_UNASSIGNED ? 'その他' : ((groups.find(g=>g.id===openGroupId)||{}).name || 'その他');
  const catsInGroup = data.worldSettings.filter(c => openGroupId===WS_UNASSIGNED ? (!c.groupId || !knownGroupIds.has(c.groupId)) : c.groupId===openGroupId);
  const filled = catsInGroup.filter(c=>c.cards.length>0);
  const empty = catsInGroup.filter(c=>c.cards.length===0);

  return (
    <div>
      <div className="breadcrumb"><button onClick={()=>setOpenGroupId(null)}>← 世界設定（大分類）</button></div>
      <h1>🗂 {currentGroupName}</h1>
      <p style={{color:'var(--ink-soft)', fontSize:13, marginTop:-6}}>全項目を埋める必要はありません。書いたぶんだけ表示されます。</p>

      {filled.length===0 && !showEmpty && (
        <div className="empty-hint">この大分類にはまだ世界設定がありません。下の「空のカテゴリを表示」から書きたい項目を選ぶか、新規カテゴリを追加してください。</div>
      )}

      {filled.map(cat => <WsCategoryBlock key={cat.id} cat={cat} groups={groups} onAddCard={()=>addCard(cat.id)} onUpdateCard={(cid,p)=>updateCard(cat.id,cid,p)} onRemoveCard={(cid)=>removeCard(cat.id,cid)} onRemoveCategory={()=>removeCategory(cat.id)} onRename={(name)=>patchCategory(cat.id,{name})} onChangeGroup={(gid)=>patchCategory(cat.id,{groupId:gid})} />)}

      <button className="hidden-cats-toggle" onClick={()=>setShowEmpty(s=>!s)}>
        {showEmpty ? '▲ 未使用カテゴリを隠す' : `▼ 未使用カテゴリを表示（${empty.length}）`}
      </button>

      {showEmpty && empty.map(cat => <WsCategoryBlock key={cat.id} cat={cat} groups={groups} onAddCard={()=>addCard(cat.id)} onUpdateCard={(cid,p)=>updateCard(cat.id,cid,p)} onRemoveCard={(cid)=>removeCard(cat.id,cid)} onRemoveCategory={()=>removeCategory(cat.id)} onRename={(name)=>patchCategory(cat.id,{name})} onChangeGroup={(gid)=>patchCategory(cat.id,{groupId:gid})} />)}

      <div style={{marginTop:16}}>
        {addingCat ? (
          <div style={{display:'flex', gap:8}}>
            <input type="text" value={newCatName} placeholder="新しいカテゴリ名" onChange={e=>setNewCatName(e.target.value)}
              style={{padding:'8px 10px', border:'1px solid var(--line)', borderRadius:6}} />
            <button className="btn btn-primary btn-sm" onClick={addCategory}>追加</button>
            <button className="btn btn-sm" onClick={()=>setAddingCat(false)}>取消</button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={()=>setAddingCat(true)}>＋ 新規カテゴリを追加</button>
        )}
      </div>
    </div>
  );
}

function WsCategoryBlock({ cat, groups, onAddCard, onUpdateCard, onRemoveCard, onRemoveCategory, onRename, onChangeGroup }){
  const [open, setOpen] = useState(cat.cards.length>0);
  return (
    <div className="ws-category card">
      <div className="ws-category-head" onClick={()=>setOpen(o=>!o)}>
        <span className="chev" style={{transform: open?'rotate(90deg)':'none', fontSize:11, color:'var(--ink-soft)'}}>▶</span>
        <input type="text" value={cat.name} onClick={e=>e.stopPropagation()} onChange={e=>onRename(e.target.value)}
          style={{border:'none', background:'none', fontFamily:'"Shippori Mincho",serif', fontWeight:700, fontSize:15, flex:1}} />
        <span className="count">{cat.cards.length}</span>
      </div>
      {open && (
        <div style={{padding:'0 14px 14px'}}>
          <div className="field-row" style={{maxWidth:220}}>
            <label>大分類</label>
            <select value={cat.groupId||''} onClick={e=>e.stopPropagation()} onChange={e=>onChangeGroup(e.target.value||null)}>
              <option value="">その他</option>
              {groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          {cat.cards.map(card=>(
            <div className="ws-card" key={card.id}>
              <input type="text" placeholder="小見出し（例：通貨の名前）" value={card.title}
                onChange={e=>onUpdateCard(card.id,{title:e.target.value})}
                style={{width:'100%', border:'none', background:'none', fontFamily:'"Shippori Mincho",serif', fontWeight:700, fontSize:15.5, marginBottom:8}} />
              <AutoTextarea placeholder="内容（長文をそのまま貼り付けてもOK。入力に合わせて枠が伸びます）" value={card.content}
                onChange={e=>onUpdateCard(card.id,{content:e.target.value})} minHeight={140} />
              <div style={{textAlign:'right', marginTop:6}}>
                <button className="btn btn-sm btn-danger" onClick={()=>onRemoveCard(card.id)}>削除</button>
              </div>
            </div>
          ))}
          <div style={{display:'flex', gap:10}}>
            <button className="btn btn-ghost btn-sm" onClick={onAddCard}>＋ カードを追加</button>
            <button className="btn btn-sm btn-danger" onClick={onRemoveCategory}>カテゴリごと削除</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ 年表 ============ */
function Timeline({ data, setData, allChars, allOrgs, allLocations, openEntity }){
  const [editing, setEditing] = useState(null); // id or 'new'

  const items = [...data.timeline].sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));

  const openNew = () => {
    const ev = { id: uid('tl'), dateLabel:'', title:'', summary:'', detail:'', personIds:[], orgIds:[], locationIds:[], tags:[], sortOrder: items.length };
    setData(d=>({...d, timeline:[...d.timeline, ev]}));
    setEditing(ev.id);
  };
  const update = (id, patch) => setData(d=>({...d, timeline: d.timeline.map(e=>e.id===id?{...e,...patch}:e)}));
  const remove = (id) => { setData(d=>({...d, timeline: d.timeline.filter(e=>e.id!==id)})); setEditing(null); };
  const move = (id, dir) => {
    const idx = items.findIndex(e=>e.id===id);
    const j = idx+dir;
    if(j<0||j>=items.length) return;
    const reordered = [...items];
    [reordered[idx], reordered[j]] = [reordered[j], reordered[idx]];
    const withOrder = reordered.map((e,i)=>({...e, sortOrder:i}));
    setData(d=>({...d, timeline: d.timeline.map(e=> withOrder.find(w=>w.id===e.id) || e)}));
  };

  const editingEv = editing ? data.timeline.find(e=>e.id===editing) : null;
  const charOptions = allChars.map(c=>({id:c.id,label:c.name||'（無名）'}));
  const orgOptions = allOrgs.map(o=>({id:o.id,label:o.name||'（無名）'}));
  const locOptions = allLocations.map(l=>({id:l.id,label:l.name||'（無名）'}));

  return (
    <div>
      <div className="toolbar">
        <h1>📜 年表</h1>
        <div className="filler" />
        <button className="btn btn-primary" onClick={openNew}>＋ イベント追加</button>
      </div>

      {items.length===0 && <div className="empty-hint">まだイベントがありません。日時は自由な表記でOKです（「宇宙暦120年」「主人公18歳」など）。</div>}

      <div className="card" style={{marginTop:10}}>
        {items.map((ev,i)=>(
          <div className="tl-item" key={ev.id}>
            <div className="tl-order-btns">
              <button onClick={()=>move(ev.id,-1)} disabled={i===0}>↑</button>
              <button onClick={()=>move(ev.id,1)} disabled={i===items.length-1}>↓</button>
            </div>
            <div className="tl-date">{ev.dateLabel || '（日時未設定）'}</div>
            <div className="tl-body" onClick={()=>setEditing(ev.id)} style={{cursor:'pointer'}}>
              <div className="tl-title">{ev.title || '（無題のイベント）'}</div>
              {ev.summary && <div className="tl-summary">{ev.summary}</div>}
              {ev.tags && ev.tags.length>0 && <div style={{marginTop:4}}>{ev.tags.map(t=><span className="idea-tag-pill" key={t} style={{marginRight:4}}>{t}</span>)}</div>}
            </div>
          </div>
        ))}
      </div>

      {editingEv && (
        <Modal title="年表イベント" onClose={()=>setEditing(null)} wide>
          <div className="field-grid">
            <div className="field-row"><label>日時 / 年代（自由表記）</label><input type="text" value={editingEv.dateLabel} onChange={e=>update(editingEv.id,{dateLabel:e.target.value})} placeholder="宇宙暦120年 / 10年前 / 主人公18歳 など" /></div>
            <div className="field-row"><label>タイトル</label><input type="text" value={editingEv.title} onChange={e=>update(editingEv.id,{title:e.target.value})} /></div>
          </div>
          <div className="field-row"><label>概要</label><FieldAutoTextarea value={editingEv.summary} onChange={e=>update(editingEv.id,{summary:e.target.value})} minHeight={110} /></div>
          <div className="field-row"><label>詳細</label><FieldAutoTextarea value={editingEv.detail} onChange={e=>update(editingEv.id,{detail:e.target.value})} minHeight={160} /></div>
          <div className="field-row"><label>タグ（カンマ区切り）</label>
            <input type="text" value={(editingEv.tags||[]).join(', ')}
              onChange={e=>update(editingEv.id,{tags:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} />
          </div>
          <LinkPicker label="関連人物" options={charOptions} selectedIds={editingEv.personIds} onChange={ids=>update(editingEv.id,{personIds:ids})} />
          <LinkPicker label="関連組織" options={orgOptions} selectedIds={editingEv.orgIds} onChange={ids=>update(editingEv.id,{orgIds:ids})} />
          <LinkPicker label="関連場所" options={locOptions} selectedIds={editingEv.locationIds} onChange={ids=>update(editingEv.id,{locationIds:ids})} />
          <div className="modal-actions">
            <button className="btn btn-danger" onClick={()=>remove(editingEv.id)}>このイベントを削除</button>
            <button className="btn btn-primary" onClick={()=>setEditing(null)}>閉じる</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============ ネタ箱 ============ */
function IdeaBox({ data, setData, allChars, allOrgs, allLocations }){
  const [quickText, setQuickText] = useState('');
  const [quickType, setQuickType] = useState('アイデア');
  const [filterType, setFilterType] = useState('すべて');
  const [filterStatus, setFilterStatus] = useState('すべて');
  const [editing, setEditing] = useState(null);

  const quickAdd = () => {
    if(!quickText.trim()) return;
    const idea = { id: uid('idea'), content: quickText.trim(), type: quickType, tags:[], personIds:[], orgIds:[], locationIds:[], status:'未使用', usedIn:'', createdAt: Date.now() };
    setData(d=>({...d, ideas:[idea, ...d.ideas]}));
    setQuickText('');
  };

  const update = (id, patch) => setData(d=>({...d, ideas: d.ideas.map(i=>i.id===id?{...i,...patch}:i)}));
  const remove = (id) => { setData(d=>({...d, ideas: d.ideas.filter(i=>i.id!==id)})); setEditing(null); };

  const filtered = data.ideas.filter(i =>
    (filterType==='すべて' || i.type===filterType) &&
    (filterStatus==='すべて' || i.status===filterStatus)
  );

  const editingIdea = editing ? data.ideas.find(i=>i.id===editing) : null;
  const charOptions = allChars.map(c=>({id:c.id,label:c.name||'（無名）'}));
  const orgOptions = allOrgs.map(o=>({id:o.id,label:o.name||'（無名）'}));
  const locOptions = allLocations.map(l=>({id:l.id,label:l.name||'（無名）'}));

  return (
    <div>
      <h1>💡 ネタ箱</h1>
      <div className="idea-quickbar">
        <textarea placeholder="思いついたセリフ・シーン・設定などをそのまま書く…" value={quickText}
          onChange={e=>setQuickText(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter' && (e.metaKey||e.ctrlKey)) quickAdd(); }} />
        <select value={quickType} onChange={e=>setQuickType(e.target.value)}>
          {IDEA_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn btn-primary" onClick={quickAdd}>保存</button>
      </div>

      <div className="toolbar" style={{marginBottom:10}}>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)}>
          <option>すべて</option>
          {IDEA_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option>すべて</option>
          {IDEA_STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <div className="filler" />
        <span style={{fontSize:12, color:'var(--ink-soft)'}}>{filtered.length} 件</span>
      </div>

      {filtered.length===0 && <div className="empty-hint">条件に合うネタがありません。</div>}

      {filtered.map(idea=>(
        <div className="idea-card" key={idea.id} onClick={()=>setEditing(idea.id)} style={{cursor:'pointer'}}>
          <div className="ic-top">
            <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
              <span className="idea-tag-pill">{idea.type}</span>
              <span className={"status-pill status-"+idea.status}>{idea.status}</span>
            </div>
          </div>
          <div style={{marginTop:6, whiteSpace:'pre-wrap'}}>{idea.content}</div>
        </div>
      ))}

      {editingIdea && (
        <Modal title="ネタの詳細" onClose={()=>setEditing(null)} wide>
          <div className="field-row"><label>内容</label><FieldAutoTextarea value={editingIdea.content} onChange={e=>update(editingIdea.id,{content:e.target.value})} minHeight={140} /></div>
          <div className="field-grid">
            <div className="field-row"><label>種類</label>
              <select value={editingIdea.type} onChange={e=>update(editingIdea.id,{type:e.target.value})}>
                {IDEA_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field-row"><label>使用状態</label>
              <select value={editingIdea.status} onChange={e=>update(editingIdea.id,{status:e.target.value})}>
                {IDEA_STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="field-row"><label>使用先（メモ）</label><input type="text" value={editingIdea.usedIn||''} onChange={e=>update(editingIdea.id,{usedIn:e.target.value})} placeholder="第3章 桜井とのシーン など" /></div>
          <div className="field-row"><label>タグ（カンマ区切り）</label>
            <input type="text" value={(editingIdea.tags||[]).join(', ')}
              onChange={e=>update(editingIdea.id,{tags:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} />
          </div>
          <LinkPicker label="関連人物" options={charOptions} selectedIds={editingIdea.personIds} onChange={ids=>update(editingIdea.id,{personIds:ids})} />
          <LinkPicker label="関連組織" options={orgOptions} selectedIds={editingIdea.orgIds} onChange={ids=>update(editingIdea.id,{orgIds:ids})} />
          <LinkPicker label="関連場所" options={locOptions} selectedIds={editingIdea.locationIds} onChange={ids=>update(editingIdea.id,{locationIds:ids})} />
          <div className="modal-actions">
            <button className="btn btn-danger" onClick={()=>remove(editingIdea.id)}>削除</button>
            <button className="btn btn-primary" onClick={()=>setEditing(null)}>閉じる</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

