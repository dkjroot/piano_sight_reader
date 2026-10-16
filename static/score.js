import {parsePassages,savePassage,passageKey} from './passages.js';
import {attackGroups,makeOutline} from './outline.js';
// Local file inspection is separate from the live MIDI event path.
const $=id=>document.getElementById(id);
const PASSAGES='piano-sight-reader-passages-v1';
export class ScorePanel {
  constructor(onPractice=()=>{},getSettings=()=>({low:48,high:84,hand:'right',material:'white',span:'near',size:1,key:'C'})) {
    this.getSettings=getSettings;
    this.score=null; this.revision=0; this.trackControls=[]; this.onPassageChange=()=>{}; this.savedPassages=[];
    try {this.savedPassages=parsePassages(localStorage.getItem(PASSAGES)||'[]');} catch {$('passage-status').textContent='Saved passages are unavailable; this visit still works.';}
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
        $('export-score').disabled=false; this.drawTracks();
        const count=attackGroups(result).length;
        for(const id of ['passage-start','passage-end']) {$(id).disabled=!count; $(id).max=Math.max(1,count);}
        $('passage-start').value=1; $('passage-end').value=Math.min(512,count)||1; $('passage-name').value=''; this.refresh(); this.renderPassages(); this.onPassageChange();
      } catch(error) {if(revision===this.revision) $('score-status').textContent='Import failed: '+error.message;}
    });
    for(const id of ['passage-start','passage-end']) $(id).addEventListener('change',()=>this.editPassage());
    $('practice-score').addEventListener('click',()=>{const outline=this.refresh(); if(outline?.targets.length) onPractice(this.score,{start:outline.start,end:outline.end,tracks:this.rules()},this.filename);});
    $('save-passage').addEventListener('click',()=>{
      const outline=this.refresh(); if(!outline?.totalOnsets) return;
      try {
        const entry={version:1,hash:this.score.sha256,label:$('passage-name').value.trim()||`Attacks ${outline.start}–${outline.end}`,filename:this.filename,start:outline.start,end:outline.end,tracks:this.rules(),updatedAt:new Date().toISOString()};
        this.savedPassages=savePassage(this.savedPassages,entry); const saved=this.persistPassages(); this.renderPassages(); $('saved-passages').value=passageKey(entry); $('delete-passage').disabled=false;
        $('passage-status').textContent=saved ? 'Passage saved locally.' : 'Saved for this visit; browser storage is unavailable.';
      } catch(error) {$('passage-status').textContent=error.message;}
    });
    $('saved-passages').addEventListener('change',()=>this.usePassage());
    $('delete-passage').addEventListener('click',()=>{
      const key=$('saved-passages').value; if(!key) return;
      this.savedPassages=this.savedPassages.filter(entry=>passageKey(entry)!==key); const saved=this.persistPassages(); this.renderPassages();
      $('passage-status').textContent=saved ? 'Passage deleted.' : 'Deleted for this visit; browser storage could not update.';
    });
    window.addEventListener('storage',event=>{
      if(event.key!==PASSAGES && event.key!==null) return;
      try {this.savedPassages=parsePassages(event.newValue||'[]'); this.renderPassages();} catch {$('passage-status').textContent='Saved passages could not be read.';}
    });
    this.renderPassages();
    $('export-score').addEventListener('click',()=>{
      if(!this.score) return;
      const blob=new Blob([JSON.stringify(this.score,null,2)],{type:'application/json'}), url=URL.createObjectURL(blob), link=document.createElement('a');
      link.href=url; link.download='midi-inspection.json'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
  }
  persistPassages() {try {localStorage.setItem(PASSAGES,JSON.stringify(this.savedPassages)); return true;} catch {return false;}}
  renderPassages() {
    const select=$('saved-passages'), selected=select.value;
    const entries=this.score ? this.savedPassages.filter(entry=>entry.hash===this.score.sha256).reverse() : [];
    select.replaceChildren(new Option('Choose a saved passage',''),...entries.map(entry=>new Option(`${entry.label} · ${entry.start}–${entry.end}`,passageKey(entry))));
    if([...select.options].some(option=>option.value===selected)) select.value=selected;
    select.disabled=!entries.length; $('delete-passage').disabled=!select.value;
  }
  editPassage() {$('saved-passages').value=''; $('delete-passage').disabled=true; this.refresh(); this.onPassageChange();}
  usePassage() {
    const entry=this.savedPassages.find(item=>passageKey(item)===$('saved-passages').value);
    $('delete-passage').disabled=!entry;
    if(!entry || entry.hash!==this.score?.sha256) return;
    if(entry.end>attackGroups(this.score).length || entry.tracks.some(rule=>!this.score.tracks.some(track=>track.index===rule.track))) {$('passage-status').textContent='Saved range or tracks do not match this file.'; return;}
    $('passage-start').value=entry.start; $('passage-end').value=entry.end; $('passage-name').value=entry.label;
    for(const control of this.trackControls) {const rule=entry.tracks.find(rule=>rule.track===control.track); control.include.checked=!!rule?.enabled && !control.include.disabled; control.staff.value=rule?.staff||'auto';}
    this.refresh(); this.onPassageChange(); $('passage-status').textContent='Passage restored to preview.';
  }
  rules() {return this.trackControls.map(control=>({track:control.track,enabled:control.include.checked,staff:control.staff.value}));}
  drawTracks() {
    const counts=new Map(); for(const note of this.score.notes) if(note.channel!==9) counts.set(note.track,(counts.get(note.track)||0)+1);
    const container=$('score-tracks'); container.replaceChildren(); this.trackControls=[];
    for(const track of this.score.tracks) {
      const count=counts.get(track.index)||0, row=document.createElement('div'), label=document.createElement('label'), include=document.createElement('input'), name=document.createElement('span'), staff=document.createElement('select');
      row.className='score-track'; label.className='check'; include.type='checkbox'; include.id='score-track-'+track.index; include.checked=!!count; include.disabled=!count;
      name.textContent=`${track.name} · ${count} piano attacks`; label.append(include,name);
      staff.id='score-staff-'+track.index; staff.setAttribute('aria-label','Staff for '+track.name); staff.disabled=!count;
      staff.append(new Option('Infer from middle C','auto'),new Option('Treble','treble'),new Option('Bass','bass'));
      for(const input of [include,staff]) input.addEventListener('change',()=>this.editPassage());
      row.append(label,staff); container.append(row); this.trackControls.push({track:track.index,include,staff});
    }
  }
  refresh() {
    if(!this.score) return null;
    const outline=makeOutline(this.score,this.getSettings(),{start:+$('passage-start').value,end:+$('passage-end').value,tracks:this.rules()});
    $('passage-start').value=outline.start; $('passage-end').value=outline.end;
    $('practice-score').disabled=!outline.targets.length;
    $('save-passage').disabled=!outline.totalOnsets || !this.rules().some(rule=>rule.enabled);
    $('outline-status').textContent=outline.targets.length ? `${outline.targets.length} targets · ${outline.retainedNotes} source notes retained · ${outline.omittedNotes} omitted` : 'No eligible attacks. Widen the range or change the pitch/hand settings.';
    return outline;
  }
}
