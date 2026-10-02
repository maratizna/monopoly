/* ============ 5. 3D СЦЕНА ============ */
let scene,camera,renderer,raycaster,boardG,syndGroup;
let tileAnchors=[],tilePlanes=[],hlMeshes=[],houseGrps=[];
let diceMeshes=[],tweenList=[];
let hoveredIdx=-1;
let CAM=null;
let coinGeo=null,coinMat=null;
function shade(hex,f){const c=new THREE.Color(hex);c.multiplyScalar(f);return '#'+c.getHexString();}
function cellWorldPos(i){
  let x=0,z=0;
  if(i<=10){x=5-i;z=5;}
  else if(i<=20){x=-5;z=5-(i-10);}
  else if(i<=30){x=-5+(i-20);z=-5;}
  else {x=5;z=-5+(i-30);}
  return new THREE.Vector3(x,0,z);
}
function edgeRot(i){
  if(i===0||i===10)return 0;
  if(i===20||i===30)return Math.PI;
  if(i<10)return 0; if(i<20)return -Math.PI/2; if(i<30)return Math.PI; return Math.PI/2;
}
function drawWrapped(g,text,cx,cy,maxW,baseSize,color){
  g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';
  let size=baseSize;
  const words=text.split(' ');
  for(;size>=14;size-=2){
    g.font='700 '+size+'px Rubik,sans-serif';
    let lines=[];let cur='';
    for(const w of words){const t=cur?cur+' '+w:w;if(g.measureText(t).width>maxW&&cur){lines.push(cur);cur=w;}else cur=t;}
    if(cur)lines.push(cur);
    if(lines.length<=3&&lines.every(l=>g.measureText(l).width<=maxW)){
      const lh=size*1.12;const y0=cy-(lines.length-1)*lh/2;
      lines.forEach((l,k)=>g.fillText(l,cx,y0+k*lh));
      return;
    }
  }
  g.font='700 14px Rubik,sans-serif';g.fillText(text,cx,cy);
}
function bigEmoji(g,e,x,y,size){g.font=size+'px serif';g.textAlign='center';g.textBaseline='middle';g.fillText(e,x,y);}
function makeTileCanvas(idx){
  const c=CELLS[idx],cv=document.createElement('canvas');cv.width=cv.height=256;const g=cv.getContext('2d');
  g.fillStyle='#F6EFDE';g.fillRect(0,0,256,256);
  g.strokeStyle='#2A2E3A';g.lineWidth=5;g.strokeRect(3,3,250,250);
  g.textAlign='center';
  if(c.t==='street'){
    g.fillStyle=GROUPS[c.g].c;g.fillRect(5,180,246,71);
    g.fillStyle='rgba(0,0,0,.2)';g.fillRect(5,180,246,5);
    drawWrapped(g,c.name,128,96,212,27,'#2A2E3A');
    g.fillStyle='#fff';g.font='800 30px Rubik,sans-serif';g.textBaseline='middle';g.fillText(fmt(c.price),128,217);
  }else if(c.t==='rr'||c.t==='util'){
    let icon=c.t==='rr'?'🚂':(idx===12?'⚡':'🚰');
    if(G&&G.custom.infra){
      if(c.t==='rr'&&G.infra.tram)icon+='🚋';
      if(c.t==='util'&&G.infra.fiber)icon+='📡';
    }
    bigEmoji(g,icon,128,78,c.t==='rr'&&G&&G.custom.infra&&G.infra.tram?52:66);
    drawWrapped(g,c.name,128,158,214,23,'#2A2E3A');
    g.fillStyle='#2A2E3A';g.font='800 26px Rubik,sans-serif';g.textBaseline='middle';g.fillText(fmt(c.price),128,232);
  }else if(c.t==='chance'){bigEmoji(g,'❓',128,100,86);g.fillStyle='#D93A96';g.font='800 34px Rubik,sans-serif';g.textBaseline='middle';g.fillText('ШАНС',128,206);}
  else if(c.t==='chest'){bigEmoji(g,'💰',128,100,80);g.fillStyle='#2A7DE1';g.font='800 34px Rubik,sans-serif';g.textBaseline='middle';g.fillText('КАЗНА',128,206);}
  else if(c.t==='tax'){bigEmoji(g,'💸',128,96,80);g.fillStyle='#2A2E3A';g.font='800 32px Rubik,sans-serif';g.textBaseline='middle';g.fillText(fmt(c.amount),128,204);}
  return cv;
}
function refreshTilesForInfra(){
  for(let i=0;i<40;i++){
    const c=CELLS[i];
    if(c.t==='rr'||c.t==='util'){
      const plane=tilePlanes[i];if(!plane)continue;
      if(plane.material.map)plane.material.map.dispose(); // анти-утечка: старую текстуру освобождаем
      plane.material.map=new THREE.CanvasTexture(makeTileCanvas(i));
      plane.material.needsUpdate=true;
    }
  }
}
function makeCornerCanvas(kind){
  const cv=document.createElement('canvas');cv.width=cv.height=256;const g=cv.getContext('2d');
  g.fillStyle='#F6EFDE';g.fillRect(0,0,256,256);
  g.strokeStyle='#2A2E3A';g.lineWidth=5;g.strokeRect(3,3,250,250);
  g.textAlign='center';g.textBaseline='middle';
  if(kind==='go'){
    g.fillStyle='#E23B3B';g.font='800 52px Rubik,sans-serif';g.fillText('СТАРТ',128,78);
    g.beginPath();g.moveTo(200,140);g.lineTo(90,140);g.lineTo(90,116);g.lineTo(42,152);g.lineTo(90,188);g.lineTo(90,164);g.lineTo(200,164);g.closePath();g.fill();
    g.fillStyle='#2A2E3A';g.font='800 26px Rubik,sans-serif';g.fillText('+$',128,222);
  }else if(kind==='jail'){
    g.fillStyle='#8a93a8';g.fillRect(140,60,90,90);
    g.fillStyle='#3a4152';for(let k=0;k<4;k++)g.fillRect(150+k*22,68,7,74);
    bigEmoji(g,'🔒',80,105,64);
    g.fillStyle='#2A2E3A';g.font='800 32px Rubik,sans-serif';g.fillText('ТЮРЬМА',128,205);
  }else if(kind==='parking'){
    g.fillStyle=G&&G.custom.shadow?'#7b5cff':'#2AA84F';
    g.beginPath();g.arc(128,110,64,0,7);g.fill();
    g.fillStyle='#fff';g.font='800 84px Rubik,sans-serif';g.fillText(G&&G.custom.shadow?'🃏':'P',128,114);
    g.fillStyle='#2A2E3A';g.font='800 26px Rubik,sans-serif';g.fillText(G&&G.custom.shadow?'ТЕНЕВОЙ РЫНОК':'ОТДЫХ',128,215);
  }else{
    bigEmoji(g,'👮',128,92,84);
    g.fillStyle='#E23B3B';g.font='800 30px Rubik,sans-serif';g.fillText('В ТЮРЬМУ',128,205);
  }
  return cv;
}
function refreshCornerParking(){
  const plane=tilePlanes[20];if(!plane)return;
  if(plane.material.map)plane.material.map.dispose();
  plane.material.map=new THREE.CanvasTexture(makeCornerCanvas('parking'));
  plane.material.needsUpdate=true;
}
function makeCenterTexture(){
  const cv=document.createElement('canvas');cv.width=cv.height=1024;const g=cv.getContext('2d');
  g.clearRect(0,0,1024,1024);
  g.save();g.translate(512,410);
  g.fillStyle='#D93025';g.font='800 104px Rubik,sans-serif';g.textAlign='center';g.textBaseline='middle';
  g.fillText('БИЗНЕС-СИТИ',0,0);
  g.fillStyle='#2A2E3A';g.font='700 34px Rubik,sans-serif';g.fillText('LOW POLY EDITION',0,80);
  g.restore();
  const deck=(x,y,rot,label,col)=>{g.save();g.translate(x,y);g.rotate(rot);g.fillStyle=col;g.fillRect(-95,-60,190,120);g.strokeStyle='#141824';g.lineWidth=6;g.strokeRect(-95,-60,190,120);g.fillStyle='#fff';g.font='800 40px Rubik,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(label,0,0);g.restore();};
  deck(300,220,-0.35,'ШАНС','#D93A96');
  deck(730,780,-0.35,'КАЗНА','#2A7DE1');
  return cv;
}
function blobTexture(){
  const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d');
  const gr=g.createRadialGradient(32,32,4,32,32,30);gr.addColorStop(0,'rgba(0,0,0,.5)');gr.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=gr;g.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(cv);
}
let blobTex=null;

/* === Фича 2: ПУЛ ЧАСТИЦ (создаётся один раз) === */
const PARTICLE_MAX=420;
let P=null; // {points,geo,pos,col,size,alpha,state[],free[]}
function initParticles(){
  const geo=new THREE.BufferGeometry();
  const pos=new Float32Array(PARTICLE_MAX*3);
  const col=new Float32Array(PARTICLE_MAX*3);
  const siz=new Float32Array(PARTICLE_MAX);
  const alp=new Float32Array(PARTICLE_MAX);
  const state=[];const free=[];
  for(let i=0;i<PARTICLE_MAX;i++){
    pos[i*3]=0;pos[i*3+1]=-999;pos[i*3+2]=0;col[i*3]=1;col[i*3+1]=1;col[i*3+2]=1;siz[i]=0;alp[i]=0;
    state.push({alive:false,vx:0,vy:0,vz:0,life:0,maxLife:1,grav:-3});
    free.push(i);
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('customColor',new THREE.BufferAttribute(col,3));
  geo.setAttribute('size',new THREE.BufferAttribute(siz,1));
  geo.setAttribute('alpha',new THREE.BufferAttribute(alp,1));
  const mat=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:'attribute float size;attribute vec3 customColor;attribute float alpha;varying vec3 vC;varying float vA;void main(){vC=customColor;vA=alpha;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=size*(320.0/-mv.z);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'varying vec3 vC;varying float vA;void main(){vec2 c=gl_PointCoord-vec2(0.5);float d=length(c);if(d>0.5)discard;float a=vA*(1.0-smoothstep(0.25,0.5,d));gl_FragColor=vec4(vC,a);}'
  });
  const points=new THREE.Points(geo,mat);
  points.frustumCulled=false;
  scene.add(points);
  P={points,geo,pos,col,siz,alp,state,free};
}
function pEmit(x,y,z,vx,vy,vz,r,g,b,size,life,grav){
  if(!P||SETS.particles===false)return;
  if(!P.free.length)return;
  const i=P.free.pop();const s=P.state[i];
  s.alive=true;s.vx=vx;s.vy=vy;s.vz=vz;s.life=life;s.maxLife=life;s.grav=(grav==null?-3:grav);
  P.pos[i*3]=x;P.pos[i*3+1]=y;P.pos[i*3+2]=z;
  P.col[i*3]=r;P.col[i*3+1]=g;P.col[i*3+2]=b;
  P.siz[i]=size;P.alp[i]=1;
}
function pUpdate(dt){
  if(!P)return;
  let dirty=false;
  for(let i=0;i<PARTICLE_MAX;i++){
    const s=P.state[i];
    if(!s.alive)continue;
    dirty=true;s.life-=dt;
    if(s.life<=0){s.alive=false;P.alp[i]=0;P.siz[i]=0;P.pos[i*3+1]=-999;P.free.push(i);continue;}
    s.vy+=s.grav*dt;
    P.pos[i*3]+=s.vx*dt;P.pos[i*3+1]+=s.vy*dt;P.pos[i*3+2]+=s.vz*dt;
    P.alp[i]=clamp(s.life/s.maxLife,0,1);
  }
  if(dirty){P.geo.attributes.position.needsUpdate=true;P.geo.attributes.alpha.needsUpdate=true;P.geo.attributes.size.needsUpdate=true;P.geo.attributes.customColor.needsUpdate=true;}
}
function resetParticles(){
  if(!P)return;
  for(let i=0;i<PARTICLE_MAX;i++){P.state[i].alive=false;P.alp[i]=0;P.siz[i]=0;P.pos[i*3+1]=-999;}
  P.free=[];for(let i=0;i<PARTICLE_MAX;i++)P.free.push(i);
  P.geo.attributes.position.needsUpdate=true;P.geo.attributes.alpha.needsUpdate=true;
}
const _c=new THREE.Color();
function fxBuild(posHex){ // пыль и искры вверх от клетки
  if(!P||SETS.particles===false)return;
  _c.set(posHex||'#d8c9a0');
  for(let i=0;i<18;i++){
    const a=Math.random()*Math.PI*2,sp=0.4+Math.random()*0.9;
    pEmit(0,0,0,0,0,0,0,0,0,0,0,0); // placeholder replaced below
  }
}
function fxBuildAt(worldPos,colorHex){
  if(!P||SETS.particles===false||!worldPos)return;
  _c.set(colorHex||'#cbb894');
  for(let i=0;i<22;i++){ // пыль
    const a=Math.random()*Math.PI*2,sp=0.3+Math.random()*0.7;
    pEmit(worldPos.x+(Math.random()-.5)*.2,worldPos.y+.2,worldPos.z+(Math.random()-.5)*.2,
      Math.cos(a)*sp*.4,0.6+Math.random()*1.1,Math.sin(a)*sp*.4,
      _c.r*0.8,_c.g*0.8,_c.b*0.8,0.10+Math.random()*0.06,0.5+Math.random()*0.3,-1.2);
  }
  for(let i=0;i<14;i++){ // золотые искры
    const a=Math.random()*Math.PI*2,sp=0.7+Math.random()*1.4;
    pEmit(worldPos.x,worldPos.y+.25,worldPos.z,
      Math.cos(a)*sp*.5,1.2+Math.random()*1.8,Math.sin(a)*sp*.5,
      1,0.85,0.2,0.07+Math.random()*0.05,0.5+Math.random()*0.35,-3.5);
  }
}
function fxCollapse(worldPos,colorHex){ // «разрушение» фишки — взрыв полигонов/конфетти
  if(!P||SETS.particles===false||!worldPos)return;
  _c.set(colorHex||'#ffffff');
  for(let i=0;i<46;i++){
    const a=Math.random()*Math.PI*2,el=Math.random()*Math.PI,sp=1.2+Math.random()*2.4;
    pEmit(worldPos.x,worldPos.y+.25,worldPos.z,
      Math.cos(a)*Math.sin(el)*sp,Math.abs(Math.cos(el))*sp*0.9+1.2,Math.sin(a)*Math.sin(el)*sp,
      _c.r,_c.g,_c.b,0.09+Math.random()*0.09,0.9+Math.random()*0.5,-4.5);
  }
}
let boomAcc=0;
function fxBoomSparkle(dt){ // золотые блики над отелями в эру «Бум»
  if(!P||SETS.particles===false||!G||!G.custom.eras||G.era.phase!=='boom')return;
  boomAcc+=dt;
  if(boomAcc<0.45)return;boomAcc=0;
  const hotelCells=[];for(let i=0;i<40;i++){if(G.houses[i]>=5)hotelCells.push(i);}
  if(!hotelCells.length)return;
  const idx=pick(hotelCells);const pos=tileAnchors[idx].position;
  for(let k=0;k<3;k++){
    pEmit(pos.x+(Math.random()-.5)*.6,0.6+Math.random()*.5,pos.z+(Math.random()-.5)*.6,
      (Math.random()-.5)*.2,0.4+Math.random()*.5,(Math.random()-.5)*.2,
      1,0.9,0.35,0.10+Math.random()*0.05,0.8+Math.random()*.4,-0.3);
  }
}

/* === Фича 1: КИНО-КАМЕРА === */
const CineCam={mode:'manual',t:0,dur:0,curve:null,look:null,shake:0,shakeT:0,retR:15.5,retTarget:null};
function cineEnabled(){return SETS.cinecam===true&&CAM&&G&&!G.over;}
function cineInterrupt(){if(CineCam.mode!=='manual'){CineCam.mode='manual';CineCam.curve=null;CineCam.shake=0;}}
function syncCamFromPosition(){
  if(!CAM)return;
  const off=camera.position.clone().sub(CAM.target);
  const r=Math.max(2,off.length());
  CAM.r=CAM.tR=r;
  CAM.phi=CAM.tPhi=clamp(Math.acos(clamp(off.y/r,-1,1)),0.42,1.35);
  CAM.theta=CAM.tTheta=Math.atan2(off.x,off.z);
}
function cineDiceIn(){
  if(!cineEnabled())return;
  CineCam.retR=CAM.tR;CineCam.retTarget=CAM.tTarget.clone();
  CAM.tTarget.set(0,0.55,0);
  CAM.tR=Math.min(7.5,CAM.r*0.55);
  CAM.tPhi=0.95;
  CineCam.mode='diceCloseup';
}
function cineDiceOut(){
  if(!cineEnabled()||CineCam.mode!=='diceCloseup')return;
  const p=G.players[G.cur];
  if(p&&p.mesh)CAM.tTarget.set(p.mesh.position.x*0.38,0,p.mesh.position.z*0.38);
  else CAM.tTarget.set(0,0,0);
  CAM.tR=CineCam.retR;
  CineCam.mode='manual';
}
function cineRentFlight(fromPid,toPid){
  if(!cineEnabled())return;
  const a=G.players[fromPid],b=G.players[toPid];
  if(!a||!b||!a.mesh||!b.mesh)return;
  const p0=a.mesh.position.clone();p0.y+=0.5;
  const p2=b.mesh.position.clone();p2.y+=0.5;
  const mid=p0.clone().lerp(p2,0.5);mid.y+=2.6;
  const side=new THREE.Vector3(-(p2.z-p0.z),0,(p2.x-p0.x)).normalize().multiplyScalar(1.6);
  mid.add(side);
  CineCam.curve=new THREE.CatmullRomCurve3([p0,mid,p2]);
  CineCam.look=p2.clone();
  CineCam.t=0;CineCam.dur=1.5;CineCam.mode='rentFlight';
  CineCam.retR=CAM.tR;
}
function cineBankrupt(){
  if(!cineEnabled())return;
  CAM.tR=clamp(CAM.r+7,9,27);
  CineCam.shake=0.16;CineCam.shakeT=0.45;
  CineCam.mode='bankruptZoomOut';
  setTimeout(()=>{if(CineCam.mode==='bankruptZoomOut')CineCam.mode='manual';},900);
}

/* === Фича 3: тепловая карта (оверлеи создаются один раз) === */
let heatOverlays=[];
function initHeatmap(){
  for(let i=0;i<40;i++){
    const isCorner=(i%10===0);
    const mat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false});
    const m=new THREE.Mesh(new THREE.PlaneGeometry(isCorner?1.06:0.99,isCorner?1.06:0.99),mat);
    m.rotation.x=-Math.PI/2;m.position.y=0.035;m.visible=false;m.raycast=()=>{};
    tileAnchors[i].add(m);heatOverlays[i]=m;
  }
}
function refreshHeatmap(){
  if(!G)return;
  const myId=G.cur;
  for(let i=0;i<40;i++){
    const ov=heatOverlays[i];if(!ov)continue;
    if(!heatmapOn){ov.visible=false;continue;}
    const c=CELLS[i],o=G.owner[i];let col=null,op=0;
    const isProp=(c.t==='street'||c.t==='rr'||c.t==='util');
    if(isProp&&o>=0&&G.players[o]&&G.players[o].alive){
      const h=G.houses[i];
      if(o!==myId&&h>=5){col=0xE23B3B;op=0.42;}              // опасно: отель/небоскрёб/БЦ соперника
      else if(o===myId&&c.t==='street'&&ownsAllIn(G,myId,c.g)){col=0x3FA34D;op=0.4;} // моя монополия
    }
    if(col!=null){ov.material.color.setHex(col);ov.material.opacity=op;ov.visible=true;}
    else ov.visible=false;
  }
}

/* === Фича 5: табло Биржи в центре доски (один mesh, текстура переиспользуется) === */
let stockBoard=null,stockBoardCanvas=null;
function initStockBoard(){
  stockBoardCanvas=document.createElement('canvas');stockBoardCanvas.width=512;stockBoardCanvas.height=256;
  const tex=new THREE.CanvasTexture(stockBoardCanvas);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(3.4,1.7),new THREE.MeshBasicMaterial({map:tex,transparent:true}));
  m.rotation.x=-Math.PI/2;m.position.set(0,0.286,2.4);m.visible=false;
  scene.add(m);stockBoard=m;
}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function refreshStockBoard(){
  if(!stockBoard)return;
  const on=!!(G&&G.custom.stocks);
  stockBoard.visible=on;
  if(!on||!G.stocks)return;
  const g=stockBoardCanvas.getContext('2d');
  g.clearRect(0,0,512,256);
  g.fillStyle='rgba(16,20,32,0.9)';rr(g,6,6,500,244,18);g.fill();
  g.strokeStyle='#F2C500';g.lineWidth=3;rr(g,6,6,500,244,18);g.stroke();
  g.font='800 24px Rubik,sans-serif';g.fillStyle='#F2C500';g.textAlign='center';g.textBaseline='middle';
  g.fillText('📈 БИРЖА БИЗНЕС-СИТИ',256,32);
  STOCK_CORPS.forEach((c,i)=>{
    const y=74+i*42;
    g.fillStyle=c.color;g.fillRect(24,y-9,16,16);
    g.fillStyle='#e8ecf8';g.font='700 19px Rubik,sans-serif';g.textAlign='left';g.fillText(c.name,48,y);
    const h=G.stocks.hist[c.key]||[];const prev=h.length>1?h[h.length-2]:G.stocks.prices[c.key];
    const cur=G.stocks.prices[c.key];
    g.textAlign='right';g.fillStyle=cur>=prev?'#8ee6a0':'#ff9a9a';
    g.fillText((cur>=prev?'▲ ':'▼ ')+'$'+cur,486,y);
  });
  stockBoard.material.map.needsUpdate=true;
}
function initStocks(){
  const prices={},hist={},hold={};
  STOCK_CORPS.forEach(c=>{prices[c.key]=100;hist[c.key]=[100];});
  return {prices,hist,hold,founded:[]};
}
function stockBump(key,n){if(G&&G.custom.stocks&&G.stockEvents)G.stockEvents[key]=(G.stockEvents[key]||0)+(n||1);}
function updateStockPrices(){
  if(!G||!G.custom.stocks||!G.stocks)return;
  const s=G.stocks,ev=G.stockEvents;
  STOCK_CORPS.forEach(c=>{
    const demand=ev[c.key]||0;
    const delta=(demand-1)*7+(Math.random()*16-8);
    s.prices[c.key]=clamp(Math.round(s.prices[c.key]+delta),40,600);
    s.hist[c.key].push(s.prices[c.key]);if(s.hist[c.key].length>40)s.hist[c.key].shift();
    ev[c.key]=0;
  });
  refreshStockBoard();
}
function stockDividends(pi){
  if(!G||!G.custom.stocks||!G.stocks)return 0;
  const hold=G.stocks.hold[pi]||{};let total=0;
  STOCK_CORPS.forEach(c=>{const n=hold[c.key]||0;if(n>0)total+=n*Math.max(1,Math.round(G.stocks.prices[c.key]/40));});
  (G.stocks.founded||[]).forEach(f=>{if(f.owner===pi)total+=30;});
  if(total>0){G.players[pi].money+=total;moneyFX(null,pi,3);log('📈 Дивиденды по акциям '+esc(G.players[pi].name)+': +'+fmt(total));}
  return total;
}
function openStockModal(){
  if(!G||!G.custom.stocks){toast('Биржа не включена в этой партии');return;}
  const p=cp();const canAct=canActNow()&&!p.ai;
  Snd.click();
  let html='<button class="x-btn" data-act="close">✕</button><div class="modal-title">📈 ФОНДОВАЯ БИРЖА</div>';
  html+='<div style="text-align:center;font-size:13px;margin-bottom:8px">Ваши деньги: <b style="color:var(--accent)">'+fmt(p.money)+'</b>'+(canAct?'':' · <span style="color:#9fb0d8">покупка доступна в ваш ход</span>')+'</div>';
  STOCK_CORPS.forEach(c=>{
    const h=G.stocks.hist[c.key]||[];const prev=h.length>1?h[h.length-2]:G.stocks.prices[c.key];
    const cur=G.stocks.prices[c.key];const up=cur>=prev;
    const owned=(G.stocks.hold[p.id]&&G.stocks.hold[p.id][c.key])||0;
    html+='<div class="prop-row">'+
      '<span class="sw-color" style="background:'+c.color+'"></span>'+
      '<span class="pr-name">'+c.icon+' '+esc(c.name)+' <span style="color:'+(up?'#8ee6a0':'#ff9a9a')+'">'+(up?'▲':'▼')+'$'+cur+'</span></span>'+
      '<span class="pr-val">у вас: '+owned+'</span>'+
      (canAct?'<button class="btn good mini-btn" data-act="stock-buy" data-key="'+c.key+'">Купить $'+cur+'</button>'+
      (owned>0?'<button class="btn bad mini-btn" data-act="stock-sell" data-key="'+c.key+'">Продать</button>':''):'')+
      '</div>';
  });
  const founded=(G.stocks.founded||[]).filter(f=>f.owner===p.id).length;
  if(canAct&&p.money>=800){
    html+='<div class="prop-row" style="flex-direction:column;align-items:stretch"><div style="font-weight:800">🏢 Основать свою компанию</div>'+
      '<div style="color:#9fb0d8;font-size:12px">−$800一次性. Приносит $30 дивидендов каждый проход GO. Основано: '+founded+'</div>'+
      '<div class="btn-row" style="justify-content:flex-start"><button class="btn blue mini-btn" data-act="stock-found">ОСНОВАТЬ $800</button></div></div>';
  }
  html+='<div class="btn-row"><button class="btn ghost" data-act="close">ЗАКРЫТЬ</button></div>';
  showModal(html,{wide:true});
}

function initScene(){
  CAM={theta:-0.7,phi:1.0,r:15.5,tTheta:-0.7,tPhi:1.0,tR:15.5,target:new THREE.Vector3(),tTarget:new THREE.Vector3()};
  scene=new THREE.Scene();scene.background=new THREE.Color('#232B3E');
  camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,120);
  renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(innerWidth,innerHeight);
  $('#scene-holder').appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff,0x66728c,.95));
  const dir=new THREE.DirectionalLight(0xffffff,.75);dir.position.set(7,12,5);scene.add(dir);
  const table=new THREE.Mesh(new THREE.CylinderGeometry(10.5,11,0.5,10),new THREE.MeshStandardMaterial({color:'#3E6B4F',flatShading:true,roughness:1}));
  table.position.y=-0.6;scene.add(table);
  const frame=new THREE.Mesh(new THREE.BoxGeometry(12.3,0.36,12.3),new THREE.MeshStandardMaterial({color:'#1F2430',flatShading:true,roughness:.9}));
  frame.position.y=-0.02;scene.add(frame);
  const base=new THREE.Mesh(new THREE.BoxGeometry(11.35,0.44,11.35),new THREE.MeshStandardMaterial({color:'#EFE7D4',flatShading:true,roughness:.95}));
  base.position.y=0.05;scene.add(base);
  const centerPlane=new THREE.Mesh(new THREE.PlaneGeometry(8.9,8.9),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(makeCenterTexture()),transparent:true}));
  centerPlane.rotation.x=-Math.PI/2;centerPlane.position.y=0.278;scene.add(centerPlane);
  boardG=new THREE.Group();scene.add(boardG);
  syndGroup=new THREE.Group();scene.add(syndGroup);
  blobTex=blobTexture();
  for(let i=0;i<40;i++){
    const pos=cellWorldPos(i),rot=edgeRot(i);
    const anchor=new THREE.Group();anchor.position.set(pos.x,0.275,pos.z);anchor.rotation.y=rot;
    const isCorner=(i%10===0);
    const cv=isCorner?makeCornerCanvas(['go','jail','parking','gotojail'][i/10]):makeTileCanvas(i);
    const tex=new THREE.CanvasTexture(cv);tex.anisotropy=4;
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(isCorner?1.06:0.99,isCorner?1.06:0.99),new THREE.MeshBasicMaterial({map:tex}));
    plane.rotation.x=-Math.PI/2;plane.position.y=0.006;plane.userData.idx=i;
    anchor.add(plane);
    const hl=new THREE.Mesh(new THREE.PlaneGeometry(isCorner?1.1:1.05,isCorner?1.1:1.05),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false}));
    hl.rotation.x=-Math.PI/2;hl.position.y=0.02;anchor.add(hl);
    boardG.add(anchor);
    tileAnchors[i]=anchor;tilePlanes[i]=plane;hlMeshes[i]=hl;houseGrps[i]=null;
    updateHouseMesh(i);
  }
  for(let k=0;k<2;k++){
    const mats=[];const vals=[2,5,3,4,1,6];
    for(const v of vals)mats.push(new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(dieFace(v))}));
    const d=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.55,0.55),mats);
    d.visible=false;scene.add(d);diceMeshes.push(d);
  }
  raycaster=new THREE.Raycaster();
  window.addEventListener('resize',onResize);
  /* новые подсистемы — создаются один раз */
  initParticles();
  initHeatmap();
  initStockBoard();
}
function dieFace(v){
  const cv=document.createElement('canvas');cv.width=cv.height=128;const g=cv.getContext('2d');
  g.fillStyle='#fff';g.fillRect(0,0,128,128);
  g.strokeStyle='#c9c2b0';g.lineWidth=8;g.strokeRect(4,4,120,120);
  const Pts={1:[[64,64]],2:[[38,38],[90,90]],3:[[34,34],[64,64],[94,94]],4:[[38,38],[90,38],[38,90],[90,90]],5:[[36,36],[92,36],[64,64],[36,92],[92,92]],6:[[38,32],[90,32],[38,64],[90,64],[38,96],[90,96]]};
  g.fillStyle='#23262e';
  Pts[v].forEach(p=>{g.beginPath();g.arc(p[0],p[1],12,0,7);g.fill();});
  return cv;
}
function onResize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
function mkHouse(color,s){
  const grp=new THREE.Group();
  const m=new THREE.MeshStandardMaterial({color,flatShading:true,roughness:.8});
  const b=new THREE.Mesh(new THREE.BoxGeometry(0.13*s,0.11*s,0.13*s),m);b.position.y=0.055*s;grp.add(b);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(0.105*s,0.1*s,4),new THREE.MeshStandardMaterial({color:shade(color,.55),flatShading:true,roughness:.8}));
  roof.position.y=(0.11+0.05)*s;roof.rotation.y=Math.PI/4;grp.add(roof);
  return grp;
}
function mkFlag(color){
  const grp=new THREE.Group();
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.013,0.013,0.3,6),new THREE.MeshStandardMaterial({color:'#2A2E3A',flatShading:true}));
  pole.position.y=0.15;grp.add(pole);
  const fl=new THREE.Mesh(new THREE.BoxGeometry(0.13,0.08,0.012),new THREE.MeshStandardMaterial({color,flatShading:true,roughness:.7}));
  fl.position.set(-0.065,0.26,0);grp.add(fl);
  return grp;
}
function mkHotel(color){
  const grp=new THREE.Group();
  const m=new THREE.MeshStandardMaterial({color,flatShading:true,roughness:.75});
  const slab=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.03,0.26),new THREE.MeshStandardMaterial({color:'#2A2E3A',flatShading:true}));
  slab.position.y=0.015;grp.add(slab);
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.34,0.2),m);body.position.y=0.2;grp.add(body);
  const band=new THREE.Mesh(new THREE.BoxGeometry(0.27,0.05,0.21),new THREE.MeshStandardMaterial({color:'#F2C500',flatShading:true}));
  band.position.y=0.39;grp.add(band);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(0.17,0.13,4),new THREE.MeshStandardMaterial({color:shade(color,.55),flatShading:true}));
  roof.position.y=0.48;roof.rotation.y=Math.PI/4;grp.add(roof);
  const flag=mkFlag('#F2C500');flag.scale.setScalar(.6);flag.position.y=0.53;grp.add(flag);
  return grp;
}
function mkSkyscraper(color){
  const grp=new THREE.Group();
  const glass=new THREE.MeshStandardMaterial({color:'#9fd6f2',flatShading:true,roughness:.4,metalness:.2});
  const slab=new THREE.Mesh(new THREE.BoxGeometry(0.44,0.03,0.28),new THREE.MeshStandardMaterial({color:'#2A2E3A',flatShading:true}));
  slab.position.y=0.015;grp.add(slab);
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.62,0.18),glass);body.position.y=0.34;grp.add(body);
  const trim=new THREE.Mesh(new THREE.BoxGeometry(0.23,0.05,0.19),new THREE.MeshStandardMaterial({color,flatShading:true}));
  trim.position.y=0.62;grp.add(trim);
  const ant=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.16,5),new THREE.MeshStandardMaterial({color:'#F2C500'}));
  ant.position.y=0.73;grp.add(ant);
  return grp;
}
function mkOffice(color){
  const grp=new THREE.Group();
  const m=new THREE.MeshStandardMaterial({color,flatShading:true,roughness:.8});
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.32,0.22,0.2),m);body.position.y=0.11;grp.add(body);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.04,0.22),new THREE.MeshStandardMaterial({color:shade(color,.5),flatShading:true}));
  roof.position.y=0.24;grp.add(roof);
  const ac=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.06,0.08),new THREE.MeshStandardMaterial({color:'#8a93a8',flatShading:true}));
  ac.position.set(0.08,0.29,0);grp.add(ac);
  return grp;
}
function mkDepotMesh(){
  const grp=new THREE.Group();
  const pl=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.06,0.16),new THREE.MeshStandardMaterial({color:'#8a93a8',flatShading:true}));
  pl.position.y=0.03;grp.add(pl);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.05,0.14),new THREE.MeshStandardMaterial({color:'#a5432c',flatShading:true}));
  roof.position.y=0.17;grp.add(roof);
  const p1=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.12,0.03),new THREE.MeshStandardMaterial({color:'#2A2E3A'}));
  p1.position.set(-0.13,0.1,0);grp.add(p1);
  const p2=p1.clone();p2.position.x=0.13;grp.add(p2);
  return grp;
}
function updateHouseMesh(idx){
  const a=tileAnchors[idx];if(!a)return;
  if(houseGrps[idx]){a.remove(houseGrps[idx]);houseGrps[idx]=null;}
  if(!G)return;
  const o=G.owner[idx];
  if(o<0)return;
  const h=G.houses[idx];
  const c=CELLS[idx];
  const col=G.mortgaged[idx]?'#8a93a8':G.players[o].color;
  const grp=new THREE.Group();
  if(c.t==='rr'&&G.custom.spec&&G.depot[idx]){grp.add(mkDepotMesh());grp.position.set(0,0,0.3);}
  else if(h===0){grp.add(mkFlag(col));grp.position.set(0.34,0,0.32);}
  else if(h===5){grp.add(mkHotel(col));grp.position.set(0,0,0.27);}
  else if(h===6){grp.add(mkSkyscraper(col));grp.position.set(0,0,0.26);}
  else if(h===7){grp.add(mkOffice(col));grp.position.set(0,0,0.28);}
  else{
    const s=1+h*0.09;
    for(let k=0;k<h;k++){const m=mkHouse(col,s);m.position.x=(k-(h-1)/2)*(0.17*s);grp.add(m);}
    grp.position.set(0,0,0.3);
  }
  a.add(grp);houseGrps[idx]=grp;
}
function updateSyndLinks(){
  if(!syndGroup)return;
  while(syndGroup.children.length)syndGroup.remove(syndGroup.children[0]);
  if(!G||!G.custom.synd)return;
  G.syndicates.forEach(s=>{
    const a=tileAnchors[s.cells[0]].position,b=tileAnchors[s.cells[1]].position;
    const mid=new THREE.Vector3((a.x+b.x)/2,0.95,(a.z+b.z)/2);
    const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(a.x,0.32,a.z),mid,new THREE.Vector3(b.x,0.32,b.z));
    const pts=curve.getPoints(18);
    const geo=new THREE.BufferGeometry().setFromPoints(pts);
    syndGroup.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xF2C500})));
  });
}
function applyEraBackground(){
  if(!scene)return;
  let bg='#232B3E';
  if(G&&G.custom.eras){
    const ph=G.era.phase;
    if(ph==='boom'||ph==='inflation')bg='#3E2B23';
    else if(ph==='recession')bg='#1B2130';
  }else if(G&&G.custom.cycles){
    if(G.market.phase==='boom')bg='#3E2B23';
    else if(G.market.phase==='crisis')bg='#1B2130';
  }
  scene.background.set(bg);
}
function moneyFX(fromPid,toPid,count){
  if(!scene||!G)return;
  try{
    if(!coinGeo)coinGeo=new THREE.CylinderGeometry(0.07,0.07,0.025,10);
    if(!coinMat)coinMat=new THREE.MeshStandardMaterial({color:0xF2C500,flatShading:true,roughness:.4,metalness:.5,emissive:0x5c4600});
    const n=clamp(count||4,1,6);
    const src=(fromPid!=null&&G.players[fromPid]&&G.players[fromPid].mesh)?G.players[fromPid].mesh.position.clone():new THREE.Vector3(0,0.55,0);
    const dst=(toPid!=null&&G.players[toPid]&&G.players[toPid].mesh)?G.players[toPid].mesh.position.clone():new THREE.Vector3(0,0.55,0);
    src.y+=0.35;dst.y+=0.3;
    for(let k=0;k<n;k++){
      const coin=new THREE.Mesh(coinGeo,coinMat);
      coin.position.copy(src);
      scene.add(coin);
      const mid=src.clone().lerp(dst,0.5);
      mid.x+=(Math.random()-0.5)*0.9;mid.z+=(Math.random()-0.5)*0.9;mid.y+=1.0+Math.random()*0.7;
      const curve=new THREE.QuadraticBezierCurve3(src.clone(),mid,dst.clone());
      const delay=k*90,dur=600;const t0=performance.now()+delay;
      const spin=(Math.random()*5+4)*(Math.random()<.5?-1:1);
      tweenList.push(dt=>{
        if(!G){scene.remove(coin);return true;}
        const now=performance.now();
        if(now<t0)return false;
        const kk=clamp((now-t0)/dur,0,1);
        coin.position.copy(curve.getPoint(kk));
        coin.rotation.z+=spin*dt;coin.rotation.x+=spin*0.7*dt;
        if(kk>=1){scene.remove(coin);return true;}
        return false;
      });
    }
  }catch(e){}
}
function buildToken(kind,color){
  const grp=new THREE.Group();
  const M=c=>new THREE.MeshStandardMaterial({color:c,flatShading:true,roughness:.85,metalness:.05});
  const main=M(color),white=M('#F4F1E8'),dark=M('#2A2E3A'),gold=M('#F2C500');
  const add=(geo,mat,x,y,z,rx,ry,rz)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);m.rotation.set(rx||0,ry||0,rz||0);grp.add(m);return m;};
  if(kind===0){add(new THREE.CylinderGeometry(.26,.28,.05,10),main,0,.03,0);add(new THREE.CylinderGeometry(.15,.16,.32,10),main,0,.21,0);add(new THREE.CylinderGeometry(.165,.165,.06,10),dark,0,.1,0);}
  else if(kind===1){
    add(new THREE.BoxGeometry(.55,.13,.28),main,0,.13,0);
    add(new THREE.BoxGeometry(.28,.11,.24),white,-0.04,.25,0);
    [[.18,.16],[.18,-.16],[-.18,.16],[-.18,-.16]].forEach(p=>add(new THREE.CylinderGeometry(.07,.07,.05,8),dark,p[0],.07,p[1],Math.PI/2));
  }else if(kind===2){
    add(new THREE.BoxGeometry(.34,.15,.16),main,0,.18,0);
    add(new THREE.BoxGeometry(.15,.14,.14),main,.22,.3,0);
    add(new THREE.BoxGeometry(.08,.06,.08),white,.31,.27,0);
    add(new THREE.ConeGeometry(.035,.09,4),main,.19,.42,.04);add(new THREE.ConeGeometry(.035,.09,4),main,.19,.42,-.04);
    [[.12,.06],[.12,-.06],[-.12,.06],[-.12,-.06]].forEach(p=>add(new THREE.BoxGeometry(.05,.12,.05),main,p[0],.06,p[1]));
    add(new THREE.ConeGeometry(.03,.14,4),main,-.2,.3,0,0,0,-.6);
  }else if(kind===3){
    add(new THREE.BoxGeometry(.5,.1,.22),main,0,.1,0);
    add(new THREE.BoxGeometry(.14,.08,.18),main,.24,.14,0,0,0,-.5);
    add(new THREE.CylinderGeometry(.015,.02,.36,6),dark,0,.3,0);
    const sail=new THREE.Mesh(new THREE.PlaneGeometry(.2,.24),new THREE.MeshStandardMaterial({color:'#F4F1E8',side:THREE.DoubleSide,flatShading:true}));
    sail.position.set(-.02,.32,.02);grp.add(sail);
  }else if(kind===4){
    add(new THREE.BoxGeometry(.17,.3,.17),main,-.07,.16,0);
    add(new THREE.BoxGeometry(.34,.12,.17),main,.05,.06,0);
  }else{
    add(new THREE.BoxGeometry(.3,.05,.3),dark,0,.025,0);
    add(new THREE.BoxGeometry(.18,.03,.18),dark,0,.065,0);
    add(new THREE.CylinderGeometry(.035,.05,.14,8),main,0,.14,0);
    add(new THREE.CylinderGeometry(.17,.07,.22,10),main,0,.32,0);
    add(new THREE.CylinderGeometry(.13,.13,.03,10),gold,0,.435,0);
    add(new THREE.TorusGeometry(.08,.02,6,10),main,.19,.33,0);
    add(new THREE.TorusGeometry(.08,.02,6,10),main,-.19,.33,0);
    add(new THREE.SphereGeometry(.035,6,6),gold,0,.47,0);
  }
  grp.scale.setScalar(.9);
  return grp;
}
function tileTokenPos(cellIdx,slot){
  const p=cellWorldPos(cellIdx);
  const off=[[.24,.24],[-.24,.24],[.24,-.24],[-.24,-.24]][slot%4];
  return new THREE.Vector3(p.x+off[0],0.285,p.z+off[1]);
}
function slotFor(pi,cellIdx){
  const here=G.players.filter(q=>q.alive&&q.pos===cellIdx).map(q=>q.id).sort((a,b)=>a-b);
  return Math.max(0,here.indexOf(pi));
}
function placeTokenInstant(pi){
  const p=G.players[pi];if(!p||!p.mesh)return;
  const t=tileTokenPos(p.pos,slotFor(pi,p.pos));
  p.mesh.position.copy(t);
  if(p.shadow)p.shadow.position.set(t.x,0.29,t.z);
}
function hopToken(pi,from,to,sid){
  return new Promise(res=>{
    const p=G.players[pi];
    const a=tileTokenPos(from,slotFor(pi,from)),b=tileTokenPos(to,slotFor(pi,to));
    const dx=b.x-a.x,dz=b.z-a.z;
    if(dx||dz)p.mesh.rotation.y=Math.atan2(dx,dz);
    const t0=performance.now(),dur=200;
    tweenList.push(()=>{
      if(!okG(sid)){res();return true;}
      const k=clamp((performance.now()-t0)/dur,0,1);
      p.mesh.position.lerpVectors(a,b,k);
      p.mesh.position.y=0.285+Math.sin(k*Math.PI)*0.42;
      if(p.shadow)p.shadow.position.set(p.mesh.position.x,0.29,p.mesh.position.z);
      if(k>=1){p.mesh.position.copy(b);p.mesh.position.y=0.285;Snd.step();res();return true;}
      return false;
    });
  });
}
function makeShadow(){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(.55,.55),new THREE.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.y=0.29;scene.add(m);return m;
}
function addPlayerToken(p){
  p.mesh=buildToken(p.token,p.color);scene.add(p.mesh);
  p.shadow=makeShadow();
  placeTokenInstant(p.id);
}
function removePlayerToken(p){
  if(p.mesh){scene.remove(p.mesh);p.mesh=null;}
  if(p.shadow){scene.remove(p.shadow);p.shadow=null;}
}
function camReset(){if(!CAM)return;CAM.tTheta=-0.7;CAM.tPhi=1.0;CAM.tR=15.5;CAM.tTarget.set(0,0,0);}
let pointers=new Map(),lastPinch=0,lastMid=null,lastTap=0,downPos=null,movedFar=false;
function panCamera(dx,dy){
  if(!CAM)return;
  const sp=CAM.r*0.0017;
  const s=Math.sin(CAM.theta),co=Math.cos(CAM.theta);
  CAM.tTarget.x=clamp(CAM.tTarget.x+(-co*dx - s*dy)*sp,-6.2,6.2);
  CAM.tTarget.z=clamp(CAM.tTarget.z+(s*dx - co*dy)*sp,-6.2,6.2);
  CAM.tTarget.y=0;
}
function bindCameraControls(){
  const el=renderer.domElement;
  el.addEventListener('pointerdown',e=>{try{el.setPointerCapture(e.pointerId);}catch(err){}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});downPos={x:e.clientX,y:e.clientY};movedFar=false;Snd.ensure();});
  el.addEventListener('pointermove',e=>{
    if(pointers.has(e.pointerId)){
      const prev=pointers.get(e.pointerId);
      const dx=e.clientX-prev.x,dy=e.clientY-prev.y;
      if(pointers.size===1){
        if(Math.abs(dx)+Math.abs(dy)>4){movedFar=true;cineInterrupt();} // драг прерывает кино-камеру
        const pan=e.shiftKey||((e.buttons&2)!==0);
        if(pan){panCamera(dx,dy);}
        else{CAM.tTheta-=dx*0.005;CAM.tPhi=clamp(CAM.tPhi+dy*0.004,0.42,1.35);}
        lastMid=null;
      }
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pointers.size===2){
        if(Math.abs(dx)+Math.abs(dy)>2){movedFar=true;cineInterrupt();}
        const pts=[...pointers.values()];
        const d=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
        const mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
        if(lastPinch>0&&d>0){CAM.tR=clamp(CAM.tR*lastPinch/d,9,27);}
        if(lastMid){panCamera(mid.x-lastMid.x,mid.y-lastMid.y);}
        lastPinch=d;lastMid=mid;
      }
    }else if(e.pointerType==='mouse'){
      hoverPick(e.clientX,e.clientY);
    }
  });
  const up=e=>{
    pointers.delete(e.pointerId);
    if(pointers.size<2){lastPinch=0;lastMid=null;}
    if(e.button===2){downPos=null;return;}
    if(!movedFar&&downPos){
      const now=performance.now();
      if(now-lastTap<300){camReset();cineInterrupt();lastTap=0;}
      else{lastTap=now;tapPick(e.clientX,e.clientY);}
    }
    downPos=null;
  };
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
  el.addEventListener('wheel',e=>{e.preventDefault();cineInterrupt();CAM.tR=clamp(CAM.tR*(1+e.deltaY*0.0012),9,27);},{passive:false});
  el.addEventListener('contextmenu',e=>e.preventDefault());
}
function rayFromScreen(x,y){
  const nd=new THREE.Vector2(x/innerWidth*2-1,-(y/innerHeight)*2+1);
  raycaster.setFromCamera(nd,camera);
  return raycaster.intersectObjects(tilePlanes,false);
}
function hoverPick(x,y){
  if(!G||!$('#hud').classList.contains('show'))return;
  let idx=-1;
  try{const hits=rayFromScreen(x,y);if(hits.length)idx=hits[0].object.userData.idx;}catch(e){}
  if(idx!==hoveredIdx){
    if(hoveredIdx>=0&&hlMeshes[hoveredIdx])hlMeshes[hoveredIdx].material.opacity=0;
    hoveredIdx=idx;
    if(idx>=0&&hlMeshes[idx])hlMeshes[idx].material.opacity=0.3;
  }
  const tip=$('#tip');
  if(idx>=0){
    tip.style.display='block';tip.style.left=(x+14)+'px';tip.style.top=(y+14)+'px';
    const c=CELLS[idx];const own=G.owner[idx]>=0?(' · '+esc(G.players[G.owner[idx]].name)):'';
    tip.innerHTML=esc(c.name)+(c.price!=null?' · '+fmt(c.price):'')+own;
    renderer.domElement.style.cursor='pointer';
  }else{tip.style.display='none';renderer.domElement.style.cursor='grab';}
}
function tapPick(x,y){
  if(!G||!$('#hud').classList.contains('show'))return;
  try{const hits=rayFromScreen(x,y);if(hits.length)openCellInfo(hits[0].object.userData.idx);}catch(e){}
}
let lastT=performance.now(),fpsAcc=0,menuSpin=true;
function loop(){
  requestAnimationFrame(loop);
  if(!scene||!renderer)return;
  const now=performance.now();let dt=Math.min(0.05,(now-lastT)/1000);lastT=now;
  if(SETS.fpsLock){fpsAcc+=dt;if(fpsAcc<1/30)return;dt=fpsAcc;fpsAcc=0;}
  if(menuSpin&&CAM)CAM.tTheta+=dt*0.12;
  for(let i=tweenList.length-1;i>=0;i--){try{if(tweenList[i](dt))tweenList.splice(i,1);}catch(e){tweenList.splice(i,1);}}
  pUpdate(dt);       // частицы
  fxBoomSparkle(dt); // блики «Бума»
  if(CAM){
    if(CineCam.mode==='rentFlight'&&CineCam.curve){
      // Фича 1: облёт по сплайну при оплате ренты
      CineCam.t+=dt/CineCam.dur;
      const kk=clamp(CineCam.t,0,1);
      camera.position.copy(CineCam.curve.getPoint(kk));
      camera.lookAt(CineCam.look);
      CAM.target.copy(CineCam.look);CAM.tTarget.copy(CineCam.look);
      if(kk>=1){syncCamFromPosition();CineCam.mode='manual';CineCam.curve=null;}
    }else{
      const damp=1-Math.exp(-9*dt);
      CAM.theta=lerp(CAM.theta,CAM.tTheta,damp);CAM.phi=lerp(CAM.phi,CAM.tPhi,damp);CAM.r=lerp(CAM.r,CAM.tR,damp);
      CAM.target.lerp(CAM.tTarget,1-Math.exp(-4*dt));
      const effR=CAM.r*(innerWidth<innerHeight?1.28:1);
      camera.position.set(
        CAM.target.x+effR*Math.sin(CAM.phi)*Math.sin(CAM.theta),
        CAM.target.y+effR*Math.cos(CAM.phi),
        CAM.target.z+effR*Math.sin(CAM.phi)*Math.cos(CAM.theta));
      camera.lookAt(CAM.target);
    }
    // Фича 1: screen-shake при банкротстве (поверх любой камеры)
    if(CineCam.shake>0){
      camera.position.x+=(Math.random()-0.5)*CineCam.shake;
      camera.position.y+=(Math.random()-0.5)*CineCam.shake;
      CineCam.shakeT-=dt;
      CineCam.shake=Math.max(0,CineCam.shake*(CineCam.shakeT>0?0.9:0));
      if(CineCam.shakeT<=0)CineCam.shake=0;
    }
  }
  renderer.render(scene,camera);
}
function focusToken(p){
  if(!CAM)return;
  if(!SETS.softFocus||!p||!p.mesh){CAM.tTarget.set(0,0,0);return;}
  const v=p.mesh.position;
  CAM.tTarget.set(v.x*0.38,0,v.z*0.38);
}
