/* Original score: all notes, envelopes and procedural textures authored for this project.
   No recordings, samples, imported melodies or third-party sound assets. */
(function(){
 'use strict';if(window.BlizzardAtmosphere)return;
 const cues={
  resolution:{bpm:62,root:48,notes:[],chords:[[0,7,16],[5,12,19],[7,14,21],[0,7,16]],tone:2600},
  snow:{bpm:52,root:45,notes:[12,null,19,14,null,15,10,null],chords:[[0,7,14],[0,5,10],[3,10,17],[0,7,14]],air:.018,tone:1100},
  memory:{bpm:56,root:45,notes:[15,14,null,10,12,null,7,null],chords:[[0,7,15],[3,10,17],[5,12,19],[0,7,14]],air:.01,tone:1500},
  hearth:{bpm:58,root:48,notes:[12,null,16,19,null,14,12,null],chords:[[0,7,14],[5,12,16],[3,10,17],[0,7,16]],air:.005,tone:1800},
  study:{bpm:50,root:43,notes:[12,null,13,null,7,null,10,null],chords:[[0,7,13],[0,3,10],[1,8,15],[0,7,13]],air:.008,tone:900},
  electric:{bpm:66,root:42,notes:[12,null,19,null,13,null,7,null],chords:[[0,7,13],[0,5,12],[1,8,14],[0,7,12]],air:.012,tone:1000},
  passage:{bpm:48,root:45,notes:[19,null,null,14,13,null,7,null],chords:[[0,7,14],[1,8,15],[0,5,12],[0,7,14]],air:.022,tone:950},
  kitchen:{bpm:56,root:48,notes:[12,null,17,16,null,14,null,7],chords:[[0,7,14],[5,12,19],[3,10,17],[0,7,14]],air:.004,tone:1700},
  corridor:{bpm:54,root:44,notes:[12,null,19,null,14,null,13,null],chords:[[0,7,14],[0,3,10],[1,8,15],[0,7,14]],air:.014,tone:1100},
  foyer:{bpm:52,root:45,notes:[12,null,7,null,14,19,null,null],chords:[[0,7,14],[5,12,19],[3,10,17],[0,7,14]],air:.024,tone:1300},
  dialogue:{bpm:54,root:45,notes:[12,null,null,14,null,null,7,null],chords:[[0,7,14],[3,10,17],[5,12,19],[0,7,14]],air:.003,tone:1200},
  reason:{bpm:72,root:45,notes:[12,7,null,14,15,null,19,10],chords:[[0,7,14],[3,10,17],[5,12,19],[0,7,15]],air:0,tone:1800,pulse:true},
  confront:{bpm:78,root:43,notes:[12,null,13,7,null,10,15,null],chords:[[0,7,13],[1,8,15],[0,3,10],[0,7,14]],air:.006,tone:1300,pulse:true},
  puzzle:{bpm:94,root:50,notes:[12,null,19,14,null,10,15,null],chords:[[0,7,14],[3,10,17],[5,12,19],[0,7,14]],air:.004,tone:1600,pulse:true},
  album:{bpm:70,root:48,notes:[12,19,null,15,14,null,10,12],chords:[[0,7,15],[5,12,19],[3,10,17],[0,7,14]],air:.006,tone:2100},
  dawn:{bpm:60,root:48,notes:[12,null,19,16,null,14,21,null],chords:[[0,7,16],[5,12,19],[7,14,21],[0,7,16]],air:.003,tone:2400}
 };
 let ctx,master,compressor,analyser,session=null,key='',timer,unlocked=false,dead=false,muted=false,volume=.7,scheduled=0,sessionSerial=0,weatherVolume=.8,weatherTarget=0,weather=null,effectsVolume=.75,effectsBus,musicMeter,weatherMeter,effectsMeter,fxSerial=0,lastFx=null,buttonSerial=0,lastButton=null,lastResult=null,resultSerial=0,narrationActive=false; 
 const abort=new AbortController(),retiring=new Set(),fxNodes=new Set(),resultTasks=new Set();
 try{const raw=JSON.parse(localStorage.getItem('blizzard_audio_v2')||'null');if(raw){volume=Math.max(0,Math.min(1,Number(raw.volume)||0));muted=!!raw.muted;if(Number.isFinite(raw.effectsVolume))effectsVolume=Math.max(0,Math.min(1,raw.effectsVolume));if(Number.isFinite(raw.weatherVolume))weatherVolume=Math.max(0,Math.min(1,raw.weatherVolume))}}catch{}
 const hz=n=>440*Math.pow(2,(n-69)/12);
 function musicLevel(){return volume*3.8*(narrationActive?.26:1)}
 function setNarrationActive(value){if(dead)return;narrationActive=!!value;if(session){session.gain.gain.cancelScheduledValues(ctx.currentTime);session.gain.gain.setTargetAtTime(musicLevel(),ctx.currentTime,.12)}setWeather()}
 function makeGraph(){
  ctx=new(window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=muted?0:1;
  compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-12;compressor.ratio.value=3;compressor.knee.value=18;compressor.attack.value=.008;compressor.release.value=.25;
  master.connect(compressor);analyser=ctx.createAnalyser();analyser.fftSize=2048;compressor.connect(analyser);analyser.connect(ctx.destination);musicMeter=ctx.createAnalyser();weatherMeter=ctx.createAnalyser();effectsMeter=ctx.createAnalyser();for(const m of [musicMeter,weatherMeter,effectsMeter]){m.fftSize=2048;m.connect(master)}effectsBus=ctx.createGain();effectsBus.gain.value=effectsVolume;effectsBus.connect(effectsMeter);makeWeather();
 }
 function target(){if(!ctx)return;master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setTargetAtTime(muted?0:1,ctx.currentTime,.12);if(session)session.gain.gain.setTargetAtTime(musicLevel(),ctx.currentTime,.18);setWeather();if(effectsBus)effectsBus.gain.setTargetAtTime(effectsVolume,ctx.currentTime,.04);window.BlizzardNarration?.refresh()}
 function persist(){try{localStorage.setItem('blizzard_audio_v2',JSON.stringify({volume,muted,weatherVolume,effectsVolume}))}catch{}}
 function voice(s,n,start,length,gain,type='sine'){
  if(s.disposed)return;
  const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=hz(n);
  g.gain.setValueAtTime(.00001,start);g.gain.linearRampToValueAtTime(gain,start+Math.min(.28,length*.2));g.gain.exponentialRampToValueAtTime(.00001,start+length);
  o.connect(g);g.connect(s.filter);s.nodes.add(o);o.onended=()=>{s.nodes.delete(o);o.disconnect();g.disconnect()};o.start(start);o.stop(start+length+.03);scheduled++;
 }
 function stop(s){if(!s||s.disposed)return;s.disposed=true;clearTimeout(s.cleanup);retiring.delete(s);for(const n of s.nodes){try{n.stop()}catch{}n.disconnect()}s.nodes.clear();s.filter.disconnect();s.gain.disconnect();s.delay.disconnect();s.echo.disconnect()}
 function newSession(id){
  const q=cues[id],s={id,serial:++sessionSerial,q,step:0,next:ctx.currentTime+.08,nodes:new Set(),disposed:false};
  s.gain=ctx.createGain();s.gain.gain.setValueAtTime(0,ctx.currentTime);s.gain.gain.linearRampToValueAtTime(musicLevel(),ctx.currentTime+1.4);
  s.filter=ctx.createBiquadFilter();s.filter.type='lowpass';s.filter.frequency.value=q.tone;
  s.delay=ctx.createDelay(1);s.delay.delayTime.value=.29;s.echo=ctx.createGain();s.echo.gain.value=.16;
  s.filter.connect(s.gain);s.filter.connect(s.delay);s.delay.connect(s.echo);s.echo.connect(s.gain);s.gain.connect(musicMeter);
  return s;
 }
 function change(id){
  if(id===key&&session)return;key=id;if(!ctx||ctx.state!=='running')return;
  if(session){const old=session;old.gain.gain.cancelScheduledValues(ctx.currentTime);old.gain.gain.setTargetAtTime(0,ctx.currentTime,.4);retiring.add(old);old.cleanup=setTimeout(()=>stop(old),1800)}
  session=newSession(id);
 }
 function tick(){
  if(!session||!ctx||ctx.state!=='running'||document.hidden)return;
  const s=session,q=s.q,beat=60/q.bpm;if(s.next<ctx.currentTime)s.next=ctx.currentTime+.06;
  while(s.next<ctx.currentTime+.25){
   const i=s.step%8,bar=Math.floor(s.step/8)%4,t=s.next;
   if(s.id==='puzzle'){
    const riffs=[[19,12,14,null,22,19,15,14],[12,7,10,14,15,14,12,null],[19,22,26,22,19,17,15,14],[12,null,7,10,14,null,12,null]];
    const note=riffs[bar][i],lift=[.8,1,1.15,.72][bar];
    if(i===0)for(const n of [[0,3,7,14],[5,12,15,19],[3,10,17,22],[7,14,17,20]][bar])voice(s,q.root+n-12,t,beat*6,.025*lift);
    if(note!==null){voice(s,q.root+note,t,beat*.58,.078*lift,'triangle');voice(s,q.root+note+12,t,beat*.35,.013)}
    if(i%2===0)voice(s,q.root-12,t,.095,.065,'triangle');
    if(i===3||i===7)voice(s,q.root+24,t,.055,.022,'triangle');
   }else if(s.id==='album'||s.id==='resolution'){
    const resolved=s.id==='resolution'||(typeof caseController!=='undefined'&&caseController?.s.playIndex>=6)||(typeof previewController!=='undefined'&&previewController?.s.playIndex>=6);
    const chords=resolved?[[0,7,16,19],[5,12,19,24],[7,14,21,26],[0,7,16,24]]:[[0,7,15,19],[5,12,19,22],[3,10,17,22],[7,14,17,23]];
    const themes=[[7,null,12,15,19,null,14,12],[null,19,22,19,17,null,15,14],[24,22,19,null,17,19,15,null],[14,null,12,7,null,null,12,null]];
    let note=themes[bar][i];if(resolved&&note===15)note=16;
    const lift=[.8,.95,1.18,.7][bar];
    if(i===0)for(const n of chords[bar]){voice(s,q.root+n-12,t,beat*7.9,.032*lift);voice(s,q.root+n,t,beat*6.5,.007*lift,'triangle')}
    if(note!==null){voice(s,q.root+note,t,beat*2.6,.07*lift);voice(s,q.root+note+12,t,beat*1.2,.009*lift)}
    if(i%2===1&&s.id!=='resolution')voice(s,q.root+chords[bar][i%4],t,beat*1.3,.021,'triangle');
   }else{
   const lift=[.72,.94,1.22,.68][bar];
   if(i===0)for(const n of q.chords[bar])voice(s,q.root+n-12,t,beat*7.5,.034*lift,'sine');
   // The same original "question / answer" motif returns in scene-specific harmony.
   const motif=[[12,null,19,15,14,null,10,12],[null,12,14,null,19,17,15,null],[19,22,19,15,14,null,12,10],[12,null,null,7,null,10,12,null]];
   let note=motif[bar][i];
   if(s.id==='dawn'&&note===15)note=16;
   if(s.id==='confront'&&note===14)note=13;
   if(note!==null){voice(s,q.root+note,t,beat*(bar===3?2.8:1.65),.065*lift);voice(s,q.root+note+12,t,beat*.95,.013*lift,'triangle')}
   if((q.pulse||bar===2)&&i%2===0)voice(s,q.root-12,t,beat*.65,.035*lift,'triangle');
   if(bar===2&&i%2===1)voice(s,q.root+q.chords[bar][i%3],t,beat*.75,.022,'triangle');
   }
   s.step++;s.next+=beat;
  }
 }
 function makeWeather(){
  const buffer=ctx.createBuffer(1,ctx.sampleRate*12,ctx.sampleRate),a=buffer.getChannelData(0);let seed=48176,last=0;
  for(let i=0;i<a.length;i++){seed=(seed*1664525+1013904223)>>>0;last=(last+(seed/4294967296*2-1)*.055)/1.055;a[i]=last*3.2}
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gust=ctx.createGain(),lfo=ctx.createOscillator(),depth=ctx.createGain(),gain=ctx.createGain();
  source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=1700;
  gust.gain.value=.72;lfo.frequency.value=.075;depth.gain.value=.25;gain.gain.value=0;
  source.connect(filter);filter.connect(gust);gust.connect(gain);gain.connect(weatherMeter);lfo.connect(depth);depth.connect(gust.gain);
  source.start();lfo.start();weather={source,filter,gust,lfo,depth,gain};setWeather();
 }
 function setWeather(){if(weather)weather.gain.gain.setTargetAtTime(weatherVolume*weatherTarget*1.35*(narrationActive?.48:1),ctx.currentTime,.85)}
 function weatherFor(){
  const st=typeof state!=='undefined'?state:null;
  if(!st)return .18;
  if(st.phase==='title')return .4;
  if(st.phase==='story')return st.storyPage===0?.34:.22;
  if(st.phase==='ending')return .08;
  if(st.phase==='game')return {foyer:.4,passage:.34,corridor:.2,study:.14,lounge:.13,kitchen:.08,electrical:.15}[st.room]||.18;
  return .14;
 }
 // Material foley and interface confirmation share the mixer, not the music session.
 const materials={cuff:'metal',poker:'metal',ledger:'paper',burn:'paper',switch:'mechanical',coat:'cloth',soot:'trace',inheritance:'paper',repair:'paper',phone:'paper',fiber:'cloth'};
 function effectNode(source,gain,filter,start,length,level){
  if(fxNodes.size>=32){const first=fxNodes.values().next().value;try{first.stop()}catch{}}
  gain.gain.setValueAtTime(.00001,start);gain.gain.linearRampToValueAtTime(level,start+.004);gain.gain.exponentialRampToValueAtTime(.00001,start+length);
  source.connect(filter);filter.connect(gain);gain.connect(effectsBus);fxNodes.add(source);
  source.onended=()=>{fxNodes.delete(source);source.disconnect();filter.disconnect();gain.disconnect()};source.start(start);source.stop(start+length+.015);
 }
 function hitNoise(freq,length,level,offset=0){
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*length),ctx.sampleRate),a=buffer.getChannelData(0);let seed=7741+fxSerial*177;
  for(let i=0;i<a.length;i++){seed=(seed*1664525+1013904223)>>>0;a[i]=seed/2147483648-1}
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter();source.buffer=buffer;filter.type='bandpass';filter.frequency.value=freq;filter.Q.value=.7;
  effectNode(source,ctx.createGain(),filter,ctx.currentTime+.008+offset,length,level);
 }
 function hitTone(freq,length,level,offset=0,type='sine'){
  const o=ctx.createOscillator(),f=ctx.createBiquadFilter();o.type=type;o.frequency.value=freq;f.frequency.value=5000;
  effectNode(o,ctx.createGain(),f,ctx.currentTime+.008+offset,length,level);
 }
 function playEvidence(id,kind='review'){
  if(dead||!ctx||ctx.state!=='running')return false;
  const now=performance.now();if(lastFx&&lastFx.id===id&&lastFx.kind===kind&&now-lastFx.at<100)return false;
  const material=materials[id]||'trace',acquired=kind==='acquire',v=(acquired?1:.72)*2.2;fxSerial++;lastFx={id,kind,material,at:now,serial:fxSerial};
  if(material==='metal'){hitNoise(2300,.07,.14*v);for(const [f,g] of [[620,.12],[1463,.065],[2477,.03]])hitTone(f,.34,g*v)}
  if(material==='paper'){hitNoise(1900,.15,.23*v);hitNoise(3200,.09,.12*v,.055);hitTone(160,.05,.03*v)}
  if(material==='cloth'){hitNoise(620,.24,.27*v);hitNoise(1100,.14,.12*v,.065)}
  if(material==='mechanical'){hitNoise(900,.065,.25*v);hitTone(105,.13,.17*v,0,'triangle');hitNoise(2700,.06,.16*v,.075)}
  if(material==='trace'){hitNoise(1400,.12,.13*v);hitTone(410,.08,.045*v)}
  if(acquired){hitTone(782,.15,.055,.14);hitTone(1044,.22,.04,.23)}
  return true;
 }
 function playButton(kind='tap'){
  if(dead||!ctx||ctx.state!=='running')return false;
  const now=performance.now();if(lastButton&&lastButton.kind===kind&&now-lastButton.at<70)return false;
  lastButton={kind,at:now,serial:++buttonSerial};
  if(kind==='confirm'){hitTone(587,.10,.095);hitTone(880,.14,.055,.045);hitNoise(1200,.045,.035)}
  else if(kind==='page'){hitNoise(1700,.10,.095);hitTone(360,.075,.045)}
  else if(kind==='close'){hitNoise(800,.06,.055);hitTone(260,.07,.05)}
  else{hitTone(430+(buttonSerial%3)*12,.075,.075);hitNoise(1250,.05,.055)}
  return true;
 }
 function playFeedback(kind){if(dead||!ctx||ctx.state!=='running')return;hitTone(kind==='reject'?155:kind==='page'?510:340,.15,.08,0,'sine')}


 // Result feedback is owned by the real rule outcome, never a guessed button label.
 function semantic(kind){
  if(dead||!ctx||ctx.state!=='running')return false;
  const now=performance.now();if(lastResult&&lastResult.kind===kind&&now-lastResult.at<140)return false;
  const failed=['blocked','invalid','duplicate','wrong'].includes(kind);
  const repeated=failed&&lastResult&&['blocked','invalid','duplicate','wrong'].includes(lastResult.kind)&&now-lastResult.at<2200;
  const v=repeated?.65:1;lastResult={kind,at:now,serial:++resultSerial};
  if(kind==='reveal'){hitTone(196,.35,.09);hitTone(392,.45,.07,.08);hitTone(587,.55,.055,.18)}
  else if(kind==='caseResolved'){hitTone(392,.4,.09);hitTone(659,.5,.075,.13);hitTone(784,.65,.06,.26)}
  else if(kind==='blocked'){hitTone(285,.12,.11*v);hitTone(215,.16,.09*v,.07);hitNoise(800,.05,.05*v)}
  else if(kind==='invalid'||kind==='wrong'){hitTone(246,.16,.12*v);hitTone(164,.20,.10*v,.085);hitNoise(600,.07,.05*v,.025)}
  else if(kind==='duplicate'){hitTone(300,.09,.085*v);hitTone(300,.09,.055*v,.10)}
  else if(kind==='connect'){hitNoise(1600,.06,.06);hitTone(440,.15,.10);hitTone(660,.20,.065,.055)}
  else if((kind==='milestone'||kind==='handoff')){hitTone(440,.19,.10);hitTone(660,.25,.085,.09);hitTone(880,.35,.065,.20)}
  else if(kind==='unlink'||kind==='clear'){hitNoise(1100,.10,.08);hitTone(330,.12,.075);hitTone(245,.12,.05,.055)}
  else if(kind==='recorded'){hitNoise(2100,.12,.08);hitTone(523,.20,.075,.055)}
  else if(kind==='accuseCorrect'){hitTone(392,.19,.11);hitTone(587,.25,.08,.08)}
  else if(kind==='hint'){hitNoise(1800,.12,.075);hitTone(392,.13,.065)}
  else if(kind==='empty'){hitTone(260,.10,.065)}
  else if(kind==='dialogue'){hitNoise(950,.06,.055);hitTone(360,.12,.07)}
  return true;
 }
 if(window.WL?.completeLevel){const original=WL.completeLevel;WL.completeLevel=function(...args){const result=original.apply(this,args);semantic(result?'handoff':'blocked');return result}}
 if(typeof openDialog==='function'){
  const original=openDialog;openDialog=function(n){const allowed=needs(n);original(n);semantic(allowed?'dialogue':'blocked')};
 }
 if(typeof goBoard==='function'){
  const original=goBoard;goBoard=function(){const allowed=state.found.length>=3;original();if(!allowed)semantic('blocked')};
 }
 if(typeof nextDialog==='function'){
  const original=nextDialog;nextDialog=function(){const n=state.testimonies.length;original();if(state.testimonies.length>n)semantic('recorded')};
 }
 if(typeof linkNodes==='function'){
  const original=linkNodes;linkNodes=function(a,b){
   const beforeReady=graphReady(),key=edgeKey(a,b),existed=!!state.graphLinks?.[key];original(a,b);
   if(!a||!b||a===b){semantic('invalid');return}
   if(existed){semantic('duplicate');return}
   if(!state.graphLinks?.[key]){semantic('invalid');return}
   semantic(!beforeReady&&graphReady()?'milestone':'connect');
  };
 }
 // Capture the element before a re-render; inspect the result after its handler finishes.
 document.addEventListener('click',e=>{
  const node=e.target.closest?.('[data-unlink],[data-act=graphClear]');
  if(node){
   const removed=node.hasAttribute('data-unlink')?!!state.graphLinks?.[node.dataset.unlink]:Object.keys(state.graphLinks||{}).length>0;
   const kind=node.hasAttribute('data-unlink')?'unlink':removed?'clear':'empty';
   const key=node.dataset.unlink;const t=setTimeout(()=>{resultTasks.delete(t);if(dead)return;const completed=kind==='unlink'?removed&&!state.graphLinks?.[key]:Object.keys(state.graphLinks||{}).length===0;if(completed)semantic(kind)},0);resultTasks.add(t);
  }
 },{capture:true,signal:abort.signal});
 document.addEventListener('click',e=>{
  const b=e.target.closest?.('button');if(!b||b.disabled)return;
  if(b.hasAttribute('data-accuse')){const correct=state.dialog?.done==='ending'&&typeof OUTRO!=='undefined'&&state.dialog.lines===OUTRO;semantic(correct?'accuseCorrect':'wrong')}
  else if(b.dataset.act==='graphHint')semantic('hint');
 },{signal:abort.signal});



 function select(){
  const st=typeof state!=='undefined'?state:null,cc=typeof caseController!=='undefined'?caseController:(typeof previewController!=='undefined'?previewController:null);
  if(cc?.alive){if(cc.s.mode==='puzzle')return {cue:'puzzle',mood:'reason'};return {cue:cc.s.mode==='complete'?'resolution':'album',mood:'recall'}}
  if(!st)return {cue:'snow',mood:'cold'};if(st.phase==='reconstruction')return {cue:'puzzle',mood:'reason'};
  if(st.phase==='ending')return {cue:'dawn',mood:'warm'};
  if(st.phase==='accuse')return {cue:'confront',mood:'tense'};
  if(st.phase==='board')return {cue:'reason',mood:'reason'};
  if(st.phase==='story')return {cue:st.storyPage>=2?'study':'memory',mood:st.storyPage>=2?'cold':'memory'};
  if(st.phase==='game'){
   const rooms={lounge:'hearth',study:'study',electrical:'electric',passage:'passage',kitchen:'kitchen',corridor:'corridor',foyer:'foyer'},cue=rooms[st.room]||'snow';
   return {cue,mood:['hearth','kitchen'].includes(cue)?'hearth':'cold'};
  }
  return {cue:'snow',mood:'cold'};
 }
 const panel=document.createElement('details');panel.className='bgm-control';panel.innerHTML='<summary aria-label="音乐与风雪设置">♫ 音景</summary><div class="bgm-settings"><button type="button" data-music-toggle aria-pressed="false">开启配乐</button><label>BGM <input type="range" min="0" max="100" step="1" aria-label="配乐音量"></label><label>环境 <input type="range" min="0" max="100" step="1" aria-label="风雪音量"></label><label>音效 <input type="range" min="0" max="100" step="1" aria-label="证物音效音量"></label><span data-music-status role="status">点击后开启</span></div>';document.body.append(panel);
 function ui(){panel.querySelector('button').textContent=muted?'开启音景':'关闭音景';panel.querySelector('button').setAttribute('aria-pressed',String(!muted));panel.querySelector('input').value=Math.round(volume*100);panel.querySelector('[aria-label=风雪音量]').value=Math.round(weatherVolume*100);panel.querySelector('[aria-label=证物音效音量]').value=Math.round(effectsVolume*100);panel.querySelector('[data-music-status]').textContent=!unlocked?'点击后开启':!ctx?'浏览器不支持配乐':ctx.state!=='running'?'配乐已暂停':muted||(volume===0&&weatherVolume===0&&effectsVolume===0)?'已静音':'原创 BGM · 环境 · 拟音'}
 async function unlock(){
  if(dead||unlocked)return;unlocked=true;
  try{if(!ctx)makeGraph();await ctx.resume();key='';sync();tick()}catch{panel.querySelector('[aria-label=证物音效音量]').value=Math.round(effectsVolume*100);panel.querySelector('[data-music-status]').textContent='配乐暂不可用'}ui();
 }
 function sync(){if(dead)return;const selected=select();document.body.dataset.mood=selected.mood;change(selected.cue);weatherTarget=weatherFor();setWeather();ui()}
 panel.querySelector('button').addEventListener('click',async()=>{await unlock();muted=!muted;persist();target();ui()},{signal:abort.signal});
 panel.querySelector('input').addEventListener('input',e=>{volume=Number(e.target.value)/100;persist();target();ui()},{signal:abort.signal});
 panel.querySelector('[aria-label=风雪音量]').addEventListener('input',e=>{weatherVolume=Number(e.target.value)/100;persist();setWeather();ui()},{signal:abort.signal});
 panel.querySelector('[aria-label=证物音效音量]').addEventListener('input',e=>{effectsVolume=Number(e.target.value)/100;persist();target();ui()},{signal:abort.signal});
 document.addEventListener('click',e=>{const item=e.target.closest?.('[data-find],[data-item]');if(item){const id=item.dataset.find||item.dataset.item;const fresh=typeof state!=='undefined'&&!state.found.includes(id);playEvidence(id,fresh?'acquire':'review')}},{capture:true,signal:abort.signal});
 document.addEventListener('click',e=>{
  const b=e.target.closest?.('button');if(!b||b.disabled||!b.closest('#app,.cc-root')||b.matches('[data-find],[data-item],[data-piece],[data-slot]'))return;
  const a=b.dataset.act||b.dataset.action||'';
  // Next-page validation already emits page/reject feedback; do not double it.
  if(b.dataset.action==='next'||b.hasAttribute('data-npc')||b.hasAttribute('data-accuse')||b.hasAttribute('data-port')||['graphHint','graphClear','handoff'].includes(a)||(a==='board'&&typeof state!=='undefined'&&state.found.length<3))return;
  const kind=['start','handoff','accuse','finish'].includes(a)||b.hasAttribute('data-accuse')?'confirm':['storyNext','storyPrev','shotPrev','shotNext','replay'].includes(a)?'page':a==='close'?'close':'tap';
  playButton(kind);
 },{capture:true,signal:abort.signal});
 for(const type of ['pointerdown','keydown'])document.addEventListener(type,unlock,{capture:true,signal:abort.signal});
 document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden)ctx.suspend().catch(()=>{});else if(unlocked)ctx.resume().then(()=>{sync();tick()}).catch(()=>{});ui()},{signal:abort.signal});
 const baseRender=typeof render==='function'?render:null;if(baseRender)render=function(){baseRender();sync()};
 if(window.CaseComic?.Controller){CaseComic.Controller.prototype.tone=function(kind){playFeedback(kind)};const draw=CaseComic.Controller.prototype.draw;CaseComic.Controller.prototype.draw=function(){const previous=this._scoreMode;draw.call(this);sync();if(previous==='puzzle'&&this.s.mode==='replay')semantic('reveal');if(previous==='replay'&&this.s.mode==='complete')semantic('caseResolved');this._scoreMode=this.s.mode}}
 function destroy(){if(dead)return;dead=true;window.BlizzardNarration?.destroy();for(const t of resultTasks)clearTimeout(t);resultTasks.clear();clearInterval(timer);abort.abort();stop(session);for(const s of [...retiring])stop(s);if(weather){weather.source.stop();weather.lfo.stop();for(const n of Object.values(weather))n.disconnect();weather=null}for(const n of fxNodes){try{n.stop()}catch{}n.disconnect()}fxNodes.clear();ctx?.close().catch(()=>{});panel.remove()}
 window.addEventListener('pagehide',destroy,{once:true,signal:abort.signal});
 function levels(meter=analyser){if(!meter)return {rms:0,peak:0};const a=new Float32Array(2048);meter.getFloatTimeDomainData(a);return {rms:Math.sqrt(a.reduce((v,n)=>v+n*n,0)/a.length),peak:a.reduce((v,n)=>Math.max(v,Math.abs(n)),0)}}
 window.BlizzardAtmosphere={sync,destroy,setNarrationActive,playEvidence,playButton,semantic,auditionPhrase(index){if(!session||!ctx||ctx.state!=='running')return false;stop(session);session=newSession(key);session.step=Math.max(0,Math.min(3,index))*8;tick();return true},inspect:()=>({...levels(),music:levels(musicMeter),environment:levels(weatherMeter),effects:levels(effectsMeter),narrationActive,scoreStyle:key==='puzzle'?'clockwork-mallet':key==='album'?'reveal-chamber':key==='resolution'?'resolution-coda':'exploration',effectsVolume,lastFx,lastButton,lastResult,fxVoices:fxNodes.size,sessionId:session?.serial||0,step:session?.step||0,phrase:session?Math.floor(session.step/8)%4:0,weatherVolume,weatherTarget,weatherActive:!!weather,cue:key,mood:document.body.dataset.mood,unlocked,muted,volume,state:ctx?.state||'locked',scheduled,voices:(session?.nodes.size||0),retiring:retiring.size})};
 timer=setInterval(tick,100);sync();queueMicrotask(sync);
})();





