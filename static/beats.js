import {secondsAt} from './transport.js';
// Source MIDI meter pulses; no inference of printed pickups or beat grouping.
export function sourceBeats(score,plan,speed=1,bars=0) {
  if(plan.sourceStart===undefined || plan.sourceEnd<=plan.sourceStart) return {beats:[],leadIn:0};
  speed=Math.max(.25,Math.min(2,Number(speed)||1)); bars=Math.max(0,Math.min(2,Math.trunc(bars)||0));
  const first=plan.sourceStart, last=plan.sourceEnd, ppq=score.ticks_per_quarter;
  const meters=new Map([[0,{tick:0,numerator:4,denominator:4}]]);
  for(const event of score.events) if(event.message.type==='time_signature' && event.message.numerator>0 && event.message.denominator>0) meters.set(event.tick,{tick:event.tick,...event.message});
  const changes=[...meters.values()].sort((a,b)=>a.tick-b.tick), beats=[], origin=secondsAt(score,first);
  let entry=changes[0]; for(const meter of changes) if(meter.tick<=first) entry=meter;
  for(let i=0;i<changes.length;i++) {
    const meter=changes[i], end=Math.min(last,changes[i+1]?.tick??last), unit=ppq*4/meter.denominator;
    let index=Math.max(0,Math.ceil((Math.max(first,meter.tick)-meter.tick)/unit)), tick=meter.tick+index*unit;
    if(tick>=end) continue;
    if(!Number.isFinite(unit) || unit<=0 || Math.ceil((end-tick)/unit)+beats.length>8192) throw new Error('Source passage exceeds 8,192 metronome pulses; choose a shorter passage.');
    for(;tick<end;index++,tick=meter.tick+index*unit) beats.push({start:(secondsAt(score,tick)-origin)/speed,beat:index%meter.numerator,tick});
  }
  const tempo=score.tempo_map.filter(change=>change.tick<=first).at(-1), unit=ppq*4/entry.denominator;
  const interval=tempo.microseconds_per_quarter/1e6*4/entry.denominator/speed, count=bars*entry.numerator, leadIn=count*interval;
  const index=Math.ceil((first-entry.tick)/unit), offset=(entry.tick+index*unit-first)/unit;
  const countIn=Array.from({length:count},(_,i)=>({start:-leadIn+(offset+i)*interval,beat:(index+i)%entry.numerator,countIn:true}));
  return {beats:[...countIn,...beats],leadIn};
}
export class BeatCursor {
  start(beats,origin,position=-Infinity) {this.beats=beats; this.origin=origin; this.index=0; this.position=position;}
  pump(now,emit) {
    if(!this.beats) return;
    while(this.index<this.beats.length && this.origin+this.beats[this.index].start<now+.1) {
      const beat=this.beats[this.index++], time=this.origin+beat.start;
      if(beat.start<this.position-1e-7 || time<now-.03) continue;
      emit({...beat,time:Math.max(now,time)});
    }
  }
}
