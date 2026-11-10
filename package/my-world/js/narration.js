(function(){
 'use strict';if(window.BlizzardNarration)return;
 const audio=document.createElement('audio');audio.preload='auto';audio.dataset.narration='true';document.body.append(audio);
 const abort=new AbortController();let frame=null,started=false,ended=false,playingBefore=false,alive=true,voiceVolume=.9,hiddenResume=false,failures=0;
 try{const saved=JSON.parse(localStorage.getItem('blizzard_narration_v1')||'null');if(saved&&Number.isFinite(saved.volume))voiceVolume=Math.max(0,Math.min(1,saved.volume))}catch{}
 const label=document.createElement('label');label.innerHTML='旁白 <input type="range" min="0" max="100" step="1" aria-label="旁白音量">';document.querySelector('.bgm-settings')?.append(label);
 label.querySelector('input').value=Math.round(voiceVolume*100);label.querySelector('input').oninput=e=>{voiceVolume=Number(e.target.value)/100;try{localStorage.setItem('blizzard_narration_v1',JSON.stringify({volume:voiceVolume}))}catch{}refresh()};
 function controller(){return typeof caseController!=='undefined'?caseController:(typeof previewController!=='undefined'?previewController:null)}
 function refresh(){if(!alive)return;audio.volume=BlizzardAtmosphere.inspect().muted?0:voiceVolume;BlizzardAtmosphere.setNarrationActive(!audio.paused&&!audio.ended&&audio.volume>0)}
 function pause(){audio.pause();refresh()}
 function stop(){pause();audio.removeAttribute('src');audio.load();frame=null;started=false;ended=false;playingBefore=false}
 function play(restart=false){
  if(!alive||!frame||!BlizzardAtmosphere.inspect().unlocked)return;
  if(restart){audio.currentTime=0;ended=false}started=true;
  const requested=frame;audio.play().then(refresh).catch(error=>{if(frame!==requested)return;started=false;if(error.name!=='AbortError')failures++;refresh()});
 }
 function sync(){
  if(!alive)return;
  const cc=controller();if(!cc?.alive){if(frame)stop();return}
  const s=cc.s,puzzle=s.mode==='puzzle',id=puzzle?'p'+s.page:'a'+s.playIndex,clip=window.BlizzardVoiceData[id];
  if(!clip)return;
  const changed=!frame||frame.controller!==cc||frame.id!==id;
  if(changed){pause();frame={id,controller:cc};audio.src=clip.path;audio.load();started=false;ended=false;playingBefore=false}
  const caption=cc.host.querySelector('.cc-thought');if(caption)caption.textContent=clip.text;
  if(puzzle){if(!started)play()}
  else if(s.mode==='replay'){
   if(s.playing&&!ended&&audio.paused)play();
   if(!s.playing&&playingBefore)pause();
  }else if(s.mode==='complete')pause();
  playingBefore=!!s.playing;refresh();
 }
 audio.addEventListener('play',refresh,{signal:abort.signal});audio.addEventListener('pause',refresh,{signal:abort.signal});audio.addEventListener('ended',()=>{ended=true;refresh()},{signal:abort.signal});audio.addEventListener('error',()=>{failures++;refresh()},{signal:abort.signal});
 document.addEventListener('click',e=>{if(e.target.closest?.('[data-action=narrate]'))play(true);else sync()},{signal:abort.signal});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){hiddenResume=!audio.paused;pause()}else{const cc=controller();if(hiddenResume&&cc?.s.mode==='puzzle')play();hiddenResume=false}},{signal:abort.signal});
 if(window.CaseComic?.Controller){const draw=CaseComic.Controller.prototype.draw,destroy=CaseComic.Controller.prototype.destroy;CaseComic.Controller.prototype.draw=function(){draw.call(this);sync()};CaseComic.Controller.prototype.destroy=function(){if(frame?.controller===this)stop();destroy.call(this)}}
 if(typeof render==='function'){const base=render;render=function(){base();sync()}}
 if(typeof renderReconstruction==='function'){const base=renderReconstruction;renderReconstruction=function(){base();sync()}}
 function destroy(){if(!alive)return;stop();alive=false;abort.abort();label.remove();audio.remove()}
 window.addEventListener('pagehide',destroy,{once:true,signal:abort.signal});
 window.BlizzardNarration={sync,refresh,destroy,replay:()=>play(true),inspect:()=>({id:frame?.id||null,paused:audio.paused,ended:audio.ended,currentTime:audio.currentTime,duration:Number.isFinite(audio.duration)?audio.duration:0,volume:audio.volume,failures,src:audio.currentSrc})};
 queueMicrotask(sync);
})();
