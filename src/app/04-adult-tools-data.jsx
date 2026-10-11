/* ============ 語句魔改造（成人向け表現辞典とは別データ） ============
   完成済み表現ではなく「語彙部品」と「構文」を保存する。
   普通は隣り合わない意味領域の語を意図的に衝突させ、複合語・名詞句を発生させるための生成器。 */
const ADULT_PHRASE_REMIX_KEY = 'novel-world-builder-adult-phrase-remix-v1';

const ADULT_PHRASE_ROLE_LABELS = {
  target:'対象',
  qualifier:'限定・所有',
  content:'内容物・対象物',
  function:'業務・機能',
  body:'身体部位',
  facility:'用途・設備',
};
const ADULT_PHRASE_ROLE_ORDER = ['target','qualifier','content','function','body','facility'];

function makePhrasePart(role, text, domains, tags, concept){
  return {
    id:uid('phrasepart'), role, text,
    concept: concept || '',
    domains:Array.isArray(domains)?domains:[], tags:Array.isArray(tags)?tags:[],
    scores:{ dehumanize:1, objectify:1, contempt:1, vulgarity:1, eroticism:1, weirdness:1 },
  };
}

function defaultAdultPhraseRemix(){
  return {
    schemaVersion:2,
    parts:[
      makePhrasePart('target','オス',['生物'],['動物化'],'男性を動物化'),
      makePhrasePart('target','メス',['生物'],['動物化'],'女性を動物化'),
      makePhrasePart('target','人間',['人物'],[],'人間'),
      makePhrasePart('target','玩具',['物品'],['物化'],'物扱い'),

      makePhrasePart('qualifier','専用',['設備','管理'],['限定'],'専用'),
      makePhrasePart('qualifier','専属',['契約','管理'],['限定'],'専用'),
      makePhrasePart('qualifier','共用',['設備','管理'],['共有'],'共有'),
      makePhrasePart('qualifier','使い捨て',['商品','廃棄'],['物化'],'使い捨て'),

      makePhrasePart('content','ペニス',['身体','性'],['直接'],'性器'),
      makePhrasePart('content','ち〇こ',['身体','性'],['俗語'],'性器'),
      makePhrasePart('content','ち〇ぽ',['身体','性'],['俗語'],'性器'),
      makePhrasePart('content','肉棒',['身体','性'],['比喩'],'性器'),
      makePhrasePart('content','精液',['身体','性'],['体液'],'精液'),
      makePhrasePart('content','ザーメン',['身体','性'],['俗語'],'精液'),
      makePhrasePart('content','体液',['身体','医療'],['体液'],'体液'),
      makePhrasePart('content','熱',['感覚'],[],'熱'),

      makePhrasePart('function','挟む',['身体','動作'],['保持'],'挟む・保持'),
      makePhrasePart('function','固定',['設備','工業'],['保持'],'挟む・保持'),
      makePhrasePart('function','収納',['物流','設備'],['格納'],'挟む・保持'),
      makePhrasePart('function','収容',['物流','設備'],['格納'],'挟む・保持'),
      makePhrasePart('function','飛ぶ',['動作'],[],'飛ぶ・放出'),
      makePhrasePart('function','噴射',['工業','設備'],['放出'],'飛ぶ・放出'),
      makePhrasePart('function','放出',['工業','処理'],['放出'],'飛ぶ・放出'),
      makePhrasePart('function','格納',['物流','設備'],['格納'],'格納・保管'),
      makePhrasePart('function','保管',['物流','管理'],['保管'],'格納・保管'),
      makePhrasePart('function','処理',['業務','廃棄'],['処理'],'処理'),
      makePhrasePart('function','受入',['物流','業務'],['受入'],'受け入れる'),
      makePhrasePart('function','充填',['工業','設備'],['投入'],'入れる'),

      makePhrasePart('body','胸',['身体'],['胸'],'胸'),
      makePhrasePart('body','巨乳',['身体'],['胸'],'胸'),
      makePhrasePart('body','乳肉',['身体'],['胸'],'胸'),
      makePhrasePart('body','デカパイ',['身体'],['胸','俗語'],'胸'),
      makePhrasePart('body','口',['身体'],[],'口'),
      makePhrasePart('body','腹',['身体'],[],'腹'),

      makePhrasePart('facility','捨て場',['廃棄','施設'],['場所'],'捨てる場所'),
      makePhrasePart('facility','処理場',['廃棄','施設'],['処理'],'捨てる場所'),
      makePhrasePart('facility','容器',['設備','容器'],['物化'],'容器'),
      makePhrasePart('facility','収納庫',['物流','施設'],['格納'],'保管場所'),
      makePhrasePart('facility','保管庫',['物流','施設'],['保管'],'保管場所'),
      makePhrasePart('facility','投入口',['工業','設備'],['入口'],'入れる場所'),
      makePhrasePart('facility','受入先',['物流','業務'],['受入'],'受け入れ先'),
    ],
    patterns:[
      {
        id:'content-function', name:'対象＋動作', roles:['content','function'],
        variants:[
          { id:'content-function', name:'対象→動作', segments:[{role:'content'},{role:'function'}] },
          { id:'function-content', name:'動作→対象', segments:[{role:'function'},{role:'content'}] },
          { id:'content-no-function', name:'対象の動作', segments:[{role:'content',suffix:'の'},{role:'function'}] },
          { id:'function-suru-content', name:'動作する対象', segments:[{role:'function',suffix:'する'},{role:'content'}] },
        ],
      },
      {
        id:'content-function-body', name:'対象＋機能＋身体', roles:['content','function','body'],
        variants:[
          { id:'content-function-body', name:'対象→機能→身体', segments:[{role:'content'},{role:'function'},{role:'body'}] },
          { id:'function-content-body', name:'機能→対象→身体', segments:[{role:'function'},{role:'content'},{role:'body'}] },
          { id:'body-function-content', name:'身体→機能→対象', segments:[{role:'body'},{role:'function'},{role:'content'}] },
          { id:'content-no-function-body', name:'対象の機能身体', segments:[{role:'content',suffix:'の'},{role:'function'},{role:'body'}] },
        ],
      },
      {
        id:'target-qualifier-content-facility', name:'対象＋限定＋内容物＋設備用途', roles:['target','qualifier','content','facility'],
        variants:[
          { id:'target-qualifier-content-facility', name:'対象→限定→内容→設備', segments:[{role:'target'},{role:'qualifier',suffix:'の'},{role:'content'},{role:'facility'}] },
          { id:'qualifier-target-content-facility', name:'限定→対象→内容→設備', segments:[{role:'qualifier',suffix:'の'},{role:'target'},{role:'content'},{role:'facility'}] },
        ],
      },
      {
        id:'qualifier-content-facility', name:'限定＋内容物＋設備用途', roles:['qualifier','content','facility'],
        variants:[
          { id:'qualifier-content-facility', name:'限定→内容→設備', segments:[{role:'qualifier',suffix:'の'},{role:'content'},{role:'facility'}] },
          { id:'content-qualifier-facility', name:'内容→限定→設備', segments:[{role:'content'},{role:'qualifier',suffix:'の'},{role:'facility'}] },
        ],
      },
      {
        id:'content-function-facility', name:'内容物＋業務機能＋設備用途', roles:['content','function','facility'],
        variants:[
          { id:'content-function-facility', name:'内容→機能→設備', segments:[{role:'content'},{role:'function'},{role:'facility'}] },
          { id:'function-content-facility', name:'機能→内容→設備', segments:[{role:'function'},{role:'content'},{role:'facility'}] },
        ],
      },
      {
        id:'target-qualifier-function-body', name:'対象＋限定＋業務機能＋身体', roles:['target','qualifier','function','body'],
        variants:[
          { id:'target-qualifier-function-body', name:'対象→限定→機能→身体', segments:[{role:'target'},{role:'qualifier',suffix:'の'},{role:'function'},{role:'body'}] },
          { id:'qualifier-target-function-body', name:'限定→対象→機能→身体', segments:[{role:'qualifier',suffix:'の'},{role:'target'},{role:'function'},{role:'body'}] },
        ],
      },
      {
        id:'content-facility', name:'内容物＋設備用途', roles:['content','facility'],
        variants:[
          { id:'content-facility', name:'内容→設備', segments:[{role:'content'},{role:'facility'}] },
          { id:'facility-content', name:'設備→内容', segments:[{role:'facility'},{role:'content'}] },
          { id:'content-no-facility', name:'内容の設備', segments:[{role:'content',suffix:'の'},{role:'facility'}] },
        ],
      },
    ],
    savedPhrases:[],
    recentPhrases:[],
  };
}

function normalizeAdultPhraseRemix(raw){
  const fallback = defaultAdultPhraseRemix();
  const parts = Array.isArray(raw && raw.parts) ? raw.parts.map(p=>({
    id:p.id||uid('phrasepart'),
    role:ADULT_PHRASE_ROLE_ORDER.includes(p.role)?p.role:'content',
    text:p.text||'',
    concept:p.concept||'',
    domains:Array.isArray(p.domains)?p.domains:[],
    tags:Array.isArray(p.tags)?p.tags:[],
    scores:{ dehumanize:1, objectify:1, contempt:1, vulgarity:1, eroticism:1, weirdness:1, ...(p.scores||{}) },
  })) : fallback.parts;

  // 旧版にはconceptが無いので、同じrole/textの初期部品があればconceptだけ補完する。
  const fallbackConceptByKey = new Map(fallback.parts.map(p=>[p.role+'\n'+p.text,p.concept||'']));
  parts.forEach(p=>{ if(!p.concept) p.concept = fallbackConceptByKey.get(p.role+'\n'+p.text) || p.text; });
  // v1→v2移行時だけ、新しい「元概念」用の標準部品を不足分だけ補う。
  // v2保存後は自動復活させないので、ユーザーが削除した部品はそのまま維持される。
  if(!raw || Number(raw.schemaVersion||1)<2){
    const seenParts = new Set(parts.map(p=>p.role+'\n'+p.text));
    fallback.parts.forEach(fp=>{
      if(!seenParts.has(fp.role+'\n'+fp.text)) parts.push({...fp,id:uid('phrasepart')});
    });
  }

  // 構文定義はUIから編集していないため、既知IDは最新版へ置き換えて安全に機能追加する。
  const fallbackPatternById = new Map(fallback.patterns.map(p=>[p.id,p]));
  let patterns = Array.isArray(raw && raw.patterns) && raw.patterns.length ? raw.patterns.map(p=>{
    if(fallbackPatternById.has(p.id)) return fallbackPatternById.get(p.id);
    const segs = Array.isArray(p.segments)?p.segments:[];
    return {
      ...p,
      roles:Array.isArray(p.roles)&&p.roles.length?p.roles:Array.from(new Set(segs.map(s=>s.role).filter(Boolean))),
      variants:Array.isArray(p.variants)&&p.variants.length?p.variants:[{id:(p.id||uid('pattern'))+'-default',name:'標準',segments:segs}],
    };
  }) : fallback.patterns;
  // 新規追加した標準パターンも旧保存データへ足す。
  const known = new Set(patterns.map(p=>p.id));
  fallback.patterns.forEach(p=>{ if(!known.has(p.id)) patterns.push(p); });

  const cleanPhraseList = (v) => Array.isArray(v) ? v.map(x=>({
    id:x.id||uid('phrase'), text:x.text||'', patternId:x.patternId||'', variantId:x.variantId||'', createdAt:x.createdAt||Date.now()
  })).filter(x=>x.text) : [];
  return { schemaVersion:2, parts, patterns, savedPhrases:cleanPhraseList(raw && raw.savedPhrases), recentPhrases:cleanPhraseList(raw && raw.recentPhrases).slice(0,20) };
}

function loadAdultPhraseRemix(){
  try{
    const raw = localStorage.getItem(ADULT_PHRASE_REMIX_KEY);
    if(raw!==null) return normalizeAdultPhraseRemix(JSON.parse(raw));
  }catch(e){}
  return defaultAdultPhraseRemix();
}

function saveAdultPhraseRemix(rd){
  try{ localStorage.setItem(ADULT_PHRASE_REMIX_KEY, JSON.stringify(rd)); }catch(e){}
}

/* ============ オノマトペ辞書（語句魔改造・表現辞典とは別データ） ============
   「音」だけに限定せず、現象を文章上どう表すかを保存する。
   categories は複数指定でき、「チュッ」のような接触音／口音／発声の境界語もそのまま扱う。 */
const ADULT_ONOMATOPOEIA_KEY = 'novel-world-builder-adult-onomatopoeia-v1';
const ONOMATOPOEIA_CATEGORIES = ['物理音','身体音','口音','擬態','生理反応','発声'];
const ONOMATOPOEIA_VOCALITY_LABELS = ['物理音','身体が出す音','声とも音とも取れる','明確な発声'];
const ONOMATOPOEIA_INTENTIONALITY = ['不問','無意識','意図的','両方'];
const ONOMATOPOEIA_LENGTHS = ['短','中','長'];
const ONOMATOPOEIA_REPETITIONS = ['単発','反復','連続','不規則'];

function makeOnomatopoeia(text, phenomenon, categories, sources, vocality, intentionality, strength, speed, length, repetition, tags, note){
  return { id:uid('onom'), text, phenomenon, categories, sources, vocality, intentionality, strength, speed, length, repetition, tags, note:note||'' };
}

function defaultAdultOnomatopoeia(){
  return { schemaVersion:1, entries:[
    makeOnomatopoeia('ズンズン','重く一定に往復・押進する',['擬態'],['動作'],0,'不問',4,3,'中','反復',['往復','重い','一定周期'],'奥方向へ重く進む感覚'),
    makeOnomatopoeia('ドンドン','強く衝突・打撃する',['物理音','擬態'],['接触面'],0,'不問',5,3,'短','反復',['衝突','打撃','強い'],'明確な衝撃が繰り返される'),
    makeOnomatopoeia('グッグッ','力を込めて短く押す',['擬態'],['動作'],0,'不問',4,2,'短','反復',['押す','密着','抵抗'],'力を込めた短い反復'),
    makeOnomatopoeia('スルスル','抵抗なく滑らかに出入りする',['擬態'],['接触面'],0,'不問',1,3,'中','連続',['滑る','出入り','低摩擦'],'軽く滑らかな連続運動'),
    makeOnomatopoeia('ヌルッ','湿った面を一度滑る・入る',['擬態'],['接触面'],0,'不問',2,3,'短','単発',['湿潤','滑る','挿入'],'一回の滑動'),
    makeOnomatopoeia('ドスッ','重いものが強く衝突・入る',['物理音','擬態'],['接触面'],0,'不問',5,4,'短','単発',['衝突','重い','挿入'],'重い単発衝撃'),
    makeOnomatopoeia('パンパン','表面同士が軽快に衝突する',['物理音','擬態'],['接触面'],0,'不問',4,4,'短','反復',['衝突','表面','高速'],'軽く乾いた連続衝撃'),
    makeOnomatopoeia('ビクビク','反射的に細かく収縮する',['擬態','生理反応'],['身体'],1,'無意識',3,5,'短','不規則',['痙攣','収縮','反射'],'不規則な反射運動'),
    makeOnomatopoeia('ピクピク','小さく反射的に収縮する',['擬態','生理反応'],['身体'],1,'無意識',1,5,'短','不規則',['痙攣','収縮','小さい'],'小さな反射運動'),
    makeOnomatopoeia('ぐちゅぐちゅ','水分を含むものが反復して攪拌される',['物理音','擬態'],['液体','接触面'],0,'不問',3,3,'中','反復',['水分','粘度','攪拌'],'水分量が多く粘りのある反復'),
    makeOnomatopoeia('ぬちゅぬちゅ','粘着性のある湿った面が反復する',['物理音','擬態'],['液体','接触面'],0,'不問',3,2,'中','反復',['水分','高粘度','粘着'],'粘度と密着感が強い'),
    makeOnomatopoeia('ゴクッ','喉が一度鳴る／息を呑む',['身体音','擬態','生理反応'],['喉'],1,'無意識',2,3,'短','単発',['嚥下','緊張','喉'],'実音と心理表現の両方に使える'),
    makeOnomatopoeia('チュッ','唇が触れる、または口で音を作る',['物理音','身体音','口音','発声'],['口','唇'],2,'両方',1,3,'短','単発',['接触','キス','口音'],'接触音・意図的な口音・セリフ内表現の境界語'),
    makeOnomatopoeia('んっ','息や声が短く漏れる',['身体音','発声'],['口','喉'],3,'両方',1,3,'短','単発',['息','声','短い'],'文脈により反射音にも意図的な声にもなる'),
  ]};
}

function normalizeAdultOnomatopoeia(raw){
  const entries = Array.isArray(raw&&raw.entries) ? raw.entries : defaultAdultOnomatopoeia().entries;
  return { schemaVersion:1, entries:entries.map(x=>({
    id:x.id||uid('onom'), text:x.text||'', phenomenon:x.phenomenon||'',
    categories:Array.isArray(x.categories)?x.categories:[], sources:Array.isArray(x.sources)?x.sources:[],
    vocality:clamp(Number.isFinite(Number(x.vocality))?Math.round(Number(x.vocality)):0,0,3),
    intentionality:ONOMATOPOEIA_INTENTIONALITY.includes(x.intentionality)?x.intentionality:'不問',
    strength:clamp(Number.isFinite(Number(x.strength))?Math.round(Number(x.strength)):3,1,5),
    speed:clamp(Number.isFinite(Number(x.speed))?Math.round(Number(x.speed)):3,1,5),
    length:ONOMATOPOEIA_LENGTHS.includes(x.length)?x.length:'短',
    repetition:ONOMATOPOEIA_REPETITIONS.includes(x.repetition)?x.repetition:'単発',
    tags:Array.isArray(x.tags)?x.tags:[], note:x.note||'',
  })).filter(x=>x.text)};
}

function loadAdultOnomatopoeia(){
  try{ const raw=localStorage.getItem(ADULT_ONOMATOPOEIA_KEY); if(raw!==null) return normalizeAdultOnomatopoeia(JSON.parse(raw)); }catch(e){}
  return defaultAdultOnomatopoeia();
}
function saveAdultOnomatopoeia(data){
  try{ localStorage.setItem(ADULT_ONOMATOPOEIA_KEY,JSON.stringify(data)); }catch(e){}
}

/* ============ シーン進行（語句魔改造・各辞書とは別データ） ============
   濡れ場を段階ごとに見渡し、動作だけでなく反応・感覚・心理・関係性・会話・状況・つなぎを選ぶ。
   selectedItemIds は「今回の流れ」。辞書項目そのものは items に一度だけ保存する。 */
const ADULT_SCENE_FLOW_KEY = 'novel-world-builder-adult-scene-flow-v1';
const SCENE_FLOW_KINDS = ['動作','身体反応','感覚','心理','関係性','会話','状況','描写の焦点','つなぎ','オノマトペ'];
const DEFAULT_SCENE_FLOW_PHASES = [
  {id:'intro',name:'導入'},{id:'touch',name:'接触・愛撫'},{id:'prepare',name:'準備'},{id:'insert',name:'挿入'},
  {id:'motion',name:'往復'},{id:'intensify',name:'激化'},{id:'climax',name:'絶頂'},{id:'after',name:'事後'},
];
function makeSceneFlowItem(phaseId,kind,text,note,tags){ return {id:uid('flowitem'),phaseId,kind,text,note:note||'',tags:Array.isArray(tags)?tags:[]}; }
function defaultAdultSceneFlow(){
  return {schemaVersion:1,phases:DEFAULT_SCENE_FLOW_PHASES.map(x=>({...x})),items:[
    makeSceneFlowItem('intro','心理','この場面で二人の関係をどう変えるか決める','行為そのものではなく、終了時に何が変わっているかを置く',['目的','変化']),
    makeSceneFlowItem('intro','状況','場所・時間・中断される可能性を示す','閉鎖空間、任務後、時間制限など',['舞台','緊張']),
    makeSceneFlowItem('intro','関係性','どちらが最初の一歩を踏み出すか決める','主導権が普段と違うだけでも場面に変化が出る',['主導権']),
    makeSceneFlowItem('touch','動作','距離を縮め、最初の接触を作る','手、頬、髪、衣服など接触点を一つ選ぶ',['接触']),
    makeSceneFlowItem('touch','身体反応','接触された側の呼吸や姿勢が変わる','小さな反応を先に置くと段階が見えやすい',['呼吸','姿勢']),
    makeSceneFlowItem('touch','描写の焦点','視線・指先・表情のどれかへ寄る','全身を同時に説明しない',['視線','手','表情']),
    makeSceneFlowItem('prepare','感覚','熱・濡れ・摩擦・圧迫の状態を一つ示す','後の変化と比較できる基準になる',['熱','濡れ','摩擦']),
    makeSceneFlowItem('prepare','会話','続けてよいか、何を望んでいるかを伝える','直接確認でも、反応を読む形でもよい',['確認','要求']),
    makeSceneFlowItem('prepare','心理','期待と緊張を同時に置く','感情を一色にしない',['期待','緊張']),
    makeSceneFlowItem('insert','動作','一度に進めず、接触・進入・静止に分ける','動作を細分化して反応を挟む',['挿入','静止']),
    makeSceneFlowItem('insert','身体反応','息を止める、強張る、力が抜ける','反応の変化で進行を見せる',['呼吸','緊張']),
    makeSceneFlowItem('insert','つなぎ','静止して慣らした後、少し戻して動き始める','挿入から往復への理由を作る',['静止','慣らす']),
    makeSceneFlowItem('motion','動作','速さ・強さ・深さのうち一つだけ変える','一度に全部変えず差を見せる',['往復','変化']),
    makeSceneFlowItem('motion','身体反応','声・呼吸・表情・手足から一つ選ぶ','毎段落で同じ反応を使わない',['反応']),
    makeSceneFlowItem('motion','関係性','相手の反応を見て加減や主導権を変える','動作を二人のやり取りにする',['主導権','反応']),
    makeSceneFlowItem('motion','描写の焦点','身体以外の音・寝具・室温も一度挟む','描写の距離を変えて単調さを切る',['環境','音']),
    makeSceneFlowItem('intensify','動作','速度・強度・体勢の変化を明確にする','前段階との差が分かるようにする',['加速','激化']),
    makeSceneFlowItem('intensify','心理','余裕が失われる瞬間を置く','考えられなくなる、言葉が短くなるなど',['余裕の消失']),
    makeSceneFlowItem('intensify','会話','要求・名前・短い制止を使う','長い会話より切れた言葉が合う',['要求','名前']),
    makeSceneFlowItem('climax','身体反応','収縮・震え・呼吸・脱力を時間差で描く','すべて同時に起こさず順番を作る',['絶頂','反応']),
    makeSceneFlowItem('climax','関係性','相手がその反応をどう受け止めるか描く','達した事実だけで終わらせない',['関係変化']),
    makeSceneFlowItem('climax','つなぎ','急停止・減速・抱き留める動作へ移る','頂点から事後への落差を作る',['減速','静止']),
    makeSceneFlowItem('after','身体反応','乱れた呼吸、汗、脱力、残る震えを選ぶ','全部盛りにせず一つか二つに絞る',['余韻','呼吸']),
    makeSceneFlowItem('after','会話','直後だから言える一言を置く','冗談、確認、名前、沈黙でもよい',['余韻','会話']),
    makeSceneFlowItem('after','関係性','始まる前と何が変わったか示す','距離、信頼、気まずさ、独占欲など',['変化','関係性']),
  ],selectedItemIds:[],plans:[],activePlanId:null};
}
function normalizeAdultSceneFlow(raw){
  const fallback=defaultAdultSceneFlow();
  const phases=Array.isArray(raw&&raw.phases)&&raw.phases.length?raw.phases.map((x,i)=>({id:x.id||uid('flowphase'),name:x.name||`段階${i+1}`})):fallback.phases;
  const phaseIds=new Set(phases.map(x=>x.id));
  const items=(Array.isArray(raw&&raw.items)?raw.items:fallback.items).map(x=>({
    id:x.id||uid('flowitem'),phaseId:phaseIds.has(x.phaseId)?x.phaseId:phases[0].id,
    kind:SCENE_FLOW_KINDS.includes(x.kind)?x.kind:'動作',text:x.text||'',note:x.note||'',tags:Array.isArray(x.tags)?x.tags:[],
  })).filter(x=>x.text);
  const itemIds=new Set(items.map(x=>x.id));
  const selectedItemIds=Array.isArray(raw&&raw.selectedItemIds)?raw.selectedItemIds.filter(id=>itemIds.has(id)):[];

  // 進行表（行為カードを自由に並べる、複数保存できる道具）。既存のitems/phases/selectedItemIdsとは独立したデータ。
  let plans;
  if(raw && Array.isArray(raw.plans)){
    plans = raw.plans.map(p=>({
      id: p.id||uid('flowplan'),
      title: String(p.title||'無題の進行表'),
      beforeState: String(p.beforeState||''),
      afterState: String(p.afterState||''),
      cards: Array.isArray(p.cards) ? p.cards.map(c=>({id:c.id||uid('flowcard'),name:String(c.name||''),memo:String(c.memo||'')})) : [],
    }));
  } else {
    // plansフィールドを持たない旧データ。既存の「今回の流れ」（selectedItemIds）があれば内容を失わないよう
    // 1件の進行表として引き継ぐ（カード名＝内容、メモ＝補足）。items/phases/selectedItemIds自体は削除しない。
    plans = selectedItemIds.length ? [{
      id: uid('flowplan'), title: '旧データから引き継いだ進行表', beforeState:'', afterState:'',
      cards: selectedItemIds.map(id=>items.find(x=>x.id===id)).filter(Boolean).map(x=>({id:uid('flowcard'),name:x.text,memo:x.note||''})),
    }] : [];
  }
  const planIds = new Set(plans.map(p=>p.id));
  const activePlanId = (raw && planIds.has(raw.activePlanId)) ? raw.activePlanId : (plans[0] ? plans[0].id : null);

  return {schemaVersion:1,phases,items,selectedItemIds,plans,activePlanId};
}
function loadAdultSceneFlow(){
  try{const raw=localStorage.getItem(ADULT_SCENE_FLOW_KEY);if(raw!==null)return normalizeAdultSceneFlow(JSON.parse(raw));}catch(e){}
  return defaultAdultSceneFlow();
}
function saveAdultSceneFlow(data){try{localStorage.setItem(ADULT_SCENE_FLOW_KEY,JSON.stringify(data));}catch(e){}}

