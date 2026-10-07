/* ============ アプリ本体 ============ */
function App(){
  const [data, setData] = useState(loadData);
  const [screen, setScreen] = useState('dashboard');
  const [detailId, setDetailId] = useState(null);
  const [heightCompareOpen, setHeightCompareOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [saveState, setSaveState] = useState('saved');
  const dataRef = useRef(data); dataRef.current = data; // 最新のデータ（閉じる・戻る時に今の状態を端末内へ保存するために使う）
  const [writer, setWriter] = useState(null); // プロットの執筆モーダル：{ eventId, draftId, origin:'plot'|'reader', viewState, sel }
  const writerBackRef = useRef(null); // 執筆モーダルが「一つ上へ戻る」処理を登録する場所
  const plotReturnRef = useRef(null); // キャラ資料へ出ている間の戻り先：{ charId, viewState, writer }
  const plotRestoreRef = useRef(null); // プロットへ戻った時に、元の位置・状態を復元するための一時データ
  const pendingDetailRef = useRef(null); // 画面切り替えと同時に開く詳細ID（画面切り替え時の詳細リセットより優先する）
  const [lastImportBackup, setLastImportBackup] = useState(null); // 直前のAI一括取り込みを元に戻すための一時スナップショット（画像は含まない）
  const [writingFocusMode, setWritingFocusMode] = useState(false); // 本文の集中執筆モード（画面遷移時にリセット）
  const [writingSnippets, setWritingSnippets] = useState(loadWritingSnippets); // 表現パレット辞書（小説データ本体とは別保存）
  const [expressionDictionary, setExpressionDictionary] = useState(loadExpressionDictionary); // 表現辞典（小説データ本体・表現パレットとは別保存）
  const [specialDictionary, setSpecialDictionary] = useState(loadSpecialDictionary); // 小説語彙辞典（表現辞典ともデータ完全分離・別保存）
  const [lastSpecialImportIds, setLastSpecialImportIds] = useState(null); // 直前の小説語彙JSON一括登録で新規追加したentryのidだけを記録（辞典全体のスナップショットではない＝後続の手動編集・追加・削除を巻き戻さない）
  const [mediaDictionary, setMediaDictionary] = useState(loadMediaDictionary); // 令和メディア語辞典（小説語彙辞典・表現辞典・本文データいずれとも別保存）
  const [lastMediaImportIds, setLastMediaImportIds] = useState(null); // 直前のメディア語JSON一括登録で新規追加したentryのidだけを記録
  const [adultDictionary, setAdultDictionary] = useState(loadAdultDictionary); // 成人向け創作ツール専用の表現辞典（他の辞典・本文データとも完全分離）
  const [adultPhraseRemix, setAdultPhraseRemix] = useState(loadAdultPhraseRemix); // 語句魔改造の部品辞書・構文・保存語句（Adult表現辞典とは別保存）
  const [adultOnomatopoeia, setAdultOnomatopoeia] = useState(loadAdultOnomatopoeia); // 現象・音・擬態・発声を複数タグで扱う独立辞書
  const [adultSceneFlow, setAdultSceneFlow] = useState(loadAdultSceneFlow); // 段階別の描写材料と今回の流れ（各辞書とは別保存）
  const [generalScenes, setGeneralScenes] = useState(loadGeneralScenes); // 汎用シーン案（成人向けシーン進行とは別保存）
  const [storyOutlines, setStoryOutlines] = useState(loadStoryOutlines); // 作品→構成ブロック→出来事の全体構成
  const [storyPatterns, setStoryPatterns] = useState(loadStoryPatterns); // 再利用可能な物語構造リファレンス
  const [moreMenuOpen, setMoreMenuOpen] = useState(false); // スマホ下部ナビ「総合」ボトムシート
  const [writingLocInit] = useState(loadWritingLocation); // 執筆画面で最後に開いていた場所（端末内UI設定）
  const [writingTab, setWritingTab] = useState(writingLocInit.tab); // Writing画面のタブ：'draft'（下書き）|'chapters'（本文）|'shelf'（保管棚）|'map'（シーンの地図）
  const [writingOpenId, setWritingOpenId] = useState(writingLocInit.chapterId); // 本文で開いている章（執筆を一度閉じても保持）
  const [writingBlockId, setWritingBlockId] = useState(writingLocInit.blockId); // 本文で選んでいる場面
  const writingBackRef = useRef(null); // Writing画面が「画面内で一つ上へ戻る」処理を登録する場所（戻る操作用）
  const navOriginRef = useRef(null); // 別画面から開いた画面の戻り先（例：下書きの辞典ドロワー→成人向け創作→戻る＝執筆）
  useEffect(()=>{
    try{ localStorage.setItem(WRITING_LOCATION_KEY, JSON.stringify({ tab:writingTab, chapterId:writingOpenId, blockId:writingBlockId })); }catch(e){}
  }, [writingTab, writingOpenId, writingBlockId]);
  const [sceneToolsSignal, setSceneToolsSignal] = useState(0); // 「シーンの地図」→「１話の構成を開く」の合図
  const openSceneTools = () => { navOriginRef.current = screen==='writing' ? {screen:'storyTools', from:'writing'} : null; setScreen('storyTools'); setDetailId(null); setQuery(''); setSceneToolsSignal(s=>s+1); };
  const [adultToolsOpenRequest, setAdultToolsOpenRequest] = useState({tab:null, nonce:0}); // 下書きの辞典ドロワー→「成人向け創作」の該当タブへ
  const openAdultTools = (tab) => { navOriginRef.current = screen==='writing' ? {screen:'adultTools', from:'writing'} : null; setScreen('adultTools'); setDetailId(null); setQuery(''); setAdultToolsOpenRequest({tab, nonce: Date.now()}); };
  const openSceneFlowScreen = () => { navOriginRef.current = screen==='writing' ? {screen:'sceneFlow', from:'writing'} : null; setScreen('sceneFlow'); setDetailId(null); setQuery(''); };

  // 旧・成人向けシーン進行（adultSceneFlow.plans、別ストア）から、共通シーン進行（data.sceneFlowPlans）への取り込み。
  // 起動時だけでなく、バックアップ読込・クラウド同期などで旧プランが入れ替わった時にも実行する（mergeLegacyScenePlansは何度呼んでも安全）。
  // 元のadultSceneFlow.plansは削除しない（既存データ保護）。
  useEffect(()=>{
    const legacyPlans = (adultSceneFlow&&adultSceneFlow.plans)||[];
    setData(d=>mergeLegacyScenePlans(d, legacyPlans));
  },[adultSceneFlow, data.sceneFlowPlansMigratedFromAdult, data.sceneFlowLegacyMigratedIds]);

  // 「下書きへ挿入」を、開いている下書きの外（成人向け創作画面・シーン進行の独立画面など）から押したときの経路。
  // 現在開いている下書きが分からない（＝どの下書きが「開かれている」か画面上で判別できない）ため、
  // 既存の下書きを勝手に選んで上書きすることはせず、必ず「新規下書きを作る」か「挿入先を選ぶ」を挟む。
  // カーソル位置も分からないため、仕様どおり本文の末尾へ追記する。挿入前には必ず直前の内容を履歴へ退避する。
  const [sceneFlowInsertTarget, setSceneFlowInsertTarget] = useState(null); // 挿入先選択モーダルの対象プラン
  const appendPlanToDraft = (plan, draftId) => {
    const text = formatSceneFlowPlanForInsert(plan);
    setData(d=>{
      let drafts = d.drafts||[];
      let target = draftId ? drafts.find(x=>x.id===draftId && !x.deleted) : null;
      if(!target){
        const entry = makeDraftEntry(`「${plan.title}」より`, '', null, null);
        drafts = [...drafts, entry];
        target = entry;
      }
      const needSnapshot = !(target.history[0] && target.history[0].body===target.body);
      const historyEntry = { body: target.body, savedAt: new Date().toISOString() };
      const newBody = target.body ? (target.body + (/\n\n$/.test(target.body)?'':(target.body.endsWith('\n')?'\n':'\n\n')) + text) : text;
      drafts = drafts.map(x=>x.id===target.id ? {
        ...x, body:newBody, updatedAt:new Date().toISOString(),
        history: needSnapshot ? [historyEntry, ...x.history].slice(0,5) : x.history,
      } : x);
      return {...d, drafts, activeDraftId: target.id};
    });
    setScreen('writing'); setWritingTab('draft'); setDetailId(null); setQuery('');
    setSceneFlowInsertTarget(null);
  };
  const requestInsertPlanToDraft = (plan) => { setSceneFlowInsertTarget(plan); };
  const [syncOpen,setSyncOpen]=useState(false);
  const [syncConfig,setSyncConfig]=useState(loadCloudSyncConfig);
  const [syncState,setSyncState]=useState({phase:'idle',message:'同期キーを設定すると端末間で共有できます。'});
  const syncReadyRef=useRef(false);
  const applyingRemoteRef=useRef(false);
  const lastCloudSnapshotRef=useRef('');
  const fileInputRef = useRef();

  const makeCloudSnapshot=useCallback(()=>({
    schemaVersion:1, data:serializableData(data), writingSnippets, expressionDictionary, specialDictionary, mediaDictionary,
    adultDictionary, adultPhraseRemix, adultOnomatopoeia, adultSceneFlow, generalScenes, storyOutlines, storyPatterns
  }),[data,writingSnippets,expressionDictionary,specialDictionary,mediaDictionary,adultDictionary,adultPhraseRemix,adultOnomatopoeia,adultSceneFlow,generalScenes,storyOutlines,storyPatterns]);

  const applyCloudSnapshot=useCallback((payload)=>{
    if(!payload||!payload.data) throw new Error('クラウドデータの形式が不正です');
    const plotErr=plotV2PayloadError(payload.data);
    if(plotErr) throw new Error('クラウドの新プロットのデータを読み込めないため、この端末のデータは変更していません。'+plotErr);
    applyingRemoteRef.current=true;
    setData(migrateData(payload.data)); // 旧シーン進行の取り込みは、adultSceneFlowの更新を受けた下のuseEffectが行う
    if(payload.writingSnippets) setWritingSnippets(normalizeWritingSnippets(payload.writingSnippets));
    if(payload.expressionDictionary) setExpressionDictionary(normalizeExpressionDictionary(payload.expressionDictionary));
    if(payload.specialDictionary) setSpecialDictionary(normalizeSpecialDictionary(payload.specialDictionary));
    if(payload.mediaDictionary) setMediaDictionary(normalizeMediaDictionary(payload.mediaDictionary));
    if(payload.adultDictionary) setAdultDictionary(normalizeAdultDictionary(payload.adultDictionary));
    if(payload.adultPhraseRemix) setAdultPhraseRemix(normalizeAdultPhraseRemix(payload.adultPhraseRemix));
    if(payload.adultOnomatopoeia) setAdultOnomatopoeia(normalizeAdultOnomatopoeia(payload.adultOnomatopoeia));
    if(payload.adultSceneFlow) setAdultSceneFlow(normalizeAdultSceneFlow(payload.adultSceneFlow));
    if(payload.generalScenes) setGeneralScenes(normalizeGeneralScenes(payload.generalScenes));
    if(payload.storyOutlines) setStoryOutlines(normalizeStoryOutlines(payload.storyOutlines));
    if(payload.storyPatterns) setStoryPatterns(normalizeStoryPatterns(payload.storyPatterns));
    lastCloudSnapshotRef.current=JSON.stringify(payload);
    setTimeout(()=>{applyingRemoteRef.current=false;},800);
  },[]);

  const syncRequest=useCallback(async(method,key,body)=>{
    const res=await fetch(CLOUD_SYNC_API,{method,headers:{'Content-Type':'application/json','X-Sync-Key':key},body:body?JSON.stringify(body):undefined});
    let result={}; try{result=await res.json();}catch(e){}
    if(!res.ok){const err=new Error(result.error||`通信に失敗しました (${res.status})`);err.status=res.status;err.result=result;throw err;}
    return result;
  },[]);

  const connectCloud=useCallback(async(key)=>{
    setSyncState({phase:'checking',message:''});
    try{
      const remote=await syncRequest('GET',key);
      const next={...syncConfig,enabled:true,key,revision:Number(syncConfig.revision||0)};
      setSyncConfig(next);saveCloudSyncConfig(next);
      if(!remote.exists||Number(remote.revision||0)===next.revision){
        syncReadyRef.current=true;
        setSyncState({phase:'ready',message:remote.exists?'クラウドと更新番号が一致しています。':'クラウドは空です。現在の内容を保存できます。'});
      }else{
        syncReadyRef.current=false;
        setSyncState({phase:'conflict',message:`この端末は更新 ${next.revision}、クラウドは更新 ${remote.revision} です。「クラウドから読み込む」で最新内容を取得してください。`});
      }
    }catch(err){syncReadyRef.current=false;setSyncState({phase:'error',message:err.message});}
  },[syncConfig,syncRequest]);

  const pullCloud=useCallback(async()=>{
    if(!syncConfig.key)return;
    if(!confirm('この端末の本文・設定・辞典・新プロットを、クラウドの内容で置き換えます。クラウドに新プロットが無い場合、この端末の新プロットは空になります。画像は変更しません。よろしいですか？'))return;
    setSyncState({phase:'pulling',message:''});
    try{
      const remote=await syncRequest('GET',syncConfig.key);
      if(!remote.exists||!remote.payload)throw new Error('クラウドに保存データがありません');
      applyCloudSnapshot(remote.payload);
      const next={...syncConfig,enabled:true,revision:Number(remote.revision),lastSyncedAt:remote.updatedAt||new Date().toISOString()};
      setSyncConfig(next);saveCloudSyncConfig(next);syncReadyRef.current=true;
      setSyncState({phase:'ready',message:`クラウドの更新 ${remote.revision} を読み込みました。`});
    }catch(err){syncReadyRef.current=false;setSyncState({phase:'error',message:err.message});}
  },[syncConfig,syncRequest,applyCloudSnapshot]);

  const pushCloud=useCallback(async(silent=false)=>{
    if(!syncConfig.enabled||!syncConfig.key||(!syncReadyRef.current&&!silent))return;
    if(data.plotV2Error){setSyncState({phase:'error',message:'新プロットのデータが読み込めない状態のため、クラウドへの保存を止めています（破損状態を確定させないためです）。'});return;}
    const payload=makeCloudSnapshot();const serialized=JSON.stringify(payload);
    if(silent&&serialized===lastCloudSnapshotRef.current)return;
    if(!silent)setSyncState({phase:'pushing',message:''});
    try{
      const result=await syncRequest('PUT',syncConfig.key,{expectedRevision:Number(syncConfig.revision||0),payload});
      const next={...syncConfig,revision:Number(result.revision),lastSyncedAt:result.updatedAt||new Date().toISOString()};
      setSyncConfig(next);saveCloudSyncConfig(next);lastCloudSnapshotRef.current=serialized;syncReadyRef.current=true;
      setSyncState({phase:'ready',message:`更新 ${result.revision} をクラウドへ保存しました。`});
    }catch(err){
      if(err.status===409){syncReadyRef.current=false;setSyncState({phase:'conflict',message:`別の端末で更新されています（クラウド更新 ${err.result&&err.result.revision}）。クラウドから読み込んでください。`});}
      else setSyncState({phase:'error',message:err.message});
    }
  },[syncConfig,makeCloudSnapshot,syncRequest,data.plotV2Error]);

  // 今すぐ端末内へ保存する（執筆モーダルを閉じる前・キャラ資料へ移る前・保存失敗後の再試行）。成功したらtrue。
  const saveNow = () => {
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableData(dataRef.current))); setSaveState('saved'); return true; }
    catch(e){ console.error(e); setSaveState('error'); return false; }
  };

  // 保存
  useEffect(()=>{
    setSaveState('saving');
    const t = setTimeout(()=>{
      try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableData(data))); setSaveState('saved'); }
      catch(e){ console.error(e); setSaveState('error'); }
    }, 400);
    return ()=>clearTimeout(t);
  }, [data]);

  // 表現パレット辞書の保存（本文データとは別のUI設定として保存）
  useEffect(()=>{ saveWritingSnippets(writingSnippets); }, [writingSnippets]);

  // 表現辞典の保存（表現パレットとも本文データとも別に保存）
  useEffect(()=>{ saveExpressionDictionary(expressionDictionary); }, [expressionDictionary]);

  // 小説語彙辞典の保存（表現辞典・表現パレット・本文データいずれとも別に保存）
  useEffect(()=>{ saveSpecialDictionary(specialDictionary); }, [specialDictionary]);

  // 令和メディア語辞典の保存（他のどの辞典・本文データとも別に保存）
  useEffect(()=>{ saveMediaDictionary(mediaDictionary); }, [mediaDictionary]);

  // 成人向け創作ツール辞典の保存（他のどの辞典・本文データとも別に保存）
  useEffect(()=>{ saveAdultDictionary(adultDictionary); }, [adultDictionary]);

  // 語句魔改造データの保存（Adult表現辞典とは別保存）
  useEffect(()=>{ saveAdultPhraseRemix(adultPhraseRemix); }, [adultPhraseRemix]);

  // オノマトペ辞書の保存（他の成人向け辞書とは別保存）
  useEffect(()=>{ saveAdultOnomatopoeia(adultOnomatopoeia); }, [adultOnomatopoeia]);

  // シーン進行の保存（各辞書とは別保存）
  useEffect(()=>{ saveAdultSceneFlow(adultSceneFlow); }, [adultSceneFlow]);

  useEffect(()=>{ saveGeneralScenes(generalScenes); }, [generalScenes]);
  useEffect(()=>{ saveStoryOutlines(storyOutlines); }, [storyOutlines]);
  useEffect(()=>{ saveStoryPatterns(storyPatterns); }, [storyPatterns]);

  // 起動時は更新番号だけ照合する。別端末の内容を無断で上書きせず、差があれば利用者の確認を待つ。
  useEffect(()=>{
    const cfg=loadCloudSyncConfig();
    if(!cfg.enabled||!cfg.key)return;
    setSyncState({phase:'checking',message:''});
    syncRequest('GET',cfg.key).then(remote=>{
      if(!remote.exists||Number(remote.revision||0)===Number(cfg.revision||0)){
        syncReadyRef.current=true;
        setSyncState({phase:'ready',message:remote.exists?'クラウドと更新番号が一致しています。':'クラウドは空です。現在の内容を保存できます。'});
      }else{
        syncReadyRef.current=false;
        setSyncState({phase:'conflict',message:`この端末は更新 ${cfg.revision||0}、クラウドは更新 ${remote.revision} です。クラウドから読み込んでください。`});
      }
    }).catch(err=>setSyncState({phase:'error',message:err.message}));
  },[]);

  // 接続確認後の変更をまとめて送る。端末内保存は従来どおり先に行われる。
  useEffect(()=>{
    if(!syncConfig.enabled||!syncConfig.key||!syncReadyRef.current||applyingRemoteRef.current)return;
    const t=setTimeout(()=>pushCloud(true),1800);
    return()=>clearTimeout(t);
  },[makeCloudSnapshot,syncConfig.enabled,syncConfig.key,syncConfig.revision]);

  const updateItem = (coll, id, patch) => {
    setData(d => ({...d, [coll]: d[coll].map(it => it.id===id ? {...it, ...patch} : it)}));
  };
  const deleteItem = (coll, id) => {
    setData(d => ({...d, [coll]: d[coll].filter(it => it.id!==id)}));
  };
  // 組織削除時、所属・関係の参照が残らないよう関連データも同時に掃除する。
  const deleteOrganization = (orgId) => {
    setData(d => ({
      ...d,
      organizations: d.organizations.filter(o => o.id!==orgId),
      characters: d.characters.map(c => (c.affiliationOrgIds||[]).includes(orgId)
        ? { ...c, affiliationOrgIds: c.affiliationOrgIds.filter(oid=>oid!==orgId) } : c),
      entityRelations: (d.entityRelations||[]).filter(r => r.fromId!==orgId && r.toId!==orgId),
      locations: d.locations.map(l => {
        const patch = {};
        if(l.controllingOrgId===orgId) patch.controllingOrgId = null;
        if((l.relatedOrgIds||[]).includes(orgId)) patch.relatedOrgIds = l.relatedOrgIds.filter(oid=>oid!==orgId);
        return Object.keys(patch).length ? { ...l, ...patch } : l;
      }),
      timeline: (d.timeline||[]).map(t => (t.orgIds||[]).includes(orgId)
        ? { ...t, orgIds: t.orgIds.filter(oid=>oid!==orgId) } : t),
      ideas: (d.ideas||[]).map(i => (i.orgIds||[]).includes(orgId)
        ? { ...i, orgIds: i.orgIds.filter(oid=>oid!==orgId) } : i),
    }));
  };
  const createItem = (coll, base) => {
    const item = { id: uid(coll.slice(0,3)), ...base };
    setData(d => ({...d, [coll]: [...d[coll], item]}));
    return item.id;
  };

  // エンティティ間の関係レコード（まずは組織/勢力/家系同士）
  const addRelation = (rel) => setData(d=>({...d, entityRelations:[...(d.entityRelations||[]), { id: uid('rel'), ...rel }]}));
  const updateRelation = (relId, patch) => setData(d=>({...d, entityRelations:(d.entityRelations||[]).map(r=>r.id===relId?{...r,...patch}:r)}));
  const deleteRelation = (relId) => setData(d=>({...d, entityRelations:(d.entityRelations||[]).filter(r=>r.id!==relId)}));

  // ---- プロットの執筆モーダル／キャラ資料への行き来 ----
  const openWriter = (req) => { setWriter(req); };
  const closeWriter = () => { setWriter(null); };
  // キャラ資料を開く（プロットまたは執筆モーダルから）。開く前に最新の内容を端末内へ反映し、戻り先を覚えておく。
  const openCharFromPlot = (charId, viewState, writerState) => {
    saveNow();
    plotReturnRef.current = { charId, viewState:viewState||null, writer:writerState||null };
    setWriter(null);
    navOriginRef.current = null;
    pendingDetailRef.current = charId;
    setScreen('characters'); setDetailId(charId); setQuery('');
  };
  // キャラ資料から戻る：元のプロット（開閉状態・スクロール位置）へ。執筆モーダルから開いた場合は、その下書きのモーダルへ戻る。
  const returnToPlot = () => {
    const r = plotReturnRef.current; plotReturnRef.current = null;
    if(!r) return false;
    plotRestoreRef.current = r.viewState || null;
    setScreen('plot'); setDetailId(null);
    if(r.writer) setWriter(r.writer);
    return true;
  };
  const isCharFromPlot = () => !!(plotReturnRef.current && screen==='characters' && detailId && plotReturnRef.current.charId===detailId);

  const navigateTo = (target, id) => {
    plotReturnRef.current = null;
    navOriginRef.current = null;
    setScreen(target);
    setDetailId(id || null);
    setQuery('');
  };

  // ---- 戻る操作：必ず「一つ上の階層」へ戻る ----
  // 順に：開いているシート／ダイアログ → 検索 → 詳細 → 執筆画面内の階層（集中モード→下書き編集→一覧、章→一覧 など） → 親画面（設定の中身→設定、各画面→ホーム）。
  // 戻れる所が無い（ホーム）ときだけ false を返し、端末／ブラウザ本来の戻る（アプリを閉じる）に任せる。
  const goUp = () => {
    if(writer){ if(writerBackRef.current && writerBackRef.current()) return true; setWriter(null); return true; }
    if(isCharFromPlot()){ returnToPlot(); return true; }
    if(moreMenuOpen){ setMoreMenuOpen(false); return true; }
    if(syncOpen){ setSyncOpen(false); return true; }
    if(sceneFlowInsertTarget){ setSceneFlowInsertTarget(null); return true; }
    if(query.trim()){ setQuery(''); return true; }
    if(heightCompareOpen){ setHeightCompareOpen(false); return true; }
    if(screen==='writing'){
      if(writingBackRef.current && writingBackRef.current()) return true;
    } else if(detailId){ setDetailId(null); return true; }
    const o = navOriginRef.current;
    if(o && o.screen===screen){ navOriginRef.current = null; setScreen(o.from); setDetailId(null); return true; }
    const parent = SCREEN_PARENT[screen];
    if(parent){ setScreen(parent); setDetailId(null); return true; }
    return false;
  };
  const goUpRef = useRef(goUp);
  goUpRef.current = goUp;
  // 端末／ブラウザの戻るボタンを、上記の「一つ上へ」に割り当てる。履歴に番兵を1つ積み、戻るで消費されるたびに積み直す。
  useEffect(()=>{
    try{ window.history.pushState({nwbGuard:true}, ''); }catch(e){ return; }
    const onPop = () => {
      const handled = goUpRef.current();
      if(handled){ try{ window.history.pushState({nwbGuard:true}, ''); }catch(e){} }
    };
    window.addEventListener('popstate', onPop);
    return ()=>window.removeEventListener('popstate', onPop);
  }, []);

  const handleExport = async () => {
    const images = await imageStorage.getAll();
    const payload = { exportedAt: new Date().toISOString(), data:serializableData(data), images, writingSnippets, expressionDictionary, specialDictionary, mediaDictionary, adultDictionary, adultPhraseRemix, adultOnomatopoeia, adultSceneFlow, generalScenes, storyOutlines, storyPatterns };
    const blob = new Blob([JSON.stringify(payload)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle = (data.project.title || 'novel-world').replace(/[\\/:*?"<>|]/g,'_');
    a.href = url; a.download = `${safeTitle}_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    try{
      const text = await file.text();
      const payload = JSON.parse(text);
      if(!payload.data) throw new Error('形式が不正です');
      const plotErr = plotV2PayloadError(payload.data);
      if(plotErr){ alert('読み込みを中止しました。このバックアップの新プロットのデータが読み込めない形式です。現在のデータは変更していません。\n\n'+plotErr); e.target.value=''; return; }
      const hasPlotV2 = payload.data.plotV2!==undefined && payload.data.plotV2!==null;
      if(!confirm('現在のデータを、読み込んだバックアップで上書きします。新プロットも上書きの対象です。'+(hasPlotV2?'':'\n（このバックアップには新プロットが含まれていないため、新プロットは空になります。）')+'\nよろしいですか？')) { e.target.value=''; return; }
      if(payload.images){
        for(const [id, url] of Object.entries(payload.images)){ await imageStorage.save(id, url); }
      }
      setData(migrateData(payload.data));
      // writingSnippets は新形式バックアップのみに含まれる。無い場合（旧バックアップ）は現在の辞書をそのまま維持する。
      if(payload.writingSnippets && Array.isArray(payload.writingSnippets.categories) && Array.isArray(payload.writingSnippets.snippets)){
        setWritingSnippets(normalizeWritingSnippets(payload.writingSnippets));
      }
      // expressionDictionary は新形式バックアップのみに含まれる。無い場合（旧バックアップ）は現在の辞典をそのまま維持する。
      if(payload.expressionDictionary && Array.isArray(payload.expressionDictionary.entries)){
        setExpressionDictionary(normalizeExpressionDictionary(payload.expressionDictionary));
      }
      // specialDictionary（小説語彙辞典）も同様に新形式バックアップのみに含まれる。無い場合（旧バックアップ）は現在の辞典をそのまま維持する。
      if(payload.specialDictionary && Array.isArray(payload.specialDictionary.entries)){
        setSpecialDictionary(normalizeSpecialDictionary(payload.specialDictionary));
      }
      // mediaDictionary（令和メディア語辞典）も同様に新形式バックアップのみに含まれる。無い場合（旧バックアップ）は現在の辞典をそのまま維持する。
      if(payload.mediaDictionary && Array.isArray(payload.mediaDictionary.entries)){
        setMediaDictionary(normalizeMediaDictionary(payload.mediaDictionary));
      }
      // adultDictionary（成人向け創作ツール辞典）も同様に新形式バックアップのみに含まれる。無い場合（旧バックアップ）は現在の辞典をそのまま維持する。
      if(payload.adultDictionary && Array.isArray(payload.adultDictionary.entries)){
        setAdultDictionary(normalizeAdultDictionary(payload.adultDictionary));
      }
      // adultPhraseRemix（語句魔改造）も新形式バックアップのみに含まれる。無い旧バックアップでは現在データを維持する。
      if(payload.adultPhraseRemix && Array.isArray(payload.adultPhraseRemix.parts)){
        setAdultPhraseRemix(normalizeAdultPhraseRemix(payload.adultPhraseRemix));
      }
      // adultOnomatopoeia（オノマトペ辞書）も新形式バックアップのみに含まれる。無い旧バックアップでは現在データを維持する。
      if(payload.adultOnomatopoeia && Array.isArray(payload.adultOnomatopoeia.entries)){
        setAdultOnomatopoeia(normalizeAdultOnomatopoeia(payload.adultOnomatopoeia));
      }
      // adultSceneFlow（シーン進行）も新形式バックアップのみに含まれる。無い旧バックアップでは現在データを維持する。
      if(payload.adultSceneFlow && Array.isArray(payload.adultSceneFlow.items)){
        setAdultSceneFlow(normalizeAdultSceneFlow(payload.adultSceneFlow));
      }
      if(payload.generalScenes && Array.isArray(payload.generalScenes.scenes)){
        setGeneralScenes(normalizeGeneralScenes(payload.generalScenes));
      }
      // storyOutlines（全体構成）を含まない旧バックアップでは、現在の構成データを維持する。
      if(payload.storyOutlines && Array.isArray(payload.storyOutlines.projects)){
        setStoryOutlines(normalizeStoryOutlines(payload.storyOutlines));
      }
      if(payload.storyPatterns && Array.isArray(payload.storyPatterns.patterns)){
        setStoryPatterns(normalizeStoryPatterns(payload.storyPatterns));
      }
      alert('読み込みが完了しました。');
    }catch(err){
      console.error(err);
      alert('読み込みに失敗しました。ファイル形式を確認してください。');
    }
    e.target.value = '';
  };

  const allChars = data.characters, allOrgs = data.organizations, allLocations = data.locations, allTimeline = data.timeline;

  let body;
  if(query.trim()){
    body = <SearchResults data={data} query={query} navigateTo={navigateTo} />;
  } else if(screen==='dashboard'){
    body = <Dashboard data={data} setScreen={setScreen} />;
  } else if(screen==='characters'){
    body = heightCompareOpen ? (
      <HeightCompareView data={data} onBack={()=>setHeightCompareOpen(false)} />
    ) : detailId ? (
      <CharacterDetail data={data} id={detailId} updateItem={updateItem} deleteItem={deleteItem} onBack={()=>{ if(isCharFromPlot()) returnToPlot(); else setDetailId(null); }} backLabel={isCharFromPlot() ? 'プロットへ戻る' : null} allOrgs={allOrgs} allLocations={allLocations} allTimeline={allTimeline} />
    ) : (
      <CharacterListView data={data} setData={setData}
        onOpen={setDetailId}
        onOpenHeightCompare={()=>setHeightCompareOpen(true)}
        onCreate={()=>{ const id = createItem('characters', { name:'新しいキャラクター', realName:'', calledNames:[], kana:'', image:null, iconImageId:null, affiliationOrgIds:[], category:'', groupId:null, tags:[], age:'', summary:'', appearance:'', personality:'', values:'', goal:'', memo:'', customFields:[], images:[], relatedLocationIds:[], changes:[],
          history:'',
          heightCm:null, weightKg:null, bust:'', waist:'', hip:'', bodyType:'',
          hairColor:'', hairLength:'', hairStyle:'', eyeColor:'', skinColor:'', outfit:'', appearanceFeatures:'',
          personalityScale:{}, preferenceScale:{}, beliefScale:{},
          likesText:'', dislikesText:'', weaknessText:'', fearText:'', obsessionText:'',
          religionStatus:'', religionDetail:'', believesSupernatural:'', supernaturalDetail:'',
          goalDetail:{}, characterAssessment:null,
        }); setDetailId(id); }} />
    );
  } else if(screen==='organizations'){
    body = detailId ? (
      <OrganizationDetail data={data} id={detailId} updateItem={updateItem} deleteItem={deleteOrganization} onBack={()=>setDetailId(null)} allChars={allChars} allLocations={allLocations} allOrgs={allOrgs} addRelation={addRelation} updateRelation={updateRelation} deleteRelation={deleteRelation} />
    ) : (
      <EntityListView title="組織 / 勢力 / 家系" icon="🏳" items={data.organizations}
        onOpen={setDetailId}
        onCreate={()=>{ const id = createItem('organizations', { name:'新しい組織', image:null, category:'', summary:'', purpose:'', memberIds:[], locationIds:[], memo:'', customFields:[] }); setDetailId(id); }}
        subLabel={o=>o.category} />
    );
  } else if(screen==='locations'){
    body = detailId ? (
      <LocationDetail data={data} id={detailId} updateItem={updateItem} deleteItem={deleteItem} onBack={()=>setDetailId(null)} allChars={allChars} allOrgs={allOrgs} />
    ) : (
      <LocationListView data={data}
        onOpen={setDetailId}
        onCreate={()=>{ const id = createItem('locations', { name:'新しい場所', image:null, category:'', summary:'', controllingOrgId:null, relatedPersonIds:[], relatedOrgIds:[], memo:'', customFields:[], parentLocationId:null, mapId:null, mapX:null, mapY:null }); setDetailId(id); }} />
    );
  } else if(screen==='worldsettings'){
    body = <WorldSettings data={data} setData={setData} />;
  } else if(screen==='timeline'){
    body = <Timeline data={data} setData={setData} allChars={allChars} allOrgs={allOrgs} allLocations={allLocations} />;
  } else if(screen==='ideas'){
    body = <IdeaBox data={data} setData={setData} allChars={allChars} allOrgs={allOrgs} allLocations={allLocations} />;
  } else if(screen==='settingsHub'){
    body = <SettingsHub data={data} navigateTo={navigateTo} />;
  } else if(screen==='plot'){
    body = <PlotV2 data={data} setData={setData} markDirty={()=>setSaveState('saving')} writerOpen={!!writer} onOpenWriter={openWriter}
      onOpenChar={(req)=>openCharFromPlot(req.charId, req.viewState, null)} restoreState={plotRestoreRef.current} onRestored={()=>{ plotRestoreRef.current = null; }} />;
  } else if(screen==='plotOld'){
    body = <Plot data={data} setData={setData} allChars={allChars} allLocations={allLocations} />;
  } else if(screen==='storyTools'){
    body = <StoryToolsScreen data={data} setData={setData} outlineData={storyOutlines} setOutlineData={setStoryOutlines} sceneData={generalScenes} setSceneData={setGeneralScenes} patternData={storyPatterns} setPatternData={setStoryPatterns} openSceneSignal={sceneToolsSignal} />;
  } else if(screen==='writing'){
    body = <Writing data={data} setData={setData} allChars={allChars} allLocations={allLocations} focusMode={writingFocusMode} setFocusMode={setWritingFocusMode} writingSnippets={writingSnippets} setWritingSnippets={setWritingSnippets} expressionDictionary={expressionDictionary} setExpressionDictionary={setExpressionDictionary} specialDictionary={specialDictionary} setSpecialDictionary={setSpecialDictionary} lastSpecialImportIds={lastSpecialImportIds} setLastSpecialImportIds={setLastSpecialImportIds} mediaDictionary={mediaDictionary} setMediaDictionary={setMediaDictionary} lastMediaImportIds={lastMediaImportIds} setLastMediaImportIds={setLastMediaImportIds} adultDictionary={adultDictionary} setAdultDictionary={setAdultDictionary} adultOnomatopoeia={adultOnomatopoeia} setAdultOnomatopoeia={setAdultOnomatopoeia} adultSceneFlow={adultSceneFlow} onOpenAdultTools={openAdultTools} onOpenSceneFlowScreen={openSceneFlowScreen} workspaceTab={writingTab} setWorkspaceTab={setWritingTab} onOpenSceneTools={openSceneTools} openChapterId={detailId} openId={writingOpenId} setOpenId={setWritingOpenId} activeBlockId={writingBlockId} setActiveBlockId={setWritingBlockId} backRef={writingBackRef} />;
  } else if(screen==='aiimport'){
    body = <AiImportScreen data={data} setData={setData} lastImportBackup={lastImportBackup} setLastImportBackup={setLastImportBackup} />;
  } else if(screen==='adultTools'){
    body = <AdultToolsScreen adultDictionary={adultDictionary} setAdultDictionary={setAdultDictionary} adultPhraseRemix={adultPhraseRemix} setAdultPhraseRemix={setAdultPhraseRemix} adultOnomatopoeia={adultOnomatopoeia} setAdultOnomatopoeia={setAdultOnomatopoeia} adultSceneFlow={adultSceneFlow} setAdultSceneFlow={setAdultSceneFlow} openTabRequest={adultToolsOpenRequest} appData={data} setAppData={setData} onInsertToDraft={requestInsertPlanToDraft} />;
  } else if(screen==='sceneFlow'){
    body = <div>
      <div className="toolbar"><h1>🧵 シーン進行</h1></div>
      <p className="adult-tab-desc">全年齢・成人向けの両方で使える共通のシーン進行です。文章の「シーン進行」からも同じ内容を参照・挿入できます。</p>
      <SceneFlowPlansEditor data={data} setData={setData} kindFilter="all" allowKindSwitch adultLibrary={adultSceneFlow} onInsertToDraft={requestInsertPlanToDraft} />
    </div>;
  }

  useEffect(()=>{ const pd = pendingDetailRef.current; pendingDetailRef.current = null; setDetailId(pd||null); setWritingFocusMode(false); setMoreMenuOpen(false); setHeightCompareOpen(false); }, [screen]);

  return (
    <div className="app">
      {!writingFocusMode && (
        <nav className="nav">
          <div className="brand">物語の机<small>小説制作・世界設定管理</small></div>
          {NAV_ITEMS.map(n=>(
            <button key={n.key} className={"nav-btn"+(screen===n.key && !query.trim() ?" active":"")} onClick={()=>navigateTo(n.key)}>
              <span>{n.icon}</span><span>{n.label}</span>
            </button>
          ))}
          <div className="spacer" />
          <button onClick={handleExport}>📤 バックアップ書き出し</button>
          <button onClick={()=>fileInputRef.current.click()}>📥 バックアップ読み込み</button>
          <button onClick={()=>setSyncOpen(true)}>☁️ クラウド同期</button>
          <input ref={fileInputRef} type="file" accept="application/json" style={{display:'none'}} onChange={handleImportFile} />
          <div className="nav-footer">ブラウザ内に自動保存されます</div>
        </nav>
      )}

      <div className="main">
        {!writingFocusMode && (
          <div className="topbar">
            <div className="titlebox">
              <input className="proj-title" value={data.project.title} onChange={e=>setData(d=>({...d, project:{...d.project, title:e.target.value}}))} />
            </div>
            <div className="searchbox">
              <input type="text" placeholder="作品内を検索…" value={query} onChange={e=>setQuery(e.target.value)} />
            </div>
            <span className="save-indicator">{saveState==='saving' ? '保存中…' : saveState==='error' ? '保存に失敗しました' : '保存済み'}</span>
          </div>
        )}
        <div className="content" style={writingFocusMode ? {padding:0, maxWidth:'none', margin:0} : undefined}>
          {!writingFocusMode && screen!=='dashboard' && screen!=='writing' && !detailId && !heightCompareOpen && !query.trim() && SCREEN_PARENT[screen] && (
            <div className="up-bar"><button type="button" className="up-bar-btn" onClick={()=>goUp()}>‹ {SCREEN_PARENT_LABEL[(navOriginRef.current&&navOriginRef.current.screen===screen)?navOriginRef.current.from:SCREEN_PARENT[screen]]||'ホーム'}へ戻る</button></div>
          )}
          {body}
        </div>
      </div>

      {!writingFocusMode && (
        <div className="bottom-tabs">
          {MOBILE_TAB_ITEMS.map(t=>{
            const isMore = t.key==='more';
            const active = !query.trim() && (
              isMore ? (isMoreScreen(screen) || moreMenuOpen) :
              t.key==='settingsHub' ? isSettingsScreen(screen) :
              screen===t.key
            );
            return (
              <button key={t.key} className={(active?"active":"")+(t.primary?" bottom-tab-primary":"")}
                onClick={()=>{
                  if(isMore){ setMoreMenuOpen(o=>!o); return; }
                  setMoreMenuOpen(false);
                  navigateTo(t.key);
                }}>
                <span className="bt-icon">{t.icon}</span><span className="bt-label">{t.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {!writingFocusMode && moreMenuOpen && (
        <div className="more-menu-backdrop" onClick={()=>setMoreMenuOpen(false)}>
          <div className="more-menu-sheet" onClick={e=>e.stopPropagation()}>
            <div className="more-menu-head"><span>その他</span><button type="button" className="btn btn-sm btn-ghost" onClick={()=>setMoreMenuOpen(false)}>×</button></div>
            <div className="more-menu-list">
              {MORE_SCREEN_KEYS.map(key=>{
                const item = NAV_ITEMS.find(n=>n.key===key);
                if(!item) return null;
                return (
                  <button key={key} type="button" className="more-menu-item" onClick={()=>{ setMoreMenuOpen(false); navigateTo(key); }}>
                    <span>{item.icon}</span><span>{item.label}</span>
                  </button>
                );
              })}
              <div className="more-menu-sep" />
              <button type="button" className="more-menu-item" onClick={()=>{ setMoreMenuOpen(false); handleExport(); }}>📤 バックアップ書き出し</button>
              <button type="button" className="more-menu-item" onClick={()=>{ setMoreMenuOpen(false); fileInputRef.current.click(); }}>📥 バックアップ読み込み</button>
              <button type="button" className="more-menu-item" onClick={()=>{ setMoreMenuOpen(false); setSyncOpen(true); }}>☁️ クラウド同期</button>
            </div>
          </div>
        </div>
      )}
      {writer && screen==='plot' && (
        <PlotDraftWriter key={writer.eventId+'|'+writer.draftId} data={data} setData={setData} writer={writer} onClose={closeWriter}
          onOpenChar={(cid, sel)=>openCharFromPlot(cid, writer.viewState, { ...writer, sel })}
          saveState={saveState} onSaveNow={saveNow} backRef={writerBackRef}
          writingSnippets={writingSnippets} setWritingSnippets={setWritingSnippets} expressionDictionary={expressionDictionary} setExpressionDictionary={setExpressionDictionary}
          specialDictionary={specialDictionary} setSpecialDictionary={setSpecialDictionary} lastSpecialImportIds={lastSpecialImportIds} setLastSpecialImportIds={setLastSpecialImportIds}
          mediaDictionary={mediaDictionary} setMediaDictionary={setMediaDictionary} lastMediaImportIds={lastMediaImportIds} setLastMediaImportIds={setLastMediaImportIds}
          adultDictionary={adultDictionary} setAdultDictionary={setAdultDictionary} adultOnomatopoeia={adultOnomatopoeia} setAdultOnomatopoeia={setAdultOnomatopoeia} adultSceneFlow={adultSceneFlow} />
      )}
      {syncOpen&&<CloudSyncModal syncConfig={syncConfig} setSyncConfig={setSyncConfig} syncState={syncState} onConnect={connectCloud} onPull={pullCloud} onPush={()=>pushCloud(false)} onClose={()=>setSyncOpen(false)} />}
      {sceneFlowInsertTarget && (()=>{
        const liveDrafts = (data.drafts||[]).filter(d=>!d.deleted).slice().sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
        return (
          <Modal title="文章へ挿入" onClose={()=>setSceneFlowInsertTarget(null)} wide>
            <p className="adult-tab-desc">「{sceneFlowInsertTarget.title}」をどの文章へ挿入しますか？ 本文の末尾へ追記します。既存の文章を上書きすることはありません。</p>
            <button className="btn btn-primary" onClick={()=>appendPlanToDraft(sceneFlowInsertTarget, null)} style={{marginBottom:10}}>＋ 新規文章を作って挿入</button>
            {liveDrafts.length>0 && <div className="dict-list-head"><span>既存の文章へ追記する</span></div>}
            {liveDrafts.map(d=>(
              <div className="writing-list-row" key={d.id} style={{cursor:'pointer'}} onClick={()=>appendPlanToDraft(sceneFlowInsertTarget, d.id)}>
                <div><strong>{d.title}</strong><small style={{display:'block'}}>{new Date(d.updatedAt).toLocaleString('ja-JP')}・{d.body.length}文字</small></div>
                <span>この文章へ追記 →</span>
              </div>
            ))}
            <div className="modal-actions"><button className="btn" onClick={()=>setSceneFlowInsertTarget(null)}>キャンセル</button></div>
          </Modal>
        );
      })()}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
