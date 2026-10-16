# Development

## Architecture and performance

Flask serves local assets; the browser owns MIDI, notation, keyboard feedback and
exercise state. `static/core.js` has spelling, target generation, exact matching,
and per-source/channel held/sustain state. `static/app.js` handles UI, MIDI lifecycle
and completion timing. Native modules need no build or npm install.
`static/harmony.js` wraps the random generator with bounded diatonic chord/cadence
voicings and local nearest-voicing preferences. Continuous refill passes an absolute
sequence offset so cadences do not restart at buffer boundaries. Each hand has a
span and five-note cap; all generated pitches still obey the physical/reading range.
`makePhrase` chooses a per-target chord size within the bounds, then uses the
same spelling/range generator. Phrases stay in memory, and repeat reuses the
sequence. Display-only changes never regenerate it. The active target remains
leftmost after the signature in note view. In page view the pointer advances within
a stationary window. Both use the pure readingWindow policy and bounded look-ahead. Completion
requires a stable correct set and physical release, then automatically loops or
advances according to the remembered mode. Repeat previews wrapped opening events
with virtual step IDs beyond the end and a double barline at the loop boundary;
future occurrences of the same pitch must not inherit current-key feedback.
Continuous ignores repeat length and replenishes a bounded queue in 16-target
chunks, keeping an absolute stream position. Mode changes start fresh practice
and reset the mode-specific counter. Resetting while held requires release.
Each target has a barline so accidentals reset rather than leaking into the next
target. Repeat counts complete repetitions; Continuous counts individual targets.
Chord naming compares exact pitch-class sets against a small template catalogue,
prefers a bass-root interpretation and adds slash bass for inversions. Doublings
are ignored; absent matches stay blank. Names are possible interpretations,
without harmonic context, and appear only after correctness is established.
`static/notation.js` computes staff positions with ledger/stem margins and a growing
gap between staves. The SVG scales naturally with its height, without a height cap.
Theme, keyboard inversion and target-key visibility use independent local settings
and do not change MIDI or exercise state. Target markers default off. Direction
arrows update in place on each paired played key and missing written note.
Chord matching locks correct pitches, then identifies mutually unique nearest
unmatched neighbours within two semitones. It leaves ties and distant candidates
unassigned without recursively breaking ties. Single-note direction is unrestricted.
This bounded local comparison is quadratic in pitch count and does no network work.
The lyre SVG is original code-drawn ornament; all imagery and fonts remain local.

Real-time, low-latency interaction is a core requirement. No server round trip or
animation gates feedback. The 120 ms stable-correct-pitch window only gates exercise
completion. Measure real device-to-paint latency before claiming a latency figure
or changing runtime architecture. Consider WebAssembly for demonstrated heavy work,
such as future real-time audio analysis, rather than assuming it improves MIDI/DOM
delivery. Preserve this requirement when adding features.

Written notes carry `{midi, letter, accidental, octave, staff}`. Accidental values
support doubles independently of MIDI pitch. SVG rendering currently provides
clefs, ledger lines, explicit accidentals and offset adjacent noteheads. It is a
foundation, not a full engraving engine. Generated chords are pitch sets, without
voice-leading, hand-span guarantees or rhythm.
The 15 standard key signatures share major/natural-minor pitch collections.
Generation preserves key-native spelling, including octave-crossing B♯/C♭.
Rendering places the signature on each clef and emits an explicit accidental,
including a natural, only when the note differs from the signature.
Generated chords reserve distinct diatonic positions, retaining natural spellings
and searching sharp/flat alternatives for black keys. Unspellable additions are
skipped, possibly reducing target size in dense ranges. This is generation-time
work, outside the MIDI event path. Authored score spellings should remain authored;
future rendering of same-position altered unisons needs explicit voice engraving.
Accidentals occupy the nearest available column, separated only for vertical
collisions. Target colours follow each key's actual light/dark background.

## Checks

```powershell
.\.venv\Scripts\python.exe tests/run_checks.py --browser --coverage
```

The runner starts its own temporary loopback server and prints only a short
summary. Full output, coverage details and browser screenshots are retained in
ignored test-results/ (`report.json`, `report.md`, individual `.log` files).
Inspect specific failed logs instead of sending full passing output to the model.
Use `--channel msedge` for installed Edge, `--node PATH` for a Node executable,
and `--browser-node PATH` when Playwright requires a newer Node than unit tests.
Without `--browser`, the report explicitly marks browser checks skipped. Node
unit coverage is a separate measure from browser scenarios and hardware testing;
do not describe it as whole-application coverage. Python unit tests also cover
the runner's summary/failure reporting. No additional test dependency is needed
for the runner itself. Direct `npm test` and unittest commands remain supported.

Node 18+ is only required for JavaScript tests. Python tests use unittest.
The optional integration suite needs Node 20+ and Playwright (`npm install
--no-save playwright`, then `npx playwright install chromium`). Start the app in
another terminal and run `node tests/browser.cjs`. Use `BROWSER_CHANNEL=msedge`
(PowerShell: `$env:BROWSER_CHANNEL = 'msedge'`) to use installed Edge instead.
Screenshots go to ignored `test-results/`. Neither Playwright nor Node is a runtime
dependency of the app.
Test spelling, range boundaries, matching, sources/channels and pedal state.
Browser checks should include synthetic MIDI, completion stability, staggered
onsets, extra pitches, release gating, permission failures, disconnects, range
learning, and desktop/mobile rendering. Synthetic MIDI does not verify USB hardware.
The MIDI fixture must model explicit `open()`/`close()`, their statechange events,
open rejection and same-ID replacement input objects. A plain onmidimessage stub
misses native lifecycle failures. Report connected only after successful open;
Refresh MIDI reopens the selected port. Bind messages to the input and selection
revision so stale callbacks cannot affect practice after switching inputs.

Manual hardware checklist: play wrong notes; stagger a chord; release while
sustaining; lift the pedal; unplug/replug; learn both endpoints. Measure latency
on the actual Yamaha and later full-size instrument separately. No real hardware
verification or measured hardware latency is claimed by automated tests.

## Future direction

See [ROADMAP.md](ROADMAP.md) for staged work, acceptance goals, score import and
progressive simplification, holds/ties/meter, playback, scoring modes, catalogue
and visual backlog. Backlog entries are not authorisation to implement them now.

- Musically voiced, hand-span-aware chords and richer reading-level controls.
- Authored enharmonics, harmonic/melodic minor and double accidentals.
- Real composed public-domain snippets and reviewed score import. Verify rights
  for each composition, edition and source; do not assume editions or recordings
  are all public domain. No score material or recordings are currently bundled.
- Optional right-to-left timed/score-loss and reaction-time modes after the untimed foundation. Rhythm and reaction
  modes must not be prerequisites for basic reading practice.
- Profile and improve event-to-paint latency as the application grows.

README is for end users. Keep setup, requirements and usage current in every
change; put architecture, tests, plans and working notes here or in AGENTS.md.
