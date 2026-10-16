import {match} from './core.js';
// Generated chords can share held pitches; MIDI outline pitches are explicit attacks.
// Only notes from the immediately previous target can overlap its successor.
export class FlowGate {
  start(target,previous,held,attacks) {
    this.target=target; this.baseline=new Map([...attacks].map(([pitch,attack])=>[pitch,attack.serial]));
    const pitches=new Set(target.map(note=>note.midi)), before=new Set(previous.map(note=>note.midi));
    this.repeated=target.some(note=>Array.isArray(note.sourceIds)) || (pitches.size===before.size && [...pitches].every(pitch=>before.has(pitch)));
    this.retiring=new Map([...held].filter(pitch=>before.has(pitch) && !pitches.has(pitch)).map(pitch=>[pitch,attacks.get(pitch)?.serial||0]));
  }
  evaluate(held,attacks) {
    for(const [pitch,serial] of this.retiring) if(!held.has(pitch) || (attacks.get(pitch)?.serial||0)>serial) this.retiring.delete(pitch);
    const effective=new Set([...held].filter(pitch=>!this.retiring.has(pitch))), result=match(this.target,effective);
    const fresh=this.target.map(note=>(attacks.get(note.midi)?.serial||0)>(this.baseline.get(note.midi)||0));
    return {...result,effective,ready:result.complete && (this.repeated ? fresh.every(Boolean) : fresh.some(Boolean))};
  }
}
