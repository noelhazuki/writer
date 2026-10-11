/* ---- 組織 / 勢力 / 家系 ---- */
function OrganizationDetail({ data, id, updateItem, deleteItem, onBack, allChars, allLocations, allOrgs, addRelation, updateRelation, deleteRelation }){
  const org = data.organizations.find(o=>o.id===id);
  if(!org) return null;
  const patch = (p) => updateItem('organizations', id, p);
  const charOptions = allChars.map(c=>({id:c.id,label:c.name||'（無名）'}));
  // 所属人物：characters[].affiliationOrgIdsがSingle Source of Truthなので、ここから逆引きする。
  // organizations[].memberIdsはレガシーフィールドとして残すのみで、表示・更新には使わない。
  const memberIds = allChars.filter(c => (c.affiliationOrgIds||[]).includes(id)).map(c=>c.id);
  const setMemberIds = (nextIds) => {
    const before = new Set(memberIds);
    const after = new Set(nextIds);
    allChars.forEach(c=>{
      const was = before.has(c.id), now = after.has(c.id);
      if(was===now) return;
      const current = c.affiliationOrgIds||[];
      const updated = now ? [...current, id] : current.filter(oid=>oid!==id);
      updateItem('characters', c.id, { affiliationOrgIds: updated });
    });
  };
  const locOptions = allLocations.map(l=>({id:l.id,label:l.name||'（無名）'}));
  const relationOtherOptions = allOrgs.filter(o=>o.id!==id).map(o=>({id:o.id,label:o.name||'（無名）'}));

  const orgRelations = (data.entityRelations||[]).filter(r => r.fromId===id || r.toId===id);
  const [relDraft, setRelDraft] = useState(null); // null | {editingId, otherId, selfLabel, otherLabel, note}

  const startNewRelation = () => setRelDraft({ editingId:null, otherId:'', selfLabel:'', otherLabel:'', note:'' });
  const startEditRelation = (rel) => {
    const isFrom = rel.fromId===id;
    setRelDraft({
      editingId: rel.id,
      otherId: isFrom ? rel.toId : rel.fromId,
      selfLabel: isFrom ? (rel.label||'') : (rel.reverseLabel||''),
      otherLabel: isFrom ? (rel.reverseLabel||'') : (rel.label||''),
      note: rel.note || '',
    });
  };
  const saveRelation = () => {
    if(!relDraft || !relDraft.otherId) return;
    if(relDraft.editingId){
      const rel = data.entityRelations.find(r=>r.id===relDraft.editingId);
      if(!rel) { setRelDraft(null); return; }
      const isFrom = rel.fromId===id;
      updateRelation(rel.id, isFrom
        ? { toId: relDraft.otherId, label: relDraft.selfLabel, reverseLabel: relDraft.otherLabel, note: relDraft.note }
        : { fromId: relDraft.otherId, label: relDraft.otherLabel, reverseLabel: relDraft.selfLabel, note: relDraft.note }
      );
    } else {
      addRelation({ fromId:id, toId:relDraft.otherId, label:relDraft.selfLabel, reverseLabel:relDraft.otherLabel, note:relDraft.note, fromType:'organization', toType:'organization' });
    }
    setRelDraft(null);
  };
  const removeRelation = (relId) => { if(confirm('この関係を削除しますか？')) deleteRelation(relId); };

  return (
    <div>
      <div className="breadcrumb"><button onClick={onBack}>← 組織 / 勢力 / 家系一覧</button></div>
      <div className="toolbar">
        <input className="proj-title" style={{fontSize:20, flex:1}} value={org.name} placeholder="名称"
          onChange={e=>patch({name:e.target.value})} />
        <button className="btn btn-danger btn-sm" onClick={()=>{ if(confirm('この組織を削除しますか？')){ deleteItem(id); onBack(); } }}>削除</button>
      </div>
      <CollapsibleSection title="基本情報" defaultOpen preview={firstNonEmpty(org.summary, org.purpose)}>
        <div className="field-row"><label>カテゴリ（探す時の分類）</label><input type="text" value={org.category||''} onChange={e=>patch({category:e.target.value})} placeholder="軍事組織 / 政府 / 企業 / 宗教 / 研究機関 / 犯罪組織 / 家系・一族 / チーム など" /></div>
        <SingleImageField label="画像 / アイコン" imageId={org.image} onChange={img=>patch({image:img})} />
        <div className="field-row"><label>概要</label><FieldAutoTextarea value={org.summary||''} onChange={e=>patch({summary:e.target.value})} minHeight={110} /></div>
        <div className="field-row"><label>目的</label><FieldAutoTextarea value={org.purpose||''} onChange={e=>patch({purpose:e.target.value})} minHeight={130} /></div>
        <div className="field-row"><label>メモ</label><FieldAutoTextarea value={org.memo||''} onChange={e=>patch({memo:e.target.value})} minHeight={140} /></div>
      </CollapsibleSection>
      <CollapsibleSection title="自由項目" badge={(org.customFields||[]).length || null}>
        <CustomFieldsEditor fields={org.customFields} onChange={f=>patch({customFields:f})} />
      </CollapsibleSection>
      <CollapsibleSection title="所属・関連リンク" defaultOpen>
        <LinkPicker label="所属人物" options={charOptions} selectedIds={memberIds} onChange={setMemberIds} />
        <LinkPicker label="関連場所" options={locOptions} selectedIds={org.locationIds} onChange={ids=>patch({locationIds:ids})} />
      </CollapsibleSection>

      <CollapsibleSection title="関連・関係性（他の組織・家系との繋がり）" defaultOpen={orgRelations.length>0} badge={orgRelations.length || null}>
        <p style={{fontSize:12, color:'var(--ink-soft)', marginTop:0}}>「どの分類に入れるか」とは別に、他の組織・家系と具体的にどう繋がっているかをここに記録します。</p>
        {orgRelations.length===0 && <div className="empty-hint">まだ関係が登録されていません。</div>}
        {orgRelations.map(rel=>{
          const isFrom = rel.fromId===id;
          const otherId = isFrom ? rel.toId : rel.fromId;
          const otherOrg = allOrgs.find(o=>o.id===otherId);
          const label = isFrom ? rel.label : rel.reverseLabel;
          return (
            <div className="change-item" key={rel.id}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, flexWrap:'wrap'}}>
                <div>
                  <div className="ci-title">{otherOrg ? (otherOrg.name||'（無名）') : '（削除済みの組織）'}</div>
                  {label && <div style={{fontSize:13, color:'var(--plum)', fontWeight:700}}>{label}</div>}
                  {rel.note && <div className="ci-desc">{rel.note}</div>}
                </div>
                <div style={{display:'flex', gap:6, flexShrink:0}}>
                  <button className="btn btn-sm" onClick={()=>startEditRelation(rel)}>編集</button>
                  <button className="btn btn-sm btn-danger" onClick={()=>removeRelation(rel.id)}>削除</button>
                </div>
              </div>
            </div>
          );
        })}
        <button className="btn btn-ghost btn-sm" onClick={startNewRelation}>＋ 関係を追加</button>
      </CollapsibleSection>

      {relDraft && (
        <Modal title={relDraft.editingId ? "関係を編集" : "関係を追加"} onClose={()=>setRelDraft(null)}>
          <SingleLinkPicker label="相手" options={relationOtherOptions} value={relDraft.otherId||null} onChange={v=>setRelDraft(d=>({...d, otherId:v||''}))} />
          <div className="field-row"><label>こちらから見た関係</label><input type="text" value={relDraft.selfLabel} onChange={e=>setRelDraft(d=>({...d, selfLabel:e.target.value}))} placeholder="慣例的に軍務へ従事 など" /></div>
          <div className="field-row"><label>相手から見た関係</label><input type="text" value={relDraft.otherLabel} onChange={e=>setRelDraft(d=>({...d, otherLabel:e.target.value}))} placeholder="代々人材を輩出 など" /></div>
          <div className="field-row"><label>詳細（任意）</label><FieldAutoTextarea value={relDraft.note} onChange={e=>setRelDraft(d=>({...d, note:e.target.value}))} minHeight={100} /></div>
          <div className="modal-actions">
            <button className="btn" onClick={()=>setRelDraft(null)}>キャンセル</button>
            <button className="btn btn-primary" disabled={!relDraft.otherId} onClick={saveRelation}>保存</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---- 場所 / 建物 ---- */
// locIdを起点に、その場所より下位（子孫）の場所IDの集合を返す（親選択での循環参照防止に使う）
function getDescendantLocationIds(locId, allLocations){
  const ids = new Set();
  const stack = [locId];
  while(stack.length){
    const cur = stack.pop();
    allLocations.forEach(l=>{
      if(l.parentLocationId===cur && !ids.has(l.id)){ ids.add(l.id); stack.push(l.id); }
    });
  }
  return ids;
}

function LocationDetail({ data, id, updateItem, deleteItem, onBack, allChars, allOrgs }){
  const loc = data.locations.find(l=>l.id===id);
  if(!loc) return null;
  const patch = (p) => updateItem('locations', id, p);
  const charOptions = allChars.map(c=>({id:c.id,label:c.name||'（無名）'}));
  const orgOptions = allOrgs.map(o=>({id:o.id,label:o.name||'（無名）'}));
  // 自分自身と、自分の子孫は「上位の場所」の候補から除外する（循環参照防止）
  const descendantIds = getDescendantLocationIds(id, data.locations);
  const parentOptions = data.locations
    .filter(l => l.id!==id && !descendantIds.has(l.id))
    .map(l => ({ id:l.id, label:l.name||'（無名）' }));

  return (
    <div>
      <div className="breadcrumb"><button onClick={onBack}>← 場所 / 建物一覧</button></div>
      <div className="toolbar">
        <input className="proj-title" style={{fontSize:20, flex:1}} value={loc.name} placeholder="名称"
          onChange={e=>patch({name:e.target.value})} />
        <button className="btn btn-danger btn-sm" onClick={()=>{ if(confirm('この場所を削除しますか？')){ deleteItem('locations', id); onBack(); } }}>削除</button>
      </div>
      <CollapsibleSection title="基本情報" defaultOpen preview={firstNonEmpty(loc.summary)}>
        <div className="field-row"><label>カテゴリ</label><input type="text" value={loc.category||''} onChange={e=>patch({category:e.target.value})} placeholder="惑星 / 国家 / 都市 / 建物 / 宇宙船 など" /></div>
        <SingleLinkPicker label="上位の場所（将来の地図・階層表示用）" options={parentOptions} value={loc.parentLocationId} onChange={v=>patch({parentLocationId:v})} />
        <SingleImageField label="画像" imageId={loc.image} onChange={img=>patch({image:img})} />
        <div className="field-row"><label>概要</label><FieldAutoTextarea value={loc.summary||''} onChange={e=>patch({summary:e.target.value})} minHeight={110} /></div>
        <div className="field-row"><label>メモ</label><FieldAutoTextarea value={loc.memo||''} onChange={e=>patch({memo:e.target.value})} minHeight={140} /></div>
      </CollapsibleSection>
      <CollapsibleSection title="自由項目" badge={(loc.customFields||[]).length || null}>
        <CustomFieldsEditor fields={loc.customFields} onChange={f=>patch({customFields:f})} />
      </CollapsibleSection>
      <CollapsibleSection title="所属・関連リンク" defaultOpen>
        <SingleLinkPicker label="所属 / 支配勢力" options={orgOptions} value={loc.controllingOrgId} onChange={v=>patch({controllingOrgId:v})} />
        <LinkPicker label="関連人物" options={charOptions} selectedIds={loc.relatedPersonIds} onChange={ids=>patch({relatedPersonIds:ids})} />
        <LinkPicker label="関連組織" options={orgOptions} selectedIds={loc.relatedOrgIds} onChange={ids=>patch({relatedOrgIds:ids})} />
      </CollapsibleSection>
    </div>
  );
}

