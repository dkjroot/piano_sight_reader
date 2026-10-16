import {KEYS} from './core.js';

function requireValue(condition,message) {if(!condition) throw new Error(message);}
function rational(n,d) {
  requireValue(d!==0n,'Beat denominator must be positive.');
  if(d<0n) {n=-n; d=-d;}
  let a=n<0n ? -n : n,b=d;
  while(b) [a,b]=[b,a%b];
  n/=a; d/=a;
  requireValue(Number.isSafeInteger(Number(n)) && Number.isSafeInteger(Number(d)),'Beat arithmetic exceeds exact integer limits.');
  return Object.freeze([Number(n),Number(d)]);
}
export function beat(value) {
  requireValue(Array.isArray(value) && value.length===2 && value.every(Number.isSafeInteger) && value[1]>0,'Expected an exact [numerator, positive denominator] beat.');
  return rational(BigInt(value[0]),BigInt(value[1]));
}
export function addBeat(a,b) {a=beat(a); b=beat(b); return rational(BigInt(a[0])*BigInt(b[1])+BigInt(b[0])*BigInt(a[1]),BigInt(a[1])*BigInt(b[1]));}
export function multiplyBeat(a,b) {a=beat(a); b=beat(b); return rational(BigInt(a[0])*BigInt(b[0]),BigInt(a[1])*BigInt(b[1]));}
export function compareBeat(a,b) {a=beat(a); b=beat(b); const difference=BigInt(a[0])*BigInt(b[1])-BigInt(b[0])*BigInt(a[1]); return difference<0n ? -1 : difference>0n ? 1 : 0;}
const ZERO=Object.freeze([0,1]), keyOf=value=>value.join('/');
const VALUES={w:[4,1],h:[2,1],q:[1,1],'8':[1,2],'16':[1,4],'32':[1,8]};
function freeze(value) {if(value && typeof value==='object' && !Object.isFrozen(value)) {Object.freeze(value); for(const child of Object.values(value)) freeze(child);} return value;}
function duration(event) {
  requireValue(Object.hasOwn(VALUES,event.value),'Unsupported written note value.');
  const dots=event.dots??0;
  requireValue(Number.isInteger(dots) && dots>=0 && dots<=2,'Use zero, one or two dots.');
  let result=multiplyBeat(VALUES[event.value],[2**(dots+1)-1,2**dots]);
  if(event.tuplet) {
    const {actual,normal,group}=event.tuplet;
    requireValue(Number.isInteger(actual) && actual>=2 && actual<=16 && Number.isInteger(normal) && normal>=1 && normal<=16 && typeof group==='string','Invalid simple tuplet.');
    result=multiplyBeat(result,[normal,actual]);
  }
  return result;
}

// Authored notation is distinct from MIDI inspection data and from judged performance.
export function compileScore(input) {
  requireValue(input && input.version===1,'Unsupported authored score version.');
  requireValue(JSON.stringify(input).length<=1_000_000,'Authored score is too large.');
  const source=structuredClone(input), ids=new Set();
  const identify=id=>{requireValue(typeof id==='string' && /^[A-Za-z0-9_-]{1,80}$/.test(id) && !ids.has(id),'Missing, invalid or duplicate score ID.'); ids.add(id); return id;};
  identify(source.id);
  requireValue(typeof source.title==='string' && source.title.length>0 && source.title.length<=200,'Score title is required.');
  requireValue(Array.isArray(source.staves) && source.staves.length>=1 && source.staves.length<=4,'Use one to four staves.');
  const staves=source.staves.map(staff=>{identify(staff.id); requireValue(['treble','bass'].includes(staff.clef),'Unsupported clef.'); return {...staff};});
  const staffIds=new Set(staves.map(staff=>staff.id));
  requireValue(Array.isArray(source.voices) && source.voices.length>=1 && source.voices.length<=16,'Use one to sixteen voices.');
  const voices=source.voices.map(voice=>{
    identify(voice.id); requireValue(staffIds.has(voice.staff),'Voice has an unknown staff.');
    requireValue(voice.hand===undefined || ['left','right'].includes(voice.hand),'Invalid optional authored hand.');
    requireValue(voice.stem===undefined || ['up','down'].includes(voice.stem),'Invalid stem direction.');
    return {...voice};
  });
  const voiceById=new Map(voices.map(voice=>[voice.id,voice]));
  requireValue(Array.isArray(source.measures) && source.measures.length>=1 && source.measures.length<=256,'Use one to 256 measures.');
  const measures=[], events=[], notes=[], groups=new Map(); let position=ZERO, meter=[4,4], signature='C';
  for(const measure of source.measures) {
    identify(measure.id); meter=measure.meter??meter; signature=measure.key??signature;
    requireValue(Array.isArray(meter) && meter.length===2 && Number.isInteger(meter[0]) && meter[0]>=1 && meter[0]<=32 && [1,2,4,8,16,32].includes(meter[1]),'Invalid time signature.');
    requireValue(KEYS.some(key=>key.id===signature),'Invalid key signature.');
    const full=beat([meter[0]*4,meter[1]]), length=measure.length ? beat(measure.length) : full;
    requireValue(compareBeat(length,ZERO)>0 && compareBeat(length,full)<=0,'Invalid measure or pickup length.');
    requireValue(Array.isArray(measure.events) && measure.events.length>0 && events.length+measure.events.length<=4096,'Empty measure or too many score events.');
    const start=position, end=addBeat(start,length), local=[];
    for(const event of measure.events) {
      identify(event.id); const voice=voiceById.get(event.voice), staff=event.staff??voice?.staff;
      requireValue(voice && staffIds.has(staff),'Event has an unknown voice or staff.');
      requireValue(['note','rest'].includes(event.kind),'Event must be a note or a rest.');
      const at=beat(event.at), span=duration(event), finish=addBeat(at,span);
      requireValue(compareBeat(at,ZERO)>=0 && compareBeat(finish,length)<=0,'Event lies outside its measure. Split and tie crossing notes explicitly.');
      requireValue(Array.isArray(event.notes) && (event.kind==='rest' ? event.notes.length===0 : event.notes.length>=1 && event.notes.length<=10),'Invalid chord or rest notes.');
      const written=[], pitches=new Set();
      for(const note of event.notes) {
        identify(note.id);
        requireValue(typeof note.letter==='string' && /^[A-G]$/.test(note.letter) && Number.isInteger(note.octave) && Number.isInteger(note.accidental) && Math.abs(note.accidental)<=2,'Invalid written pitch.');
        const midi=12*(note.octave+1)+({C:0,D:2,E:4,F:5,G:7,A:9,B:11})[note.letter]+note.accidental;
        requireValue(note.midi===undefined || note.midi===midi,'Written pitch and supplied MIDI pitch disagree.');
        requireValue(note.staff===undefined,'Per-note cross-staff chords are not supported yet; assign the event staff.');
        requireValue(midi>=0 && midi<=127 && !pitches.has(midi),'Pitch is outside MIDI range or duplicated in one voice/chord.'); pitches.add(midi);
        const record={...note,midi,eventId:event.id,voiceId:voice.id,staffId:staff,measureId:measure.id,start:addBeat(start,at),end:addBeat(start,finish),duration:span};
        written.push(record); notes.push(record);
      }
      const record={...event,voiceId:voice.id,staffId:staff,measureId:measure.id,start:addBeat(start,at),end:addBeat(start,finish),duration:span,notes:written};
      local.push(record); events.push(record);
      if(event.tuplet) {
        const id=event.tuplet.group;
        if(!groups.has(id)) {identify(id); groups.set(id,[]);} groups.get(id).push(record);
      }
    }
    for(const voice of voices) {
      const line=local.filter(event=>event.voiceId===voice.id).sort((a,b)=>compareBeat(a.start,b.start)); let next=start;
      for(const event of line) {requireValue(compareBeat(event.start,next)===0,'Each voice must be continuous: use explicit rests, without overlapping events.'); next=event.end;}
      requireValue(compareBeat(next,end)===0,'Each voice must fill every measure, including explicit rests.');
    }
    measures.push({...measure,meter:[...meter],key:signature,length,start,end,events:local}); position=end;
  }
  for(const group of groups.values()) {
    group.sort((a,b)=>compareBeat(a.start,b.start)); const first=group[0], rule=first.tuplet;
    requireValue(group.length===rule.actual && group.every((event,i)=>event.voiceId===first.voiceId && event.measureId===first.measureId && event.value===first.value && (event.dots??0)===(first.dots??0) && event.tuplet.actual===rule.actual && event.tuplet.normal===rule.normal && (!i || compareBeat(group[i-1].end,event.start)===0)),'Simple tuplets must contain a complete contiguous equal-value group in one voice and measure.');
  }
  const noteById=new Map(notes.map(note=>[note.id,note])), incoming=new Map(), outgoing=new Map();
  requireValue(source.ties===undefined || Array.isArray(source.ties),'Invalid tie list.');
  for(const tie of source.ties??[]) {
    const from=noteById.get(tie.from), to=noteById.get(tie.to);
    requireValue(from && to && from.midi===to.midi && from.voiceId===to.voiceId && compareBeat(from.end,to.start)===0 && !outgoing.has(from.id) && !incoming.has(to.id),'Ties must join adjacent same-pitch notes in one voice without branching.');
    incoming.set(to.id,from.id); outgoing.set(from.id,to.id);
  }
  const sounds=notes.filter(note=>!incoming.has(note.id)).map(note=>{
    const segments=[note.id]; let last=note;
    while(outgoing.has(last.id)) {last=noteById.get(outgoing.get(last.id)); segments.push(last.id);}
    return {...note,end:last.end,duration:addBeat(last.end,[-note.start[0],note.start[1]]),segments};
  });
  const tempos=(source.tempos??[{at:[0,1],bpm:120}]).map(tempo=>{
    const at=beat(tempo.at); requireValue(compareBeat(at,ZERO)>=0 && compareBeat(at,position)<0 && Number.isFinite(tempo.bpm) && tempo.bpm>=1 && tempo.bpm<=600,'Invalid tempo event.'); return {...tempo,at};
  }).sort((a,b)=>compareBeat(a.at,b.at));
  requireValue(tempos.length>0 && compareBeat(tempos[0].at,ZERO)===0 && tempos.every((tempo,i)=>!i || compareBeat(tempos[i-1].at,tempo.at)<0),'Tempo map must start at zero with unique beat positions.');
  const boundaries=new Map();
  const boundary=at=>{const key=keyOf(at); if(!boundaries.has(key)) boundaries.set(key,{at,attacks:[],releases:[],restStarts:[],restEnds:[]}); return boundaries.get(key);};
  for(const event of events) {boundary(event.start); boundary(event.end); if(event.kind==='rest') {boundary(event.start).restStarts.push(event.id); boundary(event.end).restEnds.push(event.id);}}
  for(const sound of sounds) {boundary(sound.start).attacks.push(sound.id); boundary(sound.end).releases.push(sound.id);}
  const held=new Set(), resting=new Set();
  const moments=[...boundaries.values()].sort((a,b)=>compareBeat(a.at,b.at)).map(point=>{
    for(const id of point.releases) held.delete(id); for(const id of point.restEnds) resting.delete(id);
    for(const id of point.restStarts) resting.add(id);
    const moment={at:point.at,attacks:point.attacks,releases:point.releases,continuing:[...held],rests:[...resting]};
    for(const id of point.attacks) held.add(id); return moment;
  });
  return freeze({version:1,source,staves,voices,measures,events,notes,sounds,moments,tempos,duration:position});
}
