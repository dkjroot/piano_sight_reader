import {AttemptTracker,cleanHistory,summary,exerciseIdentity,grouped,daily} from './metrics.js';
const $=id=>document.getElementById(id);
const STORE='piano-sight-reader-history-v1', PREF='piano-sight-reader-save-history';
const seconds=value=>value===null ? '—' : (value/1000).toFixed(2)+' s';
export class ProgressPanel {
  constructor() {
    this.tracker=new AttemptTracker(); this.records=[]; this.identity=''; this.saveTimer=null;
    try {this.records=cleanHistory(JSON.parse(localStorage.getItem(STORE)||'[]')); $('save-history').checked=localStorage.getItem(PREF)==='true';} catch { $('history-status').textContent='Saved history is unavailable; session measurements still work.'; }
    $('save-history').addEventListener('change',()=>{try {localStorage.setItem(PREF,String($('save-history').checked));} catch {} this.scheduleSave();});
    $('analysis-dimension').addEventListener('change',()=>this.render());
    $('clear-history').addEventListener('click',()=>{this.records=[]; clearTimeout(this.saveTimer); try {localStorage.removeItem(STORE);} catch {} this.render();});
    $('export-history').addEventListener('click',()=>{
      const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,records:this.records},null,2)],{type:'application/json'}));
      const link=document.createElement('a'); link.href=url; link.download='piano-progress-'+new Date().toISOString().slice(0,10)+'.json'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    this.render();
  }
  start(notes,settings,phrase) {
    this.identity=exerciseIdentity(notes,settings,phrase);
    const context={identity:this.identity,key:settings.key,hand:settings.hand,source:settings.source||'random',mode:settings.endAction};
    this.tracker.start(notes,context); if (document.hidden || !document.hasFocus()) this.tracker.pause(); this.renderBest();
  }
  observe(held) {this.tracker.observe(held);}
  complete() {
    const record=this.tracker.finish(); if (!record) return;
    this.records.push(record); this.records=this.records.slice(-1000);
    this.scheduleSave(); setTimeout(()=>this.render(),0);
  }
  pause() {this.tracker.pause();}
  resume() {this.tracker.resume();}
  scheduleSave() {
    clearTimeout(this.saveTimer);
    if (!$('save-history').checked) return;
    this.saveTimer=setTimeout(()=>{try {localStorage.setItem(STORE,JSON.stringify(this.records)); $('history-status').textContent='';} catch {$('history-status').textContent='History could not be saved; export it to keep this session.';}},200);
  }
  renderBest() {
    const best=this.records.filter(r=>r.context.identity===this.identity && r.firstAttemptCorrect).map(r=>r.responseMs);
    $('stats-best').textContent=seconds(best.length ? Math.min(...best) : null);
  }
  render() {
    const stats=summary(this.records);
    $('stats-count').textContent=stats.count;
    $('stats-mean').textContent=seconds(stats.mean);
    $('stats-median').textContent=seconds(stats.median);
    $('stats-accuracy').textContent=stats.accuracy===null ? '—' : Math.round(stats.accuracy*100)+'%';
    this.renderBest();
    const body=$('analysis-rows'); body.replaceChildren();
    for (const row of grouped(this.records,$('analysis-dimension').value).slice(0,40)) {
      const tr=document.createElement('tr');
      for (const value of [row.label,row.count,Math.round(row.accuracy*100)+'%',seconds(row.median)]) {const td=document.createElement('td'); td.textContent=value; tr.append(td);}
      body.append(tr);
    }
    const days=daily(this.records), peak=Math.max(1,...days.map(day=>day.median));
    const points=days.map((day,i)=>`${30+i*(580/Math.max(1,days.length-1))},${110-day.median/peak*90}`).join(' ');
    $('progress-chart').innerHTML=days.length ? `<svg viewBox="0 0 640 140" role="img" aria-label="Daily median response time across ${days.length} days"><path d="M30 10V110H620" class="chart-axis"/><polyline points="${points}" class="chart-line"/>${days.map((day,i)=>`<circle cx="${30+i*(580/Math.max(1,days.length-1))}" cy="${110-day.median/peak*90}" r="4" class="chart-point"/>`).join('')}<text x="30" y="135">${days[0].day}</text><text x="610" y="135" text-anchor="end">${days.at(-1).day}</text></svg>` : '';
  }
}
