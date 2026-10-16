import {LocalAudio,MetronomeClock} from './audio.js';
const $=id=>document.getElementById(id);
const ids=['live-instrument','live-volume','reference-instrument','reference-volume','reference-sound','click-volume','tempo','beats','source-speed'];
export class SoundPanel {
  constructor(getTarget,getPitches,getAttacks=()=>new Map()) {
    this.getTarget=getTarget; this.getPitches=getPitches; this.getAttacks=getAttacks; this.clock=new MetronomeClock(); this.engine=null; this.timer=null; this.revision=0; this.onReferenceStop=()=>{}; this.onConfigure=()=>{};
    try {const saved=JSON.parse(localStorage.getItem('piano-sight-reader-sound')||'{}');
      for(const id of ids) if(saved[id]!==undefined) {
        const element=$(id);
        if(element.type==='checkbox') element.checked=saved[id]===true;
        else if(element.tagName==='SELECT') {if([...element.options].some(o=>o.value===String(saved[id]))) element.value=saved[id];}
        else if(Number.isFinite(+saved[id])) element.value=Math.max(+element.min,Math.min(+element.max,+saved[id]));
      }
    } catch { /* Sound settings are optional. */ }
    for(const id of ids) $(id).addEventListener('change',()=>{if(['reference-instrument','reference-sound'].includes(id)) this.onReferenceStop(); this.configure(); this.persist(); if(this.clock.running && ['tempo','beats'].includes(id)) {this.engine.stopClicks(); this.clock.start(this.engine.context.currentTime,+$('tempo').value,+$('beats').value);}});
    $('live-sound').addEventListener('change',()=>this.setLive($('live-sound').checked));
    $('hear-live').addEventListener('click',()=>this.setLive(!$('live-sound').checked));
    $('hear-target').addEventListener('click',async()=>{if($('reference-sound').checked && await this.activate()) {this.onReferenceStop(); this.engine.audition(this.getTarget().map(note=>note.midi));}});
    $('metronome').addEventListener('change',async()=>{
      const revision=++this.revision, enabled=$('metronome').checked;
      this.clock.stop(); clearInterval(this.timer); this.engine?.stopClicks();
      if(enabled && await this.activate() && revision===this.revision && $('metronome').checked) {
        this.clock.start(this.engine.context.currentTime,+$('tempo').value,+$('beats').value);
        this.pump(); this.timer=setInterval(()=>this.pump(),25);
      } else if(revision===this.revision) this.stopClock();
    });
    $('sound-panic').addEventListener('click',()=>this.panic());
    this.configure(); this.sync();
  }
  async setLive(enabled) {
    $('live-sound').checked=enabled; this.sync();
    if(enabled) await this.activate();
    this.sync();
  }
  persist() {try {localStorage.setItem('piano-sight-reader-sound',JSON.stringify(Object.fromEntries(ids.map(id=>[id,$(id).type==='checkbox' ? $(id).checked : $(id).value]))));} catch { /* Session still works. */ }}
  async activate() {
    try {
      if(!this.engine) {const Context=window.AudioContext||window.webkitAudioContext; if(!Context) throw new Error('Web Audio is unavailable'); this.engine=new LocalAudio(new Context({latencyHint:'interactive'})); this.configure();}
      if(this.engine.context.state!=='running') await this.engine.context.resume();
      if(this.engine.context.state!=='running') throw new Error('Browser audio is suspended');
      $('sound-status').textContent=''; return true;
    } catch(error) {$('sound-status').textContent='Sound could not start: '+error.message; $('live-sound').checked=false; $('metronome').checked=false; this.sync(); return false;}
  }
  configure() {
    $('hear-target').disabled=!$('reference-sound').checked;
    if(!this.engine) return;
    this.engine.live.configure($('live-instrument').value,+$('live-volume').value/100);
    this.engine.reference.configure($('reference-instrument').value,+$('reference-volume').value/100);
    this.engine.clickGain.gain.setTargetAtTime(+$('click-volume').value/100,this.engine.context.currentTime,.015);
    if(!$('reference-sound').checked) this.engine.reference.stop();
    this.sync(); this.onConfigure();
  }
  sync() {$('hear-live').setAttribute('aria-pressed',String($('live-sound').checked)); if(this.engine) this.engine.live.sync($('live-sound').checked ? this.getPitches() : [],this.getAttacks());}
  pump() {this.clock.pump(this.engine.context.currentTime,event=>this.engine.click(event));}
  stopClock() {this.revision++; this.clock.stop(); this.engine?.stopClicks(); clearInterval(this.timer); this.timer=null; $('metronome').checked=false;}
  panic() {this.onReferenceStop(); this.stopClock(); if(this.engine) this.engine.panic(); $('live-sound').checked=false; this.sync();}
}
