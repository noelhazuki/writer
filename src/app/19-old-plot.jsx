/* ============ プロット ============ */
function Plot({ data, setData, allChars, allLocations }){
  const plot = data.plot;
  const setPlot = (p) => setData(d=>({...d, plot: {...d.plot, ...p}}));

  // 構成方式は「章に付けられるラベルの候補」を切り替えるだけ。
  // 既存の章・シーン・各種リンクは一切変更・削除しない。
  const changeStructureType = (presetName) => setPlot({ structureType: presetName });

  const addChapter = () => setPlot({ chapters: [...plot.chapters, { id: uid('ch'), title:'新しい章', stage:'', scenes: [] }] });
  const updateChapter = (id, patch) => setPlot({ chapters: plot.chapters.map(c=>c.id===id?{...c,...patch}:c) });
  const removeChapter = (id) => { if(confirm('この章を削除しますか？中のシーンも削除されます。')) setPlot({ chapters: plot.chapters.filter(c=>c.id!==id) }); };

  const addScene = (chId) => updateChapterScenes(chId, scenes => [...scenes, { id: uid('sc'), summary:'', personIds:[], locationIds:[], ideaIds:[], foreshadowing:[] }]);
  const updateChapterScenes = (chId, fn) => setPlot({ chapters: plot.chapters.map(c=> c.id===chId ? {...c, scenes: fn(c.scenes)} : c) });
  const updateScene = (chId, scId, patch) => updateChapterScenes(chId, scenes => scenes.map(s=>s.id===scId?{...s,...patch}:s));
  const removeScene = (chId, scId) => updateChapterScenes(chId, scenes => scenes.filter(s=>s.id!==scId));
  const moveScene = (chId, scId, dir) => updateChapterScenes(chId, scenes => {
    const idx = scenes.findIndex(s=>s.id===scId); const j = idx+dir;
    if(j<0||j>=scenes.length) return scenes;
    const next=[...scenes]; [next[idx],next[j]]=[next[j],next[idx]]; return next;
  });

  const charOptions = allChars.map(c=>({id:c.id,label:c.name||'（無名）'}));
  const locOptions = allLocations.map(l=>({id:l.id,label:l.name||'（無名）'}));
  const ideaOptions = data.ideas.map(i=>({id:i.id,label:(i.content||'').slice(0,20)||'（無題）'}));
  const stageChoices = PLOT_PRESETS[plot.structureType] || [];

  return (
    <div>
      <h1>🗂 旧プロット</h1>
      <div className="field-row" style={{maxWidth:280}}>
        <label>構成方式（章に付けられるラベルの候補が切り替わります）</label>
        <select value={plot.structureType} onChange={e=>changeStructureType(e.target.value)}>
          {Object.keys(PLOT_PRESETS).map(k=><option key={k}>{k}</option>)}
        </select>
      </div>

      {plot.chapters.length===0 && <div className="empty-hint">章がありません。「＋ 章を追加」から始められます。</div>}

      {plot.chapters.map(ch=>(
        <div className="plot-chapter" key={ch.id}>
          <div className="plot-chapter-head">
            <input value={ch.title} onChange={e=>updateChapter(ch.id,{title:e.target.value})} />
            <select value={ch.stage || ''} onChange={e=>updateChapter(ch.id,{stage:e.target.value})}
              style={{padding:'6px 8px', border:'1px solid var(--line)', borderRadius:4, fontSize:13, background:'#fff'}}>
              <option value="">未設定</option>
              {stageChoices.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="btn btn-sm btn-danger" onClick={()=>removeChapter(ch.id)}>章を削除</button>
          </div>
          {ch.scenes.map((sc,i)=>(
            <div className="plot-scene" key={sc.id}>
              <div style={{display:'flex', gap:8}}>
                <div className="scene-order-btns">
                  <button className="btn btn-sm" onClick={()=>moveScene(ch.id,sc.id,-1)} disabled={i===0}>↑</button>
                  <button className="btn btn-sm" onClick={()=>moveScene(ch.id,sc.id,1)} disabled={i===ch.scenes.length-1}>↓</button>
                </div>
                <div style={{flex:1}}>
                  <AutoTextarea style={{padding:'6px 8px', border:'1px solid var(--line)', borderRadius:4}} minHeight={100}
                    placeholder="シーン概要" value={sc.summary} onChange={e=>updateScene(ch.id,sc.id,{summary:e.target.value})} />
                </div>
                <button className="btn btn-sm btn-danger" onClick={()=>removeScene(ch.id,sc.id)}>削除</button>
              </div>
              <div style={{marginTop:6}}>
                <LinkPicker label="登場人物" options={charOptions} selectedIds={sc.personIds} onChange={ids=>updateScene(ch.id,sc.id,{personIds:ids})} />
                <LinkPicker label="場所" options={locOptions} selectedIds={sc.locationIds} onChange={ids=>updateScene(ch.id,sc.id,{locationIds:ids})} />
                <LinkPicker label="関連ネタ" options={ideaOptions} selectedIds={sc.ideaIds} onChange={ids=>updateScene(ch.id,sc.id,{ideaIds:ids})} />
                <div className="field-row"><label>伏線メモ（カンマ区切り）</label>
                  <input type="text" value={(sc.foreshadowing||[]).join(', ')}
                    onChange={e=>updateScene(ch.id,sc.id,{foreshadowing:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} />
                </div>
              </div>
            </div>
          ))}
          <div style={{padding:'10px 14px'}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>addScene(ch.id)}>＋ シーンを追加</button>
          </div>
        </div>
      ))}
      <button className="btn btn-ghost" onClick={addChapter}>＋ 章を追加</button>
    </div>
  );
}

