function AdultToolsScreen({ adultDictionary, setAdultDictionary, adultPhraseRemix, setAdultPhraseRemix, adultOnomatopoeia, setAdultOnomatopoeia, adultSceneFlow, setAdultSceneFlow, openTabRequest, appData, setAppData, onInsertToDraft }){
  const [tab, setTab] = useState('dict'); // 'dict' | 'tone' | 'phraseRemix' | 'onomatopoeia' | 'sceneFlow' | 'map'
  // 「下書き」の辞典ドロワーから「編集」「進行表を管理」で遷移してきたとき、該当タブを直接開く。
  useEffect(()=>{ if(openTabRequest && openTabRequest.tab) setTab(openTabRequest.tab); }, [openTabRequest && openTabRequest.nonce]);
  return (
    <div className="adult-tools-screen">
      <div className="toolbar">
        <h1>🔞 成人向け創作</h1>
      </div>
      <div className="adult-tools-tabs">
        <button type="button" className={"adult-tools-tab"+(tab==='dict'?' active':'')} onClick={()=>setTab('dict')}>表現辞典</button>
        <button type="button" className={"adult-tools-tab"+(tab==='tone'?' active':'')} onClick={()=>setTab('tone')}>トーン検索</button>
        <button type="button" className={"adult-tools-tab"+(tab==='phraseRemix'?' active':'')} onClick={()=>setTab('phraseRemix')}>語句魔改造</button>
        <button type="button" className={"adult-tools-tab"+(tab==='onomatopoeia'?' active':'')} onClick={()=>setTab('onomatopoeia')}>オノマトペ</button>
        <button type="button" className={"adult-tools-tab"+(tab==='sceneFlow'?' active':'')} onClick={()=>setTab('sceneFlow')}>シーン進行</button>
        <button type="button" className={"adult-tools-tab"+(tab==='map'?' active':'')} onClick={()=>setTab('map')}>語句マップ</button>
      </div>
      {tab==='dict' && <AdultExpressionDictionaryTab adultDictionary={adultDictionary} setAdultDictionary={setAdultDictionary} />}
      {tab==='tone' && <AdultRemixTab adultDictionary={adultDictionary} />}
      {tab==='phraseRemix' && <AdultPhraseRemixTab remixData={adultPhraseRemix} setRemixData={setAdultPhraseRemix} />}
      {tab==='onomatopoeia' && <AdultOnomatopoeiaTab data={adultOnomatopoeia} setData={setAdultOnomatopoeia} />}
      {tab==='sceneFlow' && <AdultSceneFlowTab appData={appData} setAppData={setAppData} data={adultSceneFlow} setData={setAdultSceneFlow} onInsertToDraft={onInsertToDraft} />}
      {tab==='map' && <AdultWordMapTab adultDictionary={adultDictionary} />}
    </div>
  );
}

// ---- 表現辞典タブ：概念一覧（検索・カテゴリフィルタ）→ 概念詳細（＋表現の件数カード）→ 表現詳細、の3階層。
//      新規概念は概念名確定まで、新規表現はテキスト確定まで、それぞれadultDictionaryへは書き込まない。 ----
function AdultExpressionDictionaryTab({ adultDictionary, setAdultDictionary }){
  const entries = adultDictionary.entries || [];
  const [view, setView] = useState('list'); // 'list' | 'concept' | 'expression'
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingConceptId, setEditingConceptId] = useState(null);
  const [draftConcept, setDraftConcept] = useState(null);
  const [editingExprId, setEditingExprId] = useState(null);
  const [draftExpr, setDraftExpr] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [lastImportIds, setLastImportIds] = useState(null);

  const categoryOptions = useMemo(()=>{
    const set = new Set();
    entries.forEach(e=>{ if(e.category) set.add(e.category); });
    return Array.from(set);
  }, [entries]);

  const q = query.trim().toLowerCase();
  const matchConcept = (entry) => {
    if(categoryFilter && entry.category!==categoryFilter) return false;
    if(!q) return true;
    if((entry.concept||'').toLowerCase().includes(q)) return true;
    if((entry.category||'').toLowerCase().includes(q)) return true;
    if((entry.aliases||[]).some(a=>(a||'').toLowerCase().includes(q))) return true;
    if((entry.tags||[]).some(t=>(t||'').toLowerCase().includes(q))) return true;
    if((entry.expressions||[]).some(x=>(x.text||'').toLowerCase().includes(q))) return true;
    return false;
  };
  const filteredEntries = entries.filter(matchConcept);

  const isNewConcept = !!draftConcept && !editingConceptId;
  const currentConcept = editingConceptId ? entries.find(e=>e.id===editingConceptId) : draftConcept;

  const updateConcept = (patch) => {
    if(isNewConcept){
      setDraftConcept(d=>({ ...d, ...patch }));
    }else if(editingConceptId){
      setAdultDictionary(ad=>({ ...ad, entries: ad.entries.map(e=>e.id===editingConceptId?{...e,...patch}:e) }));
    }
  };

  const openNewConcept = () => {
    setDraftConcept({ id: uid('adultc'), concept:'', category:'', aliases:[], tags:[], expressions:[] });
    setEditingConceptId(null);
    setView('concept');
  };
  const openConcept = (id) => { setEditingConceptId(id); setDraftConcept(null); setView('concept'); };

  const backToList = () => {
    if(isNewConcept){
      const concept = (draftConcept.concept||'').trim();
      if(concept){
        setAdultDictionary(ad=>({ ...ad, entries: [...ad.entries, { ...draftConcept, concept }] }));
      }
      setDraftConcept(null);
    }
    setEditingConceptId(null);
    setView('list');
  };

  const deleteConcept = (id) => {
    if(!confirm('この概念を削除しますか？登録済みの表現もすべて削除されます。')) return;
    setAdultDictionary(ad=>({ ...ad, entries: ad.entries.filter(e=>e.id!==id) }));
    setEditingConceptId(null);
    setView('list');
  };

  // ---- 表現CRUD：新規はdraftExpr（未保存）、既存は概念（draft or 保存済み）へ直接反映 ----
  const openNewExpr = () => {
    setDraftExpr({ text:'', directness:3, eroticism:3, vulgarity:3, literary:3, perspective:'両方', note:'' });
    setEditingExprId(null);
    setView('expression');
  };
  const openExpr = (id) => { setEditingExprId(id); setDraftExpr(null); setView('expression'); };

  const isNewExpr = !!draftExpr && !editingExprId;
  const currentExpr = isNewExpr ? draftExpr : (editingExprId && currentConcept ? (currentConcept.expressions||[]).find(x=>x.id===editingExprId) : null);

  const updateExprField = (patch) => {
    if(isNewExpr){
      setDraftExpr(x=>({ ...x, ...patch }));
    }else if(editingExprId && editingConceptId){
      setAdultDictionary(ad=>({ ...ad, entries: ad.entries.map(e=>e.id===editingConceptId
        ? { ...e, expressions: (e.expressions||[]).map(x=>x.id===editingExprId?{...x,...patch}:x) } : e) }));
    }else if(editingExprId && isNewConcept){
      setDraftConcept(d=>({ ...d, expressions: (d.expressions||[]).map(x=>x.id===editingExprId?{...x,...patch}:x) }));
    }
  };

  const backToConcept = () => {
    if(isNewExpr){
      const text = (draftExpr.text||'').trim();
      if(text){
        const newExpr = { ...draftExpr, id: uid('adultex'), text };
        if(isNewConcept){
          setDraftConcept(d=>({ ...d, expressions: [...(d.expressions||[]), newExpr] }));
        }else if(editingConceptId){
          setAdultDictionary(ad=>({ ...ad, entries: ad.entries.map(e=>e.id===editingConceptId
            ? { ...e, expressions: [...(e.expressions||[]), newExpr] } : e) }));
        }
      }
      setDraftExpr(null);
    }
    setEditingExprId(null);
    setView('concept');
  };

  const deleteExpr = (id) => {
    if(!confirm('この表現を削除しますか？')) return;
    if(isNewConcept){
      setDraftConcept(d=>({ ...d, expressions: (d.expressions||[]).filter(x=>x.id!==id) }));
    }else if(editingConceptId){
      setAdultDictionary(ad=>({ ...ad, entries: ad.entries.map(e=>e.id===editingConceptId
        ? { ...e, expressions: (e.expressions||[]).filter(x=>x.id!==id) } : e) }));
    }
    setEditingExprId(null);
    setView('concept');
  };

  // 概念が他操作で削除された等で参照が消えていたら一覧へ戻す
  if(view!=='list' && !currentConcept){
    return (
      <div>
        <div className="empty-hint">この概念は削除されました。</div>
        <div className="modal-actions"><button className="btn btn-primary" onClick={()=>{ setView('list'); setEditingConceptId(null); setDraftConcept(null); }}>← 一覧へ戻る</button></div>
      </div>
    );
  }

  if(view==='expression'){
    if(!currentExpr){
      return (
        <div>
          <div className="empty-hint">この表現は削除されました。</div>
          <div className="modal-actions"><button className="btn btn-primary" onClick={backToConcept}>← 戻る</button></div>
        </div>
      );
    }
    return (
      <div>
        <div className="breadcrumb"><button onClick={backToConcept}>← {currentConcept.concept || '概念'}</button></div>
        <div className="dict-detail-title">{isNewExpr ? '表現を追加' : '表現を編集'}</div>
        <div className="dict-field-block">
          <label className="dict-field-label">表現</label>
          <input type="text" value={currentExpr.text} onChange={e=>updateExprField({text:e.target.value})} placeholder="具体的な言い回し" />
        </div>
        <RatingField label="直接度" value={currentExpr.directness} onChange={v=>updateExprField({directness:v})} />
        <RatingField label="官能度" value={currentExpr.eroticism} onChange={v=>updateExprField({eroticism:v})} />
        <RatingField label="俗度" value={currentExpr.vulgarity} onChange={v=>updateExprField({vulgarity:v})} />
        <RatingField label="文芸度" value={currentExpr.literary} onChange={v=>updateExprField({literary:v})} />
        <div className="dict-field-block">
          <label className="dict-field-label">視点</label>
          <div className="adult-perspective-group">
            {ADULT_PERSPECTIVE_VALUES.map(p=>(
              <button key={p} type="button" className={"rating-btn"+(currentExpr.perspective===p?' active':'')} style={{width:'auto', padding:'0 14px'}} onClick={()=>updateExprField({perspective:p})}>{p}</button>
            ))}
          </div>
        </div>
        <div className="dict-field-block">
          <label className="dict-field-label">メモ</label>
          <textarea rows={2} value={currentExpr.note} onChange={e=>updateExprField({note:e.target.value})} placeholder="空可" />
        </div>
        {isNewExpr ? (
          <div className="modal-actions"><button className="btn btn-primary" onClick={backToConcept} disabled={!currentExpr.text.trim()}>追加して戻る</button></div>
        ) : (
          <>
            <div className="dict-danger-zone">
              <button className="btn btn-sm btn-danger" onClick={()=>deleteExpr(currentExpr.id)}>この表現を削除</button>
            </div>
            <div className="modal-actions"><button className="btn btn-primary" onClick={backToConcept}>← 戻る</button></div>
          </>
        )}
      </div>
    );
  }

  if(view==='concept'){
    return (
      <div>
        <div className="breadcrumb"><button onClick={backToList}>← 表現辞典一覧</button></div>
        <div className="dict-detail-title">{currentConcept.concept || '（無題）'}</div>
        <div className="dict-field-block">
          <label className="dict-field-label">概念（何を表現したいか）</label>
          <input type="text" value={currentConcept.concept} onChange={e=>updateConcept({concept:e.target.value})} placeholder="例：絶頂の描写" />
        </div>
        <div className="dict-field-block">
          <label className="dict-field-label">カテゴリ</label>
          <input type="text" list="adult-dict-category-list" value={currentConcept.category} onChange={e=>updateConcept({category:e.target.value})} placeholder="自由入力（例：身体 / 動作 / 反応 / 発声 / 心理）" />
        </div>
        <div className="dict-field-block">
          <label className="dict-field-label">別名</label>
          <ChipListEditor values={currentConcept.aliases} onChange={vals=>updateConcept({aliases:vals})} placeholder="別名を入力してEnter" />
        </div>
        <div className="dict-field-block">
          <label className="dict-field-label">タグ</label>
          <ChipListEditor values={currentConcept.tags} onChange={vals=>updateConcept({tags:vals})} placeholder="タグを入力してEnter" />
        </div>

        <div className="dict-list-head"><span>表現</span><span className="dict-list-count">{(currentConcept.expressions||[]).length}件</span></div>
        {(currentConcept.expressions||[]).length===0 && <div className="empty-hint">まだ表現がありません。</div>}
        <div className="dict-card-list">
          {(currentConcept.expressions||[]).map(x=>(
            <div className="dict-card dict-expr-card" key={x.id} onClick={()=>openExpr(x.id)}>
              <div className="dict-card-body">
                <div className="dict-expr-card-text">{x.text}</div>
                <AdultRatingBadges x={x} />
                {x.note && <div className="dict-expr-card-note">{x.note}</div>}
              </div>
              <span className="dict-card-chevron">＞</span>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-sm btn-primary dict-add-btn" onClick={openNewExpr}>＋ 表現を追加</button>

        {!isNewConcept && (
          <div className="dict-danger-zone">
            <button className="btn btn-sm btn-danger" onClick={()=>deleteConcept(currentConcept.id)}>この概念を削除</button>
          </div>
        )}
        <div className="modal-actions"><button className="btn btn-primary" onClick={backToList}>← 一覧へ戻る</button></div>

        <datalist id="adult-dict-category-list">
          {ADULT_CATEGORY_SUGGESTIONS.concat(categoryOptions).filter((c,i,arr)=>arr.indexOf(c)===i).map(c=>(<option value={c} key={c} />))}
        </datalist>
      </div>
    );
  }

  // ==== view==='list' ====
  return (
    <div>
      <div className="dict-search-row">
        <input type="text" placeholder="🔎 概念・表現を検索……" value={query} onChange={e=>setQuery(e.target.value)} />
      </div>
      <div className="dict-cat-tabs" style={{marginBottom:10}}>
        <button type="button" className={"dict-cat-tab"+(categoryFilter===''?' active':'')} onClick={()=>setCategoryFilter('')}>すべて</button>
        {categoryOptions.map(c=>(
          <button key={c} type="button" className={"dict-cat-tab"+(categoryFilter===c?' active':'')} onClick={()=>setCategoryFilter(c)}>{c}</button>
        ))}
      </div>
      {entries.length===0 && <div className="empty-hint">まだ概念が登録されていません。「＋ 概念を追加」から追加できます。</div>}
      {entries.length>0 && filteredEntries.length===0 && <div className="empty-hint">一致する概念が見つかりません。</div>}
      <div className="dict-card-list">
        {filteredEntries.map(entry=>(
          <div className="dict-card dict-headword-card" key={entry.id} onClick={()=>openConcept(entry.id)}>
            <div className="dict-card-body">
              <div className="dict-headword-card-top">
                <span className="dict-card-title">{entry.concept || '（無題）'}</span>
                {entry.category && <span className="dict-headword-card-cat">{entry.category}</span>}
              </div>
              {(entry.aliases||[]).length>0 && <div className="dict-headword-card-aliases">{entry.aliases.join('・')}</div>}
              <div className="dict-headword-card-count">表現 {(entry.expressions||[]).length}件</div>
            </div>
            <span className="dict-card-chevron">＞</span>
          </div>
        ))}
      </div>
      <div className="dict-import-btn-row">
        <button type="button" className="btn btn-sm dict-add-btn" onClick={()=>setImportOpen(true)}>JSON一括登録</button>
      </div>
      <button type="button" className="btn btn-sm btn-primary dict-add-btn" onClick={openNewConcept}>＋ 概念を追加</button>
      {lastImportIds && lastImportIds.length>0 && (
        <div className="dict-undo-row">
          <button type="button" className="btn btn-sm" onClick={()=>{
            setAdultDictionary(ad => normalizeAdultDictionary({ entries: ad.entries.filter(e=>!lastImportIds.includes(e.id)) }));
            setLastImportIds(null);
          }}>直前の一括登録を元に戻す</button>
        </div>
      )}
      {importOpen && (
        <AdultDictionaryImportModal
          adultDictionary={adultDictionary}
          setAdultDictionary={setAdultDictionary}
          setLastImportIds={setLastImportIds}
          onClose={()=>setImportOpen(false)}
        />
      )}
    </div>
  );
}

