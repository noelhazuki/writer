/* ============ 汎用シーン設計・物語パターン ============ */
const GENERAL_SCENE_KEY='novel-world-builder-general-scenes-v1';
const STORY_PATTERN_KEY='novel-world-builder-story-patterns-v1';
const SCENE_START_MODES=['冒頭から','途中から','結果から','回想から'];
const SCENE_TEMPLATES=[
  {id:'basic',name:'基本の変化',beats:[['開始状態','場面開始時の人物・状況を短く示す'],['きっかけ','平衡を崩す出来事を起こす'],['反応','人物がどう受け止めたか見せる'],['選択','人物に行動を選ばせる'],['変化','選択によって状況か関係を変える'],['余韻','次の場面へ残すものを置く']]},
  {id:'inmedias',name:'途中から始める',beats:[['異常の只中','すでに動いている状況・行為・危機から始める'],['現在地','誰が何をしているか最低限だけ分からせる'],['小さな転換','優勢・感情・目的のどれかを変える'],['必要な背景','現在の判断に必要な過去だけ差し込む'],['決着または中断','この場面の小さな問いに答える'],['次の疑問','なぜこうなったか、次に何が起きるかを残す']]},
  {id:'request',name:'依頼・仕事回',beats:[['日常の提示','普段の仕事ぶりやチームの空気を見せる'],['依頼の持込','依頼人・報酬・困り事を提示する'],['条件確認','制約、期限、裏の事情を探る'],['現地行動','役割分担して仕事を進める'],['想定外','依頼の説明と違う事実を出す'],['解決と代償','仕事を終え、損得や関係の変化を示す'],['帰還','日常へ戻しつつ長期の種を残す']]},
  {id:'daily',name:'日常・船内回',beats:[['日課','いつもの暮らしと役割を見せる'],['小さな問題','故障、食事、当番、勘違いなどを起こす'],['巻き込み','別の人物が関わって問題が広がる'],['本音の露出','普段隠れている好意や不満を一瞬見せる'],['収束','大事にはせず、その人物らしい方法で片づける'],['関係の一歩','以前と少し違う距離感を残す']]},
  {id:'investigation',name:'調査・謎解き',beats:[['謎の提示','異常、被害、矛盾を具体的に示す'],['仮説','現時点のもっともらしい説明を立てる'],['情報収集','証言・現場・記録から手掛かりを得る'],['反証','最初の仮説に合わない事実を出す'],['再解釈','既出情報の意味を組み替える'],['対決・検証','真相を行動で確かめる'],['新しい余白','解決した範囲と残った謎を分ける']]},
  {id:'conversation',name:'会話・交渉',beats:[['表向きの用件','二人が話す名目を置く'],['探り合い','質問、沈黙、言い換えで本音を探る'],['圧力','断れない事情や感情を強める'],['漏れる本音','意図せず核心の一部が出る'],['応答の選択','受容、拒否、保留、条件提示を選ぶ'],['新しい距離','会話前との関係差を動作で示す']]},
  {id:'melee',name:'接近戦',beats:[['間合い','位置、構え、勝敗条件を示す'],['初手','得意技や性格が出る攻防を置く'],['読み合い','癖、誘い、対策をぶつける'],['主導権交代','一度優劣を逆転させる'],['切り札と代償','勝つために危険や消耗を引き受ける'],['決着','勝敗と身体・関係への影響を残す']]},
  {id:'gunfight',name:'銃撃戦',beats:[['位置関係','遮蔽物、射線、出口、守る対象を示す'],['接敵','誰が先に相手を発見したか決める'],['制圧','撃つ目的を命中以外にも置く'],['移動の隙','弾切れ、視界不良、陽動で位置を変える'],['側面・突破','射線の組み替えで均衡を崩す'],['離脱か確保','敵を倒す以外も含め目的を達成する']]},
  {id:'romance',name:'恋愛・関係進展',beats:[['現在の距離','二人が今どこまで近いか見せる'],['特別扱い','他人とは違う反応や行動を一つ置く'],['すれ違い','欲しいものと表向きの態度をずらす'],['弱さの露出','秘密、不安、嫉妬などを見せる'],['選択的な接近','片方が小さく踏み込む'],['未完の変化','結論を急がず、以前には戻れない差を残す']]},
  {id:'comedy',name:'コメディ',beats:[['平常','基準となる普通の状態を置く'],['ズレ','人物の勘違いか価値観の差を出す'],['反復と拡大','同じズレを条件を変えて繰り返す'],['最悪化','もっとも困る相手や状況を合流させる'],['落ち','前振りを別の意味で回収する'],['後始末','被害やしこりを短く残す']]},
];
function newSceneFromTemplate(templateId='basic',title='新しいシーン'){
  const t=SCENE_TEMPLATES.find(x=>x.id===templateId)||SCENE_TEMPLATES[0];
  return{id:uid('scene'),title,templateId:t.id,startMode:'冒頭から',purpose:'',startState:'',endState:'',sceneRole:'本筋',location:'',pov:'',timeRelation:'直後',referenceSceneId:'',readerInfo:'',characterInfo:'',returnToMain:false,outlineItemId:'',beats:t.beats.map(x=>({id:uid('beat'),stage:x[0],prompt:x[1],note:'',done:false})),createdAt:Date.now()};
}
function defaultGeneralScenes(){const first=newSceneFromTemplate('basic','シーン案1');return{schemaVersion:1,scenes:[first],activeSceneId:first.id};}
function normalizeGeneralScenes(raw){
  const scenes=(Array.isArray(raw&&raw.scenes)?raw.scenes:[]).map((s,i)=>({id:s.id||uid('scene'),title:s.title||`シーン案${i+1}`,templateId:s.templateId||'basic',startMode:SCENE_START_MODES.includes(s.startMode)?s.startMode:'冒頭から',purpose:s.purpose||'',startState:s.startState||'',endState:s.endState||'',sceneRole:s.sceneRole||'本筋',location:s.location||'',pov:s.pov||'',timeRelation:s.timeRelation||'直後',referenceSceneId:s.referenceSceneId||'',readerInfo:s.readerInfo||'',characterInfo:s.characterInfo||'',returnToMain:!!s.returnToMain,outlineItemId:s.outlineItemId||'',createdAt:s.createdAt||Date.now(),beats:(Array.isArray(s.beats)?s.beats:[]).map(b=>({id:b.id||uid('beat'),stage:b.stage||'工程',prompt:b.prompt||'',note:b.note||'',done:!!b.done}))}));
  if(!scenes.length)return defaultGeneralScenes();
  return{schemaVersion:1,scenes,activeSceneId:scenes.some(s=>s.id===(raw&&raw.activeSceneId))?raw.activeSceneId:scenes[0].id};
}
function loadGeneralScenes(){try{const r=localStorage.getItem(GENERAL_SCENE_KEY);if(r!==null)return normalizeGeneralScenes(JSON.parse(r));}catch(e){}return defaultGeneralScenes();}
function saveGeneralScenes(d){try{localStorage.setItem(GENERAL_SCENE_KEY,JSON.stringify(d));}catch(e){}}

/* ============ 全体構成ボード ============
   作品→構成ブロック→出来事の3階層。出来事は詳細シーンを参照できるが、未確定メモのままでも保持する。 */
const STORY_OUTLINE_KEY='novel-world-builder-story-outlines-v1';
const OUTLINE_ITEM_TYPES=['個別シーン','出来事','関係進展','伏線','真相開示','濡れ場','幕間','一方その頃','回想','未分類'];
const OUTLINE_TIME_RELATIONS=['直後','同時刻','少し前','少し後','過去','時系列不明'];
const OUTLINE_ADULT_ROLES=['関係開始','処置','信頼形成','嫉妬の発生','独占欲の露出','情報獲得','潜入・任務','敵による攻撃','関係悪化','仲直り','感情の自覚','支配関係の変化','伏線','単純な快楽・日常','その他'];
const OUTLINE_TONES=['抑制的','成人向け小説の中間帯','直接的','俗悪・下品','医学・研究寄り','上品・婉曲'];
function newOutlineAdult(){return{enabled:false,reason:'',storyRole:'',relationshipEffect:'',beforeRelation:'',afterRelation:'',pretext:'',trueFeeling:'',initiator:'',consentState:'',tone:'成人向け小説の中間帯',narrationVulgarity:3,dialogueVulgarity:3,nextResidue:''};}
function newOutlineItem(title='新しい出来事'){return{id:uid('outlineitem'),title,type:'出来事',summary:'',location:'',pov:'',timeRelation:'直後',referenceItemId:'',readerInfo:'',characterInfo:'',returnToMain:false,sceneId:'',adult:newOutlineAdult()};}
function newOutlineBlock(title='新しい構成ブロック'){return{id:uid('outlineblock'),title,purpose:'',startState:'',endState:'',reveals:'',hides:'',collapsed:false,items:[]};}
function newStoryOutline(title='新しい作品構成'){return{id:uid('outline'),title,start:'',ending:'',finalBoss:'',centralConflict:'',protagonistStart:'',protagonistEnd:'',heroineStart:'',heroineEnd:'',fixedFacts:'',openQuestions:'',blocks:[newOutlineBlock('導入')]};}
function defaultStoryOutlines(){const p=newStoryOutline('作品構成1');return{schemaVersion:1,projects:[p],activeProjectId:p.id};}
function normalizeOutlineAdult(a){const d=newOutlineAdult(),x=a||{};return{...d,...x,enabled:!!x.enabled,narrationVulgarity:clamp(Number(x.narrationVulgarity)||3,1,5),dialogueVulgarity:clamp(Number(x.dialogueVulgarity)||3,1,5)};}
function normalizeStoryOutlines(raw){
  const projects=(Array.isArray(raw&&raw.projects)?raw.projects:[]).map((p,pi)=>({
    id:p.id||uid('outline'),title:p.title||`作品構成${pi+1}`,start:p.start||'',ending:p.ending||'',finalBoss:p.finalBoss||'',centralConflict:p.centralConflict||'',protagonistStart:p.protagonistStart||'',protagonistEnd:p.protagonistEnd||'',heroineStart:p.heroineStart||'',heroineEnd:p.heroineEnd||'',fixedFacts:p.fixedFacts||'',openQuestions:p.openQuestions||'',
    blocks:(Array.isArray(p.blocks)?p.blocks:[]).map((b,bi)=>({id:b.id||uid('outlineblock'),title:b.title||`構成ブロック${bi+1}`,purpose:b.purpose||'',startState:b.startState||'',endState:b.endState||'',reveals:b.reveals||'',hides:b.hides||'',collapsed:!!b.collapsed,items:(Array.isArray(b.items)?b.items:[]).map((it,ii)=>({id:it.id||uid('outlineitem'),title:it.title||`出来事${ii+1}`,type:OUTLINE_ITEM_TYPES.includes(it.type)?it.type:'出来事',summary:it.summary||'',location:it.location||'',pov:it.pov||'',timeRelation:OUTLINE_TIME_RELATIONS.includes(it.timeRelation)?it.timeRelation:'直後',referenceItemId:it.referenceItemId||'',readerInfo:it.readerInfo||'',characterInfo:it.characterInfo||'',returnToMain:!!it.returnToMain,sceneId:it.sceneId||'',adult:normalizeOutlineAdult(it.adult)}))}))
  }));
  if(!projects.length)return defaultStoryOutlines();
  return{schemaVersion:1,projects,activeProjectId:projects.some(p=>p.id===(raw&&raw.activeProjectId))?raw.activeProjectId:projects[0].id};
}
function loadStoryOutlines(){try{const r=localStorage.getItem(STORY_OUTLINE_KEY);if(r!==null)return normalizeStoryOutlines(JSON.parse(r));}catch(e){}return defaultStoryOutlines();}
function saveStoryOutlines(d){try{localStorage.setItem(STORY_OUTLINE_KEY,JSON.stringify(d));}catch(e){}}

function makeStoryPattern(id,name,category,scale,core,steps,strengths,pitfalls,examples,tags){return{id,name,category,scale,core,steps,strengths,pitfalls,examples,tags};}
function defaultStoryPatterns(){return{schemaVersion:1,patterns:[
  makeStoryPattern('request-series','依頼をこなしながら大筋へ収束','連作・仕事','シリーズ','毎回の依頼を一話の満足にしつつ、依頼同士の共通点から大きな敵や事件を浮かべる。',['チームの日常と仕事の型を見せる','一話完結の依頼を処理する','背景に共通する名前・組織・技術を反復する','個人回で仲間の過去と大筋を接続する','複数の依頼が一つの問題だったと判明する','チーム全員の役割を使って長編を決着させる'],['キャラクターを仕事ぶりで紹介できる','日常・コメディ・シリアスを混在させやすい'],['伏線が弱いと短編集に見える','毎回同じ受付と解決になりやすい'],['銀魂','文豪ストレイドッグス','GetBackers'],['依頼','群像','長編収束']),
  makeStoryPattern('episodic-past','日常任務と個人の過去','旅・群像','シリーズ','現在の仕事は一話ごとに完結させ、登場人物それぞれの過去だけが長期的な重力として残る。',['現在のチームを完成形に近い状態で見せる','任務ごとに人物の価値観を試す','過去を説明せず反応の違和感として置く','過去の関係者を現在の任務へ侵入させる','逃げていた選択を本人にやり直させる','全員の問題を一つに統合しすぎず余韻を残す'],['雰囲気と人物の余白が強くなる','大きな敵が常時いなくても続けられる'],['本筋を求める読者には停滞に見える','過去回だけ重くなりやすい'],['カウボーイビバップ','シティーハンター'],['過去','一話完結','余韻']),
  makeStoryPattern('case-conspiracy','事件群から巨大な陰謀へ','調査・政治','長編','独立した事件を解決するほど、制度や社会全体に埋まった共通原因が見えてくる。',['小さな事件で世界の通常運転を示す','事件に説明しきれない共通項を残す','別視点の事件で共通項の意味を変える','組織内外の利害対立を明らかにする','主人公側の正義にも欠点を突きつける','真相の暴露と社会的な決着を分ける'],['世界設定がそのままドラマになる','敵を単純な悪にせず描ける'],['固有名詞と説明が増えやすい','真相だけで人物の選択が弱いと冷たくなる'],['攻殻機動隊 STAND ALONE COMPLEX'],['陰謀','捜査','社会']),
  makeStoryPattern('threshold-school','抑圧された日常から別世界へ','成長・学園','一巻・長編','居場所のない主人公に新世界への招待を与え、仲間・ライバル・謎を段階的に紹介する。',['息苦しい日常と欠落を示す','説明不能な兆候を重ねる','案内役が境界を越えさせる','新世界の驚きとルールを体験させる','仲間とライバルを行動で紹介する','小さな勝利の裏に長期の謎を残す'],['読者が主人公と一緒に世界を学べる','人物登場の順序を整理しやすい'],['導入説明が長くなりやすい','案内役が説明装置になりやすい'],['ハリー・ポッターと賢者の石'],['導入','成長','世界案内']),
  makeStoryPattern('strong-duo-mystery','完成された主従・相棒から秘密を剥がす','関係・事件','シリーズ','強い関係性と能力を先に実演し、二人がそうなった理由や契約の代償は後から明かす。',['二人の普段の役割分担を実演する','外部の事件で能力差と信頼を見せる','一方だけが知る秘密を匂わせる','関係を壊し得る人物を投入する','契約・過去の意味を再解釈する','現在の二人が関係を選び直す'],['最初からキャラを立てやすい','経歴説明を遅らせられる'],['無敵に見えると危機感が薄い','秘密の引延ばしだけになる危険がある'],['黒執事'],['相棒','主従','秘密']),
  makeStoryPattern('domestic-cosmic','共同生活から宇宙規模へ','日常・群像','シリーズ','同居や船内生活の小問題で人物を好きにさせ、その人物の出自が大事件へつながる。',['生活上の衝突から人物を紹介する','新しい同居人を一人ずつ加える','日常回で役割と相性を固定する','出自や身分が外部勢力を呼び込む','家族的な居場所と公的責任を衝突させる','世界よりも一緒にいる選択を決着にする'],['大人数でも関係から覚えられる','壮大さと親密さを両立できる'],['加入が続くと既存人物が薄くなる','危機の後に日常へ戻す工夫が必要'],['天地無用！','Firefly'],['共同生活','宇宙','家族']),
  makeStoryPattern('journey-escalation','旅先の騒動が世界の危機へ拡大','冒険・コメディ','長編','目先の金やトラブルから始まり、旅先ごとの事件がより大きな敵へ段階的につながる。',['軽い目的で旅を始める','土地固有の騒動へ巻き込まれる','仲間の能力と欠点で解決する','敵の背後に上位の存在を示す','個人的な因縁と世界の危機を重ねる','重い決戦後、日常的な欲望へ着地する'],['シリアスの後に明るさを戻せる','舞台を変えてマンネリを防げる'],['敵の規模が際限なく膨らみやすい','偶然の巻き込まれが続くと受動的になる'],['スレイヤーズ','トライガン'],['旅','冒険','段階拡大']),
  makeStoryPattern('loop-relationship','失敗の反復で関係を再解釈','心理・成長','長編','同じ危機へ何度も挑み、攻略情報よりも他者理解と主人公の思い込みの修正を進歩として描く。',['最初の失敗で問題の苛烈さを示す','情報を持って再挑戦する','知識だけでは他人を動かせず失敗する','助けを求めることを主人公に選ばせる','別人物の事情から過去の場面を再解釈する','関係の変化によって同じ局面を突破する'],['関係構築を劇的な進歩として描ける','既出場面に新しい意味を与えられる'],['反復ごとの差が弱いと冗長になる','苦痛が続き読者が疲れやすい'],['Re:ゼロから始める異世界生活'],['反復','関係','再解釈']),
  makeStoryPattern('clear-progression','数値的成長と定期的な達成','成長・アクション','シリーズ','目標・障害・報酬を明確にし、能力の更新が次の難題を解く快感へ直結する。',['弱さや制限を具体的に示す','達成可能な短期目標を置く','訓練・攻略・報酬を結びつける','新能力を見せる試験を用意する','格上との遭遇で次の天井を示す','成長の代償や周囲との距離を問題にする'],['読者が進捗を把握しやすい','見せ場の間隔を設計しやすい'],['数字だけ進むと人物が薄くなる','周囲が驚くだけの反応役になりやすい'],['俺だけレベルアップな件'],['成長','達成','能力']),
  makeStoryPattern('case-slow-romance','事件解決と低速の恋愛進展','謎解き・恋愛','シリーズ','主人公の専門性で小事件を解き、恋愛相手との温度差を各話の副進行として少しずつ変える。',['主人公の強い興味と観察眼を見せる','身近な謎で能力を実演する','相手が主人公を特別扱いする','主人公は別の目的を優先する','事件が身分・過去・政治へ接続する','好意の理解と受容を別々の段階で進める'],['事件と恋愛が互いの休憩になる','全員の経歴を早期説明せずに済む'],['恋愛の足踏みが同じ形になりやすい','有能さが便利な解決装置になりやすい'],['薬屋のひとりごと'],['事件','専門家','温度差恋愛']),
]};}
function normalizeStoryPatterns(raw){const f=defaultStoryPatterns();const rows=Array.isArray(raw&&raw.patterns)?raw.patterns:f.patterns;return{schemaVersion:1,patterns:rows.map((p,i)=>({id:p.id||uid('pattern'),name:p.name||`パターン${i+1}`,category:p.category||'未分類',scale:p.scale||'',core:p.core||'',steps:Array.isArray(p.steps)?p.steps.map(String):[],strengths:Array.isArray(p.strengths)?p.strengths.map(String):[],pitfalls:Array.isArray(p.pitfalls)?p.pitfalls.map(String):[],examples:Array.isArray(p.examples)?p.examples.map(String):[],tags:Array.isArray(p.tags)?p.tags.map(String):[]}))};}
function loadStoryPatterns(){try{const r=localStorage.getItem(STORY_PATTERN_KEY);if(r!==null)return normalizeStoryPatterns(JSON.parse(r));}catch(e){}return defaultStoryPatterns();}
function saveStoryPatterns(d){try{localStorage.setItem(STORY_PATTERN_KEY,JSON.stringify(d));}catch(e){}}

