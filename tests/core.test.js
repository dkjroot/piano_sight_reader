import {libraryValue,libraryFacets,filterLibrary} from '../static/library.js';
import {sourceBeats,BeatCursor} from '../static/beats.js';
import {AcousticSamples,nearestSample} from '../static/samples.js';
import {suggestPassages} from '../static/sections.js';
import {FlowGate} from '../static/flow.js';
import {keyboardGeometry,keyboardKeyWidth} from '../static/keyboard.js';
import {cleanPassages,parsePassages,savePassage,passageKey} from '../static/passages.js';
import {secondsAt,referencePlan,PlaybackCursor} from '../static/transport.js';
import {layoutPreset,staffViewport} from '../static/layout.js';
import {attackGroups,makeOutline} from '../static/outline.js';
import {SynthPath,LocalAudio,MetronomeClock} from '../static/audio.js';
import {AttemptTracker,cleanHistory,summary,exerciseIdentity,grouped,daily,dailyPlot,parseHistory,mergeHistory,readingPatterns,clearHistoryPeriod} from '../static/metrics.js';
import {makePracticePhrase, harmonicPitchClasses,cadenceLabels} from '../static/harmony.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {KEYS, keyAlterations, spellInKey, spell, spellChord, noteName, staffStep, candidates, makeTarget, makePhrase, chordName, match, Performance} from '../static/core.js';
import {staffLayout, accidentalLayout, readingWindow} from '../static/notation.js';

const defaults = {low: 48, high: 84, hand: 'right', material: 'white', span: 'near', size: 1};
test('phrases have bounded lengths and varied chord sizes within minimum/maximum', () => {
  let state = 37;
  const random = () => {state = (state*16807)%2147483647; return state/2147483647;};
  const phrase = makePhrase({...defaults, length:32, size:3, 'min-size':1},random);
  assert.equal(phrase.length,32);
  assert.ok(phrase.every(chord => chord.length >= 1 && chord.length <= 3));
  assert.deepEqual([...new Set(phrase.map(chord => chord.length))].sort(),[1,2,3]);
  assert.equal(makePhrase({...defaults,length:100}).length,32);
  assert.ok(makePhrase({...defaults,length:4,size:3,'min-size':3}).every(chord => chord.length === 3));
});
test('chord names recognise exact common voicings, inversions and doublings', () => {
  const name = pitches => chordName(pitches.map(n => spell(n)));
  assert.equal(name([60,64,67]),'C');
  assert.equal(name([60,64,67,71]),'Cmaj7');
  assert.equal(name([60,64,66,71]),'Cmaj7♭5');
  assert.equal(name([62,65,69,72]),'Dm7');
  assert.equal(name([64,67,72]),'C/E');
  assert.equal(name([60,64,67,72]),'C');
  assert.equal(name([60]),'');
  assert.equal(name([60,61,66]),'');
});
test('key signatures alter generated pitches and preserve enharmonic octave spelling', () => {
  assert.deepEqual(candidates({...defaults, key:'G', low:65, high:67}), [66,67]);
  assert.deepEqual(candidates({...defaults, key:'F', low:69, high:71}), [69,70]);
  assert.equal(noteName(spellInKey(59, 'Cb')), 'C♭4');
  assert.equal(noteName(spellInKey(60, 'C#')), 'B♯3');
  assert.equal(spellInKey(65, 'G'), null);
  for (const key of KEYS) {
    const alterations = keyAlterations(key.id);
    assert.equal(Object.values(alterations).filter(Boolean).length, Math.abs(key.fifths));
    const target = makeTarget({...defaults, key:key.id, hand:'both', size:10});
    assert.equal(target.length, 10);
    for (const note of target) assert.equal(note.accidental, alterations[note.letter]);
  }
});
test('D4 D-sharp4 G4 becomes three distinct written notes D4 E-flat4 G4', () => {
  for (const flats of [false, true]) {
    const notes = spellChord([62, 63, 67], flats);
    assert.deepEqual(notes.map(noteName), ['D4', 'E♭4', 'G4']);
    assert.deepEqual(notes.map(n => n.midi), [62, 63, 67]);
  }
  assert.deepEqual(spellChord([61, 62], true).map(noteName), ['C♯4', 'D4']);
  assert.equal(spellChord([62, 63, 64]), null);
});
test('generated chromatic chords never duplicate a written staff position', () => {
  for (const material of ['sharps', 'flats']) for (let i = 0; i < 150; i++) {
    const notes = makeTarget({...defaults, material, size: 10, hand: 'both'});
    assert.equal(new Set(notes.map(staffStep)).size, notes.length);
    for (const n of notes) {
      const pitch = (n.octave+1)*12 + ({C:0,D:2,E:4,F:5,G:7,A:9,B:11})[n.letter] + n.accidental;
      assert.equal(pitch, n.midi);
    }
  }
  const tight = makeTarget({...defaults, low: 62, high: 64, material: 'sharps', size: 3}, () => 0);
  assert.equal(tight.length, 2);
});
test('accidentals share the nearest column unless their vertical extents conflict', () => {
  const notes = [61, 66, 73].map(n => spell(n));
  const positions = new Map(notes.map(n => [n, 352]));
  const yFor = n => 200-staffStep(n)*5;
  const columns = accidentalLayout(notes, positions, yFor);
  assert.equal(columns.get(notes[2]), 335);
  assert.equal(columns.get(notes[0]), 335);
  assert.equal(columns.get(notes[1]), 317);
});
test('staff layout reserves ledger and stem room above, between and below both staves', () => {
  // Written pitches may eventually cross staves; test each extreme on either one.
  for (const pitches of [[0, 127], [60], [21, 108]]) {
    const target = ['treble', 'bass'].flatMap(staff => pitches.map(midi => ({...spell(midi), staff})));
    const layout = staffLayout(target);
    const trebleYs = target.filter(n => n.staff === 'treble').map(layout.yFor);
    const bassYs = target.filter(n => n.staff === 'bass').map(layout.yFor);
    assert.ok(Math.min(...trebleYs) >= 80);
    assert.ok(layout.height - Math.max(...bassYs) >= 80);
    assert.ok(Math.min(...bassYs, layout.bassBottom-40) - Math.max(...trebleYs, layout.trebleBottom) >= 100);
    assert.ok(target.every(n => layout.yFor(n)-32 > 0 && layout.yFor(n)+15 < layout.height));
  }
});
test('written spelling and staff placement are independent of MIDI pitch', () => {
  assert.equal(noteName(spell(61)), 'C♯4');
  assert.equal(noteName(spell(61, true)), 'D♭4');
  assert.equal(staffStep(spell(61, true)) - staffStep(spell(61)), 1);
  assert.equal(noteName({midi: 62, letter: 'C', accidental: 2, octave: 4}), 'C𝄪4');
  assert.equal(noteName({midi: 60, letter: 'D', accidental: -2, octave: 4}), 'D𝄫4');
});
test('generation respects keyboard, material, reading range and hand', () => {
  assert.deepEqual(candidates({...defaults, low: 61, high: 66}), [62, 64, 65]);
  assert.deepEqual(candidates({...defaults, hand: 'left', low: 70}), []);
  assert.deepEqual(makeTarget({...defaults, low: 61, high: 61}), []);
  for (let i = 0; i < 100; i++) {
    const target = makeTarget({...defaults, size: 10, hand: 'both', material: 'flats'});
    assert.equal(target.length, 10);
    assert.equal(new Set(target.map(n => n.midi)).size, 10);
    assert.ok(target.some(n => n.staff === 'bass'));
    assert.ok(target.some(n => n.staff === 'treble'));
    assert.ok(target.every(n => n.midi >= 48 && n.midi <= 72));
  }
  assert.equal(makeTarget({...defaults, low: 60, high: 62, size: 10}).length, 2);
});
test('exact matching rejects extras and requires simultaneous physical notes', () => {
  const target = [60, 64, 67].map(n => spell(n));
  assert.equal(match(target, new Set([60, 64])).complete, false);
  assert.equal(match(target, new Set([60, 64, 67, 69])).complete, false);
  assert.equal(match(target, new Set([60, 64, 67])).complete, true);
  assert.equal(match([], new Set()).complete, false);
});
test('directions only appear for one target and one played note', () => {
  assert.equal(match([spell(60)], new Set([59])).direction, 'up');
  assert.equal(match([spell(60)], new Set([61])).direction, 'down');
  assert.equal(match([spell(60)], new Set([59, 61])).direction, null);
  assert.equal(match([spell(60), spell(64)], new Set([61])).direction, null);
});
test('chord hints pair nearby errors while preserving correct notes', () => {
  const target = [60, 64, 67].map(n => spell(n));
  assert.deepEqual(match(target, new Set([60, 65, 67])).hints, [{played: 65, target: 64, direction: 'down'}]);
  assert.deepEqual(match(target, new Set([61, 64, 66])).hints, [
    {played: 61, target: 60, direction: 'down'}, {played: 66, target: 67, direction: 'up'}
  ]);
  assert.deepEqual(match(target, new Set([60, 65])).hints, [{played: 65, target: 64, direction: 'down'}]);
  assert.equal(match(target, new Set([60, 65, 67])).complete, false);
});
test('chord hints do not break ties, invent distant pairs or mark extra-only notes', () => {
  assert.deepEqual(match([60, 62].map(n => spell(n)), new Set([61])).hints, []);
  assert.deepEqual(match([60, 64].map(n => spell(n)), new Set([59, 61, 64])).hints, []);
  assert.deepEqual(match([60, 64, 67].map(n => spell(n)), new Set([60, 70, 67])).hints, []);
  assert.deepEqual(match([60, 64].map(n => spell(n)), new Set([60, 64, 65])).hints, []);
  assert.deepEqual(match([60, 62].map(n => spell(n)), new Set([59, 61])).hints, []);
});
test('sustain never impersonates a physically held note', () => {
  const p = new Performance();
  p.midi('piano', [0x90, 60, 100]); p.midi('piano', [0xb0, 64, 127]);
  p.midi('piano', [0x90, 60, 0]); // velocity-zero note-on is note-off
  assert.equal(p.held.size, 0);
  assert.deepEqual([...p.sustained], [60]);
  assert.equal(match([spell(60)], p.held).complete, false);
  p.midi('piano', [0xb0, 64, 0]);
  assert.equal(p.sustained.size, 0);
});
test('channels and input sources cannot release each other’s notes', () => {
  const p = new Performance();
  p.midi('piano', [0x90, 60, 80]); p.midi('piano', [0x91, 60, 90]);
  p.midi('piano', [0x80, 60, 0]); assert.deepEqual([...p.held], [60]);
  p.noteOn('pointer:1', 60); p.midi('piano', [0x81, 60, 0]);
  assert.equal(p.held.has(60), true);
  p.clear('pointer:1'); assert.equal(p.held.size, 0);
});
test('retrigger, reset controllers, panic and disconnection clear state', () => {
  const p = new Performance();
  p.midi('piano', [0xb0, 64, 127]); p.midi('piano', [0x90, 60, 90]); p.midi('piano', [0x80, 60, 0]);
  p.midi('piano', [0x90, 60, 90]); assert.equal(p.sustained.size, 0);
  p.midi('piano', [0x80, 60, 0]); p.midi('piano', [0xb0, 121, 0]);
  assert.equal(p.pedal, false); assert.equal(p.sustained.size, 0);
  p.midi('piano', [0x90, 60, 90]); p.midi('piano', [0xb0, 123, 0]); assert.equal(p.held.size, 0);
  p.midi('piano', [0x90, 60, 90]); p.clear(); assert.equal(p.held.size, 0);
});
test('irrelevant MIDI traffic and unchanged notes do not trigger UI work', () => {
  const p = new Performance();
  for (const data of [[0xfe], [0xf8], [0xe0, 64, 64], [0xb0, 7, 100], [0xd0, 40]]) assert.equal(p.midi('piano', data), false);
  assert.equal(p.midi('piano', [0x90, 60, 100]), true);
  assert.equal(p.midi('piano', [0x90, 60, 100]), false);
});

test('reading windows page without changing targets and retain partial final pages', () => {
  const base={index:5,length:8,capacity:4,preview:3};
  assert.deepEqual(readingWindow(base),[5,6,7,8]);
  assert.deepEqual(readingWindow({...base,mode:'page'}),[4,5,6,7]);
  assert.deepEqual(readingWindow({...base,length:6,mode:'page'}),[4,5]);
  assert.deepEqual(readingWindow({...base,index:7,preview:0,mode:'page'}),[7]);
  assert.deepEqual(readingWindow({...base,index:7,offset:17,length:32,mode:'page',repeat:false}),[7,8,9,10]);
  assert.deepEqual(readingWindow({...base,index:0,length:0}),[]);
  assert.deepEqual(readingWindow({...base,index:0,length:0,repeat:false}),[]);
});

test('compact staff layout removes whitespace without shrinking written intervals or clipping extremes', () => {
  const notes=['treble','bass'].flatMap(staff=>[0,60,127].map(midi=>({...spell(midi),staff})));
  const normal=staffLayout(notes), compact=staffLayout(notes,{compact:true});
  assert.ok(compact.height < normal.height);
  assert.equal(compact.yFor(notes[0])-compact.yFor(notes[1]),normal.yFor(notes[0])-normal.yFor(notes[1]));
  assert.ok(notes.every(note=>compact.yFor(note)-32>0 && compact.yFor(note)+15<compact.height));
});

test('harmonic cadence keeps exact major and relative-minor triads across buffer offsets', () => {
  const settings={...defaults,hand:'right',span:'wide',low:60,high:84,size:3,'min-size':3,length:4,source:'cadence',key:'C','hand-span':12};
  const pcs=chord=>[...new Set(chord.map(n=>n.midi%12))].sort((a,b)=>a-b);
  const major=makePracticePhrase(settings,()=>.2);
  assert.deepEqual(major.map(pcs),[[0,4,7],[0,5,9],[2,7,11],[0,4,7]]);
  const minor=makePracticePhrase({...settings,'harmony-scale':'minor'},()=>.2);
  assert.deepEqual(minor.map(pcs),[[0,4,9],[2,5,9],[4,7,11],[0,4,9]]);
  assert.deepEqual(makePracticePhrase({...settings,sequenceOffset:2,length:2},()=>.2).map(pcs),[[2,7,11],[0,4,7]]);
  assert.deepEqual(harmonicPitchClasses('G',false,0),[7,11,2]);
});
test('harmonic voicings honour physical ranges, hands and span, without blocking random practice', () => {
  let seed=3; const random=()=>((seed=seed*16807%2147483647)/2147483647);
  for (const hand of ['left','right','both']) for (const key of ['C','G','Cb','F#']) {
    const settings={...defaults,hand,key,source:'triads',span:'wide',low:36,high:84,size:6,'min-size':3,length:16,'hand-span':12};
    for (const chord of makePracticePhrase(settings,random)) {
      assert.ok(chord.length>=1);
      assert.ok(chord.every(n=>n.midi>=36 && n.midi<=84));
      for (const staff of ['treble','bass']) {
        const notes=chord.filter(n=>n.staff===staff).map(n=>n.midi);
        assert.ok(notes.length<=5);
        if (notes.length) assert.ok(notes.at(-1)-notes[0]<=12);
      }
    }
  }
  assert.deepEqual(makePracticePhrase({...defaults,length:2},()=>.3),makePhrase({...defaults,length:2},()=>.3));
  assert.deepEqual(makePracticePhrase({...defaults,source:'cadence',low:61,high:61,length:2}),[[],[]]);
});

test('reading measurements allow staggered fingers and exclude confirmation delay', () => {
  let time=0; const tracker=new AttemptTracker({now:()=>time,stamp:()=> '2026-10-16T12:00:00Z'});
  tracker.start([60,64,67].map(midi=>({...spell(midi),staff:'treble'})),{key:'C'});
  time=10; tracker.observe(new Set([60])); time=20; tracker.observe(new Set([60,64]));
  time=30; tracker.observe(new Set([60,64,67])); time=150;
  const record=tracker.finish(); assert.equal(record.responseMs,30); assert.equal(record.firstAttemptCorrect,true);
  assert.equal(record.context.key,'C'); assert.equal(tracker.finish(),null);
});
test('reading measurements count new wrong presses, cancel brief matches and freeze while paused', () => {
  let time=0; const tracker=new AttemptTracker({now:()=>time});
  const target=[{...spell(60),staff:'treble'}]; tracker.start(target);
  time=10; tracker.observe(new Set([61])); tracker.observe(new Set([61]));
  time=20; tracker.observe(new Set()); time=30; tracker.observe(new Set([61]));
  time=40; tracker.observe(new Set([60])); time=50; tracker.observe(new Set([60,61]));
  time=60; tracker.observe(new Set([60])); time=100; tracker.pause();
  time=1100; tracker.observe(new Set([60])); tracker.pause();
  time=1200; tracker.resume(); tracker.resume(); time=1250; tracker.observe(new Set([60]));
  const record=tracker.finish(); assert.equal(record.responseMs,150); assert.equal(record.wrongPresses,3); assert.equal(record.firstAttemptCorrect,false);
  tracker.start(target); tracker.pause(); assert.equal(tracker.finish(),null);
  tracker.start([]); tracker.observe(new Set()); tracker.pause(); tracker.resume(); assert.equal(tracker.finish(),null);
});
test('history validation, comparable identities, summaries and sparse breakdowns are explicit', () => {
  const note={...spell(84),staff:'treble'};
  const record=(ms,clean=true)=>({version:1,at:'2026-10-16T12:00:00Z',responseMs:ms,wrongPresses:clean?0:1,firstAttemptCorrect:clean,notes:[note],context:{hand:'right',key:'C'}});
  const rows=[record(100),record(200,false),record(400)];
  assert.equal(cleanHistory(null).length,0);
  assert.equal(cleanHistory([null,{...record(0),notes:[null]},{...record(0),responseMs:-1},...rows]).length,3);
  assert.deepEqual(summary([]),{count:0,mean:null,median:null,p90:null,accuracy:null});
  assert.equal(summary(rows).median,200); assert.equal(summary(rows.slice(0,2)).median,150); assert.equal(summary(rows).p90,400);
  assert.equal(summary(rows).accuracy,2/3);
  assert.equal(grouped(rows,'position')[0].label,'treble: ledger 2 above');
  assert.equal(grouped(rows,'note')[0].label,'C6'); assert.equal(grouped(rows,'accidental')[0].label,'Natural');
  assert.equal(grouped([{...rows[0],notes:[note,note]}],'position').length,0);
  assert.equal(grouped([{...rows[0],context:{}}],'key')[0].label,'Unknown');
  assert.equal(daily(rows)[0].count,3);
  const id=exerciseIdentity([note],{key:'C',preview:0,endAction:'repeat'},[[note]]);
  assert.equal(id,exerciseIdentity([note],{key:'C',preview:3,endAction:'repeat'},[[note]]));
  assert.notEqual(id,exerciseIdentity([note],{key:'G',endAction:'repeat'},[[note]]));
  assert.notEqual(id,exerciseIdentity([note],{key:'C',endAction:'new'},[[note]]));
});

function fakeAudio() {
  const events=[], nodes=[];
  const param=()=>({value:0,setValueAtTime(...a){events.push(['set',...a]);},linearRampToValueAtTime(...a){events.push(['linear',...a]);},exponentialRampToValueAtTime(...a){events.push(['exp',...a]);},setTargetAtTime(...a){events.push(['target',...a]);},cancelAndHoldAtTime(t){events.push(['hold',t]);},cancelScheduledValues(t){events.push(['cancel',t]);}});
  const node=()=>({gain:param(),frequency:param(),connect(){},disconnect(){this.disconnected=true;},start(t){this.started=t;},stop(t=0){this.stopped=t;}});
  return {currentTime:1,destination:{},events,nodes,createGain:node,createDynamicsCompressor:node,createBufferSource(){const n=node();n.playbackRate=param();nodes.push(n);return n;},createOscillator(){const n=node();nodes.push(n);return n;}};
}
test('audio paths independently sync held/sustained pitch sets, release and panic',()=>{
  const context=fakeAudio(), audio=new LocalAudio(context);
  audio.live.configure('piano',.4); audio.reference.configure('organ',.2);
  audio.live.sync([60,64]); assert.equal(audio.live.voices.size,2); assert.equal(context.nodes.length,6);
  audio.live.sync([60,64]); assert.equal(context.nodes.length,6);
  audio.audition([67]); assert.equal(audio.reference.voices.size,1); assert.equal(context.nodes.length,10);
  assert.ok(Math.abs(context.nodes[0].frequency.value-261.625565)<.00001);
  audio.live.sync([64]); assert.equal(audio.live.voices.size,1); assert.equal(audio.reference.voices.size,1);
  audio.live.configure('organ',2); assert.equal(audio.live.voices.size,0);
  audio.live.sync([64]); audio.click({time:2,beat:0}); audio.click({time:2.5,beat:1});
  assert.equal(audio.clicks.size,2); assert.equal(context.nodes.at(-2).frequency.value,1400); assert.equal(context.nodes.at(-1).frequency.value,900);
  audio.panic(); assert.equal(audio.live.voices.size,0); assert.equal(audio.reference.voices.size,0); assert.equal(audio.clicks.size,0);
  for(const oscillator of context.nodes) {assert.notEqual(oscillator.stopped,undefined); oscillator.onended(); assert.equal(oscillator.disconnected,true);}
});
test('audio validates notes and cleans up timed/retriggered voices without dropping replacements',()=>{
  const context=fakeAudio(), path=new SynthPath(context,context.destination);
  for(const pitch of [-1,128,60.1,NaN]) path.noteOn(pitch);
  assert.equal(path.voices.size,0);
  path.noteOn(60,1,.8); const old=path.voices.get(60);
  path.noteOn(60); const replacement=path.voices.get(60); assert.notEqual(old,replacement);
  old.oscillators.forEach(osc=>osc.onended()); assert.equal(path.voices.get(60),replacement);
  path.configure('unknown',-1); assert.equal(path.instrument,'piano');
  path.noteOn(65,1,.8); const timed=path.voices.get(65); timed.oscillators.forEach(osc=>osc.onended()); assert.equal(path.voices.has(65),false);
  const voice=path.voices.get(60); voice.envelope.gain.cancelAndHoldAtTime=null;
  path.noteOff(60); assert.equal(path.voices.size,0); assert.ok(context.events.some(event=>event[0]==='cancel'));
  path.noteOff(60); path.stop();
});
test('metronome schedules on the audio clock with accents and bounded recovery',()=>{
  const clock=new MetronomeClock(), beats=[];
  clock.pump(0,event=>beats.push(event)); assert.equal(beats.length,0);
  clock.start(0,120,3);
  for(const now of [0,.45,.95,1.45,1.95]) clock.pump(now,event=>beats.push(event));
  assert.deepEqual(beats.map(b=>b.beat),[0,1,2,0,1]); assert.equal(beats[3].bar,1);
  assert.ok(Math.abs(beats[4].time-2.03)<.00001);
  clock.pump(100,event=>beats.push(event)); assert.equal(beats.length,6); assert.equal(beats.at(-1).beat,0); assert.equal(beats.at(-1).time,100.03);
  clock.stop(); clock.pump(200,event=>beats.push(event)); assert.equal(beats.length,6);
  clock.start(0,999,99); assert.equal(clock.interval,.25); assert.equal(clock.beats,12);
  clock.start(0,0,0); assert.equal(clock.interval,.75); assert.equal(clock.beats,4);
});

test('MIDI pitch outlines retain source attack identity without changing timing or notes',()=>{
  const score={notes:[{id:'a',midi:60,start_tick:0,end_tick:480,channel:0},{id:'b',midi:64,start_tick:0,end_tick:960,channel:0},{id:'c',midi:67,start_tick:480,end_tick:960,channel:1},{id:'drum',midi:60,start_tick:240,channel:9}]};
  const original=JSON.stringify(score), settings={...defaults,size:3,key:'C'};
  assert.deepEqual(attackGroups(score).map(group=>group.tick),[0,480]);
  const outline=makeOutline(score,settings);
  assert.deepEqual(outline.targets.map(chord=>chord.map(n=>n.midi)),[[60,64],[67]]);
  assert.equal(outline.retainedNotes,3); assert.equal(outline.omittedNotes,0);
  assert.equal(outline.targets[1][0].sourceTick,480); assert.equal(outline.targets[1][0].sourceOnset,2);
  assert.deepEqual(outline.targets[1][0].sourceIds,['c']); assert.equal(outline.targets[1][0].staff,'treble');
  assert.deepEqual(makeOutline(score,settings,{start:2,end:2}).targets.map(chord=>chord.map(n=>n.midi)),[[67]]);
  assert.equal(JSON.stringify(score),original);
  const simplified=makeOutline(score,{...settings,size:1});
  assert.deepEqual(simplified.targets.map(chord=>chord.map(n=>n.midi)),[[64],[67]]); assert.equal(simplified.omittedNotes,1);
  assert.equal(makeOutline(score,{...settings,low:90,high:100}).targets.length,0);
  assert.equal(makeOutline(null,settings).targets.length,0);
});
test('outline reduction prefers outer voices, obeys filters and keeps distinct written positions',()=>{
  const score={notes:[48,60,61,62,64,67,72].map((midi,i)=>({id:String(i),midi,start_tick:0,channel:0}))};
  const settings={...defaults,low:0,high:127,span:'full',hand:'both',size:3,material:'sharps',key:'C'};
  const reduced=makeOutline(score,settings);
  assert.deepEqual(reduced.targets[0].map(n=>n.midi),[48,67,72]);
  assert.deepEqual(reduced.targets[0].map(n=>n.staff),['bass','treble','treble']);
  const chromatic=makeOutline(score,{...settings,size:10});
  assert.equal(new Set(chromatic.targets[0].map(staffStep)).size,chromatic.targets[0].length);
  assert.ok(chromatic.omittedNotes>0);
  assert.ok(makeOutline(score,{...settings,hand:'left',material:'flats'}).targets[0].every(n=>n.staff==='bass' && n.midi<60));
  const duplicates={notes:[{id:'a',midi:60,start_tick:0,channel:0},{id:'b',midi:60,start_tick:0,channel:1}]};
  const duplicate=makeOutline(duplicates,settings); assert.equal(duplicate.retainedNotes,2); assert.deepEqual(duplicate.targets[0][0].sourceIds,['a','b']);
  const long={notes:Array.from({length:1000},(_,i)=>({id:String(i),midi:60,start_tick:i,channel:0}))};
  assert.equal(makeOutline(long,settings,{start:2,end:1000}).targets.length,512);
  assert.equal(makeOutline(long,settings,{start:99999,end:1}).start,1000);
  assert.equal(attackGroups({notes:[{midi:60,start_tick:0}]}).length,1);
});

test('imported progress identities compare exact source passage and attack with bounded size',()=>{
  const note={...spell(60),staff:'treble',sourceOnset:2};
  const settings={...defaults,source:'midi',endAction:'repeat',scoreId:'hash-a',passage:{start:1,end:512}};
  const phrase=Array.from({length:512},()=>[note]);
  const identity=exerciseIdentity([note],settings,phrase);
  assert.ok(identity.length<800);
  assert.notEqual(identity,exerciseIdentity([note],{...settings,scoreId:'hash-b'},phrase));
  assert.notEqual(identity,exerciseIdentity([note],{...settings,passage:{start:2,end:512}},phrase));
  assert.notEqual(identity,exerciseIdentity([{...note,sourceOnset:3}],settings,phrase));
  const generated={...defaults,endAction:'repeat'}, fields=['hand','key','source','material','span','low','high','size','min-size','harmony-scale','hand-span','endAction'];
  const legacy=JSON.stringify([1,fields.map(field=>[field,generated[field]??null]),[[60,'C',0,4,'treble']],[[60]]]);
  assert.equal(exerciseIdentity([note],generated,[[note]]),legacy);
});

test('resolution presets budget browser chrome, adapt to the viewport and migrate saved choices',()=>{
  for(const [height,preset] of [[500,'720'],[720,'1080'],[900,'1080'],[1000,'1440'],[1240,'1440'],[1800,'2160']]) assert.equal(layoutPreset('auto',height).preset,preset);
  assert.equal(layoutPreset('comfortable',1000).preset,'1440'); assert.equal(layoutPreset('compact',1000).preset,'1080');
  for(const preset of ['720','1080','1440','2160']) {
    const profile=layoutPreset(preset,3000);
    assert.equal(profile.budget,+preset-180); assert.equal(staffViewport(profile,0),profile.preferred);
    assert.equal(staffViewport(profile,5000),profile.minimum);
  }
  assert.equal(layoutPreset('1440',800).budget,800);
  assert.equal(layoutPreset('1440',1160).preferred,380);
  assert.equal(layoutPreset('720',500,390).minimum,170);
  assert.equal(layoutPreset('2160',1800).density,'comfortable');
});

test('history restoration validates complete files and merges without duplicating attempts',()=>{
  const record={version:1,at:'2026-10-16T12:00:00Z',responseMs:150,wrongPresses:0,firstAttemptCorrect:true,wrongPitches:[],notes:[{...spell(60),staff:'treble'}],context:{identity:'one',hand:'right'}};
  const json=records=>JSON.stringify({version:1,records});
  assert.deepEqual(parseHistory(json([record])),[record]); assert.deepEqual(parseHistory(json([])),[]);
  for(const text of [null,'x'.repeat(16_000_001),'oops','null','{}',JSON.stringify({version:2,records:[]}),json(Array(1001).fill(record)),json([record,{...record,responseMs:-1}]),json([{...record,firstAttemptCorrect:false}]),json([{...record,context:{identity:123}}]),json([{...record,context:{identity:'x'.repeat(8001)}}]),json([{...record,notes:[{...record.notes[0],octave:5}]}])]) assert.throws(()=>parseHistory(text));
  const second={...record,at:'2026-10-17T12:00:00Z',responseMs:200};
  assert.deepEqual(mergeHistory([second,record],[record,second]),[record,second]);
  const equivalent={...record,context:{hand:'right',identity:'one'},notes:[{staff:'treble',octave:4,letter:'C',accidental:0,midi:60}]};
  assert.equal(mergeHistory([record],[equivalent]).length,1);
  assert.equal(mergeHistory([],Array.from({length:1100},(_,i)=>({...record,responseMs:i}))).length,1000);
  assert.equal(mergeHistory([{...record,context:{},wrongPitches:undefined}],[]).length,1);
});

test('MIDI track selection and explicit staff assignments respect hands without inventing voices',()=>{
  const score={notes:[{id:'low',midi:48,start_tick:0,track:1,channel:0},{id:'high',midi:72,start_tick:0,track:2,channel:0},{id:'next',midi:55,start_tick:480,track:1,channel:0}]};
  const settings={...defaults,low:0,high:127,span:'full',hand:'both',size:3};
  const tracks=[{track:1,enabled:true,staff:'treble'},{track:2,enabled:false,staff:'bass'}];
  const result=makeOutline(score,{...settings,hand:'right'},{tracks});
  assert.deepEqual(result.targets.map(chord=>chord.map(note=>note.midi)),[[48],[55]]);
  assert.ok(result.targets.every(chord=>chord.every(note=>note.staff==='treble')));
  assert.equal(result.omittedNotes,1); assert.equal(result.totalOnsets,2);
  assert.equal(makeOutline(score,{...settings,hand:'left'},{tracks}).targets.length,0);
  tracks[0].staff='bass'; tracks[1].enabled=true;
  const bass=makeOutline(score,{...settings,hand:'left'},{tracks});
  assert.deepEqual(bass.targets[0].map(note=>[note.midi,note.staff]),[[48,'bass'],[72,'bass']]);
  assert.equal(makeOutline(score,settings,{tracks:[]}).targets.length,0);
  assert.equal(makeOutline(score,{...settings,hand:'right'},{tracks:[{track:2,enabled:true,staff:'auto'}]}).targets[0][0].midi,72);
  const duplicate={notes:[{id:'a',midi:60,start_tick:0,track:1},{id:'b',midi:60,start_tick:0,track:2}]};
  const one=makeOutline(duplicate,settings,{tracks:[{track:1,enabled:false,staff:'auto'},{track:2,enabled:true,staff:'bass'}]});
  assert.deepEqual(one.targets[0][0].sourceIds,['b']); assert.equal(one.targets[0][0].staff,'bass');
});

test('reading history does not duplicate large imported source-note arrays',()=>{
  let now=0; const tracker=new AttemptTracker({now:()=>now});
  const note={...spell(60),staff:'treble',sourceOnset:1,sourceTick:0,sourceIds:Array(25000).fill('source-note')};
  tracker.start([note],{identity:'source hash and passage'}); now=50; tracker.observe(new Set([60]));
  const record=tracker.finish(); assert.equal(record.notes[0].sourceOnset,1); assert.equal(record.notes[0].sourceTick,0);
  assert.equal(record.notes[0].sourceIds,undefined); assert.ok(JSON.stringify(record).length<500);
  const text=JSON.stringify({version:1,records:Array.from({length:1000},(_,i)=>({...record,responseMs:i,context:{identity:'x'.repeat(4000)}}))},null,2);
  assert.ok(text.length>2_000_000); assert.equal(parseHistory(text).length,1000);
});

function playbackFixture() {
  const event=(tick,index,message,track=1)=>({tick,index,track,message});
  return {ticks_per_quarter:480,duration_ticks:960,tempo_map:[{tick:0,seconds:0,microseconds_per_quarter:500000},{tick:480,seconds:.5,microseconds_per_quarter:600000}],notes:[{id:'a',midi:60,start_tick:0,channel:0,track:1},{id:'b',midi:64,start_tick:480,channel:0,track:1}],events:[event(0,0,{type:'note_on',channel:0,note:60,velocity:80}),event(240,1,{type:'control_change',channel:0,control:64,value:127},0),event(480,2,{type:'note_off',channel:0,note:60,velocity:0}),event(480,3,{type:'note_on',channel:0,note:64,velocity:100}),event(720,4,{type:'control_change',channel:0,control:64,value:0},0),event(960,5,{type:'note_on',channel:0,note:64,velocity:0})]};
}
test('source playback derives pedal spans and tempo timing without changing original events',()=>{
  const score=playbackFixture(), original=JSON.stringify(score), plan=referencePlan(score);
  assert.equal(secondsAt(score,240),.25); assert.equal(secondsAt(score,720),.8);
  assert.deepEqual(plan.notes.map(note=>[note.pitch,note.start,note.end]),[[60,0,.8],[64,.5,1.1]]);
  assert.equal(plan.duration,1.1); assert.equal(JSON.stringify(score),original);
  assert.deepEqual(referencePlan(score,{start:1,end:1}).notes.map(note=>[note.pitch,note.end]),[[60,.5]]);
  const later=referencePlan(score,{start:2,end:2},.5);
  assert.equal(later.notes.length,2); assert.deepEqual(later.notes.map(note=>note.pitch),[60,64]); assert.equal(later.notes[0].start,0); assert.ok(Math.abs(later.notes[0].end-.6)<1e-9); assert.ok(Math.abs(later.duration-1.2)<1e-9);
  assert.equal(referencePlan(score,{tracks:[]}).notes.length,0);
  assert.equal(referencePlan(score,{tracks:[{track:1,enabled:true}]}).notes[0].end,.8,'conductor pedal applies to selected notes');
  assert.equal(referencePlan({...score,notes:[]}).duration,0);
});
test('source playback respects controller ordering, all-notes/off resets and voice limits',()=>{
  const score=playbackFixture();
  score.events[1].tick=480; score.events.sort((a,b)=>a.tick-b.tick || b.index-a.index);
  // Note-off before pedal-down at the same tick must not extend that note.
  assert.equal(referencePlan(score).notes[0].end,.5);
  const cutoff=control=>{const data=playbackFixture(); data.events[4].message.control=control; return referencePlan(data);};
  assert.equal(cutoff(121).notes[0].end,.8);
  assert.ok(cutoff(120).notes.every(note=>note.end===.8));
  assert.equal(cutoff(123).notes[0].end,1.1,'all notes off still obeys a down pedal');
  const unmatched=playbackFixture(); unmatched.events.unshift({tick:0,index:9,track:1,message:{type:'note_off',note:20,channel:0}});
  unmatched.events.push({tick:961,index:10,track:1,message:{type:'note_on',note:20,velocity:80,channel:9}});
  assert.equal(referencePlan(unmatched).notes.length,2);
  const dense=playbackFixture(); dense.events=Array.from({length:129},(_,i)=>({tick:0,index:i,track:1,message:{type:'note_on',note:60,channel:0,velocity:80}}));
  assert.throws(()=>referencePlan(dense),/128/);
  assert.equal(referencePlan(playbackFixture(),{start:0,end:999},999).duration,.55);
});
test('audio-clock playback pauses/resumes held spans and skips elapsed notes after a stall',()=>{
  const plan={duration:2,notes:[{id:'a',pitch:60,start:0,end:1},{id:'b',pitch:64,start:.5,end:.6},{id:'c',pitch:67,start:1,end:2}]};
  const cursor=new PlaybackCursor(), emitted=[];
  cursor.pump(0,note=>emitted.push(note)); cursor.pause(0); assert.equal(emitted.length,0);
  cursor.play(plan,10); cursor.pump(10,note=>emitted.push(note));
  assert.equal(emitted[0].time,10.03); assert.equal(emitted[0].duration,1);
  cursor.pause(10.43); assert.ok(Math.abs(cursor.position-.4)<1e-8);
  cursor.play(plan,20,cursor.position); assert.ok(Math.abs(cursor.at(20)-.4)<1e-8);
  cursor.pump(20,note=>emitted.push(note)); assert.ok(Math.abs(emitted.at(-1).duration-.6)<1e-8);
  cursor.pump(20.73,note=>emitted.push(note));
  assert.equal(emitted.at(-1).id,'c'); assert.ok(!emitted.some(note=>note.id==='b'));
  cursor.pump(30,note=>emitted.push(note)); assert.equal(cursor.state,'ended'); assert.equal(cursor.position,2);
  cursor.stop(); assert.equal(cursor.position,0); assert.equal(cursor.state,'stopped');
});
test('scheduled reference voices cancel before attack, own repeated pitches independently and clean up tails',()=>{
  const context=fakeAudio(), path=new SynthPath(context,context.destination);
  path.noteOn(60,2,.5,'a',.5); path.noteOn(60,2.1,.5,'b',1);
  assert.equal(path.voices.size,2); assert.equal(path.sounding.size,2);
  path.stop(); assert.equal(path.voices.size,0); assert.ok(context.nodes.every(node=>node.stopped===1));
  for(const node of context.nodes) node.onended(); assert.equal(path.sounding.size,0);
  path.noteOn(60); path.noteOff(60); assert.equal(path.voices.size,0); assert.equal(path.sounding.size,1);
  path.stop(); assert.equal(path.voices.size,0);
});

test('reading patterns require evidence and compare only matching single-note exercises',()=>{
  const settings={...defaults,low:48,high:84,size:1,key:'C',source:'random',endAction:'new'};
  const record=(pitch,ms,clean=true,overrides={})=>{const note={...spell(pitch),staff:'treble'}, config={...settings,...overrides}; return {version:1,at:'2026-10-16T12:00:00Z',responseMs:ms,wrongPresses:clean?0:1,firstAttemptCorrect:clean,notes:[note],context:{identity:exerciseIdentity([note],config,[])}};};
  const rows=[...Array.from({length:8},()=>record(60,100)),...Array.from({length:8},()=>record(62,200)),...Array.from({length:8},(_,i)=>record(64,1000,i>=3))];
  const original=JSON.stringify(rows), result=readingPatterns(rows);
  assert.equal(result.length,1); assert.equal(result[0].note,'E4'); assert.equal(result[0].count,8); assert.equal(result[0].corrected,3);
  assert.deepEqual(result[0].flags,['Repeated corrections','Slower responses']); assert.equal(result[0].baseline,200);
  assert.equal(result[0].context.key,'C'); assert.equal(JSON.stringify(rows),original);
  const sparse=Array.from({length:7},()=>record(65,5000,false)); assert.deepEqual(readingPatterns(sparse),[]);
  const otherKey=Array.from({length:24},()=>record(67,5000,true,{key:'G'}));
  assert.equal(readingPatterns([...rows,...sparse,...otherKey]).length,1,'another key or sparse exposure must not create a speed flag');
  const onlyCorrections=Array.from({length:8},()=>record(66,2000,false));
  assert.deepEqual(readingPatterns(onlyCorrections)[0].flags,['Repeated corrections']);
  const invalid=[{...rows[0],notes:[rows[0].notes[0],rows[0].notes[0]]},{...rows[0],context:{}},{...rows[0],context:{identity:'bad'}},{...rows[0],context:{identity:'[2,[]]'}},{...rows[0],context:{identity:'[1,[null]]'}}];
  assert.deepEqual(readingPatterns(invalid),[]);
  const duplicates=[...rows,...rows]; assert.equal(readingPatterns(duplicates)[0].count,16);
  assert.deepEqual(readingPatterns([]),[]);
});

test('live synth responds to velocity and retriggers a sustained pitch without inventing releases',()=>{
  const p=new Performance(), context=fakeAudio(), path=new SynthPath(context,context.destination);
  const sync=()=>path.sync(new Set([...p.held,...p.sustained]),p.attacks);
  p.midi('piano',[0x90,60,25]); sync(); const soft=path.voices.get(60), softPeak=context.events.find(event=>event[0]==='linear' && event[1]>0)[1];
  p.midi('piano',[0xb0,64,127]); p.midi('piano',[0x80,60,0]); sync(); assert.equal(path.voices.get(60),soft);
  p.midi('piano',[0x90,60,120]); sync(); const hard=path.voices.get(60); assert.notEqual(hard,soft);
  const peaks=context.events.filter(event=>event[0]==='linear' && event[1]>0).map(event=>event[1]); assert.ok(peaks.at(-1)>softPeak*4);
  assert.equal(match([spell(60)],p.held).complete,true);
  assert.equal(p.midi('piano',[0x90,60,80]),false,'duplicate held input keeps matching semantics'); sync(); assert.notEqual(path.voices.get(60),hard);
  const latest=path.voices.get(60); p.midi('piano',[0x80,60,0]); sync(); assert.equal(path.voices.get(60),latest);
  assert.equal(match([spell(60)],p.held).complete,false); p.midi('piano',[0xb0,64,0]); sync(); assert.equal(path.voices.size,0); assert.equal(p.attacks.size,0);
});
test('older held/sustained sources never reattack when a newer owner releases',()=>{
  const p=new Performance(), context=fakeAudio(), path=new SynthPath(context,context.destination);
  const sync=()=>path.sync(new Set([...p.held,...p.sustained]),p.attacks);
  p.noteOn('a',60,30); sync(); p.noteOn('b',60,110); sync(); const latest=path.voices.get(60);
  p.noteOff('b',60); sync(); assert.equal(path.voices.get(60),latest); assert.equal(p.attacks.get(60).velocity,30);
  p.noteOff('a',60); sync(); assert.equal(path.voices.size,0);
  p.noteOn('a',60,999); assert.equal(p.attacks.get(60).velocity,127); p.noteOn('a',60,'bad'); assert.equal(p.attacks.get(60).velocity,100);
  p.sustain('a',true); p.noteOff('a',60); assert.equal(p.attacks.size,1); p.clear(); assert.equal(p.attacks.size,0);
});

test('saved passages validate bounded metadata, update matching windows and retain file identity',()=>{
  const entry={version:1,hash:'a'.repeat(64),label:'Ending',filename:'study.mid',start:2,end:4,tracks:[{track:0,enabled:false,staff:'auto'},{track:1,enabled:true,staff:'treble'}],updatedAt:'2026-10-16T12:00:00Z'};
  assert.deepEqual(parsePassages(JSON.stringify([entry])),[entry]); assert.deepEqual(cleanPassages(null),[]);
  const invalid=[null,{...entry,version:2},{...entry,hash:'bad'},{...entry,label:''},{...entry,label:'x'.repeat(81)},{...entry,end:514},{...entry,start:0},{...entry,updatedAt:'bad'},{...entry,tracks:[]},{...entry,tracks:[entry.tracks[0]]},{...entry,tracks:[entry.tracks[1],entry.tracks[1]]},{...entry,tracks:[{track:64,enabled:true,staff:'treble'}]},{...entry,tracks:[{track:1,enabled:true,staff:'alto'}]}];
  assert.deepEqual(cleanPassages(invalid),[]);
  assert.throws(()=>parsePassages('x'.repeat(500001))); assert.throws(()=>parsePassages('{}')); assert.throws(()=>parsePassages('bad'));
  const first=savePassage([],entry), updated=savePassage(first,{...entry,label:'New name'});
  assert.equal(updated.length,1); assert.equal(updated[0].label,'New name'); assert.equal(first[0].label,'Ending');
  assert.equal(passageKey(entry),passageKey({...entry,tracks:[...entry.tracks].reverse()}));
  assert.notEqual(passageKey(entry),passageKey({...entry,hash:'b'.repeat(64)}));
  assert.equal(savePassage(first,{...entry,hash:'b'.repeat(64)}).length,2);
  assert.throws(()=>savePassage(first,{...entry,end:9999}));
  let many=[]; for(let start=1;start<=55;start++) many=savePassage(many,{...entry,start,end:start});
  assert.equal(many.length,50); assert.equal(many[0].start,6);
  const clean=cleanPassages([{...entry,extra:'ignore'}]); assert.equal(clean[0].extra,undefined); clean[0].tracks[0].staff='bass'; assert.equal(entry.tracks[0].staff,'auto');
});

test('keyboard geometry fits long instruments and preserves partial black endpoints',()=>{
  for(const [low,high] of [[60,60],[61,61],[61,63],[21,108],[0,127]]) {
    const geometry=keyboardGeometry(low,high); assert.equal(geometry.keys.length,high-low+1);
    for(const key of geometry.keys) assert.ok(key.left>=0 && key.left+(key.white ? 1 : 22/36)<=geometry.units+1e-9);
  }
  const piano=keyboardGeometry(21,108); assert.equal(piano.units,52);
  const auto=keyboardKeyWidth('auto',1040,piano.units); assert.equal(auto,19); assert.ok(auto*piano.units<=1040);
  assert.equal(keyboardKeyWidth('auto',200,52),16); assert.equal(keyboardKeyWidth('auto',200,52,true),28);
  assert.equal(keyboardKeyWidth('36',200,52),36); assert.equal(keyboardKeyWidth('28',200,52),28); assert.equal(keyboardKeyWidth('20',200,52),20);
  assert.equal(keyboardKeyWidth('bad',1040,22),36); assert.equal(keyboardKeyWidth('auto',1040,0),36);
  assert.equal(keyboardGeometry(-100,999).keys.length,128); assert.equal(keyboardGeometry(undefined,undefined).keys.length,1);
});

test('history clearing respects local midnight, elapsed-hour boundaries and older results',()=>{
  const now=new Date(2026,9,16,12,30), midnight=new Date(2026,9,16), hour=+now-3600000;
  const rows=[+midnight-1,+midnight,hour-1,hour,+now,+now+1].map(at=>({at:new Date(at).toISOString()}));
  assert.deepEqual(clearHistoryPeriod(rows,'hour',now),[rows[0],rows[1],rows[2],rows[5]]);
  assert.deepEqual(clearHistoryPeriod(rows,'today',now),[rows[0],rows[5]]);
  assert.deepEqual(clearHistoryPeriod(rows,'all',now),[]);
  assert.equal(rows.length,6);
  assert.throws(()=>clearHistoryPeriod(rows,'week',now));
  assert.throws(()=>clearHistoryPeriod(rows,'today',new Date(NaN)));
  assert.deepEqual(clearHistoryPeriod([{at:'invalid'}],'hour',now),[{at:'invalid'}]);
});

test('fluid progression allows legato overlap but demands fresh attacks and rejects extras',()=>{
  const p=new Performance(), gate=new FlowGate(), notes=(...pitches)=>pitches.map(midi=>({midi}));
  gate.start(notes(60,64),[],p.held,p.attacks);
  p.noteOn('m',60); assert.equal(gate.evaluate(p.held,p.attacks).ready,false);
  p.noteOn('m',64); assert.equal(gate.evaluate(p.held,p.attacks).ready,true);
  gate.start(notes(64,67),notes(60,64),p.held,p.attacks);
  assert.equal(gate.evaluate(p.held,p.attacks).ready,false);
  p.noteOn('m',67); assert.equal(gate.evaluate(p.held,p.attacks).ready,true);
  p.noteOff('m',60); p.noteOn('m',60); assert.equal(gate.evaluate(p.held,p.attacks).ready,false,'a reattacked old pitch becomes an extra');
  p.noteOff('m',60); gate.start(notes(64,67),notes(64,67),p.held,p.attacks);
  assert.equal(gate.evaluate(p.held,p.attacks).ready,false);
  p.noteOn('m',64); assert.equal(gate.evaluate(p.held,p.attacks).ready,false,'all repeated chord pitches need new attacks');
  p.noteOn('m',67); assert.equal(gate.evaluate(p.held,p.attacks).ready,true);
  gate.start(notes(64),notes(64,67),p.held,p.attacks);
  assert.equal(gate.evaluate(p.held,p.attacks).ready,false,'carried subset must not auto-skip');
  p.noteOn('m',64); assert.equal(gate.evaluate(p.held,p.attacks).ready,true);
  p.sustain('m',true); p.noteOff('m',64); assert.equal(gate.evaluate(p.held,p.attacks).ready,false,'pedal is not a held target');
  gate.start([],[],p.held,p.attacks); assert.equal(gate.evaluate(p.held,p.attacks).ready,false);
});

test('passage suggestions cover the source in bounded adjustable sections using MIDI evidence',()=>{
  const score={ticks_per_quarter:480,events:[{tick:0,message:{type:'time_signature',numerator:4,denominator:4}},{tick:4800,message:{type:'marker',text:'B'}}],notes:Array.from({length:24},(_,i)=>({midi:60,channel:0,start_tick:i*480,end_tick:i*480+480}))};
  const before=JSON.stringify(score), sections=suggestPassages(score,{maximum:16});
  assert.deepEqual(sections.map(section=>[section.start,section.end]),[[1,10],[11,24]]);
  assert.match(sections[0].reason,/MIDI marker/); assert.equal(JSON.stringify(score),before);
  const rest={...score,events:[],notes:score.notes.map((note,i)=>({...note,end_tick:i===7 ? note.start_tick+100 : note.end_tick}))};
  assert.equal(suggestPassages(rest,{maximum:16})[0].reason,'Rest gap');
  assert.equal(suggestPassages({...rest,notes:rest.notes.map((note,i)=>i===0 ? {...note,end_tick:null} : note)},{maximum:16})[0].reason,'Meter boundary');
  const changed={...score,events:[{tick:0,message:{type:'cue_point',text:'Intro'}},{tick:1920,message:{type:'time_signature',numerator:3,denominator:4}}]};
  assert.equal(suggestPassages(changed,{maximum:8})[0].end,7);
  assert.deepEqual(suggestPassages({notes:[]}),[]);
  assert.equal(suggestPassages({notes:[{start_tick:0,midi:60}]},{maximum:NaN,minimum:NaN})[0].end,1);
  const long={notes:Array.from({length:25000},(_,i)=>({start_tick:i,midi:60,end_tick:i+1}))};
  const bounded=suggestPassages(long); assert.ok(bounded.length<=128); assert.equal(bounded.at(-1).end,25000);
  assert.ok(bounded.every(section=>section.end-section.start<512));
  assert.equal(suggestPassages(score,{maximum:1,minimum:100}).length,24);
});

test('acoustic paths transpose nearby recordings, preserve velocity and do not retrigger an ended hold',()=>{
  const context=fakeAudio(), samples={ready:true,select:()=>({root:60,buffer:{sample:'C4'}})}, path=new SynthPath(context,context.destination,samples);
  path.configure('acoustic',.4); path.noteOn(62,1,null,62,.2);
  const voice=path.voices.get(62); assert.equal(voice.oscillators.length,1);
  assert.equal(voice.oscillators[0].buffer.sample,'C4');
  assert.ok(Math.abs(voice.oscillators[0].playbackRate.value-2**(2/12))<1e-10);
  voice.oscillators[0].onended(); assert.equal(path.sounding.size,0);
  path.sync([62]); assert.equal(context.nodes.length,1,'a naturally ended held key must stay silent');
  path.noteOff(62); assert.equal(path.voices.size,0);
  path.noteOn(60,1,.8); const timed=path.voices.get(60); timed.oscillators[0].onended(); assert.equal(path.voices.size,0);
  samples.ready=false; path.sync([60]); assert.equal(path.voices.size,0);
  const noBank=new SynthPath(context,context.destination); noBank.configure('acoustic',.2); noBank.noteOn(60); assert.equal(noBank.voices.size,0);
  assert.equal(nearestSample(new Map(),60),null);
  const buffers=new Map([[60,'C'],[63,'Ds']]); assert.equal(nearestSample(buffers,62).buffer,'Ds'); assert.equal(nearestSample(buffers,59).root,60);
});

test('acoustic sample loading is shared, local, atomic and retryable',async()=>{
  const urls=[], context={decodeAudioData:async data=>({decoded:data})};
  const manifest={version:1,samples:[{pitch:60,file:'C4.mp3'},{pitch:63,file:'Ds4.mp3'}]};
  const fetcher=async url=>{urls.push(url); return {ok:true,json:async()=>manifest,arrayBuffer:async()=>url};};
  const bank=new AcousticSamples(context,fetcher);
  await Promise.all([bank.load(),bank.load()]); await bank.load();
  assert.equal(urls.length,3); assert.ok(urls.every(url=>url.startsWith('/static/audio/salamander/')));
  assert.equal(bank.ready,true); assert.equal(bank.select(62).root,63);
  const originalFetch=globalThis.fetch;
  try {globalThis.fetch=function(url){assert.equal(this,globalThis); return fetcher(url);}; await new AcousticSamples(context).load();} finally {globalThis.fetch=originalFetch;}
  const bad=new AcousticSamples(context,async()=>({ok:false})); await assert.rejects(bad.load(),/manifest unavailable/); assert.equal(bad.pending,null);
  bad.fetcher=fetcher; await bad.load(); assert.equal(bad.ready,true);
  const invalid=new AcousticSamples(context,async()=>({ok:true,json:async()=>({version:2})})); await assert.rejects(invalid.load(),/Invalid/);
  const missing=new AcousticSamples(context,async url=>url.endsWith('.json') ? {ok:true,json:async()=>manifest} : {ok:false}); await assert.rejects(missing.load(),/sample unavailable/); assert.equal(missing.buffers.size,0);
  const failure=new AcousticSamples({decodeAudioData:async()=>{throw new Error('decode failed');}},fetcher); await assert.rejects(failure.load(),/decode failed/); assert.equal(failure.ready,false);
});

test('source metronome follows tempo, meter and speed, with phase-preserving count-in pulses',()=>{
  const score=playbackFixture(), original=JSON.stringify(score), plan=referencePlan(score);
  const beatPlan=sourceBeats(score,plan,1,1);
  assert.equal(beatPlan.leadIn,2);
  assert.deepEqual(beatPlan.beats.map(beat=>[beat.start,beat.beat]),[[-2,0],[-1.5,1],[-1,2],[-.5,3],[0,0],[.5,1]]);
  const slow=sourceBeats(score,plan,.5,0); assert.deepEqual(slow.beats.map(beat=>beat.start),[0,1]);
  const meter={...score,events:[...score.events,{tick:480,message:{type:'time_signature',numerator:3,denominator:8}}]};
  assert.deepEqual(sourceBeats(meter,plan).beats.map(beat=>[beat.start,beat.beat]),[[0,0],[.5,0],[.8,1]]);
  const offset=sourceBeats(score,{sourceStart:240,sourceEnd:960},1,1);
  assert.deepEqual(offset.beats.slice(0,4).map(beat=>beat.start),[-1.75,-1.25,-.75,-.25]);
  assert.equal(JSON.stringify(score),original);
  assert.deepEqual(sourceBeats(score,{notes:[],duration:0}),{beats:[],leadIn:0});
  assert.throws(()=>sourceBeats(score,{sourceStart:0,sourceEnd:10_000_000}),/8,192/);
  assert.equal(sourceBeats(score,plan,999,999).leadIn,2);
});

test('source beat scheduling never bursts stale clicks and resumes without a second count-in',()=>{
  const cursor=new BeatCursor(), emitted=[];
  cursor.pump(0,beat=>emitted.push(beat)); assert.equal(emitted.length,0);
  const beats=[{start:-1,beat:0},{start:0,beat:0},{start:.5,beat:1},{start:1,beat:2}];
  cursor.start(beats,1.03); cursor.pump(0,beat=>emitted.push(beat)); assert.ok(Math.abs(emitted[0].time-.03)<1e-9);
  cursor.pump(1.7,beat=>emitted.push(beat)); assert.equal(emitted.length,1,'stale clicks are skipped');
  cursor.pump(2,beat=>emitted.push(beat)); assert.equal(emitted.length,2); assert.equal(emitted[1].beat,2);
  cursor.start(beats,4.53,.5); cursor.pump(5,beat=>emitted.push(beat)); assert.equal(emitted.at(-1).beat,1);
});

test('diatonic sevenths cover every key and preserve voicing bounds and written spellings',()=>{
  assert.deepEqual(harmonicPitchClasses('C',false,0,true),[0,4,7,11]);
  assert.deepEqual(harmonicPitchClasses('C',false,4,true),[7,11,2,5]);
  assert.deepEqual(harmonicPitchClasses('C',true,1,true),[11,2,5,9]);
  for(const {id:key} of KEYS) for(const minor of [false,true]) for(let degree=0;degree<7;degree++) {
    const settings={...defaults,key,source:'triads','harmony-kind':'sevenths','harmony-scale':minor?'minor':'major',span:'full',low:48,high:96,size:4,'min-size':4,length:1,'hand-span':12};
    const chord=makePracticePhrase(settings,()=>degree/7+.0001)[0];
    assert.equal(chord.length,4);
    assert.deepEqual([...new Set(chord.map(note=>note.midi%12))].sort((a,b)=>a-b),harmonicPitchClasses(key,minor,degree,true).sort((a,b)=>a-b));
    assert.ok(chord.at(-1).midi-chord[0].midi<=12);
    assert.equal(new Set(chord.map(staffStep)).size,4);
  }
});

test('cadence choices preserve sequence phase and comparable practice identities',()=>{
  const settings={...defaults,source:'cadence',key:'C',span:'wide',low:60,high:84,size:4,'min-size':4,'harmony-kind':'sevenths',length:3,'cadence-shape':'ii-v-i','hand-span':12};
  const pcs=phrase=>phrase.map(chord=>[...new Set(chord.map(note=>note.midi%12))].sort((a,b)=>a-b));
  assert.deepEqual(pcs(makePracticePhrase(settings,()=>.2)),[[0,2,5,9],[2,5,7,11],[0,4,7,11]]);
  assert.deepEqual(pcs(makePracticePhrase({...settings,sequenceOffset:2,length:2},()=>.2)),[[0,4,7,11],[0,2,5,9]]);
  assert.deepEqual(pcs(makePracticePhrase({...settings,'cadence-shape':'turnaround',length:4},()=>.2)),[[0,4,7,11],[0,4,7,9],[0,2,5,9],[2,5,7,11]]);
  const note={...spell(60),staff:'treble'};
  const id=exerciseIdentity([note],settings,[[note]]);
  assert.notEqual(id,exerciseIdentity([note],{...settings,'harmony-kind':'triads'},[[note]]));
  assert.notEqual(id,exerciseIdentity([note],{...settings,'cadence-shape':'authentic'},[[note]]));
  assert.equal(exerciseIdentity([note],{...settings,source:'random'},[]),exerciseIdentity([note],{...settings,source:'random','harmony-kind':'triads','cadence-shape':'authentic'},[]));
});

test('cadence labels distinguish minor diminished triads from half-diminished sevenths',()=>{
  assert.deepEqual(cadenceLabels(),['I–IV–V–I','ii–V–I','I–vi–ii–V']);
  assert.equal(cadenceLabels(true)[1],'ii°–v–i');
  assert.equal(cadenceLabels(true,true)[1],'iiø7–v7–i7');
  assert.equal(cadenceLabels(false,true)[1],'ii7–V7–Imaj7');
});

test('daily graph spacing uses elapsed UTC dates and centres a single measurement',()=>{
  const days=[{day:'2026-09-30',median:200},{day:'2026-10-01',median:100},{day:'2026-10-10',median:0}], before=JSON.stringify(days);
  assert.deepEqual(dailyPlot(days).map(day=>[day.x,day.y]),[[30,20],[88,65],[610,110]]);
  assert.equal(JSON.stringify(days),before);
  assert.equal(dailyPlot([days[0]])[0].x,320);
  assert.deepEqual(dailyPlot([]),[]);
  assert.equal(dailyPlot([{day:'2026-10-01',median:0}])[0].y,110);
});

test('MIDI outlines demand every source attack even when only part of a chord repeats',()=>{
  const p=new Performance(), gate=new FlowGate();
  const notes=(tick,...pitches)=>pitches.map(midi=>({midi,sourceTick:tick,sourceIds:[`${tick}:${midi}`]}));
  const first=notes(0,60,64), second=notes(480,64,67), third=notes(960,64,69);
  gate.start(first,[],p.held,p.attacks); p.noteOn('m',60); p.noteOn('m',64);
  assert.equal(gate.evaluate(p.held,p.attacks).ready,true);
  gate.start(second,first,p.held,p.attacks); p.noteOff('m',60); p.noteOn('m',67);
  assert.equal(gate.evaluate(p.held,p.attacks).ready,false,'a new G must not substitute for the repeated E attack');
  p.sustain('m',true); p.noteOff('m',64);
  assert.equal(gate.evaluate(p.held,p.attacks).ready,false,'pedal does not substitute for a fresh physical press');
  p.noteOn('m',64); assert.equal(gate.evaluate(p.held,p.attacks).ready,true);
  gate.start(third,second,p.held,p.attacks); p.noteOff('m',67); p.noteOn('m',69);
  assert.equal(gate.evaluate(p.held,p.attacks).ready,false,'each later occurrence has its own attack baseline');
  p.noteOff('m',64); p.noteOn('m',64); assert.equal(gate.evaluate(p.held,p.attacks).ready,true);
  gate.start(third,third,p.held,p.attacks);
  assert.equal(gate.evaluate(p.held,p.attacks).ready,false,'loop entry never consumes the previous articulation');
});

test('library facets and intersecting filters preserve catalogue data and keep unrated pieces visible',()=>{
  const pieces=[{id:'b',composer:'Bach',era:'Baroque',style:'Prelude',difficulty:'Intermediate',title:'Prelude'},
    {id:'c',composer:'Chopin',era:'Romantic',style:'Etude',difficulty:'Advanced',title:'Study'},
    {id:'a',composer:'Bach',era:'Baroque',style:'Minuet',title:'Dance'}];
  const before=JSON.stringify(pieces);
  assert.deepEqual(libraryFacets(pieces,'composer'),['Bach','Chopin']);
  assert.deepEqual(libraryFacets(pieces,'difficulty'),['Advanced','Intermediate','Unrated']);
  assert.deepEqual(filterLibrary(pieces,{composer:'Bach',era:'Baroque'}).map(p=>p.id),['a','b']);
  assert.deepEqual(filterLibrary(pieces,{composer:'Bach',difficulty:'Advanced'}),[]);
  assert.deepEqual(filterLibrary(pieces,{difficulty:'Unrated'}).map(p=>p.id),['a']);
  assert.deepEqual(filterLibrary(pieces,{style:'Etude'}).map(p=>p.id),['c']);
  assert.equal(filterLibrary(pieces).length,3); assert.equal(libraryValue({style:'  '},'style'),'Unrated');
  assert.equal(libraryValue(null,'era'),'Unrated'); assert.equal(JSON.stringify(pieces),before);
});
