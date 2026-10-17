import {StudyPlayer} from './study_player.js';
import {compileScore,compareBeat,addBeat} from './score_model.js';
import {ScoreEngraver} from './engraving.js';
import {noteName} from './core.js';
import {StudyPractice} from './study_practice.js';
const $=id=>document.getElementById(id);
try {
  await document.fonts.ready;
  const study=new URLSearchParams(location.search).get('study')==='notation-cases'?'notation-cases':'independent-voices';
  $('study-example').value=study;
  $('study-example').addEventListener('change',event=>{location.search='?study='+encodeURIComponent(event.target.value);});
  const response=await fetch('/static/studies/'+study+'.json');
  if(!response.ok) throw new Error('The local study could not be loaded.');
  const score=compileScore(await response.json()), engraver=new ScoreEngraver($('engraving-output'));
  $('study-title').textContent=score.source.title;
  engraver.draw(score); let index=0;
  const names=ids=>ids.map(id=>noteName(score.sounds.find(note=>note.id===id))).join(', ')||'none';
  function show(value) {
    index=Math.max(0,Math.min(score.moments.length-1,value)); const moment=score.moments[index];
    const measure=score.measures.find(measure=>compareBeat(moment.at,measure.start)>=0 && compareBeat(moment.at,measure.end)<0);
    let label='End of study';
    if(measure) {const local=addBeat(addBeat(moment.at,[-measure.start[0],measure.start[1]]),[1,1]); label=`Bar ${score.measures.indexOf(measure)+1} · beat ${Math.floor(local[0]/local[1])}${local[0]%local[1] ? ` + ${local[0]%local[1]}/${local[1]}` : ''}`;}
    $('notation-status').textContent=label;
    $('notation-detail').textContent=`New attacks: ${names(moment.attacks)} · Continuing: ${names(moment.continuing)} · Releases: ${names(moment.releases)}${moment.rests.length ? ` · ${moment.rests.length} resting voice` : ''}`;
    $('notation-position').value=index; $('notation-previous').disabled=index===0; $('notation-next').disabled=index===score.moments.length-1;
    engraver.highlight(index);
    const active=engraver.nodes.get(engraver.active.keys().next().value);
    if(active && show.last!==index) {
      const pane=document.querySelector('.engraving-scroll'), bounds=pane.getBoundingClientRect(), note=active.getBoundingClientRect();
      if(note.top<bounds.top+20 || note.bottom>bounds.bottom-20) pane.scrollTop+=note.top-bounds.top-60;
      if(note.left<bounds.left+20 || note.right>bounds.right-20) pane.scrollLeft+=note.left-bounds.left-40;
    }
    show.last=index;
  }
  const player=new StudyPlayer(score,show);
  const practice=new StudyPractice(score,engraver,show,()=>player.stop());
  $('study-play').addEventListener('click',()=>practice.stop());
  for(const id of ['notation-position','notation-previous','notation-next']) $(id).addEventListener(id==='notation-position'?'input':'click',()=>practice.stop());
  $('notation-position').max=score.moments.length-1; $('notation-position').disabled=false;
  $('notation-position').addEventListener('input',event=>player.seek(+event.target.value));
  $('notation-previous').addEventListener('click',()=>player.seek(index-1)); $('notation-next').addEventListener('click',()=>player.seek(index+1));
  engraver.onSelect=note=>{practice.stop(); player.seek(score.moments.findIndex(moment=>compareBeat(moment.at,note.start)===0));};
  let resize;
  window.addEventListener('resize',()=>{clearTimeout(resize); resize=setTimeout(()=>{engraver.draw(score); show(index); practice.paint(true);},100);});
  show(0);
} catch(error) {$('notation-status').textContent='Notation could not be shown: '+error.message; console.error(error);}
