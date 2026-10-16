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
Continuous ignores repeat length and replenishes a bounded queue while retaining
seven previous targets for page alignment, keeping an absolute stream position. Mode changes start fresh practice
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

`static/metrics.js` measures untimed attempts with an injectable monotonic clock.
Stable-match onset is recorded before the confirmation timer, pauses freeze elapsed
time, and extras are counted on new presses rather than every render. The progress
panel keeps at most 1,000 records; saving is opt-in and debounced outside MIDI handlers.
Identities exclude display-only settings and include material, written target and repeat
phrase. No note-level fault attribution is attempted for multi-note targets.

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


## Local audio foundation

`audio.js` owns two independent additive-synthesis paths and a master limiter.
Live voices follow the union of physically held and sustained notes; reference
voices audition the active target for 0.8 seconds and never enter `Performance`.
Both paths have independent instrument/gain controls. Original piano-like/organ
oscillators require no third-party asset licence or download. Velocity-sensitive
sampling, complete score playback and external MIDI output remain future work.

`MetronomeClock` emits timestamped clicks into a 100 ms audio-clock look-ahead;
a 25 ms scheduler pumps it. After a stall it re-anchors without a burst of overdue
clicks. It is independent of untimed target progression. Backgrounding/panic stops
both paths and the scheduler. Sound activation requires a user gesture; saved
preferences never enable live sound or metronome on page load.

Tests cover deterministic node ownership/releases, independent buses, timed voice
cleanup, scheduler accents/stalls, real browser OfflineAudioContext waveform/tail,
controls/persistence and unsupported-audio recovery. These do not verify perceived
instrument quality or physical input/output latency.


## Score discovery

`tools/discover_scores.py` reads bounded Mutopia catalogue/detail pages and emits
ignored JSON/Markdown shortlists. It requires explicit solo-piano metadata, edition,
composer, linked public-domain/CC0 evidence and a same-source MIDI link. Other
licences are omitted for individual review, not classified as GPL-incompatible.
The report retains per-edition evidence, contributor and a metadata-page hash.
It neither downloads assets nor imports/bundles a piece. Final distribution review
and actual asset checksums remain separate work.

Fetches have size/time/request limits and source-host-only redirects. Normal tests
use deterministic offline HTML fixtures, including missing/conflicting licences,
external links, pagination loops, partial network failure and CLI output. Live source
smoke checks are separate because network availability and catalogue HTML can change.


## Local MIDI inspection

`score_import.py` uses MIT-licensed Mido 1.3.3 (pinned in requirements) to decode
Standard MIDI formats 0/1. A bounded preflight validates chunks, four-byte variable
length values and event counts before constructing objects. Input is capped at
256 KB / 64 tracks / 25,000 events; SMPTE and asynchronous format 2 are rejected.
`POST /api/inspect-midi` returns normalized in-memory JSON; nothing is persisted.

Keep the complete event stream (track, event index, absolute/delta ticks and all
message fields) separate from paired physical note spans. Pair repeated same-pitch
notes FIFO within track/channel, warn about ambiguity and leave unmatched durations
unknown. Pedal messages never rewrite physical note-off time. A tempo map computes
elapsed seconds; source ticks remain authoritative. Original bytes are identified
by SHA-256 and never rewritten. Spelling, printed voices, ties, fingerings and hand
assignments are absent from MIDI and must remain explicitly derived in future work.

`static/score.js` provides local preview/export; a failed import preserves the last
valid inspection. Tests use the project's original `tests/fixtures/polyphony.mid`,
with independent overlapping notes, sustain and a tempo change (960 ticks / 1.1 s).
Do not substitute an unverified third-party score into regression fixtures.


## MIDI pitch outlines

`static/outline.js` groups only exact simultaneous attacks, retains tick/onset/source
note IDs, excludes percussion channel 10 from piano practice and derives a separate
pitch outline. It does not mutate inspected events, durations, overlaps or controllers.
Filters reuse physical/reading range, key material and staff choice; maximum chord
size retains melody, bass, then inner pitches. Collision-safe inferred spelling may
omit another pitch. Selected source-onset windows are limited to 512, with explicit
retained/omitted counts. Empty filtered attacks are skipped only in this untimed view.

The explicit Practise action activates a snapshot of the inspected file/passage;
subsequent inspection previews do not replace active practice. Only Repeat is enabled
for local outlines; generated phrase length/minimum chord size do not apply. Reloads
return to generated practice because files are not persisted. Progress identities
include source hash, passage and attack position without embedding an entire long
piece per attempt; generated-exercise identities remain compatible.

This is attack-reading practice, not a duration/tie/polyphonic score matcher or an
original engraving. Sustained voices and rhythms must use the preserved source model
when the future timed modes are implemented, not this reduced target list.


Reading measurement pauses use independent reasons for window focus, endpoint
learning and MIDI reconnection. Resolving one reason must not resume another pause.
On-screen input can resume measurement during a device disconnection; endpoint
learning remains paused until learned/cancelled. No device is required for initial
on-screen measurement. These exclusions do not change target matching or MIDI input.


## Resolution presets and stable playing layout

`layout.js` maps Automatic/720p/1080p/1440p/2160p to a viewport budget, reserving
180 px for browser/desktop chrome. Actual viewport height is always an upper bound.
Previous Compact/Comfortable preferences migrate to 1080p/1440p. Comfortable spacing
itself is tighter than the original header. The 720p score scales to 75%; other
presets retain normal notation scale and allow ledger overflow inside the staff.

The staff pane has a stable height, fitted after measuring the remaining page
chrome; an active-note scroll policy handles pitches outside it. Feedback has fixed
status/chord/detail rows, and MIDI activity always owns its space. Mode/note-name
controls live below the keyboard. Tests cover fixed and Automatic presets at usable
540/880/1160/1920 px heights, both clefs visible, unchanged targets across layout
changes, and a stationary keyboard for empty, extra, partial, correct and advanced
feedback. These are browser viewport tests, not physical monitor/DPI measurements.
