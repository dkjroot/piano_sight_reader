# Roadmap

The destination is a piano practice workspace where a learner can start with a
small, playable outline of a real piece and gradually restore its notes, voices,
range and rhythm until they can perform the full score. Support patient correction,
timed practice with recovery, and continuous performance with scoring. Keep random
exercises independently useful throughout. These are plans, not implemented claims.

## Working foundation

- [x] Local Flask server, browser MIDI, grand staff and on-screen keyboard.
- [x] Learnable physical range; independent key spelling and MIDI pitch.
- [x] Standard key signatures, chromatic practice and basic chord names.
- [x] Configurable chord sizes, phrases, look-ahead and exact pitch matching.
- [x] Repeat loops and continuous random practice, gated by correct playing and release.
- [x] Strong contrast, redundant feedback symbols, dark/light themes and optional targets.
- [ ] Measure physical keyboard-to-display latency on the Yamaha and a full-size piano.
- [ ] Preserve the current scrolling policy for now. Revisit with real musical phrases;
  do not decide on end-clamping, centring or animation until those examples exist.

## Stage 1 — More musical generated practice

- [x] Offer random pitches and diatonic chords/cadences as choices; random remains unrestricted.
- [ ] Add explicitly authored dissonant/advanced harmonic vocabularies.
- [x] Generate diatonic triads, inversions/doublings and major/natural-minor cadences.
- [ ] Add sevenths and more varied tonal progressions.
- [x] Bound harmonic hand spans and prefer nearby voicings.
- [ ] Extend explicit per-hand planning and leap limits to every exercise source.
- [ ] Add melody, bass, chordal and broken-chord textures, with separate hand difficulty.
- [ ] Separate difficulty dimensions: range, accidentals, ledger lines, density, leaps,
  independence of hands and rhythm. A single easy/hard label is insufficient internally.
- [ ] Keep chromatic material, unusual keys and advanced accidentals available as goals.

Exit: useful musical miniatures that respect the selected instrument and reading level,
without requiring imported music. Random pitch practice remains available.

## Stage 2 — A real score and performance model

- [ ] Introduce an immutable source-score model with stable event IDs, rational beat
  positions, durations, voices, staves, measures, rests, key/time signatures and tempo maps.
- [ ] Represent attacks, releases and continuing held notes separately. Support ties,
  repeated notes, overlaps between hands, sustain pedal and notes crossing barlines.
- [ ] Replace the current all-keys-release gate with event-aware expectations: notes may
  continue while another voice moves; ties do not demand a new attack, repeated notes do.
- [ ] Engrave multiple attacks per bar, note values, beams, rests, dots, tuplets, ties,
  changing signatures, courtesy/cancellation accidentals, cross-staff/voice collisions,
  pickups and phrase boundaries. Preserve authored enharmonic spelling.
- [ ] Evaluate a score engraving engine against these examples before extending the
  current SVG renderer into a complete engraving system. Keep the MIDI path lightweight.
- [ ] Define loop entry/exit: tied notes at a cut, pedal state, pickups and re-articulation.

Exit: a small authored two-hand passage renders and plays correctly with ties, rests,
different durations and more than one event per measure. No rhythm game is needed yet.

### Full-music requirements for the score model and matcher

These extend Stage 2 and must feed into import, simplification, transport and scoring.
An ordered list of simultaneous pitch sets is not enough for real piano music.

#### Independent musical events and voices

- [ ] Give each note its own onset, notated duration, release expectation, voice and
  optional hand assignment. A chord can contain notes of different lengths, and its
  notes need not all stop when the next attack arrives.
- [ ] Separate voice identity, staff placement and physical hand. Support multiple voices
  in either hand, cross-staff notes, voice exchange, hand crossing and changing clefs.
  Staff alone must not be treated as proof of which hand actually played a note.
- [ ] Support simultaneous but independent rhythms between hands and within one hand:
  a held inner voice under a moving melody, a fugue subject against countersubjects,
  or a repeated bass pattern while upper parts move independently.
- [ ] Represent rests per voice, including partial-bar, whole-bar and multi-measure rests.
  A rest in one voice does not require silence in every other voice or a global release.
- [ ] Use exact score-time arithmetic for dotted/double-dotted values, syncopation,
  tuplets and nested tuplets. Support polyrhythms such as 3:2 and 4:3 without cumulative
  floating-point drift or forcing both hands onto an inadequate rhythmic grid.
- [ ] Distinguish simple/compound/irregular meter, beat grouping, pickups, incomplete
  measures and meter changes. Align voices vertically by musical time, not by note index.

#### Ties, articulation and physical versus sounding duration

- [ ] Store ties as explicit links between particular note events in a voice, including
  across barlines/systems. Match the initial attack and continuation correctly; a tied
  continuation must not ask for another attack. Preserve distinct same-pitch repetitions.
- [ ] Treat slurs as phrasing/articulation, not as ties. Add legato, staccato, tenuto,
  accents and phrase marks with documented, adjustable release/onset expectations.
- [ ] Maintain independent expected notes that are starting, continuing and ending at
  each score position. Retire the foundation's blanket release-between-targets rule
  for real-score practice: release only the notes whose musical duration has ended.
- [ ] Distinguish physical key duration, pedal-sustained sound and notated duration.
  Allow a practice policy to require finger-held continuity where appropriate or to
  accept pedal-supported continuity, without silently treating the two as identical.
- [ ] Add sustain/damper markings and pedal changes, including overlapping/changed pedal.
  Preserve continuous pedal values when supplied; half-pedal scoring needs compatible
  hardware and an explicit policy. Do not infer capabilities from a device name.
- [ ] Plan optional sostenuto (selectively retained notes) and soft pedal support. Keep
  unsupported controller/dynamic requirements optional and clearly unscored.
- [ ] Handle shared MIDI pitches across voices/hands without inventing extra physical
  attacks or assigning the same event twice. Document ambiguous unisons, repeated notes
  against an already sustained voice, and the limits of MIDI evidence about fingering.

#### Expressive timing, ornaments and playback order

- [ ] Add tempo maps, gradual tempo changes, rubato practice, fermatas and explicit
  pause/count-in behaviour. Keep a steady-tempo teaching option alongside score-faithful
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
- [ ] When wait mode pauses, freeze/re-anchor the score clock and remaining expected
  durations coherently with accompaniment and metronome. A late correction must not
  make a held voice indefinitely long or mark every following attack late.
- [ ] On a miss, distinguish correcting the current event, continuing after an expired
  event and explicit seeking. Recover at clear score/beat anchors; do not silently
  jump between similar passages or repeated occurrences on ambiguous pitch evidence.
- [ ] Restore or deliberately re-articulate continuing notes on seek, loop entry,
  hands/voices being muted, pause/resume and disconnection. Reset playback and pedal
  state safely, and avoid stuck audio or retroactive credit for notes never played.

#### Engraving and acceptance examples

- [ ] Render independent stems, beams, rests and ties per voice, including opposing
  stems, shared/unison heads, close seconds, different note values at the same onset,
  cross-staff beams and accidentals scoped correctly within measures and voices.
- [ ] Keep visual score events, performance-expanded ornaments, audio events and matcher
  events linked but separate. Playback must never masquerade as live performance input.
- [ ] Build authored, deterministic fixtures for each case before broad catalogue import:
  a held bass under moving right-hand notes; two independent voices in one hand;
  a tied inner note across a bar while neighbouring notes repeat; one hand resting
  while the other continues; different release times in one chord; syncopated holds;
  3:2 and 4:3 rhythms; a pickup/meter change; pedal-supported releases versus finger
  holds; an arpeggiated chord/grace ornament; shared-pitch voice ambiguity; repeat
  endings; and seeking/looping into the middle of a tie or pedal span.
- [ ] For each fixture, assert score representation, engraving, expected live MIDI,
  playback events, timing/release judgements, mode-specific recovery and filtered-score
  behaviour. Include wrong-note, missing-note and premature-release variants.

Exit: a polyphonic passage can retain its musical identity from notation through
performance, including Bach-style independent voices in one hand, without reducing
everything to a sequence of chords that require all fingers to lift together.

## Stage 3 — Import one verified real passage end to end

Shipped discovery foundation: `tools/discover_scores.py` creates a bounded Mutopia
solo-piano public-domain/CC0 candidate shortlist, with edition/contributor/licence
links, evidence, retrieval timestamp and metadata hash. No assets are downloaded or
bundled; per-asset review remains below. Local MIDI inspection now preserves a
bounded raw event timeline, paired note spans, tempo map and source hash, with
preview/export and malformed-file diagnostics. Selected passages can now be played
as filtered, repeated untimed pitch outlines; notation-aware/rhythmic import remains
below.


- [ ] Support local score imports with preview and validation. Prefer notation-preserving
  formats such as MusicXML where available; support MIDI as performance data too.
- [ ] MIDI import must retain tempo/meter, channels, tracks, controllers and note timing.
  Treat inferred spelling, hand/voice assignment and rhythmic quantisation as derived,
  reviewable choices, not as recovered original notation.
- [ ] Keep originals intact, with provenance, source URL, author/composer, edition,
  arrangement/transcription credits and verified licence/public-domain basis.
- [ ] Check composition, edition and MIDI/transcription permissions separately. Freely
  downloadable does not automatically mean redistributable. Do not assume a MIDI exists
  or is freely licensed for every piece. Do not bundle unverified scores or recordings.
- [ ] Build an opt-in discovery script that searches suitable music sources automatically
  and presents a local shortlist for the author to choose from. Include composer/title,
  format, difficulty clues, source URL, licence text/URL, attribution and review status.
- [ ] Assess suitability for distribution alongside this GPL application per asset;
  retain original licences/attributions. The code's GPL licence does not establish the
  licence of an edition, transcription, MIDI performance or associated sample asset.
- [ ] Separate verified redistributable candidates from unknown/unclear permissions;
  exclude unclear material from bundled catalogues. Preserve dated evidence and hashes
  of selected downloads, and require explicit selection before adding to the library.
- [ ] Cache discovery metadata, respect source access/rate limits, and support reviewed
  local/offline imports. Rechecking a source must not silently replace an accepted score.
- [ ] Add resource/size limits and clear malformed/unsupported-import diagnostics.
- [ ] Select a short, verified passage, assign its hands/voices, and practise it in wait
  mode at original pitches before adding automatic simplification or a large catalogue.

Exit: one real passage works end to end, with trustworthy provenance and authored
notation where supplied. This is the first proof toward a full Chopin piece.

## Stage 4 — Progressive outlines of real pieces

Shipped first step: local MIDI attack outlines, explicit 1–512-onset passage selection,
range/key/material/staff/max-chord filters, highest/bass/inner reduction and source
identity per retained note. Preview counts omissions; the original performance model
stays unchanged. This untimed view skips empty attacks and requires release between
targets; preserving scored silence/holds and voice-aware reduction remains future work.

- [ ] Derive practice versions from the source, without overwriting it. Map every retained
  note and event back to its original score position and identity.
- [ ] Filter by physical/reading range, key/chromatic allowance, permitted accidentals,
  hand, chord size, ledger distance and selected passage.
- [ ] Preserve onset order, bar alignment, meter and phrase shape. Replace omitted events
  with appropriate silence; do not silently compress time or pull later notes forward.
- [ ] When reducing chords, prefer musically useful voices: melody, bass, harmonic
  anchors, then inner parts. Make this policy explicit and adjustable.
- [ ] Offer a literal eligibility filter as well as a more musical outline. Preview which
  notes were retained/omitted. Explain when criteria leave a passage empty.
- [ ] Preserve/rebuild ties and durations after filtering; resolve orphaned tie ends and
  sustained notes across omitted attacks. Avoid creating impossible hand spans.
- [ ] Increase range, accidentals, chord density and independent voices progressively,
  eventually restoring the complete source. Keep versions comparable across sessions.
- [ ] Avoid changing pitch as part of filtering. Offer transposition/octave relocation
  only as separate, explicit options with clear provenance.

Exit: the same passage can be played as a sparse beginner outline, several intermediate
versions and the full original, with preserved musical positions and useful progression.

## Stage 5 — Piece library and deliberate practice

- [ ] Add a piece menu with composer, style/period, title, source and approximate difficulty.
- [ ] Provide Easy, Medium, Hard, Expert and Virtuoso browsing tiers, backed by measurable
  difficulty dimensions and human review rather than unsupported claims about levels.
- [ ] Choose a piece directly or choose randomly within composer/style/difficulty filters.
- [ ] Define phrase/section/bar ranges and saved loop points. Repeat mode should let the
  player isolate a difficult real passage; continuous mode can proceed through a piece.
- [ ] Add hands-separate practice, tempo goals, bookmarks, recent pieces and local progress.
- [ ] Record troublesome measures/intervals and offer targeted practice without locking
  users out of harder music. Make random selection reproducible for testing.

Exit: a small curated library supports finding, simplifying, looping and resuming music.
Expand the catalogue only after the score/import/practice contracts are dependable.

## Stage 5A — Progress, personal bests and blind-spot analysis

Basic typing-tutor-style feedback can begin before rhythmic playback/scoring exists.
Use it to show reading progress, not just a game score or eventual completion rate.

Shipped foundation: per-target written/context records, mean/median response time,
first-attempt accuracy, clean-response personal bests for matching exercises, optional
local history (1,000 attempts), validated JSON import/export/deletion, daily median graph
and exact UTC daily table, 90th-percentile response time and hand/key/
single-note pitch/accidental/ledger-position breakdowns. Background and unfocused time,
release waits and the confirmation delay are excluded. The tasks below include the
remaining session, rhythm, import, coverage and recommendation work.

- [ ] Record local practice sessions and per-target attempts, with timestamps, written
  pitches, staff/hand assignment, key signature, generated seed or source passage IDs,
  exercise settings and scoring version. Preserve the context needed for fair comparison.
- [ ] Show average time to a correct response, median and slower-tail response times,
  first-attempt accuracy, wrong/missed/extra notes, correction count and completion rate.
  For chords, distinguish the initial attack from time spent assembling/correcting it.
- [ ] Exclude pauses, background tabs, disconnected devices, range learning and deliberate
  completion/release delays from reading-speed measures. Document the timing contract.
- [ ] Add exercise/passage personal bests and meaningful high scores. Compare like-for-like
  settings, tempo/mode, retained score version and chord size; show accuracy alongside speed
  so fast guessing does not look like improvement. Separate novel reading from rehearsed loops.
- [ ] Store progress across sessions locally, with optional separate player profiles and
  explicit export/import, reset and deletion. No account or upload should be required.
- [ ] Add an analysis view with accessible graphs of speed, accuracy and reading range over
  days/weeks, plus exposure/coverage. Distinguish notes merely encountered from notes read
  accurately and reliably; a wider selected range alone is not demonstrated improvement.
- [ ] Break results down by authored hand/staff, left versus right, two-hand coordination,
  pitch and octave, key signature, accidental type and written staff position. Include
  ledger distance above/below each clef, including specific positions such as the second
  ledger line. Preserve spelling so F♯ in one key is not conflated with G♭ in another.
- [ ] Identify consistently slow or mistaken notes, recurring pitch confusions, difficult
  sharps/flats, weak keys and uneven hand performance. Keep exposure counts and uncertainty
  visible; sparse evidence should not be labelled a weakness. Do not infer actual fingers
  or hands from MIDI alone when the source provides no reliable assignment.
- [ ] Offer optional targeted exercises for observed blind spots, with an explicit link
  from the recommendation to its evidence. Preserve player control over practice settings.
- [ ] Test aggregation, pause handling, score-version boundaries, difficulty comparisons,
  storage/export/deletion and graph summaries with deterministic session fixtures.

Exit: a player can see whether they are improving, under comparable conditions, and
identify specific reading weaknesses to practise. Rhythm-game scoring remains separate.

## Stage 6 — Beat clock, metronome and playback

Shipped foundation: independent live-input and target-audition instruments/volumes,
original local piano-like/organ synthesis, held/sustain release and panic, plus an
optional accented audio-clock metronome. This does not yet play scored pieces or
synchronise targets to rhythm. Sound starts only through a user gesture.

- [ ] Add a monotonic musical transport with tempo changes, meter, count-in, seeking,
  pause/resume and fractional beat positions. Keep score time separate from wall time.
- [ ] Implement a metronome with beat/bar accents, adjustable tempo and subdivision.
- [ ] Schedule sound ahead on an audio clock rather than relying on DOM animation or
  timer intervals for beat accuracy. Measure MIDI/input, output and display latency.
- [ ] Add local reference/MIDI playback, mute/solo hands or voices, accompaniment-only
  and play-along. Support browser synthesis and explicit MIDI-output device selection.
- [ ] Evaluate local MIDI-driven synthesiser/sampler libraries and suitable instrument
  banks (including SoundFont/sample options); MIDI events themselves are not audio.
  Check library, sound-bank, sample and individual asset licences for redistribution
  with the GPL project. Record the chosen sources, versions and attribution requirements.
- [ ] Support two independent sound paths: reference/accompaniment playback and the
  player's live MIDI input. Each needs its own instrument/program, volume and enable/mute
  control. For example, quiet organ accompaniment with a louder piano for live playing.
- [ ] Offer convincing piano/organ and other supported MIDI instruments, with a clear
  local loading path and optional original synthesised sounds. Keep sound engines/banks
  replaceable, and allow either path or both to be silent. Give the metronome its own gain.
- [ ] Handle live note-off, sustain, instrument changes, latency and panic independently
  per path. Test for doubled instrument sound where the hardware also has local sound,
  and avoid sending playback into the live-input matcher or creating MIDI echo loops.
- [ ] Keep exercise input distinct from playback/output to avoid MIDI feedback loops or
  counting generated notes as the player's performance. Provide output panic/all-notes-off.
- [ ] Define playback/pedal/held-note behaviour when waiting, looping, seeking or unplugging.
- [ ] Allow tempo scaling and latency calibration without altering source notation.

Exit: stable click and accompaniment align with notation and measured input timing at
slow and normal tempos. Untimed practice still works without enabling sound.

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
- [ ] Keep future visibility configurable; revisit end-of-section scrolling with real scores.

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
- [ ] Keep the single-page interface, with settings visible on the page and more
  settings reachable by scrolling below the playing area rather than moving them
  into separate screens or hidden settings dialogs.
- [x] Fit the staff and on-screen keyboard together in a typical 1080p desktop
  browser viewport without page scrolling. Budget for title/tab/address/bookmark
  bars and the OS taskbar; use actual CSS viewport height, not screen resolution.
- [ ] Recover roughly 100 px from the top area as a starting experiment: reduce
  masthead height, padding and gaps, and combine compact status/control rows.
  Measure the result rather than treating 100 px or 10 percent as a fixed rule.
- [x] Offer a remembered compact/density setting or collapsible masthead/status
  area, so users can scale the playing surface to their window and preference.
  Keep essential MIDI status and controls accessible, with an obvious restore action.
- [ ] Preserve notehead readability, generous ledger-line space and colour-blind
  feedback. Do not solve vertical fit simply by shrinking all notation or keys.
- [x] Add viewport regression cases for 1920x1080 screens with reduced browser
  content heights (for example 1920x900 and 1536x800), laptop-sized windows,
  mobile layouts, zoom and dense/extreme-ledger targets. Verify staff/keyboard
  bounds, readable controls and access to every setting below. Allow internal
  notation scrolling when extreme material cannot sensibly fit simultaneously.
- [ ] Explore image-generated banner concepts: a wide rectangular piano-keyboard or
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

- [x] Resolution-labelled 720p/1080p/1440p/2160p presets plus Automatic, with generous
  browser-chrome allowance and tighter header spacing.
- [x] Reserve feedback/MIDI activity and staff-pane height so notes do not move the keyboard.
- [x] Verify both clefs and keyboard fit in normal-range exercises, including a 540 px
  browser viewport for a 720p screen; preserve vertical ledger scrolling for wider ranges.
