/* ============ 7. МОДАЛКИ ============ */
const modalRoot=$('#modal-root');
function showModal(html,opts){
  opts=opts||{};
  modalRoot.innerHTML='<div class="modal-card '+(opts.wide?'wide':'')+'">'+html+'</div>';
  modalRoot.classList.add('show');
}
function hideModal(){modalRoot.classList.remove('show');modalRoot.innerHTML='';MC.resolve=null;}
function cellBanner(idx){
  const c=CELLS[idx];
  const band=c.t==='street'?GROUPS[c.g].c:(c.t==='rr'?'#6B7280':'#9CA3AF');
  let table='';
  if(c.t==='street'){
    table='<table class="rent-table">'+
      '<tr><td>Базовая рента</td><td>'+fmt(c.rents[0])+'</td></tr>'+
      '<tr><td>С 1 домом</td><td>'+fmt(c.rents[1])+'</td></tr>'+
      '<tr><td>С 2 домами</td><td>'+fmt(c.rents[2])+'</td></tr>'+
      '<tr><td>С 3 домами</td><td>'+fmt(c.rents[3])+'</td></tr>'+
      '<tr><td>С 4 домами</td><td>'+fmt(c.rents[4])+'</td></tr>'+
      '<tr><td>ОТЕЛЬ</td><td>'+fmt(c.rents[5])+'</td></tr>'+
      '<tr><td>НЕБОСКРЁБ</td><td>'+fmt(c.rents[5]*2)+'</td></tr>'+
      '<tr><td>Цена дома</td><td>'+fmt(c.hc)+'</td></tr></table>';
  }else if(c.t==='rr'){table='<table class="rent-table"><tr><td>1 вокзал</td><td>$25</td></tr><tr><td>2</td><td>$50</td></tr><tr><td>3</td><td>$100</td></tr><tr><td>4</td><td>$200</td></tr><tr><td>с депо</td><td>×2</td></tr></table>';}
  else if(c.t==='util'){table='<table class="rent-table"><tr><td>1 предприятие</td><td>4× кубики</td></tr><tr><td>2 предприятия</td><td>10× кубики</td></tr></table>';}
  return '<div class="prop-banner"><div class="band" style="background:'+band+'"></div>'+
    '<div class="body"><h3>'+esc(c.name)+'</h3>'+(c.price!=null?'Цена: <b>'+fmt(c.price)+'</b>':'')+table+'</div></div>';
}
function modsHtml(idx){
  const mods=cellModifiers(idx);
  if(!mods.length)return '';
  return '<div style="margin-bottom:8px"><div style="font-size:11px;color:#9fb0d8;letter-spacing:1px;margin-bottom:4px">АКТИВНЫЕ МОДИФИКАТОРЫ</div>'+mods.map(m=>'<div class="mod-line">'+m+'</div>').join('')+'</div>';
}
function rentNowHtml(idx){
  const o=G.owner[idx];
  if(o<0)return '';
  if(G.mortgaged[idx])return '<div class="mod-line">🏦 Клетка заложена — рента сейчас не взимается</div>';
  const sum=G.dice[0]+G.dice[1];
  const info=computeRent(idx,sum,cp().id,true);
  if(info.total<=0)return '';
  const diceNote=(CELLS[idx].t==='util')?' <span style="color:#8fa0c9">(при кубиках '+sum+')</span>':'';
  return '<div class="rent-lines">'+
    '<div class="rl" style="font-weight:800;font-size:14px"><span>💸 Актуальная рента сейчас'+diceNote+'</span><span>'+fmt(info.total)+'</span></div>'+
    info.lines.map(l=>'<div class="rl" style="font-size:11px;color:#9fb0d8"><span>'+l.t+'</span><span>'+(l.v>=0?'+':'')+fmt(l.v)+'</span></div>').join('')+
  '</div>';
}
function levelLabel(h){
  if(h===5)return '🏨 ОТЕЛЬ';
  if(h===6)return '🏙 НЕБОСКРЁБ';
  if(h===7)return '🏢 БИЗНЕС-ЦЕНТР';
  if(h>0)return '🏠 ×'+h;
  return '—';
}
function openCellInfo(idx){
  if(!G)return;
  const c=CELLS[idx];const o=G.owner[idx];
  const p=cp();
  let actions='';
  if(canActNow()){
    if(o>=0&&o!==p.id&&G.players[o].alive){
      actions+='<button class="btn primary" data-act="trade-for" data-idx="'+idx+'">🤝 СДЕЛКА ЗА ЭТУ КЛЕТКУ</button>';
    }else if(o===p.id){
      const chk=(c.t==='street')?chkBuild(p.id,idx):null;
      if(chk&&chk.ok)actions+='<button class="btn good" data-act="build-here" data-idx="'+idx+'">🏠 ПОСТРОИТЬ ('+fmt(effBuildCost(idx))+')</button>';
      if(G.custom.spec&&c.t==='street'){
        if(canSky(p.id,idx).ok)actions+='<button class="btn good" data-act="sky-here" data-idx="'+idx+'">🏙 НЕБОСКРЁБ ('+fmt(specCost(idx,'sky'))+')</button>';
        if(canBC(p.id,idx).ok)actions+='<button class="btn good" data-act="bc-here" data-idx="'+idx+'">🏢 БИЗНЕС-ЦЕНТР ('+fmt(specCost(idx,'bc'))+')</button>';
      }
      if(G.custom.spec&&canDepot(p.id,idx).ok)actions+='<button class="btn good" data-act="depot-here" data-idx="'+idx+'">🚉 ДЕПО ($100)</button>';
      if(G.houses[idx]>0)actions+='<button class="btn bad" data-act="sellh-here" data-idx="'+idx+'">🔻 ПРОДАТЬ ЗДАНИЕ</button>';
      if(!G.mortgaged[idx]&&G.houses[idx]===0)actions+='<button class="btn" data-act="mort-here" data-idx="'+idx+'">🏦 ЗАЛОЖИТЬ (+'+fmt(Math.floor(c.price/2))+')</button>';
      if(G.mortgaged[idx])actions+='<button class="btn blue" data-act="unmort-here" data-idx="'+idx+'">🏦 ВЫКУПИТЬ (−'+fmt(effUnmortCost(idx))+')</button>';
      actions+='<button class="btn ghost" data-act="assets-open">ВСЕ АКТИВЫ</button>';
    }else if(o===-1&&(c.t==='street'||c.t==='rr'||c.t==='util')){
      actions+='<div style="font-size:12px;color:#9fb0d8">Можно купить, остановившись на этой клетке</div>';
    }
  }
  const syndTag=(G.custom.synd&&G.syndicates.some(s=>s.cells.includes(idx)))?'<div style="text-align:center;color:#F2C500;font-size:12px;font-weight:800">🔗 ВХОДИТ В СИНДИКАТ (+$50 к ренте)</div>':'';
  const depotTag=(G.custom.spec&&G.depot[idx])?'<div style="text-align:center;color:#8ee6a0;font-size:12px;font-weight:800">🚉 ДЕПО: рента ×2</div>':'';
  const ownerTxt=o>=0?('Владелец: <b>'+esc(G.players[o].name)+'</b>'+(G.mortgaged[idx]?' · <span style="color:#E23B3B">заложено</span>':'')+(G.houses[idx]>0?' · '+levelLabel(G.houses[idx]):'')):'Свободно';
  Snd.click();
  showModal('<button class="x-btn" data-act="close">✕</button>'+
    '<div class="modal-title">'+esc(c.name)+'</div>'+cellBanner(idx)+syndTag+depotTag+rentNowHtml(idx)+modsHtml(idx)+
    '<div style="text-align:center;font-size:14px;margin-bottom:6px">'+ownerTxt+'</div>'+
    (actions?'<div class="btn-row">'+actions+'</div>':'')+
    '<div class="btn-row"><button class="btn ghost" data-act="close">ЗАКРЫТЬ</button></div>');
}
function openPlayerInfo(pid){
  if(!G)return;
  const p=G.players[pid];if(!p)return;
  Snd.click();
  const aiTxt=p.ai?['','🤖 Лёгкий бот','🤖 Средний бот','🤖 Сложный бот'][p.ai]:'🧑 Человек';
  const colorIdx=COLORS.indexOf(p.color);
  let html='<button class="x-btn" data-act="close">✕</button>';
  html+='<div class="modal-title">'+TOKENS[p.token].e+' '+esc(p.name)+(p.alive?'':' · 💥 БАНКРОТ')+'</div>';
  html+='<div style="text-align:center;color:#9fb0d8;font-size:12px;margin-bottom:10px">'+aiTxt+(colorIdx>=0?' · '+COLOR_NAMES[colorIdx]:'')+' · стоит на «'+esc(CELLS[p.pos].name)+'»'+(p.inJail?' · 🔒 в тюрьме ('+p.jailTurns+'/3)':'')+'</div>';
  const aggr=p.ai?Math.round((G.aiAggr&&G.aiAggr[pid]!=null?G.aiAggr[pid]:0)*100):null;
  html+='<div class="rent-lines">'+
    '<div class="rl"><span>💰 Деньги</span><span>'+fmt(p.money)+'</span></div>'+
    '<div class="rl"><span>📊 Капитал (оценка)</span><span>'+fmt(netWorthOf(G,pid))+'</span></div>'+
    (aggr!=null?'<div class="rl"><span>😠 Агрессия бота</span><span>'+aggr+'%</span></div>':'')+
    (p.jailCards>0?'<div class="rl"><span>🎟️ Карточки выхода из тюрьмы</span><span>×'+p.jailCards+'</span></div>':'')+
    ((p.passes&&(p.passes.tram+p.passes.fiber)>0)?'<div class="rl"><span>🎫 Свободный проезд</span><span>🚋×'+p.passes.tram+' · 📡×'+p.passes.fiber+'</span></div>':'')+
    (G.custom.subs&&G.subs.some(s=>s.owner===pid)?'<div class="rl"><span>🏭 Дочерние предприятия</span><span>'+G.subs.filter(s=>s.owner===pid).map(s=>GROUPS[s.group].n+(s.mortgaged?' 🔒':'')).join(', ')+'</span></div>':'')+
    (G.custom.tender?'<div class="rl"><span>🤝 Тендеры доступны</span><span>'+tendersLeft(pid)+' / '+tenderLimit()+'</span></div>':'')+
  '</div>';
  const props=ownedCells(pid);
  html+='<div style="font-size:11px;color:#9fb0d8;letter-spacing:1px;margin:6px 0">СОБСТВЕННОСТЬ ('+props.length+')</div>';
  if(props.length){
    props.forEach(idx=>{
      const c=CELLS[idx];
      const band=c.t==='street'?GROUPS[c.g].c:'#6B7280';
      const tags=(G.mortgaged[idx]?' 🔒':'')+(G.houses[idx]>0?' '+levelLabel(G.houses[idx]):'')+(G.depot[idx]?' 🚉':'')+((G.custom.synd&&G.syndicates.some(s=>s.cells.includes(idx)))?' 🔗':'');
      html+='<div class="prop-row" style="cursor:default"><span class="sw-color" style="background:'+band+'"></span><span class="pr-name">'+esc(c.name)+'</span><span class="pr-val">'+fmt(c.price||0)+tags+'</span></div>';
    });
  }else html+='<div style="color:#9fb0d8;font-size:12px">Пока ничего нет</div>';
  html+='<div class="btn-row">'+
    '<button class="btn blue" data-act="player-stats" data-pid="'+pid+'">📊 СТАТИСТИКА ИГРОКА</button>'+
    ((canActNow()&&pid!==cp().id&&p.alive)?'<button class="btn primary" data-act="player-trade" data-pid="'+pid+'">🤝 НАЧАТЬ СДЕЛКУ</button>':'')+
    '<button class="btn ghost" data-act="close">ЗАКРЫТЬ</button></div>';
  showModal(html,{wide:true});
}
function openPlayerStats(pid){
  if(!G)return;
  const p=G.players[pid];if(!p)return;
  const st=Object.assign(defStats(),G.stats[pid]||{});
  const bal=st.rentEarned-st.rentPaid;
  Snd.click();
  showModal('<button class="x-btn" data-act="close">✕</button>'+
    '<div class="modal-title">📊 СТАТИСТИКА: '+esc(p.name)+'</div>'+
    '<div class="rent-lines">'+
      '<div class="rl"><span>⭕ Пройденные круги</span><span>'+st.laps+'</span></div>'+
      '<div class="rl"><span>💸 Заплачено ренты</span><span>'+fmt(st.rentPaid)+'</span></div>'+
      '<div class="rl"><span>💰 Получено ренты</span><span>'+fmt(st.rentEarned)+'</span></div>'+
      '<div class="rl" style="font-weight:800"><span>⚖️ Рентный баланс</span><span style="color:'+(bal>=0?'#8ee6a0':'#ff9a9a')+'">'+(bal>=0?'+':'')+fmt(bal)+'</span></div>'+
      '<div class="rl"><span>🔒 Посещений тюрьмы</span><span>'+st.jails+'</span></div>'+
      '<div class="rl"><span>⛓ Ходов проведено в тюрьме</span><span>'+(G.jailTime[pid]||0)+'</span></div>'+
      '<div class="rl"><span>🏗 Построено зданий</span><span>'+st.buildingsBuilt+'</span></div>'+
    '</div>'+
    '<div class="btn-row"><button class="btn ghost" data-act="close">ЗАКРЫТЬ</button></div>');
}
