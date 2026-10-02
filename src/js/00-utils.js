'use strict';
/* ===================================================================
   БИЗНЕС-СИТИ — 3D Монополия (single-file)
   Расширение: Кино-камера, Частицы, Аналитика, Звук+Амбиент, Биржа,
   Карьера, ИИ(Агрессия+Память). Все новые системы аддитивны.
   =================================================================== */
const store={
  get(k){try{return localStorage.getItem(k);}catch(e){return null;}},
  set(k,v){try{localStorage.setItem(k,v);}catch(e){}},
  del(k){try{localStorage.removeItem(k);}catch(e){}}
};
function showFatal(msg){
  const l=document.getElementById('loading');if(l)l.style.display='none';
  document.getElementById('fatal-msg').innerHTML=msg;
  document.getElementById('fatal').style.display='flex';
}
window.addEventListener('error',e=>{
  if(!window.__BOOTED)showFatal('Ошибка при запуске:<br><code style="color:#F2C500">'+(e.message||'неизвестно')+'</code>');
});
