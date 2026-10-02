/* ============ 8. ИГРОВОЙ ЦИКЛ ============ */
function cleanupGameScene(){
  SESSION++;
  hideModal();
  MC.trade=null;MC.aucBidder=-1;MC.waiting=false;
  $('#pass-banner').classList.remove('show');
  $('#onboard').classList.remove('show');
  if(G)G.players.forEach(p=>removePlayerToken(p));
  for(let i=0;i<40;i++){if(houseGrps[i]&&tileAnchors[i]){tileAnchors[i].remove(houseGrps[i]);houseGrps[i]=null;}}
  if(syndGroup)while(syndGroup.children.length)syndGroup.remove(syndGroup.children[0]);
  diceMeshes.forEach(d=>d.visible=false);
  tweenList.length=0;
  /* сброс новых подсистем (объекты переиспользуются, не удаляются) */
  resetParticles();
  heatmapOn=false;$('#btn-heatmap').classList.remove('on');refreshHeatmapSafe();
  CineCam.mode='manual';CineCam.curve=null;CineCam.shake=0;
  if(stockBoard)stockBoard.visible=false;
}
function refreshHeatmapSafe(){try{refreshHeatmap();}catch(e){}}
function buildG(setup){
  const slotsN=setup.slots.length;
  G={
    id:++SESSION,slot:0,saveName:'',
    players:setup.slots.map((s,i)=>({id:i,name:s.name,color:s.color,token:s.token,ai:s.ai,money:1500,pos:0,inJail:false,jailTurns:0,jailCards:0,alive:true,dblStreak:0,jailChoice:null,contraband:false,passes:{tram:0,fiber:0},mesh:null,shadow:null})),
    owner:new Array(40).fill(-1),houses:new Array(40).fill(0),mortgaged:new Array(40).fill(false),
    depot:new Array(40).fill(false),
    cur:0,freeParking:0,phase:'idle',over:false,dice:[1,1],bankHouses:32,bankHotels:12,
    bank:{sky:8,office:8,depot:8,sub:6},
    auctionQueue:[],start:Date.now(),turnCount:0,round:1,pendingRound:false,
    custom:Object.assign(defCustom(),setup.custom||{}),
    infra:{tram:false,fiber:false},syndicates:[],market:{phase:'stable',round:1},
    era:{phase:'stable',goCount:0},tenders:[0,0,0,0],subs:[],
    history:[],jailTime:new Array(slotsN).fill(0),
    stats:setup.slots.map(()=>defStats()),
    /* НОВЫЕ поля (опциональны; старые сейвы грузятся с дефолтами) */
    stocks:(setup.custom&&setup.custom.stocks)?initStocks():null,
    stockEvents:{tech:0,steel:0,energy:0,logi:0},
    aiMemory:setup.slots.map(()=>({})),
    aiAggr:setup.slots.map(s=>s.ai?clamp([0,0.35,0.6,0.95][s.ai]+(Math.random()*0.2-0.1),0,1):0),
    perkNoMortgage:{},
  };
  G.history.push({turn:0,worths:G.players.map(p=>p.money)});
  chanceDeck=shuffle(CHANCE_MASTER.map(c=>c));chestDeck=shuffle(CHEST_MASTER.map(c=>c));
  shadowDeck=shuffle(SHADOW_MASTER.map(c=>c));
  logArr=[];logUnread=0;updateLogBadge();
  G.players.forEach(p=>addPlayerToken(p));
  for(let i=0;i<40;i++)updateHouseMesh(i);
  refreshCornerParking();
  refreshTilesForInfra();
  refreshStockBoard();
}
function newGame(setup){
  cleanupGameScene();
  delSlot(0);
  buildG(setup);
  $('#screen-menu').classList.remove('show');$('#screen-lobby').classList.remove('show');
  $('#screen-results').classList.remove('show');$('#screen-career').classList.remove('show');
  $('#hud').classList.add('show');
  menuSpin=false;camReset();
  applyCareerPerk(); // Фича 6: перк/цвет из Карьеры
  const cm=[];CUSTOM_KEYS.forEach(k=>{if(G.custom[k])cm.push({infra:'🏗',shadow:'🃏',cycles:'📊',synd:'🔗',tax:'🧾',spec:'🏙',tender:'🤝',subs:'🏭',eras:'📈',stocks:'📊'}[k]);});
  log('🎲 Партия началась! Игроков: '+G.players.length+(cm.length?' · кастом: '+cm.join(' '):''));
  toast('💾 Автосейв в слот 0'+(cm.length?' · режим: '+cm.join(' '):''));
  saveGame();updateSaveUI();
  updHUD();updDiceHUD();
  startOnboarding(false);
  startTurn();
}
function passBanner(p){
  return new Promise(res=>{
    $('#pb-tok').textContent=TOKENS[p.token].e;
    $('#pb-tok').style.background=p.color;
    $('#pb-name').textContent='ХОД: '+p.name;
    $('#pass-banner').classList.add('show');
    $('#pb-go').onclick=()=>{$('#pass-banner').classList.remove('show');Snd.click();res();};
  });
}
function advanceEra(){
  const order=['stable','boom','inflation','recession'];
  G.era.phase=order[(order.indexOf(G.era.phase)+1)%4];
  G.tenders=G.tenders.map(()=>0);
  log('🌐 Новая эра: '+eraName());toast('🌐 Эра: '+eraName());
  Ambient.apply();
}
async function onPassGo(pi){
  if(!G)return;
  const p=G.players[pi];
  if(G.stats[pi])G.stats[pi].laps++;
  const m=G.custom.eras?eraMults():null;
  const salary=m?m.go:200;
  p.money+=salary;
  moneyFX(null,pi,5);
  log('⭐ '+esc(p.name)+' проходит СТАРТ (+'+fmt(salary)+') · круг '+(G.stats[pi]?G.stats[pi].laps:1));Snd.coin();
  if(G.custom.eras){
    G.era.goCount++;
    if(G.era.goCount%5===0)advanceEra();
  }
  let divTotal=0;
  if(G.custom.subs){
    const div=m?m.div:1;
    G.subs.forEach(s=>{if(!s.mortgaged){const o=G.players[s.owner];if(o&&o.alive){const amt=Math.round(50*div);o.money+=amt;divTotal+=amt;}}});
    if(divTotal>0)log('🏭 Дивиденды дочерних предприятий: '+fmt(divTotal));
  }
  const stockDiv=stockDividends(pi); // Фича 5: дивиденды по акциям на GO
  let taxPaid=0;
  if(G.custom.tax){
    const mult=m?m.tax:1;
    const t=Math.round(calcPropertyTax(pi)*mult);
    if(t>0){
      log('🧾 '+esc(p.name)+': налог на имущество '+fmt(t));
      toast('⭐ +'+fmt(salary)+' · −'+fmt(t)+' 🧾'+(divTotal?' · +'+fmt(divTotal)+' 🏭':''));
      moneyFX(pi,null,3);taxPaid=t;
      await payTo(pi,t,-1,true);
    }
  }
  if(!G.custom.tax&&divTotal>0)toast('⭐ +'+fmt(salary)+' GO · +'+fmt(divTotal)+' 🏭');
  else if(!G.custom.tax&&G.custom.eras)toast('⭐ +'+fmt(salary)+' GO');
  else if(!G.custom.tax&&!G.custom.eras&&!stockDiv)toast('⭐ +'+fmt(salary));
  if((G.custom.tax||G.custom.subs||G.custom.eras)&&taxPaid===0){
    const parts=['+'+fmt(salary)+' GO'];
    if(divTotal>0)parts.push('+'+fmt(divTotal)+' 🏭 дивиденды');
    if(parts.length>1)guideOnce('go-combo',parts.join(' · '));
  }
  updHUD();
}
async function startTurn(){
  if(!G||G.over)return;
  const sid=G.id;
  const p=cp();
  if(!p.alive){G.cur=nextAlive(G.cur);return startTurn();}
  G.phase='idle';p.dblStreak=0;p.jailChoice=null;G.turnCount++;
  log('▸ Ход '+G.turnCount+': '+esc(p.name));
  if(G.turnCount===1){log('━━ РАУНД 1 ━━');}
  else if(G.pendingRound){G.round++;G.pendingRound=false;log('━━ РАУНД '+G.round+' ━━');updateStockPrices();}
  if(p.inJail)G.jailTime[p.id]++;
  eraOpen=(G.custom.eras&&G.turnCount===1);
  if(G.custom.cycles&&!G.custom.eras&&G.cur===0&&G.turnCount>1){
    G.market.round++;
    if(G.market.round%5===0){
      const order=['stable','boom','crisis'];
      G.market.phase=order[(order.indexOf(G.market.phase)+1)%3];
      const names={stable:'📊 Рынок стабилизировался',boom:'📈 БУМ: стройка +20%, монополии ×4',crisis:'📉 КРИЗИС: ренты −20%, выкуп без штрафа'};
      log('📊 '+names[G.market.phase]);toast(names[G.market.phase]);
    }
  }
  focusToken(p);updHUD();
  const humans=G.players.filter(q=>!q.ai&&q.alive).length;
  if(!p.ai&&humans>1){await passBanner(p);if(!okG(sid))return;}
  if(p.inJail){await jailIntro(p.id);if(!okG(sid))return;}
  if(G.over)return;
  updHUD();
  if(p.ai)await aiTurn(p);
}
async function jailIntro(pi){
  const p=G.players[pi];
  if(p.ai){
    if(p.jailCards>0)p.jailChoice='card';
    else if(p.jailTurns>=2||p.money>600)p.jailChoice='pay';
    else p.jailChoice='try';
    return;
  }
  const sid=G.id;
  const choice=await new Promise(res=>{
    MC.resolve=res;
    showModal('<div class="modal-title">🔒 ВЫ В ТЮРЬМЕ</div>'+
      '<div style="text-align:center;color:#cfd8f2;margin-bottom:12px">Попытка '+(p.jailTurns+1)+' из 3. Как выйти?</div>'+
      '<div class="btn-row" style="flex-direction:column;align-items:stretch">'+
        '<button class="btn primary" data-act="jail-try">🎲 Бросить кубики (нужен дубль)</button>'+
        '<button class="btn blue" data-act="jail-pay">💵 Заплатить $50</button>'+
        (p.jailCards>0?'<button class="btn good" data-act="jail-card">🎟️ Использовать карточку</button>':'')+
      '</div>');
  });
  if(!okG(sid))return;
  p.jailChoice=choice;
}
function animateDice(){
  return new Promise(res=>{
    const v=[randi(1,6),randi(1,6)];
    Snd.dice();vibrate(35);
    let t=0;const dur=0.85;const sid=G?G.id:0;
    diceMeshes.forEach((d,k)=>{
      d.visible=true;
      d.position.set((k?0.6:-0.6)+(Math.random()-.5)*.3,0.8,(Math.random()-.5)*.5);
      d.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);
    });
    tweenList.push(dt=>{
      if(!okG(sid)){res(v);return true;}
      t+=dt;const k=clamp(t/dur,0,1);
      diceMeshes.forEach((d,i)=>{
        d.rotation.x+=dt*(9-i*2.5)*(1-k*0.7);
        d.rotation.z+=dt*(7+i*2)*(1-k*0.7);
        d.position.y=0.55+Math.abs(Math.sin(t*(10-i*2)))*(1-k)*1.1;
      });
      if(k>=1){diceMeshes.forEach((d,i)=>{d.position.y=0.56;setDieFace(d,v[i]);});res(v);return true;}
      return false;
    });
  });
}
const DIE_UP={1:{a:'x',v:-Math.PI/2},2:{a:'z',v:Math.PI/2},3:null,4:{a:'x',v:Math.PI},5:{a:'z',v:-Math.PI/2},6:{a:'x',v:Math.PI/2}};
function setDieFace(mesh,val){
  const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.random()*Math.PI*2);
  const u=DIE_UP[val];
  if(u){const qa=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(u.a==='x'?1:0,u.a==='z'?1:0,0),u.v);q.multiply(qa);}
  mesh.quaternion.copy(q);
}
async function moveSteps(pi,n){
  const sid=G.id;
  const p=G.players[pi];
  for(let k=0;k<n;k++){
    if(!okG(sid))return;
    const from=p.pos,to=(from+1)%40;
    if(to===0){await onPassGo(pi);if(!okG(sid)||!G.players[pi].alive)return;}
    p.pos=to;
    await hopToken(pi,from,to,sid);
    if(!okG(sid))return;
  }
}
async function moveToCell(pi,idx,collectGo){
  const sid=G.id;
  const p=G.players[pi];
  if(idx===p.pos){await resolveCell(pi);return;}
  let cur=p.pos,guard=0;
  while(cur!==idx&&guard++<41){
    if(!okG(sid))return;
    cur=(cur+1)%40;
    if(cur===0&&collectGo){await onPassGo(pi);if(!okG(sid)||!p.alive)return;}
    const from=p.pos;p.pos=cur;await hopToken(pi,from,cur,sid);
    if(!okG(sid))return;
  }
  await resolveCell(pi);
}
async function doRoll(pi){
  if(!G)return{cont:false};
  const sid=G.id;
  const p=G.players[pi];
  G.phase='anim';setControls();
  cineDiceIn(); // Фича 1: наезд камеры на кубики
  const d=await animateDice();
  if(!okG(sid))return{cont:false};
  G.dice=d;updDiceHUD();
  const dbl=d[0]===d[1];
  p.dblStreak=dbl?p.dblStreak+1:0;
  log('🎲 '+esc(p.name)+': '+d[0]+' + '+d[1]+(dbl?' — дубль!':''));
  if(p.contraband){
    p.contraband=false;
    if(dbl){log('🚔 Контрабанда раскрыта (дубль) — '+esc(p.name)+' в тюрьме!');toast('📦 Контрабанда! Тюрьма');Snd.bad();sendToJail(pi);cineDiceOut();return{cont:false};}
  }
  if(threeDoublesJail(p.dblStreak)){log('⚠️ Три дубля подряд — в тюрьму!');toast('3 дубля подряд! Тюрьма');Snd.bad();sendToJail(pi);cineDiceOut();return{cont:false};}
  cineDiceOut(); // возврат камеры к фишке перед движением
  await moveSteps(pi,d[0]+d[1]);
  if(!okG(sid)||!G.players[pi].alive)return{cont:false};
  await resolveCell(pi);
  if(!okG(sid)||!p.alive||p.inJail)return{cont:false};
  return{cont:dbl};
}
async function resolveCell(pi){
  if(!G)return;
  const sid=G.id;
  const p=G.players[pi],idx=p.pos,c=CELLS[idx];
  updHUD();
  /* Фича 5: учёт активности для биржи */
  if(G.custom.stocks){
    if(c.t==='rr')stockBump('logi');
    if(c.t==='util')stockBump('energy');
  }
  if(c.t==='street'||c.t==='rr'||c.t==='util'){
    if(G.owner[idx]===-1){
      let choice;
      if(p.money<c.price){choice='auction';if(!p.ai)toast('Не хватает денег — аукцион');}
      else if(p.ai){choice=aiDecideBuy(p,idx)?'buy':'auction';}
      else{
        choice=await new Promise(res=>{
          MC.resolve=res;
          showModal('<button class="x-btn" data-act="buy-x" title="Отказаться — имущество на аукцион">✕</button>'+
            '<div class="modal-title">СВОБОДНАЯ СОБСТВЕННОСТЬ</div>'+cellBanner(idx)+modsHtml(idx)+
            '<div style="text-align:center;font-size:13px;color:#9fb0d8;margin-bottom:4px">Ваш баланс: '+fmt(p.money)+'</div>'+
            '<div class="btn-row"><button class="btn primary" data-act="buy-yes">КУПИТЬ ЗА '+fmt(c.price)+'</button>'+
            '<button class="btn ghost" data-act="buy-auction">АУКЦИОН</button></div>');
        });
        if(!okG(sid)||!p.alive)return;
        if(G.owner[idx]!==-1)return;
      }
      if(choice==='buy'){
        p.money-=c.price;G.owner[idx]=pi;
        moneyFX(pi,null,4);
        updateHouseMesh(idx);validateSyndicates();refreshHeatmap();
        Snd.coin();log('🛒 '+esc(p.name)+' покупает «'+c.name+'» за '+fmt(c.price));toast('Куплено: '+esc(c.name));
      }else{
        log('🔨 «'+c.name+'» уходит на аукцион');
        await runAuction(idx);
      }
    }else if(G.owner[idx]!==pi){
      const ownerIdx=G.owner[idx];
      const info=computeRent(idx,G.dice[0]+G.dice[1],pi,false);
      const rent=info.total;
      if(rent>0){
        let doTender=false;
        if(!p.ai){
          const tenderAvail=G.custom.tender&&isTenderable(idx)&&tendersLeft(pi)>0&&p.money>=50;
          const firstTender=tenderAvail&&!guideSeen('tender');
          const linesHtml=info.lines.map(l=>'<div class="rl"><span>'+l.t+'</span><span>'+(l.v>=0?'+':'')+fmt(l.v)+'</span></div>').join('');
          const choice=await new Promise(res=>{
            MC.resolve=res;
            showModal('<button class="x-btn" data-act="rent-pay">✕</button>'+
              '<div class="modal-title">💸 РЕНТА</div>'+cellBanner(idx)+modsHtml(idx)+
              '<div class="rent-lines">'+linesHtml+'<div class="rl total"><span>ИТОГО → '+esc(G.players[ownerIdx].name)+'</span><span>'+fmt(rent)+'</span></div></div>'+
              (G.houses[idx]===6?'<div class="mod-line">💡 Небоскрёб: рента ×2 от отельной</div>':'')+
              (G.houses[idx]===7?'<div class="mod-line">💡 Бизнес-центр: владелец получит +$25 дивидендов</div>':'')+
              (firstTender?'<div class="mod-line">💡 Тендер: сбор $50 → аукцион → победитель платит владельцу +10% банку</div>':'')+
              '<div class="btn-row"><button class="btn bad" data-act="rent-pay">ЗАПЛАТИТЬ '+fmt(rent)+'</button>'+
              (tenderAvail?'<button class="btn primary" data-act="rent-tender">🤝 TENDER OFFER ($50)</button>':'')+'</div>');
          });
          if(!okG(sid)||!p.alive)return;
          doTender=choice==='tender';
        }
        if(doTender){
          guideMark('tender');
          p.money-=50;G.tenders[pi]=(G.tenders[pi]||0)+1;
          moneyFX(pi,null,2);
          log('📋 '+esc(p.name)+' объявляет тендер на «'+c.name+'» (сбор $50)');
          toast('📋 Тендер объявлен');updHUD();
          await runTender(idx,pi);
          if(okG(sid))updHUD();
          return;
        }
        const before=G.players[ownerIdx]?G.players[ownerIdx].money:0;
        log('💸 '+esc(p.name)+' платит ренту '+fmt(rent)+' → '+esc(G.players[ownerIdx].name)+' («'+c.name+'»)');
        if(!p.ai)toast('Рента '+fmt(rent)+' → '+esc(G.players[ownerIdx].name));
        cineRentFlight(pi,ownerIdx); // Фича 1: облёт камеры по сплайну
        await payTo(pi,rent,ownerIdx,false);
        if(okG(sid)){
          const moved=G.players[ownerIdx]?G.players[ownerIdx].money-before:0;
          if(moved>0){
            moneyFX(pi,ownerIdx,4);
            if(G.stats[pi])G.stats[pi].rentPaid+=moved;
            if(G.stats[ownerIdx])G.stats[ownerIdx].rentEarned+=moved;
          }
          if(G.custom.spec&&CELLS[idx].t==='street'){
            const g=CELLS[idx].g;const own=G.owner[idx];
            if(own>=0&&G.players[own].alive&&GROUP_CELLS[g].some(i=>G.owner[i]===own&&G.houses[i]===7)){
              G.players[own].money+=25;moneyFX(null,own,2);
              log('🏢 Дивиденды бизнес-центра +$25 → '+esc(G.players[own].name));
              guideOnce('bc-div','Бизнес-центр приносит владельцу +$25 за каждый визит на улицы группы');
              updHUD();
            }
          }
          if(G.houses[idx]===6)guideOnce('sky-rent','Небоскрёб даёт ренту ×2 от отельной и защищает от тендера');
        }
      }
    }
  }else if(c.t==='tax'){
    log('💸 '+esc(p.name)+' платит налог '+fmt(c.amount));
    if(!p.ai)toast('Налог '+fmt(c.amount));
    moneyFX(pi,null,3);
    await payTo(pi,c.amount,-1,true);
  }else if(c.t==='chance'){await drawCard(pi,'chance');}
  else if(c.t==='chest'){await drawCard(pi,'chest');}
  else if(c.t==='gotojail'){log('🚔 '+esc(p.name)+' отправляется в тюрьму');if(!p.ai)toast('🚔 В тюрьму!');sendToJail(pi);}
  else if(c.t==='parking'){
    if(G.custom.shadow){await drawShadow(pi);}
    else if(SETS.fpj&&G.freeParking>0){
      const pot=G.freeParking;p.money+=pot;G.freeParking=0;
      moneyFX(null,pi,5);
      log('🅿️ '+esc(p.name)+' забирает банк парковки: '+fmt(pot)+'!');toast('🅿️ +'+fmt(pot)+'!');Snd.coin();
    }else toast('🅿️ Бесплатная парковка — отдых');
  }
  if(okG(sid))updHUD();
}
async function drawCard(pi,kind){
  if(!G)return;
  const sid=G.id;
  const deck=kind==='chance'?chanceDeck:chestDeck;
  const master=kind==='chance'?CHANCE_MASTER:CHEST_MASTER;
  if(!deck.length)deck.push(...shuffle(master.map(c=>c)));
  const card=deck.shift();
  const p=G.players[pi];
  log((kind==='chance'?'❓ Шанс':'💰 Казна')+' ('+esc(p.name)+'): '+card.txt);
  if(!p.ai){
    await new Promise(res=>{
      MC.resolve=res;
      showModal('<button class="x-btn" data-act="card-ok">✕</button>'+
        '<div class="modal-title">'+(kind==='chance'?'❓ ШАНС':'💰 КАЗНА')+'</div>'+
        '<div class="card-art"><div class="big">'+(kind==='chance'?'❓':'💰')+'</div><div class="txt">'+esc(card.txt)+'</div></div>'+
        '<div class="btn-row"><button class="btn primary" data-act="card-ok">OK</button></div>');
    });
    if(!okG(sid)||!p.alive)return;
  }else{toast(TOKENS[p.token].e+' '+esc(card.txt));await sleep(900);if(!okG(sid))return;}
  await card.fn(pi);
  if(okG(sid))updHUD();
}
async function drawShadow(pi){
  if(!G)return;
  const sid=G.id;
  if(!shadowDeck.length)shadowDeck.push(...shuffle(SHADOW_MASTER.map(c=>c)));
  const card=shadowDeck.shift();
  const p=G.players[pi];
  log('🃏 Теневой рынок ('+esc(p.name)+'): '+card.txt);
  if(!p.ai){
    await new Promise(res=>{
      MC.resolve=res;
      showModal('<button class="x-btn" data-act="card-ok">✕</button>'+
        '<div class="modal-title">🃏 ТЕНЕВОЙ РЫНОК</div>'+
        '<div class="card-art shadow"><div class="big">'+card.e+'</div><div class="txt">'+esc(card.txt)+'</div></div>'+
        '<div class="btn-row"><button class="btn primary" data-act="card-ok">ВЗЯТЬ</button></div>');
    });
    if(!okG(sid)||!p.alive)return;
  }else{toast('🃏 '+esc(card.txt));await sleep(900);if(!okG(sid))return;}
  if(card.fn==='bribe'){await shadowBribe(pi);}
  else await card.fn(pi);
  if(okG(sid))updHUD();
}
async function shadowBribe(pi){
  const sid=G.id;
  const p=G.players[pi];
  const cands=[];
  for(let k=1;k<=3;k++){
    const t=(p.pos+k)%40;const c=CELLS[t];
    if((c.t==='street'||c.t==='rr'||c.t==='util')&&G.owner[t]===-1)cands.push(t);
  }
  if(!cands.length||p.money<50){toast('Взятка не удалась: нет целей или денег');return;}
  const others=G.players.filter(q=>q.alive&&q.id!==pi).sort((a,b)=>((a.pos-p.pos+40)%40)-((b.pos-p.pos+40)%40));
  const target=others.length?others[0].id:-1;
  let chosen;
  if(p.ai){chosen=cands[0];}
  else{
    chosen=await new Promise(res=>{
      MC.resolve=res;
      showModal('<div class="modal-title">💼 ВЗЯТКА</div>'+
        '<div style="text-align:center;color:#cfd8f2;font-size:13px;margin-bottom:10px">$50 уйдут '+(target>=0?esc(G.players[target].name):'в банк')+'. Куда переместиться?</div>'+
        '<div class="btn-row" style="flex-direction:column;align-items:stretch">'+
        cands.map(t=>'<button class="btn blue" data-act="bribe-go" data-idx="'+t+'">'+esc(CELLS[t].name)+(CELLS[t].price!=null?' · '+fmt(CELLS[t].price):'')+'</button>').join('')+
        '<button class="btn ghost" data-act="bribe-cancel">ОТМЕНА</button></div>');
    });
    if(!okG(sid))return;
    if(chosen==null)return;
  }
  moneyFX(pi,target,2);
  await payTo(pi,50,target,false);
  if(!okG(sid)||!p.alive)return;
  log('💼 '+esc(p.name)+' даёт взятку и уходит на «'+CELLS[chosen].name+'»');
  await moveToCell(pi,chosen,true);
}
function sendToJail(pi){
  const p=G.players[pi];
  if(G.stats[pi])G.stats[pi].jails++;
  p.pos=10;p.inJail=true;p.jailTurns=0;p.dblStreak=0;p.jailChoice=null;
  placeTokenInstant(pi);Snd.bad();updHUD();
}
function releaseJail(p){p.inJail=false;p.jailTurns=0;p.jailChoice=null;log('🔓 '+esc(p.name)+' выходит из тюрьмы');}
const AUTORISE_TIP='Не хватило денег — игра автоматически продаёт здания, затем закладывает клетки (залог = 50% цены). Выкуп: «Активы» → «Выкуп» (+10%). Если денег так и не хватит — банкротство.';
async function payTo(pi,amount,to,fine){
  const p=G.players[pi];
  autoRaise(pi,amount);
  if(p.money<amount){bankrupt(pi,to);return;}
  p.money-=amount;
  if(to>=0){G.players[to].money+=amount;}
  else if(fine&&SETS.fpj){G.freeParking+=amount;}
  Snd.coin();updHUD();
}
function autoRaise(pi,need){
  const p=G.players[pi];let guard=0;
  const canMort=!(G.perkNoMortgage&&G.perkNoMortgage[pi]); // перк «без ипотеки»
  while(p.money<need&&guard++<300){
    const withH=ownedCells(pi).filter(x=>G.houses[x]>0);
    if(withH.length){withH.sort((a,b)=>G.houses[b]-G.houses[a]);forceSellLevel(withH[0]);if(!p.ai)guideOnce('autoraise','💡 '+AUTORISE_TIP);continue;}
    const free=ownedCells(pi).filter(x=>!G.mortgaged[x]);
    if(canMort&&free.length){doMortgage(free[0],true);if(!p.ai)guideOnce('autoraise','💡 '+AUTORISE_TIP);continue;}
    break;
  }
}
function forceSellLevel(idx){
  const c=CELLS[idx];const h=G.houses[idx];
  if(h>=6){sellSpecial(G.owner[idx],idx,true);return;}
  if(h===5){G.bankHotels=Math.min(12,G.bankHotels+1);G.bankHouses=Math.max(0,G.bankHouses-4);}
  else G.bankHouses=Math.min(32,G.bankHouses+1);
  G.houses[idx]--;G.players[G.owner[idx]].money+=Math.floor(c.hc/2);
  updateHouseMesh(idx);updHUD();
}
function sellSpecial(pi,idx,silent){
  const h=G.houses[idx];const p=G.players[pi];
  if(h===6){G.houses[idx]=5;G.bank.sky++;p.money+=Math.floor(specCost(idx,'sky')/2);}
  else if(h===7){G.houses[idx]=3;G.bank.office++;p.money+=Math.floor(specCost(idx,'bc')/2);}
  updateHouseMesh(idx);
  if(!silent)log('🔻 '+esc(p.name)+' продаёт спецпостройку на «'+CELLS[idx].name+'»');
  updHUD();
}
function doMortgage(idx,silent){
  const p=G.players[G.owner[idx]];const c=CELLS[idx];
  if(G.mortgaged[idx]||G.houses[idx]>0)return;
  if(G.perkNoMortgage&&G.perkNoMortgage[G.owner[idx]]&&!silent){toast('Перк «Стартовый капитал»: ипотека запрещена');return;}
  G.mortgaged[idx]=true;const v=Math.floor(c.price/2);p.money+=v;
  moneyFX(null,G.owner[idx],2);updateHouseMesh(idx);
  if(!silent){log('🏦 '+esc(p.name)+' закладывает «'+c.name+'» (+'+fmt(v)+')');toast('Залог: +'+fmt(v));}
  Snd.coin();updHUD();
}
function doUnmortgage(idx){
  const p=G.players[G.owner[idx]];const c=CELLS[idx];
  const cost=effUnmortCost(idx);
  autoRaise(G.owner[idx],cost);
  if(p.money<cost){toast('Не хватает денег на выкуп');return false;}
  p.money-=cost;G.mortgaged[idx]=false;moneyFX(G.owner[idx],null,2);
  updateHouseMesh(idx);
  log('🏦 '+esc(p.name)+' выкупает «'+c.name+'» (−'+fmt(cost)+')');Snd.coin();updHUD();return true;
}
function bankrupt(pi,creditor){
  const p=G.players[pi];
  if(!p.alive)return;
  p.alive=false;Snd.bad();
  log('💥 '+esc(p.name)+' БАНКРОТ!');toast('💥 '+esc(p.name)+' банкротится');
  /* Фичи 1+2: тряска камеры + эффект разрушения фишки */
  if(p.mesh)cineBankrupt(),fxCollapse(p.mesh.position.clone(),p.color);
  const props=ownedCells(pi);
  if(creditor>=0&&G.players[creditor]&&G.players[creditor].alive){
    const c=G.players[creditor];
    c.money+=p.money;p.money=0;c.jailCards+=p.jailCards;
    if(c.money>0)moneyFX(pi,creditor,5);
    props.forEach(x=>{G.owner[x]=creditor;updateHouseMesh(x);});
    log('➡️ Активы переходят к '+esc(c.name));
  }else{
    p.money=0;
    props.forEach(x=>{
      while(G.houses[x]>0){
        if(G.houses[x]===6){G.bank.sky++;G.houses[x]=5;}
        else if(G.houses[x]===7){G.bank.office++;G.houses[x]=3;}
        else if(G.houses[x]===5){G.bankHotels=Math.min(12,G.bankHotels+1);G.bankHouses=Math.max(0,G.bankHouses-4);G.houses[x]--;}
        else {G.bankHouses=Math.min(32,G.bankHouses+1);G.houses[x]--;}
      }
      if(G.depot[x]){G.depot[x]=false;G.bank.depot++;}
      G.owner[x]=-1;G.mortgaged[x]=false;G.auctionQueue.push(x);
      updateHouseMesh(x);
    });
    log('➡️ Активы уходят банку и на аукцион');
  }
  if(G.custom.subs){G.subs=G.subs.filter(s=>{if(s.owner===pi){G.bank.sub++;return false;}return true;});}
  validateSyndicates();refreshHeatmap();
  removePlayerToken(p);updHUD();
}
async function flushAuctionQueue(){
  const sid=G?G.id:0;
  while(G&&okG(sid)&&G.auctionQueue.length&&!G.over){
    const idx=G.auctionQueue.shift();
    log('🔨 Аукцион банка: «'+CELLS[idx].name+'»');
    await runAuction(idx);
    if(!okG(sid))return;
  }
}
function checkWin(){
  const alive=G.players.filter(p=>p.alive);
  if(alive.length===1){
    G.over=true;
    G.history.push({turn:G.turnCount,worths:G.players.map(p=>netWorthOf(G,p.id))});
    const rep=awardCareer(alive[0].id); // Фича 6: репутация за победу
    delSlot(0);updateSaveUI();
    showResults(alive[0],rep);
    return true;
  }
  return false;
}
function buildChartHtml(){
  const H=G.history||[];
  if(H.length<2)return '<div style="color:#9fb0d8;font-size:12px;text-align:center;padding:8px">Партия слишком короткая для графика капитала</div>';
  const W=600,Hh=240,pad=30;
  let maxW=1500;
  H.forEach(h=>h.worths.forEach(w=>{if(w>maxW)maxW=w;}));
  const n=H.length;
  const X=i=>pad+(i/(n-1))*(W-2*pad);
  const Y=v=>Hh-pad-(Math.max(0,v)/maxW)*(Hh-2*pad);
  let grid='';
  for(let g=0;g<=4;g++){
    const v=maxW*g/4;const y=Y(v);
    grid+='<line x1="'+pad+'" y1="'+y+'" x2="'+(W-pad)+'" y2="'+y+'" stroke="#39456B" stroke-width="1" opacity=".5"/>'+
      '<text x="'+(pad-5)+'" y="'+(y+4)+'" font-size="10" fill="#8fa0c9" text-anchor="end">$'+Math.round(v)+'</text>';
  }
  const lines=G.players.map(p=>{
    const pts=H.map((h,i)=>X(i)+','+Y(h.worths[p.id]||0)).join(' ');
    const last=Y(H[n-1].worths[p.id]||0);
    return '<polyline points="'+pts+'" fill="none" stroke="'+p.color+'" stroke-width="2.5" stroke-linejoin="round" opacity="'+(p.alive?'1':'0.45')+'"/>'+
      '<circle cx="'+X(n-1)+'" cy="'+last+'" r="3.5" fill="'+p.color+'"/>';
  }).join('');
  return '<svg viewBox="0 0 '+W+' '+Hh+'" style="width:100%;background:#161c2c;border:1px solid var(--line);border-radius:12px">'+grid+lines+'</svg>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:6px">'+G.players.map(p=>'<span style="font-size:11px;color:'+p.color+';font-weight:700">■ '+esc(p.name)+(p.alive?'':' 💥')+'</span>').join('')+'</div>';
}
function buildAchievementsHtml(){
  let html='';
  let bestIdx=-1,bestVal=0;
  for(let i=0;i<40;i++){if(G.houses[i]>0){const v=CELLS[i].price+G.houses[i]*(CELLS[i].hc||0);if(v>bestVal){bestVal=v;bestIdx=i;}}}
  if(bestIdx>=0){
    const h=G.houses[bestIdx];
    const lbl=h===6?'🏙 небоскрёб':h===7?'🏢 бизнес-центр':h===5?'🏨 отель':'🏠 дома ×'+h;
    html+='<div class="ach-row"><span class="ach-icon">🏨</span><span class="ach-name">Самая дорогая постройка</span><span class="ach-val">«'+esc(CELLS[bestIdx].name)+'» ('+lbl+') · '+esc(G.players[G.owner[bestIdx]].name)+'</span></div>';
  }else html+='<div class="ach-row"><span class="ach-icon">🏚</span><span class="ach-name">Самая дорогая постройка</span><span class="ach-val">Здания не строились</span></div>';
  let jmax=-1,jv=0;(G.jailTime||[]).forEach((v,i)=>{if(v>jv){jv=v;jmax=i;}});
  if(jmax>=0&&jv>0)html+='<div class="ach-row"><span class="ach-icon">🔒</span><span class="ach-name">Больше всех в тюрьме</span><span class="ach-val">'+esc(G.players[jmax].name)+' · '+jv+' ход(а)</span></div>';
  else html+='<div class="ach-row"><span class="ach-icon">😇</span><span class="ach-name">Тюрьма</span><span class="ach-val">Никто не сидел</span></div>';
  let peak=0,peakP=-1,peakTurn=0;(G.history||[]).forEach(h=>{h.worths.forEach((w,i)=>{if(w>peak){peak=w;peakP=i;peakTurn=h.turn;}});});
  if(peakP>=0)html+='<div class="ach-row"><span class="ach-icon">📈</span><span class="ach-name">Пик капитала</span><span class="ach-val">'+esc(G.players[peakP].name)+' · '+fmt(peak)+' (ход '+peakTurn+')</span></div>';
  let maxLap=0,lapP=-1;(G.stats||[]).forEach((s,i)=>{if(s&&s.laps>maxLap){maxLap=s.laps;lapP=i;}});
  if(lapP>=0&&maxLap>0)html+='<div class="ach-row"><span class="ach-icon">⭕</span><span class="ach-name">Марафонец (больше кругов)</span><span class="ach-val">'+esc(G.players[lapP].name)+' · '+maxLap+' круг(а)</span></div>';
  let rentKing=-1,rentV=0;(G.stats||[]).forEach((s,i)=>{if(s&&s.rentEarned>rentV){rentV=s.rentEarned;rentKing=i;}});
  if(rentKing>=0&&rentV>0)html+='<div class="ach-row"><span class="ach-icon">💰</span><span class="ach-name">Рантье (больше всех ренты)</span><span class="ach-val">'+esc(G.players[rentKing].name)+' · '+fmt(rentV)+'</span></div>';
  let builder=-1,bV=0;(G.stats||[]).forEach((s,i)=>{if(s&&s.buildingsBuilt>bV){bV=s.buildingsBuilt;builder=i;}});
  if(builder>=0&&bV>0)html+='<div class="ach-row"><span class="ach-icon">🏗</span><span class="ach-name">Застройщик</span><span class="ach-val">'+esc(G.players[builder].name)+' · '+bV+' здан.</span></div>';
  const dead=G.players.filter(p=>!p.alive);
  if(dead.length)html+='<div class="ach-row"><span class="ach-icon">💥</span><span class="ach-name">Банкротов</span><span class="ach-val">'+dead.map(p=>esc(p.name)).join(', ')+'</span></div>';
  return html;
}
function showResults(winner,rep){
  Snd.win();confetti();
  $('#res-title').innerHTML='🏆 ПОБЕДА: '+esc(winner.name)+'!';
  const dur=Math.round((Date.now()-G.start)/60000);
  const repLine=(rep&&rep>0)?'<div class="ach-row"><span class="ach-icon">🏅</span><span class="ach-name">Репутация за победу</span><span class="ach-val">+'+rep+'</span></div>':'';
  $('#res-body').innerHTML=
    '<div style="font-size:56px;margin:10px 0">'+TOKENS[winner.token].e+'</div>'+
    '<div class="res-hdr">ДИНАМИКА КАПИТАЛА</div>'+buildChartHtml()+
    '<div class="res-hdr">ИТОГИ ПАРТИИ</div>'+
    '<table class="rent-table" style="color:#d7def2">'+
      G.players.map(p=>'<tr><td>'+TOKENS[p.token].e+' '+esc(p.name)+' '+(p.alive?'':'💥')+'</td><td>'+(p.alive?fmt(netWorthOf(G,p.id)):'банкрот')+'</td></tr>').join('')+
    '</table>'+
    '<div class="res-hdr">ДОСТИЖЕНИЯ ПАРТИИ</div>'+buildAchievementsHtml()+repLine+
    '<div style="color:#9fb0d8;font-size:13px;margin-top:10px">Раундов: '+G.round+' · Ходов: '+G.turnCount+' · Длительность: ~'+dur+' мин</div>';
  $('#screen-results').classList.add('show');
  $('#hud').classList.remove('show');
}
function confetti(){
  const cols=['#E23B3B','#2A7DE1','#F2C500','#3FA34D','#B44AE0','#FF7A1A'];
  for(let i=0;i<90;i++){
    const d=document.createElement('div');d.className='confetti';
    d.style.left=Math.random()*100+'vw';d.style.background=pick(cols);
    d.style.animationDuration=(2+Math.random()*2.5)+'s';d.style.animationDelay=(Math.random()*1.5)+'s';
    document.body.appendChild(d);setTimeout(()=>d.remove(),6000);
  }
}
async function endTurn(){
  if(!G||G.over)return;
  const sid=G.id;
  G.history.push({turn:G.turnCount,worths:G.players.map(p=>netWorthOf(G,p.id))});
  saveGame();
  await flushAuctionQueue();
  if(!okG(sid)||G.over)return;
  if(checkWin())return;
  const nxt=nextAlive(G.cur);
  G.pendingRound=nxt<=G.cur;
  G.cur=nxt;
  updHUD();
  await startTurn();
}
async function onRollClick(){
  const p=cp();
  if(!p||p.ai||G.over)return;
  if(!(G.phase==='idle'||G.phase==='rollagain'))return;
  const sid=G.id;
  if(p.inJail&&!p.jailChoice){await jailIntro(p.id);if(!okG(sid))return;}
  if(p.inJail&&p.jailChoice==='try'){
    G.phase='anim';setControls();
    cineDiceIn();
    const d=await animateDice();if(!okG(sid))return;
    G.dice=d;updDiceHUD();
    if(d[0]===d[1]){
      cineDiceOut();
      releaseJail(p);log('🎲 Дубль '+d[0]+'+'+d[1]+' — побег удался!');
      await moveSteps(p.id,d[0]+d[1]);if(!okG(sid))return;
      if(p.alive)await resolveCell(p.id);if(!okG(sid))return;
    }else{
      cineDiceOut();
      p.jailTurns++;
      log('🔒 '+esc(p.name)+': дубль не выпал ('+p.jailTurns+'/3)');
      if(p.jailTurns>=3){
        toast('3 попытки — оплата $50 обязательна');moneyFX(p.id,null,2);
        await payTo(p.id,50,-1,true);if(!okG(sid))return;
        if(p.alive){releaseJail(p);await moveSteps(p.id,d[0]+d[1]);if(!okG(sid))return;if(p.alive)await resolveCell(p.id);if(!okG(sid))return;}
      }else{toast('Без дубля. Остались в тюрьме');Snd.bad();}
    }
    if(!okG(sid))return;
    if(!p.alive){await endTurn();return;}
    G.phase='done';updHUD();return;
  }
  if(p.inJail){
    if(p.jailChoice==='pay'){moneyFX(p.id,null,2);await payTo(p.id,50,-1,true);if(!okG(sid))return;if(!p.alive){await endTurn();return;}releaseJail(p);}
    else{p.jailCards--;releaseJail(p);}
  }
  G.phase='anim';setControls();
  const res=await doRoll(p.id);
  if(!okG(sid))return;
  if(!p.alive){await endTurn();return;}
  if(res.cont){G.phase='rollagain';toast('Дубль! Бросьте ещё раз');}
  else G.phase='done';
  updHUD();
}
async function onEndClick(){
  const p=cp();
  if(!p||p.ai||G.phase!=='done')return;
  Snd.click();
  await endTurn();
}
