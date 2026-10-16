import {compileScore,compareBeat,addBeat} from './score_model.js';
import {ScoreEngraver} from './engraving.js';
import {noteName} from './core.js';
const $=id=>document.getElementById(id);
try {
  await document.fonts.ready;
  const response=await fetch('/static/studies/independent-voices.json');
  if(!response.ok) throw new Error('The local study could not be loaded.');
  const score=compileScore(await response.json()), engraver=new ScoreEngraver($('engraving-output'));
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
  }
  $('notation-position').max=score.moments.length-1; $('notation-position').disabled=false;
  $('notation-position').addEventListener('input',event=>show(+event.target.value));
  $('notation-previous').addEventListener('click',()=>show(index-1)); $('notation-next').addEventListener('click',()=>show(index+1));
  engraver.onSelect=note=>show(score.moments.findIndex(moment=>compareBeat(moment.at,note.start)===0));
  let resize;
  window.addEventListener('resize',()=>{clearTimeout(resize); resize=setTimeout(()=>{engraver.draw(score); show(index);},100);});
  show(0);
} catch(error) {$('notation-status').textContent='Notation could not be shown: '+error.message; console.error(error);}
