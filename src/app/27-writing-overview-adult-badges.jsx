/* ============ 成人向け創作ツール（独立screen） ============
   通常の辞典ドロワーには混ぜず、screen='adultTools' の独立画面として持つ。
   画面内タブ：[表現辞典]／[トーン検索]／[語句魔改造]／[語句マップ]
   データはadultDictionaryとして本文・他の全辞典と完全に分離する。 */
const ADULT_CATEGORY_SUGGESTIONS = ['身体','動作','反応','発声','心理','その他'];

// 4指標＋視点を簡潔に表示する小さなバッジ（一覧・魔改造・語句マップで共通利用）
function AdultRatingBadges({ x }){
  return (
    <div className="adult-rating-badges">
      <span className="adult-rating-badge">直{x.directness}</span>
      <span className="adult-rating-badge">官{x.eroticism}</span>
      <span className="adult-rating-badge">俗{x.vulgarity}</span>
      <span className="adult-rating-badge">文{x.literary}</span>
      <span className="adult-rating-badge adult-rating-badge-persp">{x.perspective}</span>
    </div>
  );
}

function WritingBlockOverview({data,setData}){
  const [draft,setDraft]=useState(null);
  const patchBlocks=(chapterId,fn)=>setData(d=>({...d,writings:d.writings.map(w=>{
    if(w.id!==chapterId)return w;
    const blocks=fn(w.blocks||[]);
    return {...w,blocks,body:blocks.map(b=>b.body).filter(Boolean).join('\n\n')};
  })}));
  const insert=(chapter,index)=>{
    const b={id:uid('wblock'),title:'新しい場面',body:'',memo:'',kind:'normal',status:'未定',adultNote:''};
    patchBlocks(chapter.id,rows=>{const next=[...rows];next.splice(index,0,b);return next;});
    setDraft({chapterId:chapter.id,block:b});
  };
  const move=(chapter,index,delta)=>patchBlocks(chapter.id,rows=>{
    const next=[...rows],to=index+delta;if(to<0||to>=next.length)return rows;
    [next[index],next[to]]=[next[to],next[index]];return next;
  });
  const save=()=>{
    if(!draft||!draft.block.title.trim())return;
    patchBlocks(draft.chapterId,rows=>rows.map(b=>b.id===draft.block.id?{...draft.block,title:draft.block.title.trim()}:b));
    setDraft(null);
  };
  return <div><p className="adult-tab-desc">本文の文章ブロックを並び順で表示します。場面の見出しやメモをここで編集できます。文章は「本文」で同じブロックを編集します。</p>
    {!data.writings.length&&<div className="empty-hint">「本文」で章を追加すると、ここに文章ブロックが並びます。</div>}
    {data.writings.map(chapter=><section className="writing-block-board" key={chapter.id}><h2>{chapter.title}</h2>
      <button className="writing-block-insert" onClick={()=>insert(chapter,0)}>＋ 先頭に挿入</button>
      {(chapter.blocks||[]).map((b,i)=><React.Fragment key={b.id}><div className="writing-block-card">
        <button className="writing-block-select" onClick={()=>setDraft({chapterId:chapter.id,block:{...b}})}><strong>{b.title}</strong><small>{b.status}・{b.body.length}文字{b.kind==='adult'?'・成人向け':''}</small><span>{b.memo||b.body.slice(0,100)||'未定の場面'}</span></button>
        <div className="writing-block-actions"><button className="btn btn-sm" onClick={()=>setDraft({chapterId:chapter.id,block:{...b}})}>メモ</button><button className="btn btn-sm" disabled={i===0} onClick={()=>move(chapter,i,-1)}>↑</button><button className="btn btn-sm" disabled={i===chapter.blocks.length-1} onClick={()=>move(chapter,i,1)}>↓</button></div>
      </div><button className="writing-block-insert" onClick={()=>insert(chapter,i+1)}>＋ ここに挿入</button></React.Fragment>)}
    </section>)}
    {draft&&<Modal title="出来事メモ" onClose={()=>setDraft(null)} wide><div className="dict-field-block"><label className="dict-field-label">場面の見出し</label><input value={draft.block.title} onChange={e=>setDraft(d=>({...d,block:{...d.block,title:e.target.value}}))}/></div><div className="scene-meta-grid"><div className="dict-field-block"><label className="dict-field-label">状態</label><select value={draft.block.status} onChange={e=>setDraft(d=>({...d,block:{...d.block,status:e.target.value}}))}>{['未定','執筆中','一旦完成'].map(x=><option key={x}>{x}</option>)}</select></div><div className="dict-field-block"><label className="dict-field-label">場面の種類</label><select value={draft.block.kind} onChange={e=>setDraft(d=>({...d,block:{...d.block,kind:e.target.value}}))}><option value="normal">通常</option><option value="adult">成人向け</option></select></div></div><div className="dict-field-block"><label className="dict-field-label">出来事・明かすこと・まだ隠すこと</label><textarea rows="8" value={draft.block.memo} onChange={e=>setDraft(d=>({...d,block:{...d.block,memo:e.target.value}}))}/></div>{draft.block.kind==='adult'&&<div className="dict-field-block"><label className="dict-field-label">行為前後の関係や次へ残すもの</label><textarea rows="4" value={draft.block.adultNote} onChange={e=>setDraft(d=>({...d,block:{...d.block,adultNote:e.target.value}}))}/></div>}<div className="modal-actions"><button className="btn" onClick={()=>setDraft(null)}>キャンセル</button><button className="btn btn-primary" onClick={save}>保存</button></div></Modal>}
  </div>;
}

function StoryToolsScreen({outlineData,setOutlineData,sceneData,setSceneData,patternData,setPatternData,data,setData,openSceneSignal}){
  const [tab,setTab]=useState('blocks');
  // 「シーンの地図」から「１話の構成を開く」が押されたとき（openSceneSignalが変化するたび）にこのタブへ切り替える。
  // 既存データ（generalScenes＝旧シーン補助のデータ）はそのまま使う。
  useEffect(()=>{ if(openSceneSignal) setTab('scene'); }, [openSceneSignal]);
  const createSceneFromOutline=(projectId,blockId,item)=>{
    const scene=newSceneFromTemplate('basic',item.title||'新しいシーン');
    Object.assign(scene,{purpose:item.summary||'',sceneRole:item.type||'本筋',location:item.location||'',pov:item.pov||'',timeRelation:item.timeRelation||'直後',readerInfo:item.readerInfo||'',characterInfo:item.characterInfo||'',returnToMain:!!item.returnToMain,outlineItemId:item.id});
    setSceneData(d=>({...d,scenes:[...d.scenes,scene],activeSceneId:scene.id}));
    setOutlineData(d=>({...d,projects:d.projects.map(p=>p.id!==projectId?p:{...p,blocks:p.blocks.map(b=>b.id!==blockId?b:{...b,items:b.items.map(x=>x.id===item.id?{...x,sceneId:scene.id}:x)})})}));
    setTab('scene');
  };
  return <div>
    <div className="toolbar"><h1>🎬 シーン・物語設計</h1></div>
    <div className="story-tools-tabs"><button className={'story-tools-tab'+(tab==='blocks'?' active':'')} onClick={()=>setTab('blocks')}>文章の並び</button><button className={'story-tools-tab'+(tab==='outline'?' active':'')} onClick={()=>setTab('outline')}>従来の構成</button><button className={'story-tools-tab'+(tab==='scene'?' active':'')} onClick={()=>setTab('scene')}>１話の構成</button><button className={'story-tools-tab'+(tab==='patterns'?' active':'')} onClick={()=>setTab('patterns')}>物語パターン集</button></div>
    {tab==='blocks'?<WritingBlockOverview data={data} setData={setData}/>:tab==='outline'?<StoryOutlineBoard data={outlineData} setData={setOutlineData} scenes={sceneData.scenes||[]} onCreateScene={createSceneFromOutline}/>:tab==='scene'?<GeneralScenePlanner data={sceneData} setData={setSceneData}/>:<StoryPatternLibrary data={patternData} setData={setPatternData}/>} 
  </div>;
}

