
(function(){
  'use strict';
  var gameRoot=document.getElementById('app');
  var comicRoot=document.getElementById('case-preview');
  var controller=null;
  function destroyController(){
    if(controller){ controller.destroy(); controller=null; }
  }
  function openComic(){
    if(!window.__WXB || window.__WXB.state().phase!=='ending')return;
    destroyController();
    gameRoot.style.display='none';
    comicRoot.style.display='block';
    controller=window.BlizzardComic.mount(comicRoot,finishComic);
    window.scrollTo(0,0);
  }
  function finishComic(){
    controller=null;  // Original controller already destroyed itself on finish.
    comicRoot.innerHTML='<section class="cc-root merged-final" aria-label="案件终章">'+
      '<header class="cc-top"><div><span class="cc-eyebrow">CASE CLOSED / 终局</span><h1>炉灰中的第九人</h1></div><span class="cc-page-count">FIN</span></header>'+
      '<main class="cc-stage"><div class="merged-final-content"><div class="cc-eyebrow">真相已经重现</div><h2>雪停之后</h2>'+
      '<p>陆衡的行踪终于连成完整的时间线。<br>有些真相埋在灰烬里，有些门却从未出现在地图上。</p>'+
      '<p>案件已结 · 继承道具：陌生黄铜钥匙<br>下一章：镜像图书馆</p>'+
      '<nav class="cc-actions"><button class="cc-button" id="merged-replay">重新推演</button>'+ 
      '<button class="cc-button" id="merged-restart">重玩案件</button>'+ 
      '<button class="cc-button primary" id="merged-handoff">保存交接 · 继续旅程 →</button></nav></div></main>'+
      '<footer class="cc-bottom"><div class="cc-thought">八个片段落定，北岭山庄迎来了天亮。</div></footer></section>';
    document.getElementById('merged-replay').onclick=openComic;
    document.getElementById('merged-restart').onclick=restart;
    document.getElementById('merged-handoff').onclick=function(){
      // Use the untouched original V4.0 world-line protocol and its end card.
      if(typeof finishLevel==='function')finishLevel();
    };
    window.scrollTo(0,0);
  }
  function restart(){
    destroyController();
    comicRoot.innerHTML='';
    comicRoot.style.display='none';
    gameRoot.style.display='';
    if(typeof reset==='function')reset();
    window.scrollTo(0,0);
  }
  window.BlizzardMerged={openComic:openComic,restart:restart,finishComic:finishComic};
})();
