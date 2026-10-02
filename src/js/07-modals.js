/* ============ 6. HUD ============ */
let logArr=[];
let logUnread=0;
function log(t){logArr.unshift(t);if(logArr.length>90)logArr.pop();renderLog();if(!$('#log-panel').classList.contains('show')){logUnread++;updateLogBadge();}}
function renderLog(){
  $('#log-body').innerHTML=logArr.map(l=>{
    if(l.indexOf('━━')===0)return '<div class="log-sep">'+l+'</div>';
    if(l.indexOf('▸')===0)return '<div class="log-turn">'+l+'</div>';
    return '<div>· '+l+'</div>';
  }).join('');
}
function updateLogBadge(){const b=$('#log-badge');if(!b)return;if(logUnread>0){b.style.display='inline-block';b.textContent=logUnread>9?'9+':String(logUnread);}else b.style.display='none';}
let toastTimer=null;
function toast(t){const el=$('#toast');el.innerHTML=t;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2800);}
function ownedCells(pi){return G?ownedCellsIn(G,pi):[];}
function propDot(idx){
  const c=CELLS[idx];
  const col=c.t==='street'?GROUPS[c.g].c:(c.t==='rr'?'#6B7280':'#9CA3AF');
  const synd=(G.custom.synd&&G.syndicates.some(s=>s.cells.includes(idx)))?'outline:1px solid #F2C500;':'';
  return '<span class="pdot '+(G.mortgaged[idx]?'mort':'')+'" style="background:'+col+';'+synd+'" title="'+esc(c.name)+'"></span>';
}
function updHUD(){
  if(!G)return;
  $('#topbar').innerHTML=G.players.map(p=>
    '<div class="pcard '+(p.id===G.cur&&p.alive?'active':'')+' '+(p.alive?'':'dead')+'" data-act="player-info" data-pid="'+p.id+'" title="Профиль игрока">'+
      '<div class="top"><div class="pavatar" style="background:'+p.color+'">'+TOKENS[p.token].e+'</div>'+
      '<div style="min-width:0"><div class="pname">'+esc(p.name)+(p.inJail?' 🔒':'')+(p.ai?' 🤖':'')+'</div></div></div>'+
      '<div class="pmoney">'+fmt(p.money)+(p.jailCards>0?' <span style="font-size:11px">🎟️×'+p.jailCards+'</span>':'')+((p.passes&&(p.passes.tram||p.passes.fiber))?' <span style="font-size:11px">🎫×'+(p.passes.tram+p.passes.fiber)+'</span>':'')+(G.custom.subs&&G.subs.filter(s=>s.owner===p.id).length?' <span style="font-size:11px">🏭×'+G.subs.filter(s=>s.owner===p.id).length+'</span>':'')+'</div>'+
      '<div class="pprops">'+ownedCells(p.id).map(propDot).join('')+'</div>'+
    '</div>').join('');
  renderLog();setControls();updMarketChip();applyEraBackground();refreshHeatmap();Ambient.apply();setHint();
}
function updMarketChip(){
  const el=$('#market-chip');if(!el)return;
  if(G&&!G.over&&G.custom.eras){
    el.style.display='block';
    const ph=G.era.phase;
    const gl={stable:'🟢',boom:'🟡',inflation:'🟠',recession:'🔴'}[ph];
    const left=5-(G.era.goCount%5);
    if(ph==='boom'){el.style.background='rgba(242,197,0,.2)';el.style.borderColor='#F2C500';el.style.color='#ffe37a';}
    else if(ph==='inflation'){el.style.background='rgba(240,120,24,.25)';el.style.borderColor='#F07818';el.style.color='#ffb066';}
    else if(ph==='recession'){el.style.background='rgba(226,59,59,.25)';el.style.borderColor='#E23B3B';el.style.color='#ff9a9a';}
    else{el.style.background='rgba(63,163,77,.25)';el.style.borderColor='#3FA34D';el.style.color='#8ee6a0';}
    if(eraOpen){el.classList.remove('mini');el.innerHTML=gl+' ЭРА: '+eraName().toUpperCase()+'<br>смена через '+left+' ГО';}
    else{el.classList.add('mini');el.innerHTML=gl;}
  }else if(G&&!G.over&&G.custom.cycles){
    el.style.display='block';el.classList.remove('mini');el.style.pointerEvents='none';
    const ph=G.market.phase;
    if(ph==='boom'){el.textContent='📈 БУМ: стройка +20%, монополии ×4';el.style.background='rgba(63,163,77,.25)';el.style.borderColor='#3FA34D';el.style.color='#8ee6a0';}
    else if(ph==='crisis'){el.textContent='📉 КРИЗИС: ренты −20%, выкуп без %';el.style.background='rgba(226,59,59,.25)';el.style.borderColor='#E23B3B';el.style.color='#ff9a9a';}
    else{el.textContent='📊 РЫНОК: СТАБИЛЬНО';el.style.background='rgba(42,51,80,.92)';el.style.borderColor='#39456B';el.style.color='#cfd8f2';}
  }else el.style.display='none';
}
function setHint(){
  const el=$('#hint');if(!el)return;
  if(!G||!$('#hud').classList.contains('show')){
    el.textContent='🖐 drag — вращение · 2 пальца — панорама и зум · тап по клетке — действия · тап по игроку — профиль';
    return;
  }
  const p=cp();let t='';
  if(G.custom.eras){
    const ph=G.era.phase;
    if(ph==='boom')t='📈 Эра Бума: ГО $300, ренты +25%, стройка +20%';
    else if(ph==='inflation')t='🟠 Инфляция: всё ×1.5, налог ×2';
    else if(ph==='recession')t='🔴 Рецессия: ГО $100, ренты −20%, выкуп без %, 2 тендера';
  }
  if(p&&!p.ai&&p.alive){
    if(G.phase==='idle')t=(t?t+' · ':'')+'Бросайте кубики! (Пробел)';
    else if(G.phase==='rollagain')t='Дубль! Бросайте ещё раз (Пробел)';
    else if(G.phase==='done')t='Можно строить/торговать/акции, затем «Завершить ход»';
  }
  el.textContent=t||'🖐 2 пальца — панорама и зум · тап по клетке — действия · тап по игроку — профиль';
}
function updDiceHUD(){
  const el=$('#dice-hud');if(!el)return;
  el.style.display=(SETS.showDice===false)?'none':'flex';
  el.innerHTML=G?G.dice.map(d=>'<div class="die">'+DICE_CH[d-1]+'</div>').join(''):'';
}
function cp(){return G.players[G.cur];}
function nextAlive(from){const n=G.players.length;for(let k=1;k<=n;k++){const j=(from+k)%n;if(G.players[j].alive)return j;}return from;}
function canActNow(){
  if(!G)return false;
  const p=cp();
  return !!(p&&!p.ai&&p.alive&&!G.over&&(G.phase==='idle'||G.phase==='done'||G.phase==='rollagain'));
}
function setControls(){
  if(!G)return;
  const p=cp();const human=p&&!p.ai&&p.alive;
  const canRoll=human&&!G.over&&(G.phase==='idle'||G.phase==='rollagain');
  const rb=$('#roll-btn');
  rb.disabled=!canRoll;
  const pulseOk=SETS.pulse!==false&&G.turnCount<=5;
  rb.classList.toggle('pulse',canRoll&&pulseOk);
  rb.textContent=(p&&p.inJail&&p.jailChoice==='try')?'БРОСИТЬ (НУЖЕН ДУБЛЬ)':(G.phase==='rollagain'?'БРОСИТЬ ЕЩЁ':'БРОСИТЬ');
  const endOk=!!(human&&G.phase==='done');
  $('#end-btn').disabled=!endOk;
  $('#end-btn').classList.toggle('pulse',endOk&&pulseOk);
  const acts=canActNow();
  $('#btn-build').disabled=!acts;$('#btn-trade').disabled=!acts;$('#btn-assets').disabled=!acts;
  $('#btn-stocks').style.display=(G.custom.stocks)?'':'none';
  $('#btn-stocks').disabled=!acts;
  setHint();
}
