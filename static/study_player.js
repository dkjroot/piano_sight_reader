import {LocalAudio} from './audio.js';
import {PlaybackCursor} from './transport.js';
import {authoredPlan} from './score_transport.js';
const $=id=>document.getElementById(id);
export class StudyPlayer {
  constructor(score,onPosition) {
    this.score=score; this.onPosition=onPosition; this.engine=null; this.cursor=new PlaybackCursor(); this.timer=null; this.revision=0; this.position=0; this.lastIndex=-1; this.loading=false;
    try {
      const saved=JSON.parse(localStorage.getItem('piano-sight-reader-sound')||'{}');
      if(['piano','organ','acoustic'].includes(saved['reference-instrument'])) $('study-instrument').value=saved['reference-instrument'];
      if(Number.isFinite(+saved['reference-volume'])) $('study-volume').value=Math.max(0,Math.min(100,+saved['reference-volume']));
    } catch {}
    this.plan=authoredPlan(score);
    $('study-play').addEventListener('click',()=>void this.play()); $('study-pause').addEventListener('click',()=>this.pause()); $('study-stop').addEventListener('click',()=>this.stop());
    for(const id of ['study-instrument','study-speed']) $(id).addEventListener('change',()=>{this.stop(); this.plan=authoredPlan(score,{speed:+$('study-speed').value});});
    $('study-volume').addEventListener('input',()=>this.configure());
    window.addEventListener('blur',()=>this.pause()); document.addEventListener('visibilitychange',()=>{if(document.hidden) this.pause();});
    window.addEventListener('pagehide',()=>this.stop()); this.refresh();
  }
  configure() {this.engine?.reference.configure($('study-instrument').value,+$('study-volume').value/100);}
  refresh() {
    $('study-play').disabled=this.loading || this.cursor.state==='playing';
    $('study-play').textContent=this.cursor.state==='paused' ? 'Resume study' : 'Play study';
    $('study-pause').disabled=this.cursor.state!=='playing'; $('study-stop').disabled=!this.loading && this.cursor.state==='stopped' && !this.position;
  }
  async play() {
    const revision=++this.revision; this.loading=true; this.refresh();
    try {
      if(!this.engine) {const Context=window.AudioContext||window.webkitAudioContext; if(!Context) throw new Error('Web Audio is unavailable.'); this.engine=new LocalAudio(new Context({latencyHint:'interactive'}));}
      if(this.engine.context.state!=='running') await this.engine.context.resume();
      if(this.engine.context.state!=='running') throw new Error('Browser audio is suspended.');
      this.configure();
      if($('study-instrument').value==='acoustic') {$('study-audio-status').textContent='Loading acoustic piano…'; await this.engine.samples.load();}
      if(revision!==this.revision) return;
      this.engine.reference.stop();
      if(this.position>=this.plan.duration) this.position=0;
      this.cursor.play(this.plan,this.engine.context.currentTime,this.position); this.lastIndex=-1;
      this.pump(); this.timer=setInterval(()=>this.pump(),25);
    } catch(error) {if(revision===this.revision) {this.silence(); $('study-audio-status').textContent='Playback could not start: '+error.message;}}
    finally {if(revision===this.revision) {this.loading=false; this.refresh();}}
  }
  pump() {
    const now=this.engine.context.currentTime;
    this.cursor.pump(now,note=>this.engine.reference.noteOn(note.pitch,note.time,note.duration,note.id,note.velocity/127));
    this.position=this.cursor.at(now);
    let low=0,high=this.plan.moments.length;
    while(low<high) {const middle=(low+high)>>>1; if(this.plan.moments[middle].time<=this.position) low=middle+1; else high=middle;}
    const index=this.plan.moments[Math.max(0,low-1)].index;
    if(index!==this.lastIndex) {this.lastIndex=index; this.onPosition(index);}
    $('study-audio-status').textContent=this.cursor.state==='ended' ? 'Finished' : `Playing · ${this.position.toFixed(1)} / ${this.plan.duration.toFixed(1)} s`;
    if(this.cursor.state==='ended') {this.silence(); this.refresh();}
  }
  silence() {clearInterval(this.timer); this.timer=null; this.engine?.reference.stop();}
  pause() {
    this.revision++; this.loading=false;
    if(this.cursor.state==='playing') {this.cursor.pause(this.engine.context.currentTime); this.position=this.cursor.position; $('study-audio-status').textContent='Paused';}
    else if(this.cursor.state==='stopped') $('study-audio-status').textContent='';
    this.silence(); this.refresh();
  }
  stop() {this.revision++; this.loading=false; this.silence(); this.cursor.stop(); this.position=0; this.lastIndex=-1; $('study-audio-status').textContent=''; this.onPosition(0); this.refresh();}
  seek(index) {
    this.stop(); const point=this.plan.moments.find(point=>point.index===index);
    this.position=point?.time??0; this.onPosition(point?.index??0); this.refresh();
  }
}
