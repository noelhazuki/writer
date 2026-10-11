// ---- オノマトペ辞書：対象×現象×性質から、音・様態・発声の候補を探す。 ----
function AdultOnomatopoeiaTab({ data, setData }){
  const entries=data.entries||[];
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('');
  const [vocality,setVocality]=useState('');
  const [editingId,setEditingId]=useState(null);
  const [draft,setDraft]=useState(null);
  const [importOpen,setImportOpen]=useState(false);
  const [importText,setImportText]=useState('');
  const [toast,setToast]=useState('');
  const toastTimerRef=useRef(null);
  useEffect(()=>()=>{ if(toastTimerRef.current) clearTimeout(toastTimerRef.current); },[]);
  const showToast=msg=>{ setToast(msg); if(toastTimerRef.current) clearTimeout(toastTimerRef.current); toastTimerRef.current=setTimeout(()=>setToast(''),1400); };
  const blankEntry=()=>({ id:uid('onom'),text:'',phenomenon:'',categories:'',sources:'',vocality:0,intentionality:'不問',strength:3,speed:3,length:'短',repetition:'単発',tags:'',note:'' });
  const csv=v=>Array.isArray(v)?v.join(', '):'';
  const fromCsv=v=>Array.from(new Set(String(v||'').split(/[,、]/).map(x=>x.trim()).filter(Boolean)));
  const filtered=entries.filter(x=>{
    const q=query.trim().toLowerCase();
    const hay=[x.text,x.phenomenon,x.note,...(x.categories||[]),...(x.sources||[]),...(x.tags||[])].join(' ').toLowerCase();
    return (!q||hay.includes(q)) && (!category||(x.categories||[]).includes(category)) && (vocality===''||x.vocality===Number(vocality));
  });
  const openNew=()=>{ setEditingId(null); setDraft(blankEntry()); };
  const openEdit=x=>{ setEditingId(x.id); setDraft({...x,categories:csv(x.categories),sources:csv(x.sources),tags:csv(x.tags)}); };
  const patchDraft=patch=>setDraft(d=>({...d,...patch}));
  const save=()=>{
    const text=(draft.text||'').trim();
    if(!text){ showToast('表記を入力してください'); return; }
    const cleaned=normalizeAdultOnomatopoeia({entries:[{...draft,text,categories:fromCsv(draft.categories),sources:fromCsv(draft.sources),tags:fromCsv(draft.tags)}]}).entries[0];
    setData(d=>({ ...d, entries:editingId ? d.entries.map(x=>x.id===editingId?cleaned:x) : [...d.entries,cleaned] }));
    setDraft(null); setEditingId(null); showToast(editingId?'更新しました':'追加しました');
  };
  const remove=()=>{
    if(!editingId||!confirm(`「${draft.text}」を削除しますか？`)) return;
    setData(d=>({...d,entries:d.entries.filter(x=>x.id!==editingId)})); setDraft(null); setEditingId(null);
  };
  const copyEntry=async text=>{ const ok=await copyPlainText(text); showToast(ok?`「${text}」をコピーしました`:'コピーに失敗しました'); };
  const importCheck=useMemo(()=>{
    if(!importText.trim()) return {error:'',valid:[],duplicates:[],invalid:[]};
    try{
      const parsed=JSON.parse(importText);
      const rows=Array.isArray(parsed)?parsed:(parsed&&Array.isArray(parsed.entries)?parsed.entries:null);
      if(!rows) return {error:'JSONは配列、または { "entries": [...] } の形にしてください',valid:[],duplicates:[],invalid:[]};
      const existing=new Set(entries.map(x=>(x.text||'').trim()).filter(Boolean));
      const seen=new Set(); const valid=[]; const duplicates=[]; const invalid=[];
      rows.forEach((raw,i)=>{
        if(!raw||typeof raw!=='object'||Array.isArray(raw)){ invalid.push(`${i+1}件目：データ形式が不正です`); return; }
        const text=String(raw.text==null?'':raw.text).trim();
        if(!text){ invalid.push(`${i+1}件目：textが空です`); return; }
        if(existing.has(text)||seen.has(text)){ duplicates.push(text); return; }
        seen.add(text);
        const normalized=normalizeAdultOnomatopoeia({entries:[{...raw,id:uid('onom'),text}]}).entries[0];
        if(normalized) valid.push(normalized); else invalid.push(`${i+1}件目：登録できません`);
      });
      return {error:'',valid,duplicates,invalid};
    }catch(e){ return {error:'JSONの構文を確認してください：'+e.message,valid:[],duplicates:[],invalid:[]}; }
  },[importText,entries]);
  const runImport=()=>{
    if(importCheck.error||importCheck.valid.length===0) return;
    setData(d=>({...d,entries:[...d.entries,...importCheck.valid]}));
    const count=importCheck.valid.length; setImportOpen(false); setImportText('');
    showToast(`${count}件を追加しました`);
  };
  return (
    <div>
      <p className="adult-tab-desc">音だけでなく、現象を文章上どう表すかを探す辞書です。複数分類に対応し、「チュッ」のような接触音・口音・発声の境界語もそのまま登録できます。</p>
      <div className="onomatopoeia-toolbar">
        <input type="text" value={query} onChange={e=>setQuery(e.target.value)} placeholder="表記・現象・発生源・タグを検索" />
        <select value={category} onChange={e=>setCategory(e.target.value)}><option value="">すべての分類</option>{ONOMATOPOEIA_CATEGORIES.map(x=><option key={x} value={x}>{x}</option>)}</select>
        <select value={vocality} onChange={e=>setVocality(e.target.value)}><option value="">発声性：すべて</option>{ONOMATOPOEIA_VOCALITY_LABELS.map((x,i)=><option key={x} value={i}>{i}：{x}</option>)}</select>
        <button type="button" className="btn" onClick={()=>setImportOpen(true)}>JSON一括登録</button>
        <button type="button" className="btn btn-primary" onClick={openNew}>＋ 追加</button>
      </div>
      <div className="dict-list-head"><span>候補</span><span className="dict-list-count">{filtered.length}件</span></div>
      <div className="onomatopoeia-list">
        {filtered.map(x=><button type="button" className="onomatopoeia-card" key={x.id} onClick={()=>openEdit(x)}>
          <div className="onomatopoeia-card-head"><span className="onomatopoeia-card-text">{x.text}</span><span className="dict-list-count">強{x.strength}・速{x.speed}</span></div>
          <div className="onomatopoeia-card-phenomenon">{x.phenomenon||'現象未設定'}</div>
          <div className="onomatopoeia-badges">
            {(x.categories||[]).map(v=><span className="onomatopoeia-badge" key={v}>{v}</span>)}
            <span className="onomatopoeia-badge onomatopoeia-badge-vocal">発声性{x.vocality}：{ONOMATOPOEIA_VOCALITY_LABELS[x.vocality]}</span>
            {(x.sources||[]).map(v=><span className="onomatopoeia-badge" key={'s'+v}>{v}</span>)}
            <span className="onomatopoeia-badge">{x.repetition}</span><span className="onomatopoeia-badge">{x.length}</span>
          </div>
        </button>)}
      </div>
      {filtered.length===0&&<div className="empty-hint">条件に合う候補がありません。</div>}
      {draft&&<Modal title={editingId?`オノマトペ編集：${draft.text||'無題'}`:'オノマトペを追加'} onClose={()=>{setDraft(null);setEditingId(null);}} wide>
        <div className="onomatopoeia-edit-grid">
          <div className="dict-field-block"><label className="dict-field-label">表記</label><input type="text" value={draft.text} onChange={e=>patchDraft({text:e.target.value})} placeholder="例：チュッ" /></div>
          <div className="dict-field-block"><label className="dict-field-label">現象</label><input type="text" value={draft.phenomenon} onChange={e=>patchDraft({phenomenon:e.target.value})} placeholder="例：唇が触れる、または口で音を作る" /></div>
          <div className="dict-field-block"><label className="dict-field-label">分類（複数・カンマ区切り）</label><input type="text" value={draft.categories} onChange={e=>patchDraft({categories:e.target.value})} placeholder="口音, 身体音, 発声" list="onomatopoeia-category-list" /><datalist id="onomatopoeia-category-list">{ONOMATOPOEIA_CATEGORIES.map(x=><option key={x} value={x} />)}</datalist></div>
          <div className="dict-field-block"><label className="dict-field-label">発生源（複数・カンマ区切り）</label><input type="text" value={draft.sources} onChange={e=>patchDraft({sources:e.target.value})} placeholder="口, 唇" /></div>
          <div className="dict-field-block"><label className="dict-field-label">発声性</label><select value={draft.vocality} onChange={e=>patchDraft({vocality:Number(e.target.value)})}>{ONOMATOPOEIA_VOCALITY_LABELS.map((x,i)=><option key={x} value={i}>{i}：{x}</option>)}</select></div>
          <div className="dict-field-block"><label className="dict-field-label">意図性</label><select value={draft.intentionality} onChange={e=>patchDraft({intentionality:e.target.value})}>{ONOMATOPOEIA_INTENTIONALITY.map(x=><option key={x}>{x}</option>)}</select></div>
          <div className="dict-field-block"><label className="dict-field-label">強さ：{draft.strength}</label><input type="range" min="1" max="5" value={draft.strength} onChange={e=>patchDraft({strength:Number(e.target.value)})} /></div>
          <div className="dict-field-block"><label className="dict-field-label">速さ：{draft.speed}</label><input type="range" min="1" max="5" value={draft.speed} onChange={e=>patchDraft({speed:Number(e.target.value)})} /></div>
          <div className="dict-field-block"><label className="dict-field-label">長さ</label><select value={draft.length} onChange={e=>patchDraft({length:e.target.value})}>{ONOMATOPOEIA_LENGTHS.map(x=><option key={x}>{x}</option>)}</select></div>
          <div className="dict-field-block"><label className="dict-field-label">反復</label><select value={draft.repetition} onChange={e=>patchDraft({repetition:e.target.value})}>{ONOMATOPOEIA_REPETITIONS.map(x=><option key={x}>{x}</option>)}</select></div>
          <div className="dict-field-block span-all"><label className="dict-field-label">検索タグ（カンマ区切り）</label><input type="text" value={draft.tags} onChange={e=>patchDraft({tags:e.target.value})} placeholder="接触, キス, 口音" /></div>
          <div className="dict-field-block span-all"><label className="dict-field-label">メモ</label><textarea rows="3" value={draft.note} onChange={e=>patchDraft({note:e.target.value})} /></div>
        </div>
        <div className="modal-actions" style={{justifyContent:'space-between'}}>
          <div>{editingId&&<><button type="button" className="btn" onClick={()=>copyEntry(draft.text)}>コピー</button> <button type="button" className="btn btn-danger" onClick={remove}>削除</button></>}</div>
          <div><button type="button" className="btn" onClick={()=>{setDraft(null);setEditingId(null);}}>キャンセル</button> <button type="button" className="btn btn-primary" onClick={save}>保存</button></div>
        </div>
      </Modal>}
      {importOpen&&<Modal title="オノマトペJSON一括登録" onClose={()=>setImportOpen(false)} wide>
        <p className="adult-tab-desc">JSON配列、または <code>{'{ "entries": [...] }'}</code> を貼り付けます。同じ表記の既存語と、貼り付け内の重複語はスキップします。</p>
        <textarea rows="14" value={importText} onChange={e=>setImportText(e.target.value)} style={{width:'100%',fontFamily:'ui-monospace,monospace',fontSize:'12px'}} placeholder={'[\n  {\n    "text": "ぬぷっ",\n    "phenomenon": "柔らかい抵抗を伴って出入りする",\n    "categories": ["物理音", "擬態"],\n    "sources": ["接触面"],\n    "vocality": 0,\n    "intentionality": "不問",\n    "strength": 2,\n    "speed": 3,\n    "length": "短",\n    "repetition": "単発",\n    "tags": ["湿潤", "出入り"],\n    "note": ""\n  }\n]'} />
        {importCheck.error&&<div className="empty-hint" style={{color:'var(--danger)'}}>{importCheck.error}</div>}
        {!importCheck.error&&importText.trim()&&<div className="onomatopoeia-badges" style={{marginTop:10}}>
          <span className="onomatopoeia-badge">追加可能 {importCheck.valid.length}件</span>
          <span className="onomatopoeia-badge">重複スキップ {importCheck.duplicates.length}件</span>
          <span className="onomatopoeia-badge">不正 {importCheck.invalid.length}件</span>
        </div>}
        {importCheck.duplicates.length>0&&<div className="adult-tab-desc" style={{marginTop:8}}>重複：{importCheck.duplicates.join('、')}</div>}
        {importCheck.invalid.length>0&&<div className="adult-tab-desc" style={{marginTop:8,color:'var(--danger)'}}>{importCheck.invalid.join(' ／ ')}</div>}
        <div className="modal-actions"><button type="button" className="btn" onClick={()=>setImportOpen(false)}>キャンセル</button><button type="button" className="btn btn-primary" onClick={runImport} disabled={!!importCheck.error||importCheck.valid.length===0}>{importCheck.valid.length}件を登録</button></div>
      </Modal>}
      {toast&&<div className="expr-dict-toast" style={{position:'fixed',bottom:'76px'}}>{toast}</div>}
    </div>
  );
}

