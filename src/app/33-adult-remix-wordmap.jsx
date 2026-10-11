// ---- 語句魔改造タブ：単語パーツを構文に差し込み、普通は隣り合わない語彙を衝突させて名詞句を作る。 ----
function AdultPhraseRemixTab({ remixData, setRemixData }){
  const patterns = remixData.patterns || [];
  const parts = remixData.parts || [];
  const [patternId, setPatternId] = useState(patterns[0] ? patterns[0].id : '');
  const [variantId, setVariantId] = useState('');
  const [selected, setSelected] = useState({}); // role -> part id
  const [concepts, setConcepts] = useState({}); // role -> 元概念
  const [locks, setLocks] = useState({});       // role -> boolean
  const [partsOpen, setPartsOpen] = useState(false);
  const [partRole, setPartRole] = useState('function');
  const [newPartText, setNewPartText] = useState('');
  const [newPartConcept, setNewPartConcept] = useState('');
  const [newPartDomains, setNewPartDomains] = useState('');
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);

  useEffect(()=>()=>{ if(toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);
  const showToast = (msg) => {
    setToast(msg);
    if(toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(()=>setToast(''), 1400);
  };

  const pattern = patterns.find(p=>p.id===patternId) || patterns[0] || null;
  const variants = pattern && Array.isArray(pattern.variants) && pattern.variants.length
    ? pattern.variants
    : (pattern ? [{id:pattern.id+'-default',name:'標準',segments:pattern.segments||[]}] : []);
  const variant = variants.find(v=>v.id===variantId) || variants[0] || null;
  const roles = pattern ? (Array.isArray(pattern.roles) && pattern.roles.length
    ? pattern.roles
    : Array.from(new Set((variant ? variant.segments : []).map(s=>s.role).filter(Boolean)))) : [];

  const partById = useMemo(()=>{
    const m = new Map(); parts.forEach(p=>m.set(p.id,p)); return m;
  }, [parts]);

  const conceptsForRole = (role) => Array.from(new Set(
    parts.filter(p=>p.role===role && (p.text||'').trim()).map(p=>(p.concept||p.text||'').trim()).filter(Boolean)
  ));
  const candidatesForRole = (role, conceptValue) => parts.filter(p=>{
    if(p.role!==role || !(p.text||'').trim()) return false;
    if(!conceptValue) return true;
    return (p.concept||p.text||'').trim()===conceptValue;
  });
  const randomPartId = (role, currentId, conceptValue) => {
    const candidates = candidatesForRole(role, conceptValue);
    if(!candidates.length) return null;
    const pool = candidates.length>1 ? candidates.filter(p=>p.id!==currentId) : candidates;
    return pool[Math.floor(Math.random()*pool.length)].id;
  };

  const phraseFrom = (v, sel) => {
    if(!v) return '';
    return (v.segments||[]).map(seg=>{
      if(seg.literal!==undefined) return seg.literal;
      const part = partById.get(sel[seg.role]);
      const text = part ? part.text : '□';
      return (seg.prefix||'') + text + (seg.suffix||'');
    }).join('');
  };

  // 意味パターンを変えた時は、役割ごとに元概念を維持できるものは維持し、足りない役割だけ初期化する。
  useEffect(()=>{
    if(!pattern) return;
    const nextConcepts = {};
    const nextSelected = {};
    roles.forEach(role=>{
      const roleConcepts = conceptsForRole(role);
      const prevConcept = concepts[role];
      const concept = prevConcept && roleConcepts.includes(prevConcept) ? prevConcept : (roleConcepts[0]||'');
      nextConcepts[role] = concept;
      const prevPart = partById.get(selected[role]);
      if(prevPart && prevPart.role===role && (!concept || (prevPart.concept||prevPart.text)===concept)) nextSelected[role]=prevPart.id;
      else nextSelected[role]=randomPartId(role,null,concept);
    });
    setConcepts(nextConcepts);
    setSelected(nextSelected);
    setLocks({});
    setVariantId(variants[0] ? variants[0].id : '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patternId]);

  // 初回だけ語順を標準へ合わせる。
  useEffect(()=>{
    if(!variantId && variants[0]) setVariantId(variants[0].id);
  }, [variantId, variants]);

  // 部品辞書の変更で選択中の部品が消えた時だけ、同じ元概念から補う。
  useEffect(()=>{
    if(!pattern) return;
    setSelected(prev=>{
      let changed=false;
      const next={...prev};
      roles.forEach(role=>{
        const p=partById.get(next[role]);
        const concept=concepts[role]||'';
        if(!p || p.role!==role || (concept && (p.concept||p.text)!==concept)){
          next[role]=randomPartId(role,null,concept); changed=true;
        }
      });
      return changed?next:prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts.length]);

  const currentPhrase = phraseFrom(variant, selected);
  const allVariantPhrases = variants.map(v=>({ id:v.id, name:v.name, text:phraseFrom(v,selected) }));

  const pushRecent = (text, pid, vid) => {
    if(!text || text.includes('□')) return;
    setRemixData(d=>{
      const sameRemoved = (d.recentPhrases||[]).filter(x=>x.text!==text);
      return { ...d, recentPhrases:[{id:uid('phrase'),text,patternId:pid,variantId:vid||'',createdAt:Date.now()}, ...sameRemoved].slice(0,20) };
    });
  };

  const changeConcept = (role, concept) => {
    setConcepts(prev=>({...prev,[role]:concept}));
    const nextId=randomPartId(role,null,concept);
    setSelected(prev=>({...prev,[role]:nextId}));
  };

  const rerollAll = () => {
    if(!pattern) return;
    const next={...selected};
    roles.forEach(role=>{
      if(locks[role]) return;
      next[role]=randomPartId(role,next[role],concepts[role]);
    });
    setSelected(next);
    pushRecent(phraseFrom(variant,next),pattern.id,variant?variant.id:'');
  };

  const rerollOne = (role) => {
    const next={...selected,[role]:randomPartId(role,selected[role],concepts[role])};
    setSelected(next);
    pushRecent(phraseFrom(variant,next),pattern?pattern.id:'',variant?variant.id:'');
  };

  const randomizeVariant = () => {
    if(!variants.length) return;
    const pool=variants.length>1?variants.filter(v=>v.id!==variantId):variants;
    const next=pool[Math.floor(Math.random()*pool.length)];
    setVariantId(next.id);
    pushRecent(phraseFrom(next,selected),pattern?pattern.id:'',next.id);
  };

  const randomizePattern = () => {
    if(!patterns.length) return;
    const pool=patterns.length>1?patterns.filter(p=>p.id!==patternId):patterns;
    const nextPattern=pool[Math.floor(Math.random()*pool.length)];
    setPatternId(nextPattern.id);
  };

  const copyPhrase = async (text) => {
    const ok = await copyPlainText(text);
    showToast(ok ? `「${text}」をコピーしました` : 'コピーに失敗しました');
  };

  const savePhrase = () => {
    if(!currentPhrase || currentPhrase.includes('□')) return;
    setRemixData(d=>{
      if((d.savedPhrases||[]).some(x=>x.text===currentPhrase)) return d;
      return { ...d, savedPhrases:[{id:uid('phrase'),text:currentPhrase,patternId:pattern?pattern.id:'',variantId:variant?variant.id:'',createdAt:Date.now()}, ...(d.savedPhrases||[])] };
    });
    showToast('保存しました');
  };

  const deleteSaved = (id) => setRemixData(d=>({ ...d, savedPhrases:(d.savedPhrases||[]).filter(x=>x.id!==id) }));

  const addPart = () => {
    const text=newPartText.trim();
    if(!text) return;
    if(parts.some(p=>p.role===partRole && p.text===text)){ showToast('同じ部品がすでにあります'); return; }
    const domains=newPartDomains.split(',').map(x=>x.trim()).filter(Boolean);
    const concept=newPartConcept.trim() || text;
    setRemixData(d=>({ ...d, parts:[...d.parts,makePhrasePart(partRole,text,domains,[],concept)] }));
    setNewPartText(''); setNewPartConcept(''); setNewPartDomains('');
  };
  const removePart = (id) => setRemixData(d=>({ ...d, parts:d.parts.filter(p=>p.id!==id) }));
  const mergeStarterParts = () => {
    const starter=defaultAdultPhraseRemix().parts;
    setRemixData(d=>{
      const seen=new Set(d.parts.map(p=>p.role+'\n'+p.text));
      const add=starter.filter(p=>!seen.has(p.role+'\n'+p.text)).map(p=>({...p,id:uid('phrasepart')}));
      return { ...d, parts:[...d.parts,...add] };
    });
    showToast('不足している初期部品を追加しました');
  };

  const currentRoleParts=parts.filter(p=>p.role===partRole);

  return (
    <div className="adult-phrase-remix">
      <p className="adult-tab-desc">
        まず「性器」「挟む・保持」「胸」のような元概念を決め、その意味を保った候補から語を選びます。
        その後に語順・構文だけを入れ替えられるので、意味を見失わずに複合語を魔改造できます。
      </p>

      <div className="phrase-remix-control-grid">
        <div className="dict-field-block" style={{marginBottom:0}}>
          <label className="dict-field-label">意味パターン</label>
          <select value={pattern?pattern.id:''} onChange={e=>setPatternId(e.target.value)}>
            {patterns.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="dict-field-block" style={{marginBottom:0}}>
          <label className="dict-field-label">語順・構文</label>
          <select value={variant?variant.id:''} onChange={e=>{
            const v=variants.find(x=>x.id===e.target.value);
            setVariantId(e.target.value);
            if(v) pushRecent(phraseFrom(v,selected),pattern?pattern.id:'',v.id);
          }}>
            {variants.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="phrase-remix-control-actions">
          <button type="button" className="btn btn-sm" onClick={randomizeVariant}>語順だけ魔改造</button>
          <button type="button" className="btn btn-sm" onClick={randomizePattern}>意味パターン変更</button>
          <button type="button" className="btn btn-sm" onClick={()=>setPartsOpen(true)}>部品辞書</button>
        </div>
      </div>

      <div className="phrase-remix-result">
        <div className="dict-field-label">生成語句</div>
        <div className="phrase-remix-result-text">{currentPhrase || '部品を登録してください'}</div>
        <div className="phrase-remix-result-actions">
          <button type="button" className="btn btn-primary" onClick={rerollAll} disabled={!pattern}>⚗️ 語だけ魔改造</button>
          <button type="button" className="btn" onClick={()=>copyPhrase(currentPhrase)} disabled={!currentPhrase || currentPhrase.includes('□')}>コピー</button>
          <button type="button" className="btn" onClick={savePhrase} disabled={!currentPhrase || currentPhrase.includes('□')}>☆ 保存</button>
        </div>
      </div>

      {allVariantPhrases.length>1 && (
        <div>
          <div className="dict-list-head"><span>同じ単語で語順違い</span><span className="dict-list-count">{allVariantPhrases.length}通り</span></div>
          <div className="phrase-remix-variants">
            {allVariantPhrases.map(v=>(
              <button key={v.id} type="button" className={"phrase-remix-variant"+(variant&&variant.id===v.id?' active':'')} onClick={()=>{
                setVariantId(v.id); pushRecent(v.text,pattern?pattern.id:'',v.id);
              }}>
                <span className="phrase-remix-variant-name">{v.name}</span>
                <span className="phrase-remix-variant-text">{v.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {pattern && (
        <div className="phrase-remix-slots">
          {roles.map(role=>{
            const part=partById.get(selected[role]);
            const roleConcepts=conceptsForRole(role);
            const candidates=candidatesForRole(role,concepts[role]);
            return (
              <div className="phrase-remix-slot phrase-remix-slot-concept" key={role}>
                <div className="phrase-remix-slot-label">{ADULT_PHRASE_ROLE_LABELS[role]||role}</div>
                <select className="phrase-remix-concept-select" value={concepts[role]||''} onChange={e=>changeConcept(role,e.target.value)} title="元の意味">
                  {roleConcepts.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                <select className="phrase-remix-word-select" value={selected[role]||''} onChange={e=>setSelected(prev=>({...prev,[role]:e.target.value}))}>
                  {candidates.map(p=><option key={p.id} value={p.id}>{p.text}</option>)}
                </select>
                <button type="button" className={"phrase-remix-slot-btn"+(locks[role]?' locked':'')} onClick={()=>setLocks(l=>({...l,[role]:!l[role]}))} title={locks[role]?'ロック解除':'この語を固定'}>{locks[role]?'🔒':'🔓'}</button>
                <button type="button" className="phrase-remix-slot-btn" onClick={()=>rerollOne(role)} disabled={candidates.length===0 || locks[role]} title="同じ意味の候補だけ変更">↻</button>
              </div>
            );
          })}
        </div>
      )}

      {(remixData.savedPhrases||[]).length>0 && (
        <div>
          <div className="dict-list-head"><span>保存した語句</span><span className="dict-list-count">{remixData.savedPhrases.length}件</span></div>
          <div className="phrase-remix-history">
            {remixData.savedPhrases.slice(0,30).map(x=>(
              <div className="phrase-remix-history-row" key={x.id}>
                <div className="phrase-remix-history-text">{x.text}</div>
                <button type="button" className="btn btn-sm" onClick={()=>copyPhrase(x.text)}>コピー</button>
                <button type="button" className="btn btn-sm btn-danger" onClick={()=>deleteSaved(x.id)}>削除</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(remixData.recentPhrases||[]).length>0 && (
        <CollapsibleSection title="最近の生成" badge={remixData.recentPhrases.length}>
          <div className="phrase-remix-history">
            {remixData.recentPhrases.map(x=>(
              <div className="phrase-remix-history-row" key={x.id}>
                <div className="phrase-remix-history-text">{x.text}</div>
                <button type="button" className="btn btn-sm" onClick={()=>copyPhrase(x.text)}>コピー</button>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {partsOpen && (
        <Modal title="語句魔改造の部品辞書" onClose={()=>setPartsOpen(false)} wide>
          <p className="adult-tab-desc">各単語に「元概念」を付けます。同じ元概念の語だけが候補になるため、意味を保ったまま語感だけ変えられます。</p>
          <div className="phrase-part-role-tabs">
            {ADULT_PHRASE_ROLE_ORDER.map(role=>(
              <button key={role} type="button" className={"adult-tools-tab"+(partRole===role?' active':'')} onClick={()=>setPartRole(role)}>{ADULT_PHRASE_ROLE_LABELS[role]}</button>
            ))}
          </div>
          <div className="phrase-part-add-grid">
            <input type="text" value={newPartText} onChange={e=>setNewPartText(e.target.value)} placeholder="単語（例：噴射）" />
            <input type="text" value={newPartConcept} onChange={e=>setNewPartConcept(e.target.value)} placeholder="元概念（例：飛ぶ・放出）" />
            <input type="text" value={newPartDomains} onChange={e=>setNewPartDomains(e.target.value)} placeholder="意味領域（工業, 設備 など）" />
            <button type="button" className="btn btn-primary" onClick={addPart}>追加</button>
          </div>
          <div className="phrase-part-list">
            {currentRoleParts.length===0 && <div className="empty-hint">この分類にはまだ部品がありません。</div>}
            {currentRoleParts.map(p=>(
              <div className="phrase-part-row" key={p.id}>
                <div className="phrase-part-row-main">
                  <div className="phrase-part-row-text">{p.text}</div>
                  <div className="phrase-part-row-meta">元概念：{p.concept||p.text}{(p.domains||[]).length>0?` ／ 意味領域：${p.domains.join(' / ')}`:''}</div>
                </div>
                <button type="button" className="btn btn-sm btn-danger" onClick={()=>removePart(p.id)}>削除</button>
              </div>
            ))}
          </div>
          <div className="modal-actions" style={{justifyContent:'space-between'}}>
            <button type="button" className="btn" onClick={mergeStarterParts}>不足している初期部品を追加</button>
            <button type="button" className="btn btn-primary" onClick={()=>setPartsOpen(false)}>閉じる</button>
          </div>
        </Modal>
      )}

      {toast && <div className="expr-dict-toast" style={{position:'fixed',bottom:'76px'}}>{toast}</div>}
    </div>
  );
}

// ---- 語句マップタブ：横＝婉曲←→直接（directness）、縦＝上品←→俗（vulgarity）の2軸に表現を配置し、視覚的に比較する。
//      「どの語が正しいか」を決めるものではなく、温度感を見比べるための資料。タップで詳細表示＋コピー。 ----
function AdultWordMapTab({ adultDictionary }){
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

  const [selectedId, setSelectedId] = useState(null);
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

  const selected = selectedId ? allExpressions.find(x=>x.id===selectedId) : null;

  const posOf = (x) => ({
    left: ((clamp(x.directness,1,5)-1) / 4 * 100) + '%',
    top: ((clamp(x.vulgarity,1,5)-1) / 4 * 100) + '%',
  });

  return (
    <div className="adult-map-tab">
      <p className="adult-tab-desc">
        同じ意味の表現でも「どの辺の温度なのか」を見比べるための資料です。どの語が正しいかを決めるものではありません。
      </p>
      {allExpressions.length===0 ? (
        <div className="empty-hint">まだ「表現辞典」に成人向け表現が登録されていません。先に表現辞典タブから登録してください。</div>
      ) : (
        <>
          <div className="adult-map-wrap">
            <div className="adult-map-axis-label adult-map-axis-top">上品</div>
            <div className="adult-map-axis-label adult-map-axis-bottom">俗</div>
            <div className="adult-map-axis-label adult-map-axis-left">婉曲</div>
            <div className="adult-map-axis-label adult-map-axis-right">直接</div>
            <div className="adult-map-plot">
              {allExpressions.map(x=>(
                <button type="button" key={x.id} className={"adult-map-point"+(selectedId===x.id?' active':'')}
                  style={posOf(x)} onClick={()=>setSelectedId(x.id)} title={x.text}>{x.text}</button>
              ))}
            </div>
          </div>
          {selected && (
            <div className="adult-map-detail">
              <div className="dict-expr-card-text">{selected.text}</div>
              <div className="dict-card-sub">{selected.concept}{selected.category?`（${selected.category}）`:''}</div>
              <AdultRatingBadges x={selected} />
              {selected.note && <div className="expr-dict-entry-notes">{selected.note}</div>}
              <button type="button" className="btn btn-sm btn-primary" style={{marginTop:6}} onClick={()=>copyText(selected.text)}>コピー</button>
            </div>
          )}
        </>
      )}
      {toast && <div className="expr-dict-toast" style={{position:'fixed', bottom:'76px'}}>{toast}</div>}
    </div>
  );
}

