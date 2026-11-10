/* Adapter to the existing game. Save/handoff remains owned by game.js. */
let caseController=null;
function stopComicPlayback(){caseController?.destroy();caseController=null}
function startReconstruction(){stopComicPlayback();state.toast='';document.querySelectorAll('body>.toast').forEach(el=>el.remove());state.phase='reconstruction';state.caseSession=null;renderReconstruction()}
function renderReconstruction(){if(caseController?.alive&&app.querySelector('.cc-root'))return;stopComicPlayback();caseController=new CaseComic.Controller(app,leaveReconstruction,state.caseSession).mount();state.caseSession=caseController.s}
function leaveReconstruction(){stopComicPlayback();if(state.comicReturn==='epilogue'){state.phase='accuse';state.dialog={lines:OUTRO.slice(7),index:0,done:'ending'}}else state.phase='ending';render()}
const caseBaseRender=render;
render=function(){if(state.phase==='reconstruction'){renderReconstruction();return}stopComicPlayback();caseBaseRender();if(state.phase==='ending'){const button=document.createElement('button');button.className='ghost';button.textContent='重建案件';button.dataset.rewatchComic='true';button.onclick=()=>{state.comicReturn='ending';startReconstruction()};document.querySelector('.title-content').appendChild(button)}};
