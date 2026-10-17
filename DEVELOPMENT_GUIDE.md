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
| Loopback server, pages, bounded local MIDI inspection API | `app.py`, `score_import.py` |
| Practice controller, MIDI port lifecycle, persistence and progression | `static/app.js` |
| Pitch spelling/generation/matching; source/channel ownership and sustain | `static/core.js` |
| Fresh physical press credit and previous-chord overlap | `static/flow.js` |
| Authored harmonic recipes and exercise heading | `static/harmony.js`, `static/exercise.js` |
| Per-hand generator, constraints, textures and attack groups | `static/generation.js` |
| Bounded continuous refills off the input thread | `static/generated_stream.js`, `static/generation_worker.js` |
| Main SVG staff, keyboard, viewport and reading windows | `static/notation.js`, `keyboard.js`, `layout.js` |
| Library/preview UI; filtering/search/recent pieces | `static/score.js`, `library.js` |
| Derived MIDI targets, section suggestions, bookmarks, key detection | `static/outline.js`, `sections.js`, `passages.js`, `score_key.js` |
| Synth/samples, independent live/Target controls, metronome | `static/audio.js`, `samples.js`, `sound.js` |
| Source MIDI playback, scheduling, beat/count-in map | `static/playback.js`, `transport.js`, `beats.js` |
| Attempt measurements, opt-in history and graphs | `static/metrics.js`, `progress.js` |
| Authored rational-beat score model and tied playback | `static/score_model.js`, `score_transport.js` |
| Separate engraving/playback evaluation at `/notation-study` | `static/engraving.js`, `notation_study.js`, `study_player.js` |
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
- Repeat loops a fixed 1–32-target phrase; Continuous replenishes a bounded stream.
  Wrapped previews follow a double barline. Note/page scrolling and look-ahead changes
  preserve the sequence and progress. No redundant manual repeat/new-phrase buttons.
- Written spelling is independent of MIDI pitch. Preserve 15 signatures, B-sharp/C-flat
  octave boundaries, collision-free generated positions and nearby accidental columns.
  Chord hints pair only unique nearest unmatched pitches; chord names require exact templates.
- Loading/changing a score preview never changes active practice. Only **Start
  practising this passage** commits it. Derived outlines preserve source IDs/ticks
  and filtering/reduction provenance; they are untimed attacks, not recovered notation.
- Light/dark, keyboard inversion and target visibility are independent settings.
  Targets default off. Preserve strong contrast and ticks/crosses as well as colour.
  Keep the classical style, reserved feedback rows and simultaneous staff/keyboard
  visibility; settings stay on the page below. Layout presets budget 180 px for chrome.
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
- Eight offline editions: Bach, Chopin, Beethoven, Haydn, Handel, Schumann, Clementi,
  Rachmaninoff. Local search, composer/era/style/difficulty filters, random choice and
  recent pieces. Difficulty remains Unrated; do not invent pedagogical ratings.
- Starting a passage selects its opening MIDI signature; strong pitch-profile evidence
  can estimate a missing one. Conflicting/uncertain evidence keeps the chosen key.
  Preview loading leaves it alone. Later MIDI key changes are reported, but the entire
  outline still uses one signature. Private files are not identified online.
- A separate immutable authored score model supports exact beats, voices, rests,
  meter/tempo/key maps and explicit ties. The original two-bar study engraves and
  plays through bundled VexFlow 5.0.0. It is **not connected to live practice**.
  Full-score engraving, changing signatures, duration/rhythm judgement, tied input,
  notation-preserving import and scored timed modes remain roadmap work.
- Music redistribution needs explicit edition/MIDI permission, source links, hashes,
  notices and licence text. Seven editions carry public-domain dedications; Rachmaninoff
  retains CC BY-SA 4.0. Samples and VexFlow retain their own notices. Discovery only
  writes a shortlist; downloads, ingestion and publication are separate reviewed actions.

## Run and verify economically

From the actual checkout in PowerShell:

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
Unit coverage is not browser/controller or hardware coverage. USB device behaviour,
perceived sound quality and physical input-to-paint latency need separate validation.
