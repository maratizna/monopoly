/* ============ 4. ЧИСТОЕ ЯДРО ============ */
function ownedCellsIn(st,i){const r=[];for(let k=0;k<40;k++)if(st.owner[k]===i)r.push(k);return r;}
function ownsAllIn(st,pi,g){return GROUP_CELLS[g].every(i=>st.owner[i]===pi);}
function calcRent(idx,st,sum){
  const o=st.owner[idx];if(o<0||st.mortgaged[idx])return 0;
  const c=CELLS[idx];
  if(c.t==='street'){let r=c.rents[st.houses[idx]];if(st.houses[idx]===0&&ownsAllIn(st,o,c.g))r*=2;return r;}
  if(c.t==='rr'){const n=ownedCellsIn(st,o).filter(x=>CELLS[x].t==='rr').length;return [25,50,100,200][n-1];}
  if(c.t==='util'){const n=ownedCellsIn(st,o).filter(x=>CELLS[x].t==='util').length;return sum*(n>=2?10:4);}
  return 0;
}
function canBuildRule(st,pi,idx,cost){
  const c=CELLS[idx];
  const cc=(cost!=null?cost:c.hc);
  if(c.t!=='street')return{ok:false,msg:'Не улица'};
  if(!ownsAllIn(st,pi,c.g))return{ok:false,msg:'Нужна вся группа'};
  if(GROUP_CELLS[c.g].some(i=>st.mortgaged[i]))return{ok:false,msg:'Группа заложена'};
  if(st.houses[idx]>=5)return{ok:false,msg:'Максимум зданий'};
  const min=Math.min(...GROUP_CELLS[c.g].map(i=>st.houses[i]));
  if(st.houses[idx]>min)return{ok:false,msg:'Правило равномерности'};
  if(st.houses[idx]===4){if(st.bankHotels<1)return{ok:false,msg:'Нет отелей в банке'};}
  else if(st.bankHouses<1)return{ok:false,msg:'Нет домов в банке'};
  if(st.players[pi].money<cc)return{ok:false,msg:'Не хватает денег'};
  return{ok:true};
}
function netWorthOf(st,i){
  const p=st.players[i];let w=p.money;
  ownedCellsIn(st,i).forEach(x=>{w+=CELLS[x].price*(st.mortgaged[x]?0.1:1);w+=st.houses[x]*(CELLS[x].hc||0);});
  // стоимость акций и компаний (биржа) — аддитивно, старые сейвы не ломаются
  if(st.stocks){
    const h=st.stocks.hold[i]||{};STOCK_CORPS.forEach(c=>{w+=(h[c.key]||0)*(st.stocks.prices[c.key]||0);});
    (st.stocks.founded||[]).forEach(f=>{if(f.owner===i)w+=800;});
  }
  return w;
}
function threeDoublesJail(streak){return streak>=3;}
function runCoreTests(){
  const T=()=>({owner:new Array(40).fill(-1),houses:new Array(40).fill(0),mortgaged:new Array(40).fill(false),bankHouses:32,bankHotels:12,players:[{money:1500},{money:1500}]});
  const res=[];const eq=(n,a,b)=>res.push([n,a===b]);
  let s=T();s.owner[1]=0;s.owner[3]=0;
  eq('рента ×2 при монополии',calcRent(1,s,7),4);
  s.houses[1]=1;eq('дом отключает ×2',calcRent(1,s,7),10);
  s=T();s.owner[5]=0;s.owner[15]=0;eq('2 вокзала = $50',calcRent(5,s,7),50);
  s=T();s.owner[12]=0;s.owner[28]=0;eq('2 коммуналки = 10×кубики',calcRent(12,s,7),70);
  s.mortgaged[12]=true;eq('ипотека: рента 0',calcRent(12,s,7),0);
  s=T();s.owner[6]=0;s.owner[8]=0;s.owner[9]=0;s.houses[6]=1;
  eq('равномерность: запрет',canBuildRule(s,0,6).ok,false);
  eq('равномерность: можно',canBuildRule(s,0,8).ok,true);
  eq('3 дубля → тюрьма',threeDoublesJail(3),true);
  eq('net worth старт',netWorthOf(s,0),1500);
  const fails=res.filter(r=>!r[1]);
  console.log(fails.length?('❌ Core tests failed: '+fails.map(f=>f[0]).join(', ')):'✅ Core unit-тесты пройдены: '+res.length+'/'+res.length);
  window.__TESTS_OK=!fails.length;window.__TESTS_N=res.length;
  return !fails.length;
}

/* ============ 4b. МОДИФИКАТОРЫ ПРАВИЛ ============ */
function eraName(){return {stable:'Стабильность',boom:'Бум',inflation:'Инфляция',recession:'Рецессия'}[G.era.phase];}
function eraMults(){
  if(!G||!G.custom.eras)return {rent:1,build:1,go:200,unmort:0.1,tax:1,div:1,tenderLimit:1};
  const ph=G.era.phase;
  if(ph==='boom')return {rent:1.25,build:1.2,go:300,unmort:0.1,tax:1,div:1.5,tenderLimit:1};
  if(ph==='inflation')return {rent:1.5,build:1.5,go:300,unmort:0.2,tax:2,div:1,tenderLimit:1};
  if(ph==='recession')return {rent:0.8,build:1,go:100,unmort:0,tax:0,div:0.5,tenderLimit:2};
  return {rent:1,build:1,go:200,unmort:0.1,tax:1,div:1,tenderLimit:1};
}
function effBuildCost(idx){
  let cost=CELLS[idx].hc;
  if(G.custom.eras)cost=Math.round(cost*eraMults().build);
  else if(G.custom.cycles&&G.market.phase==='boom')cost=Math.round(cost*1.2);
  return cost;
}
function specCost(idx,kind){
  if(kind==='depot')return 100;
  const hc=CELLS[idx].hc;
  let cost=kind==='sky'?hc:Math.round(hc*1.5);
  if(G.custom.eras){
    if(G.era.phase==='boom')cost=Math.round(cost*0.9);
    else cost=Math.round(cost*eraMults().build);
  }else if(G.custom.cycles&&G.market.phase==='boom')cost=Math.round(cost*1.2);
  return cost;
}
function effUnmortCost(idx){
  const c=CELLS[idx];
  if(G.custom.eras){const m=eraMults();return Math.ceil(c.price*0.5*(1+m.unmort));}
  if(G.custom.cycles&&G.market.phase==='crisis')return Math.ceil(c.price*0.5);
  return Math.ceil(c.price*0.55);
}
function effLevel(h){return h===6?5:(h===7?4:h);}
function chkBuild(pi,idx){
  const c=CELLS[idx];
  if(c.t!=='street')return{ok:false,msg:'Не улица'};
  if(!ownsAllIn(G,pi,c.g))return{ok:false,msg:'Нужна вся группа'};
  if(GROUP_CELLS[c.g].some(i=>G.mortgaged[i]))return{ok:false,msg:'Группа заложена'};
  const h=G.houses[idx];
  if(h===7)return{ok:false,msg:'Здесь бизнес-центр'};
  if(h>=5)return{ok:false,msg:'Максимум домов (далее — небоскрёб)'};
  const min=Math.min(...GROUP_CELLS[c.g].map(i=>effLevel(G.houses[i])));
  if(effLevel(h)>min)return{ok:false,msg:'Правило равномерности'};
  if(h===4){if(G.bankHotels<1)return{ok:false,msg:'Нет отелей в банке'};}
  else if(G.bankHouses<1)return{ok:false,msg:'Нет домов в банке'};
  if(G.players[pi].money<effBuildCost(idx))return{ok:false,msg:'Не хватает денег'};
  return{ok:true};
}
function canSky(pi,idx){
  const c=CELLS[idx];
  if(c.t!=='street')return{ok:false};
  if(!ownsAllIn(G,pi,c.g))return{ok:false,msg:'Нужна монополия'};
  if(!GROUP_CELLS[c.g].every(i=>G.houses[i]===5))return{ok:false,msg:'Нужны отели на ВСЕХ улицах группы'};
  if(G.houses[idx]!==5)return{ok:false};
  if(G.bank.sky<1)return{ok:false,msg:'Нет небоскрёбов в банке'};
  if(G.players[pi].money<specCost(idx,'sky'))return{ok:false,msg:'Не хватает денег'};
  return{ok:true};
}
function canBC(pi,idx){
  const c=CELLS[idx];
  if(c.t!=='street')return{ok:false};
  if(!ownsAllIn(G,pi,c.g))return{ok:false,msg:'Нужна монополия'};
  if(GROUP_CELLS[c.g].some(i=>G.mortgaged[i]))return{ok:false,msg:'Группа заложена'};
  if(G.houses[idx]!==3)return{ok:false,msg:'Нужно ровно 3 дома'};
  const min=Math.min(...GROUP_CELLS[c.g].map(i=>effLevel(G.houses[i])));
  if(min<3)return{ok:false,msg:'Правило равномерности'};
  if(G.bank.office<1)return{ok:false,msg:'Нет бизнес-центров в банке'};
  if(G.players[pi].money<specCost(idx,'bc'))return{ok:false,msg:'Не хватает денег'};
  return{ok:true};
}
function canDepot(pi,idx){
  const c=CELLS[idx];
  if(c.t!=='rr')return{ok:false};
  if(G.owner[idx]!==pi)return{ok:false};
  if(G.depot[idx])return{ok:false,msg:'Депо уже есть'};
  if(G.bank.depot<1)return{ok:false,msg:'Нет депо в банке'};
  if(G.players[pi].money<100)return{ok:false,msg:'Не хватает денег'};
  return{ok:true};
}
function syndAdjacent(a,b){
  const d=(b-a+40)%40;
  return d===1||d===2||d===38||d===39;
}
function validateSyndicates(){
  if(!G||!G.custom.synd)return;
  G.syndicates=G.syndicates.filter(s=>G.owner[s.cells[0]]===s.owner&&G.owner[s.cells[1]]===s.owner);
  updateSyndLinks();
}
function computeRent(idx,sum,lander,preview){
  const out={total:0,lines:[]};
  const o=G.owner[idx];
  if(o<0||G.mortgaged[idx])return out;
  const c=CELLS[idx];const h=G.houses[idx];
  let r=0;
  if(c.t==='street'){
    const lvl=h===6||h===7?5:h;
    r=c.rents[lvl];
    out.lines.push({t:'База'+(h===6?' (отель)':h===7?' (отель)':h>0?' ('+h+' дом'+(h>1?'а':'')+')':''),v:r});
    if(h===6){out.lines.push({t:'🏙 Небоскрёб ×2',v:r});r*=2;}
    if(h===7)out.lines.push({t:'🏢 Бизнес-центр: уровень отеля',v:0});
    if(h===0&&ownsAllIn(G,o,c.g)){out.lines.push({t:'🎨 Полная монополия ×2',v:r});r*=2;}
  }else if(c.t==='rr'){
    const n=ownedCells(o).filter(x=>CELLS[x].t==='rr').length;
    r=[25,50,100,200][n-1];
    out.lines.push({t:'Вокзалов у владельца: '+n,v:r});
    if(G.custom.spec&&G.depot[idx]){out.lines.push({t:'🚉 Депо ×2',v:r});r*=2;}
  }else if(c.t==='util'){
    const n=ownedCells(o).filter(x=>CELLS[x].t==='util').length;
    r=sum*(n>=2?10:4);
    out.lines.push({t:'Коммуникации ×'+(n>=2?10:4)+' · кубики '+sum,v:r});
  }
  if(r<=0)return out;
  if(G.custom.eras){
    const m=eraMults();
    if(m.rent!==1){
      const d=Math.round(r*(m.rent-1));
      out.lines.push({t:'🌐 Эра «'+eraName()+'» '+(m.rent>1?'+':'')+Math.round((m.rent-1)*100)+'%',v:d});
      r*=m.rent;
    }
  }else if(G.custom.cycles){
    if(G.market.phase==='boom'&&c.t==='street'&&h===0&&ownsAllIn(G,o,c.g)){out.lines.push({t:'📈 Бум: монополия ×4',v:r});r*=2;}
    if(G.market.phase==='crisis'){const d=Math.round(r*-0.2);out.lines.push({t:'📉 Кризис −20%',v:d});r*=0.8;}
  }
  if(G.custom.synd&&G.syndicates.some(s=>s.owner===o&&s.cells.includes(idx))){out.lines.push({t:'🔗 Синдикат',v:50});r+=50;}
  if(G.custom.infra){
    const k=c.t==='rr'?'tram':(c.t==='util'?'fiber':null);
    if(k&&G.infra[k]){
      const L=G.players[lander];
      if(!preview&&L&&L.passes&&L.passes[k]>0){
        L.passes[k]--;
        out.lines.push({t:'🎫 Свободный проезд: модификатор отключён',v:0});
      }else{
        const mono=c.t==='rr'
          ?ownedCells(o).filter(x=>CELLS[x].t==='rr').length===4
          :ownedCells(o).filter(x=>CELLS[x].t==='util').length===2;
        const mult=mono?1.5:1.25;
        const d=Math.round(r*(mult-1));
        out.lines.push({t:(k==='tram'?'🚋 Трамвайная линия':'📡 Оптоволокно')+(mono?' +50% (монополия)':' +25%'),v:d});
        r*=mult;
      }
    }
  }
  out.total=Math.round(r);
  return out;
}
function ruleRent(idx,sum,lander){return computeRent(idx,sum,lander,false).total;}
function calcPropertyTax(pi){
  let t=0;
  ownedCells(pi).forEach(idx=>{
    const c=CELLS[idx];const h=G.houses[idx];
    let base;
    if(h===0)base=5;
    else if(h>=5)base=25;
    else base=10*h;
    if(c.t==='street'&&ownsAllIn(G,pi,c.g))base*=2;
    t+=base;
  });
  if(G.custom.subs)G.subs.forEach(s=>{if(s.owner===pi)t+=10;});
  return t;
}
function tenderLimit(){return (G.custom.eras&&G.era.phase==='recession')?2:1;}
function tendersLeft(pi){return tenderLimit()-(G.tenders[pi]||0);}
function isTenderable(idx){
  const c=CELLS[idx];
  if(!(c.t==='street'||c.t==='rr'||c.t==='util'))return false;
  if(G.houses[idx]>0)return false;
  if(G.custom.spec&&G.depot[idx])return false;
  return true;
}
function cellModifiers(idx){
  const mods=[];
  if(!G)return mods;
  const c=CELLS[idx];
  if(G.houses[idx]===6)mods.push('🏙 Небоскрёб: рента ×2 от отельной');
  if(G.houses[idx]===7)mods.push('🏢 Бизнес-центр: рента отеля + $25 владельцу за визит');
  if(G.custom.spec&&G.depot[idx])mods.push('🚉 Депо: рента вокзала ×2');
  if(G.custom.subs&&c.t==='street'&&G.subs.some(s=>s.group===c.g)){const s=G.subs.find(s=>s.group===c.g);mods.push('🏭 Дочернее предприятие: владелец получает $50 на GO'+(s.mortgaged?' (заложено)':''));}
  if(G.custom.synd&&G.syndicates.some(s=>s.cells.includes(idx)))mods.push('🔗 Синдикат: +$50 к ренте');
  if(G.custom.infra&&c.t==='rr'&&G.infra.tram)mods.push('🚋 Трамвайная линия: рента +25%/+50%');
  if(G.custom.infra&&c.t==='util'&&G.infra.fiber)mods.push('📡 Оптоволокно: рента +25%/+50%');
  if(G.custom.eras)mods.push('🌐 Эра «'+eraName()+'»: ренты '+(eraMults().rent>1?'+':'')+Math.round((eraMults().rent-1)*100)+'%');
  else if(G.custom.cycles&&G.market.phase!=='stable')mods.push(G.market.phase==='boom'?'📈 Бум: монополии ×4, стройка +20%':'📉 Кризис: ренты −20%, выкуп без %');
  return mods;
}
