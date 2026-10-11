// ---- 進行表（採用仕様）：行為カードを自由に追加・並べ替え・繰り返し・削除できる道具。
//      開始・終了の位置は固定しない。カードは名称＋短いメモのみ。心情等はカードごとに必須にしない。
//      シーン全体には任意入力の「行為前の状態」「行為後の状態」だけを置ける。複数保存し、下書きから参照できる。 ----
// ---- シーン進行（共通）：行為カードを自由に追加・並べ替え・繰り返し・削除できる道具。
//      開始・終了の位置は固定しない。カードは短い見出し＋自由記述メモのみ。心情はカードごとに必須にしない。
//      シーン全体には任意入力の「開始前の状態」「終了後の状態」だけを置ける。複数保存し、下書きから参照・挿入できる。
//      全年齢・成人向けはkind('general'|'adult')で区別するだけで、データ構造・操作方法は完全に同じ。
//      data/setDataはアプリ本体のトップレベルdata（sceneFlowPlansを持つ）を受け取る。
function SceneFlowPlansEditor({data,setData,kindFilter,defaultKind,allowKindSwitch,adultLibrary,onInsertToDraft,insertLabel,initialActiveId,onActiveChange}){
  const allPlans = data.sceneFlowPlans||[];
  const plans = kindFilter && kindFilter!=='all' ? allPlans.filter(p=>p.kind===kindFilter) : allPlans;
  const [activeId,setActiveId]=useState((initialActiveId && plans.some(p=>p.id===initialActiveId)) ? initialActiveId : (plans[0]?plans[0].id:''));
  const active = allPlans.find(p=>p.id===activeId) || plans[0] || null;
  useEffect(()=>{ if(onActiveChange && active) onActiveChange(active.id); },[active&&active.id]); // 親（執筆画面）と選択中プランを共有する
  const [cardDraft,setCardDraft]=useState(null); // {cardId, name, memo}
  const [candidateOpen,setCandidateOpen]=useState(false);
  const [candidateQuery,setCandidateQuery]=useState('');
  const [toast,setToast]=useState(''); const toastTimerRef=useRef(null);
  useEffect(()=>()=>{if(toastTimerRef.current)clearTimeout(toastTimerRef.current);},[]);
  const showToast=msg=>{setToast(msg);if(toastTimerRef.current)clearTimeout(toastTimerRef.current);toastTimerRef.current=setTimeout(()=>setToast(''),1400);};

  const setActivePlanId=id=>setActiveId(id);
  const addPlan=()=>{
    const p=makeFlowPlan(`シーン進行${allPlans.length+1}`, defaultKind||'general');
    setData(d=>({...d,sceneFlowPlans:[...(d.sceneFlowPlans||[]),p]}));
    setActiveId(p.id);
  };
  const patchActivePlan=patch=>setData(d=>({...d,sceneFlowPlans:d.sceneFlowPlans.map(p=>p.id===(active&&active.id)?{...p,...patch}:p)}));
  const deletePlan=()=>{
    if(!active||!confirm(`「${active.title||'このシーン進行'}」を削除しますか？`))return;
    setData(d=>({...d,sceneFlowPlans:d.sceneFlowPlans.filter(p=>p.id!==active.id)}));
    setActiveId('');
  };
  const duplicatePlan=()=>{
    if(!active)return;
    const copy={...active,id:uid('flowplan'),title:active.title+'（複製）',cards:active.cards.map(c=>({...c,id:uid('flowcard')}))};
    setData(d=>({...d,sceneFlowPlans:[...d.sceneFlowPlans,copy]}));
    setActiveId(copy.id);
  };

  // カードは追加した時点でそのまま一覧に並ぶ（＝繰り返し追加が自由）。見出し・メモはタップして後から入力できる。
  const addCard=()=>{ if(!active)return; patchActivePlan({cards:[...active.cards,makeFlowCard('','')]}); };
  const openCard=c=>setCardDraft({cardId:c.id,name:c.name,memo:c.memo});
  const saveCard=()=>{
    if(!cardDraft||!active)return;
    patchActivePlan({cards:active.cards.map(c=>c.id===cardDraft.cardId?{...c,name:cardDraft.name,memo:cardDraft.memo}:c)});
    setCardDraft(null);
  };
  const deleteCard=cardId=>{
    if(!active||!confirm('このカードを削除しますか？'))return;
    patchActivePlan({cards:active.cards.filter(c=>c.id!==cardId)});
    if(cardDraft&&cardDraft.cardId===cardId)setCardDraft(null);
  };
  // 「繰り返し」＝同じカードをもう1枚、直後に複製する（何度使ってもよい）
  const duplicateCard=i=>{
    if(!active)return;
    const c=active.cards[i];
    const copy={...c,id:uid('flowcard')};
    const next=[...active.cards];next.splice(i+1,0,copy);
    patchActivePlan({cards:next});
  };
  const moveCard=(i,delta)=>{
    if(!active)return;
    const next=[...active.cards],to=i+delta;
    if(to<0||to>=next.length)return;
    [next[i],next[to]]=[next[to],next[i]];
    patchActivePlan({cards:next});
  };
  const copyPlan=async()=>{
    if(!active)return;
    const ok=await copyPlainText(formatSceneFlowPlanForInsert(active));
    showToast(ok?'シーン進行をコピーしました':'コピーに失敗しました');
  };
  const insertPlan=()=>{
    if(!active||!onInsertToDraft)return;
    onInsertToDraft(active);
  };

  // 成人向け候補（adultSceneFlow.items、既存データ）からカード名・メモへ取り込む。adult系プランのみ。
  const candidateItems = (adultLibrary&&adultLibrary.items)||[];
  const candidatePhaseName = id=>((adultLibrary&&adultLibrary.phases)||[]).find(p=>p.id===id)?.name||'';
  const q=candidateQuery.trim().toLowerCase();
  const filteredCandidates = candidateItems.filter(x=>!q||[x.text,x.note,candidatePhaseName(x.phaseId)].join(' ').toLowerCase().includes(q));
  const pickCandidate=(item)=>{
    setCardDraft(d=>({...d,name:item.text,memo:item.note||d.memo}));
    setCandidateOpen(false);
  };

  return <div>
    <p className="adult-tab-desc">「開始→最中→終了」の決まった順番はありません。行為カードを自由に追加し、好きな順に並べ替え・繰り返し・削除できます。開始・終了を必須にはしません。文章の「シーン進行」からすぐ開いて、そのまま文章へ挿入できます。</p>
    <div className="scene-workspace">
      <aside className="scene-list-panel">
        <div className="dict-list-head"><span>シーン進行</span><button type="button" className="btn btn-sm btn-primary" onClick={addPlan}>＋</button></div>
        <div className="scene-list">
          {plans.map(p=>(
            <button key={p.id} type="button" className={'scene-list-item'+(active&&active.id===p.id?' active':'')} onClick={()=>setActivePlanId(p.id)}>
              <div className="scene-list-title">{p.title||'無題のシーン進行'}{p.kind==='adult'&&<span className="expr-dict-tag" style={{marginLeft:6}}>成人向け</span>}</div>
              <div className="scene-list-sub">{p.cards.length}枚</div>
            </button>
          ))}
          {!plans.length && <div className="empty-hint">「＋」から作成できます。</div>}
        </div>
      </aside>
      <section className="scene-editor-panel">
        {!active ? <div className="empty-hint">左の「＋」からシーン進行を作成してください。</div> : <>
          <div className="dict-field-block span-all"><label className="dict-field-label">シーン名</label><input value={active.title} onChange={e=>patchActivePlan({title:e.target.value})}/></div>
          {allowKindSwitch && <div className="dict-field-block span-all">
            <label className="dict-field-label">種類</label>
            <div className="toolbar" style={{gap:6}}>
              <button type="button" className={'btn btn-sm'+(active.kind==='general'?' btn-primary':'')} onClick={()=>patchActivePlan({kind:'general'})}>通常</button>
              <button type="button" className={'btn btn-sm'+(active.kind==='adult'?' btn-primary':'')} onClick={()=>patchActivePlan({kind:'adult'})}>成人向け</button>
            </div>
          </div>}
          <div className="scene-meta-grid">
            <div className="dict-field-block"><label className="dict-field-label">開始前の状態（任意）</label><textarea rows="2" value={active.beforeState} onChange={e=>patchActivePlan({beforeState:e.target.value})} placeholder="必要な場合だけ書く"/></div>
            <div className="dict-field-block"><label className="dict-field-label">終了後の状態（任意）</label><textarea rows="2" value={active.afterState} onChange={e=>patchActivePlan({afterState:e.target.value})} placeholder="必要な場合だけ書く"/></div>
          </div>
          <div className="dict-list-head" style={{marginTop:14}}><span>進行カード</span><span className="dict-list-count">{active.cards.length}枚</span></div>
          <button type="button" className="writing-block-insert" onClick={addCard}>＋ カードを追加</button>
          <div className="scene-flow-plan-list" style={{marginTop:8}}>
            {active.cards.map((c,i)=>(
              <div className="scene-flow-plan-row" key={c.id}>
                <span className="scene-flow-plan-num">{i+1}</span>
                <button type="button" className="scene-flow-plan-main writing-block-select" onClick={()=>openCard(c)}>
                  <strong>{c.name||'（無題のカード）'}</strong>
                  {c.memo && <span>{c.memo}</span>}
                </button>
                <div className="scene-flow-plan-buttons">
                  <button type="button" onClick={()=>moveCard(i,-1)} disabled={i===0} aria-label="上へ移動">↑</button>
                  <button type="button" onClick={()=>moveCard(i,1)} disabled={i===active.cards.length-1} aria-label="下へ移動">↓</button>
                  <button type="button" onClick={()=>duplicateCard(i)} aria-label="このカードを繰り返す">繰り返す</button>
                  <button type="button" onClick={()=>deleteCard(c.id)} aria-label="カードを削除">×</button>
                </div>
              </div>
            ))}
            {!active.cards.length && <div className="empty-hint">まだカードがありません。「＋ カードを追加」から始めます。</div>}
          </div>
          <div className="modal-actions" style={{justifyContent:'space-between',paddingBottom:0,marginTop:10,flexWrap:'wrap',gap:8}}>
            <div><button type="button" className="btn btn-danger" onClick={deletePlan}>削除</button></div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              <button type="button" className="btn" onClick={duplicatePlan}>複製</button>
              <button type="button" className="btn" onClick={copyPlan}>コピー</button>
              {onInsertToDraft && <button type="button" className="btn btn-primary" onClick={insertPlan}>{insertLabel||'文章へ挿入'}</button>}
            </div>
          </div>
        </>}
      </section>
    </div>
    {cardDraft && <Modal title="進行カード" onClose={()=>setCardDraft(null)}>
      <div className="dict-field-block"><label className="dict-field-label">短い見出し</label><input value={cardDraft.name} onChange={e=>setCardDraft(d=>({...d,name:e.target.value}))} placeholder="例：手をつなぐ" autoFocus/></div>
      <div className="dict-field-block"><label className="dict-field-label">自由記述メモ（任意）</label><textarea rows="4" value={cardDraft.memo} onChange={e=>setCardDraft(d=>({...d,memo:e.target.value}))}/></div>
      {active&&active.kind==='adult'&&adultLibrary&&<button type="button" className="btn btn-sm" onClick={()=>setCandidateOpen(true)}>成人向け候補から選ぶ</button>}
      <div className="modal-actions"><button type="button" className="btn" onClick={()=>setCardDraft(null)}>キャンセル</button><button type="button" className="btn btn-primary" onClick={saveCard}>保存</button></div>
    </Modal>}
    {candidateOpen && <Modal title="成人向け候補から選ぶ" onClose={()=>setCandidateOpen(false)} wide>
      <input type="text" className="expr-dict-search" placeholder="検索" value={candidateQuery} onChange={e=>setCandidateQuery(e.target.value)} style={{marginBottom:10}}/>
      <div className="expr-dict-body" style={{maxHeight:'50vh'}}>
        {!filteredCandidates.length && <div className="empty-hint">候補が見つかりません。</div>}
        {filteredCandidates.map(x=>(
          <div className="expr-dict-entry" key={x.id}>
            <div className="expr-dict-entry-head"><span className="expr-dict-entry-cat">{candidatePhaseName(x.phaseId)}／{x.kind}</span></div>
            <div className="expr-dict-entry-headword">{x.text}</div>
            {x.note && <div className="expr-dict-entry-notes">{x.note}</div>}
            <button type="button" className="btn btn-sm btn-primary" style={{marginTop:6}} onClick={()=>pickCandidate(x)}>このカードに使う</button>
          </div>
        ))}
      </div>
      <div className="modal-actions"><button type="button" className="btn" onClick={()=>setCandidateOpen(false)}>閉じる</button></div>
    </Modal>}
    {toast && <div className="expr-dict-toast" style={{position:'fixed',bottom:'76px'}}>{toast}</div>}
  </div>;
}
// ---- 参考材料ライブラリ（既存機能）：段階別に材料を検索・登録し、「今回の流れ」へ選んで並べる。
//      データ（phases/items/selectedItemIds）・機能とも変更なし。UI上のラベルのみ「進行表」から独立させた。 ----
function SceneFlowLibraryView({data,setData}){
  const phases=data.phases||[]; const items=data.items||[];
  const [phaseId,setPhaseId]=useState(phases[0]?phases[0].id:'');
  const [kind,setKind]=useState(''); const [query,setQuery]=useState('');
  const [draft,setDraft]=useState(null); const [editingId,setEditingId]=useState(null);
  const [importOpen,setImportOpen]=useState(false); const [importText,setImportText]=useState('');
  const [toast,setToast]=useState(''); const toastTimerRef=useRef(null);
  useEffect(()=>()=>{if(toastTimerRef.current)clearTimeout(toastTimerRef.current);},[]);
  const showToast=msg=>{setToast(msg);if(toastTimerRef.current)clearTimeout(toastTimerRef.current);toastTimerRef.current=setTimeout(()=>setToast(''),1400);};
  const activePhase=phases.find(x=>x.id===phaseId)||phases[0]||null;
  const phaseName=id=>(phases.find(x=>x.id===id)||{}).name||'未分類';
  const filtered=items.filter(x=>x.phaseId===(activePhase&&activePhase.id)&&(!kind||x.kind===kind)&&(!query.trim()||[x.text,x.note,...(x.tags||[])].join(' ').toLowerCase().includes(query.trim().toLowerCase())));
  const selectedItems=(data.selectedItemIds||[]).map(id=>items.find(x=>x.id===id)).filter(Boolean);
  const fromCsv=v=>Array.from(new Set(String(v||'').split(/[,、]/).map(x=>x.trim()).filter(Boolean)));
  const blank=()=>({id:uid('flowitem'),phaseId:activePhase?activePhase.id:(phases[0]&&phases[0].id)||'',kind:'動作',text:'',note:'',tags:''});
  const openNew=()=>{setEditingId(null);setDraft(blank());};
  const openEdit=x=>{setEditingId(x.id);setDraft({...x,tags:(x.tags||[]).join(', ')});};
  const save=()=>{
    const text=(draft.text||'').trim(); if(!text){showToast('内容を入力してください');return;}
    const clean={...draft,text,tags:fromCsv(draft.tags)};
    setData(d=>({...d,items:editingId?d.items.map(x=>x.id===editingId?clean:x):[...d.items,clean]}));
    setDraft(null);setEditingId(null);showToast(editingId?'更新しました':'追加しました');
  };
  const remove=()=>{if(!editingId||!confirm(`「${draft.text}」を削除しますか？`))return;setData(d=>({...d,items:d.items.filter(x=>x.id!==editingId),selectedItemIds:(d.selectedItemIds||[]).filter(id=>id!==editingId)}));setDraft(null);setEditingId(null);};
  const addToPlan=id=>{setData(d=>({...d,selectedItemIds:[...(d.selectedItemIds||[]),id]}));showToast('今回の流れへ追加しました');};
  const removeFromPlan=index=>setData(d=>({...d,selectedItemIds:d.selectedItemIds.filter((_,i)=>i!==index)}));
  const movePlan=(index,delta)=>setData(d=>{const a=[...(d.selectedItemIds||[])];const next=index+delta;if(next<0||next>=a.length)return d;[a[index],a[next]]=[a[next],a[index]];return{...d,selectedItemIds:a};});
  const clearPlan=()=>{if((data.selectedItemIds||[]).length&&confirm('今回の流れを空にしますか？'))setData(d=>({...d,selectedItemIds:[]}));};
  const copyPlan=async()=>{const text=selectedItems.map((x,i)=>`${i+1}. [${phaseName(x.phaseId)}／${x.kind}] ${x.text}${x.note?`\n   ${x.note}`:''}`).join('\n');const ok=await copyPlainText(text);showToast(ok?'今回の流れをコピーしました':'コピーに失敗しました');};
  const importCheck=useMemo(()=>{
    if(!importText.trim())return{error:'',valid:[],duplicates:[],invalid:[]};
    try{
      const parsed=JSON.parse(importText);const rows=Array.isArray(parsed)?parsed:(parsed&&Array.isArray(parsed.items)?parsed.items:null);
      if(!rows)return{error:'JSONは配列、または { "items": [...] } の形にしてください',valid:[],duplicates:[],invalid:[]};
      const existing=new Set(items.map(x=>`${x.phaseId}\n${x.kind}\n${(x.text||'').trim()}`));const seen=new Set();const valid=[];const duplicates=[];const invalid=[];
      rows.forEach((raw,i)=>{
        if(!raw||typeof raw!=='object'||Array.isArray(raw)){invalid.push(`${i+1}件目：形式が不正です`);return;}
        const text=String(raw.text==null?'':raw.text).trim();const p=phases.find(x=>x.id===raw.phaseId||x.name===raw.phase);const k=SCENE_FLOW_KINDS.includes(raw.kind)?raw.kind:'';
        if(!text||!p||!k){invalid.push(`${i+1}件目：text・phase・kindを確認してください`);return;}
        const key=`${p.id}\n${k}\n${text}`;if(existing.has(key)||seen.has(key)){duplicates.push(text);return;}seen.add(key);
        valid.push({id:uid('flowitem'),phaseId:p.id,kind:k,text,note:String(raw.note||''),tags:Array.isArray(raw.tags)?raw.tags.map(String):[]});
      });
      return{error:'',valid,duplicates,invalid};
    }catch(e){return{error:'JSONの構文を確認してください：'+e.message,valid:[],duplicates:[],invalid:[]};}
  },[importText,items,phases]);
  const runImport=()=>{if(importCheck.error||!importCheck.valid.length)return;setData(d=>({...d,items:[...d.items,...importCheck.valid]}));const n=importCheck.valid.length;setImportOpen(false);setImportText('');showToast(`${n}件を追加しました`);};
  return <div>
    <p className="adult-tab-desc">場面を順番に見ながら、動作だけでなく反応・心情・関係性などの材料を選びます。順番は目安なので、段階を戻ったり飛ばしたりしてかまいません（既存機能。データはそのまま維持されています）。</p>
    <div className="scene-flow-phases">{phases.map((p,i)=><button type="button" key={p.id} className={'scene-flow-phase'+(activePhase&&activePhase.id===p.id?' active':'')} onClick={()=>setPhaseId(p.id)}><span className="scene-flow-phase-num">{i+1}</span>{p.name}</button>)}</div>
    <div className="scene-flow-layout">
      <div>
        <div className="scene-flow-toolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`${activePhase?activePhase.name:''}の材料を検索`} /><button type="button" className="btn" onClick={()=>setImportOpen(true)}>JSON一括登録</button><button type="button" className="btn btn-primary" onClick={openNew}>＋ 材料追加</button></div>
        <div className="scene-flow-kind-tabs"><button type="button" className={'dict-cat-tab'+(kind===''?' active':'')} onClick={()=>setKind('')}>すべて</button>{SCENE_FLOW_KINDS.map(k=><button type="button" key={k} className={'dict-cat-tab'+(kind===k?' active':'')} onClick={()=>setKind(k)}>{k}</button>)}</div>
        <div className="dict-list-head"><span>{activePhase?activePhase.name:'段階'}の材料</span><span className="dict-list-count">{filtered.length}件</span></div>
        <div className="scene-flow-grid">{filtered.map(x=><div className="scene-flow-card" key={x.id}><div className="scene-flow-card-kind">{x.kind}</div><div className="scene-flow-card-text">{x.text}</div>{x.note&&<div className="scene-flow-card-note">{x.note}</div>}<div className="scene-flow-card-actions"><button type="button" className="btn btn-sm btn-primary" onClick={()=>addToPlan(x.id)}>＋ 今回使う</button><button type="button" className="btn btn-sm" onClick={()=>openEdit(x)}>編集</button></div></div>)}</div>
        {!filtered.length&&<div className="empty-hint">この条件の材料はまだありません。</div>}
      </div>
      <aside className="scene-flow-plan"><div className="scene-flow-plan-title"><span>今回の流れ</span><span className="dict-list-count">{selectedItems.length}件</span></div>
        {!selectedItems.length?<div className="empty-hint">左の材料から「今回使う」を押すと、ここへ順番に並びます。</div>:<div className="scene-flow-plan-list">{selectedItems.map((x,i)=><div className="scene-flow-plan-row" key={`${x.id}-${i}`}><span className="scene-flow-plan-num">{i+1}</span><div className="scene-flow-plan-main"><div className="scene-flow-plan-phase">{phaseName(x.phaseId)}／{x.kind}</div><div className="scene-flow-plan-text">{x.text}</div></div><div className="scene-flow-plan-buttons"><button onClick={()=>movePlan(i,-1)} disabled={i===0}>↑</button><button onClick={()=>movePlan(i,1)} disabled={i===selectedItems.length-1}>↓</button><button onClick={()=>removeFromPlan(i)}>×</button></div></div>)}</div>}
        <div className="modal-actions" style={{paddingBottom:0}}><button type="button" className="btn btn-sm" onClick={copyPlan} disabled={!selectedItems.length}>コピー</button><button type="button" className="btn btn-sm btn-danger" onClick={clearPlan} disabled={!selectedItems.length}>クリア</button></div>
      </aside>
    </div>
    {draft&&<Modal title={editingId?'進行材料を編集':'進行材料を追加'} onClose={()=>{setDraft(null);setEditingId(null);}} wide><div className="scene-flow-edit-grid">
      <div className="dict-field-block"><label className="dict-field-label">段階</label><select value={draft.phaseId} onChange={e=>setDraft(d=>({...d,phaseId:e.target.value}))}>{phases.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div className="dict-field-block"><label className="dict-field-label">種類</label><select value={draft.kind} onChange={e=>setDraft(d=>({...d,kind:e.target.value}))}>{SCENE_FLOW_KINDS.map(k=><option key={k}>{k}</option>)}</select></div>
      <div className="dict-field-block span-all"><label className="dict-field-label">内容</label><input value={draft.text} onChange={e=>setDraft(d=>({...d,text:e.target.value}))} placeholder="例：速さ・強さ・深さのうち一つだけ変える" /></div>
      <div className="dict-field-block span-all"><label className="dict-field-label">補足</label><textarea rows="3" value={draft.note} onChange={e=>setDraft(d=>({...d,note:e.target.value}))} /></div>
      <div className="dict-field-block span-all"><label className="dict-field-label">タグ（カンマ区切り）</label><input value={draft.tags} onChange={e=>setDraft(d=>({...d,tags:e.target.value}))} /></div>
    </div><div className="modal-actions" style={{justifyContent:'space-between'}}><div>{editingId&&<button type="button" className="btn btn-danger" onClick={remove}>削除</button>}</div><div><button type="button" className="btn" onClick={()=>{setDraft(null);setEditingId(null);}}>キャンセル</button> <button type="button" className="btn btn-primary" onClick={save}>保存</button></div></div></Modal>}
    {importOpen&&<Modal title="シーン進行JSON一括登録" onClose={()=>setImportOpen(false)} wide><p className="adult-tab-desc">各項目に <code>phase</code>（段階名）、<code>kind</code>（種類）、<code>text</code>を指定します。同じ段階・種類・内容の項目はスキップします。</p><textarea rows="14" value={importText} onChange={e=>setImportText(e.target.value)} style={{width:'100%',fontFamily:'ui-monospace,monospace',fontSize:'12px'}} placeholder={'{\n  "items": [\n    {\n      "phase": "往復",\n      "kind": "身体反応",\n      "text": "呼吸の間隔が短くなる",\n      "note": "前段階との差を示す",\n      "tags": ["呼吸", "変化"]\n    }\n  ]\n}'} />
      {importCheck.error&&<div className="empty-hint" style={{color:'var(--danger)'}}>{importCheck.error}</div>}{!importCheck.error&&importText.trim()&&<div className="onomatopoeia-badges" style={{marginTop:10}}><span className="onomatopoeia-badge">追加可能 {importCheck.valid.length}件</span><span className="onomatopoeia-badge">重複 {importCheck.duplicates.length}件</span><span className="onomatopoeia-badge">不正 {importCheck.invalid.length}件</span></div>}
      {importCheck.invalid.length>0&&<div className="adult-tab-desc" style={{marginTop:8,color:'var(--danger)'}}>{importCheck.invalid.join(' ／ ')}</div>}<div className="modal-actions"><button className="btn" onClick={()=>setImportOpen(false)}>キャンセル</button><button className="btn btn-primary" onClick={runImport} disabled={!!importCheck.error||!importCheck.valid.length}>{importCheck.valid.length}件を登録</button></div></Modal>}
    {toast&&<div className="expr-dict-toast" style={{position:'fixed',bottom:'76px'}}>{toast}</div>}
  </div>;
}
