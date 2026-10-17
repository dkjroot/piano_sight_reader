# Development guide

Fresh-session entry point, updated 17 October 2026. Read `AGENTS.md`, then this
file; inspect only the source and roadmap section relevant to the task. Use
`DEVELOPMENT.md` for detailed contracts and investigation notes, `ROADMAP.md` for
checked delivery status and remaining work, and `README.md` / `/help` for user workflows.
Do not load the whole conversation or development history to begin routine work.
Update this guide when architecture, workflow or important implementation limits change.

## Checkout and workflow

- On Dave's machine the working repository is `C:\Users\dave\piano_sight_reader`,
  branch `main`. This chat's old detached checkout under
  `C:\Users\dave\.codex\worktrees\6b85\piano_sight_reader` is obsolete.
  Verify the actual checkout, branch and dirty files before editing; use explicit
  command working directories. Sandbox access to main may require escalation.
- Work in the user's current branch; no new worktrees unless requested. Preserve
  external editor changes. Commit coherent, tested features; pushing needs instruction.
- Keep LF source, GPL code licence, current requirements and human-facing run/help
  instructions. Development plans belong here or in ROADMAP, not the README.
- Roadmap entries alone do not authorise implementation. The latest user request
  controls scope; earlier unattended-work permission ended with the end-of-day stop.

## Runtime and source map

Python 3.10+, Flask and mido; native browser ES modules, SVG, Web MIDI and Web Audio.
No frontend build or Node requirement for users. Assets, fonts and audio are local.

| Responsibility | Main files |
| --- | --- |
| Loopback server, pages, bounded local MIDI inspection API | `app.py`, `score_import.py`, `musicxml_import.py` |
| Practice controller, MIDI port lifecycle, persistence and progression | `static/app.js` |
| Pitch spelling/generation/matching; source/channel ownership and sustain | `static/core.js` |
| Fresh physical press credit and previous-chord overlap | `static/flow.js` |
| Authored harmonic recipes and exercise heading | `static/harmony.js`, `static/exercise.js` |
| Per-hand generator, constraints, textures and attack groups | `static/generation.js` |
| Bounded continuous refills off the input thread | `static/generated_stream.js`, `static/generation_worker.js` |
| Remembered panel positions, resizing and staff scale | `static/layout_editor.js`, `layout.js` |
| Main SVG staff, keyboard, viewport and reading windows | `static/notation.js`, `keyboard.js`, `layout.js` |
| Library/preview UI; filtering/search/recent pieces | `static/score.js`, `library.js` |
| Shared authored/MIDI passage reduction | `static/passage_filters.js` |
| Derived MIDI targets, section suggestions, bookmarks, key detection | `static/outline.js`, `sections.js`, `passages.js`, `score_key.js` |
| Synth/samples, independent live/Target controls, metronome | `static/audio.js`, `samples.js`, `sound.js` |
| Source MIDI playback, scheduling, beat/count-in map | `static/playback.js`, `transport.js`, `beats.js` |
| Attempt measurements, opt-in history and graphs | `static/metrics.js`, `progress.js` |
| Exact authored meter groups, pickup/fragment phase and beam grouping | `static/meter.js`, `score_model.js`, `engraving.js` |
| Authored rational-beat model, tied/pedal playback and patient matching | `static/score_model.js`, `score_transport.js`, `score_practice.js` |
| Shared passage-study controller and MIDI notation derivation | `static/score_workspace.js`, `midi_study.js`, `engraving.js` |
| UI, help and shared support panel | `templates/`, `static/style.css`, `static/help.js` |
| Reviewed catalogue, provenance, source files and inspections | `static/library/`, `tools/build_library.py`, `tools/discover_scores.py` |

## Contracts that must survive changes

- Low-latency MIDI feedback stays local in the browser. No network, heavy parsing,
  engraving or storage work on key events. Never claim hardware latency from headless tests.
- Fluid mode matches exact physical pitch sets immediately; no settling delay.
  Every target pitch needs a fresh release/press, even shared or repeated notes.
  Duplicate note-ons and overlapping device ownership cannot earn new credit.
  `FlowGate.accepted` controls written ticks; actual held keys remain separately visible.
  Only retiring non-target notes from the immediately previous chord may overlap.
  Optional release-between-targets mode retains its 120 ms stable-match/release gate.
- Sustain affects sound, never physical matching. Keep input source/channel ownership;
  guard asynchronous port opening, input replacement and stale callbacks by revision.
- Repeat loops a fixed phrase/passage; Stop at end finishes it once. Generated
  Continuous replenishes a bounded stream; MIDI Continue traverses following
  bounded source windows asynchronously through `static/midi_stream.js`.
  Wrapped previews follow a double barline. Note/page scrolling and look-ahead changes
  preserve the sequence and progress. No redundant manual repeat/new-phrase buttons.
- Written spelling is independent of MIDI pitch. Preserve 15 signatures, B-sharp/C-flat
  octave boundaries, collision-free generated positions and nearby accidental columns.
  Chord hints pair only unique nearest unmatched pitches; chord names require exact templates.
- Loading a file/library preview leaves active practice intact. Selecting a suggested
  section or bookmark, editing endpoints or changing tracks activates the selected
  passage automatically; **Start practising this passage** also activates it. Derived
  outlines preserve source IDs/ticks
  and filtering/reduction provenance; they are untimed attacks, not recovered notation.
- Light/dark, keyboard inversion and target visibility are independent settings.
  Targets default off. Preserve strong contrast and ticks/crosses as well as colour.
  Keep the classical style, reserved feedback rows and simultaneous staff/keyboard
  visibility in presets; settings stay below the playing workspace. Presets budget
  180 px for chrome. Custom layout independently positions/resizes both panels and
  scales notation, preserving exercise state and the last saved desktop geometry
  when fitting a smaller viewport. Layout edits never regenerate or advance targets.
- Live and Target sounds are independent. Both Hear buttons audition a chord; only
  Sound my playing toggles live audio. Internal `reference-*` names remain for saved
  compatibility. Audio uses its own clock; panic/backgrounding stops it. Async loads
  must never restart cancelled playback. Help opens separately and closes with an X.

## Delivered and boundaries

- Stage 1 untimed generation: random/diatonic/advanced harmonic recipes, block,
  melody/bass/chord and broken/Alberti textures; independent hand density/leaps,
  span/ledger limits and untimed together/alternating/2:1/3:2 attack groups.
  Authored advanced spelling preserves double accidentals; no inferred ties or rhythm.
  Continuous generation prefetches a bounded 17-target worker buffer outside MIDI
  processing, preserving per-hand state and harmonic/arpeggio phase across refills.
- Configurable reading range/chord sizes, themes, layout/key sizes and both scrolling modes.
- Local MIDI import, filtered pitch outlines, passage loops/bookmarks and source playback
  with tempo/speed, pedal, metronome and count-in. Independent piano/organ synthesis
  and acoustic samples. Progress times/accuracy/bests, selective history clearing,
  graphs and reading-pattern breakdowns; saved history is opt-in and bounded.
- Twelve offline editions (including Burgmüller, Satie and Joplin): Bach, Chopin, Beethoven, Haydn, Handel, Schumann, Clementi,
  Rachmaninoff. Local search, composer/era/style/difficulty filters, random choice and
  recent pieces. Difficulty remains Unrated; do not invent pedagogical ratings.
- Starting a passage selects its opening MIDI signature; strong pitch-profile evidence
  can estimate a missing one. Conflicting/uncertain evidence keeps the chosen key.
  Preview loading leaves it alone. Later MIDI key changes are reported, but the entire
  outline still uses one signature. Private files are not identified online.
- The immutable score model supports exact beats, voices, rests,
  meter/tempo/key maps and explicit ties. The original two-bar study engraves and
  plays through bundled VexFlow 5.0.0. Patient study practice now matches attacks,
  continuing ties and releases, timing independent holds/rests with correction waits.
  A ten-bar original fixture covers cross-staff beams/unisons, mixed/nested tuplets,
  changing signatures/clefs, pickups and paginated ties. Finger/pedal continuity and
  explicit loop cuts are separate policies. The MusicXML subset and verified La Candeur excerpt are delivered; broader
  notation-preserving import, ornaments, traversal and scored timed modes remain.
  Passage study now lives in the main workspace beside Pitch practice, sharing
  MIDI, keyboard, layout/Scale, sound and applicable source filters. Loaded MIDI
  passages can derive 1/32-grid notation with source IDs/ticks and independent
  durations/rests/ties; this is distinct from notation-preserving edition import.
  Old study links redirect to the main page. No second input/audio/layout app remains.
- Music redistribution needs explicit edition/MIDI permission, source links, hashes,
  notices and licence text. Eleven editions carry public-domain dedications; Rachmaninoff
  retains CC BY-SA 4.0. Samples and VexFlow retain their own notices. Discovery only
  writes a shortlist; downloads, ingestion and publication are separate reviewed actions.

## Run and verify economically

For normal Windows use, double-click start.cmd; launch.py prepares/checks the
private environment and serves on 8767. Manual checks from the checkout in PowerShell:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py --port 8767
# In another terminal:
.\.venv\Scripts\python.exe tests/run_checks.py --browser --coverage --channel msedge
```

The default server port is 8766; Dave's preview uses 8767. The runner starts its own
isolated loopback server. Node 18+ runs unit tests; browser checks need Node 20+,
`npm ci` and Playwright Chromium or installed Edge. No test dependency is needed at runtime.
If PATH Node is unsuitable, pass `--node PATH --browser-node PATH`; this machine's
cached executable is `%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`.
If temp-directory permissions fail, create local `.tmp` and set TEMP/TMP to its absolute path.

Add meaningful regression coverage for changed behaviour. Run relevant checks while
editing, then the full suite for behavioural changes. Read the short runner summary;
inspect only failed logs or coverage gaps in ignored `test-results/`. Never dump passing
logs. Stage 1 verification on 17 October 2026: 80 JavaScript + 21 Python tests and the
full Edge browser suite passed, including delayed/stale worker responses, pause/resume,
advanced spelling and layout. Verify current results rather than treating this
snapshot as a fresh run.
Custom layout verification on 17 October 2026: 81 JavaScript + 21 Python tests
and the full Edge browser suite passed, including extreme-ledger fit, first-drag
position, compact keyboard height, held-key preservation, narrow controls and
restored desktop geometry after responsive fitting.
Unit coverage is not browser/controller or hardware coverage. USB device behaviour,
perceived sound quality and physical input-to-paint latency need separate validation.

Stage 2 verification on 17 October 2026: 97 JavaScript + 21 Python tests and the
full Edge browser suite passed, including authored duration/continuity practice,
loop cuts, MIDI lifecycle/focus isolation and the ten-bar engraving fixture.
The pure authored matcher has measured 100% unit line/branch coverage; this does
not measure browser-controller coverage, device latency or human playability.
Runtime dependencies and setup commands are unchanged.

Unified-workspace follow-up, 17 October 2026: 105 JavaScript tests pass, including
the final source-panic/tie regression; 21 Python tests and the full Edge browser
suite pass. Mode switching, hierarchical/shared filters, imported MIDI notation,
layout/Scale, playback cancellation and both palettes have browser checks. Unit
coverage is separate from browser/controller and physical-device coverage.

Study layout: remembered Automatic/1–4 bars per line sits beside Scale. Reflow
preserves the study gate/cursor; study transport is beneath the staff. Engraving
uses the pane width after a stable vertical scrollbar gutter, including Custom scaling.

Shared passage filters now include per-hand density/leaps, hand span and ledger
limits in both views and all study sources. Authored reductions retain complete
sounds/ties and written identities; Key controls pitch eligibility, not transposition.
MIDI derivation groups coincident equal-duration tones into chords before assigning
independent duration lanes. Dotted values and voice-directed ties reduce clutter.

Passage-control/readability verification, 17 October 2026: 112 JavaScript and
21 Python checks pass, including complete-tie reduction, held-note limits,
authored hand/clef changes and the Rachmaninoff Section 2 reproduction.

Source/progression controls lead setup in both views. Custom expands only the
playing canvas; the page shell stays centered at 1120px. Study Stop rewinds to
Entry, Pause preserves position, and Rewind keeps listening when already playing.
Playback follows Entry/Exit and remembered Loop (default on), including audio-clock
look-ahead across cycle boundaries. Tests include Chrome at 3840px width.

Source/layout/transport verification, 17 October 2026: 116 JavaScript tests,
21 Python tests and full Chrome/Edge browser suites pass. Focused Chrome checks
also cover 3840px resizing, MIDI continuation/end/repeat, source escape preserving
the random phrase, and study loop/cut/pause/rewind/replay. Preview on 8767 is
independent of the isolated test servers and is left running.

Stage 2 meter extension: measure.beatGroups is an optional list of positive
counts in denominator units, inherited until the meter changes. Default compound
groups are threes; irregular grouping remains explicit. Compiled measures expose
meterKind, beatGroups, pickup and exact beatOffset. First short authored bars infer
a pickup unless disabled; explicit offsets describe fragments without inventing
pickups. MIDI derivation supplies its known source phase. Normal beams use exact
group membership; authored tuplets keep their own grouping. Source clicks/count-in
follow compound groups, retaining denominator pulses for ambiguous irregular MIDI.
The original meter-groups.json study is selectable beside the earlier examples.
Source dropdowns remain prominent; the redundant random shortcut buttons are gone.

Stage 2 meter/header verification, 17 October 2026: 121 JavaScript tests,
21 Python tests and the full Chrome browser suite pass, with unit coverage
collected separately from browser/hardware coverage. Focused Edge checks cover
the meter study, rhythmic alignment and the Rachmaninoff header reproduction.
Preview server health on 8767 is confirmed; it remains running.

Authored tempo curves: tempo.curve="linear" ramps BPM linearly in score beats
to the next tempo point (the last point cannot ramp). Missing/step curves keep
the existing discrete map. score_transport.js integrates 60/BPM analytically,
shared by audio and patient practice, including cuts/seeks/loops. Remembered
study-tempo selects score or steady (opening BPM); Speed scales either policy.
Engraving preserves written quarter-note tempo/accel./rit. marks. The original
tempo-curves study exposes acceleration, slowing and discrete changes. Rubato,
fermatas and expressive scoring remain separate roadmap work.

Gradual-tempo verification, 17 October 2026: 125 JavaScript tests, 21 Python
tests and the full Chrome browser suite pass with unit coverage collected.
Focused Edge checks cover engraved ramps and persisted teaching tempo. Physical
MIDI/audio latency and subjective tempo feel remain unmeasured. Preview 8767
remains running. Runtime dependencies and setup commands are unchanged.

Stage 3 MusicXML: POST /api/import-musicxml converts a bounded UTF-8, uncompressed
score-partwise subset using Python stdlib XML/Fraction; no runtime dependencies
added. DTD/entities, multiple parts, tuplets, grace and traversal are rejected.
Written pitches/voices/staves/chords/dots/rests/ties and bar-boundary key/clef/meter
changes survive. Original XML/hash and unrendered-annotation warnings stay in the
in-memory source provenance. Gaps become explicitly labelled derived rests.
Client compilation/filter validation precedes applying an import; stale replies
cannot override a newer Source choice. Imported MusicXML is an always-available
Source after loading, sharing all existing study controls. No file persistence.

La Candeur verified bars 1–4 is a pitch/rhythm excerpt manually transcribed from
Bas Wassink's public-domain-dedicated Litolff edition (Mutopia 202). LilyPond source,
MusicXML and generated score are hash-pinned in catalogue metadata; rebuild with
python tools/build_library.py, fully offline. Source lines vOne/vThree establish
pitches and the three bass ties between bars 3–4. Tests independently compare
all 41 sounding attacks/releases with the unchanged edition MIDI. Expression,
fingering and repeat traversal are deliberately excluded from this excerpt.
Twelve offline MIDI editions now include La Candeur, Arabesque, Gymnopédie No. 1
and The Entertainer. Difficulty remains Unrated; reading-demand descriptions
avoid invented exam grades. See static/library/NOTICES.md for each edition.

Satie MIDI has two reviewed redundant F-sharp releases at tick 13824, retained
with their warnings. Builder acceptance pins exact reviewed_warnings per edition
(default empty); any unexpected diagnostic blocks the offline rebuild.

Stage 3 verification, 17 October 2026: 127 JavaScript and 29 Python tests pass.
Full Chrome and Edge browser suites pass; focused Edge checks also cover the
final narrow MusicXML file-control layout. Importer Python line coverage is
98 percent, separately from browser/hardware coverage. Offline rebuild verifies
all twelve MIDI editions and the written excerpt. No USB/audio-latency claims.
Preview server on 8767 was restarted for the new endpoint and left running;
health and a real MusicXML POST (44 written notes) both succeed.

MVP completion pass: VexFlow's stave ledger default is fixed #444. Set
setDefaultLedgerLineStyle({strokeStyle:'currentColor',lineWidth:2}) on every stave;
ledger strokes must remain theme ink for dark/light and every note state. Tests
include treble C4 contrast and actual MIDI-60 matching, plus native SVG C4.

launch.py (stdlib bootstrap) checks exact requirements against .venv metadata,
creates/installs only when needed, then spawns the local app and opens a browser
after readiness. start.cmd discovers existing venv Python, py or python on Windows.
Default launcher port is 8767; manual app.py default remains 8766. /health keeps
its JSON contract and adds X-Piano-Sight-Reader: 1 for local app identification.
Repeated starts reuse a ready app; foreign occupied ports are reported without
termination. Ctrl+C/timeout cleans up only the owned subprocess. No global install,
file persistence, music download or frontend build is added. Restart after code
updates; existing running processes are deliberately not replaced by the launcher.

MVP audit fixtures live in tests/mvp.browser.cjs: both-theme middle C, all original
study sources, empty-filter recovery, representative short Chopin/Bach/Rachmaninoff
passages, source options and refresh. Existing suites cover imported MusicXML,
stale replies, transport, preview isolation and custom layouts. Real hardware
latency/full-size-piano validation is deferred by user request, not an MVP gate.

MVP finishing verification, 17 October 2026: 127 JavaScript tests, 38 Python
tests, full Chrome/Edge browser suites and diff checks pass. Launcher Python line
coverage is 91 percent, independent of browser/device coverage. Real Windows
smoke checks cover isolated startup on 8779, start.cmd duplicate reuse, Ctrl+C
cleanup and reuse of the refreshed preview server on 8767. Both-theme middle-C
and representative passage screenshots are saved in ignored test-results/.
Preview 8767 is left running. Hardware latency remains deferred as agreed.
