import {WHITE, KEYS, keyAlterations, spell, noteName, staffStep, chordName, match, Performance} from './core.js';
import {staffLayout, accidentalLayout, readingWindow} from './notation.js';
import {makePracticePhrase as makePhrase} from './harmony.js';
import {ProgressPanel} from './progress.js';
import {SoundPanel} from './sound.js';
import {ScorePanel} from './score.js';
import {makeOutline} from './outline.js';

const $ = id => document.getElementById(id);
const performance = new Performance();
const progress = new ProgressPanel();
let activePiece=null;
const scorePanel = new ScorePanel((score,bounds,filename)=>{
  activePiece={score,bounds,filename}; $('source-midi').disabled=false; $('source').value='midi'; $('end-repeat').checked=true;
  completed=0; $('count').textContent='0'; persist(); syncMode(); newTarget();
},()=>settings());
const controls = ['hand', 'size', 'min-size', 'length', 'preview', 'scroll-mode', 'source', 'harmony-scale', 'hand-span', 'material', 'span', 'low', 'high', 'key'];
for (const id of ['size','min-size']) $(id).replaceChildren(...Array.from({length:10}, (_, i) => new Option(String(i+1), String(i+1))));
$('key').replaceChildren(...KEYS.map(key => new Option(key.label, key.id)));
let target = [], completed = 0, solved = false, settleTimer, nextTimer, access, selectedInput, learning;
let phrase = [], phraseIndex = 0, waitingForRelease = false;
let streamOffset = 0;
let inputRevision = 0;
const sound=new SoundPanel(()=>target,()=>new Set([...performance.held,...performance.sustained]));
const SETTLE_MS = 120;
const storageKey = 'piano-sight-reader-v1';
// Set bounds before restoring saved endpoints, avoiding browser clamping.
$('low').min = $('high').min = 0;
$('low').max = $('high').max = 127;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  for (const id of controls) {
    if (saved[id] !== undefined && (['low', 'high'].includes(id) ? Number.isInteger(+saved[id]) && +saved[id] >= 0 && +saved[id] <= 127 : [...$(id).options].some(o => !o.disabled && o.value === String(saved[id])))) $(id).value = saved[id];
  }
  if (['repeat','new'].includes(saved.endAction)) $(`end-${saved.endAction}`).checked = true;
} catch { /* Restricted storage or an old setting must not prevent practice. */ }
if (+$('low').value > +$('high').value) $('high').value = $('low').value;
if (+$('min-size').value > +$('size').value) $('min-size').value = $('size').value;
function settings() { return {...Object.fromEntries(controls.map(id => [id, ['low', 'high', 'size','min-size','length','preview'].includes(id) ? +$(id).value : $(id).value])), endAction:document.querySelector('[name="end-action"]:checked').value,scoreId:$('source').value==='midi' ? activePiece?.score.sha256 : null,passage:$('source').value==='midi' ? activePiece?.bounds : null}; }
function persist() { try { localStorage.setItem(storageKey, JSON.stringify(settings())); } catch { /* Session still works. */ } }
function syncMode() {
  const imported=$('source').value==='midi';
  $('end-new').disabled=imported;
  if(imported) $('end-repeat').checked=true;
  const continuous = settings().endAction === 'new';
  $('length').disabled = continuous || imported; $('min-size').disabled=imported;
  const harmonic=['triads','cadence'].includes($('source').value);
  $('harmony-scale').disabled=!harmonic; $('hand-span').disabled=!harmonic;
  $('material').disabled=harmonic;
  $('practice-title').textContent = imported ? 'Pitch outline' : continuous ? 'Practice' : 'Phrase';
  $('count-label').textContent = continuous ? 'targets completed' : 'repetitions completed';
}
syncMode();
function rangeLabels() {
  for (const id of ['low', 'high']) $(`${id}-label`).textContent = `${noteName(spell(+$(id).value))} · MIDI ${$(id).value}`;
}

function applyDensity() {
  const compact = $('density').value === 'compact' || ($('density').value === 'auto' && matchMedia('(min-width:900px) and (max-height:950px)').matches);
  document.documentElement.dataset.density = compact ? 'compact' : 'comfortable';
}
try {
  const density = localStorage.getItem('piano-sight-reader-density');
  if (['auto','compact','comfortable'].includes(density)) $('density').value=density;
} catch { /* Storage is optional. */ }
applyDensity();
$('density').addEventListener('change', () => {
  applyDensity();
  try {localStorage.setItem('piano-sight-reader-density',$('density').value);} catch { /* Session still works. */ }
  drawStaff(); scrollToCurrent(); update();
});

function applyTheme(dark) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('theme-toggle').setAttribute('aria-pressed', String(dark));
  $('theme-toggle').textContent = dark ? 'Light mode' : 'Dark mode';
}
applyTheme(document.documentElement.dataset.theme === 'dark');
$('theme-toggle').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  applyTheme(dark);
  try { localStorage.setItem('piano-sight-reader-theme', dark ? 'dark' : 'light'); } catch { /* Session still works. */ }
});
function applyKeyboardInversion(inverted) {
  $('invert-keyboard').checked = inverted;
  $('keyboard').dataset.inverted = String(inverted);
}
try { applyKeyboardInversion(localStorage.getItem('piano-sight-reader-keyboard-inverted') === 'true'); } catch { applyKeyboardInversion(false); }
$('invert-keyboard').addEventListener('change', () => {
  const inverted = $('invert-keyboard').checked;
  applyKeyboardInversion(inverted);
  try { localStorage.setItem('piano-sight-reader-keyboard-inverted', String(inverted)); } catch { /* Session still works. */ }
});
function applyTargetVisibility(show) {
  $('show-targets').checked = show;
  $('keyboard').dataset.showTargets = String(show);
  $('target-legend').hidden = !show;
}
try { applyTargetVisibility(localStorage.getItem('piano-sight-reader-show-targets') === 'true'); } catch { applyTargetVisibility(false); }
$('show-targets').addEventListener('change', () => {
  const show = $('show-targets').checked;
  applyTargetVisibility(show);
  try { localStorage.setItem('piano-sight-reader-show-targets', String(show)); } catch { /* Session still works. */ }
});

function drawStaff() {
  const width = Math.max(660, Math.min(1040, $('staff').clientWidth || 740));
  const fifths = KEYS.find(key => key.id === settings().key).fifths;
  const stride = settings().size > 4 ? 220 : 180;
  const firstX = 190+Math.abs(fifths)*15+(settings().size > 4 ? 40 : 0);
  const capacity = Math.max(1, Math.floor((width-firstX-100)/stride)+1);
  const columns = Math.min(capacity, settings().preview+1);
  let systems = '';
  const indices = readingWindow({index:phraseIndex,length:phrase.length,capacity,preview:settings().preview,mode:settings()['scroll-mode'],repeat:settings().endAction === 'repeat',offset:streamOffset});
  for (const start of indices.length ? [indices[0]] : []) {
  const chunk = indices.map(index => phrase[index%phrase.length]);
  const centre = local => firstX+local*stride;
  const allNotes = chunk.flatMap((chord,local) => chord.map(note => ({...note, phraseStep:start+local})));
  const treble = allNotes.filter(n => n.staff === 'treble');
  const bass = allNotes.filter(n => n.staff === 'bass');
  const {trebleBottom, bassBottom, height, yFor} = staffLayout(allNotes, {compact:document.documentElement.dataset.density === 'compact'});
  const trebleY = yFor, bassY = yFor;
  const alterations = keyAlterations(settings().key);
  let svg = `<svg class="phrase-system" data-start="${start}" data-end="${start+chunk.length-1}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Phrase steps ${start+1} to ${start+chunk.length}"><title>Phrase on grand staff</title>`;
  for (let local = 0; local < chunk.length; local++) {
    const step = start+local, x = centre(local);
    svg += `<text class="step-number" x="${x}" y="24" text-anchor="middle">${settings().endAction === 'new' ? streamOffset+step+1 : step%phrase.length+1}${step < phraseIndex ? ' ✓' : ''}</text>`;
    if (step === phraseIndex) svg += `<path class="phrase-pointer" data-step="${step}" d="M${x-7} 32h14l-7 9z"/>`;
    // Each untimed target is its own measure, so an accidental cannot silently
    // carry into the next chord while the viewport moves.
    const bar = Math.min(width-20,x+stride*.5);
    svg += `<line class="staff-line" x1="${bar}" x2="${bar}" y1="${trebleBottom-40}" y2="${bassBottom}"/>`;
    if (settings().endAction === 'repeat' && step%phrase.length === phrase.length-1) svg += `<path class="phrase-boundary" d="M${bar-4} ${trebleBottom-40}V${bassBottom}M${bar} ${trebleBottom-40}V${bassBottom}"/>`;
  }
  for (const [notes, bottom, yFor, clef] of [[treble, trebleBottom, trebleY, '𝄞'], [bass, bassBottom, bassY, '𝄢']]) {
    for (let i = 0; i < 5; i++) svg += `<line class="staff-line" x1="62" x2="${width-20}" y1="${bottom-i*10}" y2="${bottom-i*10}"/>`;
    svg += `<text class="clef" x="80" y="${bottom-(clef === '𝄞' ? 1 : 4)}">${clef}</text>`;
    const signatureSteps = fifths > 0 ? [38,35,39,36,33,37,34] : [34,37,33,36,32,35,31];
    for (let i = 0; i < Math.abs(fifths); i++) {
      const step = signatureSteps[i] - (clef === '𝄢' ? 14 : 0);
      const reference = clef === '𝄢' ? 18 : 30;
      svg += `<text class="key-signature" x="${128+i*15}" y="${bottom-(step-reference)*5+6}">${fifths > 0 ? '♯' : '♭'}</text>`;
    }
    const positions = new Map(), accidentalPositions = new Map();
    for (let local = 0; local < chunk.length; local++) {
      const chord = notes.filter(n => n.phraseStep === start+local).sort((a,b) => staffStep(a)-staffStep(b));
      const chordPositions = new Map();
      let previousStep = -100, shifted = false;
      for (const note of chord) {
        const step = staffStep(note);
        shifted = step-previousStep === 1 ? !shifted : false;
        chordPositions.set(note, centre(local)+(shifted ? 14 : 0)); previousStep = step;
      }
      for (const [note,x] of chordPositions) positions.set(note,x);
      for (const [note,x] of accidentalLayout(chord.filter(n => n.accidental !== alterations[n.letter]),chordPositions,yFor)) accidentalPositions.set(note,x);
      if (chord.length) {
        const ys = chord.map(yFor), x = centre(local)+7;
        svg += `<line class="stem" x1="${x}" x2="${x}" y1="${Math.max(...ys)}" y2="${Math.min(...ys)-32}"/>`;
      }
    }
    notes.forEach(note => {
      const x = positions.get(note), y = yFor(note);
      const state = note.phraseStep === phraseIndex && performance.held.has(note.midi) ? 'hit' : 'pending';
      for (let ledger = bottom + 10; ledger <= y; ledger += 10) svg += `<line class="ledger" x1="${x-15}" x2="${x+15}" y1="${ledger}" y2="${ledger}"/>`;
      for (let ledger = bottom - 50; ledger >= y; ledger -= 10) svg += `<line class="ledger" x1="${x-15}" x2="${x+15}" y1="${ledger}" y2="${ledger}"/>`;
      const accidental = note.accidental === alterations[note.letter] ? '' : {'-2': '𝄫', '-1': '♭', 0: '♮', 1: '♯', 2: '𝄪'}[note.accidental];
      if (accidental) svg += `<text data-accidental-midi="${note.midi}" class="accidental ${state}" text-anchor="end" x="${accidentalPositions.get(note)}" y="${y+6}">${accidental}</text>`;
      svg += `<ellipse data-step="${note.phraseStep}" data-midi="${note.midi}" class="note ${state}" cx="${x}" cy="${y}" rx="7.5" ry="4.5" transform="rotate(-16 ${x} ${y})"/>`;
      // Hints are updated in place with the notehead, not by rebuilding the SVG.
      // Adjacent pitches use separate horizontal lanes so chord hints remain legible.
      const lane = notes.filter(other => other.phraseStep === note.phraseStep && Math.abs(staffStep(other)-staffStep(note)) < 5 && staffStep(other) < staffStep(note)).length;
      svg += `<text data-step="${note.phraseStep}" data-target="${note.midi}" class="note-direction" x="${x+26+lane*20}" y="${y+1}" text-anchor="middle" dominant-baseline="middle" aria-hidden="true"></text>`;
      svg += `<text data-step="${note.phraseStep}" data-target="${note.midi}" class="note-check" x="${x+26+lane*20}" y="${y+1}" text-anchor="middle" dominant-baseline="middle" aria-hidden="true"></text>`;
    });
  }
  svg += `<path class="brace" d="M52 ${trebleBottom-40} Q32 ${trebleBottom-40} 42 ${(trebleBottom+bassBottom-40)/2-12} Q40 ${(trebleBottom+bassBottom-40)/2} 30 ${(trebleBottom+bassBottom-40)/2} Q40 ${(trebleBottom+bassBottom-40)/2} 42 ${(trebleBottom+bassBottom-40)/2+12} Q32 ${bassBottom} 52 ${bassBottom}"/></svg>`;
  systems += svg;
  }
  $('staff').innerHTML = systems;
  $('phrase-position').textContent = !phrase.length ? '—' : settings().endAction === 'new' ? String(streamOffset+phraseIndex+1) : `${phraseIndex+1} / ${phrase.length}`;
  $('note-names').textContent = target.map(noteName).join(' · ');
}

function scrollToCurrent() {
  const system = [...$('staff').querySelectorAll('.phrase-system')].find(el => +el.dataset.start <= phraseIndex && +el.dataset.end >= phraseIndex);
  if (!system) return;
  const outer = $('staff').getBoundingClientRect(), inner = system.getBoundingClientRect();
  if (inner.top < outer.top || inner.bottom > outer.bottom) $('staff').scrollTop += inner.top-outer.top;
}

function drawKeyboard() {
  const {low, high} = settings();
  const pitches = Array.from({length: high-low+1}, (_, i) => low+i);
  let whites = 0;
  const width = 36;
  $('keyboard').innerHTML = '';
  for (const pitch of pitches) {
    const isWhite = WHITE.includes(pitch % 12);
    const key = document.createElement('button');
    key.type = 'button';
    key.className = `key ${isWhite ? 'white' : 'black'}`;
    key.dataset.pitch = pitch;
    key.setAttribute('aria-label', `${noteName(spell(pitch))}, MIDI ${pitch}`);
    // Allow endpoint black keys to occupy their own first/last half slot.
    if (pitch === low && !isWhite) whites += 0.5;
    key.style.left = `${isWhite ? whites*width : whites*width-11}px`;
    if (isWhite) whites++;
    else if (pitch === high) whites += 0.5;
    const label = document.createElement('span');
    label.textContent = pitch % 12 === 0 ? noteName(spell(pitch)) : '';
    key.append(label);
    const direction = document.createElement('span');
    direction.className = 'key-direction'; direction.setAttribute('aria-hidden', 'true');
    key.append(direction);
    const stateMark = document.createElement('span');
    stateMark.className = 'key-state'; stateMark.setAttribute('aria-hidden', 'true');
    key.append(stateMark);
    key.addEventListener('pointerdown', event => {
      event.preventDefault(); key.setPointerCapture(event.pointerId);
      performance.noteOn(`pointer:${event.pointerId}`, pitch); update();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) key.addEventListener(type, event => {
      performance.clear(`pointer:${event.pointerId}`); update();
    });
    // Keyboard navigation can audition one key at a time.
    key.addEventListener('keydown', event => {
      if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); performance.noteOn('computer', pitch); update(); }
    });
    key.addEventListener('keyup', event => {
      if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); performance.clear('computer'); update(); }
    });
    key.addEventListener('blur', () => { performance.clear('computer'); update(); });
    $('keyboard').append(key);
  }
  $('keyboard').style.width = `${Math.max(whites*width, 36)}px`;
  paintKeys();
}
function paintKeys(hints = []) {
  const held = performance.held, sustained = performance.sustained;
  const pitches = new Set(target.map(n => n.midi));
  const directions = new Map(hints.map(hint => [hint.played, hint.direction]));
  for (const key of $('keyboard').children) {
    const n = +key.dataset.pitch;
    key.classList.toggle('target', pitches.has(n));
    key.classList.toggle('correct', held.has(n) && pitches.has(n));
    key.classList.toggle('wrong', held.has(n) && !pitches.has(n));
    key.classList.toggle('sustained', sustained.has(n));
    key.setAttribute('aria-pressed', String(held.has(n)));
    key.querySelector('.key-direction').textContent = directions.has(n) ? (directions.get(n) === 'up' ? '↑' : '↓') : '';
    key.querySelector('.key-state').textContent = held.has(n) ? (pitches.has(n) ? '✓' : '×') : sustained.has(n) ? '≈' : '';
  }
  $('pedal').textContent = performance.pedal ? 'Sustain on' : 'Sustain off';
}
function newTarget() {
  clearTimeout(settleTimer); clearTimeout(nextTimer);
  phrase = settings().source==='midi' ? makeOutline(activePiece?.score,settings(),activePiece?.bounds).targets : makePhrase({...settings(), length:settings().endAction === 'new' ? 32 : settings().length});
  $('score-playing').textContent=settings().source==='midi' && activePiece ? `Practising ${activePiece.filename} · source attacks ${activePiece.bounds.start}–${activePiece.bounds.end}` : '';
  scorePanel.refresh();
  streamOffset = 0;
  restartPhrase();
}
function restartPhrase() {
  clearTimeout(settleTimer); clearTimeout(nextTimer);
  phraseIndex = 0; solved = false;
  waitingForRelease = performance.held.size > 0;
  target = phrase[0] || []; $('chord-name').textContent = '';
  $('staff').scrollTop = 0; drawStaff(); scrollToCurrent();
  progress.start(waitingForRelease ? [] : target,settings(),phrase);
  update();
}
function advancePhrase() {
  if (performance.held.size) return;
  if (phraseIndex === phrase.length-1) {
    if (settings().endAction === 'repeat') restartPhrase();
    else newTarget();
    return;
  }
  phraseIndex++; target = phrase[phraseIndex]; solved = false;
  if (settings().endAction === 'new' && phraseIndex >= 24) {
    const prune = phraseIndex-7;
    streamOffset += prune;
    phrase = phrase.slice(prune).concat(makePhrase({...settings(),length:prune,sequenceOffset:streamOffset+phrase.length-prune}));
    phraseIndex -= prune; target = phrase[phraseIndex];
  }
  drawStaff(); scrollToCurrent();
  progress.start(target,settings(),phrase);
  update();
}
function update() {
  clearTimeout(settleTimer); clearTimeout(nextTimer);
  sound.sync();
  const held = performance.held;
  const result = match(target, held);
  const hints = solved || waitingForRelease ? [] : result.hints;
  const directions = new Map(hints.map(hint => [hint.target, hint.direction]));
  paintKeys(hints);
  for (const head of $('staff').querySelectorAll('[data-midi]')) head.classList.toggle('hit', +head.dataset.step === phraseIndex && held.has(+head.dataset.midi));
  for (const check of $('staff').querySelectorAll('.note-check')) check.textContent = +check.dataset.step === phraseIndex && held.has(+check.dataset.target) ? '✓' : '';
  for (const hint of $('staff').querySelectorAll('.note-direction')) hint.textContent = +hint.dataset.step === phraseIndex && directions.has(+hint.dataset.target) ? (directions.get(+hint.dataset.target) === 'up' ? '↑' : '↓') : '';
  if (waitingForRelease) {
    if (held.size) { $('feedback').textContent = 'Release keys'; $('detail').textContent = ''; return; }
    waitingForRelease = false;
    progress.start(target,settings(),phrase);
  }
  if (!target.length) {
    $('feedback').textContent = 'No notes in this range';
    $('detail').textContent = 'Choose another hand, widen the reading range, or adjust the keyboard endpoints.';
    return;
  }
  if (!solved) progress.observe(held);
  if (solved) {
    $('feedback').textContent = 'Correct. Release keys.';
    $('detail').textContent = '';
    if (!held.size) nextTimer = setTimeout(advancePhrase, 250);
    return;
  }
  if (result.complete) {
    $('feedback').textContent = 'All notes matched';
    $('detail').textContent = 'Hold briefly…';
    settleTimer = setTimeout(() => {
      if (match(target, performance.held).complete) {
        solved = true; progress.complete(); $('chord-name').textContent = chordName(target);
        if (settings().endAction === 'new' || phraseIndex === phrase.length-1) {completed++; $('count').textContent = completed;}
        update();
      }
    }, SETTLE_MS);
  } else {
    $('feedback').textContent = result.extra.length ? hints.length ? 'Adjust the marked notes' : 'Extra notes — release the red keys' : result.correct.length ? 'Add the missing notes' : '';
    const available = settings();
    const outside = [...held].filter(n => n < available.low || n > available.high);
    $('detail').textContent = `${result.correct.length} of ${target.length} matched · ${result.missing.length} missing${result.extra.length ? ` · ${result.extra.length} extra` : ''}${outside.length ? ` · Outside keyboard range: ${outside.map(n => noteName(spell(n))).join(', ')}` : ''}${settings().source!=='midi' && settings()['min-size'] > target.length ? ' · Fewer distinct written notes fit this range.' : ''}`;
  }
}

for (const id of controls) $(id).addEventListener('change', () => {
  if (['preview','scroll-mode'].includes(id)) {persist(); drawStaff(); update(); return;}
  if (+$('low').value > +$('high').value) $(id === 'low' ? 'high' : 'low').value = $(id).value;
  if (+$('min-size').value > +$('size').value) {
    if (id === 'min-size') $('size').value = $('min-size').value;
    else $('min-size').value = $('size').value;
  }
  syncMode(); rangeLabels(); persist(); drawKeyboard(); newTarget();
});
for (const id of ['low', 'high']) $(id).addEventListener('input', rangeLabels);
for (const input of document.querySelectorAll('[name="end-action"]')) input.addEventListener('change', () => {persist(); syncMode(); completed=0; $('count').textContent='0'; newTarget();});
$('reveal').addEventListener('change', () => { $('note-names').hidden = !$('reveal').checked; });
$('reset').addEventListener('click', () => { performance.clear(); update(); });
for (const endpoint of ['low', 'high']) $(`learn-${endpoint}`).addEventListener('click', () => {
  learning = learning === endpoint ? null : endpoint;
  $('range-status').textContent = learning ? `Play your ${endpoint === 'low' ? 'lowest' : 'highest'} physical key now. Click again to cancel.` : 'Learning cancelled.';
});
function onMidi(event, inputId) {
  const [status, note, velocity] = event.data;
  if ((status & 0xf0) === 0x90 && velocity > 0) $('midi-activity').textContent = `Last MIDI note: ${noteName(spell(note))} · MIDI ${note} · channel ${(status & 15)+1}`;
  if (learning && (status & 0xf0) === 0x90 && velocity > 0) {
    $(learning).value = note;
    if (+$('low').value > +$('high').value) $(learning === 'low' ? 'high' : 'low').value = note;
    $('range-status').textContent = `Learned ${learning === 'low' ? 'lowest' : 'highest'}: ${noteName(spell(note))} (MIDI ${note}).`;
    learning = null; persist(); rangeLabels(); drawKeyboard(); newTarget();
    return;
  }
  if (performance.midi(inputId, event.data)) update();
}
async function selectInput(id, reopen = false) {
  const revision = ++inputRevision;
  const previous = selectedInput;
  const input = access ? [...access.inputs.values()].find(port => port.id === id && port.state === 'connected') : null;
  if (previous) previous.onmidimessage = null;
  // Assign before opening: native open/close operations emit statechange events.
  selectedInput = input;
  performance.clear(); sound.engine?.live.stop();
  $('midi-activity').textContent = '';
  $('midi-status').textContent = input ? `Opening · ${input.name || 'MIDI keyboard'}…` : 'No MIDI input connected.';
  update();
  try {
    if (previous && (previous !== input || reopen)) await previous.close();
    if (revision !== inputRevision || !input) return;
    await input.open();
    if (revision !== inputRevision || selectedInput !== input) return;
    input.onmidimessage = event => {
      if (revision === inputRevision && selectedInput === input) onMidi(event, input.id);
    };
    $('midi-status').textContent = `Connected · ${input.name || 'MIDI keyboard'}`;
  } catch (error) {
    if (revision !== inputRevision) return;
    if (input) input.onmidimessage = null;
    $('midi-status').textContent = `MIDI input could not open (${error.name}). Close other MIDI tabs/apps, then click Refresh MIDI.`;
  }
}
async function refreshInputs(reopen = false) {
  const devices = [...access.inputs.values()].filter(input => input.state === 'connected');
  const previous = selectedInput?.id;
  $('inputs').replaceChildren(...devices.map(input => new Option(input.name || 'MIDI keyboard', input.id)));
  if (!devices.length) $('inputs').add(new Option('No MIDI input connected', ''));
  $('inputs').disabled = !devices.length;
  const chosen = devices.find(input => input.id === previous) || devices[0];
  $('inputs').value = chosen?.id || '';
  // Compare the actual port object: a reconnect can replace it while keeping ID.
  if (reopen || selectedInput !== chosen) await selectInput(chosen?.id, reopen);
}
$('inputs').addEventListener('change', () => { void selectInput($('inputs').value); });
$('connect').addEventListener('click', async () => {
  if (!navigator.requestMIDIAccess) {
    $('midi-status').textContent = 'Web MIDI is unavailable. Try Chrome or Edge at http://127.0.0.1:8766; on-screen practice still works.';
    return;
  }
  $('connect').disabled = true;
  try {
    if (!access) { access = await navigator.requestMIDIAccess({sysex: false}); access.onstatechange = () => { void refreshInputs(); }; }
    await refreshInputs(true); $('connect').textContent = 'Refresh MIDI';
  } catch (error) {
    $('midi-status').textContent = error.name === 'NotAllowedError' ? 'MIDI permission was denied. Allow MIDI in your browser’s site settings, then reconnect.' : `MIDI could not start (${error.name}). Reconnect your keyboard and try again.`;
  } finally { $('connect').disabled = false; }
});
window.addEventListener('blur', () => {sound.panic(); progress.pause(); performance.clear(); update();});
window.addEventListener('focus', () => {progress.resume(); update();});
document.addEventListener('visibilitychange', () => {if (document.hidden) {sound.panic(); progress.pause(); performance.clear(); update();} else if (document.hasFocus()) {progress.resume(); update();}});
window.addEventListener('resize', () => {applyDensity(); drawStaff(); scrollToCurrent(); update();});
rangeLabels(); drawKeyboard(); newTarget();
