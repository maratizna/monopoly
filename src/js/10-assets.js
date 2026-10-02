/* ============ 9. АУКЦИОН И ТЕНДЕР (с памятью ИИ) ============ */
function auctionModalHTML(title,bannerHtml){
  return '<div class="modal-title">'+title+'</div>'+bannerHtml+
    '<div style="text-align:center;font-size:15px;margin-bottom:6px">Ставка: <b id="auc-bid">—</b> · лидер: <span id="auc-leader">—</span></div>'+
    '<div id="auc-bidders" style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:8px"></div>'+
    '<div id="auc-human" style="display:none">'+
      '<div class="btn-row">'+
        '<button class="btn" data-act="auc-bid" data-inc="1">+1</button>'+
        '<button class="btn" data-act="auc-bid" data-inc="5">+5</button>'+
        '<button class="btn" data-act="auc-bid" data-inc="25">+25</button>'+
        '<button class="btn" data-act="auc-bid" data-inc="50">+50</button>'+
        '<button class="btn bad" data-act="auc-pass">ПАС</button>'+
      '</div>'+
      '<div class="btn-row" style="margin-top:6px">'+
        '<input type="number" id="auc-custom" min="1" step="1" placeholder="Своя сумма" style="width:130px;padding:9px;border-radius:10px;border:1px solid var(--line);background:#161c2c;color:#fff">'+
        '<button class="btn good" data-act="auc-custom">ПОСТАВИТЬ</button>'+
      '</div></div>'+
    '<div id="auc-wait" style="text-align:center;color:#9fb0d8;margin-top:8px"></div>';
}
function auctionUpd(bid,leader,bidders,passed,curBi){
  const b=$('#auc-bid');if(!b)return;
  b.textContent=fmt(bid);
  $('#auc-leader').textContent=leader>=0?esc(G.players[leader].name):'—';
  $('#auc-bidders').innerHTML=bidders.map(i=>{
    let st='';
    if(passed.has(i))st='filter:grayscale(1);opacity:.4;';
    else if(i===curBi)st='outline:2px solid #F2C500;';
    return '<span style="padding:4px 9px;border-radius:8px;font-size:12px;font-weight:700;background:'+G.players[i].color+';'+st+'">'+esc(G.players[i].name)+(passed.has(i)?' (пас)':'')+'</span>';
  }).join('');
}
/* Фича 7: бот запоминает, кто его перебивал/отказывал */
function aiRememberSnipe(loserBotId,againstId){
  if(!G||!G.aiMemory||loserBotId==null||againstId==null||loserBotId===againstId)return;
  const m=G.aiMemory[loserBotId]||(G.aiMemory[loserBotId]={});
  const r=m[againstId]||(m[againstId]={refusals:0,snipes:0,friendly:0});
  r.snipes++;
}
function aiAggression(botId){return (G&&G.aiAggr&&G.aiAggr[botId]!=null)?G.aiAggr[botId]:0.5;}
function aiGrudge(botId,againstId){
  if(!G||!G.aiMemory)return 0;
  const m=G.aiMemory[botId]&&G.aiMemory[botId][againstId];
  if(!m)return 0;
  return (m.refusals*0.10)+(m.snipes*0.08);
}
async function runAuction(idx){
  if(!G||G.owner[idx]!==-1)return;
  const sid=G.id;
  const bidders=G.players.map(p=>p.id).filter(i=>G.players[i].alive);
  if(!bidders.length)return;
  let bid=0,leader=-1;const passed=new Set();
  let ptr=bidders.findIndex(i=>i===nextAlive(G.cur));
  if(ptr<0)ptr=0;
  const maxBids={};bidders.forEach(i=>maxBids[i]=aiMaxBid(G.players[i],idx));
  G.phase='auction';setControls();
  showModal(auctionModalHTML('🔨 АУКЦИОН',cellBanner(idx)),{wide:true});
  auctionUpd(0,-1,bidders,passed,-1);
  let guard=0;
  while(guard++<120&&okG(sid)){
    const active=bidders.filter(b=>!passed.has(b)&&G.players[b].alive);
    if(active.length===0)break;
    if(bid>0&&active.length===1){leader=active[0];break;}
    let tries=0;
    while(passed.has(bidders[ptr%bidders.length])&&tries++<=bidders.length)ptr++;
    if(passed.has(bidders[ptr%bidders.length]))break;
    const bi=bidders[ptr%bidders.length];
    const p=G.players[bi];
    auctionUpd(bid,leader,bidders,passed,bi);
    let action;
    if(p.ai){
      $('#auc-human').style.display='none';
      $('#auc-wait').textContent=esc(p.name)+' думает…';
      await sleep(randi(700,1400));
      if(!okG(sid))return;
      // Фича 7: агрессия + злопамятность (если лидер перебивал бота — ставит выше)
      const aggr=aiAggression(bi);
      const grudge=leader>=0?aiGrudge(bi,leader):0;
      let max=maxBids[bi]*(1+aggr*0.25+grudge);
      max=Math.min(max,p.money);
      const inc=p.ai===1?5:(p.ai===2?randi(10,25):randi(25,50));
      const cand=Math.min(max,bid===0?Math.max(1,Math.round(inc/2)):bid+inc);
      action=(cand>bid&&cand<=p.money)?{bid:cand}:{pass:true};
    }else{
      MC.aucBidder=bi;
      $('#auc-wait').textContent='Ваша ставка, '+esc(p.name)+'!';
      $('#auc-human').style.display='block';
      action=await new Promise(res=>{MC.resolve=res;});
      if(!okG(sid))return;
      if(!action)action={pass:true};
    }
    if(action.pass){passed.add(bi);log('🔨 '+esc(p.name)+': пас');}
    else{
      if(bid>0&&leader>=0&&G.players[leader]&&G.players[leader].ai&&leader!==bi)aiRememberSnipe(leader,bi);
      bid=action.bid;leader=bi;Snd.click();log('🔨 '+esc(p.name)+' ставит '+fmt(bid));
    }
    auctionUpd(bid,leader,bidders,passed,-1);
    const act2=bidders.filter(b=>!passed.has(b)&&G.players[b].alive);
    if(bid>0&&act2.length<=1){leader=act2.length?act2[0]:leader;break;}
    if(bid===0&&act2.length===0)break;
    ptr++;
  }
  if(!okG(sid))return;
  hideModal();
  G.phase='idle';
  if(bid>0&&leader>=0&&G.players[leader].alive){
    const w=G.players[leader];
    if(w.money<bid)autoRaise(leader,bid);
    if(w.money>=bid){
      w.money-=bid;G.owner[idx]=leader;
      moneyFX(leader,null,4);updateHouseMesh(idx);validateSyndicates();refreshHeatmap();
      log('🏆 '+esc(w.name)+' выигрывает аукцион: «'+CELLS[idx].name+'» за '+fmt(bid));
      toast('Аукцион: '+esc(w.name)+' за '+fmt(bid));Snd.coin();
    }else log('🔨 Победитель не смог оплатить — лот остаётся у банка');
  }else log('🔨 Аукцион: ставок нет — лот остаётся у банка');
  updHUD();
}
async function runTender(idx,initiator){
  if(!G)return;
  const sid=G.id;
  const c=CELLS[idx];const prevOwner=G.owner[idx];
  const start=Math.floor(c.price/2);
  const bidders=G.players.map(p=>p.id).filter(i=>G.players[i].alive);
  if(!bidders.length)return;
  let bid=start,leader=-1,hasBid=false;const passed=new Set();
  let ptr=bidders.findIndex(i=>i===((initiator+1)%40));if(ptr<0)ptr=0;
  G.phase='auction';setControls();
  showModal(auctionModalHTML('📋 TENDER OFFER',cellBanner(idx)+
    '<div style="text-align:center;font-size:12px;color:#9fb0d8;margin-bottom:6px">Победитель платит ставку владельцу +10% банку. Владелец может перекупать. Мин. ставка: '+fmt(start)+'</div>'),{wide:true});
  auctionUpd(bid,-1,bidders,passed,-1);
  let guard=0;
  while(guard++<120&&okG(sid)){
    const active=bidders.filter(b=>!passed.has(b)&&G.players[b].alive);
    if(active.length===0)break;
    if(hasBid&&active.length===1){leader=active[0];break;}
    let tries=0;
    while(passed.has(bidders[ptr%bidders.length])&&tries++<=bidders.length)ptr++;
    if(passed.has(bidders[ptr%bidders.length]))break;
    const bi=bidders[ptr%bidders.length];
    const p=G.players[bi];
    auctionUpd(bid,leader,bidders,passed,bi);
    let action;
    if(p.ai){
      $('#auc-human').style.display='none';
      $('#auc-wait').textContent=esc(p.name)+' решает…';
      await sleep(randi(600,1100));
      if(!okG(sid))return;
      const worth=aiMaxBid(p,idx);
      const isOwner=bi===prevOwner;
      // Фича 7: против инициатора-«обидчика» бот завышает ставку
      const grudge=aiGrudge(bi,initiator);
      const aggr=aiAggression(bi);
      let cap=(isOwner?worth*0.6:worth)*(1+aggr*0.3+grudge);
      const inc=randi(10,30);
      const cand=Math.min(Math.floor(cap),bid+inc);
      action=(cand>bid&&cand<=p.money)?{bid:cand}:{pass:true};
    }else{
      MC.aucBidder=bi;
      $('#auc-wait').textContent='Ваша ставка, '+esc(p.name)+'!';
      $('#auc-human').style.display='block';
      action=await new Promise(res=>{MC.resolve=res;});
      if(!okG(sid))return;
      if(!action)action={pass:true};
    }
    if(action.pass){passed.add(bi);log('📋 '+esc(p.name)+': пас');}
    else{
      if(hasBid&&leader>=0&&G.players[leader]&&G.players[leader].ai&&leader!==bi)aiRememberSnipe(leader,bi);
      bid=action.bid;leader=bi;hasBid=true;Snd.click();log('📋 '+esc(p.name)+' ставит '+fmt(bid));
    }
    auctionUpd(bid,leader,bidders,passed,-1);
    const act2=bidders.filter(b=>!passed.has(b)&&G.players[b].alive);
    if(hasBid&&act2.length<=1){leader=act2.length?act2[0]:leader;break;}
    if(!hasBid&&act2.length===0)break;
    ptr++;
  }
  if(!okG(sid))return;
  hideModal();
  G.phase='idle';
  if(hasBid&&leader>=0&&G.players[leader].alive){
    const w=G.players[leader];
    const fee=Math.ceil(bid*0.1);
    autoRaise(leader,bid+fee);
    if(w.money>=bid+fee){
      w.money-=bid+fee;
      if(leader!==prevOwner){
        if(G.players[prevOwner])G.players[prevOwner].money+=bid;
        G.owner[idx]=leader;updateHouseMesh(idx);validateSyndicates();refreshHeatmap();
        moneyFX(leader,prevOwner,4);moneyFX(leader,null,2);
        log('📋 Тендер: '+esc(w.name)+' выкупает «'+c.name+'» за '+fmt(bid)+' (+'+fmt(fee)+' банку)');
        toast('📋 '+esc(w.name)+' выкупает клетку!');
      }else{
        moneyFX(leader,null,2);
        log('📋 '+esc(w.name)+' защищает «'+c.name+'» (комиссия '+fmt(fee)+')');
        toast('📋 Владелец защитил клетку');
      }
      Snd.coin();
    }else log('📋 Победитель тендера не смог оплатить');
  }else log('📋 Тендер: ставок нет — клетка остаётся у владельца');
  updHUD();
}
function aiMaxBid(p,idx){
  const c=CELLS[idx];const base=c.price||200;
  let syn=0;
  if(c.t==='street')syn=GROUP_CELLS[c.g].filter(i=>G.owner[i]===p.id).length;
  const aggr=aiAggression(p.id);
  if(p.ai===1)return base*(0.3+Math.random()*0.45);
  if(p.ai===2)return base*(0.8+Math.random()*0.3+syn*0.1);
  return base*(0.95+syn*0.35+Math.random()*0.2)*(1+aggr*0.15);
}
