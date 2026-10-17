# Development

Start with [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) for the concise current-state
map. This file retains detailed contracts and investigation notes; read relevant
sections rather than loading it all for each task. ROADMAP.md tracks delivery status.

## Architecture and performance

Flask serves local assets; the browser owns MIDI, notation, keyboard feedback and
exercise state. `static/core.js` has spelling, target generation, exact matching,
and per-source/channel held/sustain state. `static/app.js` handles UI, MIDI lifecycle
and completion timing. Native modules need no build or npm install.
`static/harmony.js` defines diatonic and authored advanced recipes; chromatic
recipes store diatonic degree/alteration pairs and preserve functional spelling
through double accidentals. `static/generation.js` plans explicit hands, per-hand
note caps and symmetric nearest-voice leap limits, span and ledger-line ceilings,
textures and untimed attack groups. Chord density tries the requested size first,
then reduces only for feasibility. It never widens a hard constraint. Generated
hands use split registers at middle C, not inferred physical fingering or crossing.
Range, accidentals/vocabulary, ledger lines, density, leaps and hand attack order
are independent dimensions; rhythmic duration/scoring remains a Stage 2 contract.
MIDI outlines retain their source/reduction pipeline and are never recomposed.
Continuous refills run in a native module worker (`generation_worker.js`) through
`GeneratedStream`: 32 active targets plus at most 17 prefetched targets, revision-
guarded settings replacement and explicit failure feedback. At index 24 a ready
refill prunes 17 targets and replenishes the stream; if not ready, existing targets
remain playable until exhaustion. A late worker reply resumes the earned advance
without crediting held/duplicate notes. Generation carries the last attack of each
hand and arpeggio/harmonic phase across chunks. Initial/settings generation remains
synchronous, outside MIDI input handling. A local Node benchmark of 17 ten-note
chromatic targets took approximately 60–90 ms before moving refill work to the worker;
this is generation cost, not physical or browser input-to-paint latency.
The low-level `core.makePhrase` remains an unrestricted pitch/spelling helper;
application generation uses the planner for all selected exercises. Phrases stay in memory, and repeat reuses the
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
foundation, not a full engraving engine. Random chords are untimed pitch sets.
Harmonic exercises add hand-span bounds and nearest-voicing preferences; neither
source has authored rhythm.
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
The optional integration suite needs Node 20+ (CI uses Node 24) and the pinned
Playwright development dependency: run `npm ci`, then `npx playwright install chromium`. Start the app in
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
  are all public domain. Reviewed MIDI editions and acoustic samples are now bundled
  under their individual licences; see Reviewed repertoire and discovery policy below.
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

Selecting a section/bookmark, editing endpoints or changing tracks activates a
snapshot of the inspected passage, as does the explicit Practise action. Loading
another file leaves active practice intact. Repeat, Continue through piece and
Stop at end are available for local outlines; generated phrase length/minimum chord size do not apply. Reloads
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


MIDI outline track rules are explicit choices, snapshotted into the active
passage when changed. Included tracks may infer staff from middle C or be assigned
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
practice cursor. Optional source clicks share its audio origin, tempo map and
meter; standalone metronome remains independent. Reference mute/instrument changes,
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
same file is required; selecting a bookmark activates its passage automatically.
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
local import share a revision guard. Loading a file leaves active practice intact;
section/bookmark selection, endpoint edits and track changes activate the passage. Source files and notices remain alongside the GPL code.

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

Source-aligned clicks use a pure beat plan built from MIDI tempo/meter events and
passage tick bounds. Count-in takes the entry tempo/meter, preserves offbeat entry
phase and uses the same audio origin as reference notes. BeatCursor schedules with
the audio look-ahead, skips stale pulses after stalls and omits negative count-in
beats on resume. Plans reject more than 8,192 source pulses before constructing
unbounded lists. Standalone and source-aligned clicks are mutually exclusive.
No click or playback event reaches the input matcher or changes untimed practice.
This implements MIDI denominator pulses, not recovered notated pickups or compound
beat grouping; rhythmic scoring and written-duration matching remain separate work.

GitHub Actions runs the same compact unit/Python/browser checks on pushes to main,
pull requests and manual dispatch. It uses Python 3.12, Node 24 and the lockfile's
Playwright 1.62.1; official actions are pinned to reviewed commit hashes. The job
summary contains report.md, with full logs, coverage data and synthetic-test
screenshots retained as a seven-day artifact. No deployment or repository write
permission is requested. Hosted CI execution is verified only after a future push;
local passing checks do not claim a successful GitHub run.

Failure output now selects the first named Node TAP failure ahead of any trailing
coverage table, while complete output remains in its local log. Other failures
retain a bounded tail; Windows consoles escape unencodable characters instead of
losing the test report. Runner regressions cover success, nonzero status, coverage
parsing and concise failure extraction.

The runner explicitly requests TAP and accepts both flat and directory-style Node coverage tables, keeping test counts and per-module reports stable across Node 18/24.

Harmonic vocabulary now includes diatonic sevenths (stacked scale thirds, including
major/minor/dominant/half-diminished qualities as the selected major/natural-minor
scale requires). Cadence patterns include I–IV–V–I, ii–V–I and I–vi–ii–V with absolute
sequence phase preserved during continuous refill. Existing per-hand span/five-note
limits and spelling rules apply. All 15 keys in major/natural-minor are tested at
every scale degree; new harmonic dimensions enter comparable progress identities
only for relevant exercise sources. No harmonic-minor leading tone is implied.

Practice pause is session-only and uses the measurement pause-reason set, preserving
elapsed active time and wrong presses. Input/audio feedback remains live while
completion/timers are suppressed. Fluid resume establishes fresh serial baselines;
release mode waits for existing holds to end without counting that wait or resetting
the attempt. New exercise settings clear a pending resume-release reason. The top
row reserves its button height, and layout regressions verify pause never moves the
keyboard in any preset. Reference playback/metronome are separate untimed controls.

The user-supplied Buy Me a Coffee URL and exact support wording appear after general settings and above Music library, and on the Help page. It uses theme colours and fine rules, wraps on narrow screens, and opens in a new tab without changing practice. Browser tests check the approved URL, wording, placement and narrow-screen fit.

History-save lifecycle: normal saves remain debounced outside MIDI handlers, but a
2-second maximum wait prevents uninterrupted playing from postponing persistence
forever. Dirty records flush synchronously on pagehide/visibility-hidden. No clean
or opted-out state is written, and both pending timers are cancelled by clearing
or opting out. The immediate-refresh reproduction lost the last result before this
fix; browser regressions now reload in the same task as a correct MIDI attack,
exercise 45 uninterrupted attacks and verify opt-out/clear never resurrect data.

Daily progress graph positions use actual elapsed UTC dates, rather than evenly spaced practice visits. Missing days preserve their calendar distance; a single recorded day is centred and labelled once. Pure coordinate tests cover an irregular ten-day span, zero response time, one day and no data, while the exact daily table remains available.

Computer-key input ignores event.repeat and duplicate activation while the same virtual key is physically held. Before the fix, a held Enter key advanced a repeated Fluid target twice without release. Browser regression checks Space autorepeat, Enter while Space remains held, and a genuine new Enter attack after release. MIDI rearticulation semantics remain based on actual note-on packets.


MIDI attack matching: FlowGate requires fresh attack serials for every imported
pitch (identified by sourceIds), even when a chord changes around a repeated
pitch. Generated chords follow the same fresh-press rule. This consumes
explicit MIDI note-ons without guessing printed ties; it adds no settling delay.
Original regression fixture repeated-attacks.mid changes C/E to E/G to E/A, and
browser tests require a new E for each target while permitting retiring-note legato.

Library browsing is a local intersection of composer, era, style and difficulty,
implemented in library.js independently of active practice. A bounded 500-entry
catalogue supplies facets; changing filters preserves a still-visible selection
and clears a hidden one without loading or replacing a passage. Missing difficulty
is Unrated; existing editions have no asserted grade. Future ratings need a
reviewed, multidimensional basis. Era and musical form/style are separate metadata.

The local /help page uses the same theme and support partial as practice, but loads
only help.js, with no MIDI/audio/controller initialization. The app opens it in a
separate tab so the current exercise is preserved. Button names and README steps
match: Load piece previews; Start practising this passage activates; Download MIDI
data (JSON) exports diagnostic performance data. No runtime dependency was added.
The support partial uses equal 3px double theme-line borders; the adjacent library
suppresses its own top rule to avoid a duplicate divider.


Help entry points: the masthead has a Help link styled as a quiet button beside
Connect MIDI; narrow screens show an accessible ? and arrange the theme control
above the Connect/Help pair. The library keeps its contextual Help & guide link.
Both open /help in another tab. Browser tests cover both actual popup routes and
header control separation at 320, 390, 530 and 650 px without title overlap.


Active exercise description: exercise.js describes the source and effective setup
rules, including key/relative tonality, hand, reading and keyboard ranges, chord
limits, pitch material or harmonic vocabulary, and mode. MIDI uses activePiece's
filename/endpoints/selected tracks, never ScorePanel's preview. It updates only in
newTarget, outside MIDI feedback, and wraps above the staff within the viewport
budget. Disabled imported minimum chord size and harmonic pitch material are omitted.

Written-note feedback now uses FlowGate.accepted: a held MIDI pitch without a new
attack in the current target cannot light or tick the next column. Partial fresh
chords light only their accepted pitches; repeated loop entries reset credit.
Generated changing chords also require fresh presses. Both initial
SVG rendering and in-place notehead/accidental/tick updates use the same credit set.
The physical on-screen keyboard continues to describe actual held keys separately.

The Help header has an accessible Close help × button calling window.close();
the former Open practice/footer explanation is removed. Browser regressions
close real guide tabs opened from both entry points and preserve the practice tab.


Sound auditions: visible copy consistently calls the accompaniment/audition path
Target (existing reference-* IDs and storage keys are retained for compatibility).
Hear live instrument auditions the current target for 0.8 seconds with the chosen
live instrument/gain; an empty exercise falls back to C/E/G. It never toggles Sound
my playing. A separate temporary SynthPath shares the acoustic bank and master bus,
so live MIDI sync does not cancel the preview or release held voices. Configuration,
panic and stale asynchronous sample loads cannot resurrect a cancelled preview.
Hear target retains its Target sound enable policy and source-playback stop hook.


All untimed targets now require fresh physical presses for every pitch. Performance
keeps raw attack serials for velocity/audio retriggering and separate press serials
that advance only after no input source physically holds that pitch. FlowGate uses
press baselines for matching/notation credit. Sustain does not block a released-key
re-press; duplicate note-ons and overlapping source ownership cannot fabricate it.
Retiring non-target notes from the previous chord retain their bounded legato grace.


## Authored score foundation

score_model.js is separate from raw MIDI inspections and current attack outlines.
compileScore validates and clones a version-1 authored source, returning deeply
frozen measures, events, written note segments, tied sounding spans, tempo changes
and a sweep-line timeline of attacks/continuations/releases/voice rests. Beat arrays
[numerator, denominator] use exact BigInt intermediate arithmetic and normalized
safe integers; source objects are never modified. Quarter-note beats are the unit.

The schema has stable IDs, one to four treble/bass staves, up to sixteen independent
voices, optional authored hands/stems, per-event staff placement, key/meter changes,
explicit pickup lengths and note/rest events. Values w/h/q/8/16/32 accept up to two
dots, mixed-value tuplets and up to four nested tuplet layers. Every voice fills
each measure with notes or explicit rests; overlaps, gaps, dangling/branching ties and contradictory pitches
are rejected. Ties link particular same-pitch, adjacent segments in one voice and
do not generate a second attack. Identical pitches in different voices retain IDs.
Bounds: 1 MB source, 256 measures, 4,096 events and ten notes per chord. A tuplet
uses actual/normal/group; mixed or nested groups specify their written unit
(w/h/q/8/16/32). tuplets is an outer-to-inner array; legacy tuplet remains valid.
Group duration, ancestry, voice and contiguity are checked exactly. Measures can
change treble/bass clefs by staff and end with single/double/final boundaries.
Pedal events retain exact beats, controllers 64/66/67 and continuous 0–127 values;
unsupported expression remains unscored. Different note lengths at one onset use
independent voices. Per-note cross-staff chords and ornaments remain future
extensions. Staff is not a detected hand.

static/studies/independent-voices.json is an original two-bar regression study under
the project's GPL terms: moving melody and held inner voice in one hand, held bass,
a cross-bar tie, a rest, a dotted eighth/sixteenth pair and triplets. The model is
connected to patient authored practice; current MIDI/generated outline behavior is unchanged.


## Offline engraving evaluation

Passage study in the main navigation renders authored and derived MIDI scores
through ScoreEngraver and the pinned VexFlow 5.0.0 Bravura production bundle.
Pitch practice retains its tested outline renderer; VexFlow loads only on study entry. Code MIT and font
SIL OFL 1.1 notices, upstream source commit, npm archive integrity and per-file
SHA-256 hashes are retained in static/vendor/vexflow-5.0.0. Normal use needs no npm,
CDN, remote fonts, frontend build or additional Python package.

The adapter aligns independent voices by exact musical time, renders simple/dotted
values, voice rests, opposing stems, nearby accidental columns, eighth/sixteenth
beams, simple tuplets and explicit ties. Wrapping a tie splits it into two system
arcs. It accepts two piano staves within the model bounds, splitting into eight-measure
SVG pages with wrapped tie endpoints. Per-event cross-staff placement and beams
preserve voice identity; the adapter overrides VexFlow 5 Voice.draw only for moving
voices, using public tickable draw methods so it does not reset their assigned
staves. Staff/octave accidental state spans voices, with explicit natural
cancellation, double accidentals, conflicting unisons and courtesy marks. Key
changes cancel the previous signature. Clef changes, pickups, phrase boundaries,
mixed/nested tuplets, 3:2 / 4:3 and page-split ties have original regression fixtures
in notation-cases.json. Layout reserves vertical room for ledger overflow and
nested brackets. Cross-staff chords within one event remain unsupported; encode
independent voices rather than inventing a hand assignment.

Notehead SVG elements retain authored IDs. Position highlighting updates only
changed attributes/classes on existing nodes, including the current written segment
of a continuing tie; it does not rerun engraving or infer a performance. Pointer
hit rectangles are disabled inside the preview so actual noteheads can be selected.
Engine hardcoded black fills/strokes are normalized to currentColor once after
layout, so both palettes retain readable stems and barlines. Keyboard activation
and text summaries identify voices and note states independently of colour.

Browser checks cover note/beam/tuplet/tie counts, current tied segment, repeated
attacks, pointer selection, stable SVG identity through 200 position changes,
wrapped ties, theme contrast, narrow-screen overflow and local-only asset requests.
Headless DOM highlight timings are written to ignored test-results only. Those are
not MIDI hardware latency or event-to-paint measurements. This evaluation supports
using VexFlow behind the shared score adapter; pitch exercises retain their outline
renderer independently of duration-aware study matching.

Primary API/source references:
- https://vexflow.github.io/vexflow-docs/api/5.0.0/classes/VexFlow.html
- https://vexflow.github.io/vexflow-examples/demos/interactivity/svg-interaction/
- https://github.com/vexflow/vexflow/tree/0ca6f889545c33cce851b420c24945f6eb685aeb
Full code/font notices and acquisition metadata are beside the bundled engine.


## Authored study playback

score_transport.js converts validated rational beats to seconds only at the audio
boundary, integrating the authored tempo map. It builds scheduler plans from tied
sounding spans (one attack per chain), preserves source segment IDs, supports voice
selection and clipped beat ranges, and caps concurrent playback at 128 voices.
PlaybackCursor handles look-ahead, pause/resume hold chase and overdue-event skips
using the same contract as source MIDI. Binary audio seconds use numerical tolerances;
the underlying score beats/durations remain exact and unchanged.

## Unified pitch and passage workspace

The main app owns one Performance instance, one MIDI lifecycle, one keyboard,
SoundPanel, layout editor and playing-panel DOM. Top navigation switches Pitch
practice / Passage study in place. score_workspace.js adapts the immutable score
model, ScorePractice, ScoreEngraver and PlaybackCursor to these shared surfaces.
The old standalone controllers were removed; /notation-study redirects to
/?view=study, with a template shim for already-running Flask preview processes.
VexFlow loads lazily once when study notation is needed, never on MIDI events.

Switching pauses untimed measurement with a workspace reason and preserves the
outline phrase/index/count, active MIDI source and selected study. Return rebases
physical press credit; the shared MIDI input retains source/channel ownership.
Study backgrounding keeps physical ownership without judging inactive events;
resume requires clear keys/pedal and fresh articulations, including cut ties.
Disconnection pauses and clears ownership through the existing port revisions.
There is no separate study input, audio engine, keyboard range or layout state.
Common Scale, preset/Custom geometry, key size, targets, note names, themes, sound
and MIDI passage preview remain available. Source playback and score preview
mutually cancel, including in-flight sample loading. Live audio remains independent.

Settings are hierarchical. Generated exercise controls belong to Pitch practice;
advanced/cadence/hand-specific controls are hidden when irrelevant. Study controls
follow its selected source. The same key/staff/density/material/range, per-hand
note/leap, span and ledger filter DOM moves between both views for every study
source, preserving values/listeners. passage_filters.js reduces complete sounds
in authored examples while retaining written identities, rhythm and ties. Key
is pitch eligibility for Notes in key, not authored-score transposition. Presentation and physical/audio controls
remain shared. Hidden study settings never start MIDI or audio by themselves.

midi_study.js derives a bounded immutable study from the committed active MIDI
passage and the existing literal eligibility/density filters. It never modifies
raw inspection, bookmarks, source hashes, tick/events/controllers or imported files.
Quantization is explicitly a 1/32 grid (1/8 quarter beat). Every retained source
note-on keeps IDs, original start/end ticks, track/channel and its own attack. A
known note span is split across written values/bars with ties; distinct source
attacks are never inferred as a tie. Source notes with unknown releases fail.
Same-pitch repetitions in different source ticks that round into one grid cell
fail rather than merge. Short known notes occupy a minimum grid cell as a declared
notation approximation, with their original release retained.

The derivation uses source tempo/key/meter markers where present, 4/4 only as an
explicit default when absent, and preserves cut position within source measures.
Spelling follows the selected key/preferences. Coincident, distinct written
pitches sharing a start/end form chords; other durations and unisons retain
independent interval lanes. Reuse favours pitch continuity, with consistent
outer voice stem/tie directions. These are not recovered hands or counterpoint. Independent rests
fill lanes, including omitted material; bar boundaries and source meter changes
split durations. Source-channel damper/panic determines a separate playbackEnd;
physical/notated releases remain independent. compileScore validates that optional
playback release against the score bounds; authoredPlan uses it for sound only.
Continuous controller values remain in source inspection, without half-pedal scoring.
Bounds: 512 selected source attacks, 1,024 retained notes, 16 notation lanes, 256
measures and the model's 4,096-event / 1 MB bounds. Dense/unrepresentable selections
report unavailable and preserve inspection; they do not relax eligibility or invent
source facts. Derivation and engraving happen on explicit source/settings changes.

ScorePractice remains a deterministic patient clock. Starting/continuing/ending
sound IDs have separate expectations. New attacks require physical press serials;
explicit tied chains keep their credit. A single press can represent coincident
unisons but cannot prove fingers; a repeat against a held unison requires a fresh
press, with an ambiguity allowance for the necessary release. Finger-held and
pedal-supported policies remain explicit. Corrections freeze remaining score time
and re-anchor it; rest/hold-only intervals run without fictitious attacks. There
are no early/late onset penalties, accompaniment re-anchoring, velocity/half-pedal
scores or automatic progress-history claims. Loop entry/exit uses inclusive entry,
exclusive exit; reset keys and pedal then re-articulate active notes. Resume
restarts the current boundary duration. Seeking changes inspection/preview only.

Original two-/ten-bar fixtures retain engine checks for unisons, cross-staff
beams, dots, tuplets, signature/clef changes and paginated ties. Pure tests exercise
MIDI source preservation, cuts, rests, ties vs repeats, grid collisions, channel
pedal, filtering and unavailable cases. Browser checks exercise same-page switching,
shared node/MIDI/audio/layout identity, source selection, loaded passage engraving,
independent duration feedback, preserved outline state and responsive controls.
Hardware input-to-paint latency, USB devices and human musical review remain separate.

Random piece samples the intersected local library filters, excluding the current
selection when there is an alternative. A pure helper accepts an injected RNG for
reproducible checks. It loads only a preview through the existing revision guard;
section selection or Start practising this passage activates it. Empty
filters/results and single-piece pools are covered; there is no online request.


## Reviewed repertoire and discovery policy

The offline catalogue now contains eight editions: the original Bach and Chopin,
plus Beethoven, Haydn, Handel, Schumann, Clementi and Rachmaninoff. Seven are explicitly
public-domain-dedicated by Mutopia contributors. Rachmaninoff Op. 3 No. 2 retains
CC BY-SA 4.0 for its MIDI and inspection, full legal text and contributor attribution.
No asset is relicensed by the application GPL. Music notices describe unchanged MIDI
and the technical JSON conversion. Clementi's first movement is an unchanged member
of its source MIDI archive, whose hash and member name are recorded.

Discovery accepts explicitly solo keyboard alternatives, MIDI files or MIDI archives.
Its default policy remains public-domain/CC0; --include-by-sa-4 explicitly broadens
only the shortlist to CC BY-SA 4.0. It does not download assets. Bundle acceptance
remains a separate source/edition/asset review. The offline builder now requires
permission evidence, a reviewed licence label/URL pair, full local share-alike text
when applicable, and the reviewed MIDI hash. Tests rebuild every inspection and
serve each MIDI/JSON locally. Unknown licences require an explicit future review.


Library search is local and bounded to 120 query characters and the existing 500-piece
catalogue. All tokens must match normalised title/composer/source-title/catalogue
metadata; accents, punctuation and opus spacing are ignored, with sharp/flat symbols
expanded. Facets still intersect and Random piece uses the same search result. Input
updates browse controls only, preserving a compatible selection and active practice.
No search work runs on MIDI events. Unit and browser regressions cover accents,
catalogue numbers, empty results, filter intersections and preview isolation.


Recent pieces uses a separate versioned local-storage key with up to 20 ID/checksum
pairs, newest first. Titles come from the current catalogue; missing entries and
changed checksums are omitted. Only successful bundled preview loads update the list.
Local imports never enter it. Reopening a recent preview clears browsing constraints
without activating practice. Clear recent removes just this key. Storage errors fall
back to an in-memory list with a short status; storage events update other open tabs.
The parser bounds payload size, strips unknown fields and rejects unsupported versions.

## Key selection from MIDI

When a selected passage starts, explicit MIDI key-signature metadata determines the
practice key. Repeated matching events across piano tracks are merged; conflicting
markers at the passage start leave the user's key unchanged. A file without an opening
marker gets a whole-file pitch-profile estimate only when it has enough notes and a
clear best-fitting signature. An uncertain estimate leaves the setting alone. All
calculation stays in the browser; a private file is never searched online. Key markers
inside a passage are counted and reported, but the current untimed outline uses one key
for every target. Showing score-accurate modulations remains open work.


## Stage 1 verification — 17 October 2026

80 JavaScript tests, 21 Python tests and the full Edge browser suite passed.
The planner and harmonic recipe modules each have 100% measured unit line coverage
(about 94–95% branch coverage); the stream coordinator has 100% unit line coverage
and 95% branches. These percentages exclude browser-controller and hardware coverage.
Browser regressions cover advanced accidentals, settings persistence, per-hand
attack order, continuous refill and forced worker exhaustion/stale replies while
paused. `test-results/generated-feedback-performance.json` records 20 synthetic
key-event-to-next-animation-frame samples and verifies synchronous key-state marks.
That rendering-opportunity proxy is not measured physical input-to-paint latency.
No real MIDI device or full-size piano was measured during this change.


## Custom playing layout — 17 October 2026

`layout_editor.js` owns pointer-captured and keyboard-accessible move/resize controls
for the staff and keyboard panels. Built-in layouts retain normal document flow;
Custom positions the two panels independently inside a bounded playing workspace.
The workspace reserves both panels' extent so settings stay below. `layout.js`
validates versioned custom storage, clamps controls within the viewport and stacks
saved side-by-side layouts on narrow windows without rewriting desktop geometry.
The existing density preference stores `custom`; the separate
`piano-sight-reader-custom-layout-v1` stores panel boxes, base density and staff
scale (40–160%). Presets reset the visible arrangement and scale but keep the
custom save available. Broken or restricted storage does not prevent practice.
The staff has a flexible viewport inside its custom panel, with SVG geometry scaled
explicitly and look-ahead capacity derived from the available width at that scale.
Keyboard resizing changes key height while its remembered key-width setting remains
independent. Resize/zoom redraw notation and fit existing key nodes; they never
regenerate targets, alter settings identity, evaluate matching or grant attacks.
Pointer updates are coalesced with animation frames and saved on release/cancel;
keyboard edits save immediately and the scale slider saves on change. MIDI processing
performs no custom-layout reads, storage writes or layout work. No runtime dependency
or frontend build was added.


Custom layout verification: 81 JavaScript tests, 21 Python tests and the full Edge
browser suite passed. Browser checks reproduce MIDI-0 ledger overflow, remove its
vertical staff scrolling through resize/zoom, preserve an actual held-key DOM node
and fresh-attack progress, exercise pointer and keyboard edits, verify narrow-panel
controls, reload persistence, viewport recovery, presets and restricted storage.
Physical MIDI hardware and hardware input-to-paint latency were not measured.


## Source, progression and panel-width follow-up

Source and progression precede shared pitch filters. Returning to generated random
practice is explicit in both setup cards; loading a piece no longer overwrites the
selected progression policy. Imported Continuous uses midi_stream.js: one bounded
following source window is prepared asynchronously, with revision cancellation and
yields between empty windows. Matching only adopts prepared targets; parsing and
filtering never run inside a MIDI event. End-of-file and Stop at end finish once,
with a restart action shown only on completion. Fresh-attack and fluid overlap rules
remain unchanged. Generated Continuous retains its module worker.

Custom expands #playing-layout, not main: header/settings/library retain the 1120px
centered shell. Activation still translates panel coordinates to preserve the first
pointer position, and saved geometry fits without being overwritten on narrow screens.

Study Stop rewinds to Entry; Rewind keeps listening if already playing, while Pause
keeps the audio position. Play at end starts over. Playback plans clip to Entry/Exit
and use the remembered Loop setting (default on). PlaybackCursor optionally loops,
schedules across the boundary on audio time with distinct voice IDs per cycle,
skips expired cycles after a stall and bounds loop scheduling work per pump.
