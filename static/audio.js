// Original additive instruments. No samples, network requests or MIDI output.
export class SynthPath {
  constructor(context, destination) {
    this.context=context; this.voices=new Map(); this.instrument='piano';
    this.gain=context.createGain(); this.gain.gain.value=.25; this.gain.connect(destination);
  }
  configure(instrument,volume) {
    const selected=instrument==='organ' ? 'organ' : 'piano';
    if (this.instrument!==selected) this.stop();
    this.instrument=selected;
    this.gain.gain.setTargetAtTime(Math.max(0,Math.min(1,volume)),this.context.currentTime,.015);
  }
  noteOn(pitch,time=this.context.currentTime,duration=null) {
    if (!Number.isInteger(pitch) || pitch<0 || pitch>127) return;
    this.noteOff(pitch,time);
    const envelope=this.context.createGain(), oscillators=[];
    envelope.connect(this.gain);
    const organ=this.instrument==='organ', level=organ ? .12 : .22;
    envelope.gain.setValueAtTime(0,time);
    envelope.gain.linearRampToValueAtTime(level,time+.008);
    if (!organ) envelope.gain.exponentialRampToValueAtTime(.002,time+5);
    for (const [multiple,weight] of organ ? [[1,1],[2,.4],[3,.2],[4,.12]] : [[1,1],[2,.35],[3,.13]]) {
      const oscillator=this.context.createOscillator(), partial=this.context.createGain();
      oscillator.type='sine'; oscillator.frequency.value=440*2**((pitch-69)/12)*multiple;
      partial.gain.value=weight; oscillator.connect(partial); partial.connect(envelope);
      oscillator.onended=()=>{oscillator.disconnect(); partial.disconnect();};
      oscillator.start(time); oscillators.push(oscillator);
    }
    const voice={envelope,oscillators,start:time}; this.voices.set(pitch,voice);
    if (duration!==null) this.release(pitch,voice,time+duration);
  }
  release(pitch,voice,time) {
    const end=Math.max(time,voice.start+.009), gain=voice.envelope.gain;
    // Hold the current envelope before fading; cancelAndHold avoids a release jump.
    if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(end);
    else {gain.cancelScheduledValues(end); gain.setValueAtTime(gain.value,end);}
    gain.linearRampToValueAtTime(0,end+.06);
    for (const oscillator of voice.oscillators) oscillator.stop(end+.07);
    const last=voice.oscillators.at(-1), cleanup=last.onended;
    last.onended=()=>{cleanup(); voice.envelope.disconnect(); if(this.voices.get(pitch)===voice) this.voices.delete(pitch);};
  }
  noteOff(pitch,time=this.context.currentTime) {const voice=this.voices.get(pitch); if(voice) {this.voices.delete(pitch); this.release(pitch,voice,time);}}
  sync(pitches) {
    const wanted=new Set(pitches);
    for (const pitch of this.voices.keys()) if(!wanted.has(pitch)) this.noteOff(pitch);
    for (const pitch of wanted) if(!this.voices.has(pitch)) this.noteOn(pitch);
  }
  stop() {for(const pitch of [...this.voices.keys()]) this.noteOff(pitch);}
}
export class MetronomeClock {
  constructor() {this.running=false;}
  start(now,bpm=80,beats=4) {
    this.interval=60/Math.max(30,Math.min(240,Number(bpm)||80));
    this.beats=Math.max(1,Math.min(12,Math.trunc(beats)||4));
    this.next=now+.03; this.index=0; this.running=true;
  }
  stop() {this.running=false;}
  pump(now,emit) {
    if (!this.running) return;
    // A stalled/background scheduler must never emit a burst of overdue clicks.
    if(this.next<now) {this.next=now+.03; this.index=0;}
    while(this.next<now+.1) {emit({time:this.next,beat:this.index%this.beats,bar:Math.floor(this.index/this.beats)}); this.next+=this.interval; this.index++;}
  }
}
export class LocalAudio {
  constructor(context) {
    this.context=context;
    this.master=context.createGain(); this.master.gain.value=.65;
    this.limiter=context.createDynamicsCompressor(); this.master.connect(this.limiter); this.limiter.connect(context.destination);
    this.live=new SynthPath(context,this.master); this.reference=new SynthPath(context,this.master);
    this.clickGain=context.createGain(); this.clickGain.gain.value=.2; this.clickGain.connect(this.master); this.clicks=new Set();
  }
  click({time,beat}) {
    const oscillator=this.context.createOscillator(), gain=this.context.createGain();
    oscillator.frequency.value=beat===0 ? 1400 : 900;
    gain.gain.setValueAtTime(0,time); gain.gain.linearRampToValueAtTime(.4,time+.002); gain.gain.exponentialRampToValueAtTime(.001,time+.045);
    oscillator.connect(gain); gain.connect(this.clickGain); this.clicks.add(oscillator);
    oscillator.onended=()=>{this.clicks.delete(oscillator); oscillator.disconnect(); gain.disconnect();};
    oscillator.start(time); oscillator.stop(time+.05);
  }
  audition(pitches) {this.reference.stop(); for(const pitch of pitches) this.reference.noteOn(pitch,this.context.currentTime,.8);}
  stopClicks() {for(const click of this.clicks) click.stop(); this.clicks.clear();}
  panic() {this.live.stop(); this.reference.stop(); this.stopClicks();}
}
