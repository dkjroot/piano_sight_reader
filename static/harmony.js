import {candidates, makePhrase, spellChord} from './core.js';

const TONICS={C:0,G:7,D:2,A:9,E:4,B:11,'F#':6,'C#':1,F:5,Bb:10,Eb:3,Ab:8,Db:1,Gb:6,Cb:11};
const MAJOR=[0,2,4,5,7,9,11], MINOR=[0,2,3,5,7,8,10];

export function cadenceLabels(minor=false,sevenths=false) {
  if(sevenths) return minor ? ['i7–iv7–v7–i7','iiø7–v7–i7','i7–VImaj7–iiø7–v7'] : ['Imaj7–IVmaj7–V7–Imaj7','ii7–V7–Imaj7','Imaj7–vi7–ii7–V7'];
  return minor ? ['i–iv–v–i','ii°–v–i','i–VI–ii°–v'] : ['I–IV–V–I','ii–V–I','I–vi–ii–V'];
}

export function harmonicPitchClasses(key, minor, degree, sevenths=false) {
  const scale=minor ? MINOR : MAJOR;
  const tonic=((TONICS[key] ?? 0)+(minor ? 9 : 0))%12;
  return (sevenths ? [0,2,4,6] : [0,2,4]).map(offset=>(tonic+scale[(degree+offset)%7])%12);
}

function voicings(pool, pcs, count, settings) {
  const available=pool.filter(pitch=>pcs.includes(pitch%12));
  const options=[];
  const span=Number(settings['hand-span']) || 12;
  const requireBoth=settings.hand === 'both' && count>1 && pool.some(n=>n<60) && pool.some(n=>n>=60);
  for (let start=0; start+count<=available.length; start++) {
    const notes=available.slice(start,start+count);
    const hands=settings.hand === 'both' ? [notes.filter(n=>n<60),notes.filter(n=>n>=60)] : [notes];
    if (requireBoth && hands.some(hand=>!hand.length)) continue;
    if (hands.some(hand=>hand.length>5 || (hand.length && hand.at(-1)-hand[0]>span))) continue;
    if (notes.at(-1)-notes[0] > span*2+12) continue;
    options.push(notes);
  }
  return options;
}

export function makePracticePhrase(settings, random=Math.random) {
  const source=settings.source || 'random';
  if (source === 'random') return makePhrase(settings,random);
  const length=Math.max(1,Math.min(32,Number(settings.length)||4));
  const max=Math.max(1,Math.min(10,Number(settings.size)||1));
  const min=Math.max(1,Math.min(max,Number(settings['min-size'])||1));
  const pool=candidates({...settings,material:'white'});
  const minor=settings['harmony-scale'] === 'minor';
  const result=[];
  let previous=[];
  for (let step=0; step<length; step++) {
    const absolute=step+(settings.sequenceOffset || 0);
    const pattern=({'ii-v-i':[1,4,0],turnaround:[0,5,1,4]})[settings['cadence-shape']]||[0,3,4,0];
    const degree=source === 'cadence' ? pattern[absolute%pattern.length] : Math.floor(random()*7);
    const pcs=harmonicPitchClasses(settings.key,minor,degree,settings['harmony-kind']==='sevenths');
    const requested=min+Math.floor(random()*(max-min+1));
    let options=[];
    for (let count=requested; count>=1 && !options.length; count--) options=voicings(pool,pcs,count,settings);
    if (!options.length) {result.push([]); continue;}
    if (previous.length) {
      const cost=notes=>notes.reduce((sum,n)=>sum+Math.min(...previous.map(p=>Math.abs(p-n))),0)/notes.length;
      const best=Math.min(...options.map(cost));
      options=options.filter(notes=>cost(notes)<=best+2);
    }
    const chosen=options[Math.floor(random()*options.length)];
    previous=chosen;
    const written=spellChord(chosen,settings.material === 'flats',settings.key);
    result.push(written.map(note=>({...note,staff:settings.hand === 'left' || (settings.hand === 'both' && note.midi<60) ? 'bass' : 'treble'})));
  }
  return result;
}
