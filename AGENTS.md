# Project guidance

This is a local piano sight-reading practice tool for an experienced pianist
building reading fluency. Keep it easy to run: a small Python server and a
responsive browser interface. Uses Flask, native JavaScript modules, SVG and
Web MIDI without a front-end build step.

## Public repository requirements

- Work in the user's current checkout and branch by default. Do not create or
  use a separate worktree unless the user explicitly requests one. Preserve
  concurrent edits made in external editors such as Visual Studio Code.

- Keep README.md human-facing: setup, run instructions, usage and troubleshooting.
  Keep architecture, tests, to-do lists and plans in development files.
- Keep requirements.txt and setup/run instructions current with every change.
  A visitor should always find a runnable application, even during early work.
- Preserve the existing GPL license and unrelated changes. Use LF source files.

## Core requirements

- **Real-time, low-latency interactive performance is a key project goal.**
  Handle MIDI and visual feedback locally in the browser without network round
  trips. Keep event work small. Measure event-to-paint latency before introducing
  heavier processing. JavaScript is appropriate for this foundation; consider
  WebAssembly for measured bottlenecks or future expensive audio/DSP work.
  Do not claim measured hardware latency without measuring a real device.
  Chord completion settling must never delay visual key feedback.
- Wait on each untimed target until its exact pitches are physically held.
  Allow small finger onset differences. Match pitch sets, not note order.
- Repeat mode loops 1–32 targets after correct playing and physical release;
  preview the opening beyond a double barline. Continuous mode replenishes a
  bounded random stream; phrase length only applies to Repeat. Repeats require
  fresh articulation. Preserve the current scrolling policy pending real scores.
- Repeat/Continuous are the automatic modes; do not restore redundant manual
  Repeat phrase/New phrase buttons. Optional note-by-note versus page-by-page
  scrolling must remain independent of practice progression.
- In note-by-note view keep the active target leftmost beside the clefs; page view
  keeps the displayed group still until its last target is completed.
  Look-ahead is remembered and limited by readable viewport capacity. Changing
  look-ahead/viewport must not regenerate the sequence or reset progress.
- Show a feasible chord name only after correct playing and an exact match to a
  recognised pitch-class template. Do not invent labels for arbitrary pitch sets.
- Track physically held keys separately from sustain. A pedal must not cause
  false completion or stuck keys. Preserve source/channel ownership.
- Give chord directions for mutually unique nearest unmatched pitches within two
  semitones; lock correct notes, leave ties and distant pairs unassigned. Single
  target/single played pitch can give direction at any distance. Never arbitrarily
  pair chord notes or claim to know the player's fingers.
- Respect configurable/learnable keyboard endpoints. Do not assume undocumented
  Yamaha PSS-A50 endpoints or require an 88-key instrument.
- Keep written letter, accidental and octave independent of MIDI pitch.
- The key selector uses all 15 standard signatures, labelled with relative
  major/natural-minor pairs. Notes-in-key mode follows the signature; chromatic
  notes explicitly cancel or alter it. Preserve octave spelling such as B♯3/C♭4.
- Generate chords with distinct written positions: respell black notes
  enharmonically where needed, and skip additions that cannot be spelled without
  collisions. Keep naturals natural; sharp/flat modes are spelling preferences.
  Place accidentals in nearby collision-aware columns, never by note index.
- Local MIDI outlines are derived untimed attack exercises, not original notation.
  Preserve imported tick/event/track/channel/controller data and source hashes. Keep
  passage/filter/reduction results separate; never invent held durations, hands or
  spelling as recovered facts. Files stay local and are not persisted or bundled.
- Audio paths must remain independent of input matching. Sustain follows live sound
  without completing physically held targets. Sound starts through a user gesture;
  panic/backgrounding stops instruments and metronome. Keep scheduling on audio time.
- Keep MIDI permissions explicit; handle missing APIs, denial and unplugging.
- Maintain a remembered dark mode option. Keyboard colour inversion must remain
  an independent remembered choice so dark mode supports a conventional keyboard.
- Put unambiguous pitch-direction hints on the played key and beside the written
  note. Allow generous, growing ledger-line room above, between and below staves.
- Keyboard targets are an independent remembered aid, off by default. Hiding them
  must preserve actual played-note feedback and pitch matching.
- Use a classical score-inspired design with restrained original ornament, serif
  titles, fine rules and considered warm palettes in both themes. Avoid slogans.
- The user is mildly colour-blind. Use strong feedback contrast in both themes
  and conventional/inverted keyboards. Never rely on red/green alone: correct
  notes use ticks, extras crosses, sustain a distinct patterned/marked state.
- Target diamonds use dark orange on light keys and bright amber on dark keys,
  following actual key backgrounds including keyboard inversion.
- Keep routine explanations in README, not repeated around the playing surface.
  Prefer concise labels and changing feedback; omit obvious instructions and
  defensive phrases such as "defaults are not a hardware specification" in UI.
- Preserve the simple single-page layout: settings remain on the page and can
  extend below the playing area. Prioritise simultaneous staff/keyboard visibility
  on typical 1080p browser viewports, allowing space for browser chrome. Future
  compact/collapsible header options must preserve readable notation, ledger-line
  room, feedback contrast and usable controls. Automatic density should fit the
  staff and keyboard on common desktop viewports with browser chrome.

See DEVELOPMENT.md for architecture, checks, limitations and future direction.
See ROADMAP.md for staged long-term work; do not implement backlog entries merely
because they are recorded there.

## Regression testing and budget

- Maintain a full regression suite and high coverage of critical behaviour.
  New features and bug fixes need meaningful regression checks, including the
  reported reproduction. Preserve existing behaviour unless intentionally changed;
  update affected tests to the new contract and keep unrelated checks passing.
- Test the pure musical model, native-like MIDI lifecycle, phrase state/progression,
  timing/release/pedal interactions, settings persistence and browser rendering.
  For future transport/audio/scoring, add deterministic clock and performance tests.
- Run relevant checks during work, then the full automated suite for behavioural
  changes. State any skipped checks, unmeasured coverage or hardware limitations.
  Do not equate passing tests with verified hardware or 100 percent coverage.
- Minimise token use: run scripts on the local machine and prefer the short report
  from `tests/run_checks.py --browser` over verbose tool output. Keep full logs in
  ignored test-results/ and inspect only failing logs or specific coverage gaps.
  Use `--coverage` for unit coverage; browser and hardware coverage are separate.
