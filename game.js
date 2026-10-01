/* =========================================================
   炸金花 · 牌场风云 v5
   新增：生死场（无上限）
   ========================================================= */

const SAVE_KEY='zjh_caipiao_save_v5';
const MAX_ACTIONS=60;   // 无上限场需要更多行动次数上限
const SUIT_CHARS=['♠','♥','♦','♣'];
const RANK_CHARS={2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'J',12:'Q',13:'K',14:'A'};
const HAND_NAMES={6:'豹子',5:'顺金',4:'金花',3:'顺子',2:'对子',1:'单张'};

const MINE_COOLDOWN=2000,MINE_BASE=8,MINE_LV_FACTOR=11,MINE_CRIT_CHANCE=0.05,MINE_CRIT_MULT=4,MINE_LV_UP_EVERY=40,MINE_LV_CAP=400;

const PULL_COST_1=150,PULL_COST_10=1500,PITY_SMALL=50,PITY_BIG=150;
const RARITY_WEIGHT={common:600,rare:280,epic:90,legendary:25,mythic:5};
const RARITY_NAMES={common:'普通',rare:'稀有',epic:'史诗',legendary:'传说',mythic:'神话'};
const RARITY_DISMANTLE={common:10,rare:40,epic:160,legendary:600,mythic:2400};

const ITEMS=[
{id:'cb_default',name:'经典蓝',type:'cardBack',rarity:'common',price:0,icon:'🎴'},
{id:'cb_red',name:'烈焰红',type:'cardBack',rarity:'rare',price:1000,icon:'🔴'},
{id:'cb_green',name:'翡翠绿',type:'cardBack',rarity:'rare',price:1000,icon:'🟢'},
{id:'cb_purple',name:'紫罗兰',type:'cardBack',rarity:'epic',price:3200,icon:'🟣'},
{id:'cb_gold',name:'黄金典藏',type:'cardBack',rarity:'epic',price:3200,icon:'🟡'},
{id:'cb_dragon',name:'龙纹',type:'cardBack',rarity:'legendary',price:9800,icon:'🐉'},
{id:'cb_phoenix',name:'凤凰涅槃',type:'cardBack',rarity:'legendary',price:9800,icon:'🔥'},
{id:'cb_cosmic',name:'星河',type:'cardBack',rarity:'mythic',price:32000,icon:'🌌'},
{id:'tb_default',name:'经典绿呢',type:'tableBg',rarity:'common',price:0,icon:'🟩'},
{id:'tb_blue',name:'深海蓝',type:'tableBg',rarity:'rare',price:1200,icon:'🟦'},
{id:'tb_wood',name:'檀木',type:'tableBg',rarity:'rare',price:1200,icon:'🪵'},
{id:'tb_neon',name:'霓虹夜',type:'tableBg',rarity:'epic',price:3600,icon:'💜'},
{id:'tb_royal',name:'皇室金',type:'tableBg',rarity:'epic',price:3600,icon:'👑'},
{id:'tb_dragon',name:'龙宫',type:'tableBg',rarity:'legendary',price:10800,icon:'🐲'},
{id:'tb_cosmic',name:'宇宙',type:'tableBg',rarity:'mythic',price:36000,icon:'🌠'},
{id:'af_default',name:'无框',type:'avatarFrame',rarity:'common',price:0,icon:'⭕'},
{id:'af_bronze',name:'青铜',type:'avatarFrame',rarity:'rare',price:800,icon:'🥉'},
{id:'af_silver',name:'白银',type:'avatarFrame',rarity:'rare',price:800,icon:'🥈'},
{id:'af_gold',name:'黄金',type:'avatarFrame',rarity:'epic',price:2800,icon:'🥇'},
{id:'af_rainbow',name:'彩虹',type:'avatarFrame',rarity:'legendary',price:8600,icon:'🌈'},
{id:'af_king',name:'王冠',type:'avatarFrame',rarity:'mythic',price:28000,icon:'👑'}
];
const ITEM_MAP={};ITEMS.forEach(it=>ITEM_MAP[it.id]=it);
const GACHA_POOL=ITEMS.filter(it=>it.price>0);

const RECHARGE_TIERS=[
{id:'t6',price:6,coupon:60,bonus:0,icon:'💎'},
{id:'t30',price:30,coupon:300,bonus:0,icon:'💎'},
{id:'t68',price:68,coupon:680,bonus:30,icon:'💠'},
{id:'t128',price:128,coupon:1280,bonus:80,icon:'💠'},
{id:'t328',price:328,coupon:3280,bonus:280,icon:'🔮'},
{id:'t648',price:648,coupon:6480,bonus:680,icon:'👑'}
];

const LOAN_TIERS=[
{id:'gaolidai',name:'高利贷',icon:'💸',principal:1000,rate:0.30,term:10,color:'#84cc16',desc:'门槛最低，利息温和'},
{id:'sishen',name:'死神贷',icon:'💀',principal:5000,rate:0.60,term:15,color:'#22c55e',desc:'死神镰刀已举起'},
{id:'yanwang',name:'阎王贷',icon:'👻',principal:20000,rate:1.00,term:20,color:'#06b6d4',desc:'阎王要你三更死'},
{id:'mingwang',name:'冥王贷',icon:'🔥',principal:80000,rate:1.50,term:25,color:'#3b82f6',desc:'冥界之火燃烧'},
{id:'shenwang',name:'神王贷',icon:'⚡',principal:300000,rate:2.00,term:30,color:'#a855f7',desc:'神王之力加持'},
{id:'wudi',name:'无敌贷',icon:'🛡️',principal:1000000,rate:2.80,term:35,color:'#ec4899',desc:'无敌也会破产'},
{id:'shenming',name:'神明贷',icon:'🌟',principal:5000000,rate:3.80,term:40,color:'#f59e0b',desc:'神明也要还债'},
{id:'wangzhe',name:'王者贷',icon:'👑',principal:20000000,rate:5.00,term:50,color:'#f43f5e',desc:'王者一借，倾家荡产'}
];

/* ===== 牌场配置 ===== */
/* maxBet 使用 Infinity 表示无上限 */
const ROOMS=[
{id:'novice',name:'初级场',icon:'🌱',buyIn:500,baseBet:10,maxBet:300,aiLevel:1,color:'#4ade80',desc:'新手练习 · 人机温和好欺负'},
{id:'advanced',name:'高级场',icon:'⚔️',buyIn:2000,baseBet:30,maxBet:1000,aiLevel:2,color:'#60a5fa',desc:'进阶对局 · 人机开始动脑子'},
{id:'master',name:'大师场',icon:'🎯',buyIn:8000,baseBet:100,maxBet:3000,aiLevel:3,color:'#c084fc',desc:'高手过招 · 会算牌会诈唬'},
{id:'legend',name:'传奇场',icon:'🔥',buyIn:30000,baseBet:300,maxBet:10000,aiLevel:4,color:'#fb923c',desc:'传奇牌局 · 反诈唬高手'},
{id:'king',name:'王者场',icon:'👑',buyIn:100000,baseBet:1000,maxBet:30000,aiLevel:5,color:'#facc15',desc:'王者之争 · 人机极其凶悍'},
{id:'god',name:'神之场',icon:'⚡',buyIn:400000,baseBet:3000,maxBet:100000,aiLevel:6,color:'#f43f5e',desc:'诸神黄昏 · 极致难度挑战'},
/* 生死场：无上限 */
{id:'life_death',name:'生死场',icon:'💀',buyIn:500000,baseBet:5000,maxBet:Infinity,aiLevel:7,color:'#dc2626',desc:'一掷千金 · 无上限加注 · 生死一线',special:true}
];

const AI_NAMES={
  novice:['小明','阿呆','菜鸟'],
  advanced:['老王','阿珍','大熊'],
  master:['赌圣','千王','雀神'],
  legend:['青龙','白虎','朱雀'],
  king:['帝释天','修罗','夜叉'],
  god:['宙斯','奥丁','湿婆'],
  life_death:['阎罗','无常','判官']
};

const AI_STYLES=[
{tag:'谨慎',aggr:-0.15,bluff:-0.09,skillOff:-0.08,lookBias:0.10,special:'normal'},
{tag:'凶悍',aggr:0.17,bluff:0.05,skillOff:0,lookBias:-0.06,special:'normal'},
{tag:'诡诈',aggr:0.01,bluff:0.21,skillOff:0.06,lookBias:0,special:'normal'},
{tag:'老千',aggr:0.05,bluff:0.02,skillOff:0.12,lookBias:-0.05,special:'cheater'},
{tag:'赌徒',aggr:0.25,bluff:0.18,skillOff:-0.05,lookBias:0.05,special:'gambler'}
];

const ROOM_AI_POOL={
  novice:['谨慎','谨慎','凶悍'],
  advanced:['谨慎','凶悍','赌徒'],
  master:['凶悍','诡诈','赌徒'],
  legend:['老千','赌徒','凶悍'],
  king:['老千','老千','赌徒'],
  god:['老千','赌徒','诡诈'],
  life_death:['老千','老千','赌徒']
};

const BASE_SKILL={1:0.26,2:0.41,3:0.56,4:0.70,5:0.82,6:0.92,7:0.97};
const BASE_AGGR={1:0.32,2:0.40,3:0.48,4:0.56,5:0.64,6:0.72,7:0.80};
const BASE_BLUFF={1:0.07,2:0.11,3:0.15,4:0.19,5:0.23,6:0.27,7:0.32};

/* ===== 存档 ===== */
const saveData={
  wallet:5000,coupons:0,mineLevel:0,mineClicks:0,lastMineTime:0,activeTable:null,
  ownedItems:{},equipped:{cardBack:'cb_default',tableBg:'tb_default',avatarFrame:'af_default'},
  gacha:{pity:0,bigPity:0,total:0},loans:[],stats:{handsPlayed:0,handsWon:0,totalMined:0},
  plugins:{}
};

let G=null,currentRoom=null,pendingResolve=null,compareMode=false,_logLastLen=-1,mineLockUntil=0,mineTickTimer=null;
const cheats={seeAll:false,showPower:false,nextGodHand:false,godMode:false,aiCripple:false};
const pluginRegistry={plugins:[],tabs:[],hooks:{}};

const $=id=>document.getElementById(id);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ===== fmt: 处理 Infinity 显示为 ∞ ===== */
const fmt=n=>{
  if(!isFinite(n))return '∞';
  const v=Math.round(n);
  if(Math.abs(v)>=1e12)return(v/1e12).toFixed(2)+'T';
  if(Math.abs(v)>=1e9)return(v/1e9).toFixed(2)+'B';
  if(Math.abs(v)>=1e6)return(v/1e6).toFixed(2)+'M';
  return v.toLocaleString('en-US');
};

function rand(n){if(n<=0)return 0;if(window.crypto&&crypto.getRandomValues){const buf=new Uint32Array(1);const limit=Math.floor(4294967296/n)*n;let x;do{crypto.getRandomValues(buf);x=buf[0]}while(x>=limit);return x%n}return Math.floor(Math.random()*n)}

/* ===== 存档读写 ===== */
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(saveData))}catch(e){}}
function load(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);if(!raw)return;const d=JSON.parse(raw);
    if(typeof d.wallet==='number'&&d.wallet>-1e15)saveData.wallet=d.wallet;
    if(typeof d.coupons==='number'&&d.coupons>=0)saveData.coupons=d.coupons;
    if(typeof d.mineLevel==='number'&&d.mineLevel>=0)saveData.mineLevel=d.mineLevel;
    if(typeof d.mineClicks==='number'&&d.mineClicks>=0)saveData.mineClicks=d.mineClicks;
    if(typeof d.lastMineTime==='number')saveData.lastMineTime=d.lastMineTime;
    if(d.activeTable&&typeof d.activeTable==='object')saveData.activeTable=d.activeTable;
    if(d.ownedItems&&typeof d.ownedItems==='object')saveData.ownedItems=d.ownedItems;
    if(d.equipped&&typeof d.equipped==='object')saveData.equipped=Object.assign(saveData.equipped,d.equipped);
    if(d.gacha&&typeof d.gacha==='object')saveData.gacha=Object.assign(saveData.gacha,d.gacha);
    if(Array.isArray(d.loans))saveData.loans=d.loans;
    if(d.stats&&typeof d.stats==='object')saveData.stats=Object.assign(saveData.stats,d.stats);
    if(d.plugins&&typeof d.plugins==='object')saveData.plugins=d.plugins;
  }catch(e){}
}
function manualSave(){save();sfx('crit');toast('💾 已保存到本地');}

/* ===== 音效 ===== */
let audioCtx=null;
function sfx(type){
  try{
    if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended')audioCtx.resume();
    const t=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.connect(g);g.connect(audioCtx.destination);
    let f=440,d=0.08,wave='sine',vol=0.05;
    if(type==='card'){f=680;d=0.05;wave='triangle';vol=0.04}
    else if(type==='chip'){f=950;d=0.06;wave='square';vol=0.035}
    else if(type==='win'){f=520;d=0.35;wave='sine';vol=0.07}
    else if(type==='lose'){f=200;d=0.30;wave='sawtooth';vol=0.05}
    else if(type==='click'){f=420;d=0.04;wave='sine';vol=0.03}
    else if(type==='mine'){f=160;d=0.10;wave='square';vol=0.05}
    else if(type==='crit'){f=880;d=0.22;wave='triangle';vol=0.08}
    else if(type==='pull'){f=600;d=0.15;wave='sine';vol=0.06}
    else if(type==='legend'){f=900;d=0.45;wave='triangle';vol=0.09}
    o.type=wave;o.frequency.setValueAtTime(f,t);
    if(type==='win'||type==='crit'||type==='legend')o.frequency.exponentialRampToValueAtTime(f*2.2,t+d);
    if(type==='lose')o.frequency.exponentialRampToValueAtTime(f*0.45,t+d);
    if(type==='mine')o.frequency.exponentialRampToValueAtTime(f*0.6,t+d);
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+d);
    o.start(t);o.stop(t+d+0.03);
  }catch(e){}
}

/* ===== 牌型 ===== */
function makeDeck(){const d=[];for(let s=0;s<4;s++)for(let r=2;r<=14;r++)d.push({r,s});return d}
function shuffle(arr){for(let i=arr.length-1;i>0;i--){const j=rand(i+1);[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
function evaluate(cards){
  if(!cards||cards.length<3)return{type:0,key:[0]};
  const ranks=cards.map(c=>c.r).sort((a,b)=>b-a);
  const suits=cards.map(c=>c.s);
  const isFlush=suits[0]===suits[1]&&suits[1]===suits[2];
  const asc=[...ranks].sort((a,b)=>a-b);let sh=0;
  if(asc[0]+1===asc[1]&&asc[1]+1===asc[2])sh=asc[2];
  else if(asc[0]===2&&asc[1]===3&&asc[2]===14)sh=3;
  const isStraight=sh>0;
  if(ranks[0]===ranks[1]&&ranks[1]===ranks[2])return{type:6,key:[ranks[0]]};
  if(isFlush&&isStraight)return{type:5,key:[sh]};
  if(isFlush)return{type:4,key:ranks};
  if(isStraight)return{type:3,key:[sh]};
  if(ranks[0]===ranks[1])return{type:2,key:[ranks[0],ranks[2]]};
  if(ranks[1]===ranks[2])return{type:2,key:[ranks[1],ranks[0]]};
  return{type:1,key:ranks};
}
function compareHand(a,b){
  if(a.type!==b.type)return a.type-b.type;
  const len=Math.max(a.key.length,b.key.length);
  for(let i=0;i<len;i++){const x=a.key[i]??0,y=b.key[i]??0;if(x!==y)return x-y}
  return 0;
}
function handScore(cards){
  const h=evaluate(cards);
  switch(h.type){
    case 6:return 0.95+(h.key[0]-2)/12*0.05;
    case 5:return 0.85+(h.key[0]-2)/12*0.08;
    case 4:return 0.66+(h.key[0]-2)/12*0.13;
    case 3:return 0.52+(h.key[0]-2)/12*0.12;
    case 2:return 0.28+(h.key[0]-2)/12*0.22;
    default:return 0.02+(h.key[0]-2)/12*0.26;
  }
}
function cardKey(cards){return(cards||[]).map(c=>c.r+'_'+c.s).join(',')}

function toast(msg){
  const el=document.createElement('div');el.className='toast';el.textContent=msg;
  document.body.appendChild(el);
  setTimeout(()=>{el.style.transition='opacity .3s';el.style.opacity='0'},1300);
  setTimeout(()=>el.remove(),1700);
}
function floatGain(text,color,x,y){
  const el=document.createElement('div');el.className='float-gain';el.textContent=text;
  el.style.left=x+'px';el.style.top=y+'px';if(color)el.style.color=color;
  document.body.appendChild(el);setTimeout(()=>el.remove(),1200);
}
function showModal(html,opts){
  opts=opts||{};
  const mask=document.createElement('div');mask.className='modal-mask';
  const box=document.createElement('div');box.className='modal-box';box.innerHTML=html;
  mask.appendChild(box);document.body.appendChild(mask);
  if(opts.closeOnMask!==false){mask.addEventListener('click',e=>{if(e.target===mask)mask.remove()})}
  const cb=box.querySelector('.modal-close');if(cb)cb.onclick=()=>mask.remove();
  return mask;
}

/* ===== 插件系统 ===== */
const JJH_API_VERSION='1.0.0';
window.JJH={
  version:JJH_API_VERSION,
  registerPlugin(meta,setup){
    if(!meta||!meta.id)throw new Error('插件必须有 id');
    if(pluginRegistry.plugins.some(p=>p.meta.id===meta.id))throw new Error('插件已存在: '+meta.id);
    const plugin={meta:Object.assign({version:'1.0.0',author:'未知',description:'',icon:'🔌'},meta),setup};
    pluginRegistry.plugins.push(plugin);
    if(!saveData.plugins[meta.id])saveData.plugins[meta.id]={code:'',meta:meta,enabled:true};
    try{setup(makePluginAPI(meta.id));sfx('crit');toast('🔌 插件已加载：'+meta.name)}
    catch(e){console.error('插件初始化失败:',meta.id,e);toast('❌ 插件加载失败：'+e.message)}
    renderPluginList();
    return plugin;
  },
  on(event,fn){if(!pluginRegistry.hooks[event])pluginRegistry.hooks[event]=[];pluginRegistry.hooks[event].push(fn)},
  emit(event,data){const hooks=pluginRegistry.hooks[event]||[];hooks.forEach(fn=>{try{fn(data)}catch(e){console.error('hook err:',event,e)}})}
};
function makePluginAPI(pluginId){
  return{
    id:pluginId,version:JJH_API_VERSION,
    getWallet:()=>saveData.wallet,
    setWallet:v=>{saveData.wallet=v;save();renderLobby()},
    addCoins:v=>{saveData.wallet+=v;save();renderLobby();updateWalletDisplay()},
    addCoupons:v=>{saveData.coupons+=v;save();renderLobby();updateWalletDisplay()},
    getCoupons:()=>saveData.coupons,
    getSaveData:()=>saveData,
    save:save,toast:toast,showModal:showModal,
    addTab(id,name,renderFn,icon){pluginRegistry.tabs.push({id,name,renderFn,icon:icon||'🔌',pluginId});rebuildTabs()},
    addRoom(roomConfig){ROOMS.push(roomConfig);renderRooms();toast('🏠 新牌场已解锁：'+roomConfig.name)},
    on(event,fn){window.JJH.on(event,fn)},
    emit(event,data){window.JJH.emit(event,data)},
    getGame:()=>G,
    getCurrentRoom:()=>currentRoom,
    onGameStart(fn){window.JJH.on('game_start',fn)},
    onHandEnd(fn){window.JJH.on('hand_end',fn)}
  };
}
function rebuildTabs(){
  const tabs=document.querySelector('.lobby-tabs');
  tabs.querySelectorAll('.tab-btn.dynamic-tab').forEach(el=>el.remove());
  const lobbyInner=document.querySelector('#lobby .inner');
  document.querySelectorAll('.tab-pane.dynamic-pane').forEach(el=>el.remove());
  pluginRegistry.tabs.forEach(tab=>{
    const btn=document.createElement('button');
    btn.className='tab-btn dynamic-tab plugin-tab';btn.dataset.tab=tab.id;
    btn.textContent=(tab.icon||'')+' '+tab.name;
    btn.onclick=()=>{sfx('click');switchTab(tab.id)};
    tabs.appendChild(btn);
    const pane=document.createElement('div');
    pane.className='tab-pane scroll-y dynamic-pane';pane.id='tab-'+tab.id;
    const pluginPane=$('tab-plugins');
    lobbyInner.insertBefore(pane,pluginPane);
    try{tab.renderFn(pane)}catch(e){pane.innerHTML='<div style="color:#f88;padding:20px">插件页面渲染失败：'+e.message+'</div>'}
  });
}
function persistPluginCode(id,code,meta,enabled){saveData.plugins[id]={code,meta,enabled:enabled!==false};save()}
function loadAllPlugins(){
  Object.keys(saveData.plugins).forEach(id=>{
    const p=saveData.plugins[id];
    if(!p.enabled||!p.code)return;
    try{const fn=new Function('JJH','"use strict";'+p.code);fn(window.JJH)}
    catch(e){console.error('恢复插件失败:',id,e)}
  });
}
function removePlugin(id){
  pluginRegistry.plugins=pluginRegistry.plugins.filter(p=>p.meta.id!==id);
  pluginRegistry.tabs=pluginRegistry.tabs.filter(t=>t.pluginId!==id);
  delete saveData.plugins[id];save();rebuildTabs();renderPluginList();
  toast('🗑 已移除插件：'+id);
}
function renderPluginList(){
  const box=$('pluginList');if(!box)return;
  const ids=Object.keys(saveData.plugins);
  if(ids.length===0){box.innerHTML='<div style="text-align:center;color:#8fa79a;font-size:12px;padding:14px">暂无已安装插件</div>';return}
  box.innerHTML=ids.map(id=>{
    const p=saveData.plugins[id];const meta=p.meta||{};
    return `<div class="plugin-item">
      <div class="pi-icon">${meta.icon||'🔌'}</div>
      <div class="pi-info">
        <div class="pi-name">${meta.name||id}</div>
        <div class="pi-meta">v${meta.version||'1.0.0'} · ${meta.author||'未知作者'}</div>
        <div class="pi-desc">${meta.description||'无描述'}</div>
      </div>
      <div class="pi-actions">
        <button class="mini-action ${p.enabled?'equipped':'equip'}" data-toggle-plugin="${id}">${p.enabled?'已启用':'已禁用'}</button>
        <button class="mini-action dismantle" data-remove-plugin="${id}">删除</button>
      </div>
    </div>`;
  }).join('');
  box.querySelectorAll('[data-toggle-plugin]').forEach(el=>{
    el.onclick=()=>{
      const id=el.dataset.togglePlugin;const p=saveData.plugins[id];
      if(p.enabled){p.enabled=false;save();removePlugin(id)}
      else{p.enabled=true;save();location.reload()}
    };
  });
  box.querySelectorAll('[data-remove-plugin]').forEach(el=>{
    el.onclick=()=>{if(confirm('确定删除该插件？'))removePlugin(el.dataset.removePlugin)};
  });
}
function runPluginCode(code){
  if(!code||!code.trim()){toast('请输入插件代码');return false}
  try{
    const fn=new Function('JJH','"use strict";'+code);fn(window.JJH);
    const plugin=pluginRegistry.plugins[pluginRegistry.plugins.length-1];
    if(plugin){persistPluginCode(plugin.meta.id,code,plugin.meta,true);renderPluginList()}
    return true;
  }catch(e){console.error('插件执行失败:',e);toast('❌ 执行失败：'+e.message);return false}
}

/* ===== 横屏切换 ===== */
async function toggleOrientation(){
  try{
    const el=document.documentElement;
    if(!document.fullscreenElement){
      if(el.requestFullscreen)await el.requestFullscreen();
      else if(el.webkitRequestFullscreen)el.webkitRequestFullscreen();
      await delay(300);
    }
    if(screen.orientation&&screen.orientation.lock){
      const cur=screen.orientation.type||'';
      const target=cur.startsWith('landscape')?'portrait':'landscape';
      try{await screen.orientation.lock(target);toast('🔄 已切换到'+(target==='landscape'?'横屏':'竖屏'))}
      catch(e){toast('⚠️ 浏览器不支持锁定方向，请手动旋转设备')}
    }else toast('⚠️ 该浏览器不支持方向锁定');
  }catch(e){console.error(e);toast('⚠️ 切换失败：'+e.message)}
}

/* ===== 大厅 ===== */
function showScreen(name){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $(name).classList.add('active');
}
function renderLobby(){
  updateWalletDisplay();
  const frameEl=$('avatarFrame');
  frameEl.className='frame-ring '+(saveData.equipped.avatarFrame||'af_default');
  const loanTab=$('loanTabBtn');
  if(saveData.loans.length>0)loanTab.classList.add('has-dot');
  else loanTab.classList.remove('has-dot');
  updateMineCooldownUI();
}
function updateWalletDisplay(){
  const wv=$('walletVal');
  if(wv){wv.textContent=fmt(saveData.wallet);wv.classList.toggle('neg',saveData.wallet<0)}
  const cv=$('couponVal');
  if(cv)cv.textContent=fmt(saveData.coupons);
}
function renderRooms(){
  const grid=$('roomGrid');if(!grid)return;
  const canEnter=saveData.wallet>=0;
  grid.innerHTML=ROOMS.map(r=>{
    const locked=saveData.wallet<r.buyIn||!canEnter;
    const lvStars='★'.repeat(Math.min(r.aiLevel,7))+'☆'.repeat(Math.max(0,7-r.aiLevel));
    const maxBetDisplay=r.maxBet===Infinity?'∞':fmt(r.maxBet);
    const specialClass=r.special?'special-room':'';
    return `<div class="room-card ${locked?'locked':''} ${specialClass}" style="--rc:${r.color}" data-room="${r.id}">
      <div class="rc-head">
        <div class="rc-icon" style="--rc:${r.color}">${r.icon}</div>
        <div style="flex:1;min-width:0">
          <div class="rc-name">${r.name}</div>
          <div class="rc-desc">${r.desc}</div>
        </div>
      </div>
      <div class="rc-stats">
        <span class="stat-pill">底注 <b>${fmt(r.baseBet)}</b></span>
        <span class="stat-pill ${r.maxBet===Infinity?'danger':''}">封顶 <b>${maxBetDisplay}</b></span>
        <span class="stat-pill">难度 <b>${lvStars}</b></span>
      </div>
      <div class="rc-foot">
        <span class="buyin">需买入 <b>${fmt(r.buyIn)}</b></span>
        <span class="enter-tag">${locked?(canEnter?'金币不足':'负债中'):'进入'}</span>
      </div>
    </div>`;
  }).join('');
  grid.querySelectorAll('.room-card').forEach(el=>{
    el.onclick=()=>{
      const room=ROOMS.find(r=>r.id===el.dataset.room);if(!room)return;
      if(saveData.wallet<0){toast('💀 负债中，只能挖煤还款');return}
      if(saveData.wallet<room.buyIn){toast('💰 金币不足，先去挖煤吧');return}
      sfx('click');enterRoom(room);
    };
  });
}
function renderShop(){
  const rg=$('rechargeGrid');if(!rg)return;
  rg.innerHTML=RECHARGE_TIERS.map(t=>`
    <div class="recharge-item" data-recharge="${t.id}">
      ${t.bonus>0?`<div class="ri-bonus">+${t.bonus}</div>`:''}
      <div class="ri-icon">${t.icon}</div>
      <div class="ri-amount num">${fmt(t.coupon+t.bonus)}</div>
      <div class="ri-price">￥${t.price}</div>
    </div>`).join('');
  rg.querySelectorAll('[data-recharge]').forEach(el=>{
    el.onclick=()=>{
      const t=RECHARGE_TIERS.find(x=>x.id===el.dataset.recharge);if(!t)return;
      sfx('crit');
      const total=t.coupon+t.bonus;saveData.coupons+=total;save();
      const rect=el.getBoundingClientRect();
      floatGain('+'+fmt(total),'#c084fc',rect.left+rect.width/2-40,rect.top);
      toast(`💎 模拟充值成功，获得 ${fmt(total)} 点券（非真实交易）`);
      renderLobby();renderShop();
    };
  });
  const sg=$('shopGrid');if(!sg)return;
  sg.innerHTML=GACHA_POOL.map(it=>{
    const owned=(saveData.ownedItems[it.id]||0)>0;
    const canBuy=saveData.coupons>=it.price;
    return `<div class="item-card r-${it.rarity}">
      <div class="item-preview">${it.icon}</div>
      <div class="item-name">${it.name}</div>
      <div class="item-meta"><span class="rarity-tag r-${it.rarity}">${RARITY_NAMES[it.rarity]}</span></div>
      ${owned?`<button class="price-tag owned" disabled>已拥有</button>`:
        `<button class="price-tag" data-buy="${it.id}" ${canBuy?'':'disabled'}>💎 ${fmt(it.price)}</button>`}
    </div>`;
  }).join('');
  sg.querySelectorAll('[data-buy]').forEach(el=>{
    el.onclick=()=>{
      const it=ITEM_MAP[el.dataset.buy];if(!it)return;
      if(saveData.coupons<it.price){toast('点券不足');return}
      saveData.coupons-=it.price;
      saveData.ownedItems[it.id]=(saveData.ownedItems[it.id]||0)+1;
      save();sfx('crit');toast('🎁 购买成功：'+it.name);
      renderLobby();renderShop();renderBag();
    };
  });
}
function renderGacha(){
  const g=saveData.gacha;
  if($('pitySmall'))$('pitySmall').textContent=Math.max(0,PITY_SMALL-g.pity);
  if($('pityBig'))$('pityBig').textContent=Math.max(0,PITY_BIG-g.bigPity);
  if($('pityTotal'))$('pityTotal').textContent=g.total;
  const pp=$('poolPreview');if(!pp)return;
  const sample=[];Object.keys(RARITY_WEIGHT).forEach(r=>{
    const list=GACHA_POOL.filter(x=>x.rarity===r);
    if(list.length>0)sample.push(list[rand(list.length)]);
  });
  GACHA_POOL.slice(0,8).forEach(it=>{if(!sample.find(s=>s.id===it.id))sample.push(it)});
  pp.innerHTML=sample.slice(0,12).map(it=>`<div class="pool-item"><div class="pi-icon">${it.icon}</div><div class="pi-name">${it.name}</div></div>`).join('');
  const b1=$('pull1Btn'),b10=$('pull10Btn');
  if(b1)b1.disabled=saveData.coupons<PULL_COST_1;
  if(b10)b10.disabled=saveData.coupons<PULL_COST_10;
}
function rollRarity(){
  const g=saveData.gacha;
  if(g.bigPity>=PITY_BIG-1)return rand(100)<85?'legendary':'mythic';
  if(g.pity>=PITY_SMALL-1){const r=rand(1000);if(r<900)return'epic';if(r<990)return'legendary';return'mythic'}
  const totalW=Object.values(RARITY_WEIGHT).reduce((a,b)=>a+b,0);let x=rand(totalW);
  for(const r of['common','rare','epic','legendary','mythic']){x-=RARITY_WEIGHT[r];if(x<0)return r}
  return'common';
}
function pickItemByRarity(rarity){
  let list=GACHA_POOL.filter(x=>x.rarity===rarity);
  if(list.length===0){
    const order=['mythic','legendary','epic','rare','common'];const idx=order.indexOf(rarity);
    for(let i=idx+1;i<order.length;i++){list=GACHA_POOL.filter(x=>x.rarity===order[i]);if(list.length>0)break}
  }
  if(list.length===0)return GACHA_POOL[0];
  return list[rand(list.length)];
}
function doPull(count){
  const cost=count===10?PULL_COST_10:PULL_COST_1*count;
  if(saveData.coupons<cost){toast('点券不足');return}
  saveData.coupons-=cost;sfx('pull');
  const results=[];let hasLegend=false;
  for(let i=0;i<count;i++){
    const rarity=rollRarity();const item=pickItemByRarity(rarity);
    const isNew=!(saveData.ownedItems[item.id]>0);
    saveData.ownedItems[item.id]=(saveData.ownedItems[item.id]||0)+1;
    results.push({item,rarity,isNew});
    const g=saveData.gacha;g.pity++;g.bigPity++;g.total++;
    if(rarity==='epic'||rarity==='legendary'||rarity==='mythic')g.pity=0;
    if(rarity==='legendary'||rarity==='mythic')g.bigPity=0;
    if(rarity==='legendary'||rarity==='mythic')hasLegend=true;
  }
  save();if(hasLegend)sfx('legend');
  showPullResult(results);
  renderLobby();renderGacha();renderBag();
}
function showPullResult(results){
  const cardsHTML=results.map((r,i)=>`
    <div class="pull-card r-${r.rarity}" style="animation-delay:${i*0.06}s">
      ${r.isNew?'<div class="new-tag">NEW</div>':''}
      <div class="pc-icon">${r.item.icon}</div>
      <div class="pc-name">${r.item.name}</div>
    </div>`).join('');
  const order=['common','rare','epic','legendary','mythic'];
  const bestRarity=results.reduce((best,r)=>order.indexOf(r.rarity)>order.indexOf(best)?r.rarity:best,'common');
  showModal(`
    <button class="modal-close">✕</button>
    <h3>祈 愿 结 果</h3>
    <div class="modal-sub">获得 ${results.length} 件装扮 · 最高稀有度：<span class="rarity-tag r-${bestRarity}">${RARITY_NAMES[bestRarity]}</span></div>
    <div class="pull-result">${cardsHTML}</div>
    <button class="modal-btn" onclick="this.closest('.modal-mask').remove()">确 定</button>
  `,{closeOnMask:false});
}
function renderBag(){
  const grid=$('bagGrid');if(!grid)return;
  const ownedIds=Object.keys(saveData.ownedItems).filter(id=>saveData.ownedItems[id]>0);
  if(ownedIds.length===0){grid.innerHTML='<div style="grid-column:1/-1;text-align:center;color:#8fa79a;padding:30px 10px;font-size:13px">背包空空如也，去抽卡或商城逛逛吧</div>';return}
  grid.innerHTML=ownedIds.map(id=>{
    const it=ITEM_MAP[id];if(!it)return'';
    const count=saveData.ownedItems[id];
    const isDefault=it.price===0;
    const isEquipped=Object.values(saveData.equipped).includes(id);
    const canDismantle=!isDefault&&count>1;
    const dismantleGain=RARITY_DISMANTLE[it.rarity]||0;
    return `<div class="item-card bag-item r-${it.rarity}">
      ${count>1?`<div class="count-badge">×${count}</div>`:''}
      <div class="item-preview">${it.icon}</div>
      <div class="item-name">${it.name}</div>
      <div class="item-meta"><span class="rarity-tag r-${it.rarity}">${RARITY_NAMES[it.rarity]}</span></div>
      <div class="bag-actions">
        ${isEquipped?`<button class="mini-action equipped" disabled>已装备</button>`:`<button class="mini-action equip" data-equip="${id}">装备</button>`}
        ${canDismantle?`<button class="mini-action dismantle" data-dismantle="${id}">分解+${dismantleGain}</button>`:''}
      </div>
    </div>`;
  }).join('');
  grid.querySelectorAll('[data-equip]').forEach(el=>{
    el.onclick=()=>{
      const it=ITEM_MAP[el.dataset.equip];if(!it)return;
      saveData.equipped[it.type]=it.id;save();sfx('click');
      toast('已装备：'+it.name);renderLobby();renderBag();renderDress();
    };
  });
  grid.querySelectorAll('[data-dismantle]').forEach(el=>{
    el.onclick=()=>{
      const id=el.dataset.dismantle;const it=ITEM_MAP[id];
      if(!it||!saveData.ownedItems[id]||saveData.ownedItems[id]<2)return;
      const gain=RARITY_DISMANTLE[it.rarity]||0;
      saveData.ownedItems[id]-=1;
      if(saveData.ownedItems[id]<=0)delete saveData.ownedItems[id];
      saveData.coupons+=gain;save();sfx('crit');
      toast(`♻️ 分解成功，获得 ${gain} 点券`);
      renderLobby();renderBag();renderShop();
    };
  });
}
const SLOT_NAMES={cardBack:'牌 背',tableBg:'牌 桌',avatarFrame:'头 像 框'};
const SLOT_ICONS={cardBack:'🎴',tableBg:'🟩',avatarFrame:'⭕'};
function renderDress(){
  const list=$('dressList');if(!list)return;
  const slots=['cardBack','tableBg','avatarFrame'];
  list.innerHTML=slots.map(slot=>{
    const equippedId=saveData.equipped[slot]||'';
    const it=ITEM_MAP[equippedId]||{name:'无',icon:SLOT_ICONS[slot],rarity:'common'};
    return `<div class="dress-slot">
      <div class="ds-label">${SLOT_NAMES[slot]}</div>
      <div class="ds-preview">${it.icon}</div>
      <div class="ds-info">
        <div class="ds-name">${it.name}</div>
        <div class="ds-rarity">${RARITY_NAMES[it.rarity]||'普通'}</div>
      </div>
      <button class="ds-btn" data-goto-bag="1">更换</button>
    </div>`;
  }).join('');
  list.querySelectorAll('[data-goto-bag]').forEach(el=>{el.onclick=()=>switchTab('bag')});
}
function renderLoan(){
  const al=$('activeLoans');if(!al)return;
  if(saveData.loans.length===0){
    al.innerHTML='<div style="text-align:center;color:#8fa79a;font-size:12px;padding:8px">暂无未还贷款</div>';
  }else{
    al.innerHTML=saveData.loans.map((loan,idx)=>{
      const tier=LOAN_TIERS.find(t=>t.id===loan.tierId);
      const total=Math.round(loan.principal*(1+loan.rate));
      return `<div class="active-loan">
        <div style="flex:1;min-width:0">
          <div class="al-name">${tier?tier.icon+' '+tier.name:'贷款'}</div>
          <div class="al-detail">本金 ${fmt(loan.principal)} · 到期需还 <b style="color:#fca5a5">${fmt(total)}</b> · 剩余 ${loan.remaining} 局</div>
        </div>
        <button class="loan-btn" data-repay="${idx}" style="--lc:#22c55e;padding:6px 12px;font-size:11.5px">立即还清</button>
      </div>`;
    }).join('');
    al.querySelectorAll('[data-repay]').forEach(el=>{
      el.onclick=()=>{
        const idx=parseInt(el.dataset.repay,10);const loan=saveData.loans[idx];
        if(!loan)return;
        const tier=LOAN_TIERS.find(t=>t.id===loan.tierId);
        const total=Math.round(loan.principal*(1+loan.rate));
        if(saveData.wallet<total){toast(`金币不足，需要 ${fmt(total)}`);return}
        saveData.wallet-=total;saveData.loans.splice(idx,1);save();
        sfx('win');toast('✅ 已还清：'+(tier?tier.name:'贷款'));
        renderLobby();renderLoan();renderRooms();
      };
    });
  }
  const lg=$('loanGrid');if(!lg)return;
  lg.innerHTML=LOAN_TIERS.map(t=>{
    const total=Math.round(t.principal*(1+t.rate));
    const alreadyBorrowed=saveData.loans.some(l=>l.tierId===t.id);
    return `<div class="loan-card" style="--lc:${t.color}">
      <div class="lc-head">
        <div class="lc-icon" style="--lc:${t.color}">${t.icon}</div>
        <div style="flex:1;min-width:0">
          <div class="lc-name">${t.name}</div>
          <div class="lc-desc">${t.desc}</div>
        </div>
      </div>
      <div class="lc-stats">
        <div class="lc-stat"><div class="l">可借</div><div class="v">${fmt(t.principal)}</div></div>
        <div class="lc-stat"><div class="l">利率</div><div class="v warn">${(t.rate*100).toFixed(0)}%</div></div>
        <div class="lc-stat"><div class="l">期限</div><div class="v">${t.term}局</div></div>
      </div>
      <div style="font-size:10.5px;color:#c4a48a;text-align:center;background:rgba(0,0,0,.3);border-radius:7px;padding:5px">
        到期需还 <b style="color:#fca5a5">${fmt(total)}</b>
      </div>
      <button class="loan-btn" style="--lc:${t.color}" data-loan="${t.id}" ${alreadyBorrowed?'disabled':''}>
        ${alreadyBorrowed?'已有该档贷款':'立即借款'}
      </button>
    </div>`;
  }).join('');
  lg.querySelectorAll('[data-loan]').forEach(el=>{
    el.onclick=()=>{
      const tier=LOAN_TIERS.find(t=>t.id===el.dataset.loan);if(!tier)return;
      if(saveData.loans.some(l=>l.tierId===tier.id)){toast('该档位已有贷款');return}
      const total=Math.round(tier.principal*(1+tier.rate));
      const mask=showModal(`
        <button class="modal-close">✕</button>
        <h3>确 认 借 款</h3>
        <div class="modal-sub">
          借款 <b style="color:#facc15">${fmt(tier.principal)}</b> 金币<br>
          利率 <b style="color:#f87171">${(tier.rate*100).toFixed(0)}%</b> · 期限 <b>${tier.term} 局</b><br>
          到期需还 <b style="color:#f87171">${fmt(total)}</b> 金币<br>
          <span style="color:#fca5a5;font-size:11px">到期未还将自动扣款，可能进入负债状态</span>
        </div>
        <button class="modal-btn" id="confirmLoan">确 认 借 款</button>
        <button class="modal-btn sec" onclick="this.closest('.modal-mask').remove()">再 想 想</button>
      `,{closeOnMask:false});
      mask.querySelector('#confirmLoan').onclick=()=>{
        saveData.wallet+=tier.principal;
        saveData.loans.push({tierId:tier.id,principal:tier.principal,rate:tier.rate,term:tier.term,remaining:tier.term,borrowedAt:Date.now()});
        save();sfx('win');mask.remove();
        toast('💸 借款成功，到账 '+fmt(tier.principal)+' 金币');
        renderLobby();renderLoan();renderRooms();
      };
    };
  });
}

/* 挖煤 */
function mineGain(){
  const lv=Math.min(saveData.mineLevel,MINE_LV_CAP);
  const base=MINE_BASE+Math.floor(Math.sqrt(lv)*MINE_LV_FACTOR);
  const randMul=0.75+rand(1000)/1000*0.60;
  let gain=Math.round(base*randMul);
  const isCrit=rand(10000)/10000<MINE_CRIT_CHANCE;
  if(isCrit)gain*=MINE_CRIT_MULT;
  return{gain,isCrit};
}
function doMine(){
  const now=Date.now();if(now<mineLockUntil)return;
  const btn=$('mineBtn');
  const{gain,isCrit}=mineGain();
  saveData.wallet+=gain;saveData.mineClicks++;saveData.stats.totalMined+=gain;
  if(saveData.mineClicks%MINE_LV_UP_EVERY===0&&saveData.mineLevel<MINE_LV_CAP){
    saveData.mineLevel++;
    setTimeout(()=>toast('⛏️ 矿工升级！Lv.'+saveData.mineLevel),280);
  }
  mineLockUntil=now+MINE_COOLDOWN;saveData.lastMineTime=now;save();
  const rect=btn.getBoundingClientRect();
  floatGain('+'+fmt(gain),isCrit?'#ff9d3c':'#ffd76e',rect.left+rect.width/2+(rand(80)-40),rect.top-6);
  if(isCrit){sfx('crit');toast('💥 暴击！+'+fmt(gain))}else sfx('mine');
  renderLobby();updateWalletDisplay();renderRooms();
  startMineCooldownTick();
}
function startMineCooldownTick(){
  if(mineTickTimer)clearInterval(mineTickTimer);
  updateMineCooldownUI();
  mineTickTimer=setInterval(updateMineCooldownUI,100);
}
function updateMineCooldownUI(){
  const btn=$('mineBtn');if(!btn)return;
  const prog=$('mineProgress'),txt=$('mineBtnTxt');
  const now=Date.now();const remain=mineLockUntil-now;
  if(remain>0){btn.disabled=true;prog.style.width=(remain/MINE_COOLDOWN*100)+'%';txt.textContent='休息中 '+(remain/1000).toFixed(1)+'s'}
  else{btn.disabled=false;prog.style.width='0%';txt.textContent='挖煤';if(mineTickTimer){clearInterval(mineTickTimer);mineTickTimer=null}}
}

function switchTab(name){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.toggle('active',p.id==='tab-'+name));
  if(name==='rooms')renderRooms();
  else if(name==='shop')renderShop();
  else if(name==='gacha')renderGacha();
  else if(name==='bag')renderBag();
  else if(name==='dress')renderDress();
  else if(name==='loan')renderLoan();
  else if(name==='plugins')renderPluginList();
}

/* ===== 进入牌场 ===== */
function enterRoom(room){
  if(saveData.wallet<0){toast('💀 负债中，只能挖煤还款');return}
  if(saveData.wallet<room.buyIn){toast('金币不足');return}
  saveData.wallet-=room.buyIn;
  saveData.activeTable={roomId:room.id,buyIn:room.buyIn};
  save();
  currentRoom=room;showScreen('game');
  const names=AI_NAMES[room.id]||['AI-1','AI-2','AI-3'];
  const lv=room.aiLevel;
  G={players:[],pot:0,bet:room.baseBet,turn:0,dealer:rand(4),handNo:0,actionsThisHand:0,phase:'idle',waitingHuman:false,logs:[]};
  G.players[0]={id:0,name:'你',isAI:false,coins:room.buyIn,out:false,cards:[],folded:false,looked:false,betInHand:0,lastAction:'',revealed:false,ai:null,lastHandResult:'none'};
  const roomStylePool=ROOM_AI_POOL[room.id]||['谨慎','凶悍','诡诈'];
  for(let i=1;i<=3;i++){
    const styleTag=roomStylePool[i-1];
    const st=AI_STYLES.find(s=>s.tag===styleTag)||AI_STYLES[0];
    G.players[i]={
      id:i,name:names[i-1],isAI:true,coins:room.buyIn,out:false,cards:[],folded:false,looked:false,betInHand:0,lastAction:'',revealed:false,
      lastHandResult:'none',
      ai:{
        tag:st.tag,
        skill:clamp((BASE_SKILL[lv]||0.9)+st.skillOff,0.05,0.99),
        aggr:clamp((BASE_AGGR[lv]||0.7)+st.aggr,0.10,0.95),
        bluff:clamp((BASE_BLUFF[lv]||0.25)+st.bluff,0.02,0.60),
        lookBias:st.lookBias,
        special:st.special
      }
    };
  }
  pendingResolve=null;compareMode=false;_logLastLen=-1;
  document.querySelectorAll('.seat-wrap').forEach(w=>{w._seatKey='';w.innerHTML=''});
  $('roomBadge').textContent=room.name;
  $('roomBadge').style.setProperty('--rc',room.color);
  $('centerPanel').className='center-panel '+(saveData.equipped.tableBg||'tb_default');
  addLog(`🎴 进入【${room.name}】，买入 ${fmt(room.buyIn)} 金币`);
  addLog(`💰 底注 ${fmt(room.baseBet)} · 封顶 ${room.maxBet===Infinity?'∞（无上限）':fmt(room.maxBet)}`);
  render();window.JJH.emit('game_start',{room});
  startHand();
}
function leaveTable(){
  if(!G)return;
  const back=G.players[0].coins;
  saveData.wallet+=back;saveData.activeTable=null;save();
  document.querySelectorAll('.modal-mask').forEach(el=>el.remove());
  pendingResolve=null;G=null;currentRoom=null;
  showScreen('lobby');renderLobby();renderRooms();
  toast('🪙 带回 '+fmt(back)+' 金币');
}
function addLog(msg){if(!G)return;G.logs.push(msg);if(G.logs.length>220)G.logs.shift()}
function nextActiveFrom(i){let x=i;for(let k=0;k<4;k++){x=(x+1)%4;const p=G.players[x];if(!p.folded&&!p.out)return x}return i}
function alivePlayers(){return G.players.filter(p=>!p.folded&&!p.out)}

async function startHand(){
  if(!G||!currentRoom)return;
  const room=currentRoom;
  G.players.forEach(p=>{if(!p.out&&p.coins<room.baseBet){p.out=true;addLog(`💀 ${p.name} 金币不足底注，淘汰出局`)}});
  const remaining=G.players.filter(p=>!p.out);
  if(G.players[0].out||remaining.length<2)return gameOver();
  G.handNo++;G.pot=0;G.bet=room.baseBet;G.actionsThisHand=0;G.phase='betting';
  G.waitingHuman=false;pendingResolve=null;compareMode=false;
  G.players.forEach(p=>{p.cards=[];p.folded=p.out;p.looked=false;p.betInHand=0;p.lastAction='';p.revealed=false});
  let guard=0;
  do{G.dealer=(G.dealer+1)%4;guard++}while(G.players[G.dealer].out&&guard<10);
  G.players.forEach(p=>{if(p.out)return;p.coins-=room.baseBet;p.betInHand+=room.baseBet;G.pot+=room.baseBet});
  addLog(`—— 第 ${G.handNo} 局开始（庄家：${G.players[G.dealer].name}）——`);
  render();await delay(200);if(!G)return;
  const deck=shuffle(makeDeck());const order=[];
  for(let k=1;k<=4;k++){const i=(G.dealer+k)%4;if(!G.players[i].out)order.push(i)}
  for(let r=0;r<3;r++){
    for(const i of order)G.players[i].cards.push(deck.pop());
    sfx('card');render();await delay(90);if(!G)return;
  }
  if(cheats.nextGodHand){
    cheats.nextGodHand=false;
    G.players[0].cards=[{r:14,s:0},{r:14,s:1},{r:14,s:2}];
    addLog('✨ 外挂：至尊手气发动，你拿到了豹子A！');
    updateCheatUI();render();await delay(380);if(!G)return;
  }
  G.turn=nextActiveFrom(G.dealer);render();await delay(300);if(!G)return;
  bettingLoop();
}
async function bettingLoop(){
  while(true){
    if(!G)return;
    if(alivePlayers().length<=1)break;
    if(G.actionsThisHand>=MAX_ACTIONS){addLog('⏰ 达到单局下注上限，强制摊牌');break}
    const p=G.players[G.turn];
    if(p.folded||p.out){G.turn=nextActiveFrom(G.turn);continue}
    G.phase='betting';render();
    if(p.isAI){await delay(480+rand(650));if(!G)return;await aiTurn(p)}
    else await humanTurn(p);
    if(!G)return;
    if(alivePlayers().length<=1)break;
    G.turn=nextActiveFrom(G.turn);
  }
  if(!G)return;await showdown();
}
function humanTurn(p){return new Promise(resolve=>{pendingResolve=resolve;G.waitingHuman=true;render()})}
function doHumanAction(action,payload){
  if(!pendingResolve||!G)return;
  const me=G.players[0];
  compareMode=false;applyAction(me,action,payload);
  if(action==='look'){render();return}
  const res=pendingResolve;pendingResolve=null;G.waitingHuman=false;
  render();res();
}
function toggleCompare(){compareMode=!compareMode;sfx('click');render()}

function applyAction(p,action,payload){
  if(!G)return;const room=currentRoom;
  if(action==='look'){p.looked=true;p.lastAction='看牌';addLog(`👁 ${p.name} 看牌`);sfx('card');return}
  G.actionsThisHand++;
  const toCall=p.looked?G.bet*2:G.bet;
  switch(action){
    case'fold':{p.folded=true;p.lastAction='弃牌';addLog(`🚪 ${p.name} 弃牌`);break}
    case'call':{
      if(p.coins<toCall){p.folded=true;p.lastAction='弃牌';addLog(`🚪 ${p.name} 金币不足，弃牌`);break}
      p.coins-=toCall;p.betInHand+=toCall;G.pot+=toCall;p.lastAction=`跟注 ${toCall}`;
      addLog(`💰 ${p.name} 跟注 ${fmt(toCall)}`);sfx('chip');break;
    }
    case'raise':{
      const newBet=clamp(payload&&payload.to?payload.to:G.bet*2,G.bet+1,room.maxBet);
      if(newBet<=G.bet){
        const amt=Math.min(toCall,p.coins);
        if(amt<=0){p.folded=true;p.lastAction='弃牌';break}
        p.coins-=amt;p.betInHand+=amt;G.pot+=amt;p.lastAction=`跟注 ${amt}`;
        addLog(`💰 ${p.name} 跟注 ${fmt(amt)}`);sfx('chip');break;
      }
      G.bet=newBet;const amt=p.looked?newBet*2:newBet;
      if(p.coins<amt){p.folded=true;p.lastAction='弃牌';addLog(`🚪 ${p.name} 加注失败，弃牌`);break}
      p.coins-=amt;p.betInHand+=amt;G.pot+=amt;p.lastAction=`加注到 ${newBet}`;
      addLog(`🔥 ${p.name} 加注到 ${fmt(newBet)}，投入 ${fmt(amt)}`);sfx('chip');break;
    }
    case'compare':{
      const t=payload&&payload.target;
      if(!t||t.folded||t.out){
        const amt=Math.min(toCall,p.coins);
        if(amt<=0){p.folded=true;p.lastAction='弃牌';break}
        p.coins-=amt;p.betInHand+=amt;G.pot+=amt;p.lastAction=`跟注 ${amt}`;
        addLog(`💰 ${p.name} 跟注 ${fmt(amt)}`);sfx('chip');break;
      }
      if(p.coins<toCall){p.folded=true;p.lastAction='弃牌';addLog(`🚪 ${p.name} 金币不足，弃牌`);break}
      p.coins-=toCall;p.betInHand+=toCall;G.pot+=toCall;p.lastAction='比牌';
      addLog(`⚔️ ${p.name} 花 ${fmt(toCall)} 要求与 ${t.name} 比牌`);
      const c=compareHand(evaluate(p.cards),evaluate(t.cards));
      let loser;
      if(cheats.godMode&&(p.id===0||t.id===0)){loser=(p.id===0)?t:p;addLog('   🛡 外挂生效：上帝模式判定')}
      else loser=c>0?t:p;
      loser.folded=true;loser.lastAction='比牌失败';
      addLog(`   → ${p.name}【${HAND_NAMES[evaluate(p.cards).type]}】 vs ${t.name}【${HAND_NAMES[evaluate(t.cards).type]}】`);
      addLog(`   → ${loser.name} 出局`);sfx('lose');break;
    }
  }
}

async function aiTurn(p){
  if(!G||!currentRoom)return;
  if(cheats.aiCripple){await delay(240);if(!G)return;applyAction(p,'fold');return}
  const ai=p.ai;
  const opponents=G.players.filter(x=>!x.folded&&!x.out&&x.id!==p.id);
  if(opponents.length===0)return;
  const toCall=p.looked?G.bet*2:G.bet;
  const aliveCount=opponents.length+1;

  if(!p.looked){
    const pressure=G.bet/Math.max(p.coins,1);
    let lookProb=0.25+pressure*1.8+ai.lookBias;
    lookProb+=(ai.skill-0.5)*0.30;
    if(aliveCount<=2)lookProb+=0.20;
    if(p.coins<toCall*2)lookProb+=0.35;
    lookProb=clamp(lookProb,0.05,0.95);
    if(rand(1000)/1000<lookProb){
      applyAction(p,'look');render();await delay(340+rand(380));if(!G)return;
    }else{
      if(p.coins<toCall){applyAction(p,'fold');return}
      const bluffRaise=8+ai.bluff*55;
      if(rand(100)<bluffRaise&&G.bet<currentRoom.maxBet/2&&p.coins>toCall*5){
        const raiseMult=ai.special==='gambler'?3:2;
        applyAction(p,'raise',{to:Math.min(G.bet*raiseMult,currentRoom.maxBet)});return;
      }
      applyAction(p,'call');return;
    }
  }

  const trueScore=handScore(p.cards);
  const noise=(1-ai.skill)*0.55;
  let score=trueScore+(rand(1000)/1000-0.5)*noise;
  score=clamp(score,0,1);

  if(ai.special==='cheater'){
    const victim=opponents[rand(opponents.length)];
    const victimScore=handScore(victim.cards);
    if(victimScore>0.7)score-=0.15;
    else score+=0.10;
    score=clamp(score,0,1);
  }

  if(ai.special==='gambler'){
    if(rand(100)<30)score=rand(100)/100;
    ai.bluff*=1.5;
  }

  if(p.lastHandResult==='lose'){
    score+=0.15;
    ai.aggr+=0.15;
  }

  const costRatio=toCall/Math.max(p.coins,1);
  let foldAt=0.20+(aliveCount-2)*0.05+costRatio*0.80;
  foldAt-=ai.aggr*0.26;
  foldAt-=(ai.skill-0.5)*0.10;
  foldAt=clamp(foldAt,0.06,0.75);

  const bluffing=rand(1000)/1000<ai.bluff;
  if(score<foldAt&&!bluffing){applyAction(p,'fold');return}

  const canCompare=G.actionsThisHand>4&&p.coins>=toCall;
  if(canCompare&&opponents.length>=1){
    if(opponents.length===1&&score>0.68){
      const prob=25+ai.skill*45;
      if(rand(100)<prob){applyAction(p,'compare',{target:opponents[0]});return}
    }
    if(score>0.86&&rand(100)<18+ai.skill*28){
      const t=opponents[rand(opponents.length)];
      applyAction(p,'compare',{target:t});return;
    }
  }

  let raiseAt=0.56+(aliveCount-2)*0.05+costRatio*0.40;
  raiseAt-=(ai.aggr-0.5)*0.30;
  raiseAt=clamp(raiseAt,0.25,0.92);
  if(ai.special==='gambler')raiseAt-=0.2;
  if(ai.special==='cheater')raiseAt+=0.05;

  if(score>raiseAt&&rand(100)<40+ai.aggr*40&&G.bet<currentRoom.maxBet){
    let mult=score>0.85?3:2;
    if(ai.special==='gambler')mult=5;
    const target=Math.min(G.bet*mult,currentRoom.maxBet);
    const need=p.looked?target*2:target;
    if(target>G.bet&&need<=p.coins*0.45){applyAction(p,'raise',{to:target});return}
  }
  if(p.coins<toCall){applyAction(p,'fold');return}
  applyAction(p,'call');
}

async function showdown(){
  if(!G)return;
  G.phase='showdown';G.waitingHuman=false;pendingResolve=null;compareMode=false;
  G.players.forEach(p=>{if(!p.out&&!p.folded)p.revealed=true});
  render();await delay(780);if(!G)return;
  const alive=alivePlayers();
  if(alive.length===0){G.pot=0}
  else if(alive.length===1){
    const w=alive[0];const amount=G.pot;w.coins+=amount;
    addLog(`🏆 ${w.name} 赢得底池 ${fmt(amount)}`);G.pot=0;sfx('win');
    if(w.id===0)saveData.stats.handsWon++;
  }else{
    const scored=alive.map(p=>({p,h:evaluate(p.cards)}));
    let best=scored[0];let winners=[scored[0]];
    for(let i=1;i<scored.length;i++){
      const c=compareHand(scored[i].h,best.h);
      if(c>0){best=scored[i];winners=[scored[i]]}
      else if(c===0){winners.push(scored[i])}
    }
    const totalPot=G.pot;const share=Math.floor(totalPot/winners.length);
    winners.forEach(w=>{w.p.coins+=share});
    const names=winners.map(w=>w.p.name).join('、');
    addLog(`🏆 ${names} 赢得底池 ${fmt(totalPot)}${winners.length>1?`（各分 ${fmt(share)}）`:''}`);
    G.pot=0;sfx('win');
    if(winners.some(w=>w.p.id===0))saveData.stats.handsWon++;
  }
  alive.forEach(p=>{addLog(`   ${p.name}：${HAND_NAMES[evaluate(p.cards).type]}`)});
  saveData.stats.handsPlayed++;save();
  render();await delay(1900);if(!G)return;
  window.JJH.emit('hand_end',{handNo:G.handNo});
  endHand();
}
async function endHand(){
  if(!G||!currentRoom)return;
  const room=currentRoom;
  G.players.forEach(p=>{if(!p.out&&p.coins<room.baseBet){p.out=true;addLog(`💀 ${p.name} 金币耗尽，淘汰出局`)}});

  const aliveNow=alivePlayers();
  G.players.forEach(p=>{
    if(!p.out){
      if(aliveNow.includes(p))p.lastHandResult='win';
      else if(p.folded)p.lastHandResult='lose';
    }
  });

  processLoans();
  const remaining=G.players.filter(p=>!p.out);
  if(G.players[0].out||remaining.length<2){render();return gameOver()}
  render();await delay(1300);if(!G)return;
  startHand();
}
function processLoans(){
  if(saveData.loans.length===0)return;
  const expired=[];
  saveData.loans.forEach(loan=>{loan.remaining--;if(loan.remaining<=0)expired.push(loan)});
  if(expired.length===0)return;
  expired.forEach(loan=>{
    const tier=LOAN_TIERS.find(t=>t.id===loan.tierId);
    const total=Math.round(loan.principal*(1+loan.rate));
    saveData.wallet-=total;
    addLog(`💸 【${tier?tier.name:'贷款'}】到期，扣除 ${fmt(total)} 金币`);
    const idx=saveData.loans.indexOf(loan);
    if(idx>=0)saveData.loans.splice(idx,1);
    if(saveData.wallet<0)addLog(`⚠️ 金币为负（${fmt(saveData.wallet)}），只能挖煤还款！`);
  });
  save();
  if(saveData.wallet<0)setTimeout(()=>toast('💀 负债中！请前往大厅挖煤还款'),500);
}
function gameOver(){
  if(!G)return;
  G.phase='over';G.waitingHuman=false;pendingResolve=null;compareMode=false;render();
  const me=G.players[0];const back=me.coins;
  saveData.wallet+=back;saveData.activeTable=null;save();
  let title,desc;
  if(me.out){title='💀 你被淘汰了';desc=`在第 ${G.handNo} 局出局 · 带回 ${fmt(back)} 金币`;sfx('lose')}
  else{title='🏆 你通杀了！';desc=`击败所有对手 · 最终 ${fmt(me.coins)} 金币`;sfx('win')}
  showModal(`
    <h3>${title}</h3>
    <div class="modal-sub">${desc}</div>
    <div style="display:flex;flex-direction:column;gap:6px;margin:14px 0">
      ${G.players.map(p=>`<div style="display:flex;justify-content:space-between;padding:7px 13px;background:rgba(255,255,255,.05);border-radius:9px;font-size:12.5px;${p.out?'opacity:.45':''}"><span>${p.name}${p.out?'（出局）':''}</span><span style="color:#ffd76e;font-weight:700">${fmt(p.coins)}</span></div>`).join('')}
    </div>
    <button class="modal-btn" onclick="backToLobby()">返 回 大 厅</button>
  `,{closeOnMask:false});
}
function backToLobby(){
  document.querySelectorAll('.modal-mask').forEach(el=>el.remove());
  G=null;currentRoom=null;pendingResolve=null;_logLastLen=-1;
  showScreen('lobby');renderLobby();renderRooms();
}

/* ===== 渲染 ===== */
function seatKey(p,isMe){
  return[cardKey(p.cards),p.coins,p.folded?1:0,p.out?1:0,p.looked?1:0,p.revealed?1:0,p.betInHand,p.lastAction||'',
    (G.turn===p.id&&G.phase==='betting'&&!p.folded&&!p.out)?1:0,
    cheats.seeAll?1:0,cheats.showPower?1:0,
    (compareMode&&!p.folded&&!p.out&&!isMe)?1:0,
    saveData.equipped.cardBack].join('|');
}
function cardHTML(card,hidden){
  if(hidden){const cb=saveData.equipped.cardBack||'cb_default';return`<div class="card back ${cb}"></div>`}
  const red=card.s===1||card.s===2;
  return `<div class="card ${red?'red':'black'}"><span class="cr">${RANK_CHARS[card.r]}</span><span class="cs">${SUIT_CHARS[card.s]}</span></div>`;
}
function seatHTML(p,isMe){
  const active=G.turn===p.id&&G.phase==='betting'&&!p.folded&&!p.out;
  const showCards=p.revealed||(isMe&&p.looked)||(!isMe&&cheats.seeAll);
  let badge;
  if(p.out)badge='<span class="badge out">出局</span>';
  else if(p.folded)badge='<span class="badge fold">弃牌</span>';
  else if(p.looked)badge='<span class="badge look">已看牌</span>';
  else badge='<span class="badge blind">闷牌</span>';
  let cardsHTML;
  if(p.cards&&p.cards.length===3)cardsHTML=p.cards.map(c=>cardHTML(c,!showCards)).join('');
  else cardsHTML='<div class="card empty"></div>'.repeat(3);
  const showHL=showCards&&p.cards&&p.cards.length===3;
  const handLabel=showHL?`<div class="hand-label">${HAND_NAMES[evaluate(p.cards).type]}</div>`:'';
  let powerHTML='';
  if(cheats.showPower&&p.cards&&p.cards.length===3&&!p.out){
    const pw=Math.round(handScore(p.cards)*100);
    const col=pw>80?'#f43f5e':pw>55?'#fb923c':pw>30?'#facc15':'#4ade80';
    powerHTML=`<div class="power-bar"><div class="power-fill" style="width:${pw}%;background:${col}"></div></div><div class="power-txt">牌力 ${pw}%</div>`;
  }
  const pickable=compareMode&&!p.folded&&!p.out&&!isMe;
  let tagCls='';
  if(!isMe&&p.ai){
    if(p.ai.special==='cheater')tagCls='cheater';
    else if(p.ai.special==='gambler')tagCls='gambler';
  }
  const tagHTML=(!isMe&&p.ai)?`<span class="ai-tag ${tagCls}">${p.ai.tag}</span>`:'';
  return `<div class="seat ${isMe?'me':''} ${active?'active':''} ${(p.folded||p.out)?'dim':''} ${pickable?'pickable':''}" data-id="${p.id}">
    <div class="seat-head"><span class="pname">${p.name}${tagHTML}</span><span class="pcoins num">💰 ${fmt(p.coins)}</span></div>
    <div class="cards">${cardsHTML}</div>${handLabel}${powerHTML}
    <div class="seat-foot">${badge}<span class="num">本局 ${fmt(p.betInHand)}</span></div>
  </div>`;
}
function updateSeat(p,isMe){
  const wrap=document.querySelector(`.seat-wrap[data-pid="${p.id}"]`);
  if(!wrap)return;
  const key=seatKey(p,isMe);
  if(wrap._seatKey===key)return;
  wrap._seatKey=key;wrap.innerHTML=seatHTML(p,isMe);
  const seatEl=wrap.firstElementChild;
  if(seatEl&&seatEl.classList.contains('pickable')){
    seatEl.onclick=()=>{if(compareMode&&!p.folded&&!p.out&&!isMe)doHumanAction('compare',{target:p})};
  }
}
function render(){
  if(!G)return;
  $('handNo').textContent=G.handNo;
  $('potVal').textContent=fmt(G.pot);
  $('betVal').textContent=fmt(G.bet);
  $('potBig').textContent=fmt(G.pot);
  $('betBig').textContent=fmt(G.bet);
  for(let i=0;i<4;i++)updateSeat(G.players[i],i===0);
  renderControls();renderLog();
}
function renderControls(){
  const box=$('controls');if(!G){box.innerHTML='';return}
  const me=G.players[0];
  if(G.phase==='over'){box.innerHTML='<div class="hint">本局结束</div>';return}
  if(G.phase==='showdown'){box.innerHTML='<div class="hint">摊牌结算中…</div>';return}
  if(!G.waitingHuman){
    const cur=G.players[G.turn];
    const txt=(cur&&!cur.out&&!cur.folded)?`${cur.name} 思考中…`:'等待中…';
    box.innerHTML=`<div class="hint">${txt}</div>`;return;
  }
  const toCall=me.looked?G.bet*2:G.bet;
  const canCall=me.coins>=toCall;
  const room=currentRoom;
  let html='';
  if(!me.looked)html+=`<button class="btn gold" onclick="doHumanAction('look')">👁 看牌</button>`;
  html+=`<button class="btn danger" onclick="doHumanAction('fold')">弃牌</button>`;
  html+=`<button class="btn primary" ${canCall?'':'disabled'} onclick="doHumanAction('call')">跟注 ${fmt(toCall)}</button>`;
  const opts=[];
  [2,3,5].forEach(m=>{const t=G.bet*m;if(t<=room.maxBet&&t>G.bet&&!opts.includes(t))opts.push(t)});
  opts.slice(0,3).forEach(t=>{
    const need=me.looked?t*2:t;const ok=me.coins>=need;
    html+=`<button class="btn warn" ${ok?'':'disabled'} onclick="doHumanAction('raise',{to:${t}})">加到 ${fmt(t)}</button>`;
  });
  /* 生死场显示"全下"按钮 */
  if(room.maxBet===Infinity&&me.coins>toCall&&me.coins>0){
    const allInTarget=Math.floor(me.coins/2);
    const need=me.looked?allInTarget*2:allInTarget;
    if(need<=me.coins&&allInTarget>G.bet){
      html+=`<button class="btn allin" onclick="doHumanAction('raise',{to:${allInTarget}})">💀 全下 ${fmt(allInTarget)}</button>`;
    }
  }
  const oppCount=G.players.filter(p=>!p.folded&&!p.out&&p.id!==0).length;
  const canCompare=G.actionsThisHand>4&&oppCount>=1&&canCall;
  if(canCompare)html+=`<button class="btn compare ${compareMode?'active':''}" onclick="toggleCompare()">${compareMode?'选择对手…':'⚔ 比牌'}</button>`;
  box.innerHTML=html;
}
function renderLog(){
  if(!G)return;
  const el=$('log');
  if(_logLastLen<0||_logLastLen>G.logs.length){
    el.innerHTML='';
    const start=Math.max(0,G.logs.length-70);
    for(let i=start;i<G.logs.length;i++){
      const d=document.createElement('div');d.className='log-line';d.textContent=G.logs[i];el.appendChild(d);
    }
    _logLastLen=G.logs.length;el.scrollTop=el.scrollHeight;return;
  }
  if(G.logs.length===_logLastLen)return;
  const nearBottom=el.scrollHeight-el.scrollTop-el.clientHeight<80;
  for(let i=_logLastLen;i<G.logs.length;i++){
    const d=document.createElement('div');d.className='log-line';d.textContent=G.logs[i];el.appendChild(d);
  }
  _logLastLen=G.logs.length;
  while(el.childElementCount>70)el.removeChild(el.firstChild);
  if(nearBottom)el.scrollTop=el.scrollHeight;
}

/* ===== 外挂面板 ===== */
function updateCheatUI(){
  Object.keys(cheats).forEach(k=>{const sw=$('sw-'+k);if(sw)sw.classList.toggle('on',!!cheats[k])});
}
function initCheatPanel(){
  document.querySelectorAll('.cf-item[data-toggle]').forEach(item=>{
    item.onclick=()=>{
      const key=item.dataset.toggle;cheats[key]=!cheats[key];sfx('click');
      if(key==='seeAll')toast(cheats.seeAll?'👁 透视之眼：开启':'👁 透视之眼：关闭');
      if(key==='showPower')toast(cheats.showPower?'📊 牌力分析：开启':'📊 牌力分析：关闭');
      if(key==='nextGodHand'&&cheats.nextGodHand)toast('✨ 至尊手气：下一局豹子A');
      if(key==='godMode')toast(cheats.godMode?'🛡 上帝模式：开启':'🛡 上帝模式：关闭');
      if(key==='aiCripple')toast(cheats.aiCripple?'💤 人机瘫痪：AI 全部弃牌':'💤 人机瘫痪：关闭');
      updateCheatUI();if(G)render();
    };
  });
  $('cfMoney').onclick=()=>{
    sfx('crit');
    if(G&&G.phase!=='over'){G.players[0].coins+=10000;addLog('💎 外挂：天降横财 +10,000');floatGain('+10,000','#ffd76e',window.innerWidth/2-40,window.innerHeight/2);render()}
    else{saveData.wallet+=10000;save();renderLobby();updateWalletDisplay();toast('💎 天降横财 +10,000')}
  };
  $('cfCoupon').onclick=()=>{
    sfx('crit');saveData.coupons+=10000;save();
    renderLobby();updateWalletDisplay();renderShop();renderGacha();
    toast('💠 点券暴富 +10,000');
  };
  $('cfReroll').onclick=()=>{
    if(!G||G.phase==='over'){toast('⚠️ 当前不在牌局中');return}
    const me=G.players[0];
    if(me.folded||me.out){toast('⚠️ 你已经不在本局了');return}
    if(!me.cards||me.cards.length<3){toast('⚠️ 还没发牌');return}
    me.cards=[{r:14,s:0},{r:14,s:1},{r:14,s:2}];me.looked=true;
    addLog('🔄 外挂：偷天换日，你的手牌被重铸为豹子A！');sfx('crit');
    toast('🔄 手牌已重铸为【豹子A】');render();
  };
  $('cfClearDebt').onclick=()=>{
    if(saveData.loans.length===0){toast('当前没有债务');return}
    saveData.loans=[];save();renderLoan();renderLobby();
    toast('🧾 所有债务已清空');
  };
  const floatEl=$('cheatFloat'),head=$('cfHead');
  $('cfMin').onclick=e=>{
    e.stopPropagation();floatEl.classList.toggle('collapsed');
    $('cfMin').textContent=floatEl.classList.contains('collapsed')?'＋':'－';
  };
  let dragging=false,sx=0,sy=0,ox=0,oy=0;
  head.addEventListener('pointerdown',e=>{
    if(e.target.id==='cfMin')return;
    dragging=true;try{head.setPointerCapture(e.pointerId)}catch(err){}
    const rect=floatEl.getBoundingClientRect();
    sx=e.clientX;sy=e.clientY;ox=rect.left;oy=rect.top;
    floatEl.style.right='auto';floatEl.style.left=ox+'px';floatEl.style.top=oy+'px';
  });
  head.addEventListener('pointermove',e=>{
    if(!dragging)return;
    const nx=clamp(ox+(e.clientX-sx),4,window.innerWidth-floatEl.offsetWidth-4);
    const ny=clamp(oy+(e.clientY-sy),4,window.innerHeight-40);
    floatEl.style.left=nx+'px';floatEl.style.top=ny+'px';
  });
  const stopDrag=()=>{dragging=false};
  head.addEventListener('pointerup',stopDrag);
  head.addEventListener('pointercancel',stopDrag);
  updateCheatUI();
}

/* ===== 插件上传 ===== */
function initPluginPanel(){
  const upload=$('pluginUpload');
  const fileInput=$('pluginFileInput');
  if(!upload||!fileInput)return;
  upload.onclick=()=>fileInput.click();
  upload.addEventListener('dragover',e=>{e.preventDefault();upload.style.borderColor='#a855f7'});
  upload.addEventListener('dragleave',()=>{upload.style.borderColor=''});
  upload.addEventListener('drop',e=>{
    e.preventDefault();upload.style.borderColor='';
    const file=e.dataTransfer.files[0];if(file)handlePluginFile(file);
  });
  fileInput.onchange=e=>{const f=e.target.files[0];if(f)handlePluginFile(f);fileInput.value=''};
  $('runPluginCode').onclick=()=>{
    const code=$('pluginCode').value;
    if(runPluginCode(code)){$('pluginCode').value='';renderPluginList()}
  };
  $('showDocBtn').onclick=showDevDoc;
}
function handlePluginFile(file){
  if(!file.name.endsWith('.jjh')&&!file.name.endsWith('.js')){toast('❌ 只支持 .jjh 插件文件');return}
  const reader=new FileReader();
  reader.onload=e=>{
    const code=e.target.result;
    try{
      const fn=new Function('JJH','"use strict";'+code);fn(window.JJH);
      const plugin=pluginRegistry.plugins[pluginRegistry.plugins.length-1];
      if(plugin){persistPluginCode(plugin.meta.id,code,plugin.meta,true);toast('✅ 插件已安装：'+plugin.meta.name)}
      renderPluginList();
    }catch(err){console.error(err);toast('❌ 加载失败：'+err.message)}
  };
  reader.readAsText(file);
}
function showDevDoc(){
  showModal(`
    <button class="modal-close">✕</button>
    <h3>📖 插件开发文档</h3>
    <div style="font-size:12px;line-height:1.7;color:#cbd5e1;text-align:left;max-height:60vh;overflow-y:auto">
      <p><b style="color:#e9d5ff">插件后缀：</b>.jjh（本质是 JavaScript 代码）</p>
      <p style="margin-top:10px"><b style="color:#e9d5ff">基本结构：</b></p>
      <pre style="background:rgba(0,0,0,.4);padding:10px;border-radius:8px;font-size:11px;color:#a5f3fc;overflow-x:auto">JJH.registerPlugin({
  id: 'my_plugin',
  name: '我的插件',
  version: '1.0.0',
  author: '你的名字',
  description: '插件描述',
  icon: '🎮'
}, function(api) {
  // 插件初始化代码
});</pre>
      <p style="margin-top:10px"><b style="color:#e9d5ff">API 方法：</b></p>
      <ul style="padding-left:20px">
        <li><code>api.addTab(id, name, renderFn, icon)</code> — 添加大厅标签页</li>
        <li><code>api.addRoom(config)</code> — 添加新牌场（maxBet 可用 Infinity 表示无上限）</li>
        <li><code>api.addCoins(n)</code> / <code>api.addCoupons(n)</code> — 加金币/点券</li>
        <li><code>api.getWallet()</code> / <code>api.getCoupons()</code> — 查询余额</li>
        <li><code>api.toast(msg)</code> — 弹提示</li>
        <li><code>api.showModal(html, opts)</code> — 弹窗</li>
        <li><code>api.on(event, fn)</code> — 监听事件（game_start, hand_end）</li>
        <li><code>api.getGame()</code> — 获取当前牌局对象</li>
        <li><code>api.getSaveData()</code> — 获取存档对象</li>
      </ul>
      <p style="margin-top:10px"><b style="color:#e9d5ff">注意事项：</b></p>
      <ul style="padding-left:20px">
        <li>插件 id 必须唯一</li>
        <li>插件代码保存到浏览器 localStorage</li>
        <li>刷新页面后插件自动重新加载</li>
        <li>使用 API 修改数据后记得调用 <code>api.save()</code></li>
      </ul>
    </div>
    <button class="modal-btn" onclick="this.closest('.modal-mask').remove()">关 闭</button>
  `,{closeOnMask:false});
}

/* ===== 初始化 ===== */
function init(){
  load();
  if(saveData.activeTable&&typeof saveData.activeTable.buyIn==='number'){
    saveData.wallet+=saveData.activeTable.buyIn;
    saveData.activeTable=null;save();
    setTimeout(()=>toast('⚠️ 上次对局未结算，买入金币已返还'),300);
  }
  if(saveData.lastMineTime){
    const elapsed=Date.now()-saveData.lastMineTime;
    if(elapsed<MINE_COOLDOWN)mineLockUntil=saveData.lastMineTime+MINE_COOLDOWN;
  }
  if(mineLockUntil>Date.now())startMineCooldownTick();
  else updateMineCooldownUI();

  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn=>{
    btn.onclick=()=>{sfx('click');switchTab(btn.dataset.tab)};
  });
  $('pull1Btn').onclick=()=>doPull(1);
  $('pull10Btn').onclick=()=>doPull(10);
  $('mineBtn').addEventListener('click',doMine);
  $('saveBtn').onclick=manualSave;
  $('orientationBtn').onclick=toggleOrientation;
  $('leaveBtn').onclick=leaveTable;

  renderLobby();renderRooms();renderPluginList();initCheatPanel();initPluginPanel();

  loadAllPlugins();

  window.addEventListener('beforeunload',save);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save()});
  setInterval(save,30000);
}

try{
  ['zjh_caipiao_save_v2','zjh_caipiao_save_v3','zjh_caipiao_save_v4'].forEach(k=>{
    if(localStorage.getItem(k))localStorage.removeItem(k);
  });
}catch(e){}

init();