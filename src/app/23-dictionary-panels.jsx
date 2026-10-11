/* ============ 表現辞典（本文執筆中に言い換え・類語を参照するための辞典） ============
   表現パレット（本文へ即挿入する「入力補助」）とはデータも役割も別。
   表現辞典は候補を見比べて言葉を選ぶ「参考資料」のため、候補操作は挿入ではなく[コピー]中心にする。 */

// ---- 参照パネル：検索が中心。候補語を眺めて、必要な語だけ[コピー]する（本文は書き換えない） ----
function ExpressionDictionaryPanel({ dictionary, onOpenEditor, onClose, onInsert, preventFocusSteal, style, dictTab, onDictTabChange }){
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);
  const entries = dictionary.entries || [];
  const q = query.trim().toLowerCase();

  const matchEntry = (entry) => {
    if(!q) return true;
    if((entry.headword||'').toLowerCase().includes(q)) return true;
    if((entry.category||'').toLowerCase().includes(q)) return true;
    if((entry.aliases||[]).some(a=>(a||'').toLowerCase().includes(q))) return true;
    if((entry.expressions||[]).some(x =>
      (x.text||'').toLowerCase().includes(q) || (x.tags||[]).some(t=>(t||'').toLowerCase().includes(q))
    )) return true;
    return false;
  };
  const filtered = entries.filter(matchEntry);

  useEffect(()=>()=>{ if(toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  const showToast = (msg) => {
    setToast(msg);
    if(toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(()=>setToast(''), 1400);
  };

  // Clipboard APIを第一候補に、使えない環境（ローカルHTML等）はtextarea+execCommandへfallback。
  // どちらも本文のbody・selection・scroll位置には一切触れない＝カーソル移動や本文末尾ジャンプは発生しない。
  const copyText = async (text) => {
    let ok = false;
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    }catch(e){ ok = false; }
    if(!ok){
      try{
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      }catch(e){ ok = false; }
    }
    showToast(ok ? `「${text}」をコピーしました` : 'コピーに失敗しました');
  };

  return (
    <div className="expr-dict-panel" style={style}>
      <DictTabSwitch active={dictTab} onChange={onDictTabChange} preventFocusSteal={preventFocusSteal} />
      <div className="expr-dict-head">
        <input type="text" className="expr-dict-search" placeholder="検索（見出し語・別名・候補語・タグ）"
          value={query} onChange={e=>setQuery(e.target.value)}
          onMouseDown={preventFocusSteal} onFocus={preventFocusSteal} />
        <button type="button" className="btn btn-sm" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={onOpenEditor}>
          <span className="label-full">辞典を編集</span><span className="label-short">編集</span>
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={onClose}>
          <span className="label-full">閉じる</span><span className="label-short">×</span>
        </button>
      </div>
      <div className="expr-dict-body">
        {entries.length===0 && <div className="empty-hint">まだ辞典項目がありません。「辞典を編集」から追加できます。</div>}
        {entries.length>0 && filtered.length===0 && <div className="empty-hint">「{query}」に一致する項目が見つかりません。</div>}
        {filtered.map(entry=>(
          <div className="expr-dict-entry" key={entry.id}>
            <div className="expr-dict-entry-head">
              {entry.category && <span className="expr-dict-entry-cat">{entry.category}</span>}
              <span className="expr-dict-entry-headword">{entry.headword || '（無題）'}</span>
              {(entry.aliases||[]).length>0 && <span className="expr-dict-entry-aliases">（{entry.aliases.join(' / ')}）</span>}
            </div>
            {entry.notes && <div className="expr-dict-entry-notes">{entry.notes}</div>}
            <div className="expr-dict-expr-list">
              {(entry.expressions||[]).length===0 && <div className="empty-hint" style={{padding:'4px 0'}}>候補表現がまだありません。</div>}
              {(entry.expressions||[]).map(x=>(
                <div className="expr-dict-expr-row" key={x.id}>
                  <div className="expr-dict-expr-main">
                    <span className="expr-dict-expr-text">{x.text}</span>
                    {(x.tags||[]).map(t=>(<span className="expr-dict-tag" key={t}>{t}</span>))}
                  </div>
                  {x.note && <div className="expr-dict-expr-note">{x.note}</div>}
                  <div className="expr-dict-expr-actions">
                    <button type="button" className="btn btn-sm btn-primary expr-dict-insert-btn"
                      onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal}
                      onClick={()=>copyText(x.text)}>コピー</button>
                    {onInsert && <button type="button" className="btn btn-sm expr-dict-insert-btn"
                      onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal}
                      onClick={()=>onInsert(x.text)}>文章へ挿入</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {toast && <div className="expr-dict-toast">{toast}</div>}
    </div>
  );
}

// ---- 小説語彙辞典（閲覧パネル）。表現辞典パネルと同じ下部ドロワー枠・タブ切替を共有する。
//      本文への挿入は行わず、コピーのみ（copyPlainTextを表現辞典と共通利用）。 ----
function SpecialDictionaryPanel({ dictionary, onOpenEditor, onClose, onInsert, preventFocusSteal, style, dictTab, onDictTabChange }){
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);
  const entries = dictionary.entries || [];
  const q = query.trim().toLowerCase();

  // 実データから動的にカテゴリフィルタ候補を作る（固定リストではない）
  const categoryOptions = useMemo(()=>{
    const set = new Set();
    entries.forEach(e=>{ if(e.category) set.add(e.category); });
    return Array.from(set);
  }, [entries]);

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
  const filtered = entries.filter(matchEntry);

  useEffect(()=>()=>{ if(toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  const showToast = (msg) => {
    setToast(msg);
    if(toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(()=>setToast(''), 1400);
  };

  // コピー対象はheadwordのみ。本文カーソル・selectionには一切触れない（挿入は行わない）
  const copyHeadword = async (text) => {
    if(!text) return;
    const ok = await copyPlainText(text);
    showToast(ok ? `「${text}」をコピーしました` : 'コピーに失敗しました');
  };

  return (
    <div className="expr-dict-panel" style={style}>
      <DictTabSwitch active={dictTab} onChange={onDictTabChange} preventFocusSteal={preventFocusSteal} />
      <div className="expr-dict-head">
        <input type="text" className="expr-dict-search" placeholder="検索（用語・別名・逆引きキーワード・カテゴリ・意味・タグ）"
          value={query} onChange={e=>setQuery(e.target.value)}
          onMouseDown={preventFocusSteal} onFocus={preventFocusSteal} />
        <button type="button" className="btn btn-sm" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={onOpenEditor}>
          <span className="label-full">辞典を編集</span><span className="label-short">編集</span>
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={onClose}>
          <span className="label-full">閉じる</span><span className="label-short">×</span>
        </button>
      </div>
      <div className="dict-cat-tabs" style={{padding:'8px 12px 0'}}>
        <button type="button" className={"dict-cat-tab"+(categoryFilter===''?' active':'')}
          onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={()=>setCategoryFilter('')}>すべて</button>
        {categoryOptions.map(c=>(
          <button key={c} type="button" className={"dict-cat-tab"+(categoryFilter===c?' active':'')}
            onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={()=>setCategoryFilter(c)}>{c}</button>
        ))}
      </div>
      <div className="expr-dict-body">
        {entries.length===0 && <div className="empty-hint">まだ小説語彙が登録されていません。「辞典を編集」から追加できます。</div>}
        {entries.length>0 && filtered.length===0 && <div className="empty-hint">「{query||categoryFilter}」に一致する用語が見つかりません。</div>}
        {filtered.map(entry=>(
          <div className="expr-dict-entry" key={entry.id}>
            <div className="expr-dict-entry-head">
              <span className="expr-dict-entry-headword">{entry.headword || '（無題）'}</span>
              {entry.category && <span className="expr-dict-entry-cat">{entry.category}</span>}
            </div>
            {(entry.aliases||[]).length>0 && <div className="expr-dict-entry-aliases">（{entry.aliases.join(' / ')}）</div>}
            {(entry.tags||[]).length>0 && (
              <div className="expr-dict-expr-main" style={{marginTop:4}}>
                {entry.tags.map(t=>(<span className="expr-dict-tag" key={t}>{t}</span>))}
              </div>
            )}
            {(entry.structureParts||[]).length>0 && (
              <div className="special-dict-structure">構造：{entry.structureParts.join(' ＋ ')}</div>
            )}
            {(entry.searchHints||[]).length>0 && (
              <div className="special-dict-structure">逆引き：{entry.searchHints.join(' / ')}</div>
            )}
            <div className="special-dict-ratings">
              <div className="special-dict-rating-row"><span className="special-dict-rating-label">直接度</span><RatingDots value={entry.directness} /></div>
              <div className="special-dict-rating-row"><span className="special-dict-rating-label">くだけ度</span><RatingDots value={entry.informality} /></div>
              <div className="special-dict-rating-row"><span className="special-dict-rating-label">特殊語度</span><RatingDots value={entry.coinedness} /></div>
              <div className="special-dict-rating-row"><span className="special-dict-rating-label">コミカル危険</span><RatingDots value={entry.comicRisk} /></div>
            </div>
            {entry.meaning && <div className="expr-dict-entry-notes">{entry.meaning}</div>}
            <div className="expr-dict-expr-actions">
              <button type="button" className="btn btn-sm btn-primary expr-dict-insert-btn" style={{marginTop:6}}
                onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal}
                onClick={()=>copyHeadword(entry.headword)} disabled={!entry.headword}>コピー</button>
              {onInsert && <button type="button" className="btn btn-sm expr-dict-insert-btn" style={{marginTop:6}}
                onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal}
                onClick={()=>onInsert(entry.headword)} disabled={!entry.headword}>文章へ挿入</button>}
            </div>
          </div>
        ))}
      </div>
      {toast && <div className="expr-dict-toast">{toast}</div>}
    </div>
  );
}

// ---- 令和メディア語辞典（閲覧パネル）。表現辞典・小説語彙辞典パネルと同じ下部ドロワー枠・タブ切替を共有する。
//      データはmediaDictionaryとして完全分離。 ----
function MediaDictionaryPanel({ dictionary, onOpenEditor, onClose, onInsert, preventFocusSteal, style, dictTab, onDictTabChange }){
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);
  const entries = dictionary.entries || [];
  const q = query.trim().toLowerCase();

  const categoryOptions = useMemo(()=>{
    const set = new Set();
    entries.forEach(e=>{ if(e.category) set.add(e.category); });
    return Array.from(set);
  }, [entries]);

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
  const filtered = entries.filter(matchEntry);

  useEffect(()=>()=>{ if(toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  const showToast = (msg) => {
    setToast(msg);
    if(toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(()=>setToast(''), 1400);
  };

  const copyHeadword = async (text) => {
    if(!text) return;
    const ok = await copyPlainText(text);
    showToast(ok ? `「${text}」をコピーしました` : 'コピーに失敗しました');
  };

  return (
    <div className="expr-dict-panel" style={style}>
      <DictTabSwitch active={dictTab} onChange={onDictTabChange} preventFocusSteal={preventFocusSteal} />
      <div className="expr-dict-head">
        <input type="text" className="expr-dict-search" placeholder="検索（用語・別名・カテゴリ・意味・タグ）"
          value={query} onChange={e=>setQuery(e.target.value)}
          onMouseDown={preventFocusSteal} onFocus={preventFocusSteal} />
        <button type="button" className="btn btn-sm" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={onOpenEditor}>
          <span className="label-full">辞典を編集</span><span className="label-short">編集</span>
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={onClose}>
          <span className="label-full">閉じる</span><span className="label-short">×</span>
        </button>
      </div>
      <div className="dict-cat-tabs" style={{padding:'8px 12px 0'}}>
        <button type="button" className={"dict-cat-tab"+(categoryFilter===''?' active':'')}
          onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={()=>setCategoryFilter('')}>すべて</button>
        {categoryOptions.map(c=>(
          <button key={c} type="button" className={"dict-cat-tab"+(categoryFilter===c?' active':'')}
            onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={()=>setCategoryFilter(c)}>{c}</button>
        ))}
      </div>
      <div className="expr-dict-body">
        {entries.length===0 && <div className="empty-hint">まだメディア語が登録されていません。「辞典を編集」から追加できます。</div>}
        {entries.length>0 && filtered.length===0 && <div className="empty-hint">「{query||categoryFilter}」に一致する用語が見つかりません。</div>}
        {filtered.map(entry=>(
          <div className="expr-dict-entry" key={entry.id}>
            <div className="expr-dict-entry-head">
              <span className="expr-dict-entry-headword">{entry.headword || '（無題）'}</span>
              {entry.category && <span className="expr-dict-entry-cat">{entry.category}</span>}
            </div>
            {(entry.aliases||[]).length>0 && <div className="expr-dict-entry-aliases">（{entry.aliases.join(' / ')}）</div>}
            {(entry.tags||[]).length>0 && (
              <div className="expr-dict-expr-main" style={{marginTop:4}}>
                {entry.tags.map(t=>(<span className="expr-dict-tag" key={t}>{t}</span>))}
              </div>
            )}
            {(entry.structureParts||[]).length>0 && (
              <div className="special-dict-structure">構造：{entry.structureParts.join(' ＋ ')}</div>
            )}
            <div className="special-dict-ratings">
              <div className="special-dict-rating-row"><span className="special-dict-rating-label">直接度</span><RatingDots value={entry.directness} /></div>
              <div className="special-dict-rating-row"><span className="special-dict-rating-label">くだけ度</span><RatingDots value={entry.informality} /></div>
              <div className="special-dict-rating-row"><span className="special-dict-rating-label">特殊語度</span><RatingDots value={entry.coinedness} /></div>
              <div className="special-dict-rating-row"><span className="special-dict-rating-label">コミカル危険</span><RatingDots value={entry.comicRisk} /></div>
            </div>
            {entry.meaning && <div className="expr-dict-entry-notes">{entry.meaning}</div>}
            <div className="expr-dict-expr-actions">
              <button type="button" className="btn btn-sm btn-primary expr-dict-insert-btn" style={{marginTop:6}}
                onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal}
                onClick={()=>copyHeadword(entry.headword)} disabled={!entry.headword}>コピー</button>
              {onInsert && <button type="button" className="btn btn-sm expr-dict-insert-btn" style={{marginTop:6}}
                onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal}
                onClick={()=>onInsert(entry.headword)} disabled={!entry.headword}>文章へ挿入</button>}
            </div>
          </div>
        ))}
      </div>
      {toast && <div className="expr-dict-toast">{toast}</div>}
    </div>
  );
}

// ---- 成人向け表現辞典（閲覧パネル）。表現辞典パネルと同じ下部ドロワー枠・タブ切替を共有する。
//      データはadultDictionaryとして完全分離。概念（concept）ごとに複数の候補表現（expressions）を持つ。 ----
function AdultExpressionPanel({ dictionary, onOpenEditor, onClose, onInsert, preventFocusSteal, style, dictTab, onDictTabChange }){
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);
  const entries = dictionary.entries || [];
  const q = query.trim().toLowerCase();

  const matchEntry = (entry) => {
    if(!q) return true;
    if((entry.concept||'').toLowerCase().includes(q)) return true;
    if((entry.category||'').toLowerCase().includes(q)) return true;
    if((entry.aliases||[]).some(a=>(a||'').toLowerCase().includes(q))) return true;
    if((entry.tags||[]).some(t=>(t||'').toLowerCase().includes(q))) return true;
    if((entry.expressions||[]).some(x=>(x.text||'').toLowerCase().includes(q))) return true;
    return false;
  };
  const filtered = entries.filter(matchEntry);

  useEffect(()=>()=>{ if(toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);
  const showToast = (msg) => {
    setToast(msg);
    if(toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(()=>setToast(''), 1400);
  };
  const copyText = async (text) => {
    if(!text) return;
    const ok = await copyPlainText(text);
    showToast(ok ? `「${text}」をコピーしました` : 'コピーに失敗しました');
  };

  return (
    <div className="expr-dict-panel" style={style}>
      <DictTabSwitch active={dictTab} onChange={onDictTabChange} preventFocusSteal={preventFocusSteal} />
      <div className="expr-dict-head">
        <input type="text" className="expr-dict-search" placeholder="検索（概念・別名・タグ・候補表現）"
          value={query} onChange={e=>setQuery(e.target.value)}
          onMouseDown={preventFocusSteal} onFocus={preventFocusSteal} />
        <button type="button" className="btn btn-sm" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={onOpenEditor}>
          <span className="label-full">辞典を編集</span><span className="label-short">編集</span>
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={onClose}>
          <span className="label-full">閉じる</span><span className="label-short">×</span>
        </button>
      </div>
      <div className="expr-dict-body">
        {entries.length===0 && <div className="empty-hint">まだ成人向け表現が登録されていません。「辞典を編集」から追加できます。</div>}
        {entries.length>0 && filtered.length===0 && <div className="empty-hint">「{query}」に一致する項目が見つかりません。</div>}
        {filtered.map(entry=>(
          <div className="expr-dict-entry" key={entry.id}>
            <div className="expr-dict-entry-head">
              {entry.category && <span className="expr-dict-entry-cat">{entry.category}</span>}
              <span className="expr-dict-entry-headword">{entry.concept || '（無題）'}</span>
              {(entry.aliases||[]).length>0 && <span className="expr-dict-entry-aliases">（{entry.aliases.join(' / ')}）</span>}
            </div>
            {(entry.tags||[]).length>0 && (
              <div className="expr-dict-expr-main" style={{marginTop:4}}>
                {entry.tags.map(t=>(<span className="expr-dict-tag" key={t}>{t}</span>))}
              </div>
            )}
            <div className="expr-dict-expr-list">
              {(entry.expressions||[]).length===0 && <div className="empty-hint" style={{padding:'4px 0'}}>候補表現がまだありません。</div>}
              {(entry.expressions||[]).map(x=>(
                <div className="expr-dict-expr-row" key={x.id}>
                  <div className="expr-dict-expr-main">
                    <span className="expr-dict-expr-text">{x.text}</span>
                    <span className="expr-dict-tag">{x.perspective}</span>
                  </div>
                  <div className="special-dict-ratings">
                    <div className="special-dict-rating-row"><span className="special-dict-rating-label">直接度</span><RatingDots value={x.directness} /></div>
                    <div className="special-dict-rating-row"><span className="special-dict-rating-label">官能度</span><RatingDots value={x.eroticism} /></div>
                    <div className="special-dict-rating-row"><span className="special-dict-rating-label">卑猥度</span><RatingDots value={x.vulgarity} /></div>
                    <div className="special-dict-rating-row"><span className="special-dict-rating-label">文学度</span><RatingDots value={x.literary} /></div>
                  </div>
                  {x.note && <div className="expr-dict-expr-note">{x.note}</div>}
                  <div className="expr-dict-expr-actions">
                    <button type="button" className="btn btn-sm btn-primary expr-dict-insert-btn"
                      onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal}
                      onClick={()=>copyText(x.text)}>コピー</button>
                    {onInsert && <button type="button" className="btn btn-sm expr-dict-insert-btn"
                      onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal}
                      onClick={()=>onInsert(x.text)}>文章へ挿入</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {toast && <div className="expr-dict-toast">{toast}</div>}
    </div>
  );
}

// ---- オノマトペ辞書（閲覧パネル）。表現辞典パネルと同じ下部ドロワー枠・タブ切替を共有する。
//      データはadultOnomatopoeiaとして完全分離。現象・カテゴリ・タグで絞り込む。 ----
function OnomatopoeiaPanel({ dictionary, onOpenEditor, onClose, onInsert, preventFocusSteal, style, dictTab, onDictTabChange }){
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);
  const entries = dictionary.entries || [];
  const q = query.trim().toLowerCase();

  const matchEntry = (entry) => {
    if(categoryFilter && !(entry.categories||[]).includes(categoryFilter)) return false;
    if(!q) return true;
    if((entry.text||'').toLowerCase().includes(q)) return true;
    if((entry.phenomenon||'').toLowerCase().includes(q)) return true;
    if((entry.tags||[]).some(t=>(t||'').toLowerCase().includes(q))) return true;
    if((entry.sources||[]).some(s=>(s||'').toLowerCase().includes(q))) return true;
    if((entry.note||'').toLowerCase().includes(q)) return true;
    return false;
  };
  const filtered = entries.filter(matchEntry);

  useEffect(()=>()=>{ if(toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);
  const showToast = (msg) => {
    setToast(msg);
    if(toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(()=>setToast(''), 1400);
  };
  const copyText = async (text) => {
    if(!text) return;
    const ok = await copyPlainText(text);
    showToast(ok ? `「${text}」をコピーしました` : 'コピーに失敗しました');
  };

  return (
    <div className="expr-dict-panel" style={style}>
      <DictTabSwitch active={dictTab} onChange={onDictTabChange} preventFocusSteal={preventFocusSteal} />
      <div className="expr-dict-head">
        <input type="text" className="expr-dict-search" placeholder="検索（語・現象・タグ・出典）"
          value={query} onChange={e=>setQuery(e.target.value)}
          onMouseDown={preventFocusSteal} onFocus={preventFocusSteal} />
        <button type="button" className="btn btn-sm" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={onOpenEditor}>
          <span className="label-full">辞典を編集</span><span className="label-short">編集</span>
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={onClose}>
          <span className="label-full">閉じる</span><span className="label-short">×</span>
        </button>
      </div>
      <div className="dict-cat-tabs" style={{padding:'8px 12px 0'}}>
        <button type="button" className={"dict-cat-tab"+(categoryFilter===''?' active':'')}
          onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={()=>setCategoryFilter('')}>すべて</button>
        {ONOMATOPOEIA_CATEGORIES.map(c=>(
          <button key={c} type="button" className={"dict-cat-tab"+(categoryFilter===c?' active':'')}
            onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={()=>setCategoryFilter(c)}>{c}</button>
        ))}
      </div>
      <div className="expr-dict-body">
        {entries.length===0 && <div className="empty-hint">まだオノマトペが登録されていません。「辞典を編集」から追加できます。</div>}
        {entries.length>0 && filtered.length===0 && <div className="empty-hint">「{query||categoryFilter}」に一致する語が見つかりません。</div>}
        {filtered.map(entry=>(
          <div className="expr-dict-entry" key={entry.id}>
            <div className="expr-dict-entry-head">
              <span className="expr-dict-entry-headword">{entry.text}</span>
              {(entry.categories||[]).map(c=><span className="expr-dict-entry-cat" key={c}>{c}</span>)}
            </div>
            {entry.phenomenon && <div className="expr-dict-entry-notes">{entry.phenomenon}</div>}
            {(entry.tags||[]).length>0 && (
              <div className="expr-dict-expr-main" style={{marginTop:4}}>
                {entry.tags.map(t=>(<span className="expr-dict-tag" key={t}>{t}</span>))}
              </div>
            )}
            {entry.note && <div className="expr-dict-entry-notes">{entry.note}</div>}
            <div className="expr-dict-expr-actions">
              <button type="button" className="btn btn-sm btn-primary expr-dict-insert-btn" style={{marginTop:6}}
                onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal}
                onClick={()=>copyText(entry.text)} disabled={!entry.text}>コピー</button>
              {onInsert && <button type="button" className="btn btn-sm expr-dict-insert-btn" style={{marginTop:6}}
                onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal}
                onClick={()=>onInsert(entry.text)} disabled={!entry.text}>文章へ挿入</button>}
            </div>
          </div>
        ))}
      </div>
      {toast && <div className="expr-dict-toast">{toast}</div>}
    </div>
  );
}

// ---- 濡れ場の進行表（参照パネル）。下書き中に、保存済みの進行表（行為カードの並び）を開いて見るためだけの閲覧用。
//      本文・下書きへの自動挿入は行わない（カードのコピーのみ）。管理（追加・並べ替え・削除）は「成人向け創作」の
//      シーン進行タブで行う。データはadultSceneFlow.plansとして保持し、既存のitems/phases/selectedItemIdsとは独立。 ----
function SceneFlowReferencePanel({ plans, onOpenEditor, onClose, onBack, onInsert, preventFocusSteal, style, activeId: activeIdProp, onActiveChange }){
  plans = plans || [];
  const [localActiveId, setLocalActiveId] = useState(plans[0] ? plans[0].id : '');
  const activeId = activeIdProp ? activeIdProp : localActiveId; // 親が保持していればそれを使う（編集から戻っても同じプランを開く）
  const setActiveId = (id) => { setLocalActiveId(id); if(onActiveChange) onActiveChange(id); };
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);
  useEffect(()=>()=>{ if(toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);
  const showToast = (msg) => {
    setToast(msg);
    if(toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(()=>setToast(''), 1400);
  };
  const active = plans.find(p=>p.id===activeId) || plans[0] || null;
  const copyText = async (text) => {
    if(!text) return;
    const ok = await copyPlainText(text);
    showToast(ok ? 'コピーしました' : 'コピーに失敗しました');
  };
  const copyPlan = () => { if(active) copyText(formatSceneFlowPlanForInsert(active)); };
  const insertPlan = () => {
    if(!active || !onInsert) return;
    onInsert(formatSceneFlowPlanForInsert(active));
    showToast(`「${active.title}」を文章へ挿入しました`);
  };
  return (
    <div className="expr-dict-panel" style={style}>
      <div className="expr-dict-head" style={{padding:'6px 8px'}}>
        <span className="expr-dict-entry-headword" style={{flex:'1 1 auto',whiteSpace:'nowrap'}}>シーン進行</span>
        {onBack && <button type="button" className="btn btn-sm" style={{whiteSpace:'nowrap'}} onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={onBack}>
          <span className="label-full">← 道具へ戻る</span><span className="label-short">← 道具</span>
        </button>}
        <button type="button" className="btn btn-sm" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={onOpenEditor}>
          <span className="label-full">作成・編集</span><span className="label-short">編集</span>
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={onClose}>
          <span className="label-full">閉じる</span><span className="label-short">×</span>
        </button>
      </div>
      {plans.length===0 ? (
        <div className="empty-hint" style={{margin:'0 12px 12px'}}>まだシーン進行がありません。「作成・編集」から作れます。</div>
      ) : (
        <>
          <div className="dict-cat-tabs" style={{padding:'8px 12px 0'}}>
            {plans.map(p=>(
              <button key={p.id} type="button" className={"dict-cat-tab"+(active&&active.id===p.id?' active':'')}
                onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={()=>setActiveId(p.id)}>{p.title||'無題のシーン進行'}{p.kind==='adult'?'（成人向け）':''}</button>
            ))}
          </div>
          <div className="expr-dict-body">
            {active && <>
              {active.beforeState && <div className="expr-dict-entry"><div className="expr-dict-entry-head"><span className="expr-dict-entry-cat">開始前の状態</span></div><div className="expr-dict-entry-notes">{active.beforeState}</div></div>}
              {active.cards.length===0 && <div className="empty-hint">まだカードがありません。</div>}
              {active.cards.map((c,i)=>(
                <div className="expr-dict-entry" key={c.id}>
                  <div className="expr-dict-entry-head"><span className="expr-dict-entry-cat">{i+1}</span><span className="expr-dict-entry-headword">{c.name||'（無題のカード）'}</span></div>
                  {c.memo && <div className="expr-dict-entry-notes">{c.memo}</div>}
                </div>
              ))}
              {active.afterState && <div className="expr-dict-entry"><div className="expr-dict-entry-head"><span className="expr-dict-entry-cat">終了後の状態</span></div><div className="expr-dict-entry-notes">{active.afterState}</div></div>}
              <div className="expr-dict-expr-actions">
                <button type="button" className="btn btn-sm" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={copyPlan}>コピー</button>
                {onInsert && <button type="button" className="btn btn-sm btn-primary" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={insertPlan}>文章のカーソル位置へ挿入</button>}
              </div>
            </>}
          </div>
        </>
      )}
      {toast && <div className="expr-dict-toast">{toast}</div>}
    </div>
  );
}
