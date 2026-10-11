// ---- 表現パレット辞書：一覧（カテゴリタブ＋登録語カード）→ タップした1件だけを編集、という階層UI ----
// 「カテゴリ管理」「登録語の詳細編集／新規」はそれぞれ別画面へ分離し、全項目を同時展開しない。
function WritingSnippetDictionaryModal({ writingSnippets, setWritingSnippets, onClose }){
  const { categories, snippets } = writingSnippets;
  const sortedCats = [...categories].sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
  const snippetsOf = (catId) => snippets.filter(s=>s.categoryId===catId).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));

  const [view, setView] = useState('list'); // 'list' | 'categories' | 'snippet'
  const [activeCatId, setActiveCatId] = useState(sortedCats[0] ? sortedCats[0].id : null);
  const [editingSnippet, setEditingSnippet] = useState(null); // { mode:'edit', id, categoryId } | { mode:'new', categoryId }
  const [renamingCatId, setRenamingCatId] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [draftLabel, setDraftLabel] = useState('');
  const [draftText, setDraftText] = useState('');
  const [draftPinned, setDraftPinned] = useState(false);

  const activeCat = sortedCats.find(c=>c.id===activeCatId) || sortedCats[0] || null;

  // ---- カテゴリCRUD（既存ロジックを維持） ----
  const addCategory = (name) => {
    setWritingSnippets(sd=>{
      const maxOrder = sd.categories.reduce((m,c)=>Math.max(m, c.sortOrder??0), -1);
      return { ...sd, categories: [...sd.categories, { id: uid('snippet-cat'), name, sortOrder: maxOrder+1 }] };
    });
  };
  const renameCategory = (id, name) => {
    setWritingSnippets(sd=>({ ...sd, categories: sd.categories.map(c=>c.id===id?{...c,name}:c) }));
  };
  const moveCategory = (id, dir) => {
    setWritingSnippets(sd=>{
      const cats = [...sd.categories].sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
      const idx = cats.findIndex(c=>c.id===id);
      const swapIdx = idx+dir;
      if(idx<0 || swapIdx<0 || swapIdx>=cats.length) return sd;
      const a = cats[idx], b = cats[swapIdx];
      const aOrder=a.sortOrder, bOrder=b.sortOrder;
      return { ...sd, categories: sd.categories.map(c=>{
        if(c.id===a.id) return {...c, sortOrder:bOrder};
        if(c.id===b.id) return {...c, sortOrder:aOrder};
        return c;
      })};
    });
  };
  const deleteCategory = (id) => {
    const count = snippets.filter(s=>s.categoryId===id).length;
    const msg = count>0 ? `このカテゴリを削除すると、中の登録語${count}件も一緒に削除されます。よろしいですか？` : 'このカテゴリを削除しますか？';
    if(!confirm(msg)) return;
    setWritingSnippets(sd=>({
      categories: sd.categories.filter(c=>c.id!==id),
      snippets: sd.snippets.filter(s=>s.categoryId!==id),
    }));
    if(activeCatId===id) setActiveCatId(null);
  };

  // ---- 登録語CRUD（既存ロジック＋新規作成時にpinnedも一緒に指定できるよう拡張。データ構造は不変） ----
  const addSnippet = (catId, label, text, pinned) => {
    const newId = uid('snippet');
    setWritingSnippets(sd=>{
      const inCat = sd.snippets.filter(s=>s.categoryId===catId);
      const maxOrder = inCat.reduce((m,s)=>Math.max(m, s.sortOrder??0), -1);
      return { ...sd, snippets: [...sd.snippets, { id:newId, categoryId:catId, label, text, sortOrder:maxOrder+1, pinned: !!pinned }] };
    });
    return newId;
  };
  const updateSnippet = (id, patch) => {
    setWritingSnippets(sd=>({ ...sd, snippets: sd.snippets.map(s=>s.id===id?{...s,...patch}:s) }));
  };
  const deleteSnippet = (id) => {
    setWritingSnippets(sd=>({ ...sd, snippets: sd.snippets.filter(s=>s.id!==id) }));
  };
  const moveSnippet = (id, dir) => {
    setWritingSnippets(sd=>{
      const s = sd.snippets.find(x=>x.id===id);
      if(!s) return sd;
      const siblings = sd.snippets.filter(x=>x.categoryId===s.categoryId).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
      const idx = siblings.findIndex(x=>x.id===id);
      const swapIdx = idx+dir;
      if(swapIdx<0 || swapIdx>=siblings.length) return sd;
      const a = siblings[idx], b = siblings[swapIdx];
      const aOrder=a.sortOrder, bOrder=b.sortOrder;
      return { ...sd, snippets: sd.snippets.map(x=>{
        if(x.id===a.id) return {...x, sortOrder:bOrder};
        if(x.id===b.id) return {...x, sortOrder:aOrder};
        return x;
      })};
    });
  };

  const openSnippetEdit = (catId, id) => { setEditingSnippet({ mode:'edit', id, categoryId:catId }); setView('snippet'); };
  const openSnippetNew = (catId) => { setDraftLabel(''); setDraftText(''); setDraftPinned(false); setEditingSnippet({ mode:'new', categoryId:catId }); setView('snippet'); };
  const backFromSnippet = () => { setEditingSnippet(null); setView('list'); };

  // ==== 一覧（トップ）：カテゴリタブ＋選択中カテゴリの登録語カードのみ ====
  if(view==='list'){
    return (
      <Modal title="表現パレットを編集" onClose={onClose} dict>
        <p style={{fontSize:12, color:'var(--ink-soft)', margin:'0 0 10px'}}>登録した表現は本文画面の「表現パレット」から挿入できます。★はクイック表現バーにも表示されます。</p>
        <div className="dict-toolbar">
          <div className="dict-cat-tabs">
            {sortedCats.map(cat=>(
              <button key={cat.id} type="button" className={"dict-cat-tab"+(activeCat && activeCat.id===cat.id ? " active":"")} onClick={()=>setActiveCatId(cat.id)}>{cat.name}</button>
            ))}
          </div>
          <button type="button" className="btn btn-sm" onClick={()=>setView('categories')}>カテゴリ管理</button>
        </div>
        {sortedCats.length===0 && <div className="empty-hint">まだカテゴリがありません。「カテゴリ管理」から追加してください。</div>}
        {sortedCats.length>0 && !activeCat && <div className="empty-hint">カテゴリを選んでください。</div>}
        {activeCat && (
          <div className="dict-list-section">
            <div className="dict-list-head"><span>{activeCat.name}</span><span className="dict-list-count">{snippetsOf(activeCat.id).length}件</span></div>
            {snippetsOf(activeCat.id).length===0 && <div className="empty-hint">まだ登録語がありません。</div>}
            <div className="dict-card-list">
              {snippetsOf(activeCat.id).map(sn=>(
                <div className="dict-card" key={sn.id} onClick={()=>openSnippetEdit(activeCat.id, sn.id)}>
                  <button type="button" className={"dict-pin-btn"+(sn.pinned?" pinned":"")}
                    onClick={e=>{ e.stopPropagation(); updateSnippet(sn.id,{pinned: !sn.pinned}); }}
                    title={sn.pinned ? 'クイックバーから外す' : 'クイックバーに固定'}>{sn.pinned ? '★' : '☆'}</button>
                  <div className="dict-card-body">
                    <div className="dict-card-title">{sn.label ? sn.label : sn.text}</div>
                    <div className="dict-card-sub">挿入：{sn.text}</div>
                  </div>
                  <span className="dict-card-chevron">＞</span>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-sm btn-primary dict-add-btn" onClick={()=>openSnippetNew(activeCat.id)}>＋ 登録語</button>
          </div>
        )}
        <div className="modal-actions"><button className="btn btn-primary" onClick={onClose}>閉じる</button></div>
      </Modal>
    );
  }

  // ==== カテゴリ管理（別画面） ====
  if(view==='categories'){
    return (
      <Modal title="カテゴリ管理" onClose={onClose} dict>
        <button type="button" className="dict-back-link" onClick={()=>setView('list')}>← 表現パレットを編集</button>
        {sortedCats.length===0 && <div className="empty-hint">まだカテゴリがありません。下から追加してください。</div>}
        <div className="dict-cat-manage-list">
          {sortedCats.map((cat,ci)=>(
            <div className="dict-cat-manage-row" key={cat.id}>
              {renamingCatId===cat.id ? (
                <input type="text" autoFocus value={cat.name}
                  onChange={e=>renameCategory(cat.id, e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter') setRenamingCatId(null); }} />
              ) : (
                <span className="dict-cat-manage-name">{cat.name}</span>
              )}
              <div className="gm-actions">
                <button onClick={()=>moveCategory(cat.id,-1)} disabled={ci===0}>↑</button>
                <button onClick={()=>moveCategory(cat.id,1)} disabled={ci===sortedCats.length-1}>↓</button>
                {renamingCatId===cat.id ? (
                  <button onClick={()=>setRenamingCatId(null)}>完了</button>
                ) : (
                  <button onClick={()=>setRenamingCatId(cat.id)}>編集</button>
                )}
                <button style={{color:'#8a3a3a'}} onClick={()=>deleteCategory(cat.id)}>削除</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{display:'flex', gap:8, marginTop:14, paddingTop:14, borderTop:'1px solid var(--line)'}}>
          <input type="text" placeholder="新しいカテゴリ名" value={newCatName} onChange={e=>setNewCatName(e.target.value)}
            style={{flex:1, padding:'7px 9px', border:'1px solid var(--line)', borderRadius:6}} />
          <button className="btn btn-sm btn-primary" onClick={()=>{ if(newCatName.trim()){ addCategory(newCatName.trim()); setNewCatName(''); } }}>＋ カテゴリを追加</button>
        </div>
        <div className="modal-actions"><button className="btn btn-primary" onClick={()=>setView('list')}>← 一覧へ戻る</button></div>
      </Modal>
    );
  }

  // ==== 登録語：詳細編集／新規（この1件だけを編集する） ====
  if(view==='snippet' && editingSnippet){
    const isNew = editingSnippet.mode==='new';
    const snippet = isNew ? null : snippets.find(s=>s.id===editingSnippet.id);
    if(!isNew && !snippet){
      return (
        <Modal title="表現パレットを編集" onClose={onClose} dict>
          <div className="empty-hint">この登録語は削除されました。</div>
          <div className="modal-actions"><button className="btn btn-primary" onClick={backFromSnippet}>← 一覧へ戻る</button></div>
        </Modal>
      );
    }
    const catName = (sortedCats.find(c=>c.id===editingSnippet.categoryId)||{}).name || '一覧';
    const siblings = snippetsOf(editingSnippet.categoryId);
    const idx = isNew ? -1 : siblings.findIndex(s=>s.id===editingSnippet.id);

    const labelVal = isNew ? draftLabel : snippet.label;
    const textVal = isNew ? draftText : snippet.text;
    const pinnedVal = isNew ? draftPinned : snippet.pinned;
    const setLabelVal = isNew ? setDraftLabel : (v)=>updateSnippet(snippet.id,{label:v});
    const setTextVal = isNew ? setDraftText : (v)=>updateSnippet(snippet.id,{text:v});
    const togglePinned = isNew ? (()=>setDraftPinned(p=>!p)) : (()=>updateSnippet(snippet.id,{pinned: !snippet.pinned}));

    const submitNew = () => {
      if(!draftText.trim()) return;
      addSnippet(editingSnippet.categoryId, draftLabel.trim(), draftText, draftPinned);
      backFromSnippet();
    };

    return (
      <Modal title={isNew ? '登録語を追加' : '登録語を編集'} onClose={onClose} dict>
        <button type="button" className="dict-back-link" onClick={backFromSnippet}>← {catName}</button>
        <div className="dict-detail-title">{isNew ? '登録語を追加' : '登録語を編集'}</div>
        <div className="dict-field-block">
          <label className="dict-field-label">表示名</label>
          <input type="text" value={labelVal} onChange={e=>setLabelVal(e.target.value)} placeholder="空可（未入力なら挿入文字列がそのままボタンに表示）" />
        </div>
        <div className="dict-field-block">
          <label className="dict-field-label">挿入する文字列</label>
          <input type="text" value={textVal} onChange={e=>setTextVal(e.target.value)} placeholder="本文へ挿入される文字列" />
        </div>
        <div className="dict-field-block dict-field-row-inline">
          <label className="dict-field-label">クイックバーに表示</label>
          <button type="button" className={"dict-pin-toggle"+(pinnedVal?" pinned":"")} onClick={togglePinned}>{pinnedVal ? '★ ON' : '☆ OFF'}</button>
        </div>
        {isNew ? (
          <div className="modal-actions"><button className="btn btn-primary" onClick={submitNew} disabled={!draftText.trim()}>追加</button></div>
        ) : (
          <>
            <div className="dict-move-row">
              <button className="btn btn-sm" onClick={()=>moveSnippet(snippet.id,-1)} disabled={idx<=0}>↑ 上へ</button>
              <button className="btn btn-sm" onClick={()=>moveSnippet(snippet.id,1)} disabled={idx<0 || idx>=siblings.length-1}>↓ 下へ</button>
            </div>
            <div className="dict-danger-zone">
              <button className="btn btn-sm btn-danger" onClick={()=>{ deleteSnippet(snippet.id); backFromSnippet(); }}>この登録語を削除</button>
            </div>
            <div className="modal-actions"><button className="btn btn-primary" onClick={backFromSnippet}>← 一覧へ戻る</button></div>
          </>
        )}
      </Modal>
    );
  }

  return null;
}

