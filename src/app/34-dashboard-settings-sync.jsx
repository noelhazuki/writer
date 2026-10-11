/* ============ ダッシュボード ============ */
function Dashboard({ data, setScreen }){
  return (
    <div>
      <h1>{data.project.title || '無題の作品'}</h1>
      <p style={{color:'var(--ink-soft)'}}>執筆しながら、必要な設定だけを育てていくための作業机です。</p>
      <div className="dash-nav-grid">
        {NAV_ITEMS.filter(n=>n.key!=='dashboard').map(n=>{
          let count = null;
          if(n.key==='characters') count = data.characters.length;
          if(n.key==='organizations') count = data.organizations.length;
          if(n.key==='locations') count = data.locations.length;
          if(n.key==='worldsettings') count = data.worldSettings.filter(c=>c.cards.length>0).length;
          if(n.key==='timeline') count = data.timeline.length;
          if(n.key==='ideas') count = data.ideas.length;
          if(n.key==='plot') count = plotV2CountAll(data.plotV2);
          if(n.key==='plotOld') count = data.plot.chapters.length;
          if(n.key==='writing') count = data.writings.length;
          return (
            <button key={n.key} className="dash-nav-item" onClick={()=>setScreen(n.key)}>
              <div className="icon">{n.icon}</div>
              <div className="label">{n.label}</div>
              {count!==null && <div className="count">{count} 件</div>}
            </button>
          );
        })}
      </div>
      <div className="stat-row">
        <div className="stat-box"><div className="n">{data.writings.reduce((s,w)=>s+w.body.length,0)}</div><div className="l">総執筆文字数</div></div>
        <div className="stat-box"><div className="n">{data.ideas.filter(i=>i.status==='未使用').length}</div><div className="l">未使用のネタ</div></div>
        <div className="stat-box"><div className="n">{data.timeline.length}</div><div className="l">年表イベント</div></div>
      </div>
    </div>
  );
}

function SettingsHub({ data, navigateTo }){
  const countOf = (key) => {
    if(key==='characters') return data.characters.length;
    if(key==='organizations') return data.organizations.length;
    if(key==='locations') return data.locations.length;
    if(key==='worldsettings') return data.worldSettings.filter(c=>c.cards.length>0).length;
    if(key==='timeline') return data.timeline.length;
    if(key==='ideas') return data.ideas.length;
    return null;
  };
  return (
    <div>
      <h1>📚 設定</h1>
      <p style={{color:'var(--ink-soft)'}}>人物・組織・場所・世界設定・年表・ネタ箱など、作品の設定資料をまとめた場所です。</p>
      <div className="dash-nav-grid">
        {SETTINGS_SCREEN_KEYS.map(key=>{
          const n = NAV_ITEMS.find(x=>x.key===key); if(!n) return null;
          const count = countOf(key);
          return (
            <button key={key} className="dash-nav-item" onClick={()=>navigateTo(key)}>
              <div className="icon">{n.icon}</div>
              <div className="label">{n.label}</div>
              {count!==null && <div className="count">{count} 件</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CloudSyncModal({ syncConfig, setSyncConfig, syncState, onConnect, onPull, onPush, onClose }){
  const [keyValue,setKeyValue]=useState(syncConfig.key||'');
  const busy=syncState.phase==='checking'||syncState.phase==='pulling'||syncState.phase==='pushing';
  const tone=syncState.phase==='ready'?'good':syncState.phase==='conflict'?'warn':syncState.phase==='error'?'error':'';
  const label={idle:'未接続',checking:'クラウドを確認中…',ready:'同期できます',pulling:'クラウドから読み込み中…',pushing:'クラウドへ保存中…',conflict:'端末とクラウドの更新番号が違います',error:'同期エラー'}[syncState.phase]||syncState.phase;
  return <Modal title="クラウド同期" onClose={onClose}>
    <div className="sync-panel">
      <div className={'sync-status-box '+tone}><strong>{label}</strong>{syncState.message&&<div>{syncState.message}</div>}{syncConfig.lastSyncedAt&&<div>最終同期：{new Date(syncConfig.lastSyncedAt).toLocaleString('ja-JP')}</div>}</div>
      <div className="sync-field"><label>同期キー</label><input type="password" value={keyValue} onChange={e=>setKeyValue(e.target.value)} placeholder="Cloudflareへ登録した同期キー" autoComplete="current-password" /></div>
      <div className="sync-actions">
        <button type="button" className="btn btn-primary" disabled={busy||!keyValue.trim()} onClick={()=>onConnect(keyValue.trim())}>{syncConfig.enabled?'接続を確認':'同期を開始'}</button>
        <button type="button" className="btn" disabled={busy||!syncConfig.enabled} onClick={onPull}>クラウドから読み込む</button>
        <button type="button" className="btn" disabled={busy||!syncConfig.enabled||syncState.phase==='conflict'} onClick={onPush}>今すぐクラウドへ保存</button>
      </div>
      <label style={{display:'flex',gap:8,alignItems:'center',fontSize:13}}><input type="checkbox" checked={syncConfig.enabled} onChange={e=>{const next={...syncConfig,enabled:e.target.checked,key:e.target.checked?keyValue.trim():syncConfig.key};setSyncConfig(next);saveCloudSyncConfig(next);}} />変更を自動でクラウド保存する</label>
      <p className="sync-note">本文・設定・辞典・シーン設計を同期します。画像は容量が大きいため現在は端末内保存です。更新番号が食い違った場合は自動上書きを止めます。</p>
    </div>
  </Modal>;
}

