/* ============ 汎用UI部品 ============ */
function Modal({ title, onClose, children, wide, dict }){
  return (
    <div className="modal-backdrop" onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className={"modal"+(dict?" modal-dict":"")} style={(wide && !dict)?{maxWidth:640}:null}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen, badge, preview, openSignal }){
  const [open, setOpen] = useState(!!defaultOpen);
  useEffect(()=>{ if(openSignal) setOpen(true); }, [openSignal]);
  return (
    <div className="section">
      <div className={"section-head" + (open?" open":"")} onClick={()=>setOpen(o=>!o)}>
        <span className="chev">▶</span>
        <h3 style={{margin:0}}>{title}</h3>
        {badge!=null && <span className="idea-tag-pill">{badge}</span>}
      </div>
      {!open && preview && <div className="section-preview">{preview}</div>}
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}

// 本文エディタ専用：文字サイズ（14〜18px）を調整するUI
function FontSizeControl({ value, onChange }){
  const dec = () => onChange(clamp(value-1, WRITING_FONT_SIZE_MIN, WRITING_FONT_SIZE_MAX));
  const inc = () => onChange(clamp(value+1, WRITING_FONT_SIZE_MIN, WRITING_FONT_SIZE_MAX));
  return (
    <div className="fontsize-control">
      <button type="button" className="fontsize-btn" onClick={dec} disabled={value<=WRITING_FONT_SIZE_MIN} aria-label="文字を小さく">A−</button>
      <span className="fontsize-value">{value}px</span>
      <button type="button" className="fontsize-btn" onClick={inc} disabled={value>=WRITING_FONT_SIZE_MAX} aria-label="文字を大きく">A＋</button>
    </div>
  );
}

// 折りたたみプレビュー用：候補となる項目を優先順で見て、最初に内容があるものを返す
function firstNonEmpty(...vals){
  for(const v of vals){ if(v && String(v).trim()) return v; }
  return null;
}

function Chip({ children, onRemove }){
  return (
    <span className="chip">
      {children}
      {onRemove && <button onClick={onRemove} title="削除">×</button>}
    </span>
  );
}

// options: [{id, label, sub}]
function LinkPicker({ label, options, selectedIds, onChange, placeholder }){
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const selected = (selectedIds||[]).map(id => options.find(o=>o.id===id)).filter(Boolean);
  const remaining = options.filter(o => !(selectedIds||[]).includes(o.id) && (!query || o.label.includes(query)));
  return (
    <div className="field-row linkpicker">
      {label && <label>{label}</label>}
      <div className="chips">
        {selected.map(o => (
          <Chip key={o.id} onRemove={()=>onChange((selectedIds||[]).filter(id=>id!==o.id))}>{o.label}</Chip>
        ))}
      </div>
      <input
        type="text" value={query} placeholder={placeholder || '入力して検索・選択'}
        onChange={e=>setQuery(e.target.value)}
        onFocus={()=>setFocused(true)}
        onBlur={()=>setTimeout(()=>setFocused(false), 150)}
      />
      {focused && (
        <div className="dropdown">
          {remaining.length===0 && <div className="none">候補なし</div>}
          {remaining.slice(0,30).map(o=>(
            <div key={o.id} onMouseDown={()=>{ onChange([...(selectedIds||[]), o.id]); setQuery(''); }}>
              {o.label}{o.sub && <span style={{color:'var(--ink-soft)', fontSize:11}}> ・{o.sub}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SingleLinkPicker({ label, options, value, onChange }){
  return (
    <div className="field-row">
      <label>{label}</label>
      <select value={value||''} onChange={e=>onChange(e.target.value||null)}>
        <option value="">（未設定）</option>
        {options.map(o=> <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );
}

function CustomFieldsEditor({ fields, onChange }){
  const list = fields || [];
  const update = (i, patch) => {
    const next = list.map((f,idx)=> idx===i ? {...f, ...patch} : f);
    onChange(next);
  };
  const remove = (i) => onChange(list.filter((_,idx)=>idx!==i));
  const move = (i, dir) => {
    const j = i+dir;
    if(j<0 || j>=list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = () => onChange([...list, { id: uid('cf'), label:'', value:'' }]);
  return (
    <div>
      {list.map((f,i)=>(
        <div className="customfield-row" key={f.id}>
          <input className="cf-label" type="text" placeholder="項目名（例：搭乗機）" value={f.label}
            onChange={e=>update(i,{label:e.target.value})}/>
          <AutoTextarea className="cf-value" placeholder="内容" value={f.value} minHeight={90}
            onChange={e=>update(i,{value:e.target.value})}
            style={{border:'1px solid var(--line)', borderRadius:6, padding:'8px 10px'}} />
          <div className="cf-actions">
            <button onClick={()=>move(i,-1)} disabled={i===0}>↑</button>
            <button onClick={()=>move(i,1)} disabled={i===list.length-1}>↓</button>
            <button onClick={()=>remove(i)} style={{color:'#8a3a3a'}}>削除</button>
          </div>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={add}>＋ 自由項目を追加</button>
    </div>
  );
}

// 単一画像（組織・場所のアイコン用）
function SingleImageField({ label, imageId, onChange, variant }){
  const [url, setUrl] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef();
  const aliveRef = useRef(true);
  useEffect(()=>{ aliveRef.current = true; return ()=>{ aliveRef.current = false; }; }, []);

  useEffect(()=>{
    let alive = true;
    setError('');
    imageStorage.get(imageId)
      .then(u=>{ if(alive) setUrl(u); })
      .catch(err=>{ console.error('画像の読み込みに失敗しました', err); if(alive) setUrl(null); });
    return ()=>{ alive=false; };
  }, [imageId]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if(!file || processing) return;
    setProcessing(true);
    setError('');
    try{
      const dataUrl = await compressImageFile(file);
      const newId = uid('img'); // 変更のたびに必ず新しいIDを発行する（同じIDへの上書きはしない）
      await imageStorage.save(newId, dataUrl);
      const oldId = imageId;
      onChange(newId);
      if(oldId && oldId !== newId) imageStorage.remove(oldId); // 新画像の保存成功後に旧画像を削除
    }catch(err){
      console.error('画像の保存に失敗しました', err);
      if(aliveRef.current) setError('画像の保存に失敗しました。別の画像を試してください。');
    }finally{
      if(aliveRef.current) setProcessing(false);
    }
  };
  const handleRemove = async () => {
    if(processing) return;
    setProcessing(true);
    setError('');
    try{
      const oldId = imageId;
      onChange(null);
      if(oldId) await imageStorage.remove(oldId);
    }catch(err){
      console.error('画像の削除に失敗しました', err);
      if(aliveRef.current) setError('画像の削除に失敗しました。');
    }finally{
      if(aliveRef.current) setProcessing(false);
    }
  };
  return (
    <div className="field-row">
      <label>{label}</label>
      <div className={"single-img-upload"+(variant==='portrait'?" portrait":"")}>
        {url ? <img className={variant==='portrait'?"ph-portrait":"ph"} src={url} /> : <div className={variant==='portrait'?"ph-portrait":"ph"} style={{display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink-soft)'}}>画像</div>}
        <div>
          <button className="btn btn-sm" disabled={processing} onClick={()=>inputRef.current.click()}>{processing ? '処理中…' : (url?'変更':'アップロード')}</button>
          {url && <button className="btn btn-sm btn-danger" disabled={processing} style={{marginLeft:6}} onClick={handleRemove}>削除</button>}
          <input ref={inputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFile} disabled={processing} />
          {error && <div style={{color:'#8a3a3a', fontSize:12, marginTop:4}}>{error}</div>}
        </div>
      </div>
    </div>
  );
}

// 複数画像（キャラクター用、ラベル付き）
function MultiImageField({ images, onChange }){
  const list = images || [];
  const inputRef = useRef();
  const [urls, setUrls] = useState({});
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [previewId, setPreviewId] = useState(null);
  const aliveRef = useRef(true);
  useEffect(()=>{ aliveRef.current = true; return ()=>{ aliveRef.current = false; }; }, []);

  useEffect(()=>{
    let alive = true;
    (async ()=>{
      const next = {};
      for(const im of list){
        try{ next[im.id] = await imageStorage.get(im.id); }
        catch(err){ console.error('画像の読み込みに失敗しました', err); next[im.id] = null; }
      }
      if(alive) setUrls(next);
    })();
    return ()=>{ alive=false; };
  }, [list.map(i=>i.id).join(',')]);

  const handleAdd = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if(!file || processing) return;
    setProcessing(true);
    setError('');
    try{
      const dataUrl = await compressImageFile(file);
      const id = uid('img');
      await imageStorage.save(id, dataUrl);
      onChange([...list, { id, label:'' }]);
    }catch(err){
      console.error('画像の保存に失敗しました', err);
      if(aliveRef.current) setError('画像の保存に失敗しました。別の画像を試してください。');
    }finally{
      if(aliveRef.current) setProcessing(false);
    }
  };
  const updateLabel = (id, label) => onChange(list.map(im => im.id===id ? {...im, label} : im));
  const remove = async (id) => {
    if(processing) return;
    setProcessing(true);
    setError('');
    try{
      onChange(list.filter(im=>im.id!==id));
      await imageStorage.remove(id);
    }catch(err){
      console.error('画像の削除に失敗しました', err);
      if(aliveRef.current) setError('画像の削除に失敗しました。');
    }finally{
      if(aliveRef.current) setProcessing(false);
    }
  };

  return (
    <div className="field-row">
      <label>画像（複数登録可・ラベル任意・クリックで拡大表示）</label>
      <div className="imgrid">
        {list.map(im=>(
          <div className="img-item" key={im.id}>
            {urls[im.id] ? <img className="ph" src={urls[im.id]} onClick={()=>setPreviewId(im.id)} /> : <div className="ph" />}
            <input type="text" placeholder="立ち絵 / 私服 など" value={im.label} onChange={e=>updateLabel(im.id, e.target.value)} />
            <button className="rm" disabled={processing} onClick={()=>remove(im.id)}>削除</button>
          </div>
        ))}
        <button className="add-img" disabled={processing} onClick={()=>inputRef.current.click()}>{processing ? '…' : '＋'}</button>
        <input ref={inputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleAdd} disabled={processing} />
      </div>
      {error && <div style={{color:'#8a3a3a', fontSize:12, marginTop:4}}>{error}</div>}
      {previewId && urls[previewId] && (
        <div className="modal-backdrop" onMouseDown={(e)=>{ if(e.target===e.currentTarget) setPreviewId(null); }}>
          <div className="image-preview-overlay">
            <button className="btn btn-sm" onClick={()=>setPreviewId(null)}>閉じる</button>
            <img src={urls[previewId]} />
          </div>
        </div>
      )}
    </div>
  );
}

function Thumb({ imageId }){
  const [url, setUrl] = useState(null);
  useEffect(()=>{
    let alive=true;
    imageStorage.get(imageId).then(u=>{ if(alive) setUrl(u); }).catch(err=>{ console.error('画像の読み込みに失敗しました', err); if(alive) setUrl(null); });
    return ()=>{alive=false};
  }, [imageId]);
  return (
    <div className="thumb">{url ? <img src={url} /> : '🖼'}</div>
  );
}

// 円形の小さいアイコンプレビュー（相関図用アイコンなど）
function IconThumb({ imageId, size }){
  const [url, setUrl] = useState(null);
  const s = size || 64;
  useEffect(()=>{
    let alive=true;
    imageStorage.get(imageId).then(u=>{ if(alive) setUrl(u); }).catch(err=>{ console.error('画像の読み込みに失敗しました', err); if(alive) setUrl(null); });
    return ()=>{alive=false};
  }, [imageId]);
  return (
    <div style={{ width:s, height:s, borderRadius:'50%', overflow:'hidden', background:'var(--paper-dim)', border:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      {url ? <img src={url} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <span style={{fontSize:s*0.35, color:'var(--ink-soft)'}}>?</span>}
    </div>
  );
}

// 長文を流し込んでも読みやすいよう、内容に合わせて自動で高さが伸びるテキストエリア
function AutoTextarea({ value, onChange, placeholder, minHeight, style, className, readOnly }){
  const ref = useRef();
  const mh = minHeight || 130;
  useEffect(()=>{
    const el = ref.current;
    if(el){ el.style.height = 'auto'; el.style.height = Math.max(mh, el.scrollHeight) + 'px'; }
  }, [value]);
  return (
    <textarea
      ref={ref} value={value} placeholder={placeholder} onChange={onChange} className={className} readOnly={readOnly}
      style={{ width:'100%', border:'none', background:'none', minHeight:mh, lineHeight:1.9, fontSize:14.5, color:'var(--ink)', resize:'vertical', ...style }}
    />
  );
}

// field-row の内側（.field-rowのCSSで枠線・背景が付く）で使う、枠線付きの自動伸長テキストエリア
const FIELD_TEXTAREA_STYLE = { border:'1px solid var(--line)', borderRadius:6, background:'#fff', padding:'9px 10px', fontSize:14.5, lineHeight:1.8 };
function FieldAutoTextarea(props){
  return <AutoTextarea {...props} style={{ ...FIELD_TEXTAREA_STYLE, ...(props.style||{}) }} />;
}

// 「誰から／なんと呼ばれるか」を複数登録するエディタ
function CalledNamesEditor({ items, onChange }){
  const list = items || [];
  const update = (i, patch) => onChange(list.map((it,idx)=> idx===i ? {...it, ...patch} : it));
  const remove = (i) => onChange(list.filter((_,idx)=>idx!==i));
  const add = () => onChange([...list, { id: uid('cn'), who:'', name:'' }]);
  return (
    <div>
      {list.map((it,i)=>(
        <div className="customfield-row" key={it.id}>
          <input className="cf-label" type="text" placeholder="誰から（母 / 部下 など）" value={it.who} onChange={e=>update(i,{who:e.target.value})} />
          <input type="text" style={{flex:1, padding:'9px 10px', border:'1px solid var(--line)', borderRadius:6}} placeholder="なんと呼ばれるか" value={it.name} onChange={e=>update(i,{name:e.target.value})} />
          <div className="cf-actions">
            <button onClick={()=>remove(i)} style={{color:'#8a3a3a'}}>削除</button>
          </div>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={add}>＋ 呼び方を追加</button>
    </div>
  );
}

// 相関図用アイコンの切り抜きモーダル（登録済み画像から丸く切り抜いて保存）
// アイコン切り抜き：円は中央固定、ユーザーは背後の画像をドラッグ・拡大縮小して位置を合わせる（スマホのプロフィール画像設定に近い操作）
const ICON_CROP_MAX_SCALE = 4.5;
const ICON_CROP_CIRCLE_RATIO = 0.86; // コンテナに対する円の直径の割合

function IconCropModal({ candidates, currentIconId, onSave, onClose }){
  const [sourceId, setSourceId] = useState(candidates[0] ? candidates[0].id : null);
  const [srcUrl, setSrcUrl] = useState(null);
  const [naturalSize, setNaturalSize] = useState({w:0,h:0});
  const [containerSize, setContainerSize] = useState({w:0,h:0});
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({x:0,y:0});
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const containerRef = useRef();
  const imgRef = useRef();

  // ドラッグ・ピンチ処理はrefで最新値を参照する（リスナーの張り直しを避けるため）
  const stateRef = useRef({ scale, offset, containerSize, naturalSize });
  useEffect(()=>{ stateRef.current = { scale, offset, containerSize, naturalSize }; }, [scale, offset, containerSize, naturalSize]);

  // 円の直径に対して、画像が常に円を覆っていられる範囲にoffsetを収める
  function clampOffset(off, sc, cSize, nSize){
    if(!cSize.w || !cSize.h || !nSize.w || !nSize.h) return off;
    const diam = Math.min(cSize.w, cSize.h) * ICON_CROP_CIRCLE_RATIO;
    const baseScale = diam / Math.min(nSize.w, nSize.h);
    const dispW = nSize.w * baseScale * sc;
    const dispH = nSize.h * baseScale * sc;
    const maxX = Math.max(0, (dispW - diam)/2);
    const maxY = Math.max(0, (dispH - diam)/2);
    return { x: clamp(off.x, -maxX, maxX), y: clamp(off.y, -maxY, maxY) };
  }

  const dragStateRef = useRef(null);
  const pinchStateRef = useRef(null);

  const handleMove = useCallback((e) => {
    if(pinchStateRef.current){
      if(!e.touches || e.touches.length<2) return;
      e.preventDefault();
      const [t1,t2] = e.touches;
      const dist = Math.hypot(t2.clientX-t1.clientX, t2.clientY-t1.clientY);
      const ratio = dist / (pinchStateRef.current.startDist || 1);
      const nextScale = clamp(pinchStateRef.current.startScale * ratio, 1, ICON_CROP_MAX_SCALE);
      setScale(nextScale);
      setOffset(o => clampOffset(o, nextScale, stateRef.current.containerSize, stateRef.current.naturalSize));
      return;
    }
    if(!dragStateRef.current) return;
    e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - dragStateRef.current.startX;
    const dy = point.clientY - dragStateRef.current.startY;
    setOffset(clampOffset(
      { x: dragStateRef.current.origX+dx, y: dragStateRef.current.origY+dy },
      stateRef.current.scale, stateRef.current.containerSize, stateRef.current.naturalSize
    ));
  }, []);

  const handleUp = useCallback((e) => {
    // 2本指ピンチ中に1本指だけ離した場合は、残った指でドラッグを継続する
    if(e && e.touches && e.touches.length===1 && pinchStateRef.current){
      pinchStateRef.current = null;
      dragStateRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, origX: stateRef.current.offset.x, origY: stateRef.current.offset.y };
      return;
    }
    dragStateRef.current = null;
    pinchStateRef.current = null;
    window.removeEventListener('mousemove', handleMove);
    window.removeEventListener('mouseup', handleUp);
    window.removeEventListener('touchmove', handleMove);
    window.removeEventListener('touchend', handleUp);
  }, [handleMove]);

  // コンポーネントが消える時は、操作途中であっても必ずリスナーを解除する
  useEffect(()=>{
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [handleMove, handleUp]);

  useEffect(()=>{
    let alive = true;
    setSrcUrl(null);
    setError('');
    setNaturalSize({w:0,h:0});
    setScale(1);
    setOffset({x:0,y:0});
    if(sourceId){
      imageStorage.get(sourceId)
        .then(u=>{ if(alive) setSrcUrl(u); })
        .catch(err=>{ console.error('画像の読み込みに失敗しました', err); if(alive) setError('画像を読み込めませんでした。別の画像を試してください。'); });
    }
    return ()=>{ alive=false; };
  }, [sourceId]);

  // 実際に画面へ表示されているコンテナのサイズ（getBoundingClientRect）を基準に円・画像の座標を計算する
  const recalcContainerSize = useCallback(() => {
    const el = containerRef.current;
    if(!el) return;
    const rect = el.getBoundingClientRect();
    if(!rect.width || !rect.height) return;
    const cSize = { w: rect.width, h: rect.height };
    setContainerSize(cSize);
    setOffset(o => clampOffset(o, stateRef.current.scale, cSize, stateRef.current.naturalSize));
  }, []);

  const onImgLoad = () => {
    const img = imgRef.current;
    if(!img.naturalWidth || !img.naturalHeight){
      setError('画像を読み込めませんでした。別の画像を試してください。');
      return;
    }
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    setScale(1);
    setOffset({x:0,y:0});
    recalcContainerSize();
  };
  const onImgError = () => setError('画像を読み込めませんでした。別の画像を試してください。');

  // ウィンドウサイズ変更・スマホ回転時に再計算する
  useEffect(()=>{
    recalcContainerSize();
    window.addEventListener('resize', recalcContainerSize);
    window.addEventListener('orientationchange', recalcContainerSize);
    return ()=>{
      window.removeEventListener('resize', recalcContainerSize);
      window.removeEventListener('orientationchange', recalcContainerSize);
    };
  }, [recalcContainerSize]);

  const startDrag = (e) => {
    if(processing || !naturalSize.w) return;
    if(e.touches && e.touches.length>=2){
      e.preventDefault();
      const [t1,t2] = e.touches;
      pinchStateRef.current = { startDist: Math.hypot(t2.clientX-t1.clientX, t2.clientY-t1.clientY), startScale: stateRef.current.scale };
      dragStateRef.current = null;
      window.addEventListener('touchmove', handleMove, {passive:false});
      window.addEventListener('touchend', handleUp);
      return;
    }
    e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    dragStateRef.current = { startX: point.clientX, startY: point.clientY, origX: stateRef.current.offset.x, origY: stateRef.current.offset.y };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, {passive:false});
    window.addEventListener('touchend', handleUp);
  };

  const handleScaleChange = (val) => {
    const next = clamp(val, 1, ICON_CROP_MAX_SCALE);
    setScale(next);
    setOffset(o => clampOffset(o, next, stateRef.current.containerSize, stateRef.current.naturalSize));
  };

  // PCではマウスホイールでも拡大縮小できるようにする
  const handleWheel = (e) => {
    if(processing || !naturalSize.w) return;
    e.preventDefault();
    handleScaleChange(stateRef.current.scale + (e.deltaY > 0 ? -0.08 : 0.08));
  };

  const doCrop = async () => {
    if(processing) return;
    if(!srcUrl || !naturalSize.w || !naturalSize.h || !containerSize.w || !containerSize.h){
      setError('画像の準備ができていません。少し待ってからもう一度試してください。');
      return;
    }
    setProcessing(true);
    setError('');
    try{
      // 表示上（円の中に見えている部分）と実際に保存される画像が一致するよう、
      // offset・scaleから元画像のピクセル座標へ正確に変換する
      const diam = Math.min(containerSize.w, containerSize.h) * ICON_CROP_CIRCLE_RATIO;
      const baseScale = diam / Math.min(naturalSize.w, naturalSize.h);
      const dispW = naturalSize.w * baseScale * scale;
      const dispH = naturalSize.h * baseScale * scale;
      const relX = dispW/2 - diam/2 - offset.x;
      const relY = dispH/2 - diam/2 - offset.y;
      const sx = relX / (baseScale*scale);
      const sy = relY / (baseScale*scale);
      const ssize = diam / (baseScale*scale);
      const canvas = document.createElement('canvas');
      canvas.width = 400; canvas.height = 400;
      const ctx = canvas.getContext('2d');
      const tmpImg = new Image();
      await new Promise((res, rej)=>{
        tmpImg.onload = res;
        tmpImg.onerror = () => rej(new Error('画像を読み込めませんでした'));
        tmpImg.src = srcUrl;
      });
      ctx.drawImage(tmpImg, sx, sy, ssize, ssize, 0, 0, 400, 400);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      canvas.width = 0; canvas.height = 0;
      const newId = uid('icon'); // 切り抜くたびに必ず新しいIDを発行する
      await imageStorage.save(newId, dataUrl);
      const oldId = currentIconId;
      onSave(newId);
      if(oldId && oldId !== newId) imageStorage.remove(oldId); // 新アイコン保存成功後に旧アイコンを削除（元画像は削除しない）
      onClose();
    }catch(err){
      console.error('アイコンの保存に失敗しました', err);
      setError('アイコンの保存に失敗しました。もう一度試してください。');
      setProcessing(false);
    }
  };

  const circleDiameter = containerSize.w ? Math.min(containerSize.w, containerSize.h) * ICON_CROP_CIRCLE_RATIO : 0;
  const baseScale = (containerSize.w && naturalSize.w) ? circleDiameter / Math.min(naturalSize.w, naturalSize.h) : 0;
  const dispW = naturalSize.w * baseScale * scale;
  const dispH = naturalSize.h * baseScale * scale;
  const ready = containerSize.w>0 && naturalSize.w>0;

  return (
    <Modal title="アイコンを切り抜く" onClose={onClose} wide>
      {candidates.length===0 && <div className="empty-hint">先に画像を登録してください。</div>}
      {candidates.length>1 && (
        <div style={{display:'flex', gap:8, marginBottom:10, flexWrap:'wrap'}}>
          {candidates.map(c=>(
            <button key={c.id} className={"btn btn-sm"+(sourceId===c.id?" btn-primary":"")} disabled={processing} onClick={()=>setSourceId(c.id)}>{c.label}</button>
          ))}
        </div>
      )}
      {sourceId && (
        srcUrl ? (
          <div
            ref={containerRef}
            onMouseDown={startDrag} onTouchStart={startDrag} onWheel={handleWheel}
            style={{
              position:'relative', width:'100%', maxWidth:560, aspectRatio:'1 / 1', margin:'0 auto',
              overflow:'hidden', background:'#111', touchAction:'none', borderRadius:6,
              cursor: processing ? 'default' : (ready ? 'move' : 'default')
            }}
          >
            <img
              ref={imgRef} src={srcUrl} onLoad={onImgLoad} onError={onImgError} draggable={false}
              style={{
                position:'absolute', left:'50%', top:'50%',
                width: dispW || 'auto', height: dispH || 'auto',
                maxWidth: dispW ? 'none' : '100%',
                transform:`translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                pointerEvents:'none'
              }}
            />
            {circleDiameter>0 && (
              <div style={{
                position:'absolute', left:'50%', top:'50%', width:circleDiameter, height:circleDiameter,
                transform:'translate(-50%, -50%)', border:'2px solid #fff',
                boxShadow:'0 0 0 2000px rgba(0,0,0,0.45)', borderRadius:'50%', pointerEvents:'none'
              }} />
            )}
          </div>
        ) : (!error ? <div style={{padding:20, textAlign:'center', color:'var(--ink-soft)'}}>画像を読み込み中…</div> : null)
      )}
      {error && <div style={{color:'#8a3a3a', fontSize:13, marginTop:10}}>{error}</div>}
      {ready && (
        <div className="field-row" style={{marginTop:14}}>
          <label>拡大・縮小</label>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <span style={{fontSize:12, color:'var(--ink-soft)'}}>縮小</span>
            <input type="range" min={1} max={ICON_CROP_MAX_SCALE} step={0.01} value={scale} disabled={processing}
              onChange={e=>handleScaleChange(Number(e.target.value))} style={{flex:1}} />
            <span style={{fontSize:12, color:'var(--ink-soft)'}}>拡大</span>
          </div>
        </div>
      )}
      <p style={{fontSize:12, color:'var(--ink-soft)'}}>円の中の画像をドラッグすると位置を調整できます。マウスホイールやピンチ操作でも拡大・縮小できます。</p>
      <div className="modal-actions">
        <button className="btn" onClick={onClose} disabled={processing}>キャンセル</button>
        <button className="btn btn-primary" onClick={doCrop} disabled={!srcUrl || processing}>{processing ? '処理中…' : 'この範囲でアイコンを保存'}</button>
      </div>
    </Modal>
  );
}

