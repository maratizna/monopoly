/* ============ 11. ИИ ============ */
function aiDecideBuy(p,idx){
  const c=CELLS[idx];
  if(p.money<c.price)return false;
  let syn=0;
  if(c.t==='street')syn=GROUP_CELLS[c.g].filter(i=>G.owner[i]===p.id).length;
  const aggr=aiAggression(p.id);
  if(p.ai===1)return Math.random()<0.55;
  if(p.ai===2)return (p.money-c.price>=250*(1-aggr*0.4))||syn>0||Math.random()<0.3;
  return (p.money-c.price>=150*(1-aggr*0.4))||syn>0||Math.random()<0.75;
}
async function aiBuildPhase(p){
  const sid=G.id;
  const reserve=(p.ai===3?300:(p.ai===2?500:900))*(1-aiAggression(p.id)*0.3);
  const chance=p.ai===1?0.25:(p.ai===2?0.9:1);
  let guard=0;
  while(guard++<15&&okG(sid)){
    if(Math.random()>chance)break;
    let built=false;
    if(G.custom.spec&&(p.ai>=2)){
      for(const g in GROUP_CELLS){
        if(!ownsAllIn(G,p.id,g))continue;
        for(const i of GROUP_CELLS[g]){
          if(canSky(p.id,i).ok&&p.money-specCost(i,'sky')>=reserve){buildSky(p.id,i);built=true;break;}
          if(canBC(p.id,i).ok&&p.money-specCost(i,'bc')>=reserve){buildBC(p.id,i);built=true;break;}
        }
        if(built)break;
      }
      if(!built){
        const rrs=ownedCells(p.id).filter(i=>CELLS[i].t==='rr'&&!G.depot[i]);
        if(rrs.length&&p.money-100>=reserve&&G.bank.depot>0){buildDepot(p.id,rrs[0]);built=true;}
      }
      if(built){await sleep(420);continue;}
    }
    let best=-1,bc=1e9;
    for(const g in GROUP_CELLS){
      if(!ownsAllIn(G,p.id,g)||groupHasMortgaged(g))continue;
      const min=Math.min(...GROUP_CELLS[g].map(i=>effLevel(G.houses[i])));
      for(const i of GROUP_CELLS[g]){
        if(effLevel(G.houses[i])!==min)continue;
        const cost=effBuildCost(i);
        const chk=chkBuild(p.id,i);
        if(chk.ok&&cost<bc&&p.money-cost>=reserve){best=i;bc=cost;}
      }
    }
    if(best<0)break;
    buildHouse(p.id,best);
    await sleep(420);
  }
}
async function aiTurn(p){
  if(!G)return;
  const sid=G.id;
  await sleep(650);
  if(!okG(sid)||!p.alive||G.over)return;
  while(okG(sid)&&!G.over&&p.alive){
    if(p.inJail){
      if(p.jailChoice==='try'){
        G.phase='anim';setControls();
        cineDiceIn();
        const d=await animateDice();if(!okG(sid))return;
        G.dice=d;updDiceHUD();
        if(d[0]===d[1]){
          cineDiceOut();
          releaseJail(p);log('🎲 '+esc(p.name)+' выбрасывает дубль и сбегает!');
          await moveSteps(p.id,d[0]+d[1]);if(!okG(sid))return;
          if(p.alive)await resolveCell(p.id);if(!okG(sid))return;
        }else{
          cineDiceOut();
          p.jailTurns++;
          log('🔒 '+esc(p.name)+': без дубля ('+p.jailTurns+'/3)');
          if(p.jailTurns>=3){
            moneyFX(p.id,null,2);
            await payTo(p.id,50,-1,true);if(!okG(sid))return;
            if(p.alive){releaseJail(p);await moveSteps(p.id,d[0]+d[1]);if(!okG(sid))return;if(p.alive)await resolveCell(p.id);if(!okG(sid))return;}
          }
        }
        break;
      }else{
        if(p.jailChoice==='pay'){moneyFX(p.id,null,2);await payTo(p.id,50,-1,true);}
        else p.jailCards--;
        if(!okG(sid)||!p.alive)return;
        releaseJail(p);
      }
    }
    G.phase='anim';setControls();
    const res=await doRoll(p.id);
    if(!okG(sid)||!p.alive)return;
    if(res.cont){await sleep(650);if(!okG(sid))return;continue;}
    break;
  }
  if(!okG(sid)||!p.alive||G.over)return;
  await sleep(450);
  if(!okG(sid))return;
  await aiBuildPhase(p);
  if(!okG(sid))return;
  if(p.ai===3&&Math.random()<0.5&&!G.over&&p.alive)await aiTradePhase(p);
  if(!okG(sid))return;
  await endTurn();
}
