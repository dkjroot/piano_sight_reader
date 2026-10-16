import test from 'node:test';
import assert from 'node:assert/strict';
import {KEYS, keyAlterations, spellInKey, spell, spellChord, noteName, staffStep, candidates, makeTarget, makePhrase, chordName, match, Performance} from '../static/core.js';
import {staffLayout, accidentalLayout} from '../static/notation.js';

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
