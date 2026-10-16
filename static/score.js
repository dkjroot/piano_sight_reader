import {attackGroups,makeOutline} from './outline.js';
// Local file inspection is separate from the live MIDI event path.
const $=id=>document.getElementById(id);
export class ScorePanel {
  constructor(onPractice=()=>{},getSettings=()=>({low:48,high:84,hand:'right',material:'white',span:'near',size:1,key:'C'})) {
    this.getSettings=getSettings;
    this.score=null; this.revision=0;
    $('score-file').addEventListener('change',async()=>{
      const revision=++this.revision, file=$('score-file').files[0];
      if(!file) return;
      $('score-status').textContent='Reading MIDI…';
      try {
        if(file.size>256000) throw new Error('Choose a MIDI file no larger than 256 KB.');
        const response=await fetch('/api/inspect-midi',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});
        const result=await response.json();
        if(revision!==this.revision) return;
        if(!response.ok) throw new Error(result.error||'MIDI could not be read.');
        this.score=result; this.filename=file.name;
        $('score-status').textContent=`${file.name} · ${result.notes.length} attacks · ${result.tracks.length} tracks · ${result.duration_seconds.toFixed(1)} s${result.warning_count ? ' · '+result.warning_count+' warnings' : ''}`;
        $('score-details').textContent=result.tracks.map(track=>track.name).join(' · ');
        $('score-warnings').textContent=result.warnings.join(' ');
        $('export-score').disabled=false;
        const count=attackGroups(result).length;
        for(const id of ['passage-start','passage-end']) {$(id).disabled=!count; $(id).max=Math.max(1,count);}
        $('passage-start').value=1; $('passage-end').value=Math.min(512,count)||1; this.refresh();
      } catch(error) {if(revision===this.revision) $('score-status').textContent='Import failed: '+error.message;}
    });
    for(const id of ['passage-start','passage-end']) $(id).addEventListener('change',()=>this.refresh());
    $('practice-score').addEventListener('click',()=>{const outline=this.refresh(); if(outline?.targets.length) onPractice(this.score,{start:outline.start,end:outline.end},this.filename);});
    $('export-score').addEventListener('click',()=>{
      if(!this.score) return;
      const blob=new Blob([JSON.stringify(this.score,null,2)],{type:'application/json'}), url=URL.createObjectURL(blob), link=document.createElement('a');
      link.href=url; link.download='midi-inspection.json'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
  }
  refresh() {
    if(!this.score) return null;
    const outline=makeOutline(this.score,this.getSettings(),{start:+$('passage-start').value,end:+$('passage-end').value});
    $('passage-start').value=outline.start; $('passage-end').value=outline.end;
    $('practice-score').disabled=!outline.targets.length;
    $('outline-status').textContent=outline.targets.length ? `${outline.targets.length} targets · ${outline.retainedNotes} source notes retained · ${outline.omittedNotes} omitted` : 'No eligible attacks. Widen the range or change the pitch/hand settings.';
    return outline;
  }
}
