/* ============ 新プロット（plotV2）：データ構造・検証・木の操作 ============
   data.plotV2 = { schemaVersion:1, items:[ツリー], structures:[構成設定] }
   ・items：配列順＝読者に見せる順番。まとまり(group)は children を持ち、出来事(event)は末端。IDは固定（編集・移動で変えない）。
   ・structures：各まとまりごとの構成設定。端点は出来事IDで持ち、範囲は「対象まとまり内の出来事を表示順にたどって」解釈する。
   ・旧 data.plot（旧プロット）とは完全に別。旧データから新プロットへの自動変換・自動紐付けは行わない。
   ・形式が不正／未対応バージョンのデータは空で上書きしない（validatePlotV2 が失敗を返し、呼び出し側が原本を保持する）。 */
const PLOTV2_VERSION = 1;
const PLOTV2_UI_KEY = 'novel-world-builder-plotv2-ui-v1'; // 端末内の表示設定（作品データ・バックアップ・クラウド同期には含めない）
const PLOTV2_MAX_DEPTH = 100;
const PLOTV2_ROLE_COLORS = ['#c8553d','#2f73a3','#8a5fb0','#3b3f5c','#2f8f74','#b07a1f','#a03a6a','#5f7a2f'];
const PLOTV2_SCENE_KEYS = ['goal','obstacle','change','memo'];

function emptyPlotV2(){ return { schemaVersion:PLOTV2_VERSION, items:[], structures:[] }; }

function plotV2Fail(message){ return { ok:false, message }; }
function plotV2Str(o, k, path){
  const v = o[k];
  if(v===undefined || v===null) return '';
  if(typeof v !== 'string') throw new Error(`${path}.${k} が文字列ではありません`);
  return v;
}
function plotV2IdList(o, k, path){
  const v = o[k];
  if(v===undefined || v===null) return [];
  if(!Array.isArray(v)) throw new Error(`${path}.${k} が配列ではありません`);
  v.forEach((x,i)=>{ if(typeof x !== 'string') throw new Error(`${path}.${k}[${i}] が文字列ではありません`); });
  return v.slice();
}
// 参考画像：[{ id:画像ID, memo:短いメモ }]。無い（旧データ）なら空。画像本体はimageStorageにあり、ここには持たない。
function plotV2Images(o, path){
  const v = o.images;
  if(v===undefined || v===null) return [];
  if(!Array.isArray(v)) throw new Error(`${path}.images が配列ではありません`);
  return v.map((x, i) => {
    const q = `${path}.images[${i}]`;
    if(!x || typeof x!=='object' || Array.isArray(x)) throw new Error(`${q} がオブジェクトではありません`);
    if(typeof x.id!=='string' || !x.id) throw new Error(`${q} の画像IDがありません`);
    return { id:x.id, memo:plotV2Str(x,'memo',q) };
  });
}
// 検証＋正規化。成功時は { ok:true, value }（ID・並び・入れ子・文章・関連ID・下書きID・参考画像・構成端点をそのまま保つ）。失敗時は { ok:false, message }。
function validatePlotV2(raw){
  try{
    if(!raw || typeof raw!=='object' || Array.isArray(raw)) return plotV2Fail('新プロットのデータがオブジェクトではありません。');
    if(raw.schemaVersion !== PLOTV2_VERSION) return plotV2Fail(`未対応のバージョンです（schemaVersion: ${JSON.stringify(raw.schemaVersion)}）。このアプリが扱えるのは ${PLOTV2_VERSION} です。`);
    if(!Array.isArray(raw.items)) return plotV2Fail('items が配列ではありません。');
    if(raw.structures!==undefined && raw.structures!==null && !Array.isArray(raw.structures)) return plotV2Fail('structures が配列ではありません。');
    const ids = new Set();
    const useId = (n, path) => {
      if(typeof n.id !== 'string' || !n.id) throw new Error(`${path} のIDがありません`);
      if(ids.has(n.id)) throw new Error(`${path} のIDが重複しています（${n.id}）`);
      ids.add(n.id);
    };
    const walk = (list, path, depth) => {
      if(depth > PLOTV2_MAX_DEPTH) throw new Error('入れ子が深すぎます');
      return list.map((n, i) => {
        const p = `${path}[${i}]`;
        if(!n || typeof n!=='object' || Array.isArray(n)) throw new Error(`${p} がオブジェクトではありません`);
        useId(n, p);
        if(n.kind === 'group'){
          if(n.children!==undefined && n.children!==null && !Array.isArray(n.children)) throw new Error(`${p}.children が配列ではありません`);
          return { id:n.id, kind:'group', label:plotV2Str(n,'label',p), title:plotV2Str(n,'title',p), summary:plotV2Str(n,'summary',p),
            children: walk(n.children||[], `${p}.children`, depth+1) };
        }
        if(n.kind === 'event'){
          if(Array.isArray(n.children) ? n.children.length>0 : (n.children!==undefined && n.children!==null)) throw new Error(`${p} は出来事ですが子を持っています`);
          const sc = n.scene;
          if(sc!==undefined && sc!==null && (typeof sc!=='object' || Array.isArray(sc))) throw new Error(`${p}.scene がオブジェクトではありません`);
          const scene = {}; PLOTV2_SCENE_KEYS.forEach(k => { scene[k] = plotV2Str(sc||{}, k, `${p}.scene`); });
          return { id:n.id, kind:'event', title:plotV2Str(n,'title',p), summary:plotV2Str(n,'summary',p), detail:plotV2Str(n,'detail',p),
            chars:plotV2IdList(n,'chars',p), places:plotV2IdList(n,'places',p), scene,
            draftId:plotV2Str(n,'draftId',p), images:plotV2Images(n,p) };
        }
        throw new Error(`${p}.kind が group / event のどちらでもありません`);
      });
    };
    const items = walk(raw.items, 'items', 0);
    const stIds = new Set(), roleIds = new Set();
    const structures = (raw.structures||[]).map((s, i) => {
      const p = `structures[${i}]`;
      if(!s || typeof s!=='object' || Array.isArray(s)) throw new Error(`${p} がオブジェクトではありません`);
      if(typeof s.id!=='string' || !s.id) throw new Error(`${p} のIDがありません`);
      if(stIds.has(s.id)) throw new Error(`${p} のIDが重複しています`);
      stIds.add(s.id);
      if(typeof s.groupId!=='string') throw new Error(`${p}.groupId が文字列ではありません`);
      if(s.roles!==undefined && s.roles!==null && !Array.isArray(s.roles)) throw new Error(`${p}.roles が配列ではありません`);
      const roles = (s.roles||[]).map((r, j) => {
        const q = `${p}.roles[${j}]`;
        if(!r || typeof r!=='object' || Array.isArray(r)) throw new Error(`${q} がオブジェクトではありません`);
        if(typeof r.id!=='string' || !r.id) throw new Error(`${q} のIDがありません`);
        if(roleIds.has(r.id)) throw new Error(`${q} のIDが重複しています`);
        roleIds.add(r.id);
        return { id:r.id, name:plotV2Str(r,'name',q), color:plotV2Str(r,'color',q) || PLOTV2_ROLE_COLORS[j % PLOTV2_ROLE_COLORS.length],
          startId:plotV2Str(r,'startId',q), endId:plotV2Str(r,'endId',q) };
      });
      return { id:s.id, groupId:s.groupId, type:plotV2Str(s,'type',p), roles };
    });
    return { ok:true, value:{ schemaVersion:PLOTV2_VERSION, items, structures } };
  }catch(e){
    return plotV2Fail('新プロットのデータの形式が不正です：' + (e && e.message ? e.message : String(e)));
  }
}
// バックアップ／クラウドの取り込み前チェック。plotV2 が無い（旧形式）ならOK（空として扱う）。存在して不正ならエラー文を返す。
function plotV2PayloadError(dataObj){
  if(!dataObj || typeof dataObj!=='object') return null;
  if(dataObj.plotV2===undefined || dataObj.plotV2===null) return null;
  const r = validatePlotV2(dataObj.plotV2);
  return r.ok ? null : r.message;
}
// migrateData から呼ぶ。plotV2 が無ければ空。不正なら空にはせず、原本を plotV2Error.raw に退避してエラーを立てる（保存・書き出し時は原本を書き戻す）。
function migratePlotV2(parsed){
  const raw = parsed.plotV2;
  delete parsed.plotV2Error;
  if(raw===undefined || raw===null){ parsed.plotV2 = emptyPlotV2(); return parsed; }
  const r = validatePlotV2(raw);
  if(r.ok){ parsed.plotV2 = r.value; }
  else { parsed.plotV2 = emptyPlotV2(); parsed.plotV2Error = { message:r.message, raw }; }
  return parsed;
}
// 保存・書き出し用：不正データの原本を持っている間は、空の新プロットではなく原本を書き戻す（破損状態を確定させない）。
function serializableData(d){
  if(d && d.plotV2Error){
    const { plotV2Error, ...rest } = d;
    return { ...rest, plotV2: plotV2Error.raw };
  }
  return d;
}
function plotV2CountAll(plot){
  let n = 0;
  const walk = (list) => (list||[]).forEach(x => { n++; if(x.kind==='group') walk(x.children); });
  walk(plot && plot.items);
  return n;
}

/* ---- 木の基本操作（itemsを明示的に受け取る。移動・並べ替えはitemsを直接書き換える） ---- */
function pvFind(items, id, list, parent, depth){
  list = list || items; parent = parent || null; depth = depth || 0;
  for(let i = 0; i < list.length; i++){
    const n = list[i];
    if(n.id === id) return { node:n, list, index:i, parent, depth };
    if(n.kind === 'group'){ const r = pvFind(items, id, n.children, n, depth + 1); if(r) return r; }
  }
  return null;
}
function pvSelfOrDesc(root, id){
  if(root.id === id) return true;
  return root.kind === 'group' && root.children.some(c => pvSelfOrDesc(c, id));
}
function pvCountAll(n){ return n.kind === 'group' ? n.children.reduce((a,c)=>a + 1 + pvCountAll(c), 0) : 0; }
function pvForEach(items, fn){ items.forEach(n => { fn(n); if(n.kind === 'group') pvForEach(n.children, fn); }); }
function pvListOf(items, parentId){ if(!parentId) return items; const i = pvFind(items, parentId); return i && i.node.kind === 'group' ? i.node.children : null; }
function pvCanMove(items, id, destId){
  if(destId === null) return !!pvFind(items, id);
  const info = pvFind(items, id), d = pvFind(items, destId);
  if(!info || !d || d.node.kind !== 'group') return false;
  return !pvSelfOrDesc(info.node, destId);
}
function pvMove(items, id, destId){ // 移動先の末尾へ
  if(!pvCanMove(items, id, destId)) return false;
  const info = pvFind(items, id); if(!info) return false;
  info.list.splice(info.index, 1);
  pvListOf(items, destId).push(info.node);
  return true;
}
function pvShift(items, id, dir){ // 同じ親の中で一つ入れ替える（所属・階層は変えない）
  const info = pvFind(items, id); if(!info) return false;
  const j = info.index + dir; if(j < 0 || j >= info.list.length) return false;
  const [n] = info.list.splice(info.index, 1); info.list.splice(j, 0, n);
  return true;
}
function pvMakeGroup(label, title, summary){ return { id:uid('pvg'), kind:'group', label:label||'', title:title||'', summary:summary||'', children:[] }; }
function pvMakeEvent(title, summary){
  return { id:uid('pve'), kind:'event', title:title||'', summary:summary||'', detail:'', chars:[], places:[], scene:{ goal:'', obstacle:'', change:'', memo:'' }, draftId:'', images:[] };
}
function pvPlain(n){ return (n.kind === 'group' ? [n.label, n.title].filter(x=>x&&x.trim()).join(' ') : n.title) || '未定'; }

/* ---- 構成：対象まとまり内の出来事を表示順に並べ、端点IDの位置で範囲を決める ---- */
function pvGroupFlat(items, groupId){
  const g = pvFind(items, groupId), flat = [];
  if(!g || g.node.kind !== 'group') return null; // 対象のまとまりが無い
  const walk = (list, parent) => list.forEach(n => { if(n.kind === 'group') walk(n.children, n); else flat.push({ node:n, parent }); });
  walk(g.node.children, g.node);
  return flat;
}
// 役割の状態：{s:'unset'} | {s:'ok',a,b,count} | {s:'check',reason}。flat が null のときは対象まとまりが削除済み。
function pvRoleStatus(items, r, flat){
  if(!r.startId && !r.endId) return { s:'unset' };
  if(!flat) return { s:'check', reason:'対象のまとまりが削除されています' };
  const endpoint = (id, name) => {
    if(!id) return `${name}が未設定です`;
    if(flat.some(x => x.node.id === id)) return '';
    return pvFind(items, id) ? `${name}の出来事が対象のまとまりの外へ移動しています` : `${name}の出来事が削除されています`;
  };
  const e1 = endpoint(r.startId, '始点'), e2 = endpoint(r.endId, '終点');
  if(e1 || e2) return { s:'check', reason:[e1, e2].filter(Boolean).join('／') };
  const a = flat.findIndex(x => x.node.id === r.startId), b = flat.findIndex(x => x.node.id === r.endId);
  if(a > b) return { s:'check', reason:'始点と終点の順序が逆です' };
  return { s:'ok', a, b, count:b - a + 1 };
}
// 出来事ID → 帯の情報。bandGroupIds に含まれるまとまりの構成だけを対象にする。範囲が重なる場合は先の役割を優先。
function pvBuildStMap(plot, bandGroupIds){
  const map = {};
  plot.structures.forEach(s => {
    if(!bandGroupIds.has(s.groupId)) return;
    const flat = pvGroupFlat(plot.items, s.groupId); if(!flat) return;
    s.roles.forEach(r => {
      const st = pvRoleStatus(plot.items, r, flat); if(st.s !== 'ok') return;
      for(let i = st.a; i <= st.b; i++){
        const id = flat[i].node.id; if(map[id]) continue;
        const prevSame = i > st.a && map[flat[i-1].node.id] && map[flat[i-1].node.id].role === r;
        const chapterChanged = prevSame && flat[i-1].parent !== flat[i].parent;
        map[id] = { role:r, label: !prevSame || chapterChanged, cont: chapterChanged };
      }
    });
  });
  return map;
}
// 要確認の一覧（プロット上部で確認・解除するための材料）。構成設定の自動削除・端点の自動置換はしない。
function pvCheckList(plot){
  const out = [];
  plot.structures.forEach(s => {
    const flat = pvGroupFlat(plot.items, s.groupId);
    if(!flat){ out.push({ st:s, role:null, orphan:true, reason:'対象のまとまりが削除されています' }); return; }
    s.roles.forEach(r => { const x = pvRoleStatus(plot.items, r, flat); if(x.s === 'check') out.push({ st:s, role:r, orphan:false, reason:x.reason }); });
  });
  return out;
}

/* ---- 端末内の表示設定（通常時の開閉・構成帯の表示）。作品データとは別保存。表示はカード固定（旧設定の view は読み込み時に無視し、保存時に残さない） ---- */
function loadPlotV2Ui(){
  const def = { col:{}, ev:{}, sc:{}, st:{}, rh:false };
  try{
    const o = JSON.parse(localStorage.getItem(PLOTV2_UI_KEY) || 'null');
    if(!o || typeof o!=='object') return def;
    const m = (x) => (x && typeof x==='object' && !Array.isArray(x)) ? x : {};
    return { col:m(o.col), ev:m(o.ev), sc:m(o.sc), st:m(o.st), rh:!!o.rh };
  }catch(e){ return def; }
}
function savePlotV2Ui(ui, items){
  try{
    const alive = new Set(); pvForEach(items, n => alive.add(n.id));
    const keep = (o) => { const r = {}; Object.keys(o).forEach(k => { if(alive.has(k) && o[k]) r[k] = true; }); return r; };
    localStorage.setItem(PLOTV2_UI_KEY, JSON.stringify({ col:keep(ui.col), ev:keep(ui.ev), sc:keep(ui.sc), st:keep(ui.st), rh:!!ui.rh }));
  }catch(e){}
}

const PLOTV2_CSS = @@PLOTV2_CSS@@;

/* ============ 新プロット：画面（最新試作の表示・操作を基準にする） ============
   ・表示は試作と同じ見た目・操作を保つため、Shadow DOM（本体CSSと干渉しない）の中に描画する。
   ・入力欄は「入力のたびに作り直さない」方式：入力はモデルへ直接反映し、再描画しない（フォーカス・カーソル・日本語変換が途切れない）。
     本体の保存（data.plotV2）への反映は、変換中を避けて少し遅らせて行い、画面移動・フォーカス離脱・構成操作の時にすぐ反映する。
   ・Reactの再描画で作り直されないよう、この部分はReactが管理しない領域として扱う。 */
const PLOTV2_PALETTE = ['#2f73a3','#e0149f','#e8782a','#6a8a5a','#7a6aa8','#b07a1f','#2f8f74','#a03a6a'];

function createPlotV2View(host, api){
  const root = host.attachShadow({ mode:'open' });
  root.innerHTML = `<style>${PLOTV2_CSS}</style><div class="pv v-card"><div class="wrap"></div><div class="mroot"></div><div class="troot"></div><input type="file" accept="image/*" id="refFile" hidden></div>`;
  const pv = root.querySelector('.pv'), wrap = root.querySelector('.wrap'), mroot = root.querySelector('.mroot'), troot = root.querySelector('.troot');

  let model = null, lastCommitted = null, errState = null;
  const mine = new WeakSet(); // 自分が本体へ渡したデータ、および取り込み済みのデータ。React側の反映が遅れて古いデータが戻ってきても、外部変更とは扱わない（関連付けや入力が古い状態で巻き戻らないようにする）
  let ctx = { chars:[], places:[] };
  const ui = loadPlotV2Ui();
  let mode = 'normal', mv = { sel:null, col:{} };
  let dirty = false, timer = null, composing = false, destroyed = false;
  let stMap = {}, modalY = null, pendingAdd = null, pendingOk = null;
  let flist = [], pickSt = { id:null, folderId:null, q:'' }; // 文章のフォルダ一覧（選択ダイアログ用の参照のみ）
  let dmap = new Map(), dsig = ''; // 下書き（文章の正本は本体の data.drafts。ここは表示用に参照するだけで、文章は持たない・書き換えない）
  let writerOpen = false, lastLaunchVS = null, pendingImgEvent = null;
  let reader = { scope:null }, readBack = null;
  const bk = new Set(); // 「退避した元の文章」を開いている出来事（一時状態）
  const imgCache = new Map(), imgPending = new Set(); // キャラアイコン：画像IDごとの表示用URL（プロットには画像データを保存しない。既存の画像保存から都度取得）

  /* ---------- 保存への受け渡し ---------- */
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function commit(){
    clearTimeout(timer); timer = null;
    if(!dirty || !model) return;
    dirty = false;
    const obj = { schemaVersion:PLOTV2_VERSION, items:clone(model.items), structures:clone(model.structures) };
    lastCommitted = obj; mine.add(obj);
    api.setPlot(obj);
  }
  // 下書きを新しく作って出来事へ関連付ける時は、プロットの更新と下書きの追加を「1回のデータ更新」で本体へ渡す
  function commitWithDraft(entry){
    clearTimeout(timer); timer = null; dirty = false;
    const obj = { schemaVersion:PLOTV2_VERSION, items:clone(model.items), structures:clone(model.structures) };
    lastCommitted = obj; mine.add(obj);
    api.setPlotAndDraft(obj, entry);
  }
  function touch(){ dirty = true; api.markDirty(); clearTimeout(timer); timer = setTimeout(commit, 250); }
  function changed(){ touch(); commit(); }
  const saveUi = () => { if(model) savePlotV2Ui(ui, model.items); };

  /* ---------- 表示用の小道具 ---------- */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const orUndecided = s => s && s.trim() ? esc(s) : '（未定）';
  const sceneFilled = n => PLOTV2_SCENE_KEYS.some(k => n.scene[k] && n.scene[k].trim());
  const plain = pvPlain;
  const find = (id) => pvFind(model.items, id);
  const PEN = '<span class="pen" aria-hidden="true">✎</span>'; // 直接編集できる場所の目印（操作ではない）
  const fT = (id, f, val, ph, cls) => { const ta = `<textarea class="inl ag ${cls}" rows="1" data-f="${f}" data-id="${id}" placeholder="${ph}" aria-label="${ph}" autocomplete="off" enterkeyhint="next">${esc(val)}</textarea>`; return cls==='lb' ? ta : `<span class="edw">${ta}${PEN}</span>`; };
  const avatar = (c, cls) => `<span class="av ${cls||''}" data-img="${esc(c.imageId||'')}"><span class="avph">${cls==='place'?esc(c.icon):'?'}</span></span>`;
  // 取得済みの画像を表示へ反映。未取得なら既存の画像保存から読み込む（失敗・未登録は代替表示のまま。表示寸法は固定なのでレイアウトは動かない）
  //   .av＝キャラアイコン／.rimgb＝参考画像のサムネイル／.lbox＝拡大表示。画像は別々に取得しても同じキャッシュを使う。
  const IMG_CLS = { av:'avimg', rimgb:'rimgimg', lbox:'lbimg' };
  function paintIcons(){
    root.querySelectorAll('.av[data-img], .rimgb[data-img], .lbox[data-img]').forEach(el => {
      const id = el.dataset.img; if(!id) return;
      const kind = el.classList.contains('av') ? 'av' : el.classList.contains('rimgb') ? 'rimgb' : 'lbox';
      const u = imgCache.get(id);
      if(u){ if(!el.querySelector('img')){ const im = document.createElement('img'); im.className = IMG_CLS[kind]; im.alt = kind==='av' ? '' : '参考画像'; im.src = u; el.textContent = ''; el.appendChild(im); } return; }
      if(imgCache.has(id)){ if(kind!=='av' && !el.querySelector('.rimgph')) el.innerHTML = '<span class="rimgph">画像を読み込めません</span>'; return; }
      if(imgPending.has(id)) return;
      imgPending.add(id);
      Promise.resolve().then(() => imageStorage.get(id)).then(x => imgCache.set(id, x || null), () => imgCache.set(id, null))
        .then(() => { imgPending.delete(id); if(!destroyed) paintIcons(); });
    });
  }
  root.addEventListener('error', e => {
    const t = e.target; if(!t || !t.classList) return;
    const kind = t.classList.contains('avimg') ? 'av' : t.classList.contains('rimgimg') ? 'rimgb' : t.classList.contains('lbimg') ? 'lbox' : '';
    if(!kind) return;
    const el = t.parentNode; if(el && el.dataset) imgCache.set(el.dataset.img, null);
    if(el){ el.innerHTML = kind==='av' ? '<span class="avph">?</span>' : '<span class="rimgph">画像を読み込めません</span>'; }
  }, true);
  const fA = (id, f, val, ph, cls, aria) => `<span class="edw"><textarea class="inl ag ${cls}" rows="1" data-f="${f}" data-id="${id}" placeholder="${ph}" aria-label="${aria||ph}">${esc(val)}</textarea>${PEN}</span>`;
  const SCENE_FIELDS = [['goal','目的','目的を追加'],['obstacle','対立・障害','対立・障害を追加'],['change','場面で起きる変化','変化を追加'],['memo','自由メモ','メモを追加']];
  const colorOf = (id) => { let h = 0; for(const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PLOTV2_PALETTE[h % PLOTV2_PALETTE.length]; };
  const mvName = n => n.label.trim() || n.title.trim() || '未定';
  const bandSet = () => new Set(Object.keys(ui.st).filter(k => ui.st[k]));
  const findRole = (rid) => { for(const s of model.structures){ const r = s.roles.find(x => x.id === rid); if(r) return { s, r }; } return null; };

  /* ---------- 出来事・まとまり（通常表示） ---------- */
  function addBtn(parentId, list){
    const last = list.length ? list[list.length - 1].id : '';
    return `<button class="lnk addbtn" data-act="addDlg" data-parent="${parentId||''}" data-after="${last}">＋ 追加</button>`;
  }
  function relHtml(n){
    const chars = n.chars.map(id => ctx.chars.find(c => c.id === id)).filter(Boolean);
    const places = n.places.map(id => ctx.places.find(p => p.id === id)).filter(Boolean);
    const lostC = n.chars.length - chars.length, lostP = n.places.length - places.length;
    const cs = chars.map(c => `<button type="button" class="ppl pplb" data-act="openChar" data-cid="${esc(c.id)}" aria-label="${esc(c.name)}の設定を開く">${avatar(c)}<span class="pname">${esc(c.name)}</span></button>`).join('');
    const ps = places.map(p => `<span class="ppl">${avatar(p,'place')}<span class="pname">${esc(p.name)}</span></span>`).join('');
    const lc = lostC ? `<span class="none-txt">（登録の無い人物 ${lostC}件）</span>` : '', lp = lostP ? `<span class="none-txt">（登録の無い場所 ${lostP}件）</span>` : '';
    const hasC = chars.length || lostC, hasP = places.length || lostP;
    return `${hasC ? `<div class="rline">${cs}${lc}</div>` : ''}${hasP ? `<div class="rline"><span class="rlab">場所</span>${ps}${lp}</div>` : ''}<div class="rline"><button class="lnk sm" data-act="relEdit" data-id="${n.id}" aria-label="キャラクター・場所を編集">関連資料を編集</button></div>`;
  }
  function renderEvent(n){
    const st = stMap[n.id], open = !!ui.ev[n.id], sceneOpen = !!ui.sc[n.id];
    let h = `<div class="card event${st?' st':''}${open?' isopen':''}" data-node="${n.id}"${st?` style="--stc:${esc(st.role.color)}"`:''}>`;
    if(st && st.label) h += `<div class="strow"><button class="stl" style="background:${esc(st.role.color)}" data-act="rangeDlg" data-role="${st.role.id}" aria-label="構成「${esc(st.role.name)}」の範囲を編集">${esc(st.role.name)||'（役割名なし）'}</button>${st.cont?'<span class="stcont">続き</span>':''}</div>`;
    h += `<div class="ehead" data-row="${n.id}">${fT(n.id,'title',n.title,'タイトルを入力','t')}${fA(n.id,'summary',n.summary,'概要を追加','s')}
      <div class="tgrow"><button type="button" class="lnk tgl" data-act="toggleDetail" data-id="${n.id}" aria-expanded="${open}"><span class="tri" aria-hidden="true">${open?'▼':'▶'}</span>${open?'出来事を閉じる':'出来事を開く'}</button></div></div>`;
    if(open){
      h += `<div class="edetail"><div class="sech">文章</div>${writeBlockHtml(n)}<div class="sech">参考資料</div>${relHtml(n)}${refImgsHtml(n)}<div class="sech">シーン設計</div>`;
      if(sceneOpen) h += `<div class="scene">${SCENE_FIELDS.map(([k,l,ph]) => `<div class="sf"><div class="sl">${l}</div>${fA(n.id,'scene.'+k,n.scene[k],ph,'d',l)}</div>`).join('')}</div>`;
      else if(n.scene.change.trim()) h += `<div class="scsum"><b>場面で起きる変化</b>${esc(n.scene.change)}</div>`;
      const scHint = (!sceneOpen && !n.scene.change.trim() && sceneFilled(n)) ? '<span class="scnote">・入力あり</span>' : '';
      h += `<div class="erow"><button class="lnk" data-act="toggleScene" data-id="${n.id}" aria-expanded="${sceneOpen}"><span class="tri" aria-hidden="true">${sceneOpen?'▼':'▶'}</span>${sceneOpen?'シーン設計を閉じる':'シーン設計を開く'}${scHint}</button></div></div>`;
    }
    return h + `</div>`;
  }
  /* ---------- 文章（関連する文章）・参考画像 ----------
     文章の正本は本体の data.drafts。プロットの出来事は draftId で参照するだけで、文章を二重に持たない（detail は元の文章として保全し、文章とは連動しない）。 */
  function draftState(n){
    if(!n.draftId) return { kind:'none' };
    const d = dmap.get(n.draftId);
    if(!d) return { kind:'missing' };
    if(d.deleted) return { kind:'trash', draft:d };
    return { kind:'ok', draft:d };
  }
  const evName = n => (n.title || '').trim() || '未定';
  const grpName = n => (n.label || '').trim() || 'まとまり'; // 開閉の表示に使う区分名（未設定は「まとまり」）
  function usersOf(did, exceptId){ const out = []; pvForEach(model.items, x => { if(x.kind === 'event' && x.draftId === did && x.id !== exceptId) out.push(x); }); return out; }
  function linkedCount(n){ let d = 0, im = 0; const w = x => { if(x.kind === 'group') x.children.forEach(w); else { if(x.draftId) d++; im += x.images.length; } }; w(n); return { d, im }; }
  const PREVIEW_MAX = 600; // プレビュー表示だけの上限（保存文章は切り詰めない）
  function writeBlockHtml(n){
    const ds = draftState(n), hasDetail = !!(n.detail || '').trim();
    const bkBtn = hasDetail && ds.kind !== 'none' ? `<button type="button" class="lnk sm" data-act="toggleBackup" data-id="${n.id}" aria-expanded="${bk.has(n.id)}">${bk.has(n.id) ? '退避した元の文章を閉じる' : '退避した元の文章を見る'}</button>` : '';
    const bkBox = bkBtn && bk.has(n.id) ? `<div class="wbk"><div class="wmeta">プロットに書かれていた元の文章（退避です。文章とは連動しません）</div><div class="dtext">${esc(n.detail)}</div></div>` : '';
    if(ds.kind === 'missing') return `<div class="wblock"><div class="wissue">⚠ 関連づけた文章が見つかりません（削除された可能性があります）。空の文章へは置き換えていません。
      <div class="wacts"><button type="button" class="lnk sm" data-act="pickDraft" data-id="${n.id}">文章を選び直す</button><button type="button" class="lnk sm" data-act="unlinkAsk" data-id="${n.id}">関連を解除</button>${bkBtn}</div></div>${bkBox}</div>`;
    if(ds.kind === 'trash') return `<div class="wblock"><div class="wissue">⚠ 関連づけた文章「${esc(ds.draft.title)}」はゴミ箱にあります。
      <div class="wacts"><button type="button" class="lnk sm" data-act="restoreDraft" data-id="${n.id}">ゴミ箱から復元して使う</button><button type="button" class="lnk sm" data-act="pickDraft" data-id="${n.id}">別の文章を選ぶ</button><button type="button" class="lnk sm" data-act="unlinkAsk" data-id="${n.id}">関連を解除</button>${bkBtn}</div></div>${bkBox}</div>`;
    const text = ds.kind === 'ok' ? ds.draft.body : (n.detail || '');
    const shown = text.length > PREVIEW_MAX ? text.slice(0, PREVIEW_MAX) + '…' : text;
    let meta = '';
    if(ds.kind === 'ok'){
      const others = usersOf(n.draftId, n.id);
      meta = `<span class="wmeta">文章「${esc(ds.draft.title)}」${others.length ? `・同じ文章を「${esc(others.map(evName).join('」「'))}」でも使っています（共有）` : ''}</span>`;
    } else if(text.trim()){
      meta = `<span class="wmeta">プロットに書かれた文章（まだ文章につながっていません）</span>`;
    }
    const prev = text.trim()
      ? `<button type="button" class="wprev" data-act="openWriter" data-id="${n.id}" aria-label="文章を編集する"><span class="wtxt">${esc(shown)}</span><span class="wed">✎ 書く</span></button>`
      : `<button type="button" class="wprev" data-act="openWriter" data-id="${n.id}" aria-label="文章を書く"><span class="wempty">✎ 書く</span></button>`;
    // 文章の操作（変える・解除・退避の表示）は控えめな入口へまとめる。未設定の時は「書く」「選ぶ」を出す
    const acts = ds.kind === 'ok'
      ? `<button type="button" class="lnk sm" data-act="textMenu" data-id="${n.id}" aria-label="文章の操作を開く">文章の操作</button>`
      : `<button type="button" class="lnk sm" data-act="pickDraft" data-id="${n.id}">既存の文章を選ぶ</button>`;
    return `<div class="wblock">${prev}<div class="wsub">${meta}<span class="wacts">${acts}</span></div>${bkBox}</div>`;
  }
  function refImgsHtml(n){
    const thumbs = n.images.map(im => `<div class="rimgw"><button type="button" class="rimgb" data-act="viewImg" data-id="${n.id}" data-img="${esc(im.id)}" aria-label="参考画像を拡大${im.memo ? '：' + esc(im.memo) : ''}"><span class="rimgph">…</span></button>${im.memo ? `<span class="rimgm">${esc(im.memo)}</span>` : ''}</div>`).join('');
    return `<div class="rimgs">${thumbs}<button type="button" class="lnk sm rimgadd" data-act="addImg" data-id="${n.id}" aria-label="参考画像を追加">画像を追加</button></div>`;
  }

  /* ---------- 通し読み：ツリーを表示順にたどり、文章だけをつなげて表示する（別データとしては保存しない） ---------- */
  function readerEvent(n){
    const ds = draftState(n), name = esc(evName(n));
    if(ds.kind === 'missing') return `<div class="rd-ev rd-warn" data-node="${n.id}"><div class="rd-cap">${name}</div><div class="rd-state">⚠ 関連づけた文章が見つかりません（退避した文章へは切り替えていません）</div><div class="wacts"><button type="button" class="lnk sm" data-act="pickDraft" data-id="${n.id}">文章を選び直す</button><button type="button" class="lnk sm" data-act="unlinkAsk" data-id="${n.id}">関連を解除</button></div></div>`;
    if(ds.kind === 'trash') return `<div class="rd-ev rd-warn" data-node="${n.id}"><div class="rd-cap">${name}</div><div class="rd-state">⚠ 関連づけた文章「${esc(ds.draft.title)}」はゴミ箱にあります（退避した文章へは切り替えていません）</div><div class="wacts"><button type="button" class="lnk sm" data-act="restoreDraft" data-id="${n.id}">復元して使う</button><button type="button" class="lnk sm" data-act="pickDraft" data-id="${n.id}">別の文章を選ぶ</button></div></div>`;
    const text = ds.kind === 'ok' ? ds.draft.body : (n.detail || '');
    if(!text.trim()){
      if(ui.rh) return '';
      return `<div class="rd-ev rd-empty" data-node="${n.id}"><span>未執筆：${name}</span><button type="button" class="lnk sm" data-act="openWriter" data-id="${n.id}">書く</button></div>`;
    }
    const shared = ds.kind === 'ok' && usersOf(n.draftId, n.id).length ? '<span class="rd-sh">共有</span>' : '';
    return `<div class="rd-ev" data-node="${n.id}"><div class="rd-cap"><span>${name}</span>${shared}<button type="button" class="lnk sm rd-ed" data-act="openWriter" data-id="${n.id}" aria-label="${name}の文章を編集">✎ 編集</button></div><div class="rd-text">${esc(text)}</div></div>`;
  }
  function readerHtml(){
    let scopeNode = reader.scope ? find(reader.scope) : null;
    if(reader.scope && !scopeNode) reader.scope = null;
    const items = scopeNode ? [scopeNode.node] : model.items;
    let body = '', total = 0, empty = 0;
    const walk = (list, depth) => list.forEach(n => {
      if(n.kind === 'group'){
        const t = [n.label.trim(), n.title.trim()].filter(Boolean).join('　');
        body += `<div class="rd-h rd-h${Math.min(depth, 3)}" data-node="${n.id}">${t ? esc(t) : '（区分未定）'}</div>`;
        walk(n.children, depth + 1);
      } else {
        total++;
        const ds = draftState(n);
        if(ds.kind === 'none' ? !(n.detail || '').trim() : ds.kind === 'ok' && !ds.draft.body.trim()) empty++;
        body += readerEvent(n);
      }
    });
    walk(items, 0);
    const scopeName = scopeNode ? `「${esc(plain(scopeNode.node))}」の中だけ` : '作品全体';
    return `<div class="rd-bar"><button type="button" class="btn" data-act="exitRead">← プロットへ戻る</button><div class="rd-title">通し読み</div></div>
      <div class="rd-scope"><span>${scopeName}・出来事${total}件・未執筆${empty}件</span><button type="button" class="lnk sm" data-act="toggleHide" aria-pressed="${!!ui.rh}">${ui.rh ? '✓ ' : ''}未執筆を隠す</button></div>
      <div id="view" class="reader">${body || '<div class="emptyall">読む文章がありません。</div>'}</div>`;
  }
  function enterRead(scope){
    if(composing){ toast('文字の変換を確定してから「通し読み」を押してください'); return; }
    const ae = root.activeElement; if(ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName)) ae.blur();
    commit();
    readBack = captureViewState();
    mode = 'read'; reader = { scope:scope || null }; mv = { sel:null, col:{} };
    render(); window.scrollTo(0, 0);
  }
  function exitRead(){
    mode = 'normal'; render();
    if(readBack) restoreViewState(readBack);
    readBack = null;
  }

  /* ---------- 執筆モーダルを開く・キャラ資料を開く（本体側のReact画面へ依頼する） ---------- */
  function captureViewState(){ return { scrollY:window.scrollY, anchor:captureAnchor(), reader: mode === 'read' ? { scope:reader.scope } : null }; }
  function restoreViewState(vs){
    if(!vs) return;
    if(vs.anchor) restoreAnchor(vs.anchor);
    else if(typeof vs.scrollY === 'number') window.scrollTo(0, vs.scrollY);
  }
  function launchWriter(id, did){
    lastLaunchVS = captureViewState();
    api.openWriter({ eventId:id, draftId:did, origin: mode === 'read' ? 'reader' : 'plot', viewState:lastLaunchVS });
  }
  // 新しい文章を作って出来事へ関連付け、書き始める。プロットの更新と文章の追加は1回のデータ更新で行う。detail は変更しない（退避として残る）。
  function beginDraft(id, copyDetail){
    const i = find(id); if(!i) return;
    const n = i.node;
    const entry = { ...makeDraftEntry((n.title || '').trim() || '無題の文章', copyDetail ? n.detail : '', null, null), origin:'draft' }; // 保存先はフォルダ外（後から整理できる）
    n.draftId = entry.id;
    dmap.set(entry.id, entry);
    commitWithDraft(entry);
    render();
    launchWriter(id, entry.id);
  }
  function openWriter(id){
    if(mode === 'move') return; // 移動モードでは文章の編集を開かない
    if(composing){ toast('文字の変換を確定してから開いてください'); return; }
    const ae = root.activeElement; if(ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName)) ae.blur();
    commit(); // 資料・モーダルを開く前に、入力中の変更を本体へ反映する
    const i = find(id); if(!i) return;
    const n = i.node, ds = draftState(n);
    if(ds.kind === 'ok'){ launchWriter(id, ds.draft.id); return; }
    if(ds.kind === 'none'){
      if((n.detail || '').trim()){
        askDlg('この文章を新しい文章へコピーして編集する',
          `<p>プロットに書かれている文章を、新しい文章へそのままコピー（改行も含む）して、文章のほうを編集します。</p><p class="hint">元の文章はプロットに退避として残り、あとから確認できます。「やめる」では何も変わりません。</p>`,
          'コピーして編集する', () => { closeModal(); beginDraft(id, true); });
      } else beginDraft(id, false);
      return;
    }
    issueDlg(id);
  }
  function openChar(cid){
    if(mode === 'move') return;
    if(composing){ toast('文字の変換を確定してから開いてください'); return; }
    const ae = root.activeElement; if(ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName)) ae.blur();
    commit();
    api.openChar({ charId:cid, viewState:captureViewState() });
  }
  function issueDlg(id){
    const i = find(id); if(!i) return;
    const ds = draftState(i.node);
    openModal(`<h2>関連づけた文章を確認してください</h2><div class="where warn">${ds.kind === 'trash' ? `文章「${esc(ds.draft.title)}」はゴミ箱にあります。` : '関連づけた文章が見つかりません。'}</div>
      <div class="hint">空の文章へは自動で置き換えません。次のどれかを選んでください。</div>
      <div class="ops">${ds.kind === 'trash' ? `<button class="btn" data-act="restoreDraft" data-id="${id}">ゴミ箱から復元して使う</button>` : ''}<button class="btn" data-act="pickDraft" data-id="${id}">別の文章を選ぶ</button><button class="btn danger" data-act="unlinkAsk" data-id="${id}">関連を解除</button></div>
      <div class="foot"><button class="btn" data-act="close">閉じる</button></div>`);
  }
  // 文章を選ぶ：共通の「文章」一覧から。フォルダを辿る・タイトル/本文で検索できる。
  function pickDraftDlg(id, folderId){
    const i = find(id); if(!i) return;
    const n = i.node;
    pickSt = { id, folderId: folderId || null, q:'' };
    openModal(`<h2>文章を選ぶ</h2><div class="where">出来事：「${esc(evName(n))}」</div>
      <div class="hint">選んだ文章を、この出来事の文章として使います。文章の中身は変わらず、プロットに書かれた元の文章も上書きしません。</div>
      <div class="field"><input type="search" data-pk="q" placeholder="タイトル・文章内容で検索" autocomplete="off"></div>
      <div id="pkhead"></div><div id="pklist"></div>
      <div class="foot"><button class="btn" data-act="close">キャンセル</button></div>`);
    fillPick();
  }
  function pkPath(fid){ const out = []; let cur = fid; const seen = new Set(); while(cur && !seen.has(cur)){ seen.add(cur); const f = flist.find(x => x.id === cur); if(!f) break; out.unshift(f); cur = f.parentId; } return out; }
  function fillPick(){
    const i = find(pickSt.id); const head = mroot.querySelector('#pkhead'), box = mroot.querySelector('#pklist');
    if(!i || !head || !box) return;
    const n = i.node, q = pickSt.q.trim().toLowerCase();
    const fid = flist.some(f => f.id === pickSt.folderId) ? pickSt.folderId : null;
    const users = new Map();
    pvForEach(model.items, x => { if(x.kind === 'event' && x.draftId){ if(!users.has(x.draftId)) users.set(x.draftId, []); users.get(x.draftId).push(evName(x)); } });
    const live = [...dmap.values()].filter(d => !d.deleted);
    const cur = fid ? flist.find(f => f.id === fid) : null;
    const parent = cur && cur.parentId ? flist.find(f => f.id === cur.parentId) : null;
    head.innerHTML = q ? `<div class="hint">検索結果（すべてのフォルダから）</div>`
      : `<div style="display:flex;align-items:center;gap:8px;margin:6px 0">${cur ? `<button type="button" class="btn" data-act="pickFolder" data-fid="${esc(cur.parentId || '')}">← ${esc(parent ? parent.name : '文章')}</button>` : ''}<b style="min-width:0;overflow-wrap:anywhere">${cur ? '📁 ' + esc(cur.name) : '📝 文章'}</b></div>`;
    const texts = (q ? live.filter(d => (d.title || '').toLowerCase().includes(q) || (d.body || '').toLowerCase().includes(q) || (d.memo || '').toLowerCase().includes(q))
                      : live.filter(d => (d.folderId || null) === fid))
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    const folders = q ? [] : flist.filter(f => (f.parentId || null) === fid).sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    const frows = folders.map(f => `<button type="button" class="pick" data-act="pickFolder" data-fid="${esc(f.id)}"><span class="pname"><b>📁 ${esc(f.name)}</b></span><span class="ck">›</span></button>`).join('');
    const trows = texts.map(d => { const u = users.get(d.id) || [], on = n.draftId === d.id;
      const where = q && d.folderId ? pkPath(d.folderId).map(f => f.name).join(' / ') + '・' : '';
      return `<button type="button" class="pick${on ? ' on' : ''}" data-act="pickDraftSel" data-id="${esc(pickSt.id)}" data-did="${esc(d.id)}"><span class="pname"><b>${esc(d.title)}</b><span class="hint" style="display:block">${where}${d.body.length.toLocaleString()}文字${u.length ? '・出来事：' + esc(u.join('、')) : ''}</span><span class="hint" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc((d.body || '').slice(0, 40))}</span></span><span class="ck">${on ? '✓ 選択中' : ''}</span></button>`; }).join('');
    box.innerHTML = frows + trows || `<div class="hint">${q ? '見つかりませんでした。' : '文章がまだありません。「ここから書く」から新しく作れます。'}</div>`;
  }
  root.addEventListener('input', e => {
    const t = e.target; if(!t.dataset || t.dataset.pk !== 'q' || e.isComposing || composing) return;
    pickSt.q = t.value; fillPick();
  });
  root.addEventListener('compositionend', e => {
    const t = e.target; if(!t.dataset || t.dataset.pk !== 'q') return;
    pickSt.q = t.value; fillPick();
  }, true);
  function imgViewDlg(id, imgId){
    const i = find(id); if(!i) return;
    const im = i.node.images.find(x => x.id === imgId); if(!im) return;
    openModal(`<h2>参考画像</h2><div class="where">出来事：「${esc(evName(i.node))}」</div>
      <div class="lbox" data-img="${esc(imgId)}"><span class="rimgph">読み込み中…</span></div>
      <div class="field"><label>メモ（任意・短く）</label><input type="text" maxlength="40" value="${esc(im.memo)}" data-sf="imgMemo" data-id="${id}" data-img="${esc(imgId)}" placeholder="例：衣装の参考" autocomplete="off"></div>
      <div class="hint">「関連を解除」は、この出来事から外すだけです。画像データは削除しません。</div>
      <div class="foot"><button class="btn danger" data-act="imgUnlinkAsk" data-id="${id}" data-img="${esc(imgId)}">関連を解除</button><button class="btn primary" data-act="close">閉じる</button></div>`);
  }
  // 参考画像の追加：圧縮・保存（既存の処理を再利用）が成功してから、出来事へ関連付ける
  root.getElementById('refFile').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0], id = pendingImgEvent;
    e.target.value = ''; pendingImgEvent = null;
    if(!f || !id) return;
    toast('画像を保存しています…');
    try{
      const dataUrl = await compressImageFile(f);
      const imgId = uid('img');
      await imageStorage.save(imgId, dataUrl);
      imgCache.set(imgId, dataUrl);
      if(destroyed || !model) return;
      const i = find(id);
      if(!i){ toast('出来事が見つからないため、関連付けませんでした'); return; }
      i.node.images.push({ id:imgId, memo:'' });
      changed(); render(); toast('参考画像を追加しました');
    }catch(err){
      console.error('参考画像の保存に失敗しました', err);
      toast('画像を保存できませんでした。別の画像でお試しください');
    }
  });

  function strBar(g){
    const sts = model.structures.filter(s => s.groupId === g.id);
    const flat = pvGroupFlat(model.items, g.id);
    if(!sts.length) return `<div class="strbar"><span class="stunset">構成は未設定です<button class="lnk sm" data-act="structDlg" data-id="${g.id}">構成を設定</button></span></div>`;
    return `<div class="strbar">` + sts.map(s => {
      const chips = s.roles.map(r => {
        const x = pvRoleStatus(model.items, r, flat), nm = esc(r.name) || '（役割名なし）';
        if(x.s === 'unset') return `<span class="stunset">${nm}<button class="lnk sm" data-act="rangeDlg" data-role="${r.id}">範囲を設定</button></span>`;
        if(x.s === 'check') return `<button class="stchip warn" data-act="rangeDlg" data-role="${r.id}">⚠ ${nm} 要確認</button>`;
        return `<button class="stchip" style="--stc:${esc(r.color)}" data-act="rangeDlg" data-role="${r.id}">${nm}・${x.count}件</button>`;
      }).join('');
      return chips + `<button class="lnk sm" data-act="structDlg" data-id="${g.id}" data-sid="${s.id}">⚙ 構成の設定${s.type?'（'+esc(s.type)+'）':''}</button>`;
    }).join('') + `</div>`;
  }
  function renderGroup(n, depth){
    const cnt = n.children.length, col = !!ui.col[n.id], showSt = !!ui.st[n.id];
    let h = `<div class="card group ${depth % 2 ? 'odd' : 'even'}${depth >= 2 ? ' deep2' : ''}${depth >= 4 ? ' deep4' : ''}" data-node="${n.id}"><div class="ghead" data-row="${n.id}">
      <div class="grow1">${depth >= 3 ? `<span class="lvl" title="${depth + 1}階層目">${depth + 1}階層</span>` : ''}${fT(n.id,'label',n.label,'区分名','lb')}${cnt?`<span class="cnt">${cnt}件${col?'・閉じています':''}</span>`:''}<span class="gacts"><button type="button" class="lnk" data-act="readGroup" data-id="${n.id}" aria-label="このまとまりだけを通し読み">通し読み</button><button type="button" class="lnk" data-act="toggleStruct" data-id="${n.id}" aria-pressed="${showSt}">${showSt?'✓ ':''}構成</button></span></div>
      ${fT(n.id,'title',n.title,'タイトルを入力','t')}${fA(n.id,'summary',n.summary,'概要を追加','s')}
      <div class="tgrow"><button type="button" class="lnk tgl" data-act="toggle" data-id="${n.id}" aria-expanded="${!col}"><span class="tri" aria-hidden="true">${col?'▶':'▼'}</span>${esc(grpName(n))}${col?'を開く':'を閉じる'}</button></div></div>`;
    if(!col) h += `<div class="gbody">${showSt ? strBar(n) : ''}${renderList(n.children, n.id, depth + 1)}</div>`;
    return h + `</div>`;
  }
  const listCls = (parentId, depth) => `list-stack ${parentId ? 'nest' : 'top'}${depth >= 3 ? ' deep' : ''}${depth >= 5 ? ' cap' : ''}`;
  function renderList(list, parentId, depth){
    let h = `<div class="${listCls(parentId, depth)}">`;
    list.forEach(n => { h += n.kind === 'group' ? renderGroup(n, depth) : renderEvent(n); });
    if(!list.length) h += `<div class="emptyg">まだ何もありません。</div>`;
    return h + `<div class="addrow">${addBtn(parentId, list)}</div></div>`;
  }

  /* ---------- 移動モードの表示 ---------- */
  function mvActions(id){
    const info = find(id);
    return `<div class="mvact"><button class="btn" data-act="mvUp" data-id="${id}" ${info.index===0?'disabled':''}>↑ 上へ</button><button class="btn" data-act="mvDown" data-id="${id}" ${info.index===info.list.length-1?'disabled':''}>↓ 下へ</button><button class="btn" data-act="mvDest" data-id="${id}">移動先…</button></div>`;
  }
  function renderMoveEvent(n){
    const sel = mv.sel === n.id;
    return `<div class="card event mv${sel?' sel':''}" data-node="${n.id}"><div class="ehead">
      <div class="mvtap" data-act="mvSel" data-id="${n.id}" role="button" tabindex="0" aria-pressed="${sel}"><div class="ttl${n.title.trim()?'':' empty'}">${orUndecided(n.title)}</div>${n.summary.trim()?`<div class="sum clamp">${esc(n.summary)}</div>`:''}</div></div></div>${sel?mvActions(n.id):''}`;
  }
  function renderMoveGroup(n, depth){
    const sel = mv.sel === n.id, col = !!mv.col[n.id], cnt = n.children.length;
    let h = `<div class="card group mv ${depth % 2 ? 'odd' : 'even'}${depth >= 2 ? ' deep2' : ''}${depth >= 4 ? ' deep4' : ''}" data-node="${n.id}"><div class="ghead${sel?' sel':''}">
      <div class="mvtap" data-act="mvSel" data-id="${n.id}" role="button" tabindex="0" aria-pressed="${sel}">
        <div class="grow1">${depth >= 3 ? `<span class="lvl">${depth + 1}階層</span>` : ''}<span class="lbl">${n.label.trim()?esc(n.label):'区分'}</span>${cnt?`<span class="cnt">${cnt}件${col?'・閉じています':''}</span>`:''}</div>
        <div class="ttl${n.title.trim()?'':' empty'}">${orUndecided(n.title)}</div>${n.summary.trim()?`<div class="sum clamp">${esc(n.summary)}</div>`:''}</div>
      <div class="tgrow"><button type="button" class="lnk tgl" data-act="mvToggle" data-id="${n.id}" aria-expanded="${!col}"><span class="tri" aria-hidden="true">${col?'▶':'▼'}</span>${esc(grpName(n))}${col?'を開く':'を閉じる'}</button></div></div>`;
    if(sel) h += mvActions(n.id);
    if(!col) h += `<div class="gbody">${renderMoveList(n.children, n.id, depth + 1)}</div>`;
    return h + `</div>`;
  }
  function renderMoveList(list, parentId, depth){
    let h = `<div class="${listCls(parentId, depth)}">`;
    list.forEach(n => { h += n.kind === 'group' ? renderMoveGroup(n, depth) : renderMoveEvent(n); });
    if(!list.length) h += `<div class="emptyg">（空）</div>`;
    return h + `</div>`;
  }
  function mvPathNames(id){
    const names = []; let p = find(id).parent;
    while(p){ names.unshift(mvName(p)); p = find(p.id).parent; }
    return names;
  }
  function movebarHtml(){
    const sel = mv.sel, hasCheck = pvCheckList(model).length > 0;
    return `<div class="movebar" id="movebar">
      <div class="mb1"><div class="mbl"><span class="mbt">プロット</span><span class="mbadge">移動モード</span></div>
        <div class="mbr"><button class="lnk" data-act="mvOps"${sel?'':' disabled'}>項目操作</button><button class="btn done" data-act="exitMove">移動を終了</button></div></div>
      <div class="mb2"><div class="mbh" aria-live="polite">${sel ? `『${esc(plain(find(sel).node))}』を移動中` : '動かす巻・章・出来事をタップ'}</div>
        <div id="mbpath">${sel ? `<span class="pathpill">${esc(mvPathNames(sel).join(' › ') || '作品直下')}</span>` : ''}</div></div>
      <div class="mbwarn">${hasCheck ? '⚠ 構成の範囲に要確認があります（移動を終えると、プロット上部で確認できます）' : ''}</div></div>`;
  }

  /* ---------- 要確認パネル（プロット上部。確認・解除はここから） ---------- */
  function checkPanelHtml(){
    const list = pvCheckList(model);
    if(!list.length) return '';
    return `<div class="chkpanel" role="alert"><h2>⚠ 構成の設定に要確認があります（${list.length}件）</h2>
      <div class="hint">自動では直しません。範囲を設定し直すか、不要なら範囲の解除・設定の削除をしてください。</div>` +
      list.map(x => {
        const g = pvFind(model.items, x.st.groupId), gname = g ? plain(g.node) : '（削除されたまとまり）';
        const tname = x.st.type ? `「${esc(x.st.type)}」` : '';
        if(x.orphan) return `<div class="chkrow"><div><b>${esc(gname)}</b> の構成${tname}</div><div class="why">${esc(x.reason)}（役割 ${x.st.roles.length}件の設定は保持しています）</div>
          <div class="ops"><button class="btn danger" data-act="stDelAsk" data-sid="${x.st.id}">この構成設定を削除</button></div></div>`;
        return `<div class="chkrow"><div><b>${esc(gname)}</b> の構成${tname} ／ 役割「${esc(x.role.name)||'（役割名なし）'}」</div><div class="why">${esc(x.reason)}</div>
          <div class="ops"><button class="btn" data-act="rangeDlg" data-role="${x.role.id}">範囲を設定し直す</button><button class="btn" data-act="rangeClearAsk" data-role="${x.role.id}">範囲を解除</button><button class="btn danger" data-act="roleDelAsk" data-role="${x.role.id}">この役割を削除</button></div></div>`;
      }).join('') + `</div>`;
  }

  /* ---------- 全体の描画 ---------- */
  function errHtml(){
    return `<h1>プロット</h1><div class="errbox"><b>新プロットのデータを読み込めませんでした。</b><br>${esc(errState.message)}<br>
      元のデータは消さずに保持しています。この間、新プロットの編集はできません（空のデータで上書きしないためです）。バックアップからの読み込みなどで復旧できます。
      <details><summary>保持している元データを見る</summary><textarea readonly>${esc(JSON.stringify(errState.raw, null, 2))}</textarea></details></div>`;
  }
  function syncTop(){
    const tb = document.querySelector('.topbar');
    pv.style.setProperty('--pvtop', (tb ? tb.offsetHeight : 0) + 'px');
  }
  function render(){
    const y = window.scrollY;
    if(errState){ pv.className = 'pv v-card'; wrap.innerHTML = errHtml(); return; }
    if(mode === 'read'){
      pv.className = 'pv v-card mode-read';
      syncTop();
      wrap.innerHTML = readerHtml();
      paintIcons();
      window.scrollTo(0, y);
      return;
    }
    const move = mode === 'move';
    if(mv.sel && !find(mv.sel)) mv.sel = null;
    pv.className = 'pv v-card' + (move ? ' mode-move' : '');
    syncTop();
    stMap = pvBuildStMap(model, bandSet());
    const empty = !model.items.length;
    wrap.innerHTML = (move ? movebarHtml() : '') +
      `<h1>プロット</h1>` + (move ? '' : checkPanelHtml()) +
      `<div class="toolbar">
        <button class="btn tb-read" data-act="readAll" aria-label="プロットの順に作品全体を通し読み">📖 通し読み</button>
        <button class="btn" data-act="expandAll">すべて開く</button>
        <button class="btn" data-act="collapseAll">すべて閉じる</button>
        <button class="lnk tbsp" data-act="enterMove" aria-label="移動モードに入る">⇄ 移動</button>
      </div>` +
      (empty && !move ? `<div class="emptyall">新プロットはまだ空です。「＋ 追加」から、まとまり（巻・章など）や出来事を追加できます。</div>` : '') +
      `<div id="view"><div class="trunk"><div class="card endcap">開始</div>${move ? renderMoveList(model.items, null, 0) : renderList(model.items, null, 0)}<div class="card endcap">終了</div></div></div>`;
    if(!move) growAll();
    paintIcons();
    window.scrollTo(0, y);
  }
  function autoGrow(el){ el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  function growAll(){ root.querySelectorAll('#view textarea.ag').forEach(autoGrow); }
  const onResize = () => { growAll(); syncTop(); };
  window.addEventListener('resize', onResize);

  /* 見ていた要素の画面内の位置を保つ（移動モードの出入り・通し読みからの復帰で使う） */
  function captureAnchor(){
    const els = [...root.querySelectorAll('#view [data-node]')], vh = window.innerHeight;
    for(const el of els){ const r = el.getBoundingClientRect(); if(r.top >= 0 && r.top < vh) return { id:el.dataset.node, top:r.top }; }
    let pick = null;
    for(const el of els){ const r = el.getBoundingClientRect(); if(r.top < 0 && r.bottom > 0) pick = { id:el.dataset.node, top:r.top }; }
    return pick;
  }
  function restoreAnchor(a){
    if(!a) return;
    const el = root.querySelector(`#view [data-node="${a.id}"]`); if(!el) return;
    const d = el.getBoundingClientRect().top - a.top;
    if(d) window.scrollBy(0, d);
  }

  /* ---------- 移動モード ---------- */
  function ensureVisible(){
    const sel = mv.sel; if(!sel) return;
    const el = root.querySelector(`#view [data-node="${sel}"]`); if(!el) return;
    const head = el.querySelector('.ehead, .ghead') || el, act = root.querySelector('#view .mvact');
    const bar = root.getElementById('movebar'), hh = bar ? bar.getBoundingClientRect().bottom : 0;
    const r1 = head.getBoundingClientRect(), r2 = (act || head).getBoundingClientRect();
    if(r1.top < hh + 8) window.scrollBy(0, r1.top - hh - 8);
    else if(r2.bottom > window.innerHeight - 8) window.scrollBy(0, r2.bottom - window.innerHeight + 8);
  }
  function enterMove(){
    if(composing){ toast('文字の変換を確定してから「移動」を押してください'); return; }
    const ae = root.activeElement; if(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) ae.blur();
    commit();
    const a = captureAnchor(), col = {};
    pvForEach(model.items, n => { if(n.kind === 'group') col[n.id] = !!ui.col[n.id]; });   // 移動中の開閉は通常表示と分けて持つ（一時状態）
    mode = 'move'; mv = { sel:null, col }; render(); restoreAnchor(a);
  }
  function exitMove(){
    const sel = mv.sel;
    let a = captureAnchor();
    if(sel){
      const el = root.querySelector(`#view [data-node="${sel}"]`); if(el) a = { id:sel, top:el.getBoundingClientRect().top };
      let p = (find(sel) || {}).parent;                       // 選択項目が見えるよう、必要な祖先だけ開く
      while(p){ ui.col[p.id] = false; p = find(p.id).parent; }
      saveUi();
    }
    mode = 'normal'; mv = { sel:null, col:{} }; render(); restoreAnchor(a);
    if(sel){ const el = root.querySelector(`#view [data-node="${sel}"]`); if(el){ const r = el.getBoundingClientRect(); if(r.top < 0 || r.bottom > window.innerHeight) window.scrollBy(0, r.top - window.innerHeight / 3); } }
  }

  /* ---------- モーダル・トースト ---------- */
  function closeModal(){ mroot.innerHTML = ''; if(modalY !== null){ window.scrollTo(0, modalY); modalY = null; } }
  function openModal(html){ if(!mroot.firstChild) modalY = window.scrollY; mroot.innerHTML = `<div class="overlay" data-act="overlay"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`; paintIcons(); }
  function toast(msg){ troot.innerHTML = `<div class="toast">${esc(msg)}</div>`; clearTimeout(toast.t); toast.t = setTimeout(()=>{ troot.innerHTML = ''; }, 2200); }
  function askDlg(title, bodyHtml, okLabel, onOk, danger){
    pendingOk = onOk;
    openModal(`<h2>${esc(title)}</h2>${bodyHtml}<div class="foot"><button class="btn" data-act="close">やめる</button><button class="btn ${danger?'danger':'primary'}" data-act="askOk">${esc(okLabel)}</button></div>`);
  }

  function addDlg(parentId, afterId){
    pendingAdd = { parentId: parentId || null, afterId: afterId || null, kind:'event' };
    const parent = parentId ? find(parentId).node : null;
    const where = `追加先：${parent ? `「${esc(plain(parent))}」の中` : '作品直下'}・${afterId ? `「${esc(plain(find(afterId).node))}」の後ろ` : '先頭'}${(!afterId && pvListOf(model.items, parentId||null).length===0) ? '（まだ空です）' : ''}`;
    openModal(`<h2>追加</h2><div class="where">${where}</div>
      <div class="kindsel"><button type="button" data-act="kind" data-kind="group">まとまり</button><button type="button" class="on" data-act="kind" data-kind="event">出来事</button></div>
      <div class="kinddesc"><div data-kd="group"><b>まとまり</b>：巻・章・話など、出来事をまとめる入れ物</div><div data-kd="event" class="on"><b>出来事</b>：物語で起きること・場面</div></div>
      <div class="field" id="f_label_wrap" style="display:none"><label>区分名（巻・章・話など自由に。空でも可）</label><input id="f_label" type="text" placeholder="例：3章"></div>
      <div class="field"><label>タイトル（空でも可）</label><input id="f_title" type="text"></div>
      <div class="field"><label>短い概要（任意）</label><input id="f_sum" type="text"></div>
      <div class="foot"><button class="btn" data-act="close">キャンセル</button><button class="btn primary" data-act="addOk">追加</button></div>`);
    setTimeout(()=>{ const e = root.getElementById('f_title'); if(e) e.focus(); }, 30);
  }
  function mvOpsDlg(id){
    const n = find(id).node;
    openModal(`<h2>項目操作</h2><div class="where">${esc(plain(n))}</div>
      <div class="ops">
        <button class="btn" data-act="addBefore" data-id="${id}">この前に追加</button>
        <button class="btn" data-act="addAfter" data-id="${id}">この後に追加</button>
        <button class="btn danger" data-act="delDlg" data-id="${id}">削除</button>
      </div>
      <div class="foot"><button class="btn primary" data-act="close">閉じる</button></div>`);
  }
  function delDlg(id){
    const n = find(id).node, c = pvCountAll(n);
    openModal(`<h2>削除の確認</h2><p>「${esc(plain(n))}」を削除します。</p>
      ${n.kind==='group'?`<p><b>まとまりを削除すると、${c?`中の項目${c}件もすべて削除されます。`:'中の項目も削除されます（現在は空です）。'}</b></p>`:''}
      ${(lk => (lk.d || lk.im) ? `<p class="hint">関連づけた文章${lk.d}件とその履歴は削除されません（文章一覧に残ります）。参考画像${lk.im}枚は関連付けだけが消え、画像データ本体は削除されません。</p>` : '')(linkedCount(n))}
      <div class="foot"><button class="btn" data-act="close">やめる</button><button class="btn danger" data-act="delOk" data-id="${id}">削除する</button></div>`);
  }
  function mvDestDlg(id){
    const info = find(id), curParent = info.parent ? info.parent.id : null;
    const cand = (destId, path, title, note) => `<button class="dest" data-act="mvPick" data-id="${id}" data-dest="${destId||''}" ${note?'disabled':''}>${path?`<span class="dpath">${esc(path)}</span>`:''}<span class="dt">${esc(title)}</span>${note?`<span class="dnote">${note}</span>`:''}</button>`;
    let items = cand(null, '', '作品直下', curParent === null ? '現在の場所' : '');
    const walk = (list, anc) => list.forEach(n => {
      if(n.kind !== 'group') return;
      const note = n.id === curParent ? '現在の場所' : (pvSelfOrDesc(info.node, n.id) ? '自分または子孫の中には移動できません' : '');
      items += cand(n.id, anc.length ? anc.join(' › ') : '作品直下', plain(n), note);
      walk(n.children, anc.concat(mvName(n)));
    });
    walk(model.items, []);
    openModal(`<h2>移動先を選ぶ</h2><div class="hint">「${esc(plain(info.node))}」の移動先（まとまりまたは作品直下）を選んでください。出来事の中には移動できません。</div>
      ${items}<div class="foot"><button class="btn" data-act="close">キャンセル</button></div>`);
  }
  function mvConfirmDlg(id, destId){
    const n = find(id).node, d = destId ? find(destId).node : null;
    openModal(`<h2>${d ? 'このまとまりの末尾へ移動' : '作品直下の末尾へ移動'}</h2>
      <div class="where">対象：「${esc(plain(n))}」<br>移動先：${d ? `「${esc(plain(d))}」（${esc(mvPathNames(destId).concat(mvName(d)).join(' › '))}）` : '作品直下'}</div>
      <div class="hint">${n.kind==='group'?'中の項目もすべて一緒に移動します。':''}移動後の細かい順番は、「↑ 上へ」「↓ 下へ」で調整できます。</div>
      <div class="foot"><button class="btn" data-act="close">キャンセル</button><button class="btn primary" data-act="mvDo" data-id="${id}" data-dest="${destId||''}">移動する</button></div>`);
  }
  // 関連資料（キャラクター・場所）の編集入口
  function relEditDlg(id){
    const i = find(id); if(!i) return;
    const n = i.node;
    openModal(`<h2>関連資料を編集</h2><div class="where">出来事：「${esc(evName(n))}」</div>
      <div class="ops"><button class="btn" data-act="pickDlg" data-id="${id}" data-type="chars">キャラクターを選ぶ（${n.chars.length}件）</button><button class="btn" data-act="pickDlg" data-id="${id}" data-type="places">場所を選ぶ（${n.places.length}件）</button></div>
      <div class="foot"><button class="btn primary" data-act="close">閉じる</button></div>`);
  }
  // 文章の操作メニュー（関連の解除は文章を削除しない）
  function textMenuDlg(id){
    const i = find(id); if(!i) return;
    const n = i.node, hasDetail = !!(n.detail || '').trim();
    openModal(`<h2>文章の操作</h2><div class="where">出来事：「${esc(evName(n))}」</div>
      <div class="ops"><button class="btn" data-act="pickDraft" data-id="${id}">文章を変える</button><button class="btn danger" data-act="unlinkAsk" data-id="${id}">関連を解除</button>${hasDetail ? `<button class="btn" data-act="toggleBackupClose" data-id="${id}">${bk.has(id) ? '退避した元の文章を閉じる' : '退避した元の文章を見る'}</button>` : ''}</div>
      <div class="hint">「関連を解除」は出来事との関連付けだけを外します。文章は削除されません。</div>
      <div class="foot"><button class="btn primary" data-act="close">閉じる</button></div>`);
  }
  function pickDlg(id, type){
    const n = find(id).node, cands = type === 'chars' ? ctx.chars : ctx.places, cur = n[type];
    const known = new Set(cands.map(c => c.id)), unknown = cur.filter(x => !known.has(x));
    openModal(`<h2>${type==='chars'?'キャラクター':'場所'}を選ぶ</h2><div class="hint">${cands.length ? 'このアプリに登録されている一覧です。タップで追加／解除できます。' : `${type==='chars'?'キャラクター':'場所'}がまだ登録されていません。先に設定から登録してください。`}</div>
      ${cands.map(c => `<button class="pick${cur.includes(c.id)?' on':''}" data-act="pickToggle" data-id="${id}" data-type="${type}" data-cid="${esc(c.id)}">${avatar(c, type==='places'?'place':'')}<span class="pname">${esc(c.name)}</span><span class="ck">${cur.includes(c.id)?'✓ 追加済み':''}</span></button>`).join('')}
      ${unknown.map(u => `<button class="pick on" data-act="pickToggle" data-id="${id}" data-type="${type}" data-cid="${esc(u)}"><span class="av place"><span class="avph">？</span></span><span class="pname">登録の無い項目（削除された可能性）</span><span class="ck">✓ タップで解除</span></button>`).join('')}
      <div class="foot"><button class="btn primary" data-act="close">閉じる</button></div>`);
  }

  /* ---------- 構成の設定（まとまりごと） ---------- */
  function structDlg(groupId, sid){
    let s = sid ? model.structures.find(x => x.id === sid) : model.structures.find(x => x.groupId === groupId);
    const g = pvFind(model.items, groupId);
    if(!s){
      if(!g) return;
      s = { id:uid('pvst'), groupId, type:'', roles:[] }; model.structures.push(s); changed();
    }
    const flat = pvGroupFlat(model.items, s.groupId);
    const rows = s.roles.map(r => {
      const x = pvRoleStatus(model.items, r, flat);
      const txt = x.s === 'unset' ? '範囲：未設定' : x.s === 'check' ? `⚠ 要確認：${x.reason}` : `範囲：${x.count}件の出来事`;
      return `<div class="rolerow"><div class="rr1"><input type="color" value="${esc(r.color)}" data-sf="roleColor" data-role="${r.id}" aria-label="色"><input type="text" value="${esc(r.name)}" placeholder="役割名" data-sf="roleName" data-role="${r.id}" aria-label="役割名" autocomplete="off"></div>
        <div class="rr2${x.s==='check'?' warn':''}">${esc(txt)}</div>
        <div class="ops"><button class="btn" data-act="rangeDlg" data-role="${r.id}" data-from="struct">範囲を設定</button><button class="btn" data-act="rangeClearAsk" data-role="${r.id}" data-from="struct">範囲を解除</button><button class="btn danger" data-act="roleDelAsk" data-role="${r.id}" data-from="struct">役割を削除</button></div></div>`;
    }).join('');
    const presets = Object.keys(PLOT_PRESETS).filter(k => PLOT_PRESETS[k].length);
    const sc = mroot.querySelector('.modal') ? mroot.querySelector('.modal').scrollTop : 0;
    openModal(`<h2>構成の設定</h2><div class="where${g?'':' warn'}">対象：${g ? `「${esc(plain(g.node))}」` : '（削除されたまとまり）'}の中の出来事</div>
      <div class="field"><label>構成の型（任意。自由に入力できます。決めなくても使えます）</label><input id="s_type" type="text" value="${esc(s.type)}" data-sf="type" data-sid="${s.id}" list="pvtypes" autocomplete="off" placeholder="例：起承転結"><datalist id="pvtypes">${Object.keys(PLOT_PRESETS).map(k=>`<option value="${esc(k)}">`).join('')}</datalist></div>
      ${rows || '<div class="hint">役割がまだありません。「＋ 役割を追加」から作れます。</div>'}
      <div class="ops"><button class="btn" data-act="roleAdd" data-sid="${s.id}">＋ 役割を追加</button></div>
      <div class="ops"><select id="s_preset" aria-label="型から役割名を追加"><option value="">型から役割名をまとめて追加…</option>${presets.map(k=>`<option value="${esc(k)}">${esc(k)}（${esc(PLOT_PRESETS[k].join('・'))}）</option>`).join('')}</select><button class="btn" data-act="presetAdd" data-sid="${s.id}">追加</button></div>
      <div class="hint">範囲は、対象のまとまりの中の出来事を表示順にたどって決めます。章の途中から、複数の章をまたいで指定できます。</div>
      <div class="foot"><button class="btn danger" data-act="stDelAsk" data-sid="${s.id}" data-from="struct">この構成設定を削除</button><button class="btn primary" data-act="structClose">閉じる</button></div>`);
    const m = mroot.querySelector('.modal'); if(m) m.scrollTop = sc;
  }
  let structReturn = null; // 構成の設定モーダルから範囲モーダルへ入った時、戻り先を覚えておく
  function rangeDlg(rid, fromStruct){
    const f = findRole(rid); if(!f) return;
    const { s, r } = f, flat = pvGroupFlat(model.items, s.groupId);
    if(!flat){ toast('対象のまとまりが無いため、範囲は設定できません'); return; }
    structReturn = fromStruct ? { groupId:s.groupId, sid:s.id } : null;
    const st = pvRoleStatus(model.items, r, flat);
    const opts = sel => `<option value="">（選んでください）</option>` + flat.map(x => `<option value="${x.node.id}"${x.node.id===sel?' selected':''}>${esc(plain(x.parent))} ／ ${esc(x.node.title.trim() || '未定')}</option>`).join('');
    openModal(`<h2>構成の範囲を編集</h2>
      ${st.s==='check'?`<div class="where warn">要確認：${esc(st.reason)}。範囲を指定し直してください（自動では直しません）。</div>`:''}
      <div class="field"><label>役割名</label><input id="r_name" type="text" value="${esc(r.name)}"></div>
      <div class="field"><label>始まりの出来事</label><select id="r_start">${opts(r.startId)}</select></div>
      <div class="field"><label>終わりの出来事</label><select id="r_end">${opts(r.endId)}</select></div>
      <div class="hint">章の途中から、複数の章をまたいで指定できます。始まりと終わりが同じ出来事でも設定できます。</div>
      <div class="err" id="r_err"></div>
      <div class="foot"><button class="btn danger" data-act="rangeClearAsk" data-role="${r.id}">範囲を解除</button><button class="btn" data-act="rangeCancel">キャンセル</button><button class="btn primary" data-act="rangeOk" data-role="${r.id}">保存</button></div>`);
  }
  function afterRangeModal(){
    const back = structReturn; structReturn = null;
    if(back){ closeModal(); render(); structDlg(back.groupId, back.sid); } else { closeModal(); render(); }
  }

  /* ---------- 操作の受け口 ---------- */
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-act]'); if(!t) return;
    const act = t.dataset.act, id = t.dataset.id || null;
    if(mode === 'move' && (act === 'relEdit' || act === 'textMenu')) return; // 移動モードでは編集用の入口を出さない・動かさない
    if(act === 'overlay'){ if(e.target === t){ closeModal(); if(model) render(); } return; }
    switch(act){
      case 'close': closeModal(); if(model) render(); break;
      case 'toggle': ui.col[id] = !ui.col[id]; saveUi(); render(); break;
      case 'toggleDetail': ui.ev[id] = !ui.ev[id]; saveUi(); render(); break;
      case 'toggleScene': ui.sc[id] = !ui.sc[id]; saveUi(); render(); break;
      case 'toggleStruct': ui.st[id] = !ui.st[id]; saveUi(); render(); break;
      case 'expandAll': pvForEach(model.items, n => { if(n.kind==='group') ui.col[n.id] = false; else ui.ev[n.id] = true; }); saveUi(); render(); break;
      case 'collapseAll': pvForEach(model.items, n => { if(n.kind==='group') ui.col[n.id] = true; else ui.ev[n.id] = false; }); saveUi(); render(); break;
      case 'addDlg': addDlg(t.dataset.parent, t.dataset.after); break;
      case 'kind': {
        pendingAdd.kind = t.dataset.kind;
        mroot.querySelectorAll('.kindsel button').forEach(b => b.classList.toggle('on', b === t));
        mroot.querySelectorAll('.kinddesc [data-kd]').forEach(d => d.classList.toggle('on', d.dataset.kd === t.dataset.kind));
        root.getElementById('f_label_wrap').style.display = t.dataset.kind === 'group' ? '' : 'none'; break;
      }
      case 'addOk': {
        const p = pendingAdd, title = root.getElementById('f_title').value, sum = root.getElementById('f_sum').value;
        const n = p.kind === 'group' ? pvMakeGroup(root.getElementById('f_label').value, title, sum) : pvMakeEvent(title, sum);
        const list = pvListOf(model.items, p.parentId); if(!list){ toast('その場所へは追加できません'); break; }
        const i = p.afterId ? list.findIndex(x => x.id === p.afterId) : -1;
        list.splice(i + 1, 0, n);
        if(mode === 'move'){ mv.sel = n.id; if(p.parentId) mv.col[p.parentId] = false; }
        else if(p.parentId){ ui.col[p.parentId] = false; saveUi(); }
        changed(); closeModal(); render(); if(mode === 'move') ensureVisible(); break;
      }
      case 'delDlg': delDlg(id); break;
      case 'delOk': { const i = find(id); if(i){ i.list.splice(i.index, 1); changed(); } closeModal(); render(); break; }
      case 'addBefore': case 'addAfter': {
        const info = find(id);
        const afterId = act === 'addAfter' ? id : (info.index > 0 ? info.list[info.index - 1].id : null);
        addDlg(info.parent ? info.parent.id : null, afterId); break;
      }
      case 'enterMove': enterMove(); break;
      case 'exitMove': exitMove(); break;
      case 'mvSel': mv.sel = mv.sel === id ? null : id; render(); ensureVisible(); break;
      case 'mvToggle': mv.col[id] = !mv.col[id]; render(); break;
      case 'mvUp': if(pvShift(model.items, id, -1)) changed(); render(); ensureVisible(); break;
      case 'mvDown': if(pvShift(model.items, id, 1)) changed(); render(); ensureVisible(); break;
      case 'mvOps': if(mv.sel) mvOpsDlg(mv.sel); break;
      case 'mvDest': mvDestDlg(id); break;
      case 'mvPick': mvConfirmDlg(id, t.dataset.dest || null); break;
      case 'mvDo': {
        const dest = t.dataset.dest || null;
        if(!pvMove(model.items, id, dest)){ toast('その場所へは移動できません'); break; }
        changed();
        let g = dest; while(g){ mv.col[g] = false; g = find(g).parent ? find(g).parent.id : null; }   // 移動先の祖先を開く
        closeModal(); render(); ensureVisible(); toast('移動しました'); break;
      }
      case 'pickDlg': pickDlg(id, t.dataset.type); break;
      case 'relEdit': relEditDlg(id); break;
      case 'textMenu': textMenuDlg(id); break;
      case 'pickToggle': {
        const n = find(id).node, arr = n[t.dataset.type], c = t.dataset.cid, i = arr.indexOf(c);
        if(i >= 0) arr.splice(i, 1); else arr.push(c);
        changed();
        const sc = mroot.querySelector('.modal').scrollTop; pickDlg(id, t.dataset.type); mroot.querySelector('.modal').scrollTop = sc; break;
      }
      case 'askOk': { const f = pendingOk; pendingOk = null; if(f) f(); break; }
      /* 文章（文章）・参考画像・通し読み */
      case 'openWriter': openWriter(id); break;
      case 'pickDraft': pickDraftDlg(id); break;
      case 'pickFolder': pickSt.folderId = t.dataset.fid || null; fillPick(); break;
      case 'pickDraftSel': {
        const i = find(id), did = t.dataset.did; if(!i) break;
        if(i.node.draftId === did){ closeModal(); render(); break; }
        const others = usersOf(did, id);
        const doLink = () => { const j = find(id); if(!j) return; j.node.draftId = did; changed(); closeModal(); render(); toast('文章を関連付けました（プロットの元の文章はそのまま残っています）'); };
        if(others.length) askDlg('同じ文章を共有して編集します', `<p>この文章は「${esc(others.map(evName).join('」「'))}」にも関連付けられています。</p><p><b>同じ文章を共有して編集します。</b>どちらの出来事から編集しても、同じ文章が変わります。</p>`, '共有して関連付ける', doLink);
        else doLink();
        break;
      }
      case 'unlinkAsk': {
        const i = find(id); if(!i) break;
        askDlg('文章との関連付けを解除', `<p>「${esc(evName(i.node))}」と文章の関連付けだけを解除します。</p><p><b>文章とその履歴は削除されません</b>（文章一覧に残ります）。プロットの元の文章もそのままです。</p>`, '解除する', () => {
          const j = find(id); if(j){ j.node.draftId = ''; changed(); } closeModal(); render();
        }, true);
        break;
      }
      case 'restoreDraft': { const i = find(id); if(i && i.node.draftId){ api.restoreDraft(i.node.draftId); } closeModal(); render(); toast('ゴミ箱から復元しました'); break; }
      case 'toggleBackup': if(bk.has(id)) bk.delete(id); else bk.add(id); render(); break;
      case 'toggleBackupClose': if(bk.has(id)) bk.delete(id); else bk.add(id); closeModal(); render(); break;
      case 'addImg': pendingImgEvent = id; { const fi = root.getElementById('refFile'); fi.value = ''; fi.click(); } break;
      case 'viewImg': imgViewDlg(id, t.dataset.img); break;
      case 'imgUnlinkAsk': {
        const imgId = t.dataset.img;
        askDlg('参考画像の関連付けを解除', `<p>この出来事から参考画像を外します。<b>画像データ本体は削除されません。</b></p>`, '外す', () => {
          const j = find(id); if(j){ j.node.images = j.node.images.filter(x => x.id !== imgId); changed(); } closeModal(); render();
        }, true);
        break;
      }
      case 'openChar': openChar(t.dataset.cid); break;
      case 'readAll': enterRead(null); break;
      case 'readGroup': enterRead(id); break;
      case 'exitRead': exitRead(); break;
      case 'toggleHide': ui.rh = !ui.rh; saveUi(); render(); break;
      /* 構成 */
      case 'structDlg': structDlg(id, t.dataset.sid || null); break;
      case 'structClose': closeModal(); render(); break;
      case 'roleAdd': {
        const s = model.structures.find(x => x.id === t.dataset.sid); if(!s) break;
        s.roles.push({ id:uid('pvr'), name:'', color:PLOTV2_ROLE_COLORS[s.roles.length % PLOTV2_ROLE_COLORS.length], startId:'', endId:'' });
        changed(); structDlg(s.groupId, s.id); break;
      }
      case 'presetAdd': {
        const s = model.structures.find(x => x.id === t.dataset.sid); if(!s) break;
        const key = root.getElementById('s_preset').value; if(!key || !PLOT_PRESETS[key]) { toast('追加する型を選んでください'); break; }
        PLOT_PRESETS[key].forEach(nm => s.roles.push({ id:uid('pvr'), name:nm, color:PLOTV2_ROLE_COLORS[s.roles.length % PLOTV2_ROLE_COLORS.length], startId:'', endId:'' }));
        if(!s.type) s.type = key;
        changed(); structDlg(s.groupId, s.id); break;
      }
      case 'roleDelAsk': {
        const f = findRole(t.dataset.role); if(!f) break; const from = t.dataset.from === 'struct';
        askDlg('役割の削除', `<p>役割「${esc(f.r.name)||'（役割名なし）'}」を削除します。この役割の範囲設定も消えます。</p>`, '削除する', () => {
          f.s.roles = f.s.roles.filter(x => x.id !== f.r.id); changed(); if(from){ closeModal(); structDlg(f.s.groupId, f.s.id); } else { closeModal(); render(); }
        }, true); break;
      }
      case 'stDelAsk': {
        const s = model.structures.find(x => x.id === t.dataset.sid); if(!s) break; const from = t.dataset.from === 'struct';
        askDlg('構成設定の削除', `<p>この構成設定（役割${s.roles.length}件）を削除します。出来事そのものは削除されません。</p>`, '削除する', () => {
          model.structures = model.structures.filter(x => x.id !== s.id); changed(); closeModal(); render();
        }, true); break;
      }
      case 'rangeDlg': rangeDlg(t.dataset.role, t.dataset.from === 'struct'); break;
      case 'rangeCancel': afterRangeModal(); break;
      case 'rangeOk': {
        const f = findRole(t.dataset.role); if(!f) break;
        const flat = pvGroupFlat(model.items, f.s.groupId) || [];
        const name = root.getElementById('r_name').value.trim(), s = root.getElementById('r_start').value, en = root.getElementById('r_end').value;
        const err = m => { root.getElementById('r_err').textContent = m; };
        if(!name){ err('役割名を入力してください。'); break; }
        if(!s || !en){ err('始まりと終わりの出来事を選んでください。'); break; }
        if(flat.findIndex(x => x.node.id === s) > flat.findIndex(x => x.node.id === en)){ err('終わりは、始まりと同じか、それより後ろの出来事にしてください。'); break; }
        f.r.name = name; f.r.startId = s; f.r.endId = en;
        changed(); afterRangeModal(); break;
      }
      case 'rangeClearAsk': {
        const f = findRole(t.dataset.role); if(!f) break; const back = structReturn || (t.dataset.from === 'struct' ? { groupId:f.s.groupId, sid:f.s.id } : null);
        askDlg('範囲の解除', `<p>役割「${esc(f.r.name)||'（役割名なし）'}」の始点・終点の設定を解除します（役割そのものは残ります）。</p>`, '解除する', () => {
          f.r.startId = ''; f.r.endId = ''; changed(); structReturn = null; closeModal(); render(); if(back) structDlg(back.groupId, back.sid);
        }); break;
      }
    }
  });

  /* ---------- 直接編集：入力は即座にモデルへ反映（再描画しないのでフォーカス・IME入力は途切れない） ---------- */
  function applyField(t){
    const f = t.dataset && t.dataset.f; if(!f || !model) return false;
    const info = find(t.dataset.id); if(!info) return false;
    const n = info.node;
    if((f === 'title' || f === 'label') && /[\r\n]/.test(t.value)) t.value = t.value.replace(/[\r\n]+/g, ' '); // タイトル・区分名は複数行に折り返して表示するが、改行そのものは入れない
    if(f.startsWith('scene.')){ if(n.kind==='event') n.scene[f.slice(6)] = t.value; } else if(f==='label'||f==='title'||f==='summary'||f==='detail') n[f] = t.value;
    if(t.tagName === 'TEXTAREA') autoGrow(t);
    touch();
    return true;
  }
  function applyStructField(t){
    const sf = t.dataset && t.dataset.sf; if(!sf || !model) return false;
    if(sf === 'imgMemo'){ const i = find(t.dataset.id); const im = i && i.node.images && i.node.images.find(x => x.id === t.dataset.img); if(im){ im.memo = t.value; touch(); } }
    else if(sf === 'type'){ const s = model.structures.find(x => x.id === t.dataset.sid); if(s){ s.type = t.value; touch(); } }
    else { const f = findRole(t.dataset.role); if(f){ if(sf === 'roleName') f.r.name = t.value; else if(sf === 'roleColor') f.r.color = t.value; touch(); } }
    return true;
  }
  root.addEventListener('input', e => {
    if(e.isComposing || composing) return;   // 日本語変換中は確定しない（変換が終わった時にまとめて反映）
    if(!applyField(e.target)) applyStructField(e.target);
  });
  root.addEventListener('compositionstart', () => { composing = true; }, true);
  root.addEventListener('compositionend', e => {
    composing = false;
    if(!applyField(e.target)) applyStructField(e.target);
  }, true);
  root.addEventListener('focusout', () => { if(!composing) commit(); });
  root.addEventListener('keydown', e => {
    const t = e.target; if(!t.dataset || !t.dataset.f || e.isComposing || composing) return;
    if(e.key === 'Escape'){ t.blur(); return; }
    if(e.key === 'Enter' && (t.dataset.f === 'title' || t.dataset.f === 'label')){
      e.preventDefault();
      const box = t.closest('.ghead, .ehead'), next = box.querySelector(t.dataset.f === 'label' ? 'textarea[data-f=title]' : 'textarea[data-f=summary]');
      if(next) next.focus();
    }
  });
  const onHide = () => { if(document.visibilityState === 'hidden' && !composing) commit(); };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', onHide);

  /* ---------- 外から呼ぶ口 ---------- */
  return {
    sync(plot, err, chars, places, drafts, folders){
      flist = (folders || []).map(f => ({ id:f.id, name:f.name, parentId:f.parentId || null }));
      const prevSig = JSON.stringify(ctx);
      ctx = {
        chars: (chars||[]).map(c => ({ id:c.id, name:c.name || '（名前なし）', imageId:c.iconImageId || c.image || null })),
        places: (places||[]).map(p => ({ id:p.id, name:p.name || '（名前なし）', icon:'📍' })),
      };
      // 文章は参照だけ（文章はここで保存しない）。変更の検出は本文全体を比べず、更新日時・長さ・見出し・削除状態で行う。
      const list = drafts || [];
      const nsig = list.map(d => d.id + '|' + (d.deleted ? 1 : 0) + '|' + d.updatedAt + '|' + (d.body || '').length + '|' + d.title).join('\n');
      const draftsChanged = nsig !== dsig;
      dsig = nsig; dmap = new Map(list.map(d => [d.id, d]));
      if(err){ errState = err; model = null; lastCommitted = null; dirty = false; clearTimeout(timer); closeModal(); render(); return; }
      errState = null;
      // 取り込み済み・自分が渡したデータの古い参照が遅れて届いても、外部変更とは扱わない（関連付けや入力が巻き戻らないように）
      if(!model || (plot !== lastCommitted && !mine.has(plot))){
        clearTimeout(timer); dirty = false;
        model = clone(plot); lastCommitted = plot; mine.add(plot);
        mode = 'normal'; mv = { sel:null, col:{} }; mroot.innerHTML = ''; modalY = null;
        render();
      } else if(model && (prevSig !== JSON.stringify(ctx) || draftsChanged) && !composing && !writerOpen && !(root.activeElement && /^(INPUT|TEXTAREA)$/.test(root.activeElement.tagName))){
        render(); // キャラ名・アイコン・文章の文章や見出しの変更を反映（入力中・執筆モーダルを開いている間は触らない）
      }
    },
    // 執筆モーダルの開閉。開いている間は再描画を止め、閉じたら最新の文章で描き直して読んでいた位置へ戻る
    setWriterOpen(v){
      if(writerOpen === v) return;
      writerOpen = v;
      if(!v && model && !errState && !destroyed){ render(); restoreViewState(lastLaunchVS); }
    },
    // キャラ資料などから戻ってきた時：プロット（または通し読み）の元の位置・状態へ戻す。開閉状態は端末内のUI設定から復元済み
    restoreState(vs){
      if(!vs || !model || errState) return;
      lastLaunchVS = vs;
      if(vs.reader){ mode = 'read'; reader = { scope: vs.reader.scope && find(vs.reader.scope) ? vs.reader.scope : null }; readBack = null; }
      render(); restoreViewState(vs);
      requestAnimationFrame(() => { if(!destroyed) restoreViewState(vs); });
    },
    destroy(){
      destroyed = true;
      commit();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      clearTimeout(timer);
    },
  };
}

/* ============ プロット内の執筆モーダル ============
   ・文章の正本は data.drafts。ここでは関連する文章1件の全文だけを編集する（出来事側に文章は持たない）。
   ・本文の更新・履歴は draftApplyBody などの共通処理を使い、対象の文章1件だけを書き換える（古い画面内データで文章全体を上書きしない）。
   ・道具・辞書・シーン進行は執筆画面と同じ部品を使い、挿入先はこのモーダルで編集中の文章（writer.draftId）に限る。 */
function useVisualViewportBox(){
  const read = () => { const vv = window.visualViewport; return vv ? { top:Math.round(vv.offsetTop), height:Math.round(vv.height) } : { top:0, height:window.innerHeight }; };
  const [box, setBox] = useState(read);
  useEffect(()=>{
    const vv = window.visualViewport;
    const update = () => setBox(read());
    update();
    window.addEventListener('resize', update);
    if(vv){ vv.addEventListener('resize', update); vv.addEventListener('scroll', update); }
    return () => { window.removeEventListener('resize', update); if(vv){ vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); } };
  }, []);
  return box;
}

// 参考画像のサムネイル。縦横比を保って全体を表示する（切り抜かない）。未取得・読み込み失敗は代替表示で、文章の編集は妨げない。
function PlotImageThumb({ imageId, memo, onOpen }){
  const [url, setUrl] = useState(undefined);
  useEffect(()=>{
    let alive = true; setUrl(undefined);
    imageStorage.get(imageId).then(u=>{ if(alive) setUrl(u || null); }).catch(err=>{ console.error('画像の読み込みに失敗しました', err); if(alive) setUrl(null); });
    return ()=>{ alive = false; };
  }, [imageId]);
  return (
    <div className="pw-thumbw">
      <button type="button" className="pw-thumb" onMouseDown={e=>e.preventDefault()} onPointerDown={e=>e.preventDefault()}
        onClick={()=>{ if(url) onOpen(url, memo); }} aria-label={'参考画像を拡大'+(memo?'：'+memo:'')}>
        {url ? <img src={url} alt={memo||'参考画像'} onError={()=>setUrl(null)} /> : <span className="pw-ph">{url===undefined ? '…' : '画像を読み込めません'}</span>}
      </button>
      {memo ? <span className="pw-cap">{memo}</span> : null}
    </div>
  );
}

function PlotDraftWriter({ data, setData, writer, onClose, onOpenChar, saveState, onSaveNow, backRef,
  writingSnippets, setWritingSnippets, expressionDictionary, setExpressionDictionary, specialDictionary, setSpecialDictionary,
  lastSpecialImportIds, setLastSpecialImportIds, mediaDictionary, setMediaDictionary, lastMediaImportIds, setLastMediaImportIds,
  adultDictionary, setAdultDictionary, adultOnomatopoeia, setAdultOnomatopoeia, adultSceneFlow }){
  const draftId = writer.draftId;
  const draft = (data.drafts||[]).find(d=>d.id===draftId && !d.deleted) || null;
  const evInfo = useMemo(()=>pvFind(data.plotV2.items, writer.eventId), [data.plotV2, writer.eventId]);
  const ev = evInfo ? evInfo.node : null;
  const evTitle = ev ? ((ev.title||'').trim() || '未定') : '（出来事が見つかりません）';
  const body = draft ? draft.body : '';
  const bodyRef = useRef(body); bodyRef.current = body;
  const textareaRef = useRef(null);
  const savedSelectionRef = useRef({ start:0, end:0 });
  const hasCursorInfoRef = useRef(false);
  const savedScrollRef = useRef(0);
  const editDirtyRef = useRef(false);
  const sheetOpenRef = useRef(false);
  const keyboardInset = useKeyboardInset();
  const vvBox = useVisualViewportBox();
  const [fontSize] = useState(loadWritingFontSize);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsMode, setToolsMode] = useState('fav');
  const [toolsCatId, setToolsCatId] = useState(null);
  const [exprDictOpen, setExprDictOpen] = useState(false);
  const [exprDictEditorOpen, setExprDictEditorOpen] = useState(false);
  const [specialDictEditorOpen, setSpecialDictEditorOpen] = useState(false);
  const [mediaDictEditorOpen, setMediaDictEditorOpen] = useState(false);
  const [dictEditorOpen, setDictEditorOpen] = useState(false);
  const [dictTab, setDictTabState] = useState(()=>{ try{ const v=localStorage.getItem(WRITING_LAST_DICT_TAB_KEY); if(WRITING_DICT_TABS.includes(v)) return v; }catch(e){} return 'expression'; });
  const setDictTab = (t) => { if(!WRITING_DICT_TABS.includes(t)) return; setDictTabState(t); try{ localStorage.setItem(WRITING_LAST_DICT_TAB_KEY, t); }catch(e){} };
  const [adultEdit, setAdultEdit] = useState(null);
  const [flowOpen, setFlowOpen] = useState(false);
  const [flowEditing, setFlowEditing] = useState(false);
  const [flowActiveId, setFlowActiveId] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [lb, setLb] = useState(null);
  sheetOpenRef.current = exprDictOpen || flowOpen;

  // 背景（プロット）をスクロールさせない
  useEffect(()=>{
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return ()=>{ document.body.style.overflow = prev; };
  }, []);
  // キャラ資料から戻ってきた時：カーソル位置・スクロール位置を戻す（フォーカスは奪わない）
  useEffect(()=>{
    const el = textareaRef.current, sel = writer.sel;
    if(!el || !sel) return;
    try{ el.setSelectionRange(sel.start, sel.end); }catch(e){}
    el.scrollTop = sel.scrollTop || 0;
    savedSelectionRef.current = { start:sel.start, end:sel.end }; hasCursorInfoRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 文章を開いている間は20秒おきに、変更があれば直前版として記録する（直近5世代。入力ごとには記録しない）
  useEffect(()=>{
    const timer = setInterval(()=>{ setData(d=>draftSnapshotIfChanged(d, draftId)); }, 20000);
    return ()=>clearInterval(timer);
  }, [draftId]);

  // ---- カーソル位置を保ったままの挿入（執筆画面と同じ考え方。挿入先は常にこのモーダルの文章） ----
  const rememberEditorState = () => {
    const el = textareaRef.current;
    if(el && typeof el.selectionStart === 'number'){
      savedSelectionRef.current = { start:el.selectionStart, end:el.selectionEnd };
      hasCursorInfoRef.current = true;
    }
    if(el) savedScrollRef.current = el.scrollTop;
  };
  const preventFocusSteal = (e) => { e.preventDefault(); rememberEditorState(); };
  const getSelection = (len) => {
    if(!hasCursorInfoRef.current) return { start:len, end:len };
    let { start, end } = savedSelectionRef.current;
    start = Math.max(0, Math.min(start ?? len, len));
    end = Math.max(0, Math.min(end ?? start, len));
    if(end < start){ const t = start; start = end; end = t; }
    return { start, end };
  };
  const restoreFocusAndSelection = (pos, endPos) => {
    const top = savedScrollRef.current;
    requestAnimationFrame(()=>{
      const el = textareaRef.current; if(!el) return;
      if(!sheetOpenRef.current){ try{ el.focus({ preventScroll:true }); }catch(e){ el.focus(); } }
      try{ el.setSelectionRange(pos, endPos===undefined ? pos : endPos); }catch(e){}
      el.scrollTop = top;
    });
  };
  const insertIntoBody = (text) => {
    if(!text || !draft) return;
    const cur = bodyRef.current;
    const { start, end } = getSelection(cur.length);
    const next = cur.slice(0, start) + text + cur.slice(end);
    const pos = start + text.length;
    setData(d=>draftApplyBody(d, draftId, next));
    bodyRef.current = next;
    savedSelectionRef.current = { start:pos, end:pos };
    restoreFocusAndSelection(pos, pos);
  };
  const insertSceneFlowText = (text) => {
    if(!draft) return;
    setData(d=>draftPushHistory(d, draftId, bodyRef.current)); // 挿入前に現在の内容を履歴へ退避
    const cur = bodyRef.current;
    const { start } = getSelection(cur.length);
    const before = cur.slice(0, start), after = cur.slice(start);
    const lead = before.length===0 ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const trail = after.length===0 ? '' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
    insertIntoBody(lead + text + trail);
  };

  // ---- シート類の開閉（道具・辞書・シーン進行は同時に開かない） ----
  const confirmLeaveEdit = () => {
    if(editDirtyRef.current && !window.confirm('編集中の入力は、保存していないと失われる場合があります。閉じますか？')) return false;
    editDirtyRef.current = false; return true;
  };
  const restoreSavedSelection = () => restoreFocusAndSelection(savedSelectionRef.current.start, savedSelectionRef.current.end);
  const toggleTools = () => { rememberEditorState(); setToolsOpen(o=>{ const n=!o; if(n){ setExprDictOpen(false); setFlowOpen(false); } return n; }); };
  // ---- 道具の開閉・キーボード表示で文章欄の高さが変わった時、最終行／カーソルが見える位置へ寄せる（値・選択範囲・変換中の状態は変更しない） ----
  useEffect(()=>{
    const el = textareaRef.current; if(!el) return;
    const raf = requestAnimationFrame(()=>{
      const t = textareaRef.current; if(!t) return;
      if(t.selectionEnd >= t.value.length - 1) t.scrollTop = t.scrollHeight; // 末尾にカーソルがある時は最終行まで
      else t.scrollTop = Math.min(savedScrollRef.current, Math.max(0, t.scrollHeight - t.clientHeight));
    });
    return ()=>cancelAnimationFrame(raf);
  }, [toolsOpen, vvBox.height]);
  const openDictModal = () => { setToolsOpen(false); setFlowOpen(false); setFlowEditing(false); setAdultEdit(null); setExprDictOpen(true); };
  const openFlowModal = () => { setToolsOpen(false); setExprDictOpen(false); setAdultEdit(null); setFlowEditing(false); setFlowOpen(true); };
  const closeExprDict = () => { if(adultEdit && !confirmLeaveEdit()) return; setAdultEdit(null); setExprDictOpen(false); restoreSavedSelection(); };
  const leaveAdultEdit = () => { if(!confirmLeaveEdit()) return; setAdultEdit(null); };
  const closeFlow = () => { if(flowEditing && !confirmLeaveEdit()) return; setFlowEditing(false); setFlowOpen(false); restoreSavedSelection(); };
  const leaveFlowEdit = () => { if(!confirmLeaveEdit()) return; setFlowEditing(false); };
  const openEd = (setter) => () => { rememberEditorState(); setter(true); };
  const closeEd = (setter) => () => { setter(false); restoreFocusAndSelection(savedSelectionRef.current.start); };
  const dictViewHidden = exprDictEditorOpen || specialDictEditorOpen || mediaDictEditorOpen;

  // ---- 閉じる：最新の編集（履歴の1世代を含む）を反映し、端末内保存を試みてから戻る ----
  const captureSel = () => {
    const el = textareaRef.current;
    return el ? { start:el.selectionStart, end:el.selectionEnd, scrollTop:el.scrollTop } : null;
  };
  const requestClose = () => {
    setData(d=>draftSnapshotIfChanged(d, draftId));
    const ok = onSaveNow();
    if(!ok && !window.confirm('端末内への保存に失敗しています。このまま閉じると、文章はアプリ内には残りますが、ページを閉じると失われる可能性があります。閉じますか？')) return;
    onClose();
  };
  const handleBack = () => {
    if(lb){ setLb(null); return true; }
    if(historyOpen){ setHistoryOpen(false); return true; }
    if(dictEditorOpen){ closeEd(setDictEditorOpen)(); return true; }
    if(exprDictEditorOpen){ closeEd(setExprDictEditorOpen)(); return true; }
    if(specialDictEditorOpen){ closeEd(setSpecialDictEditorOpen)(); return true; }
    if(mediaDictEditorOpen){ closeEd(setMediaDictEditorOpen)(); return true; }
    if(adultEdit){ leaveAdultEdit(); return true; }
    if(flowEditing){ leaveFlowEdit(); return true; }
    if(flowOpen){ closeFlow(); return true; }
    if(exprDictOpen){ closeExprDict(); return true; }
    if(toolsOpen){ setToolsOpen(false); return true; }
    requestClose(); return true;
  };
  useEffect(()=>{
    if(backRef) backRef.current = handleBack;
    return ()=>{ if(backRef && backRef.current===handleBack) backRef.current = null; };
  });
  const openChar = (cid) => { rememberEditorState(); onOpenChar(cid, captureSel()); };

  // ---- 道具（記号・お気に入り／表現パレット） ----
  const pinnedSnippets = writingSnippets.snippets.filter(s=>s.pinned).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
  const favLabelOf = (sn) => { const t = sn.text||''; if(t && t.length<=6) return t; return sn.label ? sn.label : t; };
  const toolsBtnProps = { onMouseDown:preventFocusSteal, onPointerDown:preventFocusSteal };
  const toolsSnippetCats = [...writingSnippets.categories].sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0)).filter(cat=>writingSnippets.snippets.some(sn=>sn.categoryId===cat.id));
  const toolsActiveCat = toolsSnippetCats.find(c=>c.id===toolsCatId) || toolsSnippetCats[0] || null;
  const toolsCatSnippets = toolsActiveCat ? writingSnippets.snippets.filter(sn=>sn.categoryId===toolsActiveCat.id).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0)) : [];
  const toolsBlock = toolsOpen ? (
    <div className="snippet-palette writing-tools-drawer">
      <div className="snippet-palette-head writing-tools-head">
        <div className="wt-seg" role="tablist" aria-label="道具の切替">
          <button type="button" role="tab" aria-selected={toolsMode==='fav'} className={"wt-seg-btn"+(toolsMode==='fav'?" active":"")} {...toolsBtnProps} onClick={()=>setToolsMode('fav')}>お気に入り</button>
          <button type="button" role="tab" aria-selected={toolsMode==='palette'} className={"wt-seg-btn"+(toolsMode==='palette'?" active":"")} {...toolsBtnProps} onClick={()=>setToolsMode('palette')}>表現パレット</button>
        </div>
        <div className="snippet-palette-head-actions">
          <button type="button" className="btn btn-sm" {...toolsBtnProps} onClick={openEd(setDictEditorOpen)}>編集</button>
          <button type="button" className="btn btn-sm btn-ghost" aria-label="道具を閉じる" {...toolsBtnProps} onClick={()=>setToolsOpen(false)}>×</button>
        </div>
      </div>
      {toolsMode==='palette' && toolsSnippetCats.length>0 && (
        <div className="wt-cats">
          {toolsSnippetCats.map(cat=>(
            <button key={cat.id} type="button" className={"snippet-cat-tab"+(toolsActiveCat && toolsActiveCat.id===cat.id ? " active" : "")} {...toolsBtnProps} onClick={()=>setToolsCatId(cat.id)}>{cat.name}</button>
          ))}
        </div>
      )}
      <div className="snippet-palette-body writing-tools-body">
        <div className="snippet-palette-buttons">
          {toolsMode==='fav' && PUNCTUATION_SHORTCUTS.map(it=>(<button key={it.key} type="button" className="snippet-btn writing-tools-symbol" {...toolsBtnProps} onClick={()=>insertIntoBody(it.text)}>{it.label}</button>))}
          {toolsMode==='fav' && pinnedSnippets.map(sn=>(<button key={sn.id} type="button" className="snippet-btn" {...toolsBtnProps} onClick={()=>insertIntoBody(sn.text)}>{favLabelOf(sn)}</button>))}
          {toolsMode==='palette' && toolsCatSnippets.map(sn=>(<button key={sn.id} type="button" className="snippet-btn" {...toolsBtnProps} onClick={()=>insertIntoBody(sn.text)}>{sn.label ? sn.label : sn.text}</button>))}
          {toolsMode==='palette' && toolsSnippetCats.length===0 && <span className="wt-empty">表現が未登録です（編集から追加）</span>}
        </div>
      </div>
    </div>
  ) : null;

  // ---- 辞書・シーン進行（執筆画面と同じ部品。挿入先はこのモーダルの文章） ----
  const panelProps = { onClose:closeExprDict, onInsert:insertIntoBody, preventFocusSteal, dictTab, onDictTabChange:setDictTab };
  const exprDictBlock = exprDictOpen ? (
    <WritingSheet onClose={closeExprDict} bottomInset={keyboardInset} hidden={dictViewHidden} label="辞書">
      <div className="wsheet-pane" style={adultEdit ? {display:'none'} : null}>
        {dictTab==='special' ? <SpecialDictionaryPanel dictionary={specialDictionary} onOpenEditor={openEd(setSpecialDictEditorOpen)} {...panelProps} />
        : dictTab==='media' ? <MediaDictionaryPanel dictionary={mediaDictionary} onOpenEditor={openEd(setMediaDictEditorOpen)} {...panelProps} />
        : dictTab==='adult' ? <AdultExpressionPanel dictionary={adultDictionary||{entries:[]}} onOpenEditor={()=>{ rememberEditorState(); editDirtyRef.current=false; setAdultEdit('adult'); }} {...panelProps} />
        : dictTab==='onomatopoeia' ? <OnomatopoeiaPanel dictionary={adultOnomatopoeia||{entries:[]}} onOpenEditor={()=>{ rememberEditorState(); editDirtyRef.current=false; setAdultEdit('onomatopoeia'); }} {...panelProps} />
        : <ExpressionDictionaryPanel dictionary={expressionDictionary} onOpenEditor={openEd(setExprDictEditorOpen)} {...panelProps} />}
      </div>
      {adultEdit && (
        <WritingSheetEditPane title={adultEdit==='adult' ? '成人向け表現を編集' : 'オノマトペを編集'} onBack={leaveAdultEdit} onClose={closeExprDict} dirtyRef={editDirtyRef}>
          {adultEdit==='adult' ? <AdultExpressionDictionaryTab adultDictionary={adultDictionary} setAdultDictionary={setAdultDictionary} /> : <AdultOnomatopoeiaTab data={adultOnomatopoeia} setData={setAdultOnomatopoeia} />}
        </WritingSheetEditPane>
      )}
    </WritingSheet>
  ) : null;
  const flowBlock = flowOpen ? (
    <WritingSheet onClose={closeFlow} bottomInset={keyboardInset} label="シーン進行">
      <div className="wsheet-pane" style={flowEditing ? {display:'none'} : null}>
        <SceneFlowReferencePanel plans={(data.sceneFlowPlans||[])} activeId={flowActiveId} onActiveChange={setFlowActiveId}
          onOpenEditor={()=>{ rememberEditorState(); editDirtyRef.current=false; setFlowEditing(true); }} onClose={closeFlow} onInsert={insertSceneFlowText} preventFocusSteal={preventFocusSteal} />
      </div>
      {flowEditing && (
        <WritingSheetEditPane title="シーン進行を編集" onBack={leaveFlowEdit} onClose={closeFlow} dirtyRef={editDirtyRef}>
          <SceneFlowPlansEditor data={data} setData={setData} kindFilter="all" allowKindSwitch adultLibrary={adultSceneFlow}
            onInsertToDraft={(plan)=>insertSceneFlowText(formatSceneFlowPlanForInsert(plan))} initialActiveId={flowActiveId} onActiveChange={setFlowActiveId} />
        </WritingSheetEditPane>
      )}
    </WritingSheet>
  ) : null;

  const chars = ev ? (ev.chars||[]).map(id=>(data.characters||[]).find(c=>c.id===id)).filter(Boolean) : [];
  const saveLabel = saveState==='saving' ? '保存中…' : saveState==='error' ? '⚠ 未保存' : '保存済み';
  const originLabel = writer.origin==='reader' ? '← 通し読みへ' : '← プロットへ';

  if(!draft){
    return (
      <div className="pw-root" style={{ top:vvBox.top, height:vvBox.height }} role="dialog" aria-modal="true" aria-label="文章を編集">
        <div className="pw-head"><button type="button" className="btn btn-sm" onClick={onClose}>{originLabel}</button><div className="pw-title"><b>{evTitle}</b></div></div>
        <div style={{padding:16}}>関連づけた文章が見つかりません（ゴミ箱に移された可能性があります）。プロットの出来事から、文章を選び直してください。</div>
      </div>
    );
  }
  return (
    <div className="pw-root" style={{ top:vvBox.top, height:vvBox.height }} role="dialog" aria-modal="true" aria-label="文章を編集">
      <div className="pw-head">
        <button type="button" className="btn btn-sm" style={{whiteSpace:'nowrap'}} onMouseDown={preventFocusSteal} onClick={requestClose}>{originLabel}</button>
        <div className="pw-title"><b>{evTitle}</b><small>文章：{draft.title}・{body.length.toLocaleString()}文字</small></div>
        <span className={'pw-save'+(saveState==='error'?' err':'')} role="status" aria-live="polite">{saveLabel}</span>
        <button type="button" className="btn btn-sm pw-closex" aria-label="閉じる" onMouseDown={preventFocusSteal} onClick={requestClose}>×</button>
      </div>
      {saveState==='error' && <div className="pw-saveerr">端末内への保存に失敗しています。文章はこの画面に保持しています。<button type="button" className="btn btn-sm" onClick={()=>onSaveNow()}>再試行</button></div>}
      <div className="pw-bar">
        <button type="button" className={"btn btn-sm"+(toolsOpen?" active":"")} {...toolsBtnProps} onClick={toggleTools}>🧰 道具</button>
        <button type="button" className={"btn btn-sm"+(exprDictOpen?" active":"")} {...toolsBtnProps} onClick={openDictModal}>📖 辞書</button>
        <button type="button" className={"btn btn-sm"+(flowOpen?" active":"")} {...toolsBtnProps} onClick={openFlowModal}>🎬 シーン進行</button>
        <button type="button" className="btn btn-sm" {...toolsBtnProps} onClick={()=>setHistoryOpen(true)}>🕘 履歴</button>
        <button type="button" className={"btn btn-sm pw-sidebtn"+(sideOpen?" active":"")} aria-expanded={sideOpen} {...toolsBtnProps} onClick={()=>setSideOpen(o=>!o)}>🖼 資料{ev && ev.images.length ? `（${ev.images.length}）` : ''}</button>
        {chars.map(c=>(
          <button key={c.id} type="button" className="btn btn-sm pw-char" {...toolsBtnProps} onClick={()=>openChar(c.id)} aria-label={(c.name||'キャラクター')+'の設定を開く'}>
            <IconThumb imageId={c.iconImageId||c.image} size={20} /><span>{c.name||'（無名）'}</span>
          </button>
        ))}
      </div>
      <div className="pw-body">
        <div className="pw-main">
          <textarea key={draftId} ref={textareaRef} className="pw-area" style={{fontSize}} value={body}
            onChange={e=>{ const v=e.target.value; setData(d=>draftApplyBody(d, draftId, v)); rememberEditorState(); }}
            onSelect={rememberEditorState} onClick={rememberEditorState} onKeyUp={rememberEditorState} onBlur={rememberEditorState}
            placeholder="ここから書く…" aria-label={evTitle+'の文章'} />
        </div>
        <aside className={'pw-side'+(sideOpen?' open':'')} aria-label="資料">
          {ev && (ev.summary||'').trim() && <div className="pw-sec"><div className="pw-sl">概要</div><div className="pw-st">{ev.summary}</div></div>}
          {ev && SCENE_FIELD_LABELS.map(([k,l])=>(ev.scene[k]||'').trim() ? <div className="pw-sec" key={k}><div className="pw-sl">{l}</div><div className="pw-st">{ev.scene[k]}</div></div> : null)}
          <div className="pw-sec"><div className="pw-sl">参考画像</div>
            {ev && ev.images.length ? <div className="pw-imgs">{ev.images.map(im=><PlotImageThumb key={im.id} imageId={im.id} memo={im.memo} onOpen={(url,memo)=>setLb({url,memo})} />)}</div> : <div className="pw-st pw-none">参考画像はありません（プロットの出来事から追加できます）</div>}
          </div>
        </aside>
      </div>
      {toolsBlock}
      {exprDictBlock}
      {flowBlock}
      {dictEditorOpen && <WritingSnippetDictionaryModal writingSnippets={writingSnippets} setWritingSnippets={setWritingSnippets} onClose={closeEd(setDictEditorOpen)} />}
      {exprDictEditorOpen && <ExpressionDictionaryEditorModal expressionDictionary={expressionDictionary} setExpressionDictionary={setExpressionDictionary} onClose={closeEd(setExprDictEditorOpen)} />}
      {specialDictEditorOpen && <SpecialDictionaryEditorModal specialDictionary={specialDictionary} setSpecialDictionary={setSpecialDictionary} onClose={closeEd(setSpecialDictEditorOpen)} lastSpecialImportIds={lastSpecialImportIds} setLastSpecialImportIds={setLastSpecialImportIds} />}
      {mediaDictEditorOpen && <MediaDictionaryEditorModal mediaDictionary={mediaDictionary} setMediaDictionary={setMediaDictionary} onClose={closeEd(setMediaDictEditorOpen)} lastMediaImportIds={lastMediaImportIds} setLastMediaImportIds={setLastMediaImportIds} />}
      {historyOpen && (
        <Modal title={`「${draft.title}」の履歴`} onClose={()=>setHistoryOpen(false)} wide>
          <p className="adult-tab-desc">自動保存とは別に、直前の版を最大5世代まで保存しています。選ぶと今の内容と置き換わります（今の内容も履歴に残ります）。</p>
          {!draft.history.length && <div className="empty-hint">まだ履歴はありません。編集を続けると自動的に記録されます。</div>}
          {draft.history.map((h,i)=>(
            <div className="writing-block-card" key={i}>
              <div><strong>{new Date(h.savedAt).toLocaleString('ja-JP')}</strong><p>{h.body.slice(0,100)||'（本文なし）'}</p><small>{h.body.length}文字</small></div>
              <div className="writing-block-actions"><button className="btn btn-sm btn-primary" onClick={()=>{
                if(!window.confirm(`文章「${draft.title}」を、${new Date(h.savedAt).toLocaleString('ja-JP')}時点の内容に置き換えますか？\n（現在の内容は置き換え前に履歴へ保存されます）`)) return;
                setData(d=>draftRestoreHistory(d, draftId, h)); setHistoryOpen(false);
              }}>この版に戻す</button></div>
            </div>
          ))}
          <div className="modal-actions"><button className="btn" onClick={()=>setHistoryOpen(false)}>閉じる</button></div>
        </Modal>
      )}
      {lb && (
        <div className="pw-lb" role="dialog" aria-label="参考画像" onClick={()=>setLb(null)}>
          <img src={lb.url} alt={lb.memo||'参考画像'} />
          {lb.memo ? <div className="pw-lbcap">{lb.memo}</div> : null}
          <button type="button" className="btn btn-sm pw-lbclose" onClick={()=>setLb(null)}>閉じる</button>
        </div>
      )}
    </div>
  );
}
const SCENE_FIELD_LABELS = [['goal','目的'],['obstacle','対立・障害'],['change','場面で起きる変化'],['memo','自由メモ']];

function PlotV2({ data, setData, markDirty, writerOpen, onOpenWriter, onOpenChar, restoreState, onRestored }){
  const hostRef = useRef(null), ctlRef = useRef(null);
  const apiRef = useRef({});
  apiRef.current = {
    setPlot: (obj) => setData(d => (d.plotV2Error ? d : { ...d, plotV2: obj })),
    // 文章の新規作成と出来事への関連付けは、1回のデータ更新で行う
    setPlotAndDraft: (obj, entry) => setData(d => (d.plotV2Error ? d : { ...d, plotV2: obj, drafts:[...(d.drafts||[]), entry] })),
    restoreDraft: (id) => setData(d => textRestore(d, id)),
    markDirty: () => { if(markDirty) markDirty(); },
    openWriter: (req) => { if(onOpenWriter) onOpenWriter(req); },
    openChar: (req) => { if(onOpenChar) onOpenChar(req); },
  };
  useEffect(()=>{
    const ctl = createPlotV2View(hostRef.current, {
      setPlot:(o)=>apiRef.current.setPlot(o), setPlotAndDraft:(o,e)=>apiRef.current.setPlotAndDraft(o,e), restoreDraft:(id)=>apiRef.current.restoreDraft(id),
      markDirty:()=>apiRef.current.markDirty(), openWriter:(r)=>apiRef.current.openWriter(r), openChar:(r)=>apiRef.current.openChar(r),
    });
    ctlRef.current = ctl;
    ctl.sync(data.plotV2, data.plotV2Error, data.characters, data.locations, data.drafts, data.textFolders);
    if(restoreState){ ctl.restoreState(restoreState); if(onRestored) onRestored(); } // キャラ資料などから戻った時は、元の位置・状態へ戻す
    return ()=>{ ctl.destroy(); ctlRef.current = null; };
  }, []);
  useEffect(()=>{
    if(ctlRef.current) ctlRef.current.sync(data.plotV2, data.plotV2Error, data.characters, data.locations, data.drafts, data.textFolders);
  }, [data.plotV2, data.plotV2Error, data.characters, data.locations, data.drafts, data.textFolders]);
  useEffect(()=>{
    if(ctlRef.current) ctlRef.current.setWriterOpen(!!writerOpen);
  }, [!!writerOpen]);
  return <div ref={hostRef} />;
}

