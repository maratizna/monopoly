/* ============ 12. СОХРАНЕНИЯ ============ */
function buildSaveData(slotN,label){
  return {
    slot:slotN,label:label||undefined,savedAt:Date.now(),
    players:G.players.map(p=>({id:p.id,name:p.name,color:p.color,token:p.token,ai:p.ai,money:p.money,pos:p.pos,inJail:p.inJail,jailTurns:p.jailTurns,jailCards:p.jailCards,alive:p.alive,contraband:!!p.contraband,passes:p.passes||{tram:0,fiber:0}})),
    owner:G.owner,houses:G.houses,mortgaged:G.mortgaged,depot:G.depot,cur:G.cur,freeParking:G.freeParking,
    turnCount:G.turnCount,round:G.round,bankHouses:G.bankHouses,bankHotels:G.bankHotels,bank:G.bank,start:G.start,fpj:SETS.fpj,
    custom:G.custom,infra:G.infra,syndicates:G.syndicates,market:G.market,era:G.era,tenders:G.tenders,subs:G.subs,
    log:logArr.slice(0,90),history:(G.history||[]).slice(-200),jailTime:G.jailTime||[],stats:G.stats||[],
    /* НОВЫЕ поля (старые сейвы грузятся с дефолтами) */
    stocks:G.stocks||null,stockEvents:G.stockEvents||{tech:0,steel:0,energy:0,logi:0},
    aiMemory:G.aiMemory||[],aiAggr:G.aiAggr||[],perkNoMortgage:G.perkNoMortgage||{},
  };
}
function saveGame(){if(!G||G.over)return;writeSlot(0,buildSaveData(0,'Автосохранение'));updateSaveUI();}
function saveGameTo(n,label){if(!G||G.over)return;writeSlot(n,buildSaveData(n,label));updateSaveUI();}
function openSaveExitModal(){
  if(!G)return;
  let html='<div class="modal-title">💾 Сохранить и выйти в меню</div>'+
    '<div style="font-size:12px;color:#9fb0d8;text-align:center;margin-bottom:10px">Автосейв партии идёт в служебный слот 0. Выбранный слот получит именную копию, а слот 0 будет очищён.</div>';
  for(let n=1;n<=3;n++){
    const d=readSlot(n);
    const nameVal=(d&&d.label)||('Партия '+n);
    html+='<div class="prop-row" style="flex-direction:column;align-items:stretch">'+
      '<div class="cash-input" style="margin:2px 0">Имя: <input id="slot-name-'+n+'" maxlength="18" value="'+esc(nameVal)+'" style="flex:1;width:auto"></div>'+
      '<div style="font-size:11px;color:#9fb0d8">'+(d?('Сейчас: раунд '+(d.round||1)+' · ход '+d.turnCount+' · '+(d.players||[]).map(p=>TOKENS[p.token].e).join('')):'Пусто')+'</div>'+
      '<div class="btn-row" style="margin-top:6px;justify-content:flex-start"><button class="btn primary xs" data-act="save-exit" data-slot="'+n+'">СОХРАНИТЬ СЮДА И В МЕНЮ</button></div></div>';
  }
  html+='<div class="btn-row"><button class="btn ghost" data-act="close">ОТМЕНА</button></div>';
  showModal(html);
}
function openSessionRules(){
  if(!G)return;
  let html='<div class="modal-title">📖 ПРАВИЛА СЕССИИ</div>';
  html+='<div class="mod-line">💰 Старт: $1500 · ГО: +'+(G.custom.eras?eraMults().go+' $ (зависит от эры)':'$200')+'</div>';
  if(SETS.fpj)html+='<div class="mod-line">🅿️ Хаусрул: Парковка копит штрафы</div>';
  let any=false;
  CUSTOM_KEYS.forEach(k=>{
    if(G.custom[k]&&OB_SLIDES[k]){any=true;html+='<div class="mod-line">'+OB_SLIDES[k].g+' <b>'+OB_SLIDES[k].n+'</b>: '+OB_SLIDES[k].f+'<br><span style="color:#8fa0c9">'+OB_SLIDES[k].e+'</span></div>';}
  });
  if(!any)html+='<div class="mod-line">Классический режим без модификаций</div>';
  const bots=G.players.filter(q=>q.ai);
  if(bots.length)html+='<div class="mod-line">🤖 <b>Боты</b>: '+bots.map(q=>esc(q.name)+' — '+['','лёгкий','средний','сложный'][q.ai]+' (агрессия '+Math.round(aiAggression(q.id)*100)+'%)').join(', ')+'</div>';
  if(G.custom.eras)html+='<div class="mod-line">🌐 Сейчас: '+eraName()+' · до смены: '+(5-(G.era.goCount%5))+' проходов ГО</div>';
  else if(G.custom.cycles)html+='<div class="mod-line">📊 Сейчас: рынок '+(G.market.phase==='boom'?'БУМ':G.market.phase==='crisis'?'КРИЗИС':'стабилен')+'</div>';
  if(G.custom.tender)html+='<div class="mod-line">🤝 Тендеры: у вас осталось '+tendersLeft(cp().id)+' в этой эре</div>';
  html+='<div class="btn-row"><button class="btn primary" data-act="close">ПОНЯТНО</button></div>';
  showModal(html,{wide:true});
}
function loadGameFromSlot(n){
  const d=readSlot(n);
  if(!d){toast('Слот пуст');return;}
  cleanupGameScene();
  try{
    SETS.fpj=!!d.fpj;
    const nPlayers=(d.players||[]).length||2;
    const cust=Object.assign(defCustom(),d.custom||{});
    G={id:SESSION,slot:n,saveName:d.label||'',
      players:d.players.map(p=>Object.assign({dblStreak:0,jailChoice:null,contraband:false,passes:{tram:0,fiber:0},mesh:null,shadow:null},p)),
      owner:d.owner,houses:d.houses,mortgaged:d.mortgaged,depot:d.depot||new Array(40).fill(false),cur:d.cur,freeParking:d.freeParking||0,
      phase:'idle',over:false,dice:[1,1],bankHouses:(d.bankHouses!=null?d.bankHouses:32),bankHotels:(d.bankHotels!=null?d.bankHotels:12),
      bank:Object.assign({sky:8,office:8,depot:8,sub:6},d.bank||{}),
      auctionQueue:[],start:d.start||Date.now(),turnCount:d.turnCount||0,round:(d.round!=null?d.round:1),pendingRound:false,
      custom:cust,
      infra:Object.assign({tram:false,fiber:false},d.infra||{}),
      syndicates:d.syndicates||[],
      market:Object.assign({phase:'stable',round:1},d.market||{}),
      era:Object.assign({phase:'stable',goCount:0},d.era||{}),
      tenders:d.tenders||new Array(nPlayers).fill(0),
      subs:d.subs||[],
      history:Array.isArray(d.history)?d.history:[{turn:0,worths:(d.players||[]).map(p=>p.money)}],
      jailTime:Array.isArray(d.jailTime)?d.jailTime:new Array(nPlayers).fill(0),
      stats:(Array.isArray(d.stats)?d.stats:new Array(nPlayers).fill(null)).map(s=>Object.assign(defStats(),s||null)),
      /* восстановление новых полей с дефолтами для старых сейвов */
      stocks:cust.stocks?(d.stocks||initStocks()):null,
      stockEvents:d.stockEvents||{tech:0,steel:0,energy:0,logi:0},
      aiMemory:Array.isArray(d.aiMemory)&&d.aiMemory.length?d.aiMemory:new Array(nPlayers).fill(null).map(()=>({})),
      aiAggr:Array.isArray(d.aiAggr)&&d.aiAggr.length?d.aiAggr:(d.players||[]).map(p=>p.ai?clamp([0,0.35,0.6,0.95][p.ai],0,1):0),
      perkNoMortgage:d.perkNoMortgage||{}};
    logArr=Array.isArray(d.log)?d.log.slice(0,90):[];
    logUnread=0;
    chanceDeck=shuffle(CHANCE_MASTER.map(c=>c));chestDeck=shuffle(CHEST_MASTER.map(c=>c));
    shadowDeck=shuffle(SHADOW_MASTER.map(c=>c));
    log('⏯ Партия возобновлена ('+(n===0?'автосейв':'слот '+n)+(d.label&&n!==0?' · '+d.label:'')+')');
    log('━━ РАУНД '+G.round+' ━━');
    G.players.forEach(p=>{if(p.alive)addPlayerToken(p);});
    for(let i=0;i<40;i++)updateHouseMesh(i);
    refreshCornerParking();refreshTilesForInfra();updateSyndLinks();refreshStockBoard();refreshHeatmap();
    $('#screen-menu').classList.remove('show');$('#screen-results').classList.remove('show');
    $('#hud').classList.add('show');menuSpin=false;camReset();
    updHUD();updDiceHUD();updateLogBadge();
    startTurn();
  }catch(e){console.error(e);toast('Не удалось загрузить сохранение');}
}
function exportSaves(){
  const out={};
  [0,1,2,3].forEach(n=>{const d=readSlot(n);if(d)out['slot_'+n]=d;});
  if(!Object.keys(out).length){toast('Нет сохранений для выгрузки');return;}
  try{
    const blob=new Blob([JSON.stringify({monopoly_saves:out,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download='monopoly_saves.json';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),3000);
    toast('⬇ Сохранения (с логами) выгружены в файл');
  }catch(e){toast('Не удалось выгрузить файл');}
}
function importSavesFile(file){
  const rd=new FileReader();
  rd.onload=()=>{
    try{
      const data=JSON.parse(rd.result);
      const saves=data.monopoly_saves||data;
      let n=0;
      for(const k in saves){const m=k.match(/slot_?([0-3])/i);if(m&&saves[k]&&saves[k].players){writeSlot(+m[1],saves[k]);n++;}}
      toast(n?('⬆ Импортировано сохранений: '+n):'В файле нет подходящих сейвов');
      updateSaveUI();
    }catch(e){toast('Файл не распознан');}
  };
  rd.readAsText(file);
}
window.addEventListener('beforeunload',()=>{if(G&&!G.over)saveGame();});
