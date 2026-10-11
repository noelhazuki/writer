/* ============ 本文 ============ */
const WRITING_LAST_DICT_TAB_KEY='novel-world-builder-writing-last-dict-tab-v1';
const WRITING_DICT_TABS=['expression','special','media','adult','onomatopoeia'];
function Writing({ data, setData, allChars, allLocations, focusMode, setFocusMode, writingSnippets, setWritingSnippets, expressionDictionary, setExpressionDictionary, specialDictionary, setSpecialDictionary, lastSpecialImportIds, setLastSpecialImportIds, mediaDictionary, setMediaDictionary, lastMediaImportIds, setLastMediaImportIds, adultDictionary, setAdultDictionary, adultOnomatopoeia, setAdultOnomatopoeia, adultSceneFlow, onOpenAdultTools, onOpenSceneFlowScreen, workspaceTab, setWorkspaceTab, onOpenSceneTools, openChapterId, openId, setOpenId, activeBlockId, setActiveBlockId, backRef }){
  // 検索結果などから特定の章を直接開きたいとき（openChapterIdが変化するたび）に本文タブへ切り替えて開く。
  useEffect(()=>{
    if(!openChapterId) return;
    const w = (data.writings||[]).find(x=>x.id===openChapterId);
    if(!w) return;
    setWorkspaceTab('chapters');
    setOpenId(w.id);
    setActiveBlockId(w.blocks && w.blocks[0] && w.blocks[0].id);
    setReadAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openChapterId]);
  const [blockDraft,setBlockDraft]=useState(null);
  const [readAll,setReadAll]=useState(false);
  const [passageDraft,setPassageDraft]=useState(null);
  const [mapDraft,setMapDraft]=useState(null);
  const [mapImport,setMapImport]=useState('');
  const [writingFontSize, setWritingFontSizeState] = useState(loadWritingFontSize);
  const [dictEditorOpen, setDictEditorOpen] = useState(false);
  const [toolsMode, setToolsMode] = useState('fav'); // 道具パネルの表示：'fav'（記号・お気に入り）| 'palette'（表現パレット）
  const [toolsCatId, setToolsCatId] = useState(null); // 道具の表現パレットで選択中のカテゴリ
  const [draftMenuOpen, setDraftMenuOpen] = useState(false); // 下書きタイトル行の☰メニュー（初期は閉じる）
  const draftMenuBtnRef = useRef(null);
  const [draftMenuMaxH, setDraftMenuMaxH] = useState(480);
  const [flowOpen, setFlowOpen] = useState(false); // シーン進行モーダル
  const [flowEditing, setFlowEditing] = useState(false); // シーン進行モーダル内：閲覧→編集の切替
  const [flowActiveId, setFlowActiveId] = useState(''); // シーン進行で選択中のプラン（閲覧・編集で共有）
  const [adultEdit, setAdultEdit] = useState(null); // 辞書モーダル内の編集：null | 'adult'（成人向け表現）| 'onomatopoeia'
  const editDirtyRef = useRef(false); // モーダル内編集で入力があったか（閉じる時の確認用）
  const sheetOpenRef = useRef(false); // 辞書／シーン進行モーダルが開いている間はtrue（挿入時に下書きへフォーカスを奪い返さない）
  const [toolsOpen, setToolsOpen] = useState(false); // 執筆中の道具シート（よく使う文字・お気に入り／辞書から探す）
  const [copyDlg, setCopyDlg] = useState(null); // 「本文へコピー」ダイアログ
  const [exprDictOpen, setExprDictOpen] = useState(false);
  const [exprDictEditorOpen, setExprDictEditorOpen] = useState(false);
  // 辞書モーダルの種類：'expression'｜'special'｜'media'｜'adult'｜'onomatopoeia'。前回使った種類を記憶し、次回はその種類から開く。
  const [dictTab, setDictTabState] = useState(()=>{ try{ const v=localStorage.getItem(WRITING_LAST_DICT_TAB_KEY); if(WRITING_DICT_TABS.includes(v)) return v; }catch(e){} return 'expression'; });
  const setDictTab = (t) => { if(!WRITING_DICT_TABS.includes(t)) return; setDictTabState(t); try{ localStorage.setItem(WRITING_LAST_DICT_TAB_KEY, t); }catch(e){} };
  const [specialDictEditorOpen, setSpecialDictEditorOpen] = useState(false);
  const [mediaDictEditorOpen, setMediaDictEditorOpen] = useState(false);
  const [writingMoreOpen, setWritingMoreOpen] = useState(false); // スマホ「⋯」：文字サイズ／メモへ移動／章削除
  const [memoOpenSignal, setMemoOpenSignal] = useState(0); // 「⋯」→メモ・関連情報を開く、の合図（値が変わるたびにCollapsibleSectionを開く）
  const [draftShowTrash, setDraftShowTrash] = useState(false); // 下書き一覧：ゴミ箱（論理削除済み）を表示中か
  const [draftRenameId, setDraftRenameId] = useState(null); // （旧）見出し変更モーダル。現在は textDlg を使う
  const [textFolderId, setTextFolderId] = useState(null); // 文章一覧で開いているフォルダ（null＝最上位）
  const [textMenu, setTextMenu] = useState(null); // 項目選択後の操作メニュー {kind:'text'|'folder', id}
  const [textDlg, setTextDlg] = useState(null); // フォルダ作成・名前変更・文章の編集・移動先選択
  const [textQuery, setTextQuery] = useState(''); // 文章一覧の検索（タイトル・本文）
  const [draftHistoryOpen, setDraftHistoryOpen] = useState(false); // 下書きエディタ：履歴（直前版）モーダル
  const [draftFocused, setDraftFocused] = useState(false); // 下書きtextareaにフォーカスがあるか（執筆記号ショートカットバーの表示制御用）
  const [draftToast, setDraftToast] = useState('');
  const [draftToastAction, setDraftToastAction] = useState(null);
  const draftToastTimerRef = useRef(null);
  useEffect(()=>()=>{ if(draftToastTimerRef.current) clearTimeout(draftToastTimerRef.current); }, []);
  const showDraftToast = (msg, action) => {
    setDraftToast(msg);
    setDraftToastAction(action||null);
    if(draftToastTimerRef.current) clearTimeout(draftToastTimerRef.current);
    draftToastTimerRef.current = setTimeout(()=>{ setDraftToast(''); setDraftToastAction(null); }, action?5000:1600);
  };
  const memoSectionRef = useRef(null);
  const textareaRef = useRef(null);
  const savedSelectionRef = useRef({ start:0, end:0 });
  const hasCursorInfoRef = useRef(false); // 一度でも実際のカーソル位置を取得できたか（下書きを切り替えたらリセットする）
  const savedScrollRef = useRef({ textareaScrollTop:0, windowScrollY:0, focusWrapScrollTop:0 });
  const focusBodyWrapRef = useRef(null);

  // ---- 表現パレット（固定ドロワー）の下端位置を実測して決める ----
  // 通常モード：bottom-tabsの実高さの上へ。集中モード：クイック表現バーの実高さの上へ。
  // どちらもソフトウェアキーボード表示中はvisualViewportで隠れた分だけさらに押し上げる。
  const bottomTabsHeight = useSelectorHeight('.bottom-tabs', !focusMode);
  const keyboardInset = useKeyboardInset();
  sheetOpenRef.current = exprDictOpen || flowOpen;
  // ☰メニューが画面（キーボード分を除く）からはみ出さないよう、ボタン下端から残りの高さを上限にする（超える分はメニュー内で縦スクロール）
  useEffect(()=>{
    if(!draftMenuOpen) return;
    const calc = () => {
      const el = draftMenuBtnRef.current; if(!el) return;
      const vv = window.visualViewport;
      const bottom = vv ? (vv.offsetTop + vv.height) : window.innerHeight;
      setDraftMenuMaxH(Math.max(120, Math.floor(bottom - el.getBoundingClientRect().bottom - 14)));
    };
    calc();
    const vv = window.visualViewport;
    window.addEventListener('resize', calc); window.addEventListener('scroll', calc, true);
    if(vv){ vv.addEventListener('resize', calc); vv.addEventListener('scroll', calc); }
    return ()=>{ window.removeEventListener('resize', calc); window.removeEventListener('scroll', calc, true); if(vv){ vv.removeEventListener('resize', calc); vv.removeEventListener('scroll', calc); } };
  }, [draftMenuOpen, keyboardInset]);
  const paletteBottomOffset = (focusMode ? 0 : bottomTabsHeight) + keyboardInset;
  // 執筆記号ショートカットバー：道具シート・パレット・辞典のどれも開いていない時だけ出るため、同じ下端位置でよい
  const symbolBarBottomOffset = paletteBottomOffset;

  const setWritingFontSize = (px) => {
    const clamped = clamp(px, WRITING_FONT_SIZE_MIN, WRITING_FONT_SIZE_MAX);
    setWritingFontSizeState(clamped);
    try{ localStorage.setItem(WRITING_FONT_SIZE_KEY, String(clamped)); }catch(e){}
  };

  const addChapter = () => {
    const block={id:uid('wblock'),title:'最初の場面',body:'',memo:'',kind:'normal',status:'執筆中',adultNote:''};
    const w = { id: uid('wr'), title: `第${data.writings.length+1}${WRITING_UNIT}`, body:'', blocks:[block], memo:'', personIds:[], locationIds:[], ideaIds:[] };
    setActiveBlockId(block.id);
    setData(d=>({...d, writings:[...d.writings, w]}));
    setOpenId(w.id);
  };
  const update = (id, patch) => setData(d=>({...d,writings:d.writings.map(w=>{
    if(w.id!==id)return w;
    if(patch.body===undefined)return {...w,...patch};
    const blocks=(w.blocks||[]).map(b=>b.id===(activeBlockId||w.blocks[0].id)?{...b,body:patch.body}:b);
    const {body:ignored,...rest}=patch;
    return {...w,...rest,blocks,body:blocks.map(b=>b.body).filter(Boolean).join('\n\n')};
  })}));
  const updateBlocks=(id,fn)=>setData(d=>({...d,writings:d.writings.map(w=>{
    if(w.id!==id)return w;
    const blocks=fn(w.blocks||[]);
    return {...w,blocks,body:blocks.map(b=>b.body).filter(Boolean).join('\n\n')};
  })}));
  const insertBlock=(chapter,index)=>{
    const b={id:uid('wblock'),title:'新しい場面',body:'',memo:'',kind:'normal',status:'未定',adultNote:''};
    updateBlocks(chapter.id,rows=>{const next=[...rows];next.splice(index,0,b);return next;});
    setActiveBlockId(b.id);setReadAll(false);
  };
  // 場面・選択範囲を「文章」へ新しい文章として保存する（保存先の初期値はフォルダ外）。
  const savePassage=(body,title,memo='',version='ver1',folderId=null)=>{
    if(!body.trim())return;
    const e={...makeDraftEntry(String(title||'').trim()||'無題の塊',body,null,null,folderId),memo,version,origin:'draft'};
    setData(d=>({...d,drafts:[...(d.drafts||[]),e]}));
  };
  // ---- 下書き（複数保存）。activeDraftIdが指し示す1件だけを編集対象にする。
  //      「塊を下書きへ」「本文を下書きへ」は必ずここで新しい下書きを作る＝既存の下書きを上書きしない。 ----
  const liveDrafts = (data.drafts||[]).filter(d=>!d.deleted);
  const trashedDrafts = (data.drafts||[]).filter(d=>d.deleted);
  const activeDraft = liveDrafts.find(d=>d.id===data.activeDraftId) || null;
  const effFolderId = (data.textFolders||[]).some(f=>f.id===textFolderId) ? textFolderId : null; // 消えたフォルダを指していたら最上位へ
  // この下書きを関連付けているプロットの出来事（名前はIDから都度取得＝名前変更に追従）。表示のみで、データは書き換えない。
  const draftUsers = useMemo(()=>plotV2DraftUsers(data.plotV2), [data.plotV2]);
  const draftUsersLabel = (id) => { const u = draftUsers.get(id); return u && u.length ? u.map(x=>x.title).join('、') : ''; };

  const selectedDraftText=()=>{
    const el=textareaRef.current, body=activeDraft?activeDraft.body:'';
    return el&&el.selectionStart!==el.selectionEnd?body.slice(el.selectionStart,el.selectionEnd):body;
  };
  // 直前版の記録。履歴は最新5件まで（古いものから捨てる）。直前と同じ内容なら追加しない。
  const pushDraftHistory=(draftId,body)=>{
    setData(d=>draftPushHistory(d,draftId,body)); // 共通処理（プロットの執筆モーダルと同じ）
  };
  // 自動保存とは別に、下書きを開いている間は20秒おきに変更があれば直前版として記録する（最低5世代保持）。
  useEffect(()=>{
    if(workspaceTab!=='draft'||!activeDraft)return;
    const draftId=activeDraft.id;
    const timer=setInterval(()=>{
      setData(d=>draftSnapshotIfChanged(d,draftId));
    },20000);
    return ()=>clearInterval(timer);
  },[workspaceTab,activeDraft&&activeDraft.id]);

  const setDraftBody=(text)=>{
    if(!activeDraft)return;
    const id=activeDraft.id;
    setData(d=>draftApplyBody(d,id,text));
  };
  const setDraftTitle=(title)=>{
    if(!activeDraft)return;
    const id=activeDraft.id;
    setData(d=>draftApplyTitle(d,id,title));
  };
  // 画面・フォルダを切り替える前に、変換中の入力を確定させる（blurでcompositionendが先に走り、入力がstateへ入る）
  const commitInput=()=>{ try{ const a=document.activeElement; if(a&&a!==document.body&&a.blur) a.blur(); }catch(e){} };
  const openDraft=(id)=>{ commitInput(); setDraftMenuOpen(false); setFlowOpen(false);setExprDictOpen(false); hasCursorInfoRef.current=false; setData(d=>({...d,activeDraftId:id})); };
  const backToDraftList=()=>{ commitInput(); if(activeDraft) setTextFolderId(activeDraft.folderId||null); setDraftMenuOpen(false); setFlowOpen(false);setExprDictOpen(false);setDraftHistoryOpen(false); hasCursorInfoRef.current=false; setData(d=>({...d,activeDraftId:null})); };
  const addBlankDraft=()=>{
    const entry={...makeDraftEntry('無題の文章','',null,null,effFolderId),origin:'draft'};
    hasCursorInfoRef.current=false;
    setData(d=>({...d,drafts:[...(d.drafts||[]),entry],activeDraftId:entry.id}));
  };
  // 「塊を下書きへ」「本文を下書きへ」共通：必ず新しい下書きを作る。既存の下書きには一切触れない。
  const createDraftFromSource=(sourceType,sourceId,title,body)=>{
    const entry={...makeDraftEntry(title||'無題の文章',body||'',sourceType,sourceId),origin:'draft'};
    hasCursorInfoRef.current=false;
    setData(d=>({...d,drafts:[...(d.drafts||[]),entry],activeDraftId:entry.id}));
    setWorkspaceTab('draft');
    showDraftToast(`新しい文章「${entry.title}」を作成しました（既存の文章はそのままです）`);
  };
  const openRenameDraft=(d)=>{ setTextMenu(null); setTextDlg({type:'editText',id:d.id,title:d.title,memo:d.memo||'',version:d.version||''}); };
  const saveTextDlgEdit=()=>{
    const x=textDlg; if(!x)return;
    const title=x.title.trim()||'無題の文章';
    setData(d=>({...d,drafts:(d.drafts||[]).map(t=>t.id===x.id?{...t,title,memo:x.memo,version:x.version,updatedAt:new Date().toISOString()}:t)}));
    setTextDlg(null);
  };
  const duplicateDraft=(d)=>{
    setTextMenu(null);
    setData(dd=>textDuplicate(dd,d.id).d);
    showDraftToast(`「${d.title}」を複製しました（元の文章とは別の独立した文章です）`);
  };
  // ゴミ箱へ（論理削除）。中身は消えず、復元できる。プロットの紐づけも切れない。
  const softDeleteDraft=(d)=>{
    setTextMenu(null);
    const users=draftUsersLabel(d.id);
    if(!confirm(`「${d.title}」をゴミ箱へ移動しますか？あとで「ゴミ箱」から復元できます。${users?`\nプロットの出来事「${users}」に紐づいています（紐づけは残り、プロット側に「ゴミ箱」と表示されます）。`:''}`))return;
    setData(dd=>textTrash(dd,d.id));
    showDraftToast(`「${d.title}」をゴミ箱へ移動しました`);
  };
  const restoreDraftFromTrash=(d)=>{
    setData(dd=>textRestore(dd,d.id));
    showDraftToast(`「${d.title}」を復元しました`);
  };
  // フォルダ操作
  const openTextFolder=(id)=>{ commitInput(); setTextQuery(''); setTextFolderId(id); };
  const textFolderOf=(id)=>(data.textFolders||[]).find(f=>f.id===id)||null;
  const textFolderLabel=(id)=>{ const path=textFolderPath(data.textFolders,id); return path.length?path.map(f=>f.name).join(' / '):'フォルダ外'; };
  const doCreateFolder=()=>{
    const x=textDlg; if(!x)return;
    setData(d=>textAddFolder(d,x.name,x.parentId).d);
    setTextDlg(null);
  };
  const doRenameFolder=()=>{ const x=textDlg; if(!x)return; setData(d=>textRenameFolder(d,x.id,x.name)); setTextDlg(null); };
  const doMoveTo=(folderId)=>{
    const x=textDlg; if(!x)return;
    if(x.kind==='folder') setData(d=>textMoveFolder(d,x.id,folderId));
    else setData(d=>textMoveText(d,x.id,folderId));
    setTextDlg(null);
    showDraftToast(`「${folderId?textFolderLabel(folderId):'フォルダ外'}」へ移動しました`);
  };
  const doDeleteFolder=(f)=>{
    setTextMenu(null);
    if(!confirm(`フォルダ「${f.name}」を削除します。\n中の文章・フォルダは1つ上の階層へ移ります（文章は削除されません）。`))return;
    setData(d=>textDeleteFolder(d,f.id));
    if(textFolderId===f.id) setTextFolderId(f.parentId||null);
  };
  const permanentlyDeleteDraft=(d)=>{
    if(!confirm(`「${d.title}」を完全に削除します。この操作は元に戻せません。よろしいですか？`))return;
    setData(dd=>({...dd,drafts:dd.drafts.filter(x=>x.id!==d.id)}));
  };
  // 履歴（直前版）から復元する。現在の内容も、消えないよう先に履歴へ積んでから置き換える。
  const restoreDraftHistory=(entry)=>{
    if(!activeDraft)return;
    if(!confirm(`文章「${activeDraft.title}」を、${new Date(entry.savedAt).toLocaleString('ja-JP')}時点の内容に置き換えますか？\n（現在の内容は置き換え前に履歴へ保存されます）`))return;
    const id=activeDraft.id;
    setData(d=>draftRestoreHistory(d,id,entry));
    setDraftHistoryOpen(false);
    showDraftToast('選んだ版に置き換えました');
  };

  const draftBody = activeDraft ? activeDraft.body : '';

  // ---- 下書き→本文へのコピー。元の下書きは一切変えない（コピーのみ・自動同期なし）。
  //      範囲：選択範囲 or 全文。先：既存の章の末尾に新しい場面／既存の場面の末尾へ追記／新しい章を作る。 ----
  const openCopyToBody = () => {
    if(!activeDraft) return;
    if(!activeDraft.body.trim()){ showDraftToast('文章が空です'); return; }
    const el = textareaRef.current;
    const sel = (el && typeof el.selectionStart==='number' && el.selectionStart!==el.selectionEnd) ? activeDraft.body.slice(el.selectionStart, el.selectionEnd) : '';
    const writings = data.writings||[];
    const preferred = (openId && writings.find(w=>w.id===openId)) || writings[writings.length-1] || null;
    setCopyDlg({ useSelection: !!sel.trim(), selText: sel, chapterId: preferred ? preferred.id : 'new', mode:'newScene', blockId:'', sceneTitle: activeDraft.title||'', newChapterTitle:'' });
  };
  const executeCopyToBody = () => {
    const dlg = copyDlg; if(!dlg || !activeDraft) return;
    const text = dlg.useSelection ? dlg.selText : activeDraft.body;
    if(!text.trim()) return;
    const sceneTitle = (dlg.sceneTitle||'').trim() || '文章からの場面';
    const newBlock = () => ({id:uid('wblock'), title:sceneTitle, body:text, memo:'', kind:'normal', status:'執筆中', adultNote:''});
    let label='', targetChapterId='', targetBlockId='';
    if(dlg.chapterId==='new'){
      const b = newBlock();
      const title = (dlg.newChapterTitle||'').trim() || `第${data.writings.length+1}${WRITING_UNIT}`;
      const w = { id: uid('wr'), title, body: text, blocks:[b], memo:'', personIds:[], locationIds:[], ideaIds:[] };
      setData(d=>({...d, writings:[...d.writings, w]}));
      label = `「${title}」`; targetChapterId = w.id; targetBlockId = b.id;
    } else {
      const chapter = data.writings.find(w=>w.id===dlg.chapterId); if(!chapter) return;
      label = `「${chapter.title}」`; targetChapterId = chapter.id;
      if(dlg.mode==='append' && dlg.blockId && (chapter.blocks||[]).some(b=>b.id===dlg.blockId)){
        targetBlockId = dlg.blockId;
        updateBlocks(chapter.id, rows=>rows.map(b=>b.id===dlg.blockId ? {...b, body: b.body ? (b.body.replace(/\n+$/,'') + '\n\n' + text) : text} : b));
        const bt = chapter.blocks.find(b=>b.id===dlg.blockId); label += `の「${bt?bt.title:'場面'}」`;
      } else {
        const b = newBlock(); targetBlockId = b.id;
        updateBlocks(chapter.id, rows=>[...rows, b]);
        label += 'の末尾（新しい場面）';
      }
    }
    setCopyDlg(null);
    showDraftToast(`${label}へコピーしました。文章はそのまま残っています`, { label:'本文を開く', fn:()=>{ setWorkspaceTab('chapters'); setOpenId(targetChapterId); setActiveBlockId(targetBlockId); setReadAll(false); } });
  };
  const copyDlgChapter = copyDlg && copyDlg.chapterId!=='new' ? (data.writings||[]).find(w=>w.id===copyDlg.chapterId) : null;
  const copyDlgBlock = copyDlg ? (
    <Modal title="文章を本文へコピー" onClose={()=>setCopyDlg(null)} wide>
      <p className="adult-tab-desc">文章の文章を本文へ写します。文章は残り、あとから文章を直しても本文には自動では反映されません。</p>
      <div className="field-row"><label>コピーする範囲</label>
        <div className="copy-dlg-choices">
          <label><input type="radio" name="copyrange" checked={!copyDlg.useSelection} onChange={()=>setCopyDlg(d=>({...d,useSelection:false}))} /> 全文（{activeDraft?activeDraft.body.length.toLocaleString():0}文字）</label>
          <label style={copyDlg.selText.trim()?null:{opacity:.45}}><input type="radio" name="copyrange" disabled={!copyDlg.selText.trim()} checked={copyDlg.useSelection} onChange={()=>setCopyDlg(d=>({...d,useSelection:true}))} /> 選択範囲（{copyDlg.selText.length.toLocaleString()}文字）{!copyDlg.selText.trim() && '※文章で文字を選ぶと使えます'}</label>
        </div>
      </div>
      <div className="field-row"><label>コピー先</label>
        <select value={copyDlg.chapterId} onChange={e=>setCopyDlg(d=>({...d,chapterId:e.target.value,blockId:'',mode:e.target.value==='new'?'newScene':d.mode}))}>
          {(data.writings||[]).map(w=><option key={w.id} value={w.id}>{w.title}</option>)}
          <option value="new">{`＋ 新しい${WRITING_UNIT}を作ってコピー`}</option>
        </select>
      </div>
      {copyDlg.chapterId==='new' && <div className="field-row"><label>{`新しい${WRITING_UNIT}の見出し`}</label><input value={copyDlg.newChapterTitle} onChange={e=>setCopyDlg(d=>({...d,newChapterTitle:e.target.value}))} placeholder={`空欄なら「第${data.writings.length+1}${WRITING_UNIT}」`} /></div>}
      {copyDlgChapter && (copyDlgChapter.blocks||[]).length>0 && <div className="field-row"><label>置き方</label>
        <div className="copy-dlg-choices">
          <label><input type="radio" name="copymode" checked={copyDlg.mode==='newScene'} onChange={()=>setCopyDlg(d=>({...d,mode:'newScene'}))} /> 末尾に新しい場面として追加</label>
          <label><input type="radio" name="copymode" checked={copyDlg.mode==='append'} onChange={()=>setCopyDlg(d=>({...d,mode:'append',blockId:d.blockId||copyDlgChapter.blocks[copyDlgChapter.blocks.length-1].id}))} /> 既存の場面の末尾へ追記</label>
        </div>
      </div>}
      {copyDlgChapter && copyDlg.mode==='append' && <div className="field-row"><label>追記する場面</label>
        <select value={copyDlg.blockId} onChange={e=>setCopyDlg(d=>({...d,blockId:e.target.value}))}>
          {copyDlgChapter.blocks.map(b=><option key={b.id} value={b.id}>{b.title}（{b.body.length}文字）</option>)}
        </select>
      </div>}
      {(copyDlg.chapterId==='new' || copyDlg.mode==='newScene') && <div className="field-row"><label>場面の見出し</label><input value={copyDlg.sceneTitle} onChange={e=>setCopyDlg(d=>({...d,sceneTitle:e.target.value}))} /></div>}
      <div className="modal-actions"><button className="btn" onClick={()=>setCopyDlg(null)}>キャンセル</button><button className="btn btn-primary" onClick={executeCopyToBody}>コピーする</button></div>
    </Modal>
  ) : null;

  // ---- 戻る操作（Appから呼ばれる）：画面内で「一つ上」へ戻れたら true。戻れる所が無ければ false。 ----
  // 順に：開いているダイアログ → シート／ドロワー → 集中モード → 下書き編集（→一覧）／ゴミ箱（→一覧） → 本文の通し読み（→場面一覧）／章（→章一覧）
  const handleBack = () => {
    if(draftMenuOpen){ setDraftMenuOpen(false); return true; } // 開いている☰メニューを先に閉じる
    if(copyDlg){ setCopyDlg(null); return true; }
    if(passageDraft){ setPassageDraft(null); return true; }
    if(mapDraft){ setMapDraft(null); return true; }
    if(blockDraft){ setBlockDraft(null); return true; }
    if(textDlg){ setTextDlg(null); return true; }
    if(textMenu){ setTextMenu(null); return true; }
    if(draftHistoryOpen){ setDraftHistoryOpen(false); return true; }
    if(dictEditorOpen){ setDictEditorOpen(false); return true; }
    if(exprDictEditorOpen){ setExprDictEditorOpen(false); return true; }
    if(specialDictEditorOpen){ setSpecialDictEditorOpen(false); return true; }
    if(mediaDictEditorOpen){ setMediaDictEditorOpen(false); return true; }
    if(writingMoreOpen){ setWritingMoreOpen(false); return true; }
    // 編集中なら閲覧へ、閲覧中ならモーダルを閉じる、の順に戻る
    if(adultEdit){ leaveAdultEdit(); return true; }
    if(flowEditing){ leaveFlowEdit(); return true; }
    if(flowOpen){ closeFlow(); return true; }
    if(exprDictOpen){ closeExprDict(); return true; }
    if(toolsOpen){ setToolsOpen(false); return true; }
    if(focusMode){ setFocusMode(false); return true; }
    if(workspaceTab==='draft'){
      if(activeDraft){ backToDraftList(); return true; }
      if(draftShowTrash){ setDraftShowTrash(false); return true; }
      if(textQuery){ setTextQuery(''); return true; }
      if(effFolderId){ const f=textFolderOf(effFolderId); openTextFolder(f?f.parentId||null:null); return true; }
    }
    if(workspaceTab==='chapters' && openChapter){
      if(readAll){ setReadAll(false); return true; }
      backToList(); return true;
    }
    return false;
  };
  useEffect(()=>{
    if(backRef) backRef.current = handleBack;
    return ()=>{ if(backRef && backRef.current===handleBack) backRef.current = null; };
  });
  // 文章を、指定した章の末尾へ新しい場面として「コピー」する。元の文章と本文は同期しない。
  const placePassage=(passage,chapter)=>{
    const block={id:uid('wblock'),title:passage.title,body:passage.body,memo:passage.memo||'',kind:'normal',status:'執筆中',adultNote:''};
    updateBlocks(chapter.id,rows=>[...rows,block]);
    setWorkspaceTab('chapters');setOpenId(chapter.id);setActiveBlockId(block.id);setReadAll(false);
  };
  // 保管棚の版（例：ver1）で、いま選んでいる場面をまるごと置き換える
  const restorePassage=(passage)=>{
    if(!openChapter||!activeBlock)return;
    if(!confirm(`現在の「${activeBlock.title}」を ${passage.title}${passage.version?`（${passage.version}）`:''} の内容に置き換えますか？ 必要なら先に現在の場面を文章として保存してください。`))return;
    updateBlocks(openChapter.id,rows=>rows.map(b=>b.id===activeBlock.id?{...b,body:passage.body,title:passage.title,memo:passage.memo}:b));
  };
  const importSceneMap=()=>{
    try{
      const parsed=JSON.parse(mapImport), maps=Array.isArray(parsed)?parsed:[parsed];
      if(!maps.length||!maps.every(m=>m&&typeof m.title==='string'&&Array.isArray(m.items)&&m.items.every(i=>typeof i==='string'||(i&&typeof i.title==='string'))))throw Error('形式を確認してください');
      setData(d=>({...d,sceneMaps:[...(d.sceneMaps||[]),...maps.map(m=>({id:uid('map'),title:m.title,items:m.items.map(i=>({id:uid('mapitem'),title:typeof i==='string'?i:i.title,memo:typeof i==='string'?'':String(i.memo||'')}))}))]}));
      setMapImport('');alert('地図を追加しました。');
    }catch(e){alert('JSON形式を確認してください。title と items が必要です。');}
  };
  const moveBlock=(chapter,index,delta)=>updateBlocks(chapter.id,rows=>{
    const next=[...rows],to=index+delta;
    if(to<0||to>=next.length)return rows;
    [next[index],next[to]]=[next[to],next[index]];return next;
  });
  const saveBlockDraft=()=>{
    if(!blockDraft||!blockDraft.title.trim())return;
    updateBlocks(openChapter.id,rows=>rows.map(b=>b.id===blockDraft.id?{...blockDraft,title:blockDraft.title.trim()}:b));
    setBlockDraft(null);
  };
  const removeBlock=(chapter,block)=>{
    if(chapter.blocks.length<2||!confirm(`「${block.title}」を削除しますか？本文も消えます。`))return;
    updateBlocks(chapter.id,rows=>rows.filter(b=>b.id!==block.id));
    if(activeBlockId===block.id)setActiveBlockId(chapter.blocks.find(b=>b.id!==block.id).id);
  };
  const remove = (id) => { if(confirm(`この${WRITING_UNIT}を削除しますか？`)){ setData(d=>({...d, writings: d.writings.filter(w=>w.id!==id)})); setOpenId(null); setWritingMoreOpen(false); } };
  const backToList = () => { setOpenId(null); setWritingMoreOpen(false); };

  const openChapter = openId ? data.writings.find(w=>w.id===openId) : null;
  const activeBlock=openChapter&&(openChapter.blocks||[]).find(b=>b.id===activeBlockId)||(openChapter&&openChapter.blocks&&openChapter.blocks[0]);
  const open=openChapter&&activeBlock?{...openChapter,body:activeBlock.body}:null;

  const blockBoard = openChapter&&<div className="writing-block-board">
    <div className="writing-block-toolbar"><strong>文章ブロック</strong><button className="btn btn-sm" onClick={()=>setReadAll(x=>!x)}>{readAll?'一覧に戻る':'通して読む'}</button></div>
    {!readAll&&activeBlock&&<button className="btn btn-sm" onClick={()=>{const version=prompt('保存する版の名前', 'ver2');if(version!==null){savePassage(activeBlock.body,activeBlock.title,activeBlock.memo,version);showDraftToast('「文章」へ保存しました（フォルダ外）');}}}>この場面を文章として保存</button>}
    {!readAll&&activeBlock&&liveDrafts.length>0&&<details><summary>文章からこの場面に戻す</summary>{liveDrafts.map(p=><button key={p.id} className="btn btn-sm" onClick={()=>restorePassage(p)}>{p.title}{p.version?`（${p.version}）`:''}</button>)}</details>}
    {readAll?<div className="writing-block-read">{openChapter.blocks.map(b=><section key={b.id}><h3>{b.title}</h3>{b.body?<div className="writing-block-prose">{b.body}</div>:<p className="writing-block-placeholder">ここに書く場面：{b.memo||'未定'}</p>}</section>)}</div>:<>
      <button className="writing-block-insert" onClick={()=>insertBlock(openChapter,0)}>＋ 先頭に場面を挿入</button>
      {openChapter.blocks.map((b,i)=><React.Fragment key={b.id}><div className={'writing-block-card'+(activeBlock&&b.id===activeBlock.id?' active':'')}>
        <button className="writing-block-select" onClick={()=>{setActiveBlockId(b.id)}}><strong>{b.title}</strong><small>{b.status}・{b.body.length}文字{b.kind==='adult'?'・成人向け':''}</small><span>{b.body.slice(0,90)||b.memo||'本文未入力'}</span></button>
        <div className="writing-block-actions"><button className="btn btn-sm" onClick={()=>setBlockDraft({...b})}>出来事メモ</button><button className="btn btn-sm" onClick={()=>moveBlock(openChapter,i,-1)} disabled={i===0} aria-label="上へ移動">↑</button><button className="btn btn-sm" onClick={()=>moveBlock(openChapter,i,1)} disabled={i===openChapter.blocks.length-1} aria-label="下へ移動">↓</button><button className="btn btn-sm btn-danger" onClick={()=>removeBlock(openChapter,b)} disabled={openChapter.blocks.length<2} aria-label="ブロックを削除">×</button></div>
      </div><button className="writing-block-insert" onClick={()=>insertBlock(openChapter,i+1)}>＋ ここに場面を挿入</button></React.Fragment>)}
    </>}
  </div>;
  const blockModal=blockDraft&&<Modal title="出来事メモ" onClose={()=>setBlockDraft(null)} wide>
    <div className="dict-field-block"><label className="dict-field-label">場面の見出し</label><input value={blockDraft.title} onChange={e=>setBlockDraft(d=>({...d,title:e.target.value}))}/></div>
    <div className="scene-meta-grid"><div className="dict-field-block"><label className="dict-field-label">状態</label><select value={blockDraft.status} onChange={e=>setBlockDraft(d=>({...d,status:e.target.value}))}>{['未定','執筆中','一旦完成'].map(x=><option key={x}>{x}</option>)}</select></div>
    <div className="dict-field-block"><label className="dict-field-label">場面の種類</label><select value={blockDraft.kind} onChange={e=>setBlockDraft(d=>({...d,kind:e.target.value}))}><option value="normal">通常</option><option value="adult">成人向け</option></select></div></div>
    <div className="dict-field-block"><label className="dict-field-label">出来事・明かすこと・まだ隠すこと（自由メモ）</label><textarea rows="8" value={blockDraft.memo} onChange={e=>setBlockDraft(d=>({...d,memo:e.target.value}))}/></div>
    {blockDraft.kind==='adult'&&<div className="dict-field-block"><label className="dict-field-label">行為前後の関係や、次の場面へ残すもの</label><textarea rows="4" value={blockDraft.adultNote} onChange={e=>setBlockDraft(d=>({...d,adultNote:e.target.value}))}/><p className="adult-tab-desc">詳しい段階設計は「成人向け創作」のシーン進行でも扱えます。</p></div>}
    <div className="modal-actions"><button className="btn" onClick={()=>setBlockDraft(null)}>キャンセル</button><button className="btn btn-primary" onClick={saveBlockDraft}>保存</button></div>
  </Modal>;
  const charOptions = allChars.map(c=>({id:c.id,label:c.name||'（無名）'}));
  const locOptions = allLocations.map(l=>({id:l.id,label:l.name||'（無名）'}));
  const ideaOptions = data.ideas.map(i=>({id:i.id,label:(i.content||'').slice(0,20)||'（無題）'}));

  // ---- 表現パレット：カーソル位置とスクロール位置を保ったまま「下書き」へ挿入するためのヘルパー ----
  // savedSelectionRef / savedScrollRef を「下書き上で最後に確定していた状態」のSingle Source of Truthとして扱う。
  // textarea操作（onSelect/onClick/onKeyUp/onBlur）と、パレット系ボタンのpointerdown（preventFocusSteal）の
  // 両方でここへ常時同期し、挿入処理はDOMの現在値ではなく必ずこのrefを参照する。
  // 表現パレット・各辞典は「下書き」専用（採用仕様：本文の文章は直接編集しない）。
  const rememberEditorState = () => {
    const el = textareaRef.current;
    if(el && typeof el.selectionStart === 'number'){
      savedSelectionRef.current = { start: el.selectionStart, end: el.selectionEnd };
      hasCursorInfoRef.current = true; // 一度でも実際のカーソル位置を取得できたことを記録する
    }
    if(el){
      savedScrollRef.current.textareaScrollTop = el.scrollTop;
    }
    if(focusMode){
      const wrap = focusBodyWrapRef.current;
      if(wrap) savedScrollRef.current.focusWrapScrollTop = wrap.scrollTop;
    } else if(typeof window !== 'undefined'){
      savedScrollRef.current.windowScrollY = window.scrollY;
    }
  };

  const preventFocusSteal = (e) => {
    e.preventDefault();
    // ボタンタップでフォーカスが奪われる直前＝下書きが最後に確定していた状態をここで確定させる
    rememberEditorState();
  };

  const getSelection = (bodyLen) => {
    // カーソル位置を一度も取得できていない場合（テキストエリアに触れる前など）は、
    // 仕様どおり本文の末尾へ追記する（位置0ではなく末尾がフォールバック）。
    if(!hasCursorInfoRef.current) return { start: bodyLen, end: bodyLen };
    // DOM上の現在値ではなく、savedSelectionRef（最後に下書き上で確定していたカーソル位置）を基準にする
    let { start, end } = savedSelectionRef.current;
    start = Math.max(0, Math.min(start ?? bodyLen, bodyLen));
    end = Math.max(0, Math.min(end ?? start, bodyLen));
    if(end < start){ const t=start; start=end; end=t; }
    return { start, end };
  };

  const restoreFocusAndSelection = (pos, endPos) => {
    // 挿入直前に保存しておいたスクロール位置のスナップショット（この後の非同期処理中に上書きされないようここで固定）
    const scroll = { ...savedScrollRef.current };
    requestAnimationFrame(()=>{
      const el = textareaRef.current;
      if(!el) return;
      // 1. フォーカス（ブラウザ自身のスクロールは起こさない）。辞書／シーン進行モーダルが開いている間は、モーダル内の入力を妨げないよう奪い返さない。
      if(!sheetOpenRef.current){ try{ el.focus({ preventScroll:true }); }catch(e){ el.focus(); } }
      // 2. カーソル位置・選択範囲（ここでブラウザがキャレット追従スクロールを行うことがある）
      try{ el.setSelectionRange(pos, endPos===undefined ? pos : endPos); }catch(e){}
      // 3. textarea自身のスクロール位置を復元（ブラウザの自動スクロールを打ち消す）
      el.scrollTop = scroll.textareaScrollTop;
      // 4. 外側のスクロール位置を復元
      if(focusMode){
        const wrap = focusBodyWrapRef.current;
        if(wrap) wrap.scrollTop = scroll.focusWrapScrollTop;
      } else if(typeof window !== 'undefined'){
        window.scrollTo({ top: scroll.windowScrollY, left: (window.scrollX||0), behavior:'auto' });
      }
    });
  };

  const insertIntoBody = (text) => {
    if(!text) return;
    const body = draftBody;
    const { start, end } = getSelection(body.length);
    const newBody = body.slice(0, start) + text + body.slice(end);
    const newPos = start + text.length;
    setDraftBody(newBody);
    savedSelectionRef.current = { start:newPos, end:newPos };
    restoreFocusAndSelection(newPos, newPos);
  };

  const openDictEditor = () => { rememberEditorState(); setDictEditorOpen(true); };
  const closeDictEditor = () => {
    setDictEditorOpen(false);
    restoreFocusAndSelection(savedSelectionRef.current.start);
  };

  // ---- 表現辞典：開閉・挿入は表現パレットと同じ savedSelectionRef / insertIntoBody を再利用する ----
  const openExprDict = () => { rememberEditorState(); setExprDictOpen(true); };
  // 編集中（モーダル内）に入力があった場合は、閉じる前に確認する（保存前の入力が意図せず失われないようにする）
  const confirmLeaveEdit = () => {
    if(editDirtyRef.current && !confirm('編集中の入力は、保存していないと失われる場合があります。閉じますか？')) return false;
    editDirtyRef.current = false;
    return true;
  };
  const restoreSavedSelection = () => restoreFocusAndSelection(savedSelectionRef.current.start, savedSelectionRef.current.end);
  const closeExprDict = () => {
    if(adultEdit && !confirmLeaveEdit()) return;
    setAdultEdit(null);
    setExprDictOpen(false);
    restoreSavedSelection();
  };
  const leaveAdultEdit = () => { if(!confirmLeaveEdit()) return; setAdultEdit(null); };
  const closeFlow = () => {
    if(flowEditing && !confirmLeaveEdit()) return;
    setFlowEditing(false);
    setFlowOpen(false);
    restoreSavedSelection();
  };
  const leaveFlowEdit = () => { if(!confirmLeaveEdit()) return; setFlowEditing(false); };
  const openExprDictEditor = () => { rememberEditorState(); setExprDictEditorOpen(true); };
  const closeExprDictEditor = () => {
    setExprDictEditorOpen(false);
    restoreFocusAndSelection(savedSelectionRef.current.start);
  };
  const openSpecialDictEditor = () => { rememberEditorState(); setSpecialDictEditorOpen(true); };
  const closeSpecialDictEditor = () => {
    setSpecialDictEditorOpen(false);
    restoreFocusAndSelection(savedSelectionRef.current.start);
  };
  const openMediaDictEditor = () => { rememberEditorState(); setMediaDictEditorOpen(true); };
  const closeMediaDictEditor = () => {
    setMediaDictEditorOpen(false);
    restoreFocusAndSelection(savedSelectionRef.current.start);
  };
  // 成人向け表現辞典・オノマトペ・進行表は、専用の編集モーダルを持たず、既存の「成人向け創作」画面の
  // 各タブへ遷移して編集する（既存の登録・編集機能をそのまま使う）。遷移時はこのドロワーを閉じる。
  // 編集は別ページへ遷移せず、同じモーダル内で閲覧→編集に切り替える（既存の編集画面部品を再利用。保存先は変えない）。
  const goToAdultDict = () => { rememberEditorState(); editDirtyRef.current = false; setAdultEdit('adult'); };
  const goToOnomatopoeia = () => { rememberEditorState(); editDirtyRef.current = false; setAdultEdit('onomatopoeia'); };
  const goToSceneFlow = () => { rememberEditorState(); editDirtyRef.current = false; setFlowEditing(true); };
  // シーン進行を下書きへ挿入する直前に、必ず現在の内容を履歴へ退避してから、カーソル位置（不明なら末尾）へ挿入する。
  // 挿入位置の前後に既に改行が無ければ、地続きにならないよう改行を補う（本文の内容そのものは変えない）。
  const insertSceneFlowText = (text) => {
    if(!activeDraft) return;
    pushDraftHistory(activeDraft.id, activeDraft.body);
    const body = draftBody;
    const { start } = getSelection(body.length);
    const before = body.slice(0, start);
    const after = body.slice(start);
    const lead = before.length===0 ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const trail = after.length===0 ? '' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
    insertIntoBody(lead + text + trail);
  };

  const dictEditorBlock = dictEditorOpen ? (
    <WritingSnippetDictionaryModal writingSnippets={writingSnippets} setWritingSnippets={setWritingSnippets} onClose={closeDictEditor} />
  ) : null;

  // ---- 辞典ドロワー（参照パネル）。[表現辞典][小説語彙][メディア語]をdictTabで切り替える。いずれも候補は下書きへ挿入せず、コピー中心 ----
  // ---- 辞書モーダル：[表現辞典][小説語彙][メディア語][成人向け表現][オノマトペ]を共通モーダル内で切り替える。既存の検索・候補表示・コピー・挿入はそのまま使う。
  //      編集は同じモーダル内で行う（成人向け表現・オノマトペ＝モーダル内の編集ペイン／表現・小説語彙・メディア語＝既存の編集モーダルへ切替。閲覧側は閉じずに隠して状態を保つ）。
  const dictViewHidden = exprDictEditorOpen || specialDictEditorOpen || mediaDictEditorOpen;
  const exprDictBlock = exprDictOpen ? (
    <WritingSheet onClose={closeExprDict} bottomInset={keyboardInset} hidden={dictViewHidden} label="辞書">
      <div className="wsheet-pane" style={adultEdit ? {display:'none'} : null}>
    {dictTab==='special' ? (
      <SpecialDictionaryPanel
        dictionary={specialDictionary}
        onOpenEditor={openSpecialDictEditor}
        onClose={closeExprDict}
        onInsert={insertIntoBody}
        preventFocusSteal={preventFocusSteal}
        dictTab={dictTab}
        onDictTabChange={setDictTab}
      />
    ) : dictTab==='media' ? (
      <MediaDictionaryPanel
        dictionary={mediaDictionary}
        onOpenEditor={openMediaDictEditor}
        onClose={closeExprDict}
        onInsert={insertIntoBody}
        preventFocusSteal={preventFocusSteal}
        dictTab={dictTab}
        onDictTabChange={setDictTab}
      />
    ) : dictTab==='adult' ? (
      <AdultExpressionPanel
        dictionary={adultDictionary||{entries:[]}}
        onOpenEditor={goToAdultDict}
        onClose={closeExprDict}
        onInsert={insertIntoBody}
        preventFocusSteal={preventFocusSteal}
        dictTab={dictTab}
        onDictTabChange={setDictTab}
      />
    ) : dictTab==='onomatopoeia' ? (
      <OnomatopoeiaPanel
        dictionary={adultOnomatopoeia||{entries:[]}}
        onOpenEditor={goToOnomatopoeia}
        onClose={closeExprDict}
        onInsert={insertIntoBody}
        preventFocusSteal={preventFocusSteal}
        dictTab={dictTab}
        onDictTabChange={setDictTab}
      />
    ) : (
      <ExpressionDictionaryPanel
        dictionary={expressionDictionary}
        onOpenEditor={openExprDictEditor}
        onClose={closeExprDict}
        onInsert={insertIntoBody}
        preventFocusSteal={preventFocusSteal}
        dictTab={dictTab}
        onDictTabChange={setDictTab}
      />
    )}
      </div>
      {adultEdit && (
        <WritingSheetEditPane title={adultEdit==='adult' ? '成人向け表現を編集' : 'オノマトペを編集'} onBack={leaveAdultEdit} onClose={closeExprDict} dirtyRef={editDirtyRef}>
          {adultEdit==='adult'
            ? <AdultExpressionDictionaryTab adultDictionary={adultDictionary} setAdultDictionary={setAdultDictionary} />
            : <AdultOnomatopoeiaTab data={adultOnomatopoeia} setData={setAdultOnomatopoeia} />}
        </WritingSheetEditPane>
      )}
    </WritingSheet>
  ) : null;

  // ---- シーン進行モーダル：辞書とは別。全年齢・成人向けの既存プランを参照し、下書きへ挿入できる。編集は同じモーダル内で切り替える。 ----
  const flowBlock = flowOpen ? (
    <WritingSheet onClose={closeFlow} bottomInset={keyboardInset} label="シーン進行">
      <div className="wsheet-pane" style={flowEditing ? {display:'none'} : null}>
        <SceneFlowReferencePanel
          plans={(data.sceneFlowPlans||[])}
          activeId={flowActiveId}
          onActiveChange={setFlowActiveId}
          onOpenEditor={goToSceneFlow}
          onClose={closeFlow}
          onInsert={insertSceneFlowText}
          preventFocusSteal={preventFocusSteal}
        />
      </div>
      {flowEditing && (
        <WritingSheetEditPane title="シーン進行を編集" onBack={leaveFlowEdit} onClose={closeFlow} dirtyRef={editDirtyRef}>
          <SceneFlowPlansEditor data={data} setData={setData} kindFilter="all" allowKindSwitch adultLibrary={adultSceneFlow}
            onInsertToDraft={(plan)=>insertSceneFlowText(formatSceneFlowPlanForInsert(plan))}
            initialActiveId={flowActiveId} onActiveChange={setFlowActiveId} />
        </WritingSheetEditPane>
      )}
    </WritingSheet>
  ) : null;

  const exprDictEditorBlock = exprDictEditorOpen ? (
    <ExpressionDictionaryEditorModal expressionDictionary={expressionDictionary} setExpressionDictionary={setExpressionDictionary} onClose={closeExprDictEditor} />
  ) : null;

  const specialDictEditorBlock = specialDictEditorOpen ? (
    <SpecialDictionaryEditorModal specialDictionary={specialDictionary} setSpecialDictionary={setSpecialDictionary} onClose={closeSpecialDictEditor} lastSpecialImportIds={lastSpecialImportIds} setLastSpecialImportIds={setLastSpecialImportIds} />
  ) : null;

  const mediaDictEditorBlock = mediaDictEditorOpen ? (
    <MediaDictionaryEditorModal mediaDictionary={mediaDictionary} setMediaDictionary={setMediaDictionary} onClose={closeMediaDictEditor} lastMediaImportIds={lastMediaImportIds} setLastMediaImportIds={setLastMediaImportIds} />
  ) : null;

  // 道具（下部パネル）／辞書モーダル／シーン進行モーダルは、同時に開かない
  const toggleWritingMore = () => { setWritingMoreOpen(o=>{ const next=!o; if(next){ setExprDictOpen(false); setFlowOpen(false); setToolsOpen(false); } return next; }); };
  const toggleTools = () => { setToolsOpen(o=>{ const next=!o; if(next){ setExprDictOpen(false); setFlowOpen(false); setWritingMoreOpen(false); } return next; }); };
  const openDictModal = () => { setToolsOpen(false); setWritingMoreOpen(false); setFlowOpen(false); setFlowEditing(false); setAdultEdit(null); setExprDictOpen(true); };
  const openFlowModal = () => { setToolsOpen(false); setWritingMoreOpen(false); setExprDictOpen(false); setAdultEdit(null); setFlowEditing(false); setFlowOpen(true); };

  // ---- 「⋯」→メモ・関連情報を開く：集中モード中なら先に集中モードを終了してからスクロールする ----
  const openMemoSection = () => {
    setWritingMoreOpen(false);
    if(focusMode) setFocusMode(false);
    setMemoOpenSignal(s=>s+1);
  };
  useEffect(()=>{
    if(!memoOpenSignal || focusMode) return;
    const t = setTimeout(()=>{
      if(memoSectionRef.current) memoSectionRef.current.scrollIntoView({ behavior:'smooth', block:'start' });
    }, 80);
    return ()=>clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoOpenSignal, focusMode]);

  // ---- スマホ「⋯」：下書きタブでは文字サイズのみ、本文（章）タブでは文字サイズ／メモ・関連情報／章削除 ----
  const writingMoreBlock = writingMoreOpen ? (
    <div className="wmore-backdrop" onClick={()=>setWritingMoreOpen(false)}>
      <div className="wmore-sheet" onClick={e=>e.stopPropagation()}>
        <div className="wmore-head"><span>{workspaceTab==='draft'?'文章の操作':'本文の操作'}</span><button type="button" className="btn btn-sm btn-ghost" onClick={()=>setWritingMoreOpen(false)}>×</button></div>
        <div className="wmore-fontsize-row">
          <span className="wmore-fontsize-label">文字サイズ</span>
          <FontSizeControl value={writingFontSize} onChange={setWritingFontSize} />
        </div>
        {workspaceTab!=='draft' && open && <>
          <div className="wmore-sep" />
          <button type="button" className="wmore-item" onClick={openMemoSection}>メモ・関連情報を開く</button>
          <div className="wmore-sep" />
          <button type="button" className="wmore-item wmore-danger" onClick={()=>{ setWritingMoreOpen(false); remove(open.id); }}>{WRITING_UNIT}を削除</button>
        </>}
      </div>
    </div>
  ) : null;


  // ---- 道具シート：常時は表示せず「道具」ボタンから開く。
  //      ・よく使う文字・お気に入り＝表現パレット辞書で★（pinned）を付けた語を1タップ挿入
  //      ・辞書から表現を探す＝既存の表現辞典ドロワー（表現辞典／小説語彙／メディア語など）を開いて挿入
  //      ・表現パレット／シーン進行／成人向け候補は既存ドロワーへの入口 ----
  const pinnedSnippets = writingSnippets.snippets.filter(s=>s.pinned).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
  const favLabelOf = (sn) => { const t = sn.text||''; if(t && t.length<=6) return t; return sn.label ? sn.label : t; };
  // 道具＝小さい共通パネル。ヘッダー（お気に入り／表現パレットの切替・編集・閉じる）は固定し、ボタン列だけを横スクロールにする。
  const toolsBtnProps = { onMouseDown:preventFocusSteal, onPointerDown:preventFocusSteal };
  const toolsSnippetCats = [...writingSnippets.categories].sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0))
    .filter(cat=>writingSnippets.snippets.some(sn=>sn.categoryId===cat.id));
  const toolsActiveCat = toolsSnippetCats.find(c=>c.id===toolsCatId) || toolsSnippetCats[0] || null;
  const toolsCatSnippets = toolsActiveCat ? writingSnippets.snippets.filter(sn=>sn.categoryId===toolsActiveCat.id).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0)) : [];
  const toolsBlock = (toolsOpen && (workspaceTab==='draft')) ? (
    <div className="snippet-palette writing-tools-drawer" style={{ bottom: paletteBottomOffset + 'px' }}>
      <div className="snippet-palette-head writing-tools-head">
        <div className="wt-seg" role="tablist" aria-label="道具の切替">
          <button type="button" role="tab" aria-selected={toolsMode==='fav'} className={"wt-seg-btn"+(toolsMode==='fav'?" active":"")} {...toolsBtnProps} onClick={()=>setToolsMode('fav')}>お気に入り</button>
          <button type="button" role="tab" aria-selected={toolsMode==='palette'} className={"wt-seg-btn"+(toolsMode==='palette'?" active":"")} {...toolsBtnProps} onClick={()=>setToolsMode('palette')}>表現パレット</button>
        </div>
        <div className="snippet-palette-head-actions">
          <button type="button" className="btn btn-sm" {...toolsBtnProps} onClick={openDictEditor}>編集</button>
          <button type="button" className="btn btn-sm btn-ghost" aria-label="道具を閉じる" {...toolsBtnProps} onClick={()=>setToolsOpen(false)}>×</button>
        </div>
      </div>
      {toolsMode==='palette' && toolsSnippetCats.length>0 && (
        <div className="wt-cats">
          {toolsSnippetCats.map(cat=>(
            <button key={cat.id} type="button" className={"snippet-cat-tab"+(toolsActiveCat && toolsActiveCat.id===cat.id ? " active" : "")} {...toolsBtnProps}
              onClick={()=>setToolsCatId(cat.id)}>{cat.name}</button>
          ))}
        </div>
      )}
      <div className="snippet-palette-body writing-tools-body">
        <div className="snippet-palette-buttons">
          {toolsMode==='fav' && PUNCTUATION_SHORTCUTS.map(it=>(
            <button key={it.key} type="button" className="snippet-btn writing-tools-symbol" {...toolsBtnProps}
              onClick={()=>insertIntoBody(it.text)}>{it.label}</button>
          ))}
          {toolsMode==='fav' && pinnedSnippets.map(sn=>(
            <button key={sn.id} type="button" className="snippet-btn" {...toolsBtnProps}
              onClick={()=>insertIntoBody(sn.text)}>{favLabelOf(sn)}</button>
          ))}
          {toolsMode==='palette' && toolsCatSnippets.map(sn=>(
            <button key={sn.id} type="button" className="snippet-btn" {...toolsBtnProps}
              onClick={()=>insertIntoBody(sn.text)}>{sn.label ? sn.label : sn.text}</button>
          ))}
          {toolsMode==='palette' && toolsSnippetCats.length===0 && <span className="wt-empty">表現が未登録です（編集から追加）</span>}
        </div>
      </div>
    </div>
  ) : null;

  // ---- 執筆記号ショートカットバー：「」――……の4記号を、下書きtextareaにフォーカスがある間だけ常設表示（表現パレットとは別機能） ----
  // 記号ショートカットバー（「」――……）の常時表示は廃止。記号は「道具」シートの「よく使う文字・お気に入り」から挿入する。
  const symbolBarBlock = null;

  // 執筆の2区分（表示名は「書く／まとめる」。内部ID draft／chapters は変更しない）。常に同じ並びで表示し、今どこにいるかを明確にする。
  // シーンの地図はAI用の補助機能のため、区分とは別の小さなリンクにする。
  const switchWritingTab = (tab) => { commitInput(); setDraftMenuOpen(false); setExprDictOpen(false); setFlowOpen(false); setToolsOpen(false); setWritingMoreOpen(false); setWorkspaceTab(tab); };
  const tabsBar = (
    <div className="writing-seg-wrap">
      <div className="writing-seg" role="tablist" aria-label="執筆の区分">
        {[['draft','📝 書く'],['chapters','📖 まとめる']].map(([k,l])=>(
          <button key={k} type="button" role="tab" aria-selected={workspaceTab===k} className={'writing-seg-btn'+(workspaceTab===k?' active':'')} onClick={()=>switchWritingTab(k)}>{l}</button>
        ))}
      </div>
      <button type="button" className={'writing-map-link'+(workspaceTab==='map'?' active':'')} onClick={()=>switchWritingTab('map')}>🗺 シーンの地図（AI用）</button>
      <div className="writing-seg-cap" style={{flexBasis:'100%',fontSize:'11.5px',color:'var(--ink-soft)',marginTop:2}}>{workspaceTab==='chapters' ? 'まとめる：章・場面を並べて本文にまとめる' : workspaceTab==='draft' ? '書く：文章を作成・編集する' : ''}</div>
    </div>
  );

  // ============================================================
  // 下書き：集中モード（自由に書いて推敲する場所。本文とは独立）
  // ============================================================
  if(workspaceTab==='draft' && focusMode && activeDraft){
    return (
      <div className="writing-focus">
        <div className="writing-focus-header">
          <div className="writing-header-row1">
            <button type="button" className="writing-back-btn" onClick={()=>setFocusMode(false)} title="集中モードを終了" aria-label="集中モードを終了">
              <span className="wh-back-full">← 集中終了</span><span className="wh-back-short">←</span>
            </button>
            <div className="writing-focus-title" style={{fontWeight:700}}>{activeDraft.title}</div>
            <span className="wordcount">{draftBody.length.toLocaleString()} 文字</span>
          </div>
          <div className="writing-header-row2">
            <button type="button" className={"btn btn-sm"+(toolsOpen?" active":"")} onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={toggleTools}>🧰 道具</button>
            <button type="button" className={"btn btn-sm"+(exprDictOpen?" active":"")} onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={openDictModal}>📖 辞書</button>
            <button type="button" className={"btn btn-sm"+(flowOpen?" active":"")} onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={openFlowModal}><span className="wh-label-full">シーン進行</span><span className="wh-label-short">進行</span></button>
            <span className="writing-only-desktop"><FontSizeControl value={writingFontSize} onChange={setWritingFontSize} /></span>
            <button type="button" className="btn btn-sm writing-more-btn writing-only-mobile" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={toggleWritingMore} aria-label="その他の操作" title="その他の操作">⋯</button>
          </div>
        </div>
        <div className="writing-focus-body-wrap" ref={focusBodyWrapRef}>
          <textarea ref={textareaRef} className="writing-body-area writing-body-area-focus" style={{fontSize:writingFontSize}} value={draftBody}
            onChange={e=>{ setDraftBody(e.target.value); rememberEditorState(); }}
            onSelect={rememberEditorState} onClick={rememberEditorState} onKeyUp={rememberEditorState}
            onFocus={()=>{ setDraftFocused(true); rememberEditorState(); }}
            onBlur={()=>{ rememberEditorState(); setDraftFocused(false); }}
            placeholder="思いついた文章をここに…" autoFocus />
        </div>
        {toolsBlock}
        {symbolBarBlock}
        {exprDictBlock}
        {flowBlock}
        {dictEditorBlock}
        {exprDictEditorBlock}
        {specialDictEditorBlock}
        {mediaDictEditorBlock}
        {writingMoreBlock}
      </div>
    );
  }

  // ============================================================
  // 本文：章の詳細（塊の並び替え・通し読み。文章そのものは直接編集しない）
  // ============================================================
  if(workspaceTab==='chapters' && open){
    return (
      <div>
        {tabsBar}
        <div className="writing-header">
          <div className="writing-header-row1">
            <button type="button" className="writing-back-btn" onClick={backToList} title="本文一覧に戻る" aria-label="本文一覧に戻る">
              <span className="wh-back-full">← 本文一覧</span><span className="wh-back-short">←</span>
            </button>
            <input className="writing-title-input" value={open.title} onChange={e=>update(open.id,{title:e.target.value})} placeholder={`${WRITING_UNIT}タイトル`} />
            <span className="wordcount">{open.body.length.toLocaleString()} 文字</span>
          </div>
          <div className="writing-header-row2">
            <span className="writing-only-desktop"><FontSizeControl value={writingFontSize} onChange={setWritingFontSize} /></span>
            <button className="btn btn-danger btn-sm writing-only-desktop" onClick={()=>remove(open.id)}>削除</button>
            <button type="button" className="btn btn-sm writing-more-btn writing-only-mobile" onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={toggleWritingMore} aria-label="その他の操作" title="その他の操作">⋯</button>
          </div>
        </div>
        {blockBoard}
        {blockModal}
        {readAll?<div className="writing-block-read-note">「一覧に戻る」で場面の並びを確認・編集できます。</div>:<><div className="writing-toolbar-gap" />
        <div className="writing-body-area" style={{fontSize:writingFontSize, whiteSpace:'pre-wrap', cursor:'default'}} aria-readonly="true">
          {activeBlock&&activeBlock.body ? activeBlock.body : <span className="writing-block-placeholder">まだ本文がありません。文章の「本文へコピー」か、保管棚の塊のコピーで文章を入れられます。</span>}
        </div>
        <div className="toolbar" style={{marginTop:10}}>
          <button className="btn btn-sm" onClick={()=>{ if(activeBlock) createDraftFromSource('block',activeBlock.id,activeBlock.title,activeBlock.body); }}>この場面を新しい文章へコピー</button>
        </div>
        {writingMoreBlock}
        <div style={{marginTop:14}} ref={memoSectionRef}>
          <CollapsibleSection title="メモ・関連情報" defaultOpen={false} openSignal={memoOpenSignal}>
            <div className="field-row"><label>メモ</label><FieldAutoTextarea value={open.memo} onChange={e=>update(open.id,{memo:e.target.value})} minHeight={120} /></div>
            <LinkPicker label="登場人物" options={charOptions} selectedIds={open.personIds} onChange={ids=>update(open.id,{personIds:ids})} />
            <LinkPicker label="場所" options={locOptions} selectedIds={open.locationIds} onChange={ids=>update(open.id,{locationIds:ids})} />
            <LinkPicker label="関連ネタ" options={ideaOptions} selectedIds={open.ideaIds} onChange={ids=>update(open.id,{ideaIds:ids})} />
          </CollapsibleSection>
        </div></>}
      </div>
    );
  }

  // ============================================================
  // タブ切り替え画面（下書き／塊の保管棚／シーンの地図／本文）
  // ============================================================
  return (
    <div>
      <div className="toolbar">
        <h1>✍️ 執筆</h1>
      </div>
      {tabsBar}
      {workspaceTab==='draft' && !activeDraft && <div className="writing-block-board text-list-board">
        {!draftShowTrash ? <>
          <div className="text-list-head">
            {(effFolderId||textQuery) ? <button type="button" className="btn btn-sm text-up-btn" aria-label="親フォルダへ戻る" onClick={()=>{ if(textQuery){ setTextQuery(''); return; } const f=textFolderOf(effFolderId); openTextFolder(f?f.parentId||null:null); }}>← {textQuery?'一覧へ':(()=>{ const f=textFolderOf(effFolderId); const pf=f&&f.parentId?textFolderOf(f.parentId):null; return pf?pf.name:'文章'; })()}</button> : null}
            <div className="text-list-title" title={textFolderLabel(effFolderId)}>{textQuery?'🔍 検索結果':(effFolderId?'📁 '+((textFolderOf(effFolderId)||{}).name||''):'📝 文章')}</div>
          </div>
          {effFolderId && !textQuery && <div className="text-list-path">{textFolderLabel(effFolderId)}</div>}
          <div className="toolbar">
            <button className="btn btn-primary" onClick={addBlankDraft}>＋ 新規作成</button>
            <button className="btn btn-sm" onClick={()=>setTextDlg({type:'newFolder',name:'',parentId:effFolderId})}>フォルダを作成</button>
            <button className="btn btn-sm" onClick={goToSceneFlow}>シーン進行</button>
            <span className="filler" />
            <button className="btn btn-sm" onClick={()=>{commitInput();setDraftShowTrash(true);}}>ゴミ箱（{trashedDrafts.length}）</button>
          </div>
          <input className="text-search-input" type="search" placeholder="タイトル・文章内容で検索" value={textQuery} onChange={e=>setTextQuery(e.target.value)} />
          {(()=>{
            const q=textQuery.trim().toLowerCase();
            const folders=q?[]:(data.textFolders||[]).filter(f=>(f.parentId||null)===effFolderId).slice().sort((a,b)=>a.name.localeCompare(b.name,'ja'));
            const texts=(q
              ? liveDrafts.filter(t=>(t.title||'').toLowerCase().includes(q)||(t.body||'').toLowerCase().includes(q)||(t.memo||'').toLowerCase().includes(q))
              : textsInFolder(data,effFolderId,false)
            ).slice().sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
            const countIn=(fid)=>{ const ds=textFolderDescendantIds(data.textFolders,fid); ds.add(fid); return liveDrafts.filter(t=>ds.has(t.folderId)).length; };
            if(!folders.length && !texts.length) return <div className="empty-hint">{q?'見つかりませんでした。':(effFolderId?'このフォルダは空です。':'まだ文章がありません。「＋ 新規作成」から始められます。')}</div>;
            return <>
              {folders.map(f=>(
                <div className="writing-list-row text-row" key={f.id}>
                  <button type="button" className="writing-block-select text-row-main" onClick={()=>openTextFolder(f.id)}>
                    <strong>📁 {f.name}</strong>
                    <small>{countIn(f.id)}件</small>
                  </button>
                  <button type="button" className="btn btn-sm text-row-menu" aria-label={`フォルダ「${f.name}」の操作メニュー`} onClick={()=>setTextMenu({kind:'folder',id:f.id})}>⋯</button>
                </div>
              ))}
              {texts.map(d=>(
                <div className="writing-list-row text-row" key={d.id}>
                  <button type="button" className="writing-block-select text-row-main" onClick={()=>openDraft(d.id)}>
                    <strong>{d.title}{d.version?<span className="text-ver">{d.version}</span>:null}</strong>
                    <small>{new Date(d.updatedAt).toLocaleString('ja-JP')}・{d.body.length}文字{q&&d.folderId?'・'+textFolderLabel(d.folderId):''}</small>
                    <span>{d.body.slice(0,60)||'（本文なし）'}</span>
                    {d.memo && <small style={{display:'block',opacity:.75}}>メモ：{d.memo.slice(0,40)}</small>}
                    {draftUsersLabel(d.id) && <small style={{display:'block',opacity:.75}}>プロットの出来事：{draftUsersLabel(d.id)}</small>}
                  </button>
                  <button type="button" className="btn btn-sm text-row-menu" aria-label={`「${d.title}」の操作メニュー`} onClick={()=>setTextMenu({kind:'text',id:d.id})}>⋯</button>
                </div>
              ))}
            </>;
          })()}
        </> : <>
          <div className="text-list-head">
            <button type="button" className="btn btn-sm text-up-btn" onClick={()=>setDraftShowTrash(false)}>← 一覧へ</button>
            <div className="text-list-title">🗑 ゴミ箱</div>
          </div>
          <p className="adult-tab-desc">ゴミ箱の文章は復元するか、完全に削除するまで残ります。復元すると元のフォルダへ戻ります（フォルダが無ければフォルダ外）。</p>
          {!trashedDrafts.length && <div className="empty-hint">ゴミ箱は空です。</div>}
          {trashedDrafts.slice().sort((a,b)=>new Date(b.deletedAt)-new Date(a.deletedAt)).map(d=>(
            <div className="writing-block-card" key={d.id}>
              <div><strong>{d.title}</strong><p>{d.body.slice(0,80)||'（本文なし）'}</p><small>{d.folderId?textFolderLabel(d.folderId)+'・':''}削除日時：{d.deletedAt?new Date(d.deletedAt).toLocaleString('ja-JP'):''}</small></div>
              <div className="writing-block-actions">
                <button type="button" className="btn btn-sm btn-primary" onClick={()=>restoreDraftFromTrash(d)}>復元</button>
                <button type="button" className="btn btn-sm btn-danger" onClick={()=>permanentlyDeleteDraft(d)}>完全に削除</button>
              </div>
            </div>
          ))}
        </>}
      </div>}
      {workspaceTab==='draft' && activeDraft && <div className="writing-block-board">
        <div className="writing-header-row1" style={{marginBottom:8}}>
          <button type="button" className="writing-back-btn" onClick={backToDraftList} title="文章一覧に戻る" aria-label="文章一覧に戻る">
            <span className="wh-back-full">← 文章一覧</span><span className="wh-back-short">←</span>
          </button>
          <input className="writing-title-input" value={activeDraft.title} onChange={e=>setDraftTitle(e.target.value)} placeholder="文章の見出し" />
          <span className="wordcount">{draftBody.length.toLocaleString()} 文字</span>
          <div className="dmenu-wrap">
            <button type="button" ref={draftMenuBtnRef} className={"btn btn-sm dmenu-btn"+(draftMenuOpen?" active":"")} aria-label="文章の操作メニュー" aria-haspopup="menu" aria-expanded={draftMenuOpen}
              onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal} onClick={()=>setDraftMenuOpen(o=>!o)}>☰</button>
            {draftMenuOpen && (<>
              <div className="dmenu-backdrop" onMouseDown={(e)=>{ e.preventDefault(); rememberEditorState(); setDraftMenuOpen(false); }} onPointerDown={(e)=>{ e.preventDefault(); rememberEditorState(); setDraftMenuOpen(false); }} />
              <div className="dmenu" role="menu" style={{ maxHeight: draftMenuMaxH + 'px' }}>
                {[
                  ['集中モード','🎯', ()=>setFocusMode(true)],
                  ['道具','🧰', toggleTools],
                  ['辞書','📖', openDictModal],
                  ['シーン進行','🎬', openFlowModal],
                  ['本文へコピー','📋', openCopyToBody],
                  ['履歴','🕘', ()=>setDraftHistoryOpen(true)],
                ].map(([label, icon, fn], idx)=>(
                  <button key={label} type="button" role="menuitem" className="dmenu-part" style={{ animationDelay:(idx*35)+'ms' }} aria-label={label}
                    onMouseDown={preventFocusSteal} onPointerDown={preventFocusSteal}
                    onClick={()=>{ setDraftMenuOpen(false); fn(); }}>
                    <span className="dmenu-part-label">{label}</span>
                    <span className="dmenu-part-icon" aria-hidden="true">{icon}</span>
                  </button>
                ))}
                <div className="dmenu-part dmenu-part-font" style={{ animationDelay:'210ms' }}><span className="dmenu-part-label">文字サイズ</span><FontSizeControl value={writingFontSize} onChange={setWritingFontSize} /></div>
              </div>
            </>)}
          </div>
        </div>
        {draftUsersLabel(activeDraft.id) && <div className="hint" style={{margin:'0 0 6px',fontSize:12,color:'var(--ink-soft)'}}>プロットの出来事：{draftUsersLabel(activeDraft.id)}（同じ文章をプロットの執筆モーダルでも編集できます）</div>}
        <textarea id="drafting-area" ref={textareaRef} className="writing-body-area" style={{fontSize:writingFontSize}} value={draftBody}
          onChange={e=>{ setDraftBody(e.target.value); rememberEditorState(); }}
          onSelect={rememberEditorState} onClick={rememberEditorState} onKeyUp={rememberEditorState}
          onFocus={()=>{ setDraftFocused(true); rememberEditorState(); }}
          onBlur={()=>{ rememberEditorState(); setDraftFocused(false); }}
          placeholder="思いついた文章をここに…" />
        {toolsBlock}
        {symbolBarBlock}
        <div className="toolbar"><button className="btn btn-primary" onClick={openCopyToBody}>📋 本文へコピー</button><button className="btn btn-sm" onClick={()=>{const body=selectedDraftText();if(!body.trim())return;setPassageDraft({title:'新しい文章',body,memo:'',version:'',fromDraft:true})}}>選択範囲／全文を新しい文章として保存</button></div>
      </div>}
      {workspaceTab==='map'&&<div className="writing-block-board">
        <p className="adult-tab-desc">話の道筋を置く地図です。本文の順番とは独立しています。「１話の構成」から場面ごとの工程を詳しく設計できます。</p>
        <div className="toolbar">
          <button className="btn btn-primary" onClick={()=>setData(d=>({...d,sceneMaps:[...(d.sceneMaps||[]),{id:uid('map'),title:'新しい話',items:[]}]}))}>＋ 地図を追加</button>
          <button className="btn btn-sm" onClick={goToSceneFlow}>シーン進行を管理</button>
        </div>
        {(data.sceneMaps||[]).map(m=><section key={m.id}><div className="toolbar"><input value={m.title} aria-label="地図のタイトル" onChange={e=>setData(d=>({...d,sceneMaps:d.sceneMaps.map(x=>x.id===m.id?{...x,title:e.target.value}:x)}))}/><button className="btn btn-sm" onClick={()=>onOpenSceneTools&&onOpenSceneTools()}>１話の構成を開く</button><button className="btn btn-sm" onClick={()=>{if(confirm('この地図を削除しますか？'))setData(d=>({...d,sceneMaps:d.sceneMaps.filter(x=>x.id!==m.id)}))}}>地図を削除</button></div>
          {m.items.map((item,i)=><div className="writing-block-card" key={item.id}><button className="writing-block-select" onClick={()=>setMapDraft({mapId:m.id,item:{...item}})}><strong>{item.title||'未定の場面'}</strong><span>{item.memo}</span></button><div className="writing-block-actions"><button className="btn btn-sm" disabled={!i} onClick={()=>setData(d=>({...d,sceneMaps:d.sceneMaps.map(x=>x.id!==m.id?x:{...x,items:x.items.map((y,j)=>j===i-1?x.items[i]:j===i?x.items[i-1]:y)})}))}>↑</button><button className="btn btn-sm" disabled={i===m.items.length-1} onClick={()=>setData(d=>({...d,sceneMaps:d.sceneMaps.map(x=>x.id!==m.id?x:{...x,items:x.items.map((y,j)=>j===i+1?x.items[i]:j===i?x.items[i+1]:y)})}))}>↓</button><button className="btn btn-sm" onClick={()=>{if(confirm('この項目を削除しますか？'))setData(d=>({...d,sceneMaps:d.sceneMaps.map(x=>x.id!==m.id?x:{...x,items:x.items.filter(y=>y.id!==item.id)})}))}}>×</button></div></div>)}
          <button className="writing-block-insert" onClick={()=>setData(d=>({...d,sceneMaps:d.sceneMaps.map(x=>x.id!==m.id?x:{...x,items:[...x.items,{id:uid('mapitem'),title:'新しい出来事',memo:''}]})}))}>＋ 出来事を追加</button></section>)}
        <h3>JSONで地図を追加</h3><p className="adult-tab-desc">例：<code>{'{"title":"第1話","items":[{"title":"研究所消滅","memo":"伏せる情報"},"船員紹介"]}'}</code></p><textarea rows="5" style={{width:'100%'}} value={mapImport} onChange={e=>setMapImport(e.target.value)}/><button className="btn btn-sm" onClick={importSceneMap}>JSONを読み込む</button>
      </div>}
      {workspaceTab==='chapters'&&<div className="writing-block-board">
        <div className="toolbar"><span className="filler" /><button className="btn btn-primary" onClick={addChapter}>{`＋ ${WRITING_UNIT}を追加`}</button></div>
        {data.writings.length===0 && <div className="empty-hint">{`まだ本文がありません。「＋ ${WRITING_UNIT}を追加」から始められます。「文章」で書いた文章は「本文へコピー」で入れられます。`}</div>}
        {data.writings.map(w=>(
          <div className="writing-list-row" key={w.id} onClick={()=>{setOpenId(w.id);setActiveBlockId(w.blocks&&w.blocks[0]&&w.blocks[0].id);setReadAll(false)}} style={{cursor:'pointer'}}>
            <div>
              <div style={{fontWeight:700}}>{w.title}</div>
              <div style={{fontSize:12, color:'var(--ink-soft)'}}>{w.body.length} 文字</div>
            </div>
            <span>開く →</span>
          </div>
        ))}
      </div>}
      {passageDraft&&<Modal title="新しい文章として保存" onClose={()=>setPassageDraft(null)} wide><div className="field-row"><label>見出し</label><input value={passageDraft.title} onChange={e=>setPassageDraft(d=>({...d,title:e.target.value}))}/></div><div className="field-row"><label>版</label><input value={passageDraft.version} onChange={e=>setPassageDraft(d=>({...d,version:e.target.value}))}/></div><div className="field-row"><label>メモ</label><textarea rows="3" value={passageDraft.memo} onChange={e=>setPassageDraft(d=>({...d,memo:e.target.value}))}/></div><div className="field-row"><label>文章</label><textarea rows="12" style={{width:'100%'}} value={passageDraft.body} onChange={e=>setPassageDraft(d=>({...d,body:e.target.value}))}/></div><div className="modal-actions"><button className="btn" onClick={()=>setPassageDraft(null)}>キャンセル</button><button className="btn btn-primary" onClick={()=>{if(!passageDraft.body.trim())return;savePassage(passageDraft.body,passageDraft.title,passageDraft.memo,passageDraft.version,activeDraft?activeDraft.folderId||null:null);setPassageDraft(null);showDraftToast('新しい文章として保存しました（元の文章はそのままです）')}}>保存</button></div></Modal>}
      {mapDraft&&<Modal title="地図の出来事" onClose={()=>setMapDraft(null)}><div className="field-row"><label>見出し</label><input value={mapDraft.item.title} onChange={e=>setMapDraft(d=>({...d,item:{...d.item,title:e.target.value}}))}/></div><div className="field-row"><label>自由メモ</label><textarea rows="8" value={mapDraft.item.memo} onChange={e=>setMapDraft(d=>({...d,item:{...d.item,memo:e.target.value}}))}/></div><div className="modal-actions"><button className="btn" onClick={()=>setMapDraft(null)}>キャンセル</button><button className="btn btn-primary" onClick={()=>{setData(d=>({...d,sceneMaps:d.sceneMaps.map(x=>x.id!==mapDraft.mapId?x:{...x,items:x.items.map(i=>i.id===mapDraft.item.id?mapDraft.item:i)})}));setMapDraft(null)}}>保存</button></div></Modal>}
      {textMenu&&(()=>{
        const isF=textMenu.kind==='folder';
        const it=isF?textFolderOf(textMenu.id):(data.drafts||[]).find(t=>t.id===textMenu.id);
        if(!it) return null;
        const B=(label,fn,cls)=><button type="button" className={'btn '+(cls||'')} style={{width:'100%',textAlign:'left',marginBottom:6}} onClick={fn}>{label}</button>;
        return <Modal title={(isF?'📁 ':'')+(isF?it.name:it.title)} onClose={()=>setTextMenu(null)}>
          {isF ? <>
            {B('開く',()=>{setTextMenu(null);openTextFolder(it.id);})}
            {B('名前を変更',()=>{setTextMenu(null);setTextDlg({type:'renameFolder',id:it.id,name:it.name});})}
            {B('別のフォルダへ移動',()=>{setTextMenu(null);setTextDlg({type:'move',kind:'folder',id:it.id});})}
            {B('フォルダを削除（中身は親へ移動）',()=>doDeleteFolder(it),'btn-danger')}
          </> : <>
            {B('開く',()=>{setTextMenu(null);openDraft(it.id);})}
            {B('名前・メモ・版を編集',()=>openRenameDraft(it))}
            {B('フォルダへ移動',()=>{setTextMenu(null);setTextDlg({type:'move',kind:'text',id:it.id});})}
            {B('複製',()=>duplicateDraft(it))}
            {B('ゴミ箱へ移動',()=>softDeleteDraft(it),'btn-danger')}
          </>}
          <div className="modal-actions"><button className="btn" onClick={()=>setTextMenu(null)}>閉じる</button></div>
        </Modal>;
      })()}
      {textDlg&&textDlg.type==='newFolder'&&<Modal title="フォルダを作る" onClose={()=>setTextDlg(null)}>
        <div className="field-row"><label>フォルダ名{textDlg.parentId?`（${textFolderLabel(textDlg.parentId)} の中）`:''}</label><input value={textDlg.name} onChange={e=>setTextDlg(d=>({...d,name:e.target.value}))} autoFocus/></div>
        <div className="modal-actions"><button className="btn" onClick={()=>setTextDlg(null)}>キャンセル</button><button className="btn btn-primary" onClick={doCreateFolder}>作る</button></div>
      </Modal>}
      {textDlg&&textDlg.type==='renameFolder'&&<Modal title="フォルダ名の変更" onClose={()=>setTextDlg(null)}>
        <div className="field-row"><label>フォルダ名</label><input value={textDlg.name} onChange={e=>setTextDlg(d=>({...d,name:e.target.value}))} autoFocus/></div>
        <div className="modal-actions"><button className="btn" onClick={()=>setTextDlg(null)}>キャンセル</button><button className="btn btn-primary" onClick={doRenameFolder}>保存</button></div>
      </Modal>}
      {textDlg&&textDlg.type==='editText'&&<Modal title="文章の名前・メモ・版" onClose={()=>setTextDlg(null)}>
        <div className="field-row"><label>見出し</label><input value={textDlg.title} onChange={e=>setTextDlg(d=>({...d,title:e.target.value}))} autoFocus/></div>
        <div className="field-row"><label>版</label><input value={textDlg.version} onChange={e=>setTextDlg(d=>({...d,version:e.target.value}))}/></div>
        <div className="field-row"><label>メモ</label><textarea rows="3" value={textDlg.memo} onChange={e=>setTextDlg(d=>({...d,memo:e.target.value}))}/></div>
        <div className="modal-actions"><button className="btn" onClick={()=>setTextDlg(null)}>キャンセル</button><button className="btn btn-primary" onClick={saveTextDlgEdit}>保存</button></div>
      </Modal>}
      {textDlg&&textDlg.type==='move'&&(()=>{
        const isF=textDlg.kind==='folder';
        const cur=isF?(textFolderOf(textDlg.id)||{}).parentId||null:((data.drafts||[]).find(t=>t.id===textDlg.id)||{}).folderId||null;
        const dest=[{id:null,label:'（フォルダ外）'}].concat((data.textFolders||[]).map(f=>({id:f.id,label:textFolderLabel(f.id)})).sort((a,b)=>a.label.localeCompare(b.label,'ja')));
        return <Modal title="移動先のフォルダを選ぶ" onClose={()=>setTextDlg(null)}>
          <div className="text-move-list">
            {dest.map(x=>{
              const bad=isF&&!canMoveTextFolder(data.textFolders,textDlg.id,x.id);
              const same=(x.id||null)===cur;
              return <button key={x.id||'root'} type="button" className="btn text-move-item" disabled={bad||same} onClick={()=>doMoveTo(x.id)}>{x.label}{same?'（今ここ）':''}{bad?'（移動できません）':''}</button>;
            })}
          </div>
          <div className="modal-actions"><button className="btn" onClick={()=>setTextDlg(null)}>キャンセル</button></div>
        </Modal>;
      })()}
      {draftHistoryOpen&&activeDraft&&<Modal title={`「${activeDraft.title}」の履歴`} onClose={()=>setDraftHistoryOpen(false)} wide>
        <p className="adult-tab-desc">自動保存とは別に、直前の版を最大5世代まで保存しています。選ぶと今の内容と置き換わります（今の内容も履歴に残ります）。</p>
        {!activeDraft.history.length && <div className="empty-hint">まだ履歴はありません。編集を続けると自動的に記録されます。</div>}
        {activeDraft.history.map((h,i)=>(
          <div className="writing-block-card" key={i}>
            <div><strong>{new Date(h.savedAt).toLocaleString('ja-JP')}</strong><p>{h.body.slice(0,100)||'（本文なし）'}</p><small>{h.body.length}文字</small></div>
            <div className="writing-block-actions"><button className="btn btn-sm btn-primary" onClick={()=>restoreDraftHistory(h)}>この版に戻す</button></div>
          </div>
        ))}
        <div className="modal-actions"><button className="btn" onClick={()=>setDraftHistoryOpen(false)}>閉じる</button></div>
      </Modal>}
      {draftToast && <div className="writing-toast"><span>{draftToast}</span>{draftToastAction && <button type="button" className="writing-toast-btn" onClick={()=>{ draftToastAction.fn(); setDraftToast(''); setDraftToastAction(null); }}>{draftToastAction.label}</button>}</div>}
      {copyDlgBlock}
      {exprDictBlock}
      {flowBlock}
      {dictEditorBlock}
      {exprDictEditorBlock}
      {specialDictEditorBlock}
      {mediaDictEditorBlock}
      {writingMoreBlock}
    </div>
  );
}

