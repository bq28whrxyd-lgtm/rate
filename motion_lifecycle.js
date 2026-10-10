/* Keep the original visible animation quality; release work belonging to hidden/removed UI. */
(function(){
  'use strict';
  const nodes=new Map();let pending=0,suspended=false;
  const visible=n=>{if(document.hidden||suspended)return false;const r=n.getClientRects()[0];
    return !!r&&(io||(r.bottom>-60&&r.top<innerHeight+60&&r.right>-60&&r.left<innerWidth+60))&&
      getComputedStyle(n).visibility!=='hidden'&&
      !(n.closest('main')&&(document.body.classList.contains('ovl')||document.body.classList.contains('tcgon')));};
  function flush(){pending=0;for(const [n,r] of nodes){
    /* a node built before it is put on the page (battle intros, cheers) waits for it; it is released only once it has been on the page and left again */
    if(!n.isConnected){if(!r.seen&&Date.now()-r.t0<20000)continue;if(r.active)r.stop();r.active=false;r.dispose&&r.dispose();io&&io.unobserve(n);nodes.delete(n);continue}
    r.seen=true;
    const on=r.near&&visible(n);if(on===r.active)continue;r.active=on;(on?r.start:r.stop)();
  }}
  function schedule(){if(!pending&&nodes.size)pending=requestAnimationFrame(flush)}
  const io='IntersectionObserver'in window?new IntersectionObserver(es=>{for(const e of es){const r=nodes.get(e.target);if(r)r.near=e.isIntersecting}schedule()},{rootMargin:'60px'}):null;
  function track(n,h){nodes.set(n,{...h,near:!io,active:false,seen:false,t0:Date.now()});if(io)io.observe(n);schedule();return n}
  function video(v){v.autoplay=false;return track(v,{
    start:()=>{if(!v.getAttribute('src')&&v.dataset.src)v.src=v.dataset.src;play(v)},
    stop:()=>v.pause(),dispose:()=>{v.pause();v.removeAttribute('src');v.load()}
  })}
  function play(v){try{const p=v.play();if(p&&p.catch)p.catch(()=>{})}catch(e){}}
  function retry(){for(const [n,r]of nodes)if(r.active){if(n.tagName==='VIDEO'&&n.paused)play(n);else if(r.retry)r.retry()}}
  function init(){new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
    new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});}
  if(document.body)init();else document.addEventListener('DOMContentLoaded',init,{once:true});
  document.addEventListener('visibilitychange',flush);
  window.addEventListener('pagehide',()=>{suspended=true;flush()});window.addEventListener('pageshow',()=>{suspended=false;schedule()});
  window.addEventListener('resize',schedule,{passive:true});
  if(!io)window.addEventListener('scroll',schedule,{passive:true});
  document.addEventListener('touchend',retry,{passive:true});document.addEventListener('click',retry,{passive:true});
  window.MotionLifecycle={track,video,refresh:schedule,stats:()=>({tracked:nodes.size,active:[...nodes.values()].filter(r=>r.active).length})};
})();
