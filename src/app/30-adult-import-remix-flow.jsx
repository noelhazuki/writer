// ---- 成人向け表現：JSON一括登録モーダル。他辞典と同じ「貼り付け→解析→プレビュー→登録」の2段階フロー。
//      重複判定は概念名（concept）で行う。既存entryは一切書き換えない。 ----
function AdultDictionaryImportModal({ adultDictionary, setAdultDictionary, setLastImportIds, onClose }){
  const [jsonText, setJsonText] = useState('');
  const [step, setStep] = useState('input');
  const [parseError, setParseError] = useState('');
  const [previewItems, setPreviewItems] = useState([]);
  const [copyToast, setCopyToast] = useState('');

  const entries = adultDictionary.entries || [];

  const copyTemplate = async () => {
    const ok = await copyPlainText(ADULT_DICTIONARY_IMPORT_TEMPLATE);
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
    const existingConcepts = new Set(entries.map(e=>(e.concept||'').trim()).filter(Boolean));
    const seenInBatch = new Set();
    const items = parsed.entries.map((raw, idx) => {
      if(raw===null || typeof raw!=='object' || Array.isArray(raw)){
        return { key:'row-'+idx, kind:'error', message:`${idx+1}件目：項目形式が不正です` };
      }
      const concept = String(raw.concept==null ? '' : raw.concept).trim();
      if(!concept){
        return { key:'row-'+idx, kind:'error', message:`${idx+1}件目：conceptが空です` };
      }
      const normalized = normalizeImportedAdultEntry(raw);
      const isDup = existingConcepts.has(concept) || seenInBatch.has(concept);
      seenInBatch.add(concept);
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
      .map(i => ({
        ...i.entry,
        id: uid('adultc'),
        expressions: i.entry.expressions.map(x => ({ ...x, id: uid('adultex') })),
      }));
    if(toAdd.length===0) return;
    setAdultDictionary(ad => normalizeAdultDictionary({ entries: [...ad.entries, ...toAdd] }));
    setLastImportIds(toAdd.map(e=>e.id));
    const count = toAdd.length;
    setJsonText('');
    setPreviewItems([]);
    setStep('input');
    onClose();
    alert(`${count}件の概念を登録しました。`);
  };

  return (
    <Modal title="成人向け表現をJSONで一括登録" onClose={onClose} dict>
      <div className="special-import-desc">ChatGPTやClaude等で作成したJSON（概念＋表現）を貼り付けて、一括登録できます。</div>
      {step==='input' && (
        <>
          <div style={{marginBottom:10}}>
            <button type="button" className="btn btn-sm" onClick={copyTemplate}>JSON形式をコピー</button>
            {copyToast && <span className="special-import-copy-toast">{copyToast}</span>}
          </div>
          <textarea className="special-import-textarea" value={jsonText} onChange={e=>setJsonText(e.target.value)}
            placeholder={'{ "entries": [ { "concept": "……", "expressions": [ { "text": "……" } ] } ] }'} />
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
                    <div className="special-import-row-title">{item.entry.concept}</div>
                    {item.entry.category && <div className="special-import-row-sub">カテゴリ：{item.entry.category}</div>}
                    <div className="special-import-row-sub">表現 {item.entry.expressions.length}件</div>
                    <div className="special-import-row-status">
                      {item.kind==='new' ? '新規' : '重複：同じ概念名がすでに存在するためスキップ'}
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

// ---- トーン検索タブ：直接度／官能度／俗度／文芸度＋視点の条件を指定し、登録済み表現の中から近いものを提示する。
//      AIによる自動生成は今回未実装（一致度＝各ratingとの差の絶対値の合計。小さいほど近い）。 ----
function AdultRemixTab({ adultDictionary }){
  const entries = adultDictionary.entries || [];
  const allExpressions = useMemo(()=>{
    const out = [];
    entries.forEach(e=>{
      (e.expressions||[]).forEach(x=>{
        out.push({ ...x, conceptId:e.id, concept:e.concept, category:e.category });
      });
    });
    return out;
  }, [entries]);

  const [sourceText, setSourceText] = useState('');
  const [directness, setDirectness] = useState(3);
  const [eroticism, setEroticism] = useState(3);
  const [vulgarity, setVulgarity] = useState(3);
  const [literary, setLiterary] = useState(3);
  const [perspectiveFilter, setPerspectiveFilter] = useState('');
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);

  useEffect(()=>()=>{ if(toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);
  const showToast = (msg) => {
    setToast(msg);
    if(toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(()=>setToast(''), 1400);
  };
  const copyText = async (text) => {
    const ok = await copyPlainText(text);
    showToast(ok ? `「${text}」をコピーしました` : 'コピーに失敗しました');
  };

  const scored = useMemo(()=>{
    return allExpressions
      .filter(x => !perspectiveFilter || x.perspective===perspectiveFilter)
      .map(x => ({ ...x, score:
        Math.abs(x.directness-directness) + Math.abs(x.eroticism-eroticism) +
        Math.abs(x.vulgarity-vulgarity) + Math.abs(x.literary-literary) }))
      .sort((a,b)=>a.score-b.score)
      .slice(0, 30);
  }, [allExpressions, directness, eroticism, vulgarity, literary, perspectiveFilter]);

  return (
    <div className="adult-remix-tab">
      <p className="adult-tab-desc">
        「下品すぎる」と「文芸的すぎる」の間の、ちょうどいい温度の表現を絞り込みます。
        AIによる自動生成は今回未実装のため、「表現辞典」に登録済みの表現の中から条件の近いものを提示します。
      </p>
      <div className="dict-field-block">
        <label className="dict-field-label">元の表現（メモ用。検索には使用しません）</label>
        <input type="text" value={sourceText} onChange={e=>setSourceText(e.target.value)} placeholder="調整したい元の表現があれば入力" />
      </div>
      <RatingField label="直接度" value={directness} onChange={setDirectness} />
      <RatingField label="官能度" value={eroticism} onChange={setEroticism} />
      <RatingField label="俗度" value={vulgarity} onChange={setVulgarity} />
      <RatingField label="文芸度" value={literary} onChange={setLiterary} />
      <div className="dict-field-block">
        <label className="dict-field-label">視点で絞り込み</label>
        <div className="adult-perspective-group">
          <button type="button" className={"rating-btn"+(perspectiveFilter===''?' active':'')} style={{width:'auto', padding:'0 14px'}} onClick={()=>setPerspectiveFilter('')}>すべて</button>
          {ADULT_PERSPECTIVE_VALUES.map(p=>(
            <button key={p} type="button" className={"rating-btn"+(perspectiveFilter===p?' active':'')} style={{width:'auto', padding:'0 14px'}} onClick={()=>setPerspectiveFilter(p)}>{p}</button>
          ))}
        </div>
      </div>

      <div className="dict-list-head"><span>条件に近い表現</span><span className="dict-list-count">{scored.length}件</span></div>
      {allExpressions.length===0 && <div className="empty-hint">まだ「表現辞典」に成人向け表現が登録されていません。先に表現辞典タブから登録してください。</div>}
      {allExpressions.length>0 && scored.length===0 && <div className="empty-hint">条件に一致する表現が見つかりません。</div>}
      <div className="dict-card-list">
        {scored.map(x=>(
          <div className="dict-card dict-expr-card" key={x.id}>
            <div className="dict-card-body">
              <div className="dict-expr-card-text">{x.text}</div>
              <div className="dict-card-sub">{x.concept}{x.category?`（${x.category}）`:''}</div>
              <AdultRatingBadges x={x} />
              {x.note && <div className="dict-expr-card-note">{x.note}</div>}
            </div>
            <button type="button" className="btn btn-sm btn-primary" onClick={()=>copyText(x.text)}>コピー</button>
          </div>
        ))}
      </div>
      {toast && <div className="expr-dict-toast" style={{position:'fixed', bottom:'76px'}}>{toast}</div>}
    </div>
  );
}

// ---- シーン進行：段階別の材料を見ながら「今回の流れ」を組む。 ----
function AdultSceneFlowTab({appData,setAppData,data,setData,onInsertToDraft}){
  // 採用仕様：成人向けシーン進行は「共通シーン進行」と同じデータ構造・操作方法（appData.sceneFlowPlans、kind:'adult'）。
  // 違いは、カード編集時に成人向け候補（adultSceneFlow.items、既存データ）を呼び出せることだけ。
  // 既存の段階別材料ライブラリ（phases/items/selectedItemIds）はデータ・機能とも削除せず、
  // 「参考材料ライブラリ」として引き続き開けるほか、カード編集時の候補としても使う。
  const [view,setView]=useState('plans'); // 'plans'（共通シーン進行・成人向け） | 'library'（既存：段階別材料ライブラリ）
  return <div>
    <div className="story-tools-tabs">
      <button type="button" className={'story-tools-tab'+(view==='plans'?' active':'')} onClick={()=>setView('plans')}>シーン進行（成人向け）</button>
      <button type="button" className={'story-tools-tab'+(view==='library'?' active':'')} onClick={()=>setView('library')}>参考材料ライブラリ</button>
    </div>
    {view==='plans'
      ? <SceneFlowPlansEditor data={appData} setData={setAppData} kindFilter="adult" defaultKind="adult" adultLibrary={data} onInsertToDraft={onInsertToDraft} />
      : <SceneFlowLibraryView data={data} setData={setData}/>}
  </div>;
}

