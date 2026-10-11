/* ============ AI設定一括取り込み（画面） ============ */
function ImportChangeRow({ change, onToggle, onResolve }){
  const extraFieldKeys = Object.keys(change.setFields||{}).filter(k=>!['name','fromId','toId','groupIdRef','parentLocationId','groupId','title','content','dateLabel'].includes(k));
  return (
    <div className="change-item" style={{opacity: change.enabled ? 1 : 0.5}}>
      <div style={{display:'flex', gap:8, alignItems:'flex-start'}}>
        <input type="checkbox" checked={change.enabled} disabled={!!change.depBlocked} onChange={onToggle} style={{marginTop:4}} />
        <div style={{flex:1, minWidth:0}}>
          <div className="ci-title">{change.title}</div>
          {change.detail && <div className="ci-desc">{change.detail}</div>}
          {change.depBlocked && (
            <div style={{marginTop:4, fontSize:12.5, color:'#8a3a3a'}}>{change.depBlockedReason}</div>
          )}
          {change.action==='create' && extraFieldKeys.length>0 && (
            <div style={{fontSize:12, color:'var(--ink-soft)', marginTop:2}}>
              {extraFieldKeys.map(k=>IMPORT_FIELD_LABELS[k]||k).join(' / ')}を設定
            </div>
          )}
          {(change.arrayFields||[]).length>0 && (
            <div style={{fontSize:12, color:'var(--ink-soft)', marginTop:2}}>
              {change.arrayFields.map(af=>`＋${IMPORT_FIELD_LABELS[af.field]||af.field} ${af.added.length}件`).join(' / ')}
            </div>
          )}
          {(change.conflicts||[]).map(cf=>(
            <div key={cf.field} style={{marginTop:8, padding:'8px 10px', background:'var(--paper-dim)', borderRadius:6}}>
              <div style={{fontSize:12.5, fontWeight:700, marginBottom:4}}>競合：{IMPORT_FIELD_LABELS[cf.field]||cf.field}</div>
              <div style={{fontSize:12, color:'var(--ink-soft)', whiteSpace:'pre-wrap'}}>既存：{cf.existing}</div>
              <div style={{fontSize:12, color:'var(--ink-soft)', whiteSpace:'pre-wrap', marginTop:2}}>取り込み：{cf.incoming}</div>
              <div style={{display:'flex', gap:6, marginTop:6, flexWrap:'wrap'}}>
                <button className={"btn btn-sm"+(cf.resolution==='keep'?" btn-primary":"")} onClick={()=>onResolve(change.id, cf.field, 'keep')}>既存を残す</button>
                <button className={"btn btn-sm"+(cf.resolution==='replace'?" btn-primary":"")} onClick={()=>onResolve(change.id, cf.field, 'replace')}>取り込み内容へ置換</button>
                <button className={"btn btn-sm"+(cf.resolution==='append'?" btn-primary":"")} onClick={()=>onResolve(change.id, cf.field, 'append')}>追記する</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AiImportScreen({ data, setData, lastImportBackup, setLastImportBackup }){
  const [jsonText, setJsonText] = useState('');
  const [parseErrors, setParseErrors] = useState([]);
  const [plan, setPlan] = useState(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if(!file) return;
    try{
      const text = await file.text();
      setJsonText(text); setPlan(null); setParseErrors([]);
    }catch(err){
      console.error(err);
      setParseErrors(['ファイルの読み込みに失敗しました。']);
    }
  };

  const checkContent = () => {
    let parsed;
    try{ parsed = JSON.parse(jsonText); }
    catch(err){
      setPlan(null);
      setParseErrors(['JSONの形式が正しくありません。貼り付けた内容がJSONとして壊れていないか確認してください。', String((err&&err.message)||'')]);
      return;
    }
    const { errors, changes } = buildImportPlan(parsed, data);
    setParseErrors(errors);
    const initial = changes.map(c=>({ ...c, enabled: c.action==='create' || c.action==='update' }));
    setPlan({ changes: gateDependencies(initial) });
  };

  // 未解決の依存関係を持つ項目を検出し、自動的にOFF（取り込み対象から除外）にした上で、
  // 差分確認画面で分かるよう depBlocked / depBlockedReason を付与する。
  const gateDependencies = (changes) => {
    const blocked = computeDependencyBlocked(changes);
    return changes.map(c=>{
      const missing = blocked.get(c.id);
      if(!missing) return { ...c, depBlocked:false, depBlockedReason:null };
      return { ...c, enabled:false, depBlocked:true,
        depBlockedReason: `⚠ ${missing.join('・')}が作成対象から外れているため、「${c.title}」は取り込めません。` };
    });
  };

  const toggleChange = (id) => setPlan(p=>{
    const changes = p.changes.map(c=>{
      if(c.id!==id) return c;
      if(c.depBlocked) return c; // 未解決依存がある項目はONにできない
      return {...c, enabled:!c.enabled};
    });
    return { ...p, changes: gateDependencies(changes) };
  });
  const setConflictResolution = (changeId, field, resolution) => setPlan(p=>({ ...p, changes: p.changes.map(c=>{
    if(c.id!==changeId) return c;
    return { ...c, conflicts: c.conflicts.map(cf=>cf.field===field?{...cf, resolution}:cf) };
  }) }));

  const execute = () => {
    if(!plan) return;
    setLastImportBackup(JSON.parse(JSON.stringify(data)));
    const next = applyImportPlan(plan, data);
    setData(next);
    setPlan(null);
    setJsonText('');
    setParseErrors([]);
    alert('設定の取り込みが完了しました。問題があれば「直前の一括取り込みを元に戻す」から取り消せます。');
  };

  const copyTemplate = async () => {
    try{
      if(navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(AI_IMPORT_TEMPLATE);
      else alert('お使いの環境ではコピーできませんでした。テンプレートを選択して手動でコピーしてください。');
    }catch(err){
      console.error(err);
      alert('コピーに失敗しました。テンプレートを選択して手動でコピーしてください。');
    }
  };

  const grouped = plan ? {
    create: plan.changes.filter(c=>c.action==='create'),
    update: plan.changes.filter(c=>c.action==='update'),
    unchanged: plan.changes.filter(c=>c.action==='unchanged'),
  } : null;
  const conflictCount = plan ? plan.changes.reduce((s,c)=>s+(c.conflicts?c.conflicts.length:0), 0) : 0;
  const depBlockedCount = plan ? plan.changes.filter(c=>c.depBlocked).length : 0;

  return (
    <div>
      <h1>🤖 設定を一括取り込み</h1>
      <p style={{color:'var(--ink-soft)', fontSize:13, marginTop:-6}}>
        ChatGPTやClaudeと相談して整理した設定JSONを貼り付けると、今のデータを残したまま追加・更新できます。「バックアップ読み込み」とは別の機能で、今のデータが置き換わることはありません。
      </p>

      {lastImportBackup && (
        <div className="card card-pad" style={{marginBottom:14, borderColor:'var(--warn)'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap'}}>
            <span style={{fontSize:13}}>直前の一括取り込みを取り消せます（ブラウザを閉じるまでの一時的な取り消しです）。</span>
            <button className="btn btn-sm" onClick={()=>{ setData(lastImportBackup); setLastImportBackup(null); }}>直前の一括取り込みを元に戻す</button>
          </div>
        </div>
      )}

      <div className="field-row">
        <label>設定JSONを貼り付け</label>
        <AutoTextarea value={jsonText} onChange={e=>{ setJsonText(e.target.value); setPlan(null); setParseErrors([]); }}
          minHeight={200} placeholder="AIが生成したJSONをここに貼り付けてください"
          style={{border:'1px solid var(--line)', borderRadius:6, background:'#fff', padding:'10px 12px', fontFamily:'monospace', fontSize:13}} />
      </div>
      <div className="toolbar" style={{marginBottom:14}}>
        <button className="btn btn-sm" onClick={()=>fileRef.current.click()}>📄 JSONファイルを読込</button>
        <input ref={fileRef} type="file" accept="application/json" style={{display:'none'}} onChange={handleFile} />
        <button className="btn btn-sm" onClick={()=>setShowTemplate(s=>!s)}>{showTemplate ? 'テンプレートを隠す' : 'AI用テンプレートを見る'}</button>
        <div className="filler" />
        <button className="btn btn-primary" onClick={checkContent} disabled={!jsonText.trim()}>内容を確認</button>
      </div>

      {showTemplate && (
        <div className="card card-pad" style={{marginBottom:16}}>
          <p style={{fontSize:12.5, color:'var(--ink-soft)', marginTop:0}}>
            ChatGPTやClaudeに「この形式で、今のところまとまっている設定を出力して」と頼む時のテンプレートです。<b>必要なセクションだけ</b>出力してもらえば十分で、全部埋める必要はありません。
          </p>
          <AutoTextarea value={AI_IMPORT_TEMPLATE} onChange={()=>{}} readOnly minHeight={220}
            style={{border:'1px solid var(--line)', borderRadius:6, background:'#f1efe6', padding:'10px 12px', fontFamily:'monospace', fontSize:12, cursor:'default'}} />
          <div style={{textAlign:'right', marginTop:8}}>
            <button className="btn btn-sm" onClick={copyTemplate}>📋 テンプレートをコピー</button>
          </div>
        </div>
      )}

      {parseErrors.length>0 && (
        <div className="card card-pad" style={{marginBottom:16, borderColor:'#dbb'}}>
          {parseErrors.map((m,i)=> m ? <div key={i} style={{color:'#8a3a3a', fontSize:13}}>・{m}</div> : null)}
        </div>
      )}

      {plan && (
        <div>
          <div className="stat-row">
            <div className="stat-box"><div className="n">{grouped.create.length}</div><div className="l">新規作成</div></div>
            <div className="stat-box"><div className="n">{grouped.update.length}</div><div className="l">更新</div></div>
            <div className="stat-box"><div className="n">{conflictCount}</div><div className="l">競合フィールド</div></div>
            <div className="stat-box"><div className="n">{grouped.unchanged.length}</div><div className="l">変更なし</div></div>
            <div className="stat-box"><div className="n">{parseErrors.length + depBlockedCount}</div><div className="l">エラー / 未解決</div></div>
          </div>

          {grouped.create.length>0 && (
            <CollapsibleSection title={`新規作成（${grouped.create.length}件）`} defaultOpen>
              {grouped.create.map(c=><ImportChangeRow key={c.id} change={c} onToggle={()=>toggleChange(c.id)} onResolve={setConflictResolution} />)}
            </CollapsibleSection>
          )}
          {grouped.update.length>0 && (
            <CollapsibleSection title={`更新（${grouped.update.length}件）`} defaultOpen>
              {grouped.update.map(c=><ImportChangeRow key={c.id} change={c} onToggle={()=>toggleChange(c.id)} onResolve={setConflictResolution} />)}
            </CollapsibleSection>
          )}
          {grouped.unchanged.length>0 && (
            <CollapsibleSection title={`変更なし（${grouped.unchanged.length}件）`}>
              {grouped.unchanged.map(c=><div key={c.id} style={{fontSize:13, color:'var(--ink-soft)', padding:'4px 0'}}>・{c.title}</div>)}
            </CollapsibleSection>
          )}

          <div className="modal-actions" style={{marginTop:16, justifyContent:'flex-start'}}>
            <button className="btn btn-primary" onClick={execute} disabled={grouped.create.length===0 && grouped.update.length===0}>この内容で取り込みを実行</button>
            <button className="btn" onClick={()=>setPlan(null)}>取り消してやり直す</button>
          </div>
        </div>
      )}
    </div>
  );
}

