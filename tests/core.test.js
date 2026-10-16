import {SynthPath,LocalAudio,MetronomeClock} from '../static/audio.js';
import {AttemptTracker,cleanHistory,summary,exerciseIdentity,grouped,daily} from '../static/metrics.js';
import {makePracticePhrase, harmonicPitchClasses} from '../static/harmony.js';
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
  return {currentTime:1,destination:{},events,nodes,createGain:node,createDynamicsCompressor:node,createOscillator(){const n=node();nodes.push(n);return n;}};
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
