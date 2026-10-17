import {attackGroups,makeOutline} from './outline.js';
import {compileScore} from './score_model.js';
import {KEYS} from './core.js';

// A separate, explicit derivation. Raw ticks, controllers, note IDs and hashes
// remain in the inspection. Notation uses a 1/32 grid; no source attack is merged.
export function midiStudy(inspection,settings,bounds={},title='MIDI passage') {
  const outline=makeOutline(inspection,settings,bounds), byId=new Map(inspection.notes.map(note=>[note.id,note]));
  if(!outline.targets.length) throw new Error('No retained notes in this passage.');
  const groups=attackGroups(inspection), origin=groups[outline.start-1].tick, resolution=inspection.ticks_per_quarter;
  const stop=groups[outline.end]?.tick??inspection.duration_ticks;
  const position=tick=>Math.round((tick-origin)*8/resolution), rows=[];
  const controllers=(inspection.events??[]).filter(event=>event.message.type==='control_change');
  for(const target of outline.targets) for(const written of target) for(const id of written.sourceIds) {
    const source=byId.get(id);
    if(!Number.isSafeInteger(source.end_tick)) throw new Error('This passage contains a note without a source release; choose a complete passage.');
    const start=position(source.start_tick), end=Math.min(position(stop),Math.max(start+1,position(source.end_tick)));
    if(end<=start) throw new Error('This cut is shorter than the notation grid; choose a wider passage.');
    const channelEvents=controllers.filter(event=>event.message.channel===source.channel);
    let down=false;
    for(const event of channelEvents) if(event.tick<=source.end_tick) {
      if(event.message.control===64) down=event.message.value>=64;
      if([120,121].includes(event.message.control)) down=false;
    }
    const pedalEnd=down?channelEvents.find(event=>event.tick>source.end_tick && ([120,121].includes(event.message.control) || event.message.control===64 && event.message.value<64))?.tick??stop:source.end_tick;
    const attackIndex=Number(source.id.split(':n')[1]);
    const panic=channelEvents.find(event=>event.message.control===120 && (event.tick>source.start_tick || event.tick===source.start_tick && (event.track>source.track || event.track===source.track && event.index>attackIndex)))?.tick??stop;
    const soundEnd=Math.max(start+1,position(Math.min(stop,pedalEnd,panic)));
    rows.push({source,written,start,end,soundEnd});
  }
  if(rows.length>1024) throw new Error('Choose a shorter study passage (up to 1,024 retained source notes).');
  rows.sort((a,b)=>a.start-b.start || a.source.start_tick-b.source.start_tick || a.source.midi-b.source.midi);
  const onset=new Map();
  for(const row of rows) {
    const key=row.start+':'+row.source.midi, before=onset.get(key);
    if(before!==undefined && before!==row.source.start_tick) throw new Error('Separate repeated attacks fall inside one notation-grid cell; choose a less densely articulated passage.');
    onset.set(key,row.source.start_tick);
  }
  const voices=[];
  for(const row of rows) {
    const staff=row.written.staff==='bass'?'lower':'upper';
    let voice=voices.find(voice=>voice.staff===staff && voice.end<=row.start);
    if(!voice) {voice={id:'derived-voice-'+voices.length,staff,end:0,rows:[],stem:voices.filter(v=>v.staff===staff).length%2?'down':'up'}; voices.push(voice);}
    if(voices.length>16) throw new Error('This passage needs more than 16 notated voices; reduce its density or select a shorter passage.');
    voice.rows.push(row); voice.end=row.end;
  }
  const events=inspection.events??[], meterEvents=events.filter(event=>event.message.type==='time_signature').sort((a,b)=>a.tick-b.tick);
  const meterAt=tick=>meterEvents.filter(event=>event.tick<=tick).at(-1)??{tick:0,message:{numerator:4,denominator:4}};
  const keyAt=tick=>{
    const markers=events.filter(event=>event.message.type==='key_signature' && event.tick<=tick);
    const latest=markers.at(-1)?.tick, keys=new Set(markers.filter(event=>event.tick===latest).map(event=>event.message.key));
    const raw=keys.size===1?[...keys][0]:null;
    const minor=['Am','Em','Bm','F#m','C#m','G#m','D#m','A#m','Dm','Gm','Cm','Fm','Bbm','Ebm','Abm'];
    return KEYS.some(key=>key.id===raw)?raw:minor.includes(raw)?KEYS[minor.indexOf(raw)].id:settings.key;
  };
  const duration=Math.max(...rows.flatMap(row=>[row.end,row.soundEnd])), measures=[], ties=[], lastNote=new Map(); let at=0, serial=0;
  const values=[[32,'w'],[16,'h'],[8,'q'],[4,'8'],[2,'16'],[1,'32']];
  while(at<duration) {
    if(measures.length>=256) throw new Error('Choose a passage of at most 256 measures.');
    const absolute=origin+at*resolution/8, signature=meterAt(absolute), meter=[signature.message.numerator,signature.message.denominator];
    const full=meter[0]*32/meter[1];
    if(!Number.isInteger(full) || full<1) throw new Error('This meter is outside the study notation grid.');
    const since=(absolute-signature.tick)*8/resolution, remainder=((Math.round(since)%full)+full)%full;
    const change=meterEvents.find(event=>event.tick>absolute);
    const end=Math.min(duration,at+full-remainder,change?Math.max(at+1,position(change.tick)):Infinity);
    const measure={id:'derived-bar-'+measures.length,meter,key:keyAt(absolute),length:[end-at,8],events:[]};
    for(const voice of voices) {
      let cursor=at;
      while(cursor<end) {
        const row=voice.rows.find(row=>row.start<=cursor && row.end>cursor), next=voice.rows.find(row=>row.start>cursor);
        const finish=Math.min(end,row?.end??next?.start??end);
        const [units,value]=values.find(([units])=>units<=finish-cursor), id='derived-event-'+serial++;
        const note=row?{id:id+'-note',letter:row.written.letter,octave:row.written.octave,accidental:row.written.accidental,playbackEnd:lastNote.has(row.source.id)?undefined:[row.soundEnd,8],sourceIds:[row.source.id],sourceStart:row.source.start_tick,sourceEnd:row.source.end_tick,sourceTrack:row.source.track,sourceChannel:row.source.channel}:null;
        measure.events.push({id,voice:voice.id,at:[cursor-at,8],value,kind:row?'note':'rest',notes:note?[note]:[]});
        if(row) {if(lastNote.has(row.source.id)) ties.push({from:lastNote.get(row.source.id),to:note.id}); lastNote.set(row.source.id,note.id);}
        cursor+=units;
      }
    }
    measures.push(measure); at=end;
  }
  const tempos=new Map([['0',{at:[0,1],bpm:60_000_000/(inspection.tempo_map.filter(tempo=>tempo.tick<=origin).at(-1)?.microseconds_per_quarter??500000)}]]);
  for(const tempo of inspection.tempo_map) {const point=position(tempo.tick); if(point>0 && point<duration) tempos.set(String(point),{at:[point,8],bpm:60_000_000/tempo.microseconds_per_quarter});}
  const source={version:1,id:'midi-derived-study',title,staves:[{id:'upper',clef:'treble'},{id:'lower',clef:'bass'}],voices:voices.map(({id,staff,stem})=>({id,staff,stem})),measures,ties,tempos:[...tempos.values()],provenance:{kind:'midi-derived',sha256:inspection.sha256,bounds:{start:outline.start,end:outline.end},grid:[1,8],spelling:'selected key and explicit track staff choices',voices:'derived interval lanes, not recovered hands',retainedNotes:rows.length,omittedNotes:outline.omittedNotes,sourceOriginTick:origin,sourceEndTick:stop}};
  return compileScore(source);
}
