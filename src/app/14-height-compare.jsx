// heightCm が「有効な正の数値」として扱えるキャラクターだけを抽出する（0以下・NaN・未設定は除外）。
// __order は元の登録順（data.characters内の並び順）を保持し、「登録順」表示や同身長時の並びに使う。
function collectValidHeightChars(characters){
  return (characters||[])
    .map((c, idx) => ({ c, idx }))
    .filter(({c}) => {
      const n = typeof c.heightCm === 'number' ? c.heightCm : parseFloat(c.heightCm);
      return Number.isFinite(n) && n > 0;
    })
    .map(({c, idx}) => ({ id:c.id, name:c.name, heightCm: Number(c.heightCm), __order: idx }));
}

function sortHeightChars(chars, sortMode){
  const arr = [...chars];
  if(sortMode==='asc') arr.sort((a,b)=> (a.heightCm-b.heightCm) || (a.__order-b.__order));
  else if(sortMode==='desc') arr.sort((a,b)=> (b.heightCm-a.heightCm) || (a.__order-b.__order));
  else arr.sort((a,b)=> a.__order-b.__order);
  return arr;
}

// 基準人物との差分：本人は呼び出し側で「基準」と表示するため、ここでは差分のみを扱う。
function formatHeightDiff(diffCm){
  const sign = diffCm===0 ? '±' : (diffCm>0 ? '＋' : '−');
  return `基準より ${sign}${Math.abs(diffCm)}cm`;
}

// 長い人物名をSVG内で2行までの目安で折り返す。それ以外（短い名前）は改行しない。
// 収まらない場合は2行目の末尾を省略する（正確なピクセル計測はしない簡易実装。文字単位で強制改行はしない＝1行に収まる限りは分割しない）。
function wrapNameForChart(name, maxCharsPerLine){
  const s = (name && String(name).trim()) || '（名称未設定）';
  if(s.length <= maxCharsPerLine) return [s];
  const line1 = s.slice(0, maxCharsPerLine);
  let line2 = s.slice(maxCharsPerLine);
  if(line2.length > maxCharsPerLine){
    line2 = line2.slice(0, Math.max(0, maxCharsPerLine-1)) + '…';
  }
  return [line1, line2];
}

// 落ち着いた色を人物ごとに自動で割り当てる（派手な原色は使わない）。表示順のインデックスで巡回する。
const HEIGHTCMP_PALETTE = [
  '#5b6089', // 紫がかった青
  '#4d6f86', // くすんだ青
  '#8a5049', // くすんだ赤
  '#4f7a72', // 青緑
  '#8a6a45', // 茶
  '#6a6560', // グレー
  '#705a8a', // 紫
  '#5a7a58', // くすんだ緑
];

// ---- シルエットの形（丸みのあるピクトグラム、パーツ別のSVG要素） ----
// 「頭上=0、床=100」のローカル座標に一度だけデザインし、実際の描画では
// <g transform="translate(centerX, headTopY) scale(heightPx/100)"> で縦横同比率に拡大縮小する。
// これにより全キャラクターが完全に同じ形・同じ比率になり、背が高い人物だけ太くなることもない。
// 頭・胴体・左右の腕・左右の脚をそれぞれ別のSVG要素として描き、関節部分は同色のまま少し重ねて
// 継ぎ目が目立たないようにする（尖った肘・膝・手首・足首は作らない）。約6.8頭身。
function mirrorRightHalfToClosedLoop(rightHalfPoints){
  const left = [...rightHalfPoints].slice().reverse().map(([x,y])=>[-x,y]);
  return [...rightHalfPoints, ...left];
}
function smoothClosedPathD(points){
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)} `;
  for(let i=0;i<points.length;i++){
    const [x1,y1] = points[i];
    const [x2,y2] = points[(i+1)%points.length];
    const my = y1 + (y2-y1)*0.5;
    d += `C ${x1.toFixed(2)} ${my.toFixed(2)}, ${x2.toFixed(2)} ${my.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)} `;
  }
  return d + 'Z';
}
// 手・足・腕など「輪っか状の点列」を素直に閉じるための、区間中間点を制御点にした単純な二次ベジェ。
function limbPathD(points){
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)} `;
  for(let i=0;i<points.length;i++){
    const [x1,y1] = points[i];
    const [x2,y2] = points[(i+1)%points.length];
    const mx = x1 + (x2-x1)*0.5, my = y1 + (y2-y1)*0.5;
    d += `Q ${mx.toFixed(2)} ${y1.toFixed(2)}, ${x2.toFixed(2)} ${my.toFixed(2)} `;
  }
  return d + 'Z';
}

// 胴体：首の下から腰までの、角のない丸い台形状の1パーツ。右半分の輪郭だけを上→下で書き、
// 左右対称にミラーして閉じる。上端・下端は頭や脚に少し重なる位置に置き、継ぎ目を隠す。
const HEIGHTCMP_TORSO_RIGHT = [
  [3, 16],    // 首（頭の下、短く細い）
  [9, 20],    // 肩（水平にせず、首からなだらかに下げる）
  [8.7, 28],  // 胸
  [6.8, 38],  // ウエスト（少し細くなる）
  [7.8, 46],  // 腰（脚の付け根、わずかに広がる程度）
  [3, 50],    // 下端（股のあたり、脚に重なって隠れる）
];
const HEIGHTCMP_TORSO_D = smoothClosedPathD(mirrorRightHalfToClosedLoop(HEIGHTCMP_TORSO_RIGHT));

// 腕（右）：肩の付け根は胴体に重ねて接続し、そこから胴体より少し外側へ離れつつ緩やかに細くなり、
// 手首を経て指のない小さな丸い手で終わる。肘・手首はどちらも尖らせない。
const HEIGHTCMP_ARM_R_LOCAL = [
  [10.5, 20],  // 肩の付け根・外側（胴体に重ねて継ぎ目を隠す）
  [13, 32],    // 二の腕外側（胴体から離れる）
  [12.4, 44],  // 前腕外側（手首をキュッとくびれさせず、なだらかに）
  [13.2, 51],  // 手のひら外側（丸み）
  [11.2, 56],  // 手先（指のない丸い先端）
  [9.7, 51],   // 手のひら内側
  [10, 44],    // 前腕内側
  [10.6, 31],  // 二の腕内側
  [10, 21],    // 肩の付け根・内側
];
const HEIGHTCMP_ARM_L_D = limbPathD(HEIGHTCMP_ARM_R_LOCAL.map(([x,y]) => [-x, y]));
const HEIGHTCMP_ARM_R_D = limbPathD(HEIGHTCMP_ARM_R_LOCAL);

// 脚（右）：腰の下（胴体下端に重ねる）から足先まで自然に細くなり、足首は尖らせず、
// 足先だけわずかに幅を持たせて丸く接地する。左右へ大きく張り出させない。
const HEIGHTCMP_LEG_R_LOCAL = [
  [4.8, 47],  // 腰・外側（胴体下端に重ねる）
  [5.8, 62],  // 太もも外側
  [4.9, 80],  // すね外側（膝を丸く通過）
  [4.5, 90],  // 足首外側（キュッとくびれさせず、なだらかに）
  [5.6, 97],  // 足の甲（丸く広がる）
  [4.8, 100], // 足先外側（丸く接地）
  [2.6, 100], // 足先内側
  [2.2, 97],  // 足首内側
  [1.8, 80],  // すね内側
  [2, 62],    // 太もも内側
  [2.2, 47],  // 腰・内側
];
const HEIGHTCMP_LEG_L_D = limbPathD(HEIGHTCMP_LEG_R_LOCAL.map(([x,y]) => [-x, y]));
const HEIGHTCMP_LEG_R_D = limbPathD(HEIGHTCMP_LEG_R_LOCAL);

const HEIGHTCMP_HEAD_R = 7.4;    // 頭の半径（ローカル座標。直径14.8 ≒ 全身の約1/6.8 → 約6.8頭身）
const HEIGHTCMP_HEAD_CY = HEIGHTCMP_HEAD_R; // 頭頂部(y=0)がheadTopYに一致するよう中心を半径ぶん下げる

// 約6.8頭身の、丸みのある無個性なピクトグラム型シルエット。全員が完全に同じ形・同じ比率で、
// heightPxに応じて<g>ごと縦横同比率に拡大縮小する（体格差は付けない、縦だけを伸ばさない）。
// heightPx はその人物の身長（heightCm）に比例した高さで、頭頂部が floorY-heightPx に一致する。
// 描画順は「脚→胴体→腕→頭」。同色で少し重ねて描くことで関節の継ぎ目を目立たなくしている。
function HeightSilhouette({ centerX, floorY, heightPx, color }){
  const headTopY = floorY - heightPx;
  const scale = heightPx/100;
  return (
    <g transform={`translate(${centerX} ${headTopY}) scale(${scale})`}>
      <path d={HEIGHTCMP_LEG_L_D} fill={color} />
      <path d={HEIGHTCMP_LEG_R_D} fill={color} />
      <path d={HEIGHTCMP_TORSO_D} fill={color} />
      <path d={HEIGHTCMP_ARM_L_D} fill={color} />
      <path d={HEIGHTCMP_ARM_R_D} fill={color} />
      <circle cx="0" cy={HEIGHTCMP_HEAD_CY} r={HEIGHTCMP_HEAD_R} fill={color} />
    </g>
  );
}

const HEIGHTCMP_CHART_PX = 300;    // 床から表示上限cmまでの縦ピクセル数（cm範囲に応じて自動縮尺）
const HEIGHTCMP_TOP_PAD = 34;      // 頭上の身長表示ぶんの余白（最上部の人物でも数値が切れない高さ）
const HEIGHTCMP_BOTTOM_PAD = 62;   // 足元の名前（最大2行）＋差分ぶんの余白
const HEIGHTCMP_COL_W = 118;       // 一人あたりの表示幅（丸みのある腕が隣と重ならないよう90〜110pxよりやや広め）
const HEIGHTCMP_AXIS_W = 54;       // 左側の目盛り軸の幅
const HEIGHTCMP_SIDE_PAD = 44;     // 目盛り領域とは別に確保する、先頭・末尾人物の左右余白（40px以上）
const HEIGHTCMP_MAJOR_STEP = 50;   // 数値付きの主要目盛り
const HEIGHTCMP_MINOR_STEP = 10;   // 数値なしの薄い補助目盛り
const HEIGHTCMP_GRID_MAJOR = 'rgba(44,42,40,0.20)';
const HEIGHTCMP_GRID_MINOR = 'rgba(44,42,40,0.10)';
const HEIGHTCMP_FLOOR_COLOR = '#3a362f';
const HEIGHTCMP_TEXT_COLOR = '#2c2a28';
const HEIGHTCMP_SUBTEXT_COLOR = '#6b665d';
const HEIGHTCMP_BASELINE_MARK = '#2c2a28';

function HeightCompareView({ data, onBack }){
  const validChars = useMemo(()=>collectValidHeightChars(data.characters), [data.characters]);
  const validIds = useMemo(()=>new Set(validChars.map(c=>c.id)), [validChars]);

  const [selectedIds, setSelectedIds] = useState(()=>new Set(validChars.map(c=>c.id)));
  const [sortMode, setSortMode] = useState('asc'); // 'registered' | 'asc' | 'desc'
  const [baselineId, setBaselineId] = useState('');
  const initRef = useRef(false);

  // 初回のみ：身長登録済みの人物をすべて選択状態にする
  useEffect(()=>{
    if(!initRef.current && validChars.length>0){
      initRef.current = true;
      setSelectedIds(new Set(validChars.map(c=>c.id)));
    }
  }, [validChars]);

  // 身長が未登録になった・削除されたキャラクターは選択状態から自然に外す
  useEffect(()=>{
    setSelectedIds(prev => {
      const next = new Set([...prev].filter(id=>validIds.has(id)));
      return next.size===prev.size ? prev : next;
    });
  }, [validIds]);

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    if(next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const selectAll = () => setSelectedIds(new Set(validChars.map(c=>c.id)));
  const selectNone = () => setSelectedIds(new Set());

  const displayChars = useMemo(()=>{
    const selected = validChars.filter(c=>selectedIds.has(c.id));
    return sortHeightChars(selected, sortMode);
  }, [validChars, selectedIds, sortMode]);

  const displayIds = useMemo(()=>new Set(displayChars.map(c=>c.id)), [displayChars]);

  // 基準人物が比較対象から外れたら「基準なし」へ戻す
  useEffect(()=>{
    if(baselineId && !displayIds.has(baselineId)) setBaselineId('');
  }, [baselineId, displayIds]);

  const baselineChar = baselineId ? displayChars.find(c=>c.id===baselineId) : null;

  // 表示上限cm：最大身長を50cm単位で切り上げ（+αの余白を含む）、最低200cmは確保する
  const maxH = displayChars.length ? Math.max(...displayChars.map(c=>c.heightCm)) : 0;
  const topCm = Math.max(Math.ceil((maxH + 15) / HEIGHTCMP_MAJOR_STEP) * HEIGHTCMP_MAJOR_STEP, 200);
  const pxPerCm = HEIGHTCMP_CHART_PX / topCm;
  const floorY = HEIGHTCMP_TOP_PAD + HEIGHTCMP_CHART_PX;
  const svgH = floorY + HEIGHTCMP_BOTTOM_PAD;
  const cmToY = (cm) => floorY - cm*pxPerCm;

  const majorTicks = [];
  for(let t=0; t<=topCm; t+=HEIGHTCMP_MAJOR_STEP) majorTicks.push(t);
  const minorTicks = [];
  for(let t=0; t<=topCm; t+=HEIGHTCMP_MINOR_STEP){ if(t % HEIGHTCMP_MAJOR_STEP !== 0) minorTicks.push(t); }

  const figuresW = HEIGHTCMP_SIDE_PAD*2 + HEIGHTCMP_COL_W*Math.max(displayChars.length,1);
  // 1文字あたりの目安幅を余裕を持って見積もり、短い名前は改行させず長い名前だけ2行に折り返す
  const maxCharsPerLine = Math.max(5, Math.floor((HEIGHTCMP_COL_W-14)/12));

  const axisSvgRef = useRef(null);
  const figuresSvgRef = useRef(null);

  const handleSaveSvg = () => {
    if(!axisSvgRef.current || !figuresSvgRef.current || displayChars.length===0) return;
    const axisNode = axisSvgRef.current;
    const figNode = figuresSvgRef.current;
    const axisW = HEIGHTCMP_AXIS_W;
    const figW = figuresW;
    const combined = document.createElementNS('http://www.w3.org/2000/svg','svg');
    combined.setAttribute('xmlns','http://www.w3.org/2000/svg');
    combined.setAttribute('width', String(axisW+figW));
    combined.setAttribute('height', String(svgH));
    combined.setAttribute('viewBox', `0 0 ${axisW+figW} ${svgH}`);
    const bg = document.createElementNS('http://www.w3.org/2000/svg','rect');
    bg.setAttribute('x','0'); bg.setAttribute('y','0');
    bg.setAttribute('width', String(axisW+figW)); bg.setAttribute('height', String(svgH));
    bg.setAttribute('fill', '#fbf9f4');
    combined.appendChild(bg);
    const axisClone = axisNode.cloneNode(true);
    while(axisClone.firstChild){ combined.appendChild(axisClone.firstChild); }
    const figGroup = document.createElementNS('http://www.w3.org/2000/svg','g');
    figGroup.setAttribute('transform', `translate(${axisW},0)`);
    const figClone = figNode.cloneNode(true);
    while(figClone.firstChild){ figGroup.appendChild(figClone.firstChild); }
    combined.appendChild(figGroup);
    let svgStr = new XMLSerializer().serializeToString(combined);
    if(!/^<\?xml/.test(svgStr)) svgStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgStr;
    const blob = new Blob([svgStr], { type:'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'キャラクター身長比較.svg';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="breadcrumb"><button onClick={onBack}>← キャラクター一覧へ戻る</button></div>
      <div className="toolbar">
        <h1>📏 身長比較</h1>
        <div className="filler" />
        <button className="btn btn-sm" onClick={handleSaveSvg} disabled={displayChars.length===0}>SVGで保存</button>
      </div>

      {validChars.length===0 ? (
        <div className="empty-hint">身長が登録されているキャラクターがいません。キャラクター設定の「外見設定（詳細）」から身長を登録してください。</div>
      ) : (
        <>
          <CollapsibleSection title="比較設定" defaultOpen badge={`${selectedIds.size}人選択中`}>
            <div className="heightcmp-select-head">
              <button type="button" className="btn btn-sm" onClick={selectAll}>すべて選択</button>
              <button type="button" className="btn btn-sm" onClick={selectNone}>すべて解除</button>
              <span className="heightcmp-select-count">選択人数：{selectedIds.size}人 / {validChars.length}人</span>
            </div>
            <div className="tagpicker-list" style={{marginTop:8}}>
              {validChars.map(c=>(
                <button type="button" key={c.id}
                  className={"tagpicker-option"+(selectedIds.has(c.id)?" selected":"")}
                  onClick={()=>toggleSelect(c.id)}>
                  {selectedIds.has(c.id) ? '✓ ' : ''}{c.name || '（名称未設定）'}
                  <span className="tagpicker-option-count">{c.heightCm}cm</span>
                </button>
              ))}
            </div>

            <div className="heightcmp-control-row">
              <span className="heightcmp-control-label">並び順</span>
              <div className="heightcmp-btn-group">
                <button type="button" className={"btn btn-sm"+(sortMode==='registered'?" active":"")} onClick={()=>setSortMode('registered')}>登録順</button>
                <button type="button" className={"btn btn-sm"+(sortMode==='asc'?" active":"")} onClick={()=>setSortMode('asc')}>低い順</button>
                <button type="button" className={"btn btn-sm"+(sortMode==='desc'?" active":"")} onClick={()=>setSortMode('desc')}>高い順</button>
              </div>
            </div>

            <div className="heightcmp-control-row">
              <span className="heightcmp-control-label">基準人物</span>
              <select value={baselineId} onChange={e=>setBaselineId(e.target.value)} style={{maxWidth:220}}>
                <option value="">基準なし</option>
                {displayChars.map(c=>(
                  <option key={c.id} value={c.id}>{c.name || '（名称未設定）'}　{c.heightCm}cm</option>
                ))}
              </select>
            </div>
          </CollapsibleSection>

          {displayChars.length===0 ? (
            <div className="empty-hint">比較する人物が選択されていません。上の一覧からチップを選んでください。</div>
          ) : (
            <div className="card card-pad heightcmp-chart-card">
              {baselineChar && (
                <div className="heightcmp-baseline-label">基準人物：{baselineChar.name || '（名称未設定）'}　{baselineChar.heightCm}cm</div>
              )}
              <div className="heightcmp-chart-wrap">
                <svg ref={axisSvgRef} className="heightcmp-axis-svg" width={HEIGHTCMP_AXIS_W} height={svgH}
                  viewBox={`0 0 ${HEIGHTCMP_AXIS_W} ${svgH}`} style={{writingMode:'horizontal-tb'}}>
                  <text x={HEIGHTCMP_AXIS_W-8} y={HEIGHTCMP_TOP_PAD-18} textAnchor="end" fontSize="10.5" fill={HEIGHTCMP_SUBTEXT_COLOR}>cm</text>
                  {majorTicks.map(t=>(
                    <text key={t} x={HEIGHTCMP_AXIS_W-10} y={cmToY(t)+4} textAnchor="end" fontSize="11" fontWeight="600" fill={HEIGHTCMP_SUBTEXT_COLOR}>{t}</text>
                  ))}
                </svg>
                <div className="heightcmp-scroll">
                  <svg ref={figuresSvgRef} className="heightcmp-figures-svg" width={figuresW} height={svgH}
                    viewBox={`0 0 ${figuresW} ${svgH}`} style={{writingMode:'horizontal-tb'}}>
                    {/* 10cm刻みの薄い補助線（数値なし） */}
                    {minorTicks.map(t=>(
                      <line key={'mi'+t} x1="0" y1={cmToY(t)} x2={figuresW} y2={cmToY(t)} stroke={HEIGHTCMP_GRID_MINOR} strokeWidth="1" strokeDasharray="2,4" />
                    ))}
                    {/* 50cm刻みの主要目盛り線 */}
                    {majorTicks.map(t=>(
                      t===0 ? null : (
                        <line key={'ma'+t} x1="0" y1={cmToY(t)} x2={figuresW} y2={cmToY(t)} stroke={HEIGHTCMP_GRID_MAJOR} strokeWidth="1" />
                      )
                    ))}
                    {baselineChar && (
                      <line x1="0" y1={cmToY(baselineChar.heightCm)} x2={figuresW} y2={cmToY(baselineChar.heightCm)}
                        stroke={HEIGHTCMP_BASELINE_MARK} strokeWidth="1" strokeDasharray="5,4" opacity="0.55" />
                    )}
                    <line x1="0" y1={floorY} x2={figuresW} y2={floorY} stroke={HEIGHTCMP_FLOOR_COLOR} strokeWidth="1.75" />

                    {displayChars.map((c, i)=>{
                      const centerX = HEIGHTCMP_SIDE_PAD + i*HEIGHTCMP_COL_W + HEIGHTCMP_COL_W/2;
                      const isBaseline = c.id===baselineId;
                      const color = HEIGHTCMP_PALETTE[i % HEIGHTCMP_PALETTE.length];
                      const heightPx = c.heightCm*pxPerCm;
                      const headTopY = floorY - heightPx;
                      const nameLines = wrapNameForChart(c.name, maxCharsPerLine);
                      const diff = baselineChar ? (c.heightCm - baselineChar.heightCm) : null;
                      const nameY = floorY + 20;
                      const diffY = nameY + nameLines.length*15 + 4;
                      return (
                        <g key={c.id}>
                          <title>{c.name || '（名称未設定）'}（{c.heightCm}cm）</title>
                          {isBaseline && (
                            <rect x={HEIGHTCMP_SIDE_PAD + i*HEIGHTCMP_COL_W + 4} y={HEIGHTCMP_TOP_PAD-24}
                              width={HEIGHTCMP_COL_W-8} height={svgH-(HEIGHTCMP_TOP_PAD-24)-6}
                              fill="none" stroke={color} strokeWidth="1.25" strokeDasharray="3,3" rx="8" opacity="0.8" />
                          )}
                          {/* 頭上：身長 */}
                          <text x={centerX} y={headTopY-10} textAnchor="middle" fontSize="12" fontWeight="700" fill={HEIGHTCMP_TEXT_COLOR}>{c.heightCm}cm</text>
                          <HeightSilhouette centerX={centerX} floorY={floorY} heightPx={heightPx} color={color} />
                          {/* 足元：人物名 */}
                          {nameLines.map((line, li)=>(
                            <text key={li} x={centerX} y={nameY + li*15} textAnchor="middle" fontSize="11.5" fontWeight={isBaseline?"700":"500"} fill={HEIGHTCMP_TEXT_COLOR}>{line}</text>
                          ))}
                          {/* 足元：基準人物との差分（基準人物本人は「基準」とだけ表示） */}
                          {baselineChar && (
                            <text x={centerX} y={diffY} textAnchor="middle" fontSize="10.5" fontWeight={isBaseline?"700":"400"} fill={isBaseline?color:HEIGHTCMP_SUBTEXT_COLOR}>
                              {isBaseline ? '基準' : formatHeightDiff(diff)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

