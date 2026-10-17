import {Performance,noteName,spell,match} from './core.js';
import {ScorePractice} from './score_practice.js';
import {keyboardGeometry} from './keyboard.js';
const $=id=>document.getElementById(id);
export class StudyPractice {
  constructor(score,engraver,show,stopPlayback) {
    Object.assign(this,{score,engraver,show,stopPlayback}); this.input=new Performance(); this.gate=null; this.port=null; this.revision=0; this.access=null;
    const bySegment=new Map(score.sounds.flatMap(sound=>sound.segments.map(id=>[id,sound])));
    this.written=new Map(score.notes.map(note=>[note.id,{note,sound:bySegment.get(note.id)}])); this.visibleWritten=new Set(); this.lastKeys=new Set();
    let range={low:48,high:84};
    try {range={...range,...JSON.parse(localStorage.getItem('piano-sight-reader-v1')||'{}'),...JSON.parse(localStorage.getItem('piano-sight-reader-study-range')||'{}')}; $('study-inverted').checked=localStorage.getItem('piano-sight-reader-keyboard-inverted')==='true';} catch {}
    $('study-low').value=range.low; $('study-high').value=range.high;
    this.drawKeyboard();
    for(const id of ['study-low','study-high']) $(id).addEventListener('change',()=>{
      if(+$('study-low').value>+$('study-high').value) $(id==='study-low'?'study-high':'study-low').value=$(id).value;
      this.drawKeyboard(); try {localStorage.setItem('piano-sight-reader-study-range',JSON.stringify({low:+$('study-low').value,high:+$('study-high').value}));} catch {}
      this.paint(true);
    });
    $('study-inverted').addEventListener('change',()=>{this.invertKeyboard(); try {localStorage.setItem('piano-sight-reader-keyboard-inverted',String($('study-inverted').checked));} catch {}});
    this.invertKeyboard();
    this.bindControls();
  }
  invertKeyboard() {$('study-keyboard').dataset.inverted=String($('study-inverted').checked);}
  drawKeyboard() {
    for(const id of [...this.input.sources.keys()]) if(id.startsWith('pointer:') || id.startsWith('key:')) this.input.clear(id);
    const low=Math.max(0,Math.min(127,Math.trunc(+$('study-low').value)||0)), high=Math.max(low,Math.min(127,Math.trunc(+$('study-high').value)||0));
    $('study-low').value=low; $('study-high').value=high;
    const geometry=keyboardGeometry(low,high); $('study-keyboard').replaceChildren(); $('study-keyboard').style.width='100%'; this.keys=new Map();
    $('study-keyboard').style.minWidth=Math.max(540,geometry.units*20)+'px';
    for(const {pitch,white,left} of geometry.keys) {
      const key=document.createElement('button'); key.className='key '+(white?'white':'black'); key.dataset.pitch=pitch;
      this.keys.set(pitch,key);
      key.style.left=100*left/geometry.units+'%'; key.style.width=100*(white?1:22/36)/geometry.units+'%';
      key.setAttribute('aria-label',noteName(spell(pitch))); key.innerHTML='<span class="study-key-mark"></span><span class="study-key-direction"></span>';
      key.addEventListener('pointerdown',event=>{event.preventDefault(); key.setPointerCapture(event.pointerId); this.event(()=>this.input.noteOn('pointer:'+event.pointerId,pitch));});
      for(const name of ['pointerup','pointercancel','lostpointercapture']) key.addEventListener(name,event=>this.event(()=>this.input.clear('pointer:'+event.pointerId)));
      key.addEventListener('keydown',event=>{if([' ','Enter'].includes(event.key)) {event.preventDefault(); if(!event.repeat) this.event(()=>this.input.noteOn('key:'+pitch,pitch));}});
      key.addEventListener('keyup',event=>{if([' ','Enter'].includes(event.key)) {event.preventDefault(); this.event(()=>this.input.clear('key:'+pitch));}});
      key.addEventListener('blur',()=>this.event(()=>this.input.clear('key:'+pitch))); $('study-keyboard').append(key);
    }
  }
  bindControls() {
    const score=this.score;
    $('study-practise').addEventListener('click',()=>this.start());
    $('study-practice-pause').addEventListener('click',()=>{if(this.gate?.state==='paused') this.gate.resume(this.input,performance.now()/1000); else this.gate?.pause(); this.paint();});
    $('study-practice-stop').addEventListener('click',()=>this.stop());
    $('study-midi-connect').addEventListener('click',()=>void this.connect());
    $('study-midi-input').addEventListener('change',()=>void this.choose());
    for(const id of ['study-continuity','study-loop','study-speed','study-loop-start','study-loop-end']) $(id).addEventListener('change',()=>this.stop());
    for(let i=0;i<score.moments.length;i++) {
      const point=score.moments[i], label=point.at.join('/');
      if(i<score.moments.length-1) $('study-loop-start').add(new Option(label,i));
      if(i>0) $('study-loop-end').add(new Option(label,i));
    }
    $('study-loop-end').value=score.moments.length-1;
    this.timer=setInterval(()=>{if(this.gate && !['paused','ended','stopped'].includes(this.gate.state)) {this.gate.update(this.input,performance.now()/1000); this.paint();}},16);
    const suspend=()=>{this.gate?.pause(); for(const id of [...this.input.sources.keys()]) if(id.startsWith('key:') || id.startsWith('pointer:')) this.input.clear(id); this.paint();};
    window.addEventListener('blur',suspend); document.addEventListener('visibilitychange',()=>{if(document.hidden) suspend();});
    window.addEventListener('pagehide',()=>{this.disposed=true; this.revision++; if(this.access) this.access.onstatechange=null; clearInterval(this.timer); this.stop(); this.detach();});
    this.paint();
  }
  start() {
    this.stopPlayback();
    try {
      this.gate=new ScorePractice(this.score,{speed:+$('study-speed').value,policy:$('study-continuity').value,loop:$('study-loop').checked,start:+$('study-loop-start').value,end:+$('study-loop-end').value});
      this.gate.begin(this.input,performance.now()/1000); this.paint();
    } catch(error) {$('study-practice-status').textContent=error.message;}
  }
  stop() {this.gate?.stop(); this.gate=null; this.paint();}
  event(change) {
    const now=performance.now()/1000; this.gate?.update(this.input,now); change(); this.gate?.update(this.input,now); this.paint();
  }
  paint(force=false) {
    const gate=this.gate, result=gate?.result, held=this.input.held, sustained=this.input.sustained;
    const stamp=JSON.stringify([[...held],[...sustained],gate?.state,gate?.index,gate?.remaining?.toFixed(1),result?.missing,result?.early,result?.extra,result?.reset,gate?.counts]);
    if(!force && stamp===this.stamp) return; this.stamp=stamp;
    if(gate && (force || this.shownIndex!==gate.index)) {this.show(gate.index); this.shownIndex=gate.index;}
    if(!gate) this.shownIndex=null;
    const hints=result?.expected ? match([...result.expected].map(midi=>({midi})),held).hints : [];
    const visibleKeys=new Set([...held,...sustained,...hints.map(hint=>hint.played)]);
    for(const pitch of new Set([...this.lastKeys,...visibleKeys])) {
      const key=this.keys.get(pitch); if(!key) continue;
      const extra=result?.extra?.includes(pitch), down=held.has(pitch), ringing=sustained.has(pitch);
      key.classList.toggle('held',down); key.classList.toggle('extra',down&&!!extra); key.classList.toggle('correct',down&&!extra); key.classList.toggle('sustained',ringing);
      key.classList.toggle('wrong',down&&!!extra);
      const direction=hints.find(hint=>hint.played===pitch)?.direction;
      key.querySelector('.study-key-mark').textContent=down ? extra?'×':'✓' : ringing?'≈':'';
      key.querySelector('.study-key-direction').textContent=direction==='up'?'↑':direction==='down'?'↓':'';
    }
    this.lastKeys=visibleKeys;
    const visibleWritten=new Set(this.engraver.active.keys());
    for(const id of new Set([...this.visibleWritten,...visibleWritten])) {
      const {note,sound}=this.written.get(id);
      const node=this.engraver.nodes.get(note.id);
      const accepted=!!gate?.credits.has(sound.id) && (held.has(sound.midi) || (gate.policy==='pedal' && sustained.has(sound.midi))) && node.dataset.scoreState!=='';
      node.dataset.practice=accepted?'accepted':'';
      const direction=node.dataset.scoreState ? hints.find(hint=>hint.target===note.midi)?.direction : null;
      node.querySelector('[data-score-direction]').textContent=direction==='up'?'↑':direction==='down'?'↓':'';
      node.setAttribute('aria-label',noteName(note)+' · '+sound.voiceId+(accepted?' · ✓ accepted':''));
    }
    this.visibleWritten=visibleWritten;
    $('study-practice-pause').disabled=!gate || gate.state==='ended'; $('study-practice-stop').disabled=!gate;
    $('study-practice-pause').textContent=gate?.state==='paused'?'Resume practice':'Pause practice';
    const names=ids=>[...new Set(ids.map(id=>noteName(gate.notes.get(id))))].join(', ');
    let text='';
    if(gate) {
      if(gate.state==='ended') text='✓ Passage complete';
      else if(gate.state==='paused') text='Paused · resume with fresh attacks';
      else if(result?.reset) text='Release keys and pedal to enter the passage';
      else {
        const messages=[];
        if(result.missing.length) messages.push('Play '+names(result.missing));
        if(result.early.length) messages.push('Hold again '+names(result.early));
        if(result.extra.length) messages.push('Release '+result.extra.map(pitch=>noteName(spell(pitch))).join(', '));
        text=messages.join(' · ') || '✓ Hold · '+gate.remaining.toFixed(1)+' s';
      }
      text+=` · Short holds ${gate.counts.earlyRelease} · Extra notes ${gate.counts.extra}`;
    }
    $('study-practice-status').textContent=text;
  }
  detach() {const port=this.port; this.port=null; if(port) {port.onmidimessage=null; void port.close().catch(()=>{});}}
  async choose() {
    const revision=++this.revision; this.detach(); this.gate?.pause(); this.input.clear(); this.paint();
    const port=this.access?.inputs.get($('study-midi-input').value);
    if(!port || port.state==='disconnected') {$('study-midi-status').textContent='No MIDI input'; return;}
    this.port=port;
    try {
      await port.open(); if(revision!==this.revision || this.port!==port) {if(this.port!==port) await port.close(); return;}
      port.onmidimessage=event=>{
        if(revision!==this.revision || this.port!==port) return;
        // Keep physical ownership while inactive, without judgement or feedback.
        // Resume can then require real releases instead of trusting duplicate ons.
        if(document.hidden || !document.hasFocus()) {this.input.midi(port.id,event.data); return;}
        this.event(()=>this.input.midi(port.id,event.data));
      };
      $('study-midi-status').textContent='Connected · '+(port.name||'MIDI input');
    } catch(error) {if(revision===this.revision) {this.detach(); $('study-midi-status').textContent='MIDI could not open: '+error.message;}}
  }
  async connect() {
    if(this.connecting) return; this.connecting=true;
    try {
      if(!navigator.requestMIDIAccess) throw new Error('Web MIDI is unavailable in this browser.');
      if(!this.access) {
        this.access=await navigator.requestMIDIAccess({sysex:false}); if(this.disposed) return;
        this.access.onstatechange=()=>{
          if(this.port && (this.port.state==='disconnected' || this.access.inputs.get(this.port.id)!==this.port)) void this.choose();
          this.listInputs();
        };
      }
      this.listInputs(); await this.choose();
    } catch(error) {$('study-midi-status').textContent='MIDI could not connect: '+error.message;}
    finally {this.connecting=false;}
  }
  listInputs() {
    const select=$('study-midi-input'), previous=select.value; select.replaceChildren();
    for(const port of this.access.inputs.values()) if(port.state!=='disconnected') select.add(new Option(port.name||'MIDI input',port.id));
    if([...select.options].some(option=>option.value===previous)) select.value=previous;
  }
}
