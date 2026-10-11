function ExpressionDictionaryEditorModal({ expressionDictionary, setExpressionDictionary, onClose }){
  const entries = expressionDictionary.entries || [];
  const [view, setView] = useState('list'); // 'list' | 'entry' | 'expression'
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editingExpr, setEditingExpr] = useState(null); // { mode:'edit', id } | { mode:'new' }
  const [draftExprText, setDraftExprText] = useState('');
  const [draftExprTags, setDraftExprTags] = useState([]);
  const [draftExprNote, setDraftExprNote] = useState('');

  // 実データから動的にカテゴリフィルタ候補を作る（固定リストではない）
  const categoryOptions = useMemo(()=>{
    const set = new Set();
    entries.forEach(e=>{ if(e.category) set.add(e.category); });
    return Array.from(set);
  }, [entries]);

  const q = query.trim().toLowerCase();
  const matchEntry = (entry) => {
    if(categoryFilter && entry.category!==categoryFilter) return false;
    if(!q) return true;
    if((entry.headword||'').toLowerCase().includes(q)) return true;
    if((entry.category||'').toLowerCase().includes(q)) return true;
    if((entry.aliases||[]).some(a=>(a||'').toLowerCase().includes(q))) return true;
    if((entry.expressions||[]).some(x => (x.text||'').toLowerCase().includes(q) || (x.tags||[]).some(t=>(t||'').toLowerCase().includes(q)))) return true;
    return false;
  };
  const filteredEntries = entries.filter(matchEntry);

  // ---- CRUD：見出し語（既存ロジックを維持。データ構造は不変） ----
  const updateEntry = (id, patch) => {
    setExpressionDictionary(ed=>({ ...ed, entries: ed.entries.map(e=>e.id===id?{...e,...patch}:e) }));
  };
  const addEntry = () => {
    const id = uid('expr');
    const e = { id, headword:'新しい見出し語', aliases:[], category:'', notes:'', expressions:[] };
    setExpressionDictionary(ed=>({ ...ed, entries: [...ed.entries, e] }));
    setEditingEntryId(id);
    setView('entry');
  };
  const deleteEntry = (id) => {
    if(!confirm('この見出し語を削除しますか？登録済みの候補表現もすべて削除されます。')) return;
    setExpressionDictionary(ed=>({ ...ed, entries: ed.entries.filter(e=>e.id!==id) }));
    setEditingEntryId(null);
    setView('list');
  };

  // ---- CRUD：候補表現（既存ロジックを維持） ----
  const addExpression = (entryId, text, tags, note) => {
    const exId = uid('exprtx');
    setExpressionDictionary(ed=>({ ...ed, entries: ed.entries.map(e=>e.id===entryId
      ? { ...e, expressions:[...e.expressions, { id: exId, text, tags: tags||[], note: note||'' }] } : e) }));
    return exId;
  };
  const updateExpression = (entryId, exprId, patch) => {
    setExpressionDictionary(ed=>({ ...ed, entries: ed.entries.map(e=>e.id===entryId
      ? { ...e, expressions: e.expressions.map(x=>x.id===exprId?{...x,...patch}:x) } : e) }));
  };
  const deleteExpression = (entryId, exprId) => {
    setExpressionDictionary(ed=>({ ...ed, entries: ed.entries.map(e=>e.id===entryId
      ? { ...e, expressions: e.expressions.filter(x=>x.id!==exprId) } : e) }));
  };

  const openEntry = (id) => { setEditingEntryId(id); setView('entry'); };
  const backToList = () => { setEditingEntryId(null); setView('list'); };
  const openExpressionEdit = (id) => { setEditingExpr({ mode:'edit', id }); setView('expression'); };
  const openExpressionNew = () => { setDraftExprText(''); setDraftExprTags([]); setDraftExprNote(''); setEditingExpr({ mode:'new' }); setView('expression'); };
  const backToEntry = () => { setEditingExpr(null); setView('entry'); };

  const currentEntry = editingEntryId ? entries.find(e=>e.id===editingEntryId) : null;

  // 見出し語が削除された等で参照が消えていたら一覧へ戻す
  if(view!=='list' && !currentEntry){
    return (
      <Modal title="表現辞典を編集" onClose={onClose} dict>
        <div className="empty-hint">この見出し語は削除されました。</div>
        <div className="modal-actions"><button className="btn btn-primary" onClick={()=>{ setView('list'); setEditingEntryId(null); setEditingExpr(null); }}>← 一覧へ戻る</button></div>
      </Modal>
    );
  }

  // ==== 一覧（トップ）：検索＋カテゴリフィルタ＋見出し語カードのみ。inputは並べない ====
  if(view==='list'){
    return (
      <Modal title="表現辞典を編集" onClose={onClose} dict>
        <div className="dict-search-row">
          <input type="text" placeholder="🔎 見出し語を検索……" value={query} onChange={e=>setQuery(e.target.value)} />
        </div>
        <div className="dict-cat-tabs" style={{marginBottom:10}}>
          <button type="button" className={"dict-cat-tab"+(categoryFilter===''?' active':'')} onClick={()=>setCategoryFilter('')}>すべて</button>
          {categoryOptions.map(c=>(
            <button key={c} type="button" className={"dict-cat-tab"+(categoryFilter===c?' active':'')} onClick={()=>setCategoryFilter(c)}>{c}</button>
          ))}
        </div>
        {entries.length===0 && <div className="empty-hint">まだ項目がありません。下から追加してください。</div>}
        {entries.length>0 && filteredEntries.length===0 && <div className="empty-hint">一致する見出し語が見つかりません。</div>}
        <div className="dict-card-list">
          {filteredEntries.map(entry=>(
            <div className="dict-card dict-headword-card" key={entry.id} onClick={()=>openEntry(entry.id)}>
              <div className="dict-card-body">
                <div className="dict-headword-card-top">
                  <span className="dict-card-title">{entry.headword || '（無題）'}</span>
                  {entry.category && <span className="dict-headword-card-cat">{entry.category}</span>}
                </div>
                {(entry.aliases||[]).length>0 && <div className="dict-headword-card-aliases">{entry.aliases.join('・')}</div>}
                <div className="dict-headword-card-count">候補 {(entry.expressions||[]).length}件</div>
              </div>
              <span className="dict-card-chevron">＞</span>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-sm btn-primary dict-add-btn" onClick={addEntry}>＋ 見出し語を追加</button>
        <div className="modal-actions"><button className="btn btn-primary" onClick={onClose}>閉じる</button></div>
      </Modal>
    );
  }

  // ==== 見出し語：詳細編集（この1件だけ。候補表現は件数カードのみ表示し、タップで個別編集へ） ====
  if(view==='entry'){
    return (
      <Modal title="見出し語を編集" onClose={onClose} dict>
        <button type="button" className="dict-back-link" onClick={backToList}>← 表現辞典を編集</button>
        <div className="dict-detail-title">{currentEntry.headword || '（無題）'}</div>
        <div className="dict-field-block">
          <label className="dict-field-label">見出し語</label>
          <input type="text" value={currentEntry.headword} onChange={e=>updateEntry(currentEntry.id,{headword:e.target.value})} />
        </div>
        <div className="dict-field-block">
          <label className="dict-field-label">カテゴリ</label>
          <input type="text" list="expr-dict-category-list" value={currentEntry.category} onChange={e=>updateEntry(currentEntry.id,{category:e.target.value})} placeholder="例：身体 / 動作 / 視線" />
        </div>
        <div className="dict-field-block">
          <label className="dict-field-label">別名</label>
          <ChipListEditor values={currentEntry.aliases} onChange={vals=>updateEntry(currentEntry.id,{aliases:vals})} placeholder="別名を入力してEnter" />
        </div>
        <div className="dict-field-block">
          <label className="dict-field-label">メモ</label>
          <textarea rows={3} value={currentEntry.notes} onChange={e=>updateEntry(currentEntry.id,{notes:e.target.value})} placeholder="この見出し語についての補足（空可）" />
        </div>

        <div className="dict-list-head"><span>候補表現</span><span className="dict-list-count">{currentEntry.expressions.length}件</span></div>
        {currentEntry.expressions.length===0 && <div className="empty-hint">まだ候補表現がありません。</div>}
        <div className="dict-card-list">
          {currentEntry.expressions.map(x=>(
            <div className="dict-card dict-expr-card" key={x.id} onClick={()=>openExpressionEdit(x.id)}>
              <div className="dict-card-body">
                <div className="dict-expr-card-text">{x.text}</div>
                {(x.tags||[]).length>0 && (
                  <div className="dict-expr-card-tags">{x.tags.map(t=>(<span className="expr-dict-tag" key={t}>{t}</span>))}</div>
                )}
                {x.note && <div className="dict-expr-card-note">{x.note}</div>}
              </div>
              <span className="dict-card-chevron">＞</span>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-sm btn-primary dict-add-btn" onClick={openExpressionNew}>＋ 候補表現</button>

        <div className="dict-danger-zone">
          <button className="btn btn-sm btn-danger" onClick={()=>deleteEntry(currentEntry.id)}>この見出し語を削除</button>
        </div>
        <div className="modal-actions"><button className="btn btn-primary" onClick={backToList}>← 一覧へ戻る</button></div>

        <datalist id="expr-dict-category-list">
          {EXPRESSION_DICTIONARY_CATEGORY_SUGGESTIONS.map(c=>(<option value={c} key={c} />))}
        </datalist>
      </Modal>
    );
  }

  // ==== 候補表現：詳細編集／新規（この1件だけ。表現は必須、空のまま残らないようにする） ====
  const isNewExpr = editingExpr && editingExpr.mode==='new';
  const currentExpr = editingExpr && editingExpr.mode==='edit' ? currentEntry.expressions.find(x=>x.id===editingExpr.id) : null;
  if(view==='expression' && editingExpr && (isNewExpr || currentExpr)){
    const textVal = isNewExpr ? draftExprText : currentExpr.text;
    const tagsVal = isNewExpr ? draftExprTags : currentExpr.tags;
    const noteVal = isNewExpr ? draftExprNote : currentExpr.note;
    const setTextVal = isNewExpr ? setDraftExprText : (v)=>updateExpression(currentEntry.id, currentExpr.id, {text:v});
    const setTagsVal = isNewExpr ? setDraftExprTags : (vals)=>updateExpression(currentEntry.id, currentExpr.id, {tags:vals});
    const setNoteVal = isNewExpr ? setDraftExprNote : (v)=>updateExpression(currentEntry.id, currentExpr.id, {note:v});

    const submitNewExpr = () => {
      if(!draftExprText.trim()) return;
      addExpression(currentEntry.id, draftExprText.trim(), draftExprTags, draftExprNote);
      backToEntry();
    };

    return (
      <Modal title={isNewExpr ? '候補表現を追加' : '候補表現を編集'} onClose={onClose} dict>
        <button type="button" className="dict-back-link" onClick={backToEntry}>← {currentEntry.headword || '一覧'}</button>
        <div className="dict-detail-title">{isNewExpr ? '候補表現を追加' : '候補表現を編集'}</div>
        <div className="dict-field-block">
          <label className="dict-field-label">表現</label>
          <input type="text" value={textVal} onChange={e=>setTextVal(e.target.value)} placeholder="言い換え・類語" />
        </div>
        <div className="dict-field-block">
          <label className="dict-field-label">タグ</label>
          <ChipListEditor values={tagsVal} onChange={setTagsVal} placeholder="タグを入力してEnter" listId="expr-dict-tag-list" />
        </div>
        <div className="dict-field-block">
          <label className="dict-field-label">ニュアンス／メモ</label>
          <textarea rows={2} value={noteVal} onChange={e=>setNoteVal(e.target.value)} placeholder="空可" />
        </div>
        {isNewExpr ? (
          <div className="modal-actions"><button className="btn btn-primary" onClick={submitNewExpr} disabled={!draftExprText.trim()}>追加</button></div>
        ) : (
          <>
            <div className="dict-danger-zone">
              <button className="btn btn-sm btn-danger" onClick={()=>{ deleteExpression(currentEntry.id, currentExpr.id); backToEntry(); }}>この候補を削除</button>
            </div>
            <div className="modal-actions"><button className="btn btn-primary" onClick={backToEntry}>← 戻る</button></div>
          </>
        )}
        <datalist id="expr-dict-tag-list">
          {EXPRESSION_DICTIONARY_TAG_SUGGESTIONS.map(t=>(<option value={t} key={t} />))}
        </datalist>
      </Modal>
    );
  }

  return null;
}


// ---- 小説語彙辞典：JSON一括登録モーダル。貼り付け→解析→プレビュー確認→登録、の2段階フロー。
//      既存entryは一切書き換えない（重複は自動スキップ、チェックONの新規のみ末尾へ追加）。 ----
function SpecialDictionaryImportModal({ specialDictionary, setSpecialDictionary, setLastSpecialImportIds, onClose }){
  const [jsonText, setJsonText] = useState('');
  const [step, setStep] = useState('input'); // 'input' | 'preview'
  const [parseError, setParseError] = useState('');
  const [previewItems, setPreviewItems] = useState([]);
  const [copyToast, setCopyToast] = useState('');

  const entries = specialDictionary.entries || [];

  const copyTemplate = async () => {
    const ok = await copyPlainText(SPECIAL_DICTIONARY_IMPORT_TEMPLATE);
    setCopyToast(ok ? 'コピーしました' : 'コピーに失敗しました');
    setTimeout(()=>setCopyToast(''), 1400);
  };

  // ---- 解析：JSON parse失敗／{entries:[...]}形式でない場合はここで分かりやすいエラーを表示して止める ----
  const handleCheck = () => {
    setParseError('');
    let parsed;
    try{
      parsed = JSON.parse(jsonText);
    }catch(e){
      setParseError('JSONを解析できませんでした。カンマや括弧を確認してください。');
      return;
    }
    if(!parsed || typeof parsed!=='object' || Array.isArray(parsed) || !Array.isArray(parsed.entries)){
      setParseError('形式が違います。{ "entries": [...] } の形で貼り付けてください。');
      return;
    }

    // 既存entryのheadword（trim済み）集合＋今回のJSON内での出現済みheadword集合の両方と照合する
    const existingHeadwords = new Set(entries.map(e=>(e.headword||'').trim()).filter(Boolean));
    const seenInBatch = new Set();
    const items = parsed.entries.map((raw, idx) => {
      if(raw===null || typeof raw!=='object' || Array.isArray(raw)){
        return { key:'row-'+idx, kind:'error', message:`${idx+1}件目：項目形式が不正です` };
      }
      const headword = String(raw.headword==null ? '' : raw.headword).trim();
      if(!headword){
        return { key:'row-'+idx, kind:'error', message:`${idx+1}件目：headwordが空です` };
      }
      const normalized = normalizeImportedSpecialEntry(raw);
      const isDup = existingHeadwords.has(headword) || seenInBatch.has(headword);
      seenInBatch.add(headword);
      // 重複はチェックボックスをONにできない（checked固定false）。安全側に倒し、登録可否の判定は常にkind==='new'を正とする。
      return { key:'row-'+idx, kind: isDup ? 'duplicate' : 'new', entry: normalized, checked: !isDup };
    });
    setPreviewItems(items);
    setStep('preview');
  };

  // 重複・エラー項目はチェック操作そのものを受け付けない（UI側の防御。disabled属性と二重で守る）
  const toggleChecked = (key) => {
    setPreviewItems(items => items.map(it => (it.key===key && it.kind==='new') ? { ...it, checked: !it.checked } : it));
  };

  const newCount = previewItems.filter(i=>i.kind==='new').length;
  const dupCount = previewItems.filter(i=>i.kind==='duplicate').length;
  const errCount = previewItems.filter(i=>i.kind==='error').length;
  // 登録件数は必ず「新規かつチェックON」のみを数える。重複・エラーは常に対象外（安全側の唯一の判定基準）。
  const checkedCount = previewItems.filter(i=>i.kind==='new' && i.checked).length;

  const backToInput = () => { setStep('input'); setPreviewItems([]); setParseError(''); };

  // ---- 登録：新規（kind==='new'）かつチェックONの項目だけ、末尾へ追加する。
  //      重複はUIでチェック不可にしているが、ここでも必ずkind==='new'で再フィルタし、二重に防御する。
  //      Undoは辞典全体のスナップショットではなく、今回追加したentryのidだけを記録する（後続の手動編集・追加・削除を巻き込まないため）。 ----
  const commitImport = () => {
    const toAdd = previewItems
      .filter(i => i.kind==='new' && i.checked)
      .map(i => ({ ...i.entry, id: uid('special') }));
    if(toAdd.length===0) return;
    setSpecialDictionary(sd => normalizeSpecialDictionary({ entries: [...sd.entries, ...toAdd] }));
    setLastSpecialImportIds(toAdd.map(e=>e.id));
    const count = toAdd.length;
    setJsonText('');
    setPreviewItems([]);
    setStep('input');
    onClose();
    alert(`${count}件の小説語彙を登録しました。`);
  };

  return (
    <Modal title="小説語彙をJSONで一括登録" onClose={onClose} dict>
      <div className="special-import-desc">ChatGPTやClaude等で作成した小説語彙JSONを貼り付けて、一括登録できます。</div>

      {step==='input' && (
        <>
          <div style={{marginBottom:10}}>
            <button type="button" className="btn btn-sm" onClick={copyTemplate}>JSON形式をコピー</button>
            {copyToast && <span className="special-import-copy-toast">{copyToast}</span>}
          </div>
          <textarea className="special-import-textarea" value={jsonText} onChange={e=>setJsonText(e.target.value)}
            placeholder={'{ "entries": [ { "headword": "……", "category": "……", … } ] }'} />
          {parseError && <div className="special-import-error">{parseError}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-primary" onClick={handleCheck} disabled={!jsonText.trim()}>内容を確認</button>
            <button type="button" className="btn" onClick={onClose}>閉じる</button>
          </div>
        </>
      )}

      {step==='preview' && (
        <>
          <div className="special-import-summary">
            <span className="cnt-new">新規 {newCount}件</span>
            <span className="cnt-dup">重複 {dupCount}件</span>
            <span className="cnt-err">エラー {errCount}件</span>
          </div>
          <div className="special-import-preview-list">
            {previewItems.map(item=>{
              if(item.kind==='error'){
                return <div key={item.key} className="special-import-row-error">⚠ {item.message}</div>;
              }
              const isDup = item.kind==='duplicate';
              return (
                <label key={item.key} className={"special-import-row "+item.kind+(isDup?' disabled':'')}>
                  <input type="checkbox" checked={isDup ? false : item.checked} disabled={isDup} onChange={()=>toggleChecked(item.key)} />
                  <div className="special-import-row-body">
                    <div className="special-import-row-title">{item.entry.headword}</div>
                    {item.entry.category && <div className="special-import-row-sub">カテゴリ：{item.entry.category}</div>}
                    <div className="special-import-row-status">
                      {item.kind==='new' ? '新規' : '重複：同名の用語がすでに存在するためスキップ'}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={backToInput}>← 貼り付けに戻る</button>
            <button type="button" className="btn btn-primary" onClick={commitImport} disabled={checkedCount===0}>選択した{checkedCount}件を登録</button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ---- 小説語彙辞典：編集モーダル。一覧（検索・カテゴリフィルタ）→ タップした1件の詳細、の2階層。
//      「新規追加」は見出し語を入力して一覧へ戻るまで永続保存しない（空のまま戻った場合は破棄）。 ----
function SpecialDictionaryEditorModal({ specialDictionary, setSpecialDictionary, onClose, lastSpecialImportIds, setLastSpecialImportIds }){
  const entries = specialDictionary.entries || [];
  const [view, setView] = useState('list'); // 'list' | 'entry'
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingEntryId, setEditingEntryId] = useState(null); // 既存項目を編集中の場合のid
  const [draftEntry, setDraftEntry] = useState(null); // 新規項目：見出し語確定まで specialDictionary へは書き込まない
  const [importOpen, setImportOpen] = useState(false); // JSON一括登録モーダルの開閉

  const categoryOptions = useMemo(()=>{
    const set = new Set();
    entries.forEach(e=>{ if(e.category) set.add(e.category); });
    return Array.from(set);
  }, [entries]);

  const q = query.trim().toLowerCase();
  const matchEntry = (entry) => {
    if(categoryFilter && entry.category!==categoryFilter) return false;
    if(!q) return true;
    if((entry.headword||'').toLowerCase().includes(q)) return true;
    if((entry.aliases||[]).some(a=>(a||'').toLowerCase().includes(q))) return true;
    if((entry.category||'').toLowerCase().includes(q)) return true;
    if((entry.meaning||'').toLowerCase().includes(q)) return true;
    if((entry.tags||[]).some(t=>(t||'').toLowerCase().includes(q))) return true;
    if((entry.structureParts||[]).some(p=>(p||'').toLowerCase().includes(q))) return true;
    if((entry.searchHints||[]).some(h=>(h||'').toLowerCase().includes(q))) return true;
    if((entry.note||'').toLowerCase().includes(q)) return true;
    return false;
  };
  const filteredEntries = entries.filter(matchEntry);

  const isNew = !!draftEntry && !editingEntryId;
  const currentEntry = editingEntryId ? entries.find(e=>e.id===editingEntryId) : draftEntry;

  // ---- CRUD：新規は draftEntry（未保存）を更新し、既存は specialDictionary を直接更新する ----
  const updateEntry = (patch) => {
    if(isNew){
      setDraftEntry(d=>({ ...d, ...patch }));
    }else if(editingEntryId){
      setSpecialDictionary(sd=>({ ...sd, entries: sd.entries.map(e=>e.id===editingEntryId?{...e,...patch}:e) }));
    }
  };

  const openNewEntry = () => {
    setDraftEntry({
      id: uid('special'), headword:'', aliases:[], category:'', meaning:'', tags:[], structureParts:[], searchHints:[],
      directness:3, informality:3, coinedness:3, comicRisk:3, note:'',
    });
    setEditingEntryId(null);
    setView('entry');
  };
  const openEntry = (id) => { setEditingEntryId(id); setDraftEntry(null); setView('entry'); };

  // 見出し語が確定していれば登録、空のままなら破棄して一覧へ戻る
  const backToList = () => {
    if(isNew){
      const headword = (draftEntry.headword||'').trim();
      if(headword){
        setSpecialDictionary(sd=>({ ...sd, entries: [...sd.entries, { ...draftEntry, headword }] }));
      }
      setDraftEntry(null);
    }
    setEditingEntryId(null);
    setView('list');
  };

  const deleteEntry = (id) => {
    if(!confirm('この用語を削除しますか？')) return;
    setSpecialDictionary(sd=>({ ...sd, entries: sd.entries.filter(e=>e.id!==id) }));
    setEditingEntryId(null);
    setView('list');
  };

  // 既存項目が他操作で削除された等で参照が消えていたら一覧へ戻す
  if(view!=='list' && !currentEntry){
    return (
      <Modal title="小説語彙辞典を編集" onClose={onClose} dict>
        <div className="empty-hint">この用語は削除されました。</div>
        <div className="modal-actions"><button className="btn btn-primary" onClick={()=>{ setView('list'); setEditingEntryId(null); setDraftEntry(null); }}>← 一覧へ戻る</button></div>
      </Modal>
    );
  }

  // ==== 一覧（トップ）：検索＋カテゴリフィルタ＋用語カードのみ。inputは並べない ====
  if(view==='list'){
    return (
      <Modal title="小説語彙辞典を編集" onClose={onClose} dict>
        <div className="dict-search-row">
          <input type="text" placeholder="🔎 用語を検索……" value={query} onChange={e=>setQuery(e.target.value)} />
        </div>
        <div className="dict-cat-tabs" style={{marginBottom:10}}>
          <button type="button" className={"dict-cat-tab"+(categoryFilter===''?' active':'')} onClick={()=>setCategoryFilter('')}>すべて</button>
          {categoryOptions.map(c=>(
            <button key={c} type="button" className={"dict-cat-tab"+(categoryFilter===c?' active':'')} onClick={()=>setCategoryFilter(c)}>{c}</button>
          ))}
        </div>
        {entries.length===0 && <div className="empty-hint">まだ項目がありません。下から追加してください。</div>}
        {entries.length>0 && filteredEntries.length===0 && <div className="empty-hint">一致する用語が見つかりません。</div>}
        <div className="dict-card-list">
          {filteredEntries.map(entry=>(
            <div className="dict-card dict-headword-card" key={entry.id} onClick={()=>openEntry(entry.id)}>
              <div className="dict-card-body">
                <div className="dict-headword-card-top">
                  <span className="dict-card-title">{entry.headword || '（無題）'}</span>
                  {entry.category && <span className="dict-headword-card-cat">{entry.category}</span>}
                </div>
                {(entry.structureParts||[]).length>0 && <div className="dict-card-sub">{entry.structureParts.join(' + ')}</div>}
                <div className="dict-headword-card-count">特殊語度 {entry.coinedness||0} / 5</div>
              </div>
              <span className="dict-card-chevron">＞</span>
            </div>
          ))}
        </div>
        <div className="dict-import-btn-row">
          <button type="button" className="btn btn-sm dict-add-btn" onClick={()=>setImportOpen(true)}>JSON一括登録</button>
        </div>
        <button type="button" className="btn btn-sm btn-primary dict-add-btn" onClick={openNewEntry}>＋ 用語を追加</button>
        {lastSpecialImportIds && lastSpecialImportIds.length>0 && (
          <div className="dict-undo-row">
            <button type="button" className="btn btn-sm" onClick={()=>{
              // 辞典全体を巻き戻すのではなく、直前の一括登録で追加したidだけを削除する。
              // これにより一括登録後にユーザーが行った手動編集・追加・削除は保持される。
              setSpecialDictionary(sd => normalizeSpecialDictionary({ entries: sd.entries.filter(e=>!lastSpecialImportIds.includes(e.id)) }));
              setLastSpecialImportIds(null);
            }}>直前の一括登録を元に戻す</button>
          </div>
        )}
        <div className="modal-actions"><button className="btn btn-primary" onClick={onClose}>閉じる</button></div>
        {importOpen && (
          <SpecialDictionaryImportModal
            specialDictionary={specialDictionary}
            setSpecialDictionary={setSpecialDictionary}
            setLastSpecialImportIds={setLastSpecialImportIds}
            onClose={()=>setImportOpen(false)}
          />
        )}
      </Modal>
    );
  }

  // ==== 詳細編集（この1件だけ）。新規（isNew）の場合、削除ボタンは出さない（未確定のため「戻る」で自然に破棄される） ====
  return (
    <Modal title={isNew ? '小説語彙を追加' : '小説語彙を編集'} onClose={onClose} dict>
      <button type="button" className="dict-back-link" onClick={backToList}>← 小説語彙辞典を編集</button>
      <div className="dict-detail-title">{currentEntry.headword || '（無題）'}</div>
      <div className="dict-field-block">
        <label className="dict-field-label">用語</label>
        <input type="text" value={currentEntry.headword} onChange={e=>updateEntry({headword:e.target.value})} placeholder="見出し語" />
      </div>
      <div className="dict-field-block">
        <label className="dict-field-label">カテゴリ</label>
        <input type="text" list="special-dict-category-list" value={currentEntry.category} onChange={e=>updateEntry({category:e.target.value})} placeholder="自由入力（例：俗語 / 業界用語 / 造語）" />
      </div>
      <div className="dict-field-block">
        <label className="dict-field-label">意味</label>
        <textarea rows={3} value={currentEntry.meaning} onChange={e=>updateEntry({meaning:e.target.value})} placeholder="簡単な意味説明" />
      </div>
      <div className="dict-field-block">
        <label className="dict-field-label">別名</label>
        <ChipListEditor values={currentEntry.aliases} onChange={vals=>updateEntry({aliases:vals})} placeholder="別名・別表記を入力してEnter" />
      </div>
      <div className="dict-field-block">
        <label className="dict-field-label">タグ</label>
        <ChipListEditor values={currentEntry.tags} onChange={vals=>updateEntry({tags:vals})} placeholder="タグを入力してEnter" />
      </div>
      <div className="dict-field-block">
        <label className="dict-field-label">構造要素</label>
        <ChipListEditor values={currentEntry.structureParts} onChange={vals=>updateEntry({structureParts:vals})} placeholder="構成要素を入力してEnter" />
      </div>
      <div className="dict-field-block">
        <label className="dict-field-label">逆引きキーワード（この語を知らなくても検索でヒットさせたい言葉）</label>
        <ChipListEditor values={currentEntry.searchHints||[]} onChange={vals=>updateEntry({searchHints:vals})} placeholder="例：頑固／孤高 など、入力してEnter" />
      </div>
      <RatingField label="直接度" value={currentEntry.directness} onChange={v=>updateEntry({directness:v})} />
      <RatingField label="くだけ度" value={currentEntry.informality} onChange={v=>updateEntry({informality:v})} />
      <RatingField label="特殊語度" value={currentEntry.coinedness} onChange={v=>updateEntry({coinedness:v})} />
      <RatingField label="コミカル危険度" value={currentEntry.comicRisk} onChange={v=>updateEntry({comicRisk:v})} />
      <div className="dict-field-block">
        <label className="dict-field-label">メモ</label>
        <textarea rows={2} value={currentEntry.note} onChange={e=>updateEntry({note:e.target.value})} placeholder="空可" />
      </div>

      {!isNew && (
        <div className="dict-danger-zone">
          <button className="btn btn-sm btn-danger" onClick={()=>deleteEntry(currentEntry.id)}>この用語を削除</button>
        </div>
      )}
      <div className="modal-actions"><button className="btn btn-primary" onClick={backToList}>← 一覧へ戻る</button></div>

      <datalist id="special-dict-category-list">
        {categoryOptions.map(c=>(<option value={c} key={c} />))}
      </datalist>
    </Modal>
  );
}

// ---- 令和メディア語辞典：JSON一括登録モーダル。小説語彙辞典と同じ「貼り付け→解析→プレビュー→登録」の2段階フロー。
//      既存entryは一切書き換えない（重複は自動スキップ、チェックONの新規のみ末尾へ追加）。データは完全分離。 ----
function MediaDictionaryImportModal({ mediaDictionary, setMediaDictionary, setLastMediaImportIds, onClose }){
  const [jsonText, setJsonText] = useState('');
  const [step, setStep] = useState('input'); // 'input' | 'preview'
  const [parseError, setParseError] = useState('');
  const [previewItems, setPreviewItems] = useState([]);
  const [copyToast, setCopyToast] = useState('');

  const entries = mediaDictionary.entries || [];

  const copyTemplate = async () => {
    const ok = await copyPlainText(MEDIA_DICTIONARY_IMPORT_TEMPLATE);
    setCopyToast(ok ? 'コピーしました' : 'コピーに失敗しました');
    setTimeout(()=>setCopyToast(''), 1400);
  };

  const handleCheck = () => {
    setParseError('');
    let parsed;
    try{
      parsed = JSON.parse(jsonText);
    }catch(e){
      setParseError('JSONを解析できませんでした。カンマや括弧を確認してください。');
      return;
    }
    if(!parsed || typeof parsed!=='object' || Array.isArray(parsed) || !Array.isArray(parsed.entries)){
      setParseError('形式が違います。{ "entries": [...] } の形で貼り付けてください。');
      return;
    }

    const existingHeadwords = new Set(entries.map(e=>(e.headword||'').trim()).filter(Boolean));
    const seenInBatch = new Set();
    const items = parsed.entries.map((raw, idx) => {
      if(raw===null || typeof raw!=='object' || Array.isArray(raw)){
        return { key:'row-'+idx, kind:'error', message:`${idx+1}件目：項目形式が不正です` };
      }
      const headword = String(raw.headword==null ? '' : raw.headword).trim();
      if(!headword){
        return { key:'row-'+idx, kind:'error', message:`${idx+1}件目：headwordが空です` };
      }
      const normalized = normalizeImportedMediaEntry(raw);
      const isDup = existingHeadwords.has(headword) || seenInBatch.has(headword);
      seenInBatch.add(headword);
      return { key:'row-'+idx, kind: isDup ? 'duplicate' : 'new', entry: normalized, checked: !isDup };
    });
    setPreviewItems(items);
    setStep('preview');
  };

  const toggleChecked = (key) => {
    setPreviewItems(items => items.map(it => (it.key===key && it.kind==='new') ? { ...it, checked: !it.checked } : it));
  };

  const newCount = previewItems.filter(i=>i.kind==='new').length;
  const dupCount = previewItems.filter(i=>i.kind==='duplicate').length;
  const errCount = previewItems.filter(i=>i.kind==='error').length;
  const checkedCount = previewItems.filter(i=>i.kind==='new' && i.checked).length;

  const backToInput = () => { setStep('input'); setPreviewItems([]); setParseError(''); };

  const commitImport = () => {
    const toAdd = previewItems
      .filter(i => i.kind==='new' && i.checked)
      .map(i => ({ ...i.entry, id: uid('media') }));
    if(toAdd.length===0) return;
    setMediaDictionary(md => normalizeMediaDictionary({ entries: [...md.entries, ...toAdd] }));
    setLastMediaImportIds(toAdd.map(e=>e.id));
    const count = toAdd.length;
    setJsonText('');
    setPreviewItems([]);
    setStep('input');
    onClose();
    alert(`${count}件のメディア語を登録しました。`);
  };

  return (
    <Modal title="メディア語をJSONで一括登録" onClose={onClose} dict>
      <div className="special-import-desc">ChatGPTやClaude等で作成したメディア語JSONを貼り付けて、一括登録できます。</div>

      {step==='input' && (
        <>
          <div style={{marginBottom:10}}>
            <button type="button" className="btn btn-sm" onClick={copyTemplate}>JSON形式をコピー</button>
            {copyToast && <span className="special-import-copy-toast">{copyToast}</span>}
          </div>
          <textarea className="special-import-textarea" value={jsonText} onChange={e=>setJsonText(e.target.value)}
            placeholder={'{ "entries": [ { "headword": "……", "category": "……", … } ] }'} />
          {parseError && <div className="special-import-error">{parseError}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-primary" onClick={handleCheck} disabled={!jsonText.trim()}>内容を確認</button>
            <button type="button" className="btn" onClick={onClose}>閉じる</button>
          </div>
        </>
      )}

      {step==='preview' && (
        <>
          <div className="special-import-summary">
            <span className="cnt-new">新規 {newCount}件</span>
            <span className="cnt-dup">重複 {dupCount}件</span>
            <span className="cnt-err">エラー {errCount}件</span>
          </div>
          <div className="special-import-preview-list">
            {previewItems.map(item=>{
              if(item.kind==='error'){
                return <div key={item.key} className="special-import-row-error">⚠ {item.message}</div>;
              }
              const isDup = item.kind==='duplicate';
              return (
                <label key={item.key} className={"special-import-row "+item.kind+(isDup?' disabled':'')}>
                  <input type="checkbox" checked={isDup ? false : item.checked} disabled={isDup} onChange={()=>toggleChecked(item.key)} />
                  <div className="special-import-row-body">
                    <div className="special-import-row-title">{item.entry.headword}</div>
                    {item.entry.category && <div className="special-import-row-sub">カテゴリ：{item.entry.category}</div>}
                    <div className="special-import-row-status">
                      {item.kind==='new' ? '新規' : '重複：同名の用語がすでに存在するためスキップ'}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={backToInput}>← 貼り付けに戻る</button>
            <button type="button" className="btn btn-primary" onClick={commitImport} disabled={checkedCount===0}>選択した{checkedCount}件を登録</button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ---- 令和メディア語辞典：編集モーダル。一覧（検索・カテゴリフィルタ）→ タップした1件の詳細、の2階層。データはmediaDictionaryとして完全分離。 ----
function MediaDictionaryEditorModal({ mediaDictionary, setMediaDictionary, onClose, lastMediaImportIds, setLastMediaImportIds }){
  const entries = mediaDictionary.entries || [];
  const [view, setView] = useState('list'); // 'list' | 'entry'
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [draftEntry, setDraftEntry] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const categoryOptions = useMemo(()=>{
    const set = new Set();
    entries.forEach(e=>{ if(e.category) set.add(e.category); });
    return Array.from(set);
  }, [entries]);

  const q = query.trim().toLowerCase();
  const matchEntry = (entry) => {
    if(categoryFilter && entry.category!==categoryFilter) return false;
    if(!q) return true;
    if((entry.headword||'').toLowerCase().includes(q)) return true;
    if((entry.aliases||[]).some(a=>(a||'').toLowerCase().includes(q))) return true;
    if((entry.category||'').toLowerCase().includes(q)) return true;
    if((entry.meaning||'').toLowerCase().includes(q)) return true;
    if((entry.tags||[]).some(t=>(t||'').toLowerCase().includes(q))) return true;
    if((entry.structureParts||[]).some(p=>(p||'').toLowerCase().includes(q))) return true;
    if((entry.note||'').toLowerCase().includes(q)) return true;
    return false;
  };
  const filteredEntries = entries.filter(matchEntry);

  const isNew = !!draftEntry && !editingEntryId;
  const currentEntry = editingEntryId ? entries.find(e=>e.id===editingEntryId) : draftEntry;

  const updateEntry = (patch) => {
    if(isNew){
      setDraftEntry(d=>({ ...d, ...patch }));
    }else if(editingEntryId){
      setMediaDictionary(md=>({ ...md, entries: md.entries.map(e=>e.id===editingEntryId?{...e,...patch}:e) }));
    }
  };

  const openNewEntry = () => {
    setDraftEntry({
      id: uid('media'), headword:'', aliases:[], category:'', meaning:'', tags:[], structureParts:[],
      directness:3, informality:3, coinedness:3, comicRisk:3, note:'',
    });
    setEditingEntryId(null);
    setView('entry');
  };
  const openEntry = (id) => { setEditingEntryId(id); setDraftEntry(null); setView('entry'); };

  const backToList = () => {
    if(isNew){
      const headword = (draftEntry.headword||'').trim();
      if(headword){
        setMediaDictionary(md=>({ ...md, entries: [...md.entries, { ...draftEntry, headword }] }));
      }
      setDraftEntry(null);
    }
    setEditingEntryId(null);
    setView('list');
  };

  const deleteEntry = (id) => {
    if(!confirm('この用語を削除しますか？')) return;
    setMediaDictionary(md=>({ ...md, entries: md.entries.filter(e=>e.id!==id) }));
    setEditingEntryId(null);
    setView('list');
  };

  if(view!=='list' && !currentEntry){
    return (
      <Modal title="メディア語辞典を編集" onClose={onClose} dict>
        <div className="empty-hint">この用語は削除されました。</div>
        <div className="modal-actions"><button className="btn btn-primary" onClick={()=>{ setView('list'); setEditingEntryId(null); setDraftEntry(null); }}>← 一覧へ戻る</button></div>
      </Modal>
    );
  }

  if(view==='list'){
    return (
      <Modal title="メディア語辞典を編集" onClose={onClose} dict>
        <div className="dict-search-row">
          <input type="text" placeholder="🔎 用語を検索……" value={query} onChange={e=>setQuery(e.target.value)} />
        </div>
        <div className="dict-cat-tabs" style={{marginBottom:10}}>
          <button type="button" className={"dict-cat-tab"+(categoryFilter===''?' active':'')} onClick={()=>setCategoryFilter('')}>すべて</button>
          {categoryOptions.map(c=>(
            <button key={c} type="button" className={"dict-cat-tab"+(categoryFilter===c?' active':'')} onClick={()=>setCategoryFilter(c)}>{c}</button>
          ))}
        </div>
        {entries.length===0 && <div className="empty-hint">まだ項目がありません。下から追加してください。</div>}
        {entries.length>0 && filteredEntries.length===0 && <div className="empty-hint">一致する用語が見つかりません。</div>}
        <div className="dict-card-list">
          {filteredEntries.map(entry=>(
            <div className="dict-card dict-headword-card" key={entry.id} onClick={()=>openEntry(entry.id)}>
              <div className="dict-card-body">
                <div className="dict-headword-card-top">
                  <span className="dict-card-title">{entry.headword || '（無題）'}</span>
                  {entry.category && <span className="dict-headword-card-cat">{entry.category}</span>}
                </div>
                {(entry.structureParts||[]).length>0 && <div className="dict-card-sub">{entry.structureParts.join(' + ')}</div>}
                <div className="dict-headword-card-count">特殊語度 {entry.coinedness||0} / 5</div>
              </div>
              <span className="dict-card-chevron">＞</span>
            </div>
          ))}
        </div>
        <div className="dict-import-btn-row">
          <button type="button" className="btn btn-sm dict-add-btn" onClick={()=>setImportOpen(true)}>JSON一括登録</button>
        </div>
        <button type="button" className="btn btn-sm btn-primary dict-add-btn" onClick={openNewEntry}>＋ 用語を追加</button>
        {lastMediaImportIds && lastMediaImportIds.length>0 && (
          <div className="dict-undo-row">
            <button type="button" className="btn btn-sm" onClick={()=>{
              setMediaDictionary(md => normalizeMediaDictionary({ entries: md.entries.filter(e=>!lastMediaImportIds.includes(e.id)) }));
              setLastMediaImportIds(null);
            }}>直前の一括登録を元に戻す</button>
          </div>
        )}
        <div className="modal-actions"><button className="btn btn-primary" onClick={onClose}>閉じる</button></div>
        {importOpen && (
          <MediaDictionaryImportModal
            mediaDictionary={mediaDictionary}
            setMediaDictionary={setMediaDictionary}
            setLastMediaImportIds={setLastMediaImportIds}
            onClose={()=>setImportOpen(false)}
          />
        )}
      </Modal>
    );
  }

  return (
    <Modal title={isNew ? 'メディア語を追加' : 'メディア語を編集'} onClose={onClose} dict>
      <button type="button" className="dict-back-link" onClick={backToList}>← メディア語辞典を編集</button>
      <div className="dict-detail-title">{currentEntry.headword || '（無題）'}</div>
      <div className="dict-field-block">
        <label className="dict-field-label">用語</label>
        <input type="text" value={currentEntry.headword} onChange={e=>updateEntry({headword:e.target.value})} placeholder="見出し語" />
      </div>
      <div className="dict-field-block">
        <label className="dict-field-label">カテゴリ</label>
        <input type="text" list="media-dict-category-list" value={currentEntry.category} onChange={e=>updateEntry({category:e.target.value})} placeholder="自由入力（例：SNS / ネットスラング / オタク文化）" />
      </div>
      <div className="dict-field-block">
        <label className="dict-field-label">意味</label>
        <textarea rows={3} value={currentEntry.meaning} onChange={e=>updateEntry({meaning:e.target.value})} placeholder="簡単な意味説明" />
      </div>
      <div className="dict-field-block">
        <label className="dict-field-label">別名</label>
        <ChipListEditor values={currentEntry.aliases} onChange={vals=>updateEntry({aliases:vals})} placeholder="別名・別表記を入力してEnter" />
      </div>
      <div className="dict-field-block">
        <label className="dict-field-label">タグ</label>
        <ChipListEditor values={currentEntry.tags} onChange={vals=>updateEntry({tags:vals})} placeholder="タグを入力してEnter" />
      </div>
      <div className="dict-field-block">
        <label className="dict-field-label">構造要素</label>
        <ChipListEditor values={currentEntry.structureParts} onChange={vals=>updateEntry({structureParts:vals})} placeholder="構成要素を入力してEnter" />
      </div>
      <RatingField label="直接度" value={currentEntry.directness} onChange={v=>updateEntry({directness:v})} />
      <RatingField label="くだけ度" value={currentEntry.informality} onChange={v=>updateEntry({informality:v})} />
      <RatingField label="特殊語度" value={currentEntry.coinedness} onChange={v=>updateEntry({coinedness:v})} />
      <RatingField label="コミカル危険度" value={currentEntry.comicRisk} onChange={v=>updateEntry({comicRisk:v})} />
      <div className="dict-field-block">
        <label className="dict-field-label">メモ</label>
        <textarea rows={2} value={currentEntry.note} onChange={e=>updateEntry({note:e.target.value})} placeholder="空可" />
      </div>

      {!isNew && (
        <div className="dict-danger-zone">
          <button className="btn btn-sm btn-danger" onClick={()=>deleteEntry(currentEntry.id)}>この用語を削除</button>
        </div>
      )}
      <div className="modal-actions"><button className="btn btn-primary" onClick={backToList}>← 一覧へ戻る</button></div>

      <datalist id="media-dict-category-list">
        {categoryOptions.map(c=>(<option value={c} key={c} />))}
      </datalist>
    </Modal>
  );
}


