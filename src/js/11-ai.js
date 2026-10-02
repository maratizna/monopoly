/* ============ 10. СТРОИТЕЛЬСТВО / АКТИВЫ ============ */
function groupHasMortgaged(g){return GROUP_CELLS[g].some(i=>G.mortgaged[i]);}
function buildHouse(pi,idx){
  const chk=chkBuild(pi,idx);
  if(!chk.ok){toast(chk.msg);return;}
  const p=G.players[pi],c=CELLS[idx];
  const cost=effBuildCost(idx);
  p.money-=cost;moneyFX(pi,null,3);
  if(G.houses[idx]===4)G.bankHotels--;else G.bankHouses--;
  G.houses[idx]++;
  if(G.stats[pi])G.stats[pi].buildingsBuilt++;
  stockBump('steel'); // Фича 5
  updateHouseMesh(idx);Snd.build();refreshHeatmap();
  fxBuildAt(tileAnchors[idx].position.clone(),p.color); // Фича 2: пыль+искры
  log('🏠 '+esc(p.name)+' строит на «'+c.name+'» (−'+fmt(cost)+')');
  updHUD();
}
function sellLevel(pi,idx){
  if(G.houses[idx]<=0)return;
  forceSellLevel(idx);
  log('🔻 '+esc(G.players[pi].name)+' продаёт здание на «'+CELLS[idx].name+'»');
}
function buildSky(pi,idx){const ch=canSky(pi,idx);if(!ch.ok){toast(ch.msg||'Нельзя');return;}
  const p=G.players[pi];p.money-=specCost(idx,'sky');moneyFX(pi,null,4);G.bank.sky--;G.houses[idx]=6;
  if(G.stats[pi])G.stats[pi].buildingsBuilt++;
  stockBump('tech',2);
  updateHouseMesh(idx);Snd.build();refreshHeatmap();
  fxBuildAt(tileAnchors[idx].position.clone(),'#9fd6f2');
  log('🏙 '+esc(p.name)+' возводит НЕБОСКРЁБ на «'+CELLS[idx].name+'»');updHUD();}
function buildBC(pi,idx){const ch=canBC(pi,idx);if(!ch.ok){toast(ch.msg||'Нельзя');return;}
  const p=G.players[pi];p.money-=specCost(idx,'bc');moneyFX(pi,null,3);G.bank.office--;G.houses[idx]=7;
  if(G.stats[pi])G.stats[pi].buildingsBuilt++;
  stockBump('tech');
  updateHouseMesh(idx);Snd.build();refreshHeatmap();
  fxBuildAt(tileAnchors[idx].position.clone(),p.color);
  log('🏢 '+esc(p.name)+' открывает БИЗНЕС-ЦЕНТР на «'+CELLS[idx].name+'»');updHUD();}
function buildDepot(pi,idx){const ch=canDepot(pi,idx);if(!ch.ok){toast(ch.msg||'Нельзя');return;}
  const p=G.players[pi];p.money-=100;moneyFX(pi,null,2);G.bank.depot--;G.depot[idx]=true;
  if(G.stats[pi])G.stats[pi].buildingsBuilt++;
  updateHouseMesh(idx);Snd.build();log('🚉 '+esc(p.name)+' строит ДЕПО на «'+CELLS[idx].name+'»');updHUD();}
function sellDepot(pi,idx){if(!G.depot[idx])return;G.depot[idx]=false;G.bank.depot++;G.players[pi].money+=50;moneyFX(null,pi,2);updateHouseMesh(idx);log('🚉 Депо продано (+$50)');updHUD();}
function openBuildModal(){
  const p=cp();if(!p||p.ai||!G)return;
  const gs=Object.keys(GROUP_CELLS).filter(g=>ownsAllIn(G,p.id,g));
  Snd.click();
  let bankLine='Банк: 🏠 '+G.bankHouses+' · 🏨 '+G.bankHotels;
  if(G.custom.spec)bankLine+=' · 🏙 '+G.bank.sky+' · 🏢 '+G.bank.office+' · 🚉 '+G.bank.depot;
  if(G.custom.eras&&G.era.phase==='boom')bankLine+=' · 🟡 спецпостройки −10%';
  let html='<button class="x-btn" data-act="close">✕</button>'+
    '<div class="modal-title">🏠 СТРОИТЕЛЬСТВО И ПРОЕКТЫ</div>'+
    '<div style="font-size:12px;color:#9fb0d8;text-align:center;margin-bottom:10px">'+bankLine+'</div>';
  if(!gs.length&&!ownedCells(p.id).some(i=>CELLS[i].t==='rr')){
    html+='<div style="color:#9fb0d8;font-size:13px;text-align:center">Нет полных цветовых групп</div>';
  }
  gs.forEach(g=>{
    html+='<div style="margin-bottom:12px"><div style="font-weight:800;font-size:13px;margin-bottom:6px"><span class="pdot" style="background:'+GROUPS[g].c+';width:12px;height:12px"></span> '+GROUPS[g].n+' группа'+(groupHasMortgaged(g)?' · <span style="color:#E23B3B">заложена</span>':'')+'</div>';
    GROUP_CELLS[g].forEach(idx=>{
      const h=G.houses[idx];
      html+='<div class="prop-row">'+
        '<span class="sw-color" style="background:'+GROUPS[g].c+'"></span>'+
        '<span class="pr-name">'+esc(CELLS[idx].name)+'</span>'+
        '<span class="pr-val">'+levelLabel(h)+(h<5&&h!==7?' · '+fmt(effBuildCost(idx)):'')+'</span>';
      const chk=chkBuild(p.id,idx);
      if(chk.ok)html+='<button class="btn good mini-btn" data-act="build" data-idx="'+idx+'">+</button>';
      if(h>0)html+='<button class="btn bad mini-btn" data-act="sellh" data-idx="'+idx+'">−</button>';
      if(G.custom.spec){
        if(canSky(p.id,idx).ok)html+='<button class="btn good mini-btn" data-act="build-sky" data-src="build" data-idx="'+idx+'" title="Небоскрёб">🏙 '+fmt(specCost(idx,'sky'))+'</button>';
        if(canBC(p.id,idx).ok)html+='<button class="btn blue mini-btn" data-act="build-bc" data-src="build" data-idx="'+idx+'" title="Бизнес-центр">🏢 '+fmt(specCost(idx,'bc'))+'</button>';
      }
      html+='</div>';
    });
    html+='</div>';
  });
  if(G.custom.spec){
    const rrs=ownedCells(p.id).filter(i=>CELLS[i].t==='rr');
    if(rrs.length){
      html+='<div style="font-weight:800;font-size:13px;margin:10px 0 6px">🚉 Вокзалы (депо)</div>';
      rrs.forEach(idx=>{
        html+='<div class="prop-row"><span class="sw-color" style="background:#6B7280"></span>'+
          '<span class="pr-name">'+esc(CELLS[idx].name)+'</span>'+
          '<span class="pr-val">'+(G.depot[idx]?'депо ×2':'нет депо')+'</span>'+
          (G.depot[idx]
            ?'<button class="btn bad mini-btn" data-act="depot-sell" data-src="build" data-idx="'+idx+'">Продать $50</button>'
            :(canDepot(p.id,idx).ok?'<button class="btn good mini-btn" data-act="depot-build" data-src="build" data-idx="'+idx+'">Депо $100</button>':''))+
          '</div>';
      });
    }
  }
  if(G.custom.subs){
    const my=G.subs.filter(s=>s.owner===p.id);
    html+='<div style="font-weight:800;font-size:13px;margin:12px 0 6px">🏭 Дочерние предприятия ('+my.length+'/2 · в банке '+G.bank.sub+')</div>';
    my.forEach((s,i)=>{
      html+='<div class="prop-row"><span class="sw-color" style="background:'+GROUPS[s.group].c+'"></span>'+
        '<span class="pr-name">'+GROUPS[s.group].n+' группа'+(s.mortgaged?' · 🔒 заложено':'')+'</span>'+
        '<button class="btn mini-btn" data-act="sub-mort" data-src="build" data-i="'+i+'">'+(s.mortgaged?'Выкуп $275':'Залог $250')+'</button>'+
        '<button class="btn bad mini-btn" data-act="sub-sell" data-src="build" data-i="'+i+'">Продать $200</button></div>';
    });
    const eligible=gs.filter(g=>GROUP_CELLS[g].some(i=>G.houses[i]>=5));
    if(my.length<2&&G.bank.sub>0&&eligible.length&&p.money>=700){
      eligible.forEach(g=>{
        html+='<div class="prop-row"><span class="sw-color" style="background:'+GROUPS[g].c+'"></span>'+
          '<span class="pr-name">Открыть предприятие: '+GROUPS[g].n+'</span>'+
          '<button class="btn good mini-btn" data-act="sub-open" data-src="build" data-g="'+g+'">🏭 $700</button></div>';
      });
    }else if(my.length<2&&G.bank.sub>0&&!eligible.length){
      html+='<div style="color:#9fb0d8;font-size:12px">Нужна монополия с отелем/небоскрёбом.</div>';
    }
  }
  if(G.custom.infra){
    html+='<div style="font-weight:800;font-size:13px;margin:12px 0 6px">🏗 Инфраструктуры</div>';
    const item=(k,emoji,name,desc)=>{
      const built=G.infra[k];
      return '<div class="prop-row" style="flex-direction:column;align-items:stretch">'+
        '<div style="font-weight:800">'+emoji+' '+name+(built?' · <span style="color:#8ee6a0">ПОСТРОЕНА</span>':'')+'</div>'+
        '<div style="color:#9fb0d8;font-size:12px">'+desc+'</div>'+
        '<div class="btn-row" style="margin-top:8px;justify-content:flex-start">'+
        (!built?'<button class="btn good mini-btn" data-act="infra-build" data-k="'+k+'">ПОСТРОИТЬ $300</button>':'')+
        '<button class="btn mini-btn" data-act="infra-pass" data-k="'+k+'">🎫 Свободный проезд $150 (у вас: '+(p.passes[k]||0)+')</button>'+
        '</div></div>';
    };
    html+=item('tram','🚋','Трамвайная линия','Рента всех вокзалов +25%, монополисту вокзалов +50%.');
    html+=item('fiber','📡','Оптоволоконная сеть','Рента всех коммуникаций +25%, монополисту +50%.');
  }
  if(G.custom.synd){
    const mine=G.syndicates.filter(s=>s.owner===p.id);
    const others=G.syndicates.filter(s=>s.owner!==p.id);
    const pairs=[];
    const sts=ownedCells(p.id).filter(i=>CELLS[i].t==='street');
    for(let a=0;a<sts.length;a++)for(let b=a+1;b<sts.length;b++){
      const i=sts[a],j=sts[b];
      if(CELLS[i].g===CELLS[j].g)continue;
      if(!syndAdjacent(i,j))continue;
      if(G.syndicates.some(s=>s.cells.includes(i)&&s.cells.includes(j)))continue;
      pairs.push([i,j]);
    }
    html+='<div style="font-weight:800;font-size:13px;margin:12px 0 6px">🔗 Синдикаты (+$50 к ренте)</div>';
    if(mine.length)mine.forEach(s=>{html+='<div class="prop-row"><span class="pr-name">«'+esc(CELLS[s.cells[0]].name)+'» + «'+esc(CELLS[s.cells[1]].name)+'»</span><span class="pr-val" style="color:#F2C500">+$50</span></div>';});
    if(others.length)others.forEach(s=>{html+='<div class="prop-row"><span class="pr-name">'+esc(G.players[s.owner].name)+': «'+esc(CELLS[s.cells[0]].name)+'» + «'+esc(CELLS[s.cells[1]].name)+'»</span><span class="pr-val" style="color:#E23B3B">+$50 вам при попадании</span></div>';});
    if(pairs.length)pairs.forEach(pr=>{
      html+='<div class="prop-row"><span class="sw-color" style="background:'+GROUPS[CELLS[pr[0]].g].c+'"></span><span class="sw-color" style="background:'+GROUPS[CELLS[pr[1]].g].c+';margin-left:-6px"></span>'+
        '<span class="pr-name">«'+esc(CELLS[pr[0]].name)+'» + «'+esc(CELLS[pr[1]].name)+'»</span>'+
        '<button class="btn good mini-btn" data-act="synd-make" data-a="'+pr[0]+'" data-b="'+pr[1]+'">🔗</button></div>';
    });
    else if(!mine.length)html+='<div style="color:#9fb0d8;font-size:12px">Нет доступных пар: нужны улицы разных цветов рядом или через одну клетку.</div>';
  }
  html+='<div class="btn-row"><button class="btn ghost" data-act="close">ЗАКРЫТЬ</button></div>';
  showModal(html,{wide:true});
}
function openAssetsModal(){
  const p=cp();if(!p||p.ai||!G)return;
  const props=ownedCells(p.id);
  if(!props.length){toast('У вас нет собственности');return;}
  Snd.click();
  const noMort=G.perkNoMortgage&&G.perkNoMortgage[p.id];
  let html='<button class="x-btn" data-act="close">✕</button>'+
    '<div class="modal-title">🏦 АКТИВЫ И ИПОТЕКА</div>'+
    '<div style="text-align:center;font-size:14px;margin-bottom:10px">Баланс: <b style="color:var(--accent)">'+fmt(p.money)+'</b>'+(noMort?' · <span style="color:#E23B3B">ипотека запрещена (перк)</span>':'')+'</div>';
  props.forEach(idx=>{
    const c=CELLS[idx];const mg=G.mortgaged[idx];
    const band=c.t==='street'?GROUPS[c.g].c:'#6B7280';
    let btns='';
    if(G.houses[idx]>0)btns+='<button class="btn bad mini-btn" data-act="sellh" data-src="assets" data-idx="'+idx+'" title="Продать здание">−</button>';
    if(mg)btns+='<button class="btn blue mini-btn" data-act="unmort" data-src="assets" data-idx="'+idx+'">Выкуп '+fmt(effUnmortCost(idx))+'</button>';
    else if(G.houses[idx]===0&&!noMort)btns+='<button class="btn mini-btn" data-act="mort" data-src="assets" data-idx="'+idx+'">Залог '+fmt(Math.floor(c.price/2))+'</button>';
    html+='<div class="prop-row">'+
      '<span class="sw-color" style="background:'+band+'"></span>'+
      '<span class="pr-name">'+esc(c.name)+(G.houses[idx]>0?' '+levelLabel(G.houses[idx]):'')+(mg?' 🔒':'')+(G.depot[idx]?' 🚉':'')+'</span>'+
      btns+
    '</div>';
  });
  html+='<div style="font-size:12px;color:#9fb0d8;text-align:center;margin-top:6px">Дома, спецпостройки, инфраструктуры и синдикаты — в окне «Строить»</div>';
  html+='<div class="btn-row"><button class="btn ghost" data-act="close">ЗАКРЫТЬ</button></div>';
  showModal(html,{wide:true});
}
function propValueTo(pi,idx){
  const c=CELLS[idx];let v=c.price||200;
  if(c.t==='street'){
    const g=c.g,own=GROUP_CELLS[g].filter(i=>G.owner[i]===pi).length;
    if(ownsAllIn(G,pi,g))v*=1.8;else if(own>0)v*=1.2;else v*=0.8;
  }else{
    const n=ownedCells(pi).filter(x=>CELLS[x].t===c.t).length;
    v*=n>=1?1.2:0.8;
  }
  return v;
}
function openTradeModal(targetPid){
  const p=cp();if(!p||p.ai||!G)return;
  const others=G.players.filter(q=>q.alive&&q.id!==p.id);
  if(!others.length){toast('Нет других игроков');return;}
  let target=others[0].id;
  if(targetPid!=null&&others.some(o=>o.id===targetPid))target=targetPid;
  MC.trade={target,give:new Set(),take:new Set(),giveCash:0,takeCash:0};
  renderTradeModal();
}
function renderTradeModal(){
  const p=cp(),t=MC.trade;if(!t||!p)return;
  const others=G.players.filter(q=>q.alive&&q.id!==p.id);
  const tp=G.players[t.target];
  const rows=(list,set,prefix)=>list.map(idx=>{
    const c=CELLS[idx];const band=c.t==='street'?GROUPS[c.g].c:'#6B7280';
    const sel=set.has(idx);
    const cls=sel?(prefix==='give'?' sel-give':' sel-take'):'';
    return '<div class="prop-row'+cls+'" data-act="tg-'+prefix+'" data-idx="'+idx+'">'+
      (sel?'<b style="color:'+(prefix==='give'?'#ff9a9a':'#8ee6a0')+'">✔</b>':'')+
      '<span class="sw-color" style="background:'+band+'"></span>'+
      '<span class="pr-name">'+esc(c.name)+(G.mortgaged[idx]?' 🔒':'')+'</span>'+
      '<span class="pr-val">'+fmt(c.price||200)+'</span></div>';
  }).join('')||'<div style="color:#9fb0d8;font-size:12px;padding:6px">Пусто</div>';
  showModal('<button class="x-btn" data-act="close">✕</button>'+
    '<div class="modal-title">🤝 СДЕЛКА</div>'+
    '<div class="cash-input">С кем: <select id="trade-target">'+others.map(o=>'<option value="'+o.id+'" '+(o.id===t.target?'selected':'')+'>'+esc(o.name)+(o.ai?' 🤖':'')+'</option>').join('')+'</select></div>'+
    '<div class="trade-grid">'+
      '<div class="trade-col"><h4>ВЫ ОТДАЁТЕ ('+esc(p.name)+')</h4>'+
        '<div class="cash-input">Деньги: <input type="number" id="give-cash" min="0" step="10" value="'+(t.giveCash||0)+'"></div>'+
        rows(ownedCells(p.id),t.give,'give')+
      '</div>'+
      '<div class="trade-col"><h4>ВЫ ПОЛУЧАЕТЕ ('+esc(tp.name)+')</h4>'+
        '<div class="cash-input">Деньги: <input type="number" id="take-cash" min="0" step="10" value="'+(t.takeCash||0)+'"></div>'+
        rows(ownedCells(t.target),t.take,'take')+
      '</div>'+
    '</div>'+
    '<div class="btn-row">'+
      '<button class="btn ghost" data-act="close">ОТМЕНА</button>'+
      '<button class="btn primary" data-act="trade-offer">ПРЕДЛОЖИТЬ ОБМЕН</button>'+
    '</div>',{wide:true});
}
function readTradeCash(){
  if(!MC.trade)return;
  const gcEl=$('#give-cash'),tcEl=$('#take-cash');
  MC.trade.giveCash=Math.max(0,parseInt(gcEl?gcEl.value:'0',10)||0);
  MC.trade.takeCash=Math.max(0,parseInt(tcEl?tcEl.value:'0',10)||0);
}
async function proposeTrade(pi,targetId,give,take,giveCash,takeCash){
  if(!G)return false;
  const sid=G.id;
  const p=G.players[pi],t=G.players[targetId];
  const tGive=takeCash+[...take].reduce((s,i)=>s+propValueTo(targetId,i),0);
  const tTake=giveCash+[...give].reduce((s,i)=>s+propValueTo(targetId,i),0);
  let accept=false;
  if(t.ai){
    await sleep(800);
    if(!okG(sid))return false;
    const margin=t.ai===3?30:(t.ai===2?10:-80);
    accept=(tTake-tGive)>margin&&p.money>=giveCash&&t.money>=takeCash;
  }else{
    MC.waiting=false;
    const ans=await new Promise(res=>{
      MC.resolve=res;
      showModal('<div class="modal-title">🤝 ПРЕДЛОЖЕНИЕ СДЕЛКИ</div>'+
        '<div style="text-align:center;color:#cfd8f2;font-size:14px">'+esc(p.name)+' предлагает '+esc(t.name)+':</div>'+
        '<div class="trade-grid" style="margin-top:10px">'+
          '<div class="trade-col"><h4>Отдаёт '+esc(p.name)+'</h4><div>'+fmt(giveCash)+[...give].map(i=>'<div class="prop-row"><span class="pr-name">'+esc(CELLS[i].name)+'</span></div>').join('')+'</div></div>'+
          '<div class="trade-col"><h4>Просит у '+esc(t.name)+'</h4><div>'+fmt(takeCash)+[...take].map(i=>'<div class="prop-row"><span class="pr-name">'+esc(CELLS[i].name)+'</span></div>').join('')+'</div></div>'+
        '</div>'+
        '<div class="btn-row"><button class="btn bad" data-act="trade-decline">ОТКЛОНИТЬ</button><button class="btn good" data-act="trade-accept">ПРИНЯТЬ</button></div>',{wide:true});
    });
    if(!okG(sid))return false;
    accept=ans==='accept';
  }
  /* Фича 7: память ИИ — бот запоминает отказ/согласие */
  if(p.ai&&G.aiMemory){
    const m=G.aiMemory[p.id]||(G.aiMemory[p.id]={});
    const r=m[targetId]||(m[targetId]={refusals:0,snipes:0,friendly:0});
    if(accept)r.friendly++;else r.refusals++;
  }
  if(!accept){log('🤝 Сделка отклонена');toast('Сделка отклонена');return false;}
  if(p.money<giveCash||t.money<takeCash){toast('Не хватает наличных');return false;}
  p.money-=giveCash;t.money+=giveCash;
  t.money-=takeCash;p.money+=takeCash;
  if(giveCash>0)moneyFX(pi,targetId,3);
  if(takeCash>0)moneyFX(targetId,pi,3);
  give.forEach(i=>{G.owner[i]=targetId;updateHouseMesh(i);});
  take.forEach(i=>{G.owner[i]=pi;updateHouseMesh(i);});
  validateSyndicates();refreshHeatmap();
  log('🤝 Сделка заключена: '+esc(p.name)+' ⇄ '+esc(t.name));
  toast('✅ Сделка заключена!');Snd.coin();updHUD();
  return true;
}
async function aiTradePhase(p){
  if(!G||p.money<400)return;
  const sid=G.id;
  for(const g in GROUP_CELLS){
    const cells=GROUP_CELLS[g];
    const mine=cells.filter(i=>G.owner[i]===p.id);
    if(mine.length===0||mine.length===cells.length)continue;
    const missing=cells.filter(i=>G.owner[i]!==-1&&G.owner[i]!==p.id&&!G.mortgaged[i]&&G.houses[i]===0);
    if(!missing.length)continue;
    const idx=missing[0],ownerId=G.owner[idx];
    // Фича 7: дружелюбным предлагает чуть щедрее, «обидчикам» — меньше
    let mult=1.4;
    if(G.aiMemory&&G.aiMemory[p.id]&&G.aiMemory[p.id][ownerId]){
      const m=G.aiMemory[p.id][ownerId];
      mult+= (m.friendly||0)*0.05 - (m.refusals||0)*0.06;
    }
    const offer=Math.round(CELLS[idx].price*clamp(mult,1.0,1.8));
    if(p.money-offer<250)continue;
    log('🤝 '+esc(p.name)+' предлагает '+fmt(offer)+' за «'+CELLS[idx].name+'»');
    await proposeTrade(p.id,ownerId,new Set(),new Set([idx]),offer,0);
    if(!okG(sid))return;
    return;
  }
}
