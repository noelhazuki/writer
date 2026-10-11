// ---- クイック表現バー：★固定した登録語だけを、パレットを開かずに常時1タップ挿入 ----
// 挿入処理はSnippetPaletteと同じ onInsert（Writing側のinsertIntoBody）を共通利用する。
function QuickExpressionBar({ snippets, collapsed, onToggleCollapse, onInsert, onOpenPalette, preventFocusSteal, variant }){
  const wrapCls = "quickbar" + (variant==='inline' ? ' quickbar-inline' : '') + (collapsed ? ' collapsed' : '');

  if(collapsed){
    return (
      <div className={wrapCls}>
        <button type="button" className="quickbar-collapsed-btn" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={onToggleCollapse}>表現 ▲</button>
      </div>
    );
  }

  // ボタン表示：挿入されるtextが短ければtextそのまま、長い場合のみlabelを優先表示
  const displayOf = (sn) => {
    const t = sn.text || '';
    if(t && t.length<=6) return t;
    return sn.label ? sn.label : t;
  };

  return (
    <div className={wrapCls}>
      {snippets.length===0 ? (
        <span className="quickbar-empty">辞書から★を付けるとここに表示されます</span>
      ) : (
        <div className="quickbar-scroll">
          {snippets.map(sn=>(
            <button key={sn.id} type="button" className="quickbar-btn"
              onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal}
              onClick={()=>onInsert(sn.text)}>
              {displayOf(sn)}
            </button>
          ))}
        </div>
      )}
      <button type="button" className="quickbar-list-btn" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={onOpenPalette}>一覧</button>
      <button type="button" className="quickbar-collapse-btn" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={onToggleCollapse}>∨</button>
    </div>
  );
}

// ---- 執筆記号ショートカットバー（「」――……をカーソル位置へ1タップ挿入。表現パレット・クイック表現バーとは別データ・別UI） ----
// 表示制御（フォーカス中のみ）は呼び出し元（Writing）が行い、このコンポーネント自体は常に4ボタンを出す。
const PUNCTUATION_SHORTCUTS = [
  { key:'open', label:'「', text:'「' },
  { key:'close', label:'」', text:'」' },
  { key:'dash', label:'――', text:'――' },
  { key:'ellipsis', label:'……', text:'……' },
];
function PunctuationShortcutBar({ onInsert, preventFocusSteal, style }){
  return (
    <div className="symbolbar" style={style}>
      {PUNCTUATION_SHORTCUTS.map(it=>(
        <button key={it.key} type="button" className="symbolbar-btn"
          onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal}
          onClick={()=>onInsert(it.text)}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

// ---- 表現パレット本体（本文へ即挿入するボタン群） ----
// ヘッダー行＝カテゴリタブ＋編集/閉じる、本体行＝登録語（横スクロール1段）の2段構成。
// スマホでは「表現パレット」の大見出しとテキスト長いボタンラベルをCSSで省略する。
// ---- 執筆画面の共通シート（モーダル）。辞書・シーン進行で共用。背景の執筆画面はスクロールさせず、キーボード分だけ下端を上げる。
//      閉じるボタンなどのヘッダーは中身（.wsheet-pane内）で固定し、内容部分だけをスクロールさせる。 ----
function WritingSheet({ onClose, bottomInset, hidden, label, children }){
  useEffect(()=>{
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return ()=>{ document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="wsheet-backdrop" role="dialog" aria-modal="true" aria-label={label}
      style={{ bottom:(bottomInset||0)+'px', display: hidden ? 'none' : undefined }}>
      <div className="wsheet">{children}</div>
    </div>
  );
}
// シート内の編集ペイン：「← 閲覧へ」「×」を固定ヘッダーに置き、編集内容だけをスクロールさせる。
// 入力があった（検索欄を除く）場合はdirtyRefを立て、閉じる側で確認できるようにする。
function WritingSheetEditPane({ title, onBack, onClose, dirtyRef, children }){
  const onInput = (e) => {
    const t = e.target;
    if(!dirtyRef || !t) return;
    if(t.tagName!=='TEXTAREA' && t.tagName!=='INPUT') return;
    if(t.type==='search' || /検索/.test(t.placeholder||'')) return;
    dirtyRef.current = true;
  };
  return (
    <div className="wsheet-pane" onInput={onInput}>
      <div className="wsheet-head">
        <span className="wsheet-title">{title}</span>
        <button type="button" className="btn btn-sm" style={{whiteSpace:'nowrap'}} onClick={onBack}>← 閲覧へ</button>
        <button type="button" className="btn btn-sm btn-ghost" aria-label="閉じる" onClick={onClose}>×</button>
      </div>
      <div className="wsheet-body">{children}</div>
    </div>
  );
}

function SnippetPalette({ categories, snippets, onInsert, onOpenEditor, onClose, preventFocusSteal, style }){
  const sortedCats = [...categories].sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
  const snippetsOf = (catId) => snippets.filter(s=>s.categoryId===catId).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
  const catsWithItems = sortedCats.filter(cat=>snippetsOf(cat.id).length>0);
  const [activeCatId, setActiveCatId] = useState(null);
  const activeCat = catsWithItems.find(c=>c.id===activeCatId) || catsWithItems[0] || null;
  const hasAny = catsWithItems.length>0;

  return (
    <div className="snippet-palette" style={style}>
      <div className="snippet-palette-head">
        <span className="snippet-palette-title">表現パレット</span>
        {hasAny && (
          <div className="snippet-palette-cat-tabs">
            {catsWithItems.map(cat=>(
              <button key={cat.id} type="button"
                className={"snippet-cat-tab"+(activeCat && activeCat.id===cat.id ? " active" : "")}
                onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal}
                onClick={()=>setActiveCatId(cat.id)}>{cat.name}</button>
            ))}
          </div>
        )}
        <div className="snippet-palette-head-actions">
          <button type="button" className="btn btn-sm" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={onOpenEditor}>
            <span className="label-full">辞書を編集</span><span className="label-short">編集</span>
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={onClose}>
            <span className="label-full">閉じる</span><span className="label-short">×</span>
          </button>
        </div>
      </div>
      {!hasAny && <div className="snippet-palette-body"><div className="empty-hint">登録された表現がありません。「辞書を編集」から追加できます。</div></div>}
      {hasAny && activeCat && (
        <div className="snippet-palette-body">
          <div className="snippet-palette-buttons">
            {snippetsOf(activeCat.id).map(sn=>(
              <button key={sn.id} type="button" className="snippet-btn"
                onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal}
                onClick={()=>onInsert(sn.text)}>
                {sn.label ? sn.label : sn.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- 汎用チップ入力：配列(aliases / tags)を「[値 ×] ＋追加」の形で編集する ----
function ChipListEditor({ values, onChange, placeholder, listId }){
  const [draft, setDraft] = useState('');
  const list = values || [];
  const commit = () => {
    const v = draft.trim();
    if(v && !list.includes(v)){ onChange([...list, v]); }
    setDraft('');
  };
  const removeAt = (idx) => { onChange(list.filter((_,i)=>i!==idx)); };
  return (
    <div className="chip-editor">
      {list.length>0 && (
        <div className="chip-editor-chips">
          {list.map((v,i)=>(
            <span className="chip-editor-chip" key={v+'-'+i}>
              {v}
              <button type="button" onClick={()=>removeAt(i)} aria-label={`${v}を削除`}>×</button>
            </span>
          ))}
        </div>
      )}
      <div className="chip-editor-add-row">
        <input type="text" list={listId} value={draft} placeholder={placeholder}
          onChange={e=>setDraft(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); commit(); } }} />
        <button type="button" className="btn btn-sm" onClick={commit}>追加</button>
      </div>
    </div>
  );
}

// ---- コピー処理（表現辞典・小説語彙辞典で共通利用）：Clipboard API→失敗時fallback。成否だけ返し、toast表示は呼び出し側に任せる ----
async function copyPlainText(text){
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(text);
      return true;
    }
  }catch(e){}
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
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }catch(e){ return false; }
}

// ---- 辞典ドロワー：[表現辞典][小説語彙][メディア語]の切替タブ（表現辞典パネル・小説語彙パネルで共通表示） ----
function DictTabSwitch({ active, onChange, preventFocusSteal }){
  return (
    <div className="dict-tab-switch-row">
      <button type="button" className={"dict-tab-btn"+(active==='expression'?' active':'')}
        onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={()=>onChange('expression')}>表現辞典</button>
      <button type="button" className={"dict-tab-btn"+(active==='special'?' active':'')}
        onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={()=>onChange('special')}>小説語彙</button>
      <button type="button" className={"dict-tab-btn"+(active==='media'?' active':'')}
        onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={()=>onChange('media')}>メディア語</button>
      <button type="button" className={"dict-tab-btn"+(active==='adult'?' active':'')}
        onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={()=>onChange('adult')}>成人向け表現</button>
      <button type="button" className={"dict-tab-btn"+(active==='onomatopoeia'?' active':'')}
        onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={()=>onChange('onomatopoeia')}>オノマトペ</button>
    </div>
  );
}

// ---- 小説語彙辞典：1〜5段階評価の●○表示（閲覧用） ----
function RatingDots({ value }){
  const v = clamp(Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0, 0, 5);
  return <span className="rating-dots">{'●'.repeat(v)}{'○'.repeat(5-v)}</span>;
}

// ---- 小説語彙辞典：1〜5段階評価の編集（[1][2][3][4][5]ボタン） ----
function RatingField({ label, value, onChange }){
  return (
    <div className="dict-field-block">
      <label className="dict-field-label">{label}</label>
      <div className="rating-btn-group">
        {[1,2,3,4,5].map(n=>(
          <button key={n} type="button" className={"rating-btn"+(value===n?' active':'')} onClick={()=>onChange(n)}>{n}</button>
        ))}
      </div>
    </div>
  );
}

