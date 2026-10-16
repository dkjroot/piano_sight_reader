// Local file inspection is separate from the live MIDI event path.
const $=id=>document.getElementById(id);
export class ScorePanel {
  constructor(onLoad=()=>{}) {
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
        onLoad(result);
      } catch(error) {if(revision===this.revision) $('score-status').textContent='Import failed: '+error.message;}
    });
    $('export-score').addEventListener('click',()=>{
      if(!this.score) return;
      const blob=new Blob([JSON.stringify(this.score,null,2)],{type:'application/json'}), url=URL.createObjectURL(blob), link=document.createElement('a');
      link.href=url; link.download='midi-inspection.json'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
  }
}
