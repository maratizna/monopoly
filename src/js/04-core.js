/* ============ 3. НАСТРОЙКИ / СОСТОЯНИЕ ============ */
let SETS={sound:true,softFocus:true,fpsLock:false,fpj:false,showDice:true,pulse:true,vibrate:true,
  /* НОВЫЕ (по умолчанию: кино-камера ВЫКЛ, частицы ВКЛ, громкость амбиента 0.3) */
  cinecam:false,particles:true,ambientVol:0.3};
try{SETS=Object.assign(SETS,JSON.parse(store.get('mono_sets')||'{}'));}catch(e){}
const saveSets=()=>store.set('mono_sets',JSON.stringify(SETS));
const CUSTOM_KEYS=['infra','shadow','cycles','synd','tax','spec','tender','subs','eras','stocks'];
function defCustom(){const o={};CUSTOM_KEYS.forEach(k=>o[k]=false);return o;}
let CUSTOM=defCustom();
try{CUSTOM=Object.assign(defCustom(),JSON.parse(store.get('mono_custom')||'{}'));}catch(e){}
const saveCustom=()=>store.set('mono_custom',JSON.stringify(CUSTOM));
let G=null;
let SESSION=0;
const okG=s=>!!G&&G.id===s;
let chanceDeck=[],chestDeck=[],shadowDeck=[];
const MC={resolve:null,trade:null,aucBidder:-1,waiting:false};
let eraOpen=false;
let heatmapOn=false; // Фича 3: режим аналитики
function defStats(){return {laps:0,rentPaid:0,rentEarned:0,jails:0,buildingsBuilt:0};}

/* ============ слоты сохранений (0 = служебный автосейв) ============ */
function readSlot(n){try{const raw=store.get('mono_slot_'+n);return raw?JSON.parse(raw):null;}catch(e){return null;}}
function writeSlot(n,d){store.set('mono_slot_'+n,JSON.stringify(d));}
function delSlot(n){store.del('mono_slot_'+n);}
function renderMenuSlots(){
  const wrap=$('#menu-saves');if(!wrap)return;
  let html='<div style="font-size:11px;color:#9fb0d8;letter-spacing:2px;margin:6px 0 2px;text-align:left">СОХРАНЕНИЯ</div>';
  const auto=readSlot(0);
  if(auto){
    html+='<div class="dev-note">🛠 РЕЖИМ РАЗРАБОТЧИКА — защита от случайного закрытия</div>';
    html+='<div class="mslot" style="border-color:#8f6cff;background:rgba(123,92,255,.10)"><div class="ms-info"><b>🛠 Слот 0 · автосохранение</b>'+(auto.players||[]).map(p=>TOKENS[p.token].e).join(' ')+' · ход '+(auto.turnCount||0)+' · '+(auto.savedAt?new Date(auto.savedAt).toLocaleString():'')+'</div>'+
      '<div class="ms-btns"><button class="btn good xs" data-act="slot-load" data-slot="0">▶</button>'+
      '<button class="btn bad xs" data-act="slot-del" data-slot="0">🗑</button></div></div>';
  }
  for(let n=1;n<=3;n++){
    const d=readSlot(n);
    if(d){
      const names=(d.players||[]).map(p=>TOKENS[p.token].e).join(' ');
      html+='<div class="mslot"><div class="ms-info"><b>'+esc(d.label||('Слот '+n))+' · '+names+'</b>Раунд '+(d.round||1)+' · ход '+(d.turnCount||0)+' · '+(d.savedAt?new Date(d.savedAt).toLocaleString():'')+'</div>'+
        '<div class="ms-btns"><button class="btn good xs" data-act="slot-load" data-slot="'+n+'">▶</button>'+
        '<button class="btn bad xs" data-act="slot-del" data-slot="'+n+'">🗑</button></div></div>';
    }else{
      html+='<div class="mslot empty"><div class="ms-info"><b>Слот '+n+'</b>Пусто</div></div>';
    }
  }
  html+='<div style="display:flex;gap:8px;justify-content:center;margin-top:6px">'+
    '<button class="btn xs blue" data-act="saves-export">⬇ Скачать все</button>'+
    '<button class="btn xs" data-act="saves-import">⬆ Импорт</button></div>';
  wrap.innerHTML=html;
}
function updateSaveUI(){renderMenuSlots();}

/* ============ гиды ============ */
function guideSeen(k){try{return !!(JSON.parse(store.get('mono_guide')||'{}'))[k];}catch(e){return true;}}
function guideMark(k){try{const s=JSON.parse(store.get('mono_guide')||'{}');s[k]=1;store.set('mono_guide',JSON.stringify(s));}catch(e){}}
function guideOnce(k,txt){if(guideSeen(k))return;guideMark(k);toast('💡 '+txt);}

/* ============ Карьера (мета-прогрессия, отдельное хранилище) ============ */
function loadCareer(){try{return Object.assign({rep:0,wins:0,unlockedPerks:[],unlockedColors:[],activePerk:null,activeColor:null},JSON.parse(store.get('mono_career')||'{}'));}catch(e){return{rep:0,wins:0,unlockedPerks:[],unlockedColors:[],activePerk:null,activeColor:null};}}
function saveCareer(c){store.set('mono_career',JSON.stringify(c));}
function awardCareer(winnerId){
  const c=loadCareer();const w=G.players[winnerId];
  if(!w||w.ai)return 0; // репутация только человеку
  let rep=1;
  if(G.players.some(p=>p.ai===3))rep+=1;                 // победа над сложными ботами
  const bankrupts=G.players.filter(p=>!p.alive).length;
  if(bankrupts<=1)rep+=1;                                 // «чистая» победа
  c.rep+=rep;c.wins=(c.wins||0)+1;saveCareer(c);
  return rep;
}
function renderCareer(){
  const c=loadCareer();
  $('#career-rep').textContent='Репутация: '+c.rep;
  $('#career-wins').textContent='Побед: '+(c.wins||0);
  $('#career-perks').innerHTML=CAREER_PERKS.map(p=>{
    const owned=c.unlockedPerks.includes(p.id);
    const active=c.activePerk===p.id;
    return '<div class="career-card '+(owned?'owned':'')+' '+(active?'active-perk':'')+'">'+
      '<div style="font-weight:800">'+p.name+(active?' · <span style="color:var(--accent)">АКТИВЕН</span>':'')+'</div>'+
      '<div style="color:#9fb0d8;font-size:12px;margin:3px 0">'+p.desc+'</div>'+
      (owned
        ?(active?'<button class="btn ghost mini-btn" data-act="career-set-perk" data-id="">Снять</button>'
               :'<button class="btn good mini-btn" data-act="career-set-perk" data-id="'+p.id+'">Выбрать</button>')
        :'<button class="btn primary mini-btn" data-act="career-buy-perk" data-id="'+p.id+'">Купить за '+p.cost+' 🏅</button>')+
      '</div>';
  }).join('');
  $('#career-colors').innerHTML=CAREER_COLORS.map(col=>{
    const owned=c.unlockedColors.includes(col.id);
    const active=c.activeColor===col.id;
    return '<div class="career-card '+(owned?'owned':'')+' '+(active?'active-perk':'')+'" style="display:flex;align-items:center;gap:10px">'+
      '<span class="spark" style="background:'+col.color+';width:24px;height:24px"></span>'+
      '<span style="font-weight:800;flex:1">'+col.name+(active?' · <span style="color:var(--accent)">АКТИВЕН</span>':'')+'</span>'+
      (owned
        ?(active?'<button class="btn ghost mini-btn" data-act="career-set-color" data-id="">Снять</button>'
               :'<button class="btn good mini-btn" data-act="career-set-color" data-id="'+col.id+'">Выбрать</button>')
        :'<button class="btn primary mini-btn" data-act="career-buy-color" data-id="'+col.id+'">Купить за '+col.cost+' 🏅</button>')+
      '</div>';
  }).join('');
}
/* применение выбранного перка/цвета к первому человеку в новой партии */
function applyCareerPerk(){
  if(!G)return;
  const c=loadCareer();
  const human=G.players.find(p=>!p.ai);if(!human)return;
  if(c.activeColor){const col=CAREER_COLORS.find(x=>x.id===c.activeColor);if(col){human.color=col.color;removePlayerToken(human);addPlayerToken(human);}}
  if(c.activePerk==='capital'){human.money=2000;G.perkNoMortgage[human.id]=true;log('🏆 Перк «Стартовый капитал»: $2000, ипотека запрещена');}
  else if(c.activePerk==='freestreet'){
    const free=[];for(let i=0;i<40;i++){if(CELLS[i].t==='street'&&G.owner[i]===-1)free.push(i);}
    if(free.length){const idx=pick(free);G.owner[idx]=human.id;updateHouseMesh(idx);log('🏆 Перк «Наследство»: получена «'+CELLS[idx].name+'»');}
  }
  else if(c.activePerk==='jailcard'){human.jailCards++;log('🏆 Перк «Связи»: +1 карточка выхода из тюрьмы');}
  updHUD();
}

/* ============ онбординг ============ */
const OB_SLIDES={
 eras:{g:'📈',n:'Экономические эры',f:'Каждые 5 проходов GO эра меняется: Стабильность → Бум → Инфляция → Рецессия',e:'Пример: Бум — ГО $300 и ренты +25%; Рецессия — выкуп ипотеки без штрафа. Плашка эры — справа сверху.'},
 tax:{g:'🧾',n:'Налог на имущество',f:'Каждый круг платите банку за содержание недвижимости',e:'Пример: 3 дома + 1 магазин = −$35 за круг; в полной монополии ×2 = −$70'},
 spec:{g:'🏙',n:'Спецзастройки',f:'Небоскрёб (рента ×2 отеля), Бизнес-центр (+$25 за каждый визит), Депо (вокзал ×2)',e:'Пример: Небоскрёб поверх отеля: рента $1000 → $2000. Спецпостройки защищают от тендера!'},
 tender:{g:'🤝',n:'Tender Offer',f:'Тап по чужой пустой улице → сбор $50 → аукцион → победитель платит владельцу, +10% банку',e:'Пример: улица $200 → старт $100 → победили за $180 → владелец получает $180, банк $18'},
 subs:{g:'🏭',n:'Дочерние предприятия',f:'$700 при монополии с отелем → +$50 каждый раз, когда КТО УГОДНО проходит ГО',e:'Пример: −$700 взнос, −$10 обслуживание за круг → окупаемость ≈ 18 кругов'},
 synd:{g:'🔗',n:'Синдикаты',f:'Соседние улицы разных цветов (даже через одну клетку) → +$50 к ренте каждой',e:'Пример: «Ростовская наб.» + «Рязанский пр.» через вокзал — обе ваши: гость платит +$50'},
 infra:{g:'🏗',n:'Инфраструктуры',f:'$300 банку → рента всех вокзалов/коммуникаций типа +25% (монополисту +50%)',e:'Пример: трамвай построен — рента вокзала $50→$63. Контра: билет «свободный проезд» $150'},
 shadow:{g:'🃏',n:'Теневой рынок',f:'На Парковке тянете чёрную карту: взятки, контрабанда, проверки',e:'Пример: Контрабанда: +$200 сразу, но дубль в следующий ход → тюрьма'},
 cycles:{g:'📊',n:'Циклы рынка',f:'Каждые 5 раундов: Бум (стройка +20%, монополии ×4) или Кризис (ренты −20%)',e:'Пример: в Кризис выгодно выкупать ипотеку без %, в Бум — собирать монополии'},
 stocks:{g:'📈',n:'Фондовая биржа',f:'Покупайте акции 4 корпораций; цены растут от активности на доске, дивиденды — на GO',e:'Пример: строите небоскрёбы → растёт ТехТех. Ходите по вокзалам → растёт ЛогистикЛайн.'},
};
let obKeys=[],obIdx=0;
function activeObKeys(){
  if(!G)return [];
  const order=['eras','tax','spec','tender','subs','synd','infra','shadow','cycles','stocks'];
  return order.filter(k=>G.custom[k]&&!(k==='cycles'&&G.custom.eras));
}
function startOnboarding(force){
  const keys=activeObKeys();
  if(!keys.length)return;
  const sig=keys.join('+');
  if(!force){
    let seen=[];try{seen=JSON.parse(store.get('mono_seen_cfg')||'[]');}catch(e){}
    if(seen.includes(sig))return;
  }
  obKeys=keys;obIdx=0;renderOb();
  $('#onboard').classList.add('show');
}
function renderOb(){
  const s=OB_SLIDES[obKeys[obIdx]];
  $('#ob-body').innerHTML='<div class="ob-glyph">'+s.g+'</div><div class="ob-name">'+s.n+'</div><div class="ob-flow">'+s.f+'</div><div class="ob-example">'+s.e+'</div>';
  $('#ob-dots').textContent=(obIdx+1)+' / '+obKeys.length;
  $('#ob-next').textContent=obIdx<obKeys.length-1?'ПОНЯТНО':'НАЧАТЬ!';
}
function closeOnboarding(){
  $('#onboard').classList.remove('show');
  const sig=obKeys.join('+');
  let seen=[];try{seen=JSON.parse(store.get('mono_seen_cfg')||'[]');}catch(e){}
  if(!seen.includes(sig)){seen.push(sig);store.set('mono_seen_cfg',JSON.stringify(seen));}
}
