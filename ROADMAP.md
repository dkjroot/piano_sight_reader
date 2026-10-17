# Roadmap

The destination is a piano practice workspace where a learner can start with a
small, playable outline of a real piece and gradually restore its notes, voices,
range and rhythm until they can perform the full score. Support patient correction,
timed practice with recovery, and continuous performance with scoring. Keep random
exercises independently useful throughout. Unchecked items are plans, not implemented claims.

## Current status — 17 October 2026

Checked items are implemented and covered by local automated checks; they do not
claim measured MIDI hardware latency or verified hosted CI. Mixed tasks are split
below so that completed foundations and remaining work are visible separately.

| Area | Delivered | Still ahead |
| --- | --- | --- |
| Generated practice | Random/diatonic/advanced harmony, five textures, per-hand constraints and attack patterns | Timed rhythm, sustained independent voices and hand crossing |
| Real music | Local MIDI import, eight offline editions, filtering, passages and bounded derived notation/duration study | Notation-preserving import, richer transcription and expressive score support |
| Finding pieces | Composer/era/style/difficulty filters; reviewed source credits | More repertoire and reviewed difficulty levels |
| Progress | Response times, accuracy, bests, optional history, graphs and reading patterns | Session runs, rhythm scores, targeted drills and profiles |
| Sound | Independent synth/sample paths, MIDI/authored playback, metronome and count-in | Accompaniment during practice, latency calibration and scored modes |
| Interface | Themes, contrast, layout, page scrolling, paginated authored engraving, Help | Further usability/hardware validation and imported-score integration |

## Working foundation

- [x] Local Flask server, browser MIDI, grand staff and on-screen keyboard.
- [x] Learnable physical range; independent key spelling and MIDI pitch.
- [x] Standard key signatures, chromatic practice and basic chord names.
- [x] Configurable chord sizes, phrases, look-ahead and exact pitch matching.
- [x] Repeat loops and continuous random practice, gated by correct pitches and fresh
  attacks, with optional release-between-targets progression.
- [x] Strong contrast, redundant feedback symbols, dark/light themes and optional targets.
- [ ] Measure physical keyboard-to-display latency on the Yamaha and a full-size piano.
- [ ] Preserve the current scrolling policy for now. Revisit with real musical phrases;
  do not decide on end-clamping, centring or animation until those examples exist.

## Stage 1 — More musical generated practice

- [x] Offer random pitches and diatonic chords/cadences as choices; random remains unrestricted.
- [x] Add explicitly authored dissonant/advanced harmonic vocabularies.
- [x] Generate diatonic triads, inversions/doublings and major/natural-minor cadences.
- [x] Add diatonic sevenths and ii–V–I / I–vi–ii–V progressions alongside I–IV–V–I.
- [x] Bound harmonic hand spans and prefer nearby voicings.
- [x] Extend explicit per-hand planning and leap limits to every generated exercise source.
  Imported MIDI remains source material with its own reduction controls, not recomposed practice.
- [x] Add melody, bass, chordal and broken-chord textures, with separate hand difficulty.
- [x] Separate difficulty dimensions: range, accidentals, ledger lines, density, leaps,
  independence of hands and rhythm. Separate controls constrain generation; attack groups
  offer untimed independence only. Notated rhythm, duration judgement and continuing
  voices are explicitly deferred to Stage 2, rather than inferred from pitch targets.
- [x] Keep chromatic material, unusual keys and advanced accidentals available as goals.

Exit: useful musical miniatures that respect the selected instrument and reading level,
without requiring imported music. Random pitch practice remains available.

Stage 1 is delivered for untimed pitch reading. Advanced here describes harmonic,
spelling, density, register and attack-pattern demands; it does not claim full
advanced piano performance, rhythmic scoring, fingering or independent held voices.
Generation uses each difficulty dimension as a ceiling (with note-density bounds),
whereas future real-score reduction preserves and narrows authored source material.
Infeasible settings report an unavailable target rather than relaxing hard limits.

## Stage 2 — A real score and performance model

- [x] Introduce an immutable authored score model with stable event IDs, exact rational
  beats, durations, independent voices/staves, measures/rests, pickups, key/meter and tempo maps.
- [x] Validate explicit note-to-note ties, separate repeated attacks from continuing
  tied spans, and build an event timeline. Preserve MIDI inspections separately.
- [x] Play the authored study from its tempo map, durations and tie chains, with audio-
  clock scheduling, visual following, pause/resume, seeking and independent preview sound.
- [x] Connect authored expectations to live practice and duration/release judgement.
- [x] Represent attacks, releases and continuing held notes separately. Support ties,
  repeated notes, overlaps between hands, sustain pedal and notes crossing barlines.
- [x] Extend the delivered fluid attack gate to authored voice/duration expectations:
  ties do not demand a new attack, while explicit repeated source note-ons do.
- [x] Engrave multiple attacks per bar, note values, beams, rests, dots, tuplets, ties,
  changing signatures, courtesy/cancellation accidentals, cross-staff/voice collisions,
  pickups and phrase boundaries. Preserve authored enharmonic spelling.
- [x] Evaluate an offline engraving engine against the original two-bar polyphonic
  study: VexFlow renders voices, rests, dots, beams, triplets and cross-bar/system ties.
  Highlight existing SVG nodes without rerunning layout; keep it off the live MIDI path.
- [x] Extend engraving fixtures to cross-staff/unison collisions, complex accidentals,
  nested/mixed tuplets, changing clefs and full-score pagination before broad adoption.
- [x] Define loop entry/exit: tied notes at a cut, pedal state, pickups and re-articulation.

Exit: a small authored two-hand passage renders and plays correctly with ties, rests,
different durations and more than one event per measure. No rhythm game is needed yet.

Stage 2's core passage milestone is complete; the extension checklist below is
not an indication that this core milestone is half-finished. The passage milestone is delivered through **Passage study** in the main
workspace navigation. Patient practice has independent attacks/holds/releases, explicit
finger/pedal continuity, correction waits and re-articulated loop cuts. A second
original ten-bar fixture exercises changing clefs/signatures, cross-staff beams,
unisons, mixed/nested tuplets, 3:2 / 4:3, pickups and paginated ties. This milestone
covers the explicit Stage 2 checklist and exit above. The cross-stage full-music
requirements below remain individually tracked; ornaments, expressive traversal,
notation-preserving import/reduction and scored timing are later integrations.

### Full-music requirements for the score model and matcher

These are cross-stage requirements extending the Stage 2 passage milestone into
import, simplification, transport and scoring. Their unchecked items remain work
for those stages; completing Stage 2 does not claim all full-music integrations.
An ordered list of simultaneous pitch sets is not enough for real piano music.

#### Independent musical events and voices

- [x] Give each note its own onset, notated duration, release expectation, voice and
  optional hand assignment. A chord can contain notes of different lengths, and its
  notes need not all stop when the next attack arrives.
- [x] Separate voice identity, staff placement and physical hand. Support multiple voices
  in either hand, cross-staff notes, voice exchange, hand crossing and changing clefs.
  Staff alone must not be treated as proof of which hand actually played a note.
- [x] Support simultaneous but independent rhythms between hands and within one hand:
  a held inner voice under a moving melody, a fugue subject against countersubjects,
  or a repeated bass pattern while upper parts move independently.
- [x] Represent explicit partial-bar/full-duration rests independently per voice;
  consecutive silent bars retain their exact event timing. Other voices keep playing.
- [ ] Add dedicated whole-bar rest glyphs for non-4/4 meters and consolidated
  multi-measure rest notation, retaining independent voice expectations.
- [x] Use exact score-time arithmetic for dotted/double-dotted values, syncopation,
  tuplets and nested tuplets. Support polyrhythms such as 3:2 and 4:3 without cumulative
  floating-point drift or forcing both hands onto an inadequate rhythmic grid.
- [x] Distinguish simple/compound/irregular meter, beat grouping, pickups, incomplete
  measures and meter changes. Align voices vertically by musical time, not by note index.

#### Ties, articulation and physical versus sounding duration

- [x] Store ties as explicit links between particular note events in a voice, including
  across barlines/systems. Match the initial attack and continuation correctly; a tied
  continuation must not ask for another attack. Preserve distinct same-pitch repetitions.
- [ ] Treat slurs as phrasing/articulation, not as ties. Add legato, staccato, tenuto,
  accents and phrase marks with documented, adjustable release/onset expectations.
- [x] Maintain independent expected notes that are starting, continuing and ending at
  each score position. Retire the foundation's blanket release-between-targets rule
  for real-score practice: release only the notes whose musical duration has ended.
- [x] Distinguish physical key duration, pedal-sustained sound and notated duration.
  Allow a practice policy to require finger-held continuity where appropriate or to
  accept pedal-supported continuity, without silently treating the two as identical.
- [x] Add sustain/damper markings and pedal changes, including overlapping/changed pedal.
  Preserve continuous pedal values when supplied; half-pedal scoring needs compatible
  hardware and an explicit policy. Do not infer capabilities from a device name.
- [x] Plan optional sostenuto (selectively retained notes) and soft pedal support. Keep
  unsupported controller/dynamic requirements optional and clearly unscored.
- [x] Handle shared MIDI pitches across voices/hands without inventing extra physical
  attacks or assigning the same event twice. Document ambiguous unisons, repeated notes
  against an already sustained voice, and the limits of MIDI evidence about fingering.

#### Expressive timing, ornaments and playback order

- [x] Use discrete tempo maps, speed scaling, pause/resume, seeking, entry/exit cuts
  and audio-clock loops for authored playback. Source count-in retains meter phase.
- [ ] Add gradual tempo changes, rubato practice, fermatas and expressive
  pause/count-in policies. Keep a steady-tempo teaching option alongside score-faithful
  playback; define when expressive timing is accepted, measured or deliberately ignored.
- [ ] Represent grace notes, acciaccaturas/appoggiaturas, rolled chords, trills, mordents
  and turns as authored symbols with a separate performance expansion/policy. Permit
  staged simplification rather than pretending every ornament is a simultaneous chord.
- [ ] Preserve dynamics, hairpins, articulation and optional fingering annotations.
  Velocity/expression assessment should be calibrated and optional; note velocity is
  not a device-independent measurement of loudness, and MIDI does not reveal fingers.
- [ ] Model printed score order separately from traversal: repeats, first/second endings,
  da capo/dal segno, coda/fine and selected practice loops. Give repeated occurrences
  separate performance identities while retaining their link to the same source event.

#### Real-time judgement and recovery

- [ ] Judge onset, continuation and release separately, with early/late tolerances in
  musical time. Detect cut-short holds, unwanted overholds, missing attacks and extras
  without counting legitimate continuing voices or pedal resonance as wrong notes.
- [ ] Match notes to explicit expected event windows. Allow normal finger spread in
  chords, intentional arpeggiation and overlapping voices without consuming the next
  repeated note early or satisfying several future attacks with one held key.
- [ ] Define rests and hold-only passages in each mode: untimed learning, scored wait
  and continuous playback. They need meaningful duration/advance behaviour even when
  no new key is pressed. Optional rhythm-free reading can relax duration deliberately.
- [x] Freeze/re-anchor the patient-practice clock and remaining durations during
  corrections, pauses and fresh-articulation resume.
- [ ] Synchronise those correction waits with accompaniment and metronome. A late
  correction must not make a held voice indefinitely long or mark later attacks late.
- [ ] On a miss, distinguish correcting the current event, continuing after an expired
  event and explicit seeking. Recover at clear score/beat anchors; do not silently
  jump between similar passages or repeated occurrences on ambiguous pitch evidence.
- [x] Re-articulate continuing notes on patient-practice entry, loop cuts,
  pause/resume and disconnection; filtered studies restart with fresh credit.
- [ ] Preserve traversal/scoring identity through future live voice muting and
  seeking. Reset playback/pedal state safely without stuck audio or retroactive credit.

#### Engraving and acceptance examples

- [x] Render independent stems, beams, rests and ties per voice, including opposing
  stems, shared/unison heads, close seconds, different note values at the same onset,
  cross-staff beams and accidentals scoped correctly within measures and voices.
- [x] Link visual notes, playback and patient-matcher expectations by stable IDs,
  while keeping preview audio independent of live performance input.
- [ ] Extend those links to performance-expanded ornaments and repeated traversal
  occurrences without conflating their identities.
- [x] Build deterministic authored model/engraving/patient-matcher fixtures for
  held bass, independent inner voices, ties versus repetitions, voice rests,
  independent releases, nested tuplets/polyrhythms, pickups, meter/clef changes,
  pedal versus finger support, ambiguous unisons and loop cuts.
- [x] Add a six-bar meter fixture covering compound 3+3, explicit 2+3/3+2,
  right-aligned pickup versus ordinary short bar, and vertical time alignment.
- [ ] Extend the existing authored fixtures to arpeggiated/grace ornaments and
  repeat endings, then cover their future scored timing and recovery policies.
- [ ] For each fixture, assert score representation, engraving, expected live MIDI,
  playback events, timing/release judgements, mode-specific recovery and filtered-score
  behaviour. Include wrong-note, missing-note and premature-release variants.

Exit: a polyphonic passage can retain its musical identity from notation through
performance, including Bach-style independent voices in one hand, without reducing
everything to a sequence of chords that require all fingers to lift together.

## Stage 3 — Import one verified real passage end to end

- [x] Import local MIDI with preview/export, bounded raw events, paired note spans,
  tempo/meter, channels, tracks, controllers, source hashes and clear diagnostics.
- [x] Practise selected attacks as untimed outlines; preserve source events and timings
  independently of derived spelling and staff assignment.
- [x] Discover bounded Mutopia solo-piano public-domain/CC0 candidates with an opt-in
  script and a local author-selection shortlist, dated metadata hashes and licence links.
- [x] Bundle explicitly reviewed editions with original MIDI, prebuilt inspections,
  source/edition/contributor attribution, dated permission evidence and verified hashes.
  Check composition and edition/transcription rights separately; unclear assets stay out.
- [x] Rebuild accepted MIDI inspections offline and reject changed hashes or incomplete
  credits. Local files do not enter the shared library automatically.
- [ ] Import notation-preserving formats such as MusicXML with original spelling,
  voices, durations and ties. MIDI alone is performance data, not printed notation.
- [ ] Extend discovery beyond its current source with cached metadata, richer difficulty
  clues and respectful rate limits; rechecking must not silently replace accepted assets.
- [ ] Prove a verified passage with authored notation/voices end to end before declaring
  the full score-import milestone complete.

Exit: one real passage works end to end, with trustworthy provenance and authored
notation where supplied. Untimed MIDI practice is delivered; this full exit is not.

## Stage 4 — Progressive outlines of real pieces

- [x] Derive outlines separately, mapping retained notes to original IDs, ticks and onsets.
- [x] Read explicit MIDI opening key signatures, cautiously estimate a missing whole-piece
  signature from pitch evidence, and report recorded key changes.
- [ ] Render key changes as passage targets cross them; the current untimed outline uses
  its opening key throughout and reports later source markers.
- [x] Select 1–512 source onsets, tracks and inferred/explicit staves; filter by physical
  and reading range, hand, key/material and maximum chord size without changing pitch.
- [x] Reduce chords by highest note, bass, then inner notes; preview retained/omitted
  counts and explain empty passages. Empty attacks are omitted in this untimed view.
- [x] Loop an imported outline with fluid or release-between-targets progression.
  Require every retained source note-on to be freshly played, including a repeated note
  inside a changing chord. This is attack matching, not inferred tie support.
- [x] Preserve time, bar phase, silence and retained source identity in MIDI-derived
  rhythmic studies and authored reductions. Pitch outlines remain untimed.
- [ ] Add adjustable voice-aware musical reduction alongside a literal eligibility
  filter; protect useful melody/bass/harmonic anchors and avoid impossible hand spans.
- [x] Filter complete tied sounds, retaining durations/links across omitted attacks
  without orphaned ends. Apply ledger, hand span, leap and per-hand density limits.
- [ ] Support comparable staged restoration of independent voices and rhythmic detail,
  eventually restoring a complete source. Range/accidentals/density are adjustable now.
- [ ] Offer transposition/octave relocation only as separate, explicit derived choices
  with clear provenance; ordinary filtering must never change pitch.

Exit: a passage grows from sparse outline to full original with musical timing and
voice structure preserved. The untimed filtering foundation is complete.

## Stage 5 — Piece library and deliberate practice

- [x] Ship a pre-ingested offline Bach/Chopin library with source and licence credits.
- [x] Browse by composer, era, style and difficulty without replacing active practice.
  Existing pieces remain Unrated until reviewed; no unsupported exam grades are shown.
- [x] Suggest adjustable sections from MIDI markers, rest gaps and meter boundaries.
- [x] Save up to 50 named local passage bookmarks with source hashes, endpoints and
  track/staff choices; restore them after reloading the same source.
- [x] Isolate and repeat a selected passage; include/exclude tracks and assign staves.
- [x] Expand reviewed repertoire across Bach, Chopin, Beethoven, Haydn, Handel and
  Schumann, including a Clementi sonatina and demanding Rachmaninoff chords. Eight
  editions are bundled; difficulty remains Unrated pending a musical review.
  Find candidates with the discovery script, retain edition/MIDI permission evidence,
  present a shortlist, review each selected asset and ingest it offline with tests.
- [ ] Define and review Easy, Medium, Hard, Expert and Virtuoso tiers using range,
  accidentals, density, leaps, hand independence and rhythm; retain uncertainty and
  edition-specific evidence. A single grade must not replace those dimensions.
- [x] Choose a random piece within composer/era/style/difficulty filters, excluding the
  current choice when alternatives exist, with reproducible injected randomness in tests.
- [x] Search catalogue titles, composers and opus numbers alongside filters and random
  selection; ignore accents and opus spacing, and recognise sharp/flat symbols.
- [x] Remember up to 20 recent bundled pieces by ID and reviewed checksum, with a
  clearable local list, stale-edition protection and no local file retention.
- [ ] Add notation-aware phrase/bar loops, continuous traversal of a real score, tempo
  goals and ramped loops. Current endpoints are attack ranges, not recovered bar numbers.
- [ ] Extend suggestions with repeated motifs, harmonic cadences and editable timeline
  boundaries; record troublesome measures/intervals and offer optional targeted practice.

Exit: a curated library supports finding, simplifying, looping and resuming full music.
The small offline catalogue and attack-range deliberate practice are delivered.

## Stage 5A — Progress, personal bests and blind-spot analysis

- [x] Record per-target attempts with timestamps, written pitches/staves, exercise and
  source/passage identities, response time, wrong pitches and first-attempt accuracy.
- [x] Show mean/median/slower-tail response time, accuracy and clean-response personal
  bests for comparable exercise identities; preserve imported source/passage context.
- [x] Exclude practice pauses, background/unfocused time, range learning, release waits
  and confirmation delays from response-time measurements, with deterministic tests.
- [x] Keep optional local history (1,000 attempts), validated JSON import/export and
  clearing for the last hour, local today or all time. Flush pending saves before leaving.
- [x] Plot daily medians using actual calendar spacing, with an accessible daily table.
- [x] Break down hand/context, key, single-note pitch/spelling, accidental and exact staff/
  ledger position. Do not infer physical hands or fingers from MIDI alone.
- [x] Flag repeated corrections and slower comparable single-note responses with minimum
  exposures and visible evidence counts; preserve uncertainty with sparse data.
- [x] Test aggregation, pause handling, identity boundaries, graph summaries and persistence.
- [ ] Group attempts into explicit named sessions/runs; preserve generated seeds and
  complete scoring versions, distinguish novel reading from rehearsed loops.
- [ ] Add chord assembly/onset measures, missed/completion rates, recurring pitch-confusion
  pairs and rhythm-aware high scores without rewarding fast guessing.
- [ ] Add separate local player profiles, accuracy/range/coverage graphs over weeks,
  and evidence of reliable reading rather than merely a wider selected range.
- [ ] Offer optional targeted drills linked to their evidence, preserving player choice.

Exit: current untimed speed/accuracy history and reading-pattern evidence are usable.
Session analysis, recommendations and rhythm-game points remain separate future work.

## Stage 6 — Beat clock, metronome and playback

- [x] Schedule source MIDI ahead on an audio clock with tempo changes, velocity, sustain,
  selected tracks, speed scaling, pause/resume and held-tone chase. Playback is not input.
- [x] Provide an accented standalone metronome and optional source-aligned clicks with
  meter/tempo changes, playback-speed scaling and one/two-bar count-in.
- [x] Provide independent live/reference instrument, volume and enable controls, an
  independent click gain, target audition and live-sound button. Either path may be silent.
- [x] Supply original piano/organ synthesis plus offline acoustic-grand samples with
  pinned provenance, licences, attribution and integrity checks; keep banks replaceable.
- [x] Handle note release, live sustain, configuration changes, backgrounding and panic
  independently of physical-key matching; no generated playback enters live judgement.
- [x] Test scheduling, pause/cleanup, source pedal/tempo behavior and real offline audio
  rendering. This does not claim hardware latency measurements or human listening review.
- [ ] Connect the clock to an authored score and practice cursor, with musical seeking,
  fractional beats, wait/re-anchor policy and correct loop/entry pedal and held-note state.
- [ ] Add compound beat grouping, subdivisions, notation-aware pickups and calibration
  of MIDI/input, output and display latency without altering source notation.
- [ ] Add accompaniment-only/mute/solo by authored hand/voice, broader instrument banks
  and explicit MIDI-output selection with echo-loop prevention and output panic.
- [ ] Add acoustic velocity layers; profile sample-start latency before considering
  release/pedal/resonance modelling. Validate real-device doubled local sound separately.

Exit: stable click/accompaniment aligns with notation and measured input timing.
Source audio playback works now; score-synchronised rhythmic practice is still ahead.

## Stage 7 — Timing and scoring modes

| Mode | Transport | Mistakes / late notes |
| --- | --- | --- |
| Wait / learn | Waits for the expected pitches | Correct mistakes and continue; no timing penalty |
| Wait with timing score | Measures timing, then waits/re-anchors when needed | Deduct for early/late/missed timing, allow correction before proceeding |
| Continuous performance | Beat clock keeps running | Missed or wrong notes lose score; future music continues |

- [ ] Define attack windows, chord-onset tolerance, releases, ties, duration accuracy,
  early/late feedback, wrong notes, ignored notes and recovery after a miss.
- [ ] For scored wait mode, define how an error freezes/re-anchors the beat, metronome
  and accompaniment so one correction does not make the entire remainder permanently late.
- [ ] For continuous mode, expire missed events exactly once, recover the score cursor,
  and never require release of an already irrelevant target to let the transport advance.
- [ ] Separate timing judgement from finger-onset allowance and accessibility adjustments.
- [ ] Add accuracy/timing summaries, phrase/passage bests and consistent scoring versions.
- [ ] Keep educational speed/accuracy statistics separate from optional game points,
  multipliers, streak bonuses and ranked runs. Use **Virtuoso mode** as a working name
  for the continuous game-style experience; final branding remains a separate decision.
- [ ] Add streaks, runs, milestones and optional celebratory graphics, with reduced-motion
  and quiet visual settings. Feedback must remain readable without red/green distinctions.
- [x] Keep future visibility configurable independently of progression.
- [ ] Revisit end-of-section scrolling with full rhythmic scores.

Exit: a passage can be learnt patiently, corrected with timing penalties, or performed
against an uninterrupted clock. Each mode has explicit, testable recovery rules.

## Stage 8 — Full-piece rehearsal and polish

- [ ] Validate complete, demanding two-hand pieces with long holds, pedal, dense chords,
  tuplets/polyrhythms, tempo changes, expressive timing and long-form navigation.
- [ ] Provide section practice, ramped-tempo loops, full-piece runs and progress summaries.
- [ ] Benchmark low-end laptops, different browsers, USB MIDI devices and full-size
  keyboards. Keep background imports/analysis away from event-to-paint and audio scheduling.
- [ ] Add deterministic replay of recorded test MIDI, visual engraving fixtures and
  timing-clock tests; verify hardware and human usability separately.
- [ ] Use a representative verified Chopin score as a graduation example: a filtered
  outline grows into the full piece, then works in both scored-wait and continuous modes.

## Visual backlog

- [x] Offer a remembered scrolling policy independently of Repeat/Continuous:
  **note by note** keeps the active target at the left beside the clefs; **page
  by page** keeps the displayed group still, moves the active pointer through
  it, and replaces the whole page only after its last target is completed.
  Preserve pitch gating, loop boundaries, look-ahead and progress when switching
  views. Test short/partial final pages, repeat wrap and continuous replenishment.
  Keep the current view until this option is implemented and reviewed.
- [x] Keep the single-page interface, with settings visible on the page and more
  settings reachable by scrolling below the playing area rather than moving them
  into separate screens or hidden settings dialogs.
- [x] Fit the staff and on-screen keyboard together in a typical 1080p desktop
  browser viewport without page scrolling. Budget for title/tab/address/bookmark
  bars and the OS taskbar; use actual CSS viewport height, not screen resolution.
- [x] Recover roughly 100 px from the top area as a starting experiment: reduce
  masthead height, padding and gaps, and combine compact status/control rows.
  Measure the result rather than treating 100 px or 10 percent as a fixed rule.
- [x] Offer a remembered compact/density setting or collapsible masthead/status
  area, so users can scale the playing surface to their window and preference.
  Keep essential MIDI status and controls accessible, with an obvious restore action.
- [x] Preserve notehead readability, generous ledger-line space and colour-blind
  feedback. Do not solve vertical fit simply by shrinking all notation or keys.
- [x] Add viewport regression cases for 1920x1080 screens with reduced browser
  content heights (for example 1920x900 and 1536x800), laptop-sized windows,
  mobile layouts, zoom and dense/extreme-ledger targets. Verify staff/keyboard
  bounds, readable controls and access to every setting below. Allow internal
  notation scrolling when extreme material cannot sensibly fit simultaneously.
- [x] Explore image-generated banner concepts: a wide rectangular piano-keyboard or
  two-clef score flag, gently rippling, anchored at the left and fading toward the right,
  with “Piano Sight Reader” superimposed. Keep it restrained, legible and compatible with
  both palettes; export local assets and check rights/provenance of any references.
- [x] Theme button should name its destination: **Light mode** when dark is active,
  **Dark mode** when light is active. Include an accessible state/name contract.
- [ ] Preserve strong feedback contrast, non-colour symbols, optional keyboard inversion,
  uncluttered copy and the classical score character through future visual work.

## Recommended order

Build harmonic generation and the score/event model first. Prove one imported passage,
then its progressively richer outlines, before scaling the library. Add beat-synchronised
playback before rhythmic scoring; that depends on dependable timing, holds and event
identity. Basic untimed speed/accuracy tracking and local history can start earlier,
once their measurement contract and exercise identity are dependable.
Full-piece performance is the integration goal, not a reason to make basic practice
depend on catalogue downloads, audio setup or an account.


### Layout follow-up delivered

- [x] Remembered Custom layout: independently draggable/resizable staff and keyboard,
  notation scale, keyboard-accessible controls and recoverable responsive fitting.

- [x] Resolution-labelled 720p/1080p/1440p/2160p presets plus Automatic, with generous
  browser-chrome allowance and tighter header spacing.
- [x] Reserve feedback/MIDI activity and staff-pane height so notes do not move the keyboard.
- [x] Verify both clefs and keyboard fit in normal-range exercises, including a 540 px
  browser viewport for a 720p screen; preserve vertical ledger scrolling for wider ranges.


- [x] Add a local generated rippling grand-staff flag behind the real title, fading
  to the right and coloured from each theme. Preserve the compact header height.


- [x] Fit full piano keyboards to desktop width with remembered automatic/fixed key
  sizes, preserving pointer ownership and symbols when resized.

## Delivered follow-ups

- [x] Pre-ingested offline library with two source-credited public-domain editions.
- [x] Adjustable MIDI passage suggestions using markers, rest gaps and meter boundaries.
- [x] Immediate fluid pitch progression with one-target legato overlap and repeated-note articulation.
- [x] Clear the last hour, local calendar day or all practice history.
- [ ] Extend passage suggestions with repeated motifs, harmonic cadences and manual boundary editing on a timeline.
- [x] Expand the reviewed library to eight editions across the requested composers.
- [ ] Review difficulty dimensions and levels (Stage 5).

- [x] Offline sampled acoustic grand piano, independent live/reference selection and attributed media.
- [ ] Multiple acoustic velocity layers and measured sample-start latency; consider release/pedal/resonance modelling after profiling.

- [x] Optional source-aligned metronome with tempo/meter changes, speed scaling and one/two-bar count-in.
- [x] Compound beat grouping in source clicks/count-in, with phase-preserving cuts.
- [ ] Subdivisions and notation-aware printed pickups in the source clock; MIDI
  alone does not provide printed pickup or irregular grouping information.

- [x] Reproducible optional browser-test dependency and regression CI configuration with compact reports. Hosted execution is pending a push.

- [x] Session-only practice pause preserves measurements and demands fresh articulation on resume, with live key feedback.

- [x] Flush queued opted-in history before refresh/leaving and bound persistence delay during continuous playing.

- [x] Clarify library preview/start/download actions and document the workflow in README.
- [x] Add a local Help page for practice, passages, sound, history and MIDI troubleshooting.
- [x] Share the approved support link above Music library and on Help, with matching double rules.

- [x] Add Help beside Connect MIDI at the top, retaining contextual library help and compact narrow-screen controls.

- [x] Show an active exercise heading and filters above the stave, preserving the active piece identity while browsing previews.
- [x] Keep written-note ticks, notehead and accidental colours tied to accepted attacks for the current target; repeated held notes do not mark the next column.

- [x] Close the Help tab with a top-right ×; remove the redundant return link and footer explanation.

- [x] Make both Hear buttons temporary instrument auditions; live preview preserves Sound my playing and held voices. Use Target consistently in visible sound labels.

- [x] Require fresh physical presses for every generated or imported target pitch, including shared changing-chord notes; ignore duplicate held note-ons for practice credit.

- [x] Add an original two-bar polyphonic score-model fixture with held bass, two voices in one hand, cross-bar tie, rest, dots and simple triplets. Expanded Stage 2 engraving/matcher fixtures are delivered; broader full-music cases remain tracked above.

- [x] Make the original studies available in the primary Passage study view, with
  local engine/fonts, both palettes, keyboard/pointer inspection and live patient
  practice. Help documents the shared source selectors.

- [x] Render and play the original two-hand notation study with rests, independent voices, dots, triplets, tempo changes, cross-bar ties and distinct repeated attacks. Authored patient live judgement is now delivered in Stage 2.

- [x] Document user-run music discovery in README and Help; support keyboard alternatives,
  MIDI archives and explicit CC BY-SA 4.0 opt-in without automatic asset imports.

## Unified workspace and MIDI study follow-up

- [x] Switch Pitch practice / Passage study in the primary navigation on one page,
  sharing MIDI, keyboard, audio, layout/Scale, range and relevant reading aids.
- [x] Hierarchical settings show source-specific controls while preserving values;
  MIDI passage filters and source playback remain available in either view.
- [x] Derive bounded 1/32-grid passage notation from committed local MIDI, retaining
  source ticks/IDs/hash, attacks, known releases, silence, tempo/meter/key markers
  and source-channel pedal sound. Split one source note with ties; never infer ties
  between separate attacks. Spelling and voice lanes are explicitly derived.
- [x] Reject missing releases, collapsed repetitions and exceeded limits without
  changing the inspection. Preserve the original phrase/study through view switches.

This advances MIDI-derived rhythmic study; notation-preserving edition import,
expressive transcription, ornaments and scored modes remain distinct roadmap work.


## Stage 2 meter and settings follow-up

- [x] Remove redundant random-practice shortcuts; keep Source first in each view.
- [x] Center the title/bar number with Bars per line and Scale, with distinct,
  spaced control groups and a narrow-screen layout.
- [x] Validate and engrave explicit beat groups, compound defaults, pickups and
  ordinary incomplete measures; preserve known MIDI fragment phase separately.
- [x] Exercise the new meter study through playback, patient holds/rests,
  correction waits and source-preserving filtering.
