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
uses immediate exact physical pitch matching in Fluid mode, with one-target
legato overlap and fresh attacks for repeated targets. Release-between-targets
mode retains its stable-match window and release gate. Both loop or advance
according to the remembered mode. Repeat previews wrapped opening events
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
The original lyre SVG remains available. The header uses a locally stored generated
transparent grand-staff banner as a theme-coloured CSS mask; its prompt/provenance
are in static/assets/header-art.md. Product text remains selectable and accessible.
All imagery and fonts remain local; artwork adds no header height.

Real-time, low-latency interaction is a core requirement. No server round trip or
animation gates feedback. Fluid progression has no fixed completion or release
delay. The optional release-between-targets mode has a 120 ms stable-pitch window. Measure real device-to-paint latency before claiming a latency figure
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

`audio.js` owns two independent instrument paths (additive synthesis or bundled
acoustic recordings) and a master limiter.
Live voices follow the union of physically held and sustained notes; reference
voices audition the active target for 0.8 seconds and never enter `Performance`.
Both paths have independent instrument/gain controls. Original piano-like/organ
oscillators require no third-party asset licence or download. Multiple velocity layers,
advanced sampling, full notated-score playback and external MIDI output remain future work.

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


`--coverage` now also runs dependency-free Python source-line measurement through
`tests/python_coverage.py`. The tracer includes project `.py` frames only (not Jinja's
compiled HTML or installed dependencies). Per-module percentages go into the compact
JSON/Markdown report; missing-line annotations stay in ignored
`test-results/python-coverage/`. Python branch coverage and full browser-controller
coverage are not measured. Normal successful tool output remains four summary lines.


History restoration validates complete version-1 JSON files before mutation (16 MB /
1,000 attempts), checks pitch-spelling and accuracy consistency, merges duplicates
by canonical attempt content and retains the latest 1,000. Failed imports preserve
existing records; saving remains opt-in. An exact UTC daily table complements the
SVG graph, and the summary exposes the 90th-percentile response time.


MIDI outline track rules are explicit preview choices, snapshotted into the active
passage on Practise. Included tracks may infer staff from middle C or be assigned
treble/bass by the player. Explicit assignments filter by assigned staff and the
shared physical/reading range, allowing cross-middle-C notes; automatic assignments
retain existing pitch-based hand/range behavior. Original tracks/channels/notes stay
unchanged. Duplicate simultaneous pitches collapse to one playable key while retaining
all included source IDs. Progress identities include the passage's track-rule snapshot.


Progress records retain written pitches and source tick/onset, while source hash and
passage identify imported material. They omit bulky per-attack source-ID lists, which
remain in the active outline/inspection. The 16 MB restore limit allows complete
1,000-attempt exports of complex passages; the count limit stays unchanged.


## Source performance playback

`transport.js` derives a separate reference-audio plan from preserved MIDI events,
applying tempo-map conversion, velocity, per-track/channel note ownership and global
channel sustain. Same-tick controller order is preserved. CC64/121 release pedal;
CC120 kills sounding voices; CC123 releases held notes while respecting sustain.
Percussion is excluded; selected tracks determine note inclusion while conductor
controllers still apply. Source notes/events remain unchanged. Passage boundaries
clip sound; already sounding tones are chased at the start with a fresh envelope.
Playback is capped at 128 concurrent voices and 25–200% speed.

`PlaybackCursor` uses audio-clock look-ahead, retains held spans across pause/resume
and skips elapsed attacks after a stall. `playback.js` owns explicit play/pause/stop
controls, a snapshot plan and revision guards. The reference synth uses unique voice
IDs so repeated pitches remain independent; stopping cancels future scheduled attacks
and release tails as well as active mapped voices. All oscillator/gain nodes clean up.

No generated audio reaches input matching. Source playback does not move the untimed
practice cursor; metronome remains independent. Reference mute/instrument changes,
target audition, source-passage edits, panic and backgrounding stop playback. MIDI
bank/program/pitch-bend/expression data are retained but not yet rendered by these
original piano/organ instruments. Timed scoring and full notation remain future work.


`readingPatterns` groups single-note attempts by versioned comparable exercise
settings (plus exact repeat phrase/source passage) and written pitch/staff. It needs
8 exposures to flag >=3 corrected targets. A speed flag additionally needs 24 cohort
attempts / 3 distinct written notes, and median >1.5*cohort median+200 ms. These are
transparent heuristics, not statistical diagnoses. Unknown identity versions and
chords are excluded. Source data stay unchanged; the UI shows counts/context and
uses text rather than colour-only warnings. Recommendations/drills remain future work.


Live note attacks carry velocity and a monotonic serial per source/channel/pitch.
The synth retriggers only for a newer attack, even if sustain kept the pitch sounding.
Removing a newer owner never retriggers an older held owner. Duplicate held note-ons
refresh audio while preserving existing pitch-set/completion behavior; unrelated CCs
still do no rendering work. On-screen keys use a fixed default velocity. Source-aware
release/pedal/reset clears attack metadata without changing physical-held matching.


## Saved passage bookmarks

`passages.js` validates/normalizes bounded metadata for up to 50 local bookmarks:
source SHA-256, label, filename, source-onset range (<=512), track/staff rules and
update time. Equivalent file/range/rules update a bookmark rather than duplicating
it. Music bytes and pitch/range settings are not stored in bookmarks. Loading the
same file is required; a selected bookmark restores preview only, never active practice.
Source playback stops when the preview passage changes. Cross-tab storage events
refresh the menu without changing targets. Storage failure retains a session-only
bookmark and reports that limitation. Invalid stored records are ignored safely.


## Keyboard fit and private real-piece smoke check

`keyboard.js` separates pitch/key geometry from key width, including black endpoint
half-slots. Automatic width fits an 88-key instrument at desktop width, with 16 px
minimum keys (28 px on coarse pointers); explicit 20/28/36 px choices remain available.
Changing size or resizing updates existing nodes/CSS, preserving pointer capture,
held state, exercise identity and progress. Symbols adapt with key width, retaining
independent target colours and non-colour feedback. Full MIDI-range overflow scrolls.

On 2026-10-16 a private live-source smoke check used Mutopia item 470 (Chopin Prelude
Op.28 No.7), whose source page labels it Public Domain:
https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=470
The 1,759-byte MIDI imported 168 note attacks / 3 tracks / 24 seconds with no warnings.
Its derived outline retained all 168 notes in 49 targets; synthetic MIDI advanced the
first target. Full native OfflineAudioContext rendering ended with zero lingering
voices/nodes and source audio did not score as input. Downloaded files/report remain
ignored under test-results; no third-party score is bundled or cleared for redistribution.
This checks software compatibility, not recovered engraving, human listening or MIDI
hardware latency. Normal regressions stay offline with the original project fixture.


The masthead uses the single-line accessible title “Piano Sight Reader” and tighter
button padding, preserving the subtle generated banner palette. At narrow widths
the title scales and the two compact actions remain alongside it.

The 1440p preset allows a 380 px stave (subject to available viewport space), so ordinary grand-staff exercises fit without a vertical scrollbar. Extreme ledger ranges still retain bounded overflow. Other presets are unchanged.

History can be cleared for the elapsed last hour, local calendar day or all time. Selective clearing updates stored history immediately, cancels pending saves and invalidates pending imports; active practice stays intact. The live-audio button and checkbox share one state and reset together on panic, failure and reload.

Fluid progression uses a pure FlowGate with attack serial baselines. Completion has no fixed timer. Retiring pitches from only the immediately preceding target are ignored until released or reattacked; arbitrary extras still block completion. Identical consecutive chords require every pitch to be rearticulated, subsets require at least one fresh target attack, and pedal sound never counts as a physical hold. Progression policy is part of new measurement identities. Native-MIDI browser regression sends eight complete targets without timer waits and tests legato transitions through an imported two-target passage. Hardware event-to-paint latency remains unmeasured.

Bundled library: static/library/catalogue.json records source URLs, edition,
contributor, licence evidence, review date and original MIDI checksum. Inspections
are prebuilt locally with `python tools/build_library.py`; tests reconstruct every
entry from its original MIDI and check exact data/provenance equality. No external
fetch or MIDI parsing is needed when a user loads a bundled piece. Selection and
local import share a revision guard; preview never replaces active practice until
explicit activation. Source files and notices remain alongside the GPL code.

Passage suggestions use MIDI markers, at least a half-quarter rest gap, then meter
boundaries (default 4/4 when absent) within a default 32-onset bound. Large files
increase the bound up to 512 to keep the menu at most 128 entries. Unknown releases
suppress gap inference. These are adjustable performance chunks, not recovered
phrasing, voices, rhythmic notation or a structural harmonic analysis.

Sound/metronome now share the right settings column beneath keyboard range. The
full-width library has a dividing rule and bounded aligned fields. File selector
colours follow both themes; daily measurements and breakdown have explicit spacing.

Acoustic grand: 30 unchanged Salamander V2 MP3 recordings, A0–C8 in minor thirds,
2,012,677 bytes total. A pinned upstream commit, per-file SHA-256, original author
notes, full CC BY 3.0 text and clear separate-media attribution accompany them.
The nearest sample is pitch-shifted by AudioBufferSourceNode; velocity controls
amplitude. This is a single-layer browser instrument, without the full Salamander
release/pedal/resonance engine. Existing live sustain ownership still controls
voice releases. Buffers are shared by live/reference paths, decoded asynchronously
with four workers before audition/playback and never fetched or decoded in MIDI
handlers. Load failures are retryable; panic invalidates pending target auditions.
Ended held samples remain silent until a fresh attack; timed and released voices
clean up their nodes. Unit tests cover transposition/ownership/load failures; native
OfflineAudioContext renders the actual recordings and checks energy, release tail
and node cleanup. Hardware latency and subjective speaker quality are unverified.
