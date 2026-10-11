// 性格の5段階対比（中央=3が「どちらでもない」）
const PERSONALITY_SCALE_DEFS = [
  { id:'pace', left:'おっとり', right:'せっかち', hint:'待ち時間や、誰かがグズグズしているとき、のんびり待てる？　イライラして急かす？' },
  { id:'detail', left:'大雑把', right:'几帳面', hint:'ファイルや持ち物を、名前・分類・ラベルまで整えて管理する？　必要なとき見つかれば充分？' },
  { id:'joke', left:'冗談が通じる', right:'冗談が通じない', hint:'からかわれたとき一緒に笑える？　言葉どおり本気に受け取る？' },
  { id:'talk', left:'寡黙', right:'おしゃべり', hint:'一つ聞かれたら必要なことだけ答える？　関連する話まで十返ってくる？' },
  { id:'social', left:'内向的', right:'社交的', hint:'仕事や義務がなくても、自分から人に会ったり新しい関係を作ったりする？' },
  { id:'risk', left:'慎重', right:'大胆', hint:'大事な選択や危険な作戦では、十分に確認してから動く？　まず決断して進みながら考える？' },
  { id:'emotion', left:'感情的', right:'冷静', hint:'心を乱す相手や出来事があっても、いつもどおり判断して動ける？' },
  { id:'honesty', left:'素直', right:'ひねくれている', hint:'褒められたとき、喜んで受け取る？　裏を疑ったり、照れ隠しで否定したりする？' },
  { id:'coop', left:'協調的', right:'我が道を行く', hint:'仲間と意見が割れたとき、折り合いを探す？　反対されても自分の考えを通す？' },
];

// 信仰・思想・価値観の5段階対比
const BELIEF_SCALE_DEFS = [
  { id:'change', left:'保守', right:'改革', hint:'古い制度や伝統に問題があったとき、残しながら直す？　大きく作り替える？' },
  { id:'conflict', left:'協調・対話', right:'強硬・実力行使', hint:'敵対者との衝突では、対話や譲歩で避ける？　先に力を見せて抑える？' },
  { id:'execution', left:'実行をためらう', right:'自分で実行できる', hint:'正しいと思う策に犠牲が伴うとき、自分で決断して命じられる？　考えと実行は別でも構いません。' },
  { id:'benefit', left:'個人の幸福', right:'大勢の利益', hint:'一人を犠牲にすれば多くを救えるとき、どちらを優先する？' },
  { id:'duty', left:'家族', right:'使命', hint:'家族を守ることと、自分の役目を果たすことが両立しない場合、どちらを優先する？' },
  { id:'lineage', left:'家柄を守る', right:'自分の人生を選ぶ', hint:'一族から期待された役割と、自分の望む生き方が違ったらどちらを選ぶ？' },
  { id:'order', left:'秩序', right:'自由', hint:'厳しい規則による安定と、多少の混乱を許した個人の自由ならどちらを重視する？' },
  { id:'process', left:'過程', right:'結果', hint:'正しい方法では間に合わないとき、手段を選ばず成功を取れる？' },
  { id:'forgive', left:'許す', right:'報復する', hint:'深く傷つけられたとき、相手の事情を理解して許す？　償わせなければ終われない？' },
  { id:'fate', left:'運命', right:'自己決定', hint:'人生は定められた流れに導かれる？　それとも選択によって変えられる？' },
];

// 好みの対比（性格・信仰思想の5段階とは異なり「どちらも好き／どちらも苦手」も選べる）
const PREFERENCE_PAIR_DEFS = [
  { id:'taste', left:'甘い物', right:'辛い物', hint:'デザートと辛い料理が並んでいたら、どちらへ先に手を伸ばす？' },
  { id:'climate', left:'暑い場所', right:'寒い場所', hint:'暑い土地と寒い土地なら、どちらが快適？　種族や出身地による違いも考えてみます。' },
  { id:'cuisine', left:'和食', right:'洋食', hint:'出汁や素材を生かした料理と、油・乳製品・濃いソースを使った料理ならどちらを好む？' },
  { id:'meat', left:'肉', right:'魚', hint:'肉料理と魚料理が並んでいたら、普段どちらを選ぶ？　見た目どおりでなくても構いません。' },
  { id:'place', left:'都会', right:'自然', hint:'ネオンと人で賑わう眠らない街と、水や空気が美しい静かな土地なら、どちらで暮らしたい？' },
  { id:'crowd', left:'一人', right:'大人数', hint:'一人の時間が必要？　誰かがいないと寂しい？　好きな人といる場合だけ違っても構いません。' },
  { id:'time', left:'朝', right:'夜', hint:'太陽や鳥の声がある明るい朝と、静けさや星、暗さに包まれる夜ならどちらが落ち着く？' },
  { id:'stability', left:'安定', right:'刺激', hint:'変わらない平和な日常と、予想できない出来事や危険のある生活なら、どちらを求める？' },
];
const PREFERENCE_OPTIONS = [
  { key:'left', text:(l)=>`${l}が好き` },
  { key:'slightlyLeft', text:(l)=>`やや${l}寄り` },
  { key:'both', text:()=>'どちらも好き' },
  { key:'slightlyRight', text:(l,r)=>`やや${r}寄り` },
  { key:'right', text:(l,r)=>`${r}が好き` },
  { key:'neitherDislike', text:()=>'どちらも苦手' },
];

const RELIGION_STATUS_OPTIONS = ['無宗教', '信仰あり', '迷い・不明', 'その他'];
const SUPERNATURAL_BELIEF_OPTIONS = ['信じる', '信じない', '分からない・迷っている', 'その他'];

// 目的の深掘り質問（既存の「目的」自由記述欄とは別項目として保存する）
const GOAL_QUESTION_DEFS = [
  { id:'currentWish', label:'現在望んでいること', hint:'今、心の中で一番強く望んでいることを書きます', placeholder:'例：故郷に帰りたい／認められたい／仇を討ちたい' },
  { id:'currentActions', label:'そのためにしていること', hint:'目的のために、実際に行動していることを書きます', placeholder:'例：修行をしている／情報を集めている／味方を増やしている' },
  { id:'ultimateWish', label:'最終的にどうなりたいか', hint:'物語の最後にどんな状態でいたいかを書きます', placeholder:'例：平穏に暮らしたい／頂点に立ちたい／誰かを守れる存在になりたい' },
  { id:'mustKeep', label:'失いたくないもの', hint:'これを失ったら折れてしまう、というものを書きます', placeholder:'例：家族／誇り／今の居場所' },
  { id:'obstacle', label:'目的を邪魔しているもの', hint:'目的の達成を妨げている人物・状況・自分自身の弱さなどを書きます', placeholder:'例：自分自身の弱さ／過去のしがらみ／敵対する組織' },
  { id:'hiddenDesire', label:'本人が自覚していない本当の欲求', hint:'本人は気づいていないが、行動の奥に隠れている欲求を書きます（作者だけが知っていてもよい）', placeholder:'例：本当は誰かに頼りたい／実は復讐よりも安心を求めている' },
];

// 左右対比を5段階（1〜5、3=どちらでもない、null=未設定）で選ぶ入力。性格・信仰思想の両方で共用する。
function ScaleField({ label, leftLabel, rightLabel, hint, value, onChange }){
  return (
    <div className="scale-field">
      <div className="scale-field-head">
        <span className="scale-field-label">{label}</span>
        {value!=null && <button type="button" className="scale-field-reset" onClick={()=>onChange(null)}>未設定に戻す</button>}
      </div>
      {hint && <p className="scale-field-hint">{hint}</p>}
      <div className="scale-field-row">
        <span className="scale-field-side">{leftLabel}</span>
        <div className="scale-field-dots">
          {[1,2,3,4,5].map(n=>(
            <button key={n} type="button"
              className={"scale-dot"+(value===n?" active":"")+(n===3?" mid":"")}
              title={n===3?'どちらでもない':`${leftLabel}／${rightLabel}のうち${n}`}
              aria-label={`${leftLabel}〜${rightLabel} ${n}段階目`}
              onClick={()=>onChange(n)} />
          ))}
        </div>
        <span className="scale-field-side" style={{textAlign:'right'}}>{rightLabel}</span>
      </div>
    </div>
  );
}

// 好み専用：左右対比＋「どちらも好き」「どちらも苦手」＋未設定を選ぶ入力
function PreferenceField({ label, leftLabel, rightLabel, hint, value, onChange }){
  return (
    <div className="pref-field">
      <div className="pref-field-head">
        <span className="pref-field-label">{label || `${leftLabel} ／ ${rightLabel}`}</span>
        {value!=null && <button type="button" className="scale-field-reset" onClick={()=>onChange(null)}>未設定に戻す</button>}
      </div>
      {hint && <p className="pref-field-hint">{hint}</p>}
      <div className="pref-field-options">
        {PREFERENCE_OPTIONS.map(opt=>(
          <button key={opt.key} type="button"
            className={"pref-btn"+(value===opt.key?" active":"")}
            onClick={()=>onChange(opt.key)}>
            {opt.text(leftLabel, rightLabel)}
          </button>
        ))}
      </div>
    </div>
  );
}

// 数値入力とスライダーを連動させる入力（身長・体重など）。
// 数値欄はmin/maxを持たないため範囲外（人外キャラなど）もそのまま入力できる。
// スライダーは見た目上clamp(min〜max)した位置を表示するだけで、保存されている数値自体は書き換えない。
function SliderNumberField({ label, value, onChange, min, max, step, unit, sliderDefault }){
  const numVal = (value===null || value===undefined || value==='') ? '' : value;
  const sliderVal = (value===null || value===undefined || value==='') ? sliderDefault : clamp(Number(value), min, max);
  return (
    <div className="field-row">
      <label>{label}</label>
      <div className="slider-field">
        <input type="number" inputMode="decimal" className="slider-field-number" value={numVal}
          placeholder="未設定"
          onChange={e=>{ const raw=e.target.value; onChange(raw===''?null:Number(raw)); }} />
        <span className="slider-field-unit">{unit}</span>
        <input type="range" className="slider-field-range" min={min} max={max} step={step}
          value={sliderVal}
          onChange={e=>onChange(Number(e.target.value))} />
        {value!=null && value!=='' && <button type="button" className="slider-field-reset" onClick={()=>onChange(null)}>未設定に戻す</button>}
      </div>
    </div>
  );
}

// 宗教・信仰の有無／神や超常的存在を信じるかなど、単純な左右対比にしにくい項目用：選択肢＋自由記述
function BeliefSelectField({ label, value, onChange, options, detail, onDetailChange, detailPlaceholder }){
  return (
    <div className="field-row">
      <label>{label}</label>
      <select value={value||''} onChange={e=>onChange(e.target.value)}>
        <option value="">未設定</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
      <AutoTextarea style={{marginTop:6, padding:'6px 8px', border:'1px solid var(--line)', borderRadius:6}} minHeight={50}
        placeholder={detailPlaceholder} value={detail||''} onChange={e=>onDetailChange(e.target.value)} />
    </div>
  );
}

// 選択結果を「正解」ではなく創作用の仮説として文章化する。
// 外部AIや通信は使わず、現在の回答だけから毎回同じ規則で生成する。
const PERSONALITY_RESULT_TEXT = {
  pace:['ゆったり構え、相手を待てる','状況に応じて歩調を変える','停滞を嫌い、物事を早く進めたがる'],
  detail:['細部より全体を優先する','必要に応じて細部を整える','細部や整理まできちんと整えたがる'],
  joke:['冗談やからかいを受け流せる','相手や場面によって冗談への反応が変わる','言葉を真剣に受け取りやすい'],
  talk:['必要なことだけを話す寡黙な傾向がある','相手や場面に応じて話し方が変わる','話題を広げながらよく話す'],
  social:['一人や狭い関係の中で落ち着く','一人の時間と交流の両方を必要とする','私生活でも人との交流を求める'],
  risk:['重要な局面ほど慎重に確認する','危険度に応じて慎重さを変える','危険な局面でもまず決断して動ける'],
  emotion:['感情が判断や行動に表れやすい','感情と理性の折り合いをつける','心を乱されても冷静に動きやすい'],
  honesty:['好意や言葉を比較的素直に受け取る','相手によって素直さが変わる','好意にも裏を読んだり照れ隠しをしたりする'],
  coop:['周囲との折り合いを重視する','協調と自己主張を使い分ける','反対されても自分の道を選びやすい'],
};
const BELIEF_RESULT_TEXT = {
  change:['伝統や既存の仕組みを残すことを重視する','保守と改革を状況で使い分ける','古い仕組みを大きく変えることを恐れない'],
  conflict:['対立には対話や妥協から入る','対話と実力行使を状況で選ぶ','脅威には力を示す強硬策を支持しやすい'],
  execution:['正しいと思っても犠牲を伴う実行にはためらう','責任と犠牲を見て実行を判断する','犠牲を理解したうえで自分で決断し実行できる'],
  benefit:['大勢の利益より目の前の個人を守ろうとする','個人と全体の損失を比べて判断する','少数を犠牲にしても大勢を守ろうとする'],
  duty:['使命より家族や身近な相手を優先する','家族と使命の両立を探る','私情を抑えて使命を優先する'],
  lineage:['家柄や一族から受け継いだものを守る','家の責任と自分の人生を両立させようとする','家の期待より自分で選んだ人生を優先する'],
  order:['自由より秩序と安定を重視する','秩序と自由の釣り合いを取る','混乱の可能性があっても自由を重視する'],
  process:['結果だけでなく正しい過程を重視する','状況に応じて手段と結果を比べる','必要なら手段を選ばず結果を取りにいく'],
  forgive:['事情を理解し、許す道を探ろうとする','相手の事情と償いを見て判断する','傷つけた相手には報いを求める'],
  fate:['運命や定められた役割を受け入れやすい','運命を意識しつつ自分でも選ぼうとする','人生は自分の選択で変えるものだと考える'],
};

function resultBucket(value){ return value<=2 ? 0 : value>=4 ? 2 : 1; }
function answeredScaleEntries(defs, values, textMap){
  return defs.filter(d=>values[d.id]!=null).map(d=>({
    id:d.id, value:values[d.id], text:(textMap[d.id]||[])[resultBucket(values[d.id])] || ''
  }));
}
function makeCharacterAssessment(ch){
  const p = ch.personalityScale||{}, b = ch.beliefScale||{};
  const pEntries = answeredScaleEntries(PERSONALITY_SCALE_DEFS, p, PERSONALITY_RESULT_TEXT);
  const bEntries = answeredScaleEntries(BELIEF_SCALE_DEFS, b, BELIEF_RESULT_TEXT);
  const personalityText = pEntries.length ? `${pEntries.map(x=>x.text).join('。')}。` : '性格の回答がまだありません。';
  const beliefText = bEntries.length ? `${bEntries.map(x=>x.text).join('。')}。` : '思想・価値観の回答がまだありません。';
  const tensions = [];
  if(b.conflict>=4 && b.execution<=2) tensions.push('強硬策を正しいと考える一方、自分で犠牲を決断して実行することにはためらいがあります。誰なら命令できるのか、何が最後の一線を越えさせるのかを決めると人物の核になります。');
  if(b.conflict<=2 && b.execution>=4) tensions.push('対話を優先しますが、必要と判断した場面では自分で実力行使へ移れます。どの条件で交渉を打ち切るのかを決めると一貫します。');
  if(b.benefit>=4 && b.duty<=2) tensions.push('大勢の利益を重視しながら、家族や身近な相手も優先します。その相手だけは例外なのか、最後には全体を選ぶのかが物語上の葛藤になります。');
  if(b.change>=4 && b.lineage<=2) tensions.push('改革を望みながら家柄も守ろうとしています。家そのものではなく、家が本来守るべき理念を残したい人物として両立できます。');
  if(b.order<=2 && b.lineage>=4) tensions.push('秩序を重視する一方で、家の期待より自分の人生を選びます。現在の家や制度を「正しい秩序ではない」と考える理由があると自然です。');
  if(b.forgive>=4 && p.emotion>=4) tensions.push('冷静さと強い報復志向が同居しています。衝動的な復讐ではなく、長期計画として報いを与える人物にも見えます。');
  if(p.coop<=2 && p.risk>=4) tensions.push('周囲との協調を重視しながら大胆に動けます。仲間の合意を得てから大胆策へ進むのか、危機だけは独断するのかを決めると輪郭が出ます。');
  if(p.social<=2 && p.talk>=4) tensions.push('自分から交流を広げる方ではありませんが、親しい相手や得意な話題ではよく話す人物として自然に両立します。');
  if(!tensions.length && pEntries.length+bEntries.length>=4) tensions.push('大きく引っかかる組み合わせは見つかりませんでした。相手や状況による例外を一つ作ると、さらに人物らしくなります。');

  const snapshot = {};
  PERSONALITY_SCALE_DEFS.forEach(d=>{ if(p[d.id]!=null) snapshot[`p:${d.id}`]=p[d.id]; });
  BELIEF_SCALE_DEFS.forEach(d=>{ if(b[d.id]!=null) snapshot[`b:${d.id}`]=b[d.id]; });
  const previous = ch.characterAssessment && ch.characterAssessment.snapshot || {};
  const changes = [];
  [...PERSONALITY_SCALE_DEFS.map(d=>({...d,prefix:'p'})), ...BELIEF_SCALE_DEFS.map(d=>({...d,prefix:'b'}))].forEach(d=>{
    const key=`${d.prefix}:${d.id}`, before=previous[key], after=snapshot[key];
    if(before!=null && after!=null && before!==after){
      const beforeLabel=before<=2?d.left:before>=4?d.right:'中間';
      const afterLabel=after<=2?d.left:after>=4?d.right:'中間';
      changes.push(`${d.left}／${d.right}：${beforeLabel}寄り → ${afterLabel}寄り`);
    }
  });
  return { personalityText, beliefText, tensions, changes, snapshot, generatedAt:Date.now() };
}

/* ---- キャラクター ---- */
function CharacterDetail({ data, id, updateItem, deleteItem, onBack, backLabel, allOrgs, allLocations, allTimeline }){
  const ch = data.characters.find(c=>c.id===id);
  if(!ch) return null;
  const patch = (p) => updateItem('characters', id, p);
  const orgOptions = allOrgs.map(o=>({id:o.id,label:o.name||'（無名）'}));
  const locOptions = allLocations.map(o=>({id:o.id,label:o.name||'（無名）'}));
  const tlOptions = allTimeline.map(t=>({id:t.id,label:t.title||'（無題）', sub:t.dateLabel}));
  const [cropOpen, setCropOpen] = useState(false);

  const addChange = () => patch({ changes: [...(ch.changes||[]), { id: uid('chg'), timeLabel:'', title:'', description:'', timelineEventId:null }] });
  const updateChange = (cid, p) => patch({ changes: (ch.changes||[]).map(c=>c.id===cid?{...c,...p}:c) });
  const removeChange = (cid) => patch({ changes: (ch.changes||[]).filter(c=>c.id!==cid) });

  // キャラクター設定UI改修：選択式グループ（性格・信仰思想・好み・目的の深掘り）の更新ヘルパー。
  // 各グループはオブジェクトとして持ち、1項目だけをマージ更新する（他の選択済み項目を消さない）。
  const patchPersonalityScale = (tid, v) => patch({ personalityScale: { ...(ch.personalityScale||{}), [tid]: v } });
  const patchBeliefScale = (tid, v) => patch({ beliefScale: { ...(ch.beliefScale||{}), [tid]: v } });
  const patchPreferenceScale = (tid, v) => patch({ preferenceScale: { ...(ch.preferenceScale||{}), [tid]: v } });
  const patchGoalDetail = (qid, v) => patch({ goalDetail: { ...(ch.goalDetail||{}), [qid]: v } });
  const runAssessment = () => patch({ characterAssessment: makeCharacterAssessment(ch) });
  const assessment = ch.characterAssessment;

  const appearanceDetailCount = ['heightCm','weightKg','bust','waist','hip','bodyType','hairColor','hairLength','hairStyle','eyeColor','skinColor','outfit','appearanceFeatures']
    .filter(k => ch[k]!==null && ch[k]!==undefined && ch[k]!=='').length;
  const personalityScaleCount = Object.values(ch.personalityScale||{}).filter(v=>v!=null).length;
  const preferenceFilledCount = Object.values(ch.preferenceScale||{}).filter(v=>v!=null).length
    + ['likesText','dislikesText','weaknessText','fearText','obsessionText'].filter(k=>ch[k]).length;
  const beliefFilledCount = Object.values(ch.beliefScale||{}).filter(v=>v!=null).length
    + (ch.religionStatus?1:0) + (ch.believesSupernatural?1:0);
  const goalDetailCount = Object.values(ch.goalDetail||{}).filter(v=>v && String(v).trim()).length;

  const iconCandidates = [
    ch.image ? { id: ch.image, label: 'メイン画像' } : null,
    ...(ch.images||[]).map(im => ({ id: im.id, label: im.label || '画像' })),
  ].filter(Boolean);

  return (
    <div>
      <div className="breadcrumb"><button onClick={onBack}>← {backLabel||'キャラクター一覧'}</button></div>
      <div className="toolbar">
        <input className="proj-title" style={{fontSize:20, flex:1}} value={ch.name} placeholder="呼ぶ名前（作中で主に使う名前）"
          onChange={e=>patch({name:e.target.value})} />
        <button className="btn btn-danger btn-sm" onClick={()=>{ if(confirm('このキャラクターを削除しますか？')){ deleteItem('characters', id); onBack(); } }}>削除</button>
      </div>

      <CollapsibleSection title="基本情報" defaultOpen preview={firstNonEmpty(ch.summary)}>
        <div className="field-grid">
          <div className="field-row"><label>呼ぶ名前</label><input type="text" value={ch.name||''} onChange={e=>patch({name:e.target.value})} placeholder="作中・作業中に主に使う名前" /></div>
          <div className="field-row"><label>本名</label><input type="text" value={ch.realName||''} onChange={e=>patch({realName:e.target.value})} placeholder="設定上の本名（未設定でも可）" /></div>
        </div>
        <div className="field-grid">
          <div className="field-row"><label>読み</label><input type="text" value={ch.kana||''} onChange={e=>patch({kana:e.target.value})} /></div>
          <div className="field-row"><label>年齢</label><input type="text" value={ch.age||''} onChange={e=>patch({age:e.target.value})} placeholder="18 / 不明 など" /></div>
        </div>
        <div className="field-grid">
          <div className="field-row"><label>カテゴリ（役割：主人公 / 敵役 など）</label><input type="text" value={ch.category||''} onChange={e=>patch({category:e.target.value})} placeholder="主人公 / 敵役 / 脇役 など自由入力" /></div>
          <div className="field-row">
            <label>グループ（一覧の整理用）</label>
            <select value={ch.groupId||''} onChange={e=>patch({groupId:e.target.value||null})}>
              <option value="">未分類</option>
              {data.characterGroups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </div>
        <div className="field-row">
          <label>タグ（家族 / 故人 / 未登場 など横断分類用）</label>
          <CharacterTagEditor tags={ch.tags||[]} allCharacters={data.characters} onChange={v=>patch({tags:v})} />
        </div>
        <div className="field-row">
          <label>なんと呼ばれているか（相手によって複数）</label>
          <CalledNamesEditor items={ch.calledNames} onChange={v=>patch({calledNames:v})} />
        </div>
        <SingleImageField label="メイン画像（立ち絵・参考画像）" imageId={ch.image} onChange={img=>patch({image:img})} variant="portrait" />
        <div className="field-row">
          <label>相関図用アイコン</label>
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <IconThumb imageId={ch.iconImageId} size={64} />
            <button className="btn btn-sm" disabled={iconCandidates.length===0} onClick={()=>setCropOpen(true)}>✂️ 画像から切り抜く</button>
          </div>
        </div>
        <div className="field-row">
          <label>概要</label>
          <p className="field-hint">ひとことで表すなら？　見た目・性格・立場などを簡潔にまとめます。</p>
          <FieldAutoTextarea value={ch.summary||''} onChange={e=>patch({summary:e.target.value})} minHeight={110} />
        </div>
      </CollapsibleSection>

      {cropOpen && (
        <IconCropModal candidates={iconCandidates} currentIconId={ch.iconImageId}
          onSave={(imgId)=>patch({iconImageId:imgId})} onClose={()=>setCropOpen(false)} />
      )}

      <CollapsibleSection title="人物像（現在の状態）" preview={firstNonEmpty(ch.personality, ch.values, ch.appearance)}>
        <div className="field-row">
          <label>外見</label>
          <p className="field-hint">服装や髪型など、特徴的な外見のポイントを書きます。数値の詳細は下の「外見設定（詳細）」で設定できます。</p>
          <FieldAutoTextarea value={ch.appearance||''} onChange={e=>patch({appearance:e.target.value})} minHeight={130} />
        </div>
        <div className="field-row">
          <label>性格</label>
          <p className="field-hint">一言でなく、エピソードや口癖として書くと立体的になります。傾向を数値でも表したい場合は下の「性格（5段階）」で設定できます。</p>
          <FieldAutoTextarea value={ch.personality||''} onChange={e=>patch({personality:e.target.value})} minHeight={160} />
        </div>
        <div className="field-row">
          <label>思想 / 価値観</label>
          <p className="field-hint">何を大切にし、何を許せないかを書きます。細かい対比項目は下の「信仰・思想・価値観（詳細）」で設定できます。</p>
          <FieldAutoTextarea value={ch.values||''} onChange={e=>patch({values:e.target.value})} minHeight={160} />
        </div>
        <div className="field-row">
          <label>目的</label>
          <p className="field-hint">物語を通して何を求めているかを大まかに書きます。具体的な質問に分けて考えたい場合は下の「目的（深掘り）」で設定できます。</p>
          <FieldAutoTextarea value={ch.goal||''} onChange={e=>patch({goal:e.target.value})} minHeight={130} />
        </div>
        <div className="field-row">
          <label>過去</label>
          <p className="field-hint">今の性格や価値観につながった出来事、育った環境などを書きます。時系列で細かく残したい場合は下の「変化・出来事」も使えます。</p>
          <FieldAutoTextarea value={ch.history||''} onChange={e=>patch({history:e.target.value})} minHeight={130} />
        </div>
        <div className="field-row"><label>メモ</label><FieldAutoTextarea value={ch.memo||''} onChange={e=>patch({memo:e.target.value})} minHeight={160} /></div>
      </CollapsibleSection>

      <CollapsibleSection title="外見設定（詳細）" badge={appearanceDetailCount || null}>
        <p className="field-hint" style={{marginTop:0}}>すべて任意入力です。未設定のままでも保存できます。</p>
        <SliderNumberField label="身長" value={ch.heightCm} onChange={v=>patch({heightCm:v})} min={100} max={220} step={1} unit="cm" sliderDefault={160} />
        <SliderNumberField label="体重" value={ch.weightKg} onChange={v=>patch({weightKg:v})} min={20} max={150} step={1} unit="kg" sliderDefault={55} />
        <div className="appearance-detail-grid">
          <div className="field-row"><label>バスト</label><input type="number" inputMode="decimal" value={ch.bust===null||ch.bust===undefined?'':ch.bust} placeholder="未設定" onChange={e=>patch({bust:e.target.value})} /></div>
          <div className="field-row"><label>ウエスト</label><input type="number" inputMode="decimal" value={ch.waist===null||ch.waist===undefined?'':ch.waist} placeholder="未設定" onChange={e=>patch({waist:e.target.value})} /></div>
          <div className="field-row"><label>ヒップ</label><input type="number" inputMode="decimal" value={ch.hip===null||ch.hip===undefined?'':ch.hip} placeholder="未設定" onChange={e=>patch({hip:e.target.value})} /></div>
          <div className="field-row"><label>体型</label><input type="text" value={ch.bodyType||''} placeholder="細身 / 筋肉質 など" onChange={e=>patch({bodyType:e.target.value})} /></div>
          <div className="field-row"><label>髪色</label><input type="text" value={ch.hairColor||''} placeholder="黒 / 銀 など" onChange={e=>patch({hairColor:e.target.value})} /></div>
          <div className="field-row"><label>髪の長さ</label><input type="text" value={ch.hairLength||''} placeholder="ショート / ロング など" onChange={e=>patch({hairLength:e.target.value})} /></div>
          <div className="field-row"><label>髪型</label><input type="text" value={ch.hairStyle||''} placeholder="ポニーテール など" onChange={e=>patch({hairStyle:e.target.value})} /></div>
          <div className="field-row"><label>目の色</label><input type="text" value={ch.eyeColor||''} placeholder="茶 / 碧 など" onChange={e=>patch({eyeColor:e.target.value})} /></div>
          <div className="field-row"><label>肌の色</label><input type="text" value={ch.skinColor||''} placeholder="色白 / 褐色 など" onChange={e=>patch({skinColor:e.target.value})} /></div>
          <div className="field-row"><label>普段の服装</label><input type="text" value={ch.outfit||''} placeholder="制服 / 私服の傾向など" onChange={e=>patch({outfit:e.target.value})} /></div>
        </div>
        <div className="field-row"><label>外見上の特徴</label><FieldAutoTextarea value={ch.appearanceFeatures||''} onChange={e=>patch({appearanceFeatures:e.target.value})} minHeight={70} placeholder="傷跡 / 義手 / 耳が尖っている など" /></div>
      </CollapsibleSection>

      <CollapsibleSection title="性格（5段階）" badge={personalityScaleCount ? `${personalityScaleCount}/${PERSONALITY_SCALE_DEFS.length}` : null}>
        <p className="field-hint" style={{marginTop:0}}>左右どちらに近いかを5段階で選びます。中央は「どちらでもない」です。未設定のままでも構いません。</p>
        {PERSONALITY_SCALE_DEFS.map(def=>(
          <ScaleField key={def.id} label={`${def.left} ／ ${def.right}`} leftLabel={def.left} rightLabel={def.right} hint={def.hint}
            value={(ch.personalityScale||{})[def.id] ?? null}
            onChange={v=>patchPersonalityScale(def.id, v)} />
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="好み" badge={preferenceFilledCount || null}>
        <p className="field-hint" style={{marginTop:0}}>各項目でどちらが好きかを選びます。「どちらも好き」「どちらも苦手」も選べます。</p>
        {PREFERENCE_PAIR_DEFS.map(def=>(
          <PreferenceField key={def.id} label={`${def.left} ／ ${def.right}`} leftLabel={def.left} rightLabel={def.right} hint={def.hint}
            value={(ch.preferenceScale||{})[def.id] ?? null}
            onChange={v=>patchPreferenceScale(def.id, v)} />
        ))}
        <div className="field-row"><label>好きな物</label><FieldAutoTextarea value={ch.likesText||''} onChange={e=>patch({likesText:e.target.value})} minHeight={60} /></div>
        <div className="field-row"><label>嫌いな物</label><FieldAutoTextarea value={ch.dislikesText||''} onChange={e=>patch({dislikesText:e.target.value})} minHeight={60} /></div>
        <div className="field-row"><label>苦手な物</label><FieldAutoTextarea value={ch.weaknessText||''} onChange={e=>patch({weaknessText:e.target.value})} minHeight={60} /></div>
        <div className="field-row"><label>怖い物</label><FieldAutoTextarea value={ch.fearText||''} onChange={e=>patch({fearText:e.target.value})} minHeight={60} /></div>
        <div className="field-row"><label>執着している物</label><FieldAutoTextarea value={ch.obsessionText||''} onChange={e=>patch({obsessionText:e.target.value})} minHeight={60} /></div>
      </CollapsibleSection>

      <CollapsibleSection title="信仰・思想・価値観（詳細）" badge={beliefFilledCount || null}>
        <p className="field-hint" style={{marginTop:0}}>左右で対比できる項目は5段階で、宗教・信仰に関する項目は選択肢と自由記述で設定します。</p>
        <BeliefSelectField label="宗教や信仰の有無" value={ch.religionStatus} onChange={v=>patch({religionStatus:v})}
          options={RELIGION_STATUS_OPTIONS} detail={ch.religionDetail} onDetailChange={v=>patch({religionDetail:v})}
          detailPlaceholder="具体的な宗教名や信仰のかたちなど（任意）" />
        <BeliefSelectField label="神や超常的存在を信じるか" value={ch.believesSupernatural} onChange={v=>patch({believesSupernatural:v})}
          options={SUPERNATURAL_BELIEF_OPTIONS} detail={ch.supernaturalDetail} onDetailChange={v=>patch({supernaturalDetail:v})}
          detailPlaceholder="信じる・信じない理由など（任意）" />
        {BELIEF_SCALE_DEFS.map(def=>(
          <ScaleField key={def.id} label={`${def.left} ／ ${def.right}`} leftLabel={def.left} rightLabel={def.right} hint={def.hint}
            value={(ch.beliefScale||{})[def.id] ?? null}
            onChange={v=>patchBeliefScale(def.id, v)} />
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="キャラクター調整室" badge={assessment ? '結果あり' : null} defaultOpen={!!assessment}>
        <div className="char-lab">
          <p className="field-hint" style={{marginTop:0}}>性格と思想の回答から、現在の人物像を仮まとめします。占いや正解判定ではありません。回答を変えてもう一度まとめると、前回との差も確認できます。</p>
          <div className="char-lab-actions">
            <button type="button" className="btn btn-primary" onClick={runAssessment}>{assessment?'もう一度人物像をまとめる':'人物像をまとめる'}</button>
          </div>
          {!assessment && <p className="char-lab-note">先に「性格（5段階）」と「信仰・思想・価値観（詳細）」をいくつか選んでください。</p>}
          {assessment && <>
            <div className="char-lab-result">
              <h4>性格の仮まとめ</h4>
              <p>{assessment.personalityText}</p>
              <div className="char-lab-actions"><button type="button" className="btn btn-sm" onClick={()=>patch({personality:assessment.personalityText})}>性格欄へ採用</button></div>
            </div>
            <div className="char-lab-result">
              <h4>思想・価値観の仮まとめ</h4>
              <p>{assessment.beliefText}</p>
              <div className="char-lab-actions"><button type="button" className="btn btn-sm" onClick={()=>patch({values:assessment.beliefText})}>価値観欄へ採用</button></div>
            </div>
            <div className="char-lab-result">
              <h4>整合性の確認・物語にできるギャップ</h4>
              <ul className="char-lab-list">{(assessment.tensions||[]).map((x,i)=><li key={i}>{x}</li>)}</ul>
            </div>
            {(assessment.changes||[]).length>0 && <div className="char-lab-result">
              <h4>前回から変わったところ</h4>
              <ul className="char-lab-list">{assessment.changes.map((x,i)=><li key={i}>{x}</li>)}</ul>
            </div>}
            <p className="char-lab-note" style={{marginTop:10}}>結果は正式設定へ自動反映されません。「採用」を押した文章だけが上の人物像欄へ入ります。</p>
          </>}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="目的（深掘り）" badge={goalDetailCount ? `${goalDetailCount}/${GOAL_QUESTION_DEFS.length}` : null}>
        <p className="field-hint" style={{marginTop:0}}>上の「目的」欄に書いた内容を、具体的な質問に分けて掘り下げます。すべて任意です。</p>
        {GOAL_QUESTION_DEFS.map(def=>(
          <div className="field-row" key={def.id}>
            <label>{def.label}</label>
            <p className="field-hint">{def.hint}</p>
            <FieldAutoTextarea value={(ch.goalDetail||{})[def.id]||''} onChange={e=>patchGoalDetail(def.id, e.target.value)} minHeight={70} placeholder={def.placeholder} />
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="自由項目" badge={(ch.customFields||[]).length || null}>
        <CustomFieldsEditor fields={ch.customFields} onChange={f=>patch({customFields:f})} />
      </CollapsibleSection>

      <CollapsibleSection title="画像" badge={(ch.images||[]).length || null}>
        <MultiImageField images={ch.images} onChange={imgs=>patch({images:imgs})} />
      </CollapsibleSection>

      <CollapsibleSection title="所属・関連リンク">
        <LinkPicker label="所属組織" options={orgOptions} selectedIds={ch.affiliationOrgIds} onChange={ids=>patch({affiliationOrgIds:ids})} />
        <LinkPicker label="関係する場所" options={locOptions} selectedIds={ch.relatedLocationIds} onChange={ids=>patch({relatedLocationIds:ids})} />
      </CollapsibleSection>

      <CollapsibleSection title="変化・出来事（現在とは分けて記録）" defaultOpen={(ch.changes||[]).length>0} badge={(ch.changes||[]).length || null}>
        <p style={{fontSize:12, color:'var(--ink-soft)', marginTop:0}}>「なぜ今の性格・思想になったか」の変化点だけ、必要な分だけ記録します。すべての性格に理由を用意する必要はありません。</p>
        {(ch.changes||[]).map(c=>(
          <div className="change-item" key={c.id}>
            <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
              <input type="text" style={{width:120, padding:'4px 8px', border:'1px solid var(--line)', borderRadius:4}}
                placeholder="18歳 / 現在 など" value={c.timeLabel} onChange={e=>updateChange(c.id,{timeLabel:e.target.value})} />
              <input type="text" style={{flex:1, minWidth:150, padding:'4px 8px', border:'1px solid var(--line)', borderRadius:4, fontWeight:700}}
                placeholder="出来事のタイトル" value={c.title} onChange={e=>updateChange(c.id,{title:e.target.value})} />
              <button className="btn btn-sm btn-danger" onClick={()=>removeChange(c.id)}>削除</button>
            </div>
            <AutoTextarea style={{marginTop:6, padding:'6px 8px', border:'1px solid var(--line)', borderRadius:4}} minHeight={100}
              placeholder="→ この出来事でどう変化したか" value={c.description} onChange={e=>updateChange(c.id,{description:e.target.value})} />
            <div style={{marginTop:6, maxWidth:280}}>
              <SingleLinkPicker label="年表イベントとリンク（任意）" options={tlOptions} value={c.timelineEventId} onChange={v=>updateChange(c.id,{timelineEventId:v})} />
            </div>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={addChange}>＋ 変化・出来事を追加</button>
      </CollapsibleSection>
    </div>
  );
}

