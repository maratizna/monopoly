/* ============ 13. МЕНЮ / ЛОББИ / НАСТРОЙКИ ============ */
let lobbyCount=2;
const lobbySlots=[
  {name:'Игрок 1',color:0,token:0,ai:0},
  {name:'Бот Макс',color:1,token:1,ai:2},
  {name:'Бот Зоя',color:2,token:3,ai:1},
  {name:'Бот Лео',color:3,token:5,ai:3},
];
function renderLobby(){
  document.querySelectorAll('.cnt-btn').forEach(b=>b.classList.toggle('primary',+b.dataset.cnt===lobbyCount));
  $('#lobby-slots').innerHTML=lobbySlots.map((s,i)=>
    '<div class="lobby-slot '+(i<lobbyCount?'':'off')+'">'+
      '<input value="'+esc(s.name)+'" data-slot="'+i+'" class="l-name" maxlength="12">'+
      '<select data-slot="'+i+'" class="l-color">'+COLORS.map((c,k)=>'<option value="'+k+'" '+(k===s.color?'selected':'')+'>'+COLOR_NAMES[k]+'</option>').join('')+'</select>'+
      '<select data-slot="'+i+'" class="l-token">'+TOKENS.map((t,k)=>'<option value="'+k+'" '+(k===s.token?'selected':'')+'>'+t.e+' '+t.n+'</option>').join('')+'</select>'+
      '<select data-slot="'+i+'" class="l-ai">'+
        '<option value="0" '+(s.ai===0?'selected':'')+'>🧑 Человек</option>'+
        '<option value="1" '+(s.ai===1?'selected':'')+'>🤖 ИИ лёгкий</option>'+
        '<option value="2" '+(s.ai===2?'selected':'')+'>🤖 ИИ средний</option>'+
        '<option value="3" '+(s.ai===3?'selected':'')+'>🤖 ИИ сложный</option>'+
      '</select>'+
    '</div>').join('');
  $('#rule-parking').checked=!!SETS.fpj;
  CUSTOM_KEYS.forEach(k=>{const el=$('#cm-'+k);if(el)el.checked=!!CUSTOM[k];});
  $('#lobby-slots').querySelectorAll('select,input').forEach(el=>{
    el.addEventListener('change',()=>{
      const i=+el.dataset.slot,s=lobbySlots[i];
      if(el.classList.contains('l-name'))s.name=el.value||('Игрок '+(i+1));
      if(el.classList.contains('l-color'))s.color=+el.value;
      if(el.classList.contains('l-token'))s.token=+el.value;
      if(el.classList.contains('l-ai'))s.ai=+el.value;
    });
  });
}
function startFromLobby(){
  const slots=lobbySlots.slice(0,lobbyCount).map(s=>Object.assign({},s));
  const usedC=new Set(),usedT=new Set();
  slots.forEach(s=>{
    while(usedC.has(s.color))s.color=(s.color+1)%6;usedC.add(s.color);
    while(usedT.has(s.token))s.token=(s.token+1)%6;usedT.add(s.token);
  });
  SETS.fpj=$('#rule-parking').checked;saveSets();
  CUSTOM_KEYS.forEach(k=>{const el=$('#cm-'+k);if(el)CUSTOM[k]=el.checked;});
  saveCustom();
  newGame({slots:slots.map(s=>({name:s.name,color:COLORS[s.color],token:s.token,ai:s.ai})),custom:CUSTOM});
}
function openSettingsModal(){
  const av=(SETS.ambientVol==null?0.3:SETS.ambientVol);
  showModal('<div class="modal-title">⚙ НАСТРОЙКИ</div>'+
    '<div class="sw"><input type="checkbox" id="set-sound" '+(SETS.sound!==false?'checked':'')+'><label for="set-sound">Звуки и джинглы</label></div>'+
    '<div class="sw"><input type="checkbox" id="set-vibrate" '+(SETS.vibrate!==false?'checked':'')+'><label for="set-vibrate">Вибрация на мобильных (при броске кубиков)</label></div>'+
    '<div class="sw"><input type="checkbox" id="set-dice" '+(SETS.showDice!==false?'checked':'')+'><label for="set-dice">Кубики в интерфейсе (3D-кубики на доске всегда)</label></div>'+
    '<div class="sw"><input type="checkbox" id="set-pulse" '+(SETS.pulse!==false?'checked':'')+'><label for="set-pulse">Жёлтая пульсация кнопок (отключается после 5-го хода)</label></div>'+
    '<div class="sw"><input type="checkbox" id="set-focus" '+(SETS.softFocus!==false?'checked':'')+'><label for="set-focus">«Мягкий фокус» камеры на активной фишке</label></div>'+
    '<div class="sw"><input type="checkbox" id="set-fps" '+(SETS.fpsLock?'checked':'')+'><label for="set-fps">Лок 30 FPS (экономия батареи)</label></div>'+
    /* НОВЫЕ настройки */
    '<div class="custom-hdr">ВИЗУАЛ И ЗВУК</div>'+
    '<div class="sw"><input type="checkbox" id="set-cinecam" '+(SETS.cinecam?'checked':'')+'><label for="set-cinecam">🎬 Кино-камера (наезд на кубики, облёт при ренте, тряска при банкротстве)</label></div>'+
    '<div class="sw"><input type="checkbox" id="set-particles" '+(SETS.particles!==false?'checked':'')+'><label for="set-particles">✨ Эффекты частиц (пыль, искры, разрушение, блики)</label></div>'+
    '<div class="sw"><input type="checkbox" id="set-ambient" '+(SETS.ambient!==false?'checked':'')+'><label for="set-ambient">🔊 Фоновый амбиент (меняется от эры)</label></div>'+
    '<div class="sw" style="flex-direction:column;align-items:stretch"><label for="set-ambientvol" style="font-size:12px;color:#9fb0d8">Громкость амбиента: <span id="av-label">'+Math.round(av*100)+'%</span></label>'+
      '<input type="range" id="set-ambientvol" min="0" max="1" step="0.05" value="'+av+'"></div>'+
    '<div class="btn-row"><button class="btn primary" data-act="sets-ok">ГОТОВО</button></div>');
}
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('show'));
  if(id)$(id).classList.add('show');
}
function bindUI(){
  $('#btn-new').onclick=()=>{Snd.ensure();Snd.click();renderLobby();showScreen('#screen-lobby');};
  $('#btn-help').onclick=()=>{Snd.click();showScreen('#screen-help');};
  $('#btn-settings').onclick=()=>{Snd.ensure();Snd.click();openSettingsModal();};
  $('#btn-career').onclick=()=>{Snd.click();renderCareer();showScreen('#screen-career');};
  $('#help-back').onclick=()=>{Snd.click();showScreen('#screen-menu');};
  $('#lobby-back').onclick=()=>{Snd.click();showScreen('#screen-menu');};
  $('#lobby-start').onclick=()=>{Snd.click();startFromLobby();};
  document.querySelectorAll('.cnt-btn').forEach(b=>b.onclick=()=>{lobbyCount=+b.dataset.cnt;Snd.click();renderLobby();});
  $('#rule-parking').addEventListener('change',e=>{SETS.fpj=e.target.checked;saveSets();});
  CUSTOM_KEYS.forEach(k=>{const el=$('#cm-'+k);if(el)el.addEventListener('change',e=>{CUSTOM[k]=e.target.checked;saveCustom();});});
  $('#roll-btn').onclick=onRollClick;
  $('#end-btn').onclick=onEndClick;
  $('#btn-build').onclick=openBuildModal;
  $('#btn-trade').onclick=()=>openTradeModal();
  $('#btn-assets').onclick=openAssetsModal;
  $('#btn-stocks').onclick=openStockModal;                 // Фича 5
  $('#btn-heatmap').onclick=()=>{                          // Фича 3
    heatmapOn=!heatmapOn;
    $('#btn-heatmap').classList.toggle('on',heatmapOn);
    refreshHeatmap();Snd.click();
    toast(heatmapOn?'📊 Аналитика: красное — опасно, зелёное — ваши монополии':'📊 Аналитика выключена');
  };
  $('#btn-log').onclick=()=>{
    const panel=$('#log-panel');
    panel.classList.toggle('show');
    if(panel.classList.contains('show')){logUnread=0;updateLogBadge();}
    Snd.click();
  };
  $('#market-chip').onclick=()=>{if(G&&G.custom.eras&&!G.over){eraOpen=!eraOpen;updMarketChip();Snd.click();}};
  $('#ob-next').onclick=()=>{Snd.click();if(obIdx<obKeys.length-1){obIdx++;renderOb();}else closeOnboarding();};
  $('#ob-skip').onclick=()=>{Snd.click();closeOnboarding();};
  $('#pause-btn').onclick=()=>{
    if(!G)return;Snd.click();
    showModal('<div class="modal-title">⏸ ПАУЗА</div>'+
      '<div class="btn-row" style="flex-direction:column;align-items:stretch">'+
        '<button class="btn primary" data-act="pause-resume">▶ ПРОДОЛЖИТЬ</button>'+
        '<button class="btn blue" data-act="pause-save">💾 СОХРАНИТЬ И ВЫЙТИ В МЕНЮ</button>'+
        '<button class="btn" data-act="pause-rules">📖 ПРАВИЛА СЕССИИ</button>'+
        '<button class="btn" data-act="sets-open">⚙ НАСТРОЙКИ</button>'+
        '<button class="btn bad" data-act="pause-quit">🚪 ВЫЙТИ БЕЗ СОХРАНЕНИЯ</button>'+
      '</div>');
  };
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&G&&$('#hud').classList.contains('show'))$('#pause-btn').click();
    if(e.key===' '&&G&&!cp().ai&&$('#hud').classList.contains('show')&&!$('#modal-root').classList.contains('show')){e.preventDefault();onRollClick();}
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-act]');
    if(b)handleAct(b.dataset);
  });
  modalRoot.addEventListener('change',e=>{
    if(e.target.id==='trade-target'&&MC.trade){readTradeCash();MC.trade.target=+e.target.value;MC.trade.give=new Set();MC.trade.take=new Set();renderTradeModal();}
  });
  /* ползунок громкости амбиента — живой отклик */
  modalRoot.addEventListener('input',e=>{
    if(e.target.id==='set-ambientvol'){
      const v=parseFloat(e.target.value);const lbl=$('#av-label');if(lbl)lbl.textContent=Math.round(v*100)+'%';
      SETS.ambientVol=v;Ambient.apply();
    }
  });
  $('#import-file').addEventListener('change',e=>{
    const f=e.target.files&&e.target.files[0];
    if(f)importSavesFile(f);
    e.target.value='';
  });
}
function handleAct(d){
  const act=d.act;Snd.click();
  const R=v=>{if(MC.resolve){const r=MC.resolve;MC.resolve=null;hideModal();r(v);}else hideModal();};
  const RV=v=>{if(MC.resolve){const r=MC.resolve;MC.resolve=null;r(v);}};
  const reopen=()=>{if(d.src==='build')openBuildModal();else if(d.src==='assets')openAssetsModal();else hideModal();};
  switch(act){
    case 'close':hideModal();break;
    case 'sets-ok':
      SETS.sound=$('#set-sound').checked;
      SETS.vibrate=$('#set-vibrate').checked;
      SETS.showDice=$('#set-dice').checked;
      SETS.pulse=$('#set-pulse').checked;
      SETS.softFocus=$('#set-focus').checked;
      SETS.fpsLock=$('#set-fps').checked;
      SETS.cinecam=$('#set-cinecam').checked;
      SETS.particles=$('#set-particles').checked;
      SETS.ambient=$('#set-ambient').checked;
      const avv=$('#set-ambientvol');if(avv)SETS.ambientVol=parseFloat(avv.value);
      saveSets();hideModal();updDiceHUD();setControls();
      Ambient._lastVol=null;Ambient.apply(); // пересчитать амбиент
      if(!SETS.ambient){Ambient.started&&Ambient.noiseGain&&Ambient.noiseGain.gain.setTargetAtTime(0,Snd.ctx.currentTime,0.2);Ambient.padGain&&Ambient.padGain.gain.setTargetAtTime(0,Snd.ctx.currentTime,0.2);}
      break;
    case 'player-info':openPlayerInfo(+d.pid);break;
    case 'player-stats':openPlayerStats(+d.pid);break;
    case 'player-trade':{const pid=+d.pid;hideModal();if(!canActNow()||pid===cp().id)break;openTradeModal(pid);break;}
    case 'buy-yes':R('buy');break;
    case 'buy-auction':R('auction');break;
    case 'buy-x':R('auction');break;
    case 'card-ok':R(true);break;
    case 'ok':R(true);break;
    case 'jail-try':R('try');break;
    case 'jail-pay':R('pay');break;
    case 'jail-card':R('card');break;
    case 'rent-pay':R('pay');break;
    case 'rent-tender':R('tender');break;
    case 'auc-bid':{
      const inc=+d.inc;const bidder=G.players[(MC.aucBidder>=0?MC.aucBidder:G.cur)];
      const bidEl=$('#auc-bid');const cur=bidEl?(parseInt(bidEl.textContent.replace('$',''),10)||0):0;
      const nb=cur+inc;if(bidder.money<nb){toast('Не хватает наличных');return;}RV({bid:nb});break;}
    case 'auc-custom':{
      const v=parseInt(($('#auc-custom')?$('#auc-custom').value:'0'),10)||0;if(v<=0){toast('Введите сумму больше нуля');return;}
      const bidder=G.players[(MC.aucBidder>=0?MC.aucBidder:G.cur)];const bidEl=$('#auc-bid');
      const cur=bidEl?(parseInt(bidEl.textContent.replace('$',''),10)||0):0;const nb=cur+v;
      if(bidder.money<nb){toast('Не хватает наличных');return;}RV({bid:nb});break;}
    case 'auc-pass':RV({pass:true});break;
    case 'build':{buildHouse(cp().id,+d.idx);if(d.src==='assets')openAssetsModal();else openBuildModal();break;}
    case 'sellh':{const idx=+d.idx;if(G.houses[idx]>=6)sellSpecial(cp().id,idx);else sellLevel(cp().id,idx);if(d.src==='assets')openAssetsModal();else openBuildModal();break;}
    case 'build-sky':{buildSky(cp().id,+d.idx);reopen();break;}
    case 'sky-here':{buildSky(cp().id,+d.idx);hideModal();break;}
    case 'build-bc':{buildBC(cp().id,+d.idx);reopen();break;}
    case 'bc-here':{buildBC(cp().id,+d.idx);hideModal();break;}
    case 'depot-build':{buildDepot(cp().id,+d.idx);reopen();break;}
    case 'depot-here':{buildDepot(cp().id,+d.idx);hideModal();break;}
    case 'depot-sell':{sellDepot(cp().id,+d.idx);reopen();break;}
    case 'sub-open':{
      const p=cp();const g=d.g;
      if(p.money<700){toast('Нужно $700 наличными');break;}
      if(G.subs.filter(s=>s.owner===p.id).length>=2){toast('Максимум 2 предприятия');break;}
      if(G.bank.sub<1){toast('Нет маркеров в банке');break;}
      p.money-=700;moneyFX(p.id,null,4);G.bank.sub--;G.subs.push({owner:p.id,group:g,mortgaged:false});
      log('🏭 '+esc(p.name)+' открывает дочернее предприятие ('+GROUPS[g].n+' группа, −$700)');
      Snd.build();updHUD();openBuildModal();break;}
    case 'sub-sell':{
      const p=cp();const i=+d.i;const s=G.subs[i];
      if(s&&s.owner===p.id){G.subs.splice(i,1);G.bank.sub++;p.money+=200;moneyFX(null,p.id,2);log('🏭 Предприятие ликвидировано (+$200)');updHUD();openBuildModal();}
      break;}
    case 'sub-mort':{
      const p=cp();const i=+d.i;const s=G.subs[i];
      if(s&&s.owner===p.id){
        if(!s.mortgaged){if(p.money<250){toast('Нужно $250');break;}p.money-=250;s.mortgaged=true;moneyFX(p.id,null,2);log('🏭 Предприятие заложено (+$250)');}
        else{if(p.money<275){toast('Нужно $275');break;}p.money-=275;s.mortgaged=false;moneyFX(p.id,null,2);log('🏭 Предприятие выкуплено (−$275)');}
        updHUD();openBuildModal();
      }break;}
    /* Фича 5: операции с биржей */
    case 'stock-buy':{
      const p=cp();if(!p||p.ai||!canActNow()){toast('Покупка доступна в ваш ход');break;}
      const key=d.key;const corp=STOCK_CORPS.find(c=>c.key===key);if(!corp)break;
      const price=G.stocks.prices[key];
      if(p.money<price){toast('Не хватает денег');break;}
      p.money-=price;moneyFX(p.id,null,2);
      G.stocks.hold[p.id]=G.stocks.hold[p.id]||{};
      G.stocks.hold[p.id][key]=(G.stocks.hold[p.id][key]||0)+1;
      Snd.coin();log('📈 '+esc(p.name)+' купил акцию '+corp.name+' за '+fmt(price));updHUD();openStockModal();break;}
    case 'stock-sell':{
      const p=cp();if(!p||p.ai||!canActNow()){toast('Продажа доступна в ваш ход');break;}
      const key=d.key;const corp=STOCK_CORPS.find(c=>c.key===key);if(!corp)break;
      const owned=(G.stocks.hold[p.id]&&G.stocks.hold[p.id][key])||0;
      if(owned<=0){toast('Нет акций');break;}
      const price=G.stocks.prices[key];
      G.stocks.hold[p.id][key]--;p.money+=price;moneyFX(null,p.id,2);
      Snd.coin();log('📉 '+esc(p.name)+' продал акцию '+corp.name+' за '+fmt(price));updHUD();openStockModal();break;}
    case 'stock-found':{
      const p=cp();if(!p||p.ai||!canActNow())break;
      if(p.money<800){toast('Нужно $800');break;}
      p.money-=800;moneyFX(p.id,null,4);
      G.stocks.founded=G.stocks.founded||[];
      G.stocks.founded.push({owner:p.id,name:'Компания '+esc(p.name)});
      Snd.build();log('🏢 '+esc(p.name)+' основал компанию (−$800, +$30/ГО)');updHUD();openStockModal();break;}
    /* Фича 6: карьера */
    case 'career-back':showScreen('#screen-menu');updateSaveUI();break;
    case 'career-buy-perk':{
      const c=loadCareer();const perk=CAREER_PERKS.find(p=>p.id===d.id);if(!perk)break;
      if(c.unlockedPerks.includes(perk.id)){toast('Уже куплено');break;}
      if(c.rep<perk.cost){toast('Не хватает репутации ('+perk.cost+' 🏅)');break;}
      c.rep-=perk.cost;c.unlockedPerks.push(perk.id);saveCareer(c);renderCareer();toast('🏅 Перк «'+perk.name+'» открыт!');break;}
    case 'career-buy-color':{
      const c=loadCareer();const col=CAREER_COLORS.find(x=>x.id===d.id);if(!col)break;
      if(c.unlockedColors.includes(col.id)){toast('Уже куплено');break;}
      if(c.rep<col.cost){toast('Не хватает репутации ('+col.cost+' 🏅)');break;}
      c.rep-=col.cost;c.unlockedColors.push(col.id);saveCareer(c);renderCareer();toast('🏅 Цвет «'+col.name+'» открыт!');break;}
    case 'career-set-perk':{
      const c=loadCareer();c.activePerk=d.id||null;saveCareer(c);renderCareer();break;}
    case 'career-set-color':{
      const c=loadCareer();c.activeColor=d.id||null;saveCareer(c);renderCareer();break;}
    case 'mort':{doMortgage(+d.idx);if(d.src==='assets')openAssetsModal();break;}
    case 'unmort':{doUnmortgage(+d.idx);if(d.src==='assets')openAssetsModal();break;}
    case 'assets-open':hideModal();openAssetsModal();break;
    case 'trade-for':{
      const idx=+d.idx;const p=cp();const ownerId=G.owner[idx];
      if(ownerId<0||ownerId===p.id||!G.players[ownerId].alive){toast('Сделка недоступна');break;}
      hideModal();MC.trade={target:ownerId,give:new Set(),take:new Set([idx]),giveCash:0,takeCash:0};renderTradeModal();break;}
    case 'build-here':{buildHouse(cp().id,+d.idx);hideModal();break;}
    case 'sellh-here':{const idx=+d.idx;if(G.houses[idx]>=6)sellSpecial(cp().id,idx);else sellLevel(cp().id,idx);hideModal();break;}
    case 'mort-here':{doMortgage(+d.idx);hideModal();break;}
    case 'unmort-here':{doUnmortgage(+d.idx);hideModal();break;}
    case 'infra-build':{
      const k=d.k;const p=cp();
      if(G.infra[k]){toast('Уже построена');break;}
      if(p.money<300){toast('Нужно $300 наличными');break;}
      p.money-=300;G.infra[k]=true;moneyFX(p.id,null,4);refreshTilesForInfra();
      log('🏗 '+esc(p.name)+' строит '+(k==='tram'?'Трамвайную линию':'Оптоволоконную сеть')+' (−$300)');
      toast('🏗 Инфраструктура построена!');Snd.build();updHUD();openBuildModal();break;}
    case 'infra-pass':{
      const k=d.k;const p=cp();
      if(p.money<150){toast('Нужно $150 наличными');break;}
      p.money-=150;p.passes[k]=(p.passes[k]||0)+1;moneyFX(p.id,null,2);
      log('🎫 '+esc(p.name)+' покупает свободный проезд (−$150)');
      Snd.coin();updHUD();openBuildModal();break;}
    case 'synd-make':{
      const a=+d.a,b=+d.b,p=cp();
      if(G.owner[a]!==p.id||G.owner[b]!==p.id)break;
      G.syndicates.push({cells:[a,b],owner:p.id});updateSyndLinks();refreshHeatmap();
      log('🔗 '+esc(p.name)+' объявляет синдикат: «'+CELLS[a].name+'» + «'+CELLS[b].name+'»');
      toast('🔗 Синдикат объявлен: рента +$50');Snd.build();updHUD();openBuildModal();break;}
    case 'bribe-go':R(+d.idx);break;
    case 'bribe-cancel':R(null);break;
    case 'tg-give':{readTradeCash();const i=+d.idx;if(MC.trade.give.has(i))MC.trade.give.delete(i);else MC.trade.give.add(i);renderTradeModal();break;}
    case 'tg-take':{readTradeCash();const i=+d.idx;if(MC.trade.take.has(i))MC.trade.take.delete(i);else MC.trade.take.add(i);renderTradeModal();break;}
    case 'trade-offer':{
      readTradeCash();const t=MC.trade;const p=cp();
      if(!t.give.size&&!t.giveCash&&!t.take.size&&!t.takeCash){toast('Выберите условия обмена');return;}
      if(p.money<t.giveCash){toast('Недостаточно денег для передачи');return;}
      if(G.players[t.target].money<t.takeCash){toast('У соперника недостаточно денег');return;}
      const give=new Set(t.give),take=new Set(t.take),gc=t.giveCash,tc=t.takeCash,target=t.target;
      hideModal();
      showModal('<div class="modal-title">🤝 Ожидание ответа…</div><div style="display:flex;justify-content:center;padding:18px"><div class="spin"></div></div>');
      MC.waiting=true;
      (async()=>{await proposeTrade(p.id,target,give,take,gc,tc);if(MC.waiting){MC.waiting=false;hideModal();}})();
      break;}
    case 'trade-accept':R('accept');break;
    case 'trade-decline':R('decline');break;
    case 'pause-resume':hideModal();break;
    case 'sets-open':openSettingsModal();break;
    case 'pause-rules':hideModal();openSessionRules();break;
    case 'pause-save':hideModal();openSaveExitModal();break;
    case 'pause-quit':
      hideModal();
      showModal('<div class="modal-title">🚪 Выйти без сохранения?</div>'+
        '<div style="text-align:center;color:#ff9a9a;font-size:14px;margin-bottom:10px">⚠️ Прогресс текущей партии будет удалён безвозвратно.<br>Автосохранение в служебном слоте 0 будет стёрто.</div>'+
        '<div class="btn-row"><button class="btn ghost" data-act="close">ОТМЕНА</button>'+
        '<button class="btn bad" data-act="quit-confirm">ДА, ВЫЙТИ БЕЗ СОХРАНЕНИЯ</button></div>');
      break;
    case 'quit-confirm':delSlot(0);location.reload();break;
    case 'save-exit':{
      if(!G)break;
      const n=+d.slot;const inp=$('#slot-name-'+n);
      const label=(inp&&inp.value.trim())||('Партия '+n);
      saveGameTo(n,label);delSlot(0);hideModal();
      $('#hud').classList.remove('show');menuSpin=true;showScreen('#screen-menu');updateSaveUI();
      toast('💾 Сохранено в слот '+n+': '+esc(label));break;}
    case 'result-new':$('#screen-results').classList.remove('show');renderLobby();showScreen('#screen-lobby');menuSpin=true;break;
    case 'result-menu':$('#screen-results').classList.remove('show');showScreen('#screen-menu');menuSpin=true;updateSaveUI();break;
    case 'saves-export':exportSaves();break;
    case 'saves-import':$('#import-file').click();break;
    case 'slot-load':loadGameFromSlot(+d.slot);break;
    case 'slot-del':delSlot(+d.slot);updateSaveUI();toast('Слот '+d.slot+' очищен');break;
  }
}
