import {candidates,spellChord} from './core.js';

export function attackGroups(score) {
  const groups=new Map();
  for(const note of score?.notes||[]) {
    if(note.channel===9) continue; // Preserve percussion in the inspection, not piano practice.
    if(!groups.has(note.start_tick)) groups.set(note.start_tick,[]);
    groups.get(note.start_tick).push(note);
  }
  return [...groups].sort(([a],[b])=>a-b).map(([tick,notes])=>({tick,notes}));
}
export function makeOutline(score,settings,{start=1,end=512}={}) {
  const groups=attackGroups(score), pool=new Set(candidates(settings));
  start=Math.max(1,Math.min(groups.length,Math.trunc(start)||1));
  end=Math.max(start,Math.min(groups.length,start+511,Math.trunc(end)||groups.length));
  const targets=[]; let retained=0, considered=0;
  for(let index=start-1;index<end && index<groups.length;index++) {
    const group=groups[index], pitches=[...new Set(group.notes.map(n=>n.midi))].filter(n=>pool.has(n)).sort((a,b)=>a-b);
    considered+=group.notes.length;
    const priority=[];
    // Melody, bass, then inner notes. Never add pitches absent from the source.
    if(pitches.length) priority.push(pitches.at(-1));
    if(pitches.length>1) priority.push(pitches[0]);
    priority.push(...pitches.slice(1,-1).reverse());
    const selected=[];
    for(const pitch of priority) {
      if(selected.length>=Math.max(1,Math.min(10,+settings.size||1))) break;
      if(spellChord([...selected,pitch],settings.material==='flats',settings.key)) selected.push(pitch);
    }
    if(!selected.length) continue;
    const written=spellChord(selected,settings.material==='flats',settings.key);
    targets.push(written.map(note=>{
      const ids=group.notes.filter(n=>n.midi===note.midi).map(n=>n.id); retained+=ids.length;
      return {...note,staff:settings.hand==='left' || (settings.hand==='both' && note.midi<60) ? 'bass' : 'treble',sourceTick:group.tick,sourceOnset:index+1,sourceIds:ids};
    }));
  }
  return {targets,totalOnsets:groups.length,start,end,retainedNotes:retained,omittedNotes:considered-retained};
}
