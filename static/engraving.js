import {compareBeat} from './score_model.js';
import {noteName} from './core.js';

const accidental={[-2]:'bb',[-1]:'b',0:'',1:'#',2:'##'};
// VexFlow runs only when laying out an authored score, never on the MIDI input path.
export class ScoreEngraver {
  constructor(container,engine=globalThis.VexFlow) {this.container=container; this.engine=engine; this.nodes=new Map(); this.active=new Map(); this.onSelect=()=>{}; this.renderCount=0;}
  draw(score) {
    const V=this.engine;
    if(!V) throw new Error('The local notation engine is unavailable.');
    if(score.staves.length!==2 || score.measures.length>8 || score.events.length>128 || score.events.some(event=>event.staffId!==score.voices.find(voice=>voice.id===event.voiceId).staff)) throw new Error('This notation preview supports up to eight measures and 128 events on two fixed staves.');
    this.score=score; this.nodes.clear(); this.active.clear(); this.container.replaceChildren();
    const width=Math.max(560,this.container.clientWidth), columns=width>=1000 ? 2 : 1, measureWidth=(width-30)/columns;
    const height=Math.ceil(score.measures.length/columns)*300+30;
    const factory=new V.Factory({renderer:{elementId:this.container.id,width,height}});
    const context=factory.getContext(); context.setFillStyle('currentColor'); context.setStrokeStyle('currentColor');
    const noteToEvent=new Map();
    for(const [index,measure] of score.measures.entries()) {
      const system=factory.System({x:15+(index%columns)*measureWidth,y:20+Math.floor(index/columns)*300,width:measureWidth,spaceBetweenStaves:12});
      const row=Math.floor(index/columns), byVoice=new Map(), tuples=new Map();
      for(const voice of score.voices) {
        const events=measure.events.filter(event=>event.voiceId===voice.id).sort((a,b)=>compareBeat(a.start,b.start));
        const staveNotes=events.map(event=>{
          const staff=score.staves.find(staff=>staff.id===event.staffId);
          const keys=event.kind==='rest' ? [staff.clef==='bass' ? 'd/3' : 'b/4'] : event.notes.map(note=>`${note.letter.toLowerCase()}${accidental[note.accidental]}/${note.octave}`);
          const node=factory.StaveNote({clef:staff.clef,keys,duration:event.value+'d'.repeat(event.dots??0)+(event.kind==='rest' ? 'r' : ''),stemDirection:voice.stem==='down' ? V.Stem.DOWN : V.Stem.UP});
          for(let dot=0;dot<(event.dots??0);dot++) V.Dot.buildAndAttach([node],{all:true});
          event.notes.forEach((note,keyIndex)=>noteToEvent.set(note.id,{node,event,keyIndex,row}));
          if(event.tuplet) {if(!tuples.has(event.tuplet.group)) tuples.set(event.tuplet.group,[]); tuples.get(event.tuplet.group).push({node,event});}
          return node;
        });
        byVoice.set(voice.id,{voice:factory.Voice({time:{numBeats:measure.length[0],beatValue:measure.length[1]*4}}),notes:staveNotes,events});
      }
      for(const group of tuples.values()) {
        const rule=group[0].event.tuplet;
        factory.Tuplet({notes:group.map(item=>item.node),options:{numNotes:rule.actual,notesOccupied:rule.normal,bracketed:true}});
        if(group.every(item=>item.event.kind==='note' && +item.event.value>=8)) factory.Beam({notes:group.map(item=>item.node)});
      }
      for(const line of byVoice.values()) {
        line.voice.addTickables(line.notes);
        let beam=[], beatGroup=null;
        const flush=()=>{if(beam.length>1) factory.Beam({notes:beam}); beam=[];};
        line.events.forEach((event,i)=>{
          const group=Math.floor(event.at[0]/event.at[1]);
          if(event.kind!=='note' || event.tuplet || !(+event.value>=8)) {flush(); beatGroup=null; return;}
          if(group!==beatGroup) flush(); beatGroup=group; beam.push(line.notes[i]);
        });
        flush();
      }
      for(const staff of score.staves) {
        const voices=score.voices.filter(voice=>voice.staff===staff.id).map(voice=>byVoice.get(voice.id).voice);
        const stave=system.addStave({voices});
        if(index%columns===0) stave.addClef(staff.clef);
        if(index%columns===0 || measure.key!==score.measures[index-1]?.key) stave.addKeySignature(measure.key);
        if(!index || measure.meter.join('/')!==score.measures[index-1].meter.join('/')) stave.addTimeSignature(measure.meter.join('/'));
      }
      if(index%columns===0) system.addConnector('brace');
      system.addConnector('singleLeft'); system.addConnector('singleRight');
      for(const staff of score.staves) V.Accidental.applyAccidentals(score.voices.filter(voice=>voice.staff===staff.id).map(voice=>byVoice.get(voice.id).voice),measure.key);
    }
    for(const tie of score.source.ties??[]) {
      const from=noteToEvent.get(tie.from), to=noteToEvent.get(tie.to);
      if(from.row===to.row) factory.StaveTie({from:from.node,to:to.node,firstIndexes:[from.keyIndex],lastIndexes:[to.keyIndex]});
      else {
        factory.StaveTie({from:from.node,firstIndexes:[from.keyIndex],lastIndexes:[to.keyIndex]});
        factory.StaveTie({to:to.node,firstIndexes:[from.keyIndex],lastIndexes:[to.keyIndex]});
      }
    }
    factory.draw();
    const svg=this.container.querySelector('svg');
    for(const element of [svg,...svg.querySelectorAll('*')]) for(const property of ['fill','stroke']) {
      if(/^(black|#000|#000000)$/i.test(element.getAttribute(property)||'')) element.setAttribute(property,'currentColor');
      if(/^(black|#000|#000000|rgb\(0, 0, 0\))$/i.test(element.style[property])) element.style[property]='currentColor';
    }
    svg.setAttribute('role','group'); svg.setAttribute('aria-label',score.source.title+' grand staff');
    for(const [id,item] of noteToEvent) {
      const element=item.node.noteHeads[item.keyIndex].getSVGElement();
      if(!element) throw new Error('A written note could not be linked to the score.');
      const note=score.notes.find(note=>note.id===id), glyph=element.querySelector('text');
      const hit=document.createElementNS('http://www.w3.org/2000/svg','rect');
      for(const [name,value] of Object.entries({x:+glyph.getAttribute('x')-3,y:+glyph.getAttribute('y')-12,width:item.node.noteHeads[item.keyIndex].getWidth()+6,height:24,'data-note-hit':id})) hit.setAttribute(name,String(value));
      element.append(hit);
      element.dataset.scoreState=''; element.dataset.scoreNote=id; element.setAttribute('tabindex','0'); element.setAttribute('role','button'); element.setAttribute('aria-label',noteName(note)+' · '+note.voiceId);
      element.addEventListener('click',()=>this.onSelect(note));
      element.addEventListener('keydown',event=>{if(event.key==='Enter' || event.key===' ') {event.preventDefault(); this.onSelect(note);}});
      this.nodes.set(id,element);
    }
    this.positions=score.moments.map(moment=>{
      const roles=new Map();
      for(const [ids,role] of [[moment.attacks,'starting'],[moment.continuing,'continuing']]) for(const id of ids) {
        const sound=score.sounds.find(sound=>sound.id===id);
        const segment=sound.segments.map(id=>score.notes.find(note=>note.id===id)).find(note=>compareBeat(note.start,moment.at)<=0 && compareBeat(moment.at,note.end)<0);
        if(segment) roles.set(segment.id,role);
      }
      return roles;
    });
    this.renderCount++; this.container.dataset.renders=String(this.renderCount);
    return svg;
  }
  highlight(index) {
    const roles=this.positions[index]??new Map();
    for(const id of new Set([...this.active.keys(),...roles.keys()])) {
      if(this.active.get(id)===roles.get(id)) continue;
      const node=this.nodes.get(id); node.dataset.scoreState=roles.get(id)??'';
      node.classList.toggle('is-starting',roles.get(id)==='starting'); node.classList.toggle('is-continuing',roles.get(id)==='continuing');
    }
    this.active=roles;
  }
}
