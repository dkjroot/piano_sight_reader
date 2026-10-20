# Piano Sight Reader: detailed usage guide for an explanatory agent

Usage reference prepared on 20 October 2026 against the current application.
Audience: an agent producing a spoken or video guide for a pianist using this
project for the first time. This document deliberately concentrates on operation,
musical meaning, examples, interactions and recovery. Installation details are
in the main README; implementation contracts and future work are in the
development documents. Treat planned features there as plans.

The companion [pianist’s guide](README.md) provides the shorter learning path.
Its seven screenshots are actual Edge captures made for these guides, using a
fresh browser context and no connected MIDI piano. They illustrate controls and
notation, not measured hardware response or a recorded human performance. The
light theme was selected for most pictures; the app initially uses dark mode.

## 1. The explanation that should come before any tour of controls

The central task is to connect written musical information to physical piano
actions. A player may have excellent technique and musical understanding yet
still read unfamiliar notation slowly. The application lets that player limit
the reading problem, work without being rushed, and repeat or vary the material.

Explain the two views before enumerating settings. Pitch practice presents
successive pitch targets. A target is a single note or a set of notes to attack
together. The player may take time to find it; there is no required onset time.
Passage study presents notation with durations, rests, voices and ties. Its
patient practice clock advances while the required playing state is correct and
waits during a correction. Listening is a third activity: the application can
play a source passage or study without claiming that the user has played it.

Generated material and selected repertoire solve different problems. Random
generation prevents learning one fixed excerpt by memory. Harmonic generation
gives recognisable musical families. A selected piece provides real combinations
and transitions that the player wants to learn. A short repeated passage is
valuable for resolving a difficulty, but success on it is not evidence that all
new music at that level will read fluently. Recommend moving between repetition
and unfamiliar material.

Use “target”, “attack”, “held”, “sustained”, “passage” and “voice” consistently:

- A **target** is what the current pitch-reading step asks the player to press.
- An **attack** is a new physical press or a new source note onset. Two printed
  occurrences of a pitch may demand two attacks, even when the pitch is identical.
- A **held** note has a physical key still down.
- A **sustained** note has been released physically but is kept sounding by pedal.
- A **passage** is a selected stretch of source material. Its MIDI attack
  endpoints are different from the beat boundaries used in a study cut.
- A **voice** is an independently timed line. A voice can rest while another
  continues; it is not automatically a different MIDI track or a different hand.

The application reads MIDI or on-screen key actions. It does not listen through
a microphone and identify pitches from an acoustic piano. Its feedback cannot
see posture, fingering, relaxation, hand crossing or musical intention. Teach
the pianist to choose comfortable material rather than interpreting a generated
voicing as a prescribed fingering.

## 2. Orientation and a reliable first connection

The top area contains the title, Pitch practice and Passage study switches,
Dark mode, Connect MIDI and Help. Under it are connection status, the Input
selector, Sustain state, Clear held keys and last-note activity. The playing
canvas contains the staff panel and the on-screen keyboard panel. Settings sit
below; Music library and the MIDI preview sit further down. Progress is shown
in Pitch practice. Scrolling down the page to settings is ordinary operation,
not evidence that the app has switched to a second workspace.

For the first demonstration, launch as described in the README, open the local
address in Chrome or Edge, connect a MIDI-capable instrument, press Connect MIDI
and allow access. This permission enables the browser to receive note messages.
It does not turn on browser sound. Select the intended device under Input. A
listed device and a working open input are not the same thing: play a key and
look for last-note activity and the matching key highlight.

If connection has already been established, the connection action can be labelled
Refresh MIDI. Refresh closes and reopens the input; use it after a cable change
or when a device is listed but silent. If opening fails, the status is useful
evidence. Other MIDI applications may be holding the port. Switching devices,
unplugging and leaving the application window can clear physical key state;
release and replay keys on return rather than expecting old holds to count.

Do not make setup depend on a particular model’s undocumented key range. The
initial physical endpoints are C3–C6, a starting setting. In Physical keyboard
range the Lowest and Highest sliders can cover MIDI pitches 0–127. Learn lowest
key arms learning for one endpoint; the next appropriate physical note establishes
it. Repeat with Learn highest key. Learning is configuration, not an attempt to
answer the current reading target. Use the sliders if no MIDI input is available.

The application calls middle C C4 and identifies it as MIDI 60. An instrument
may call that physical pitch C3 or C5. Explain that the MIDI number resolves the
octave-name disagreement. An apparent octave-label mismatch does not require
transposing the keyboard.

Keep physical endpoints honest. A player with an 88-key piano can still choose
a small Reading range for a lesson. A player with a short controller should not
claim a larger instrument just to make a filter pass. Wider notation can be
studied visually, but targets must be physically reachable for playing practice.

Without MIDI, each on-screen key is playable. A mouse supports straightforward
single-note exploration. Multitouch supports chords. A focused key accepts Space
or Enter while held; repeated operating-system key events from holding the
computer key do not manufacture fresh piano attacks. This is not a mapped
computer typing keyboard with a whole row of letters assigned to pitches.

## 3. Shared controls and the independence of the major choices

Several pairs of controls are easy to confuse. Make their differences explicit
through actions rather than a long abstract warning:

| Choice | What it controls | What to use alongside it |
| --- | --- | --- |
| Pitch practice / Passage study | The musical task and notation workflow | Choose the view before choosing its source |
| Source | Which generated family, MIDI passage or study supplies material | Does not mean selecting a MIDI input device |
| Repeat / Continuous / Stop at end | What happens at the end of pitch material | Independent of note/page scrolling |
| Fluid / Release between targets | Physical progression between pitch targets | Separate from looping and sustain sound |
| Note by note / Page by page | Presentation of pitch targets | Does not set tempo or generate another phrase |
| Reading range | A chosen practice region | Intersects the physical keyboard endpoints |
| Dark mode / keyboard inversion | Page palette / actual piano-key colours | Either can change without the other |
| Show note names / Show targets on keyboard | Text spelling aid / key-position aid | Either can be used temporarily |
| Live sound / Target sound | Sound for user input / sound for auditions and listening | Different instruments and volumes are possible |
| Source speed / study speed / metronome tempo | Three distinct timing contexts | Adjust the one for the current activity |

View switching shares the MIDI connection, actual keyboard, sound configuration,
panel layout, notation scale, note-name setting and target-visibility setting.
It is not another independent piano connection. The pitch phrase and study
position can be retained across view changes, but active playback is stopped and
practice re-entry requires fresh articulation. A shared filter change can make
the other view’s retained material need rebuilding when the player returns.
Do not promise preservation of an identical phrase after changing its material.

Settings are source-sensitive. For example, Advanced vocabulary is available for
Advanced harmony; Cadence sequence for Cadence; Attack pattern is relevant to
two-hand generation. Controls can disappear because they do not apply, rather
than because the page failed to load. The shared passage filters move into the
settings for the active view.

## 4. Reading a pitch-practice screen

The italic heading names the active exercise. The summary identifies its key,
hand, range and other choices, and identifies the piece and source attack window
for an active MIDI outline. Use this heading when teaching the difference between
an active exercise and a newly loaded preview lower on the page.

In Note by note scrolling, the current target sits leftmost beside the clefs.
Future targets appear to its right. On a correct answer, the next target takes
that position. In Page by page, the displayed group stays in place and the active
pointer moves through it; a new group appears after the last displayed target.
There is no need to reach for a manual page-turn or new-phrase button during
ordinary automatic practice.

Look-ahead offers None, 1, 2, 3, 4 or 7 upcoming targets. “None” hides future
targets, not the current one. A chosen number is a maximum: narrow viewports,
large chords and wider accidental columns can reduce what fits readably. Changing
look-ahead, scrolling or viewport size does not generate a new phrase or reset
the current position. This makes display adjustments safe during a lesson.

In Repeat passage, a double barline separates the ending from the preview of
the opening. It helps the player read through the return. The preview does not
turn the final chord into a tie or permit the opening to count without a new
press. The repetition counter counts completed cycles; Continuous counts targets.

Pitch practice drawings are successive pitch tasks. Stem shapes and vertical
separators there do not prescribe a rhythm from the source piece. Generated
broken patterns are also untimed. A teacher can choose to practise with a pulse,
but the pitch matcher itself does not judge that pulse.

## 5. Exact matching, staggered fingers and fresh articulation

The player must obtain the target’s exact physical pitch set. Correct target
notes may be pressed one after another with small onset differences. The app
does not need a perfect laboratory simultaneity, but it does need those pitches
held together before the target completes. Wrong extra keys prevent a match,
subject to the specific retiring-note allowance in Fluid mode.

For example, suppose the target is C4–E4–G4. Pressing C4 and then E4 can light
correct feedback while G4 remains missing. Press G4 while keeping C4 and E4
down, and the chord can complete. Press F4 as an extra and it must be corrected.
Press C5 instead of C4 and the octave is wrong; the exercise is not matching
pitch classes alone.

Fluid is the default Advancement. It accepts a complete correct physical set
immediately. It does not impose a fixed chord-settling delay. Other, non-target
notes retiring from the immediately preceding target can overlap briefly so the
player need not make every change completely detached. This allowance is not
permission to accumulate arbitrary keys from earlier chords.

Every target pitch must nevertheless have a fresh physical attack. If the next
chord is C4–F4–A4, holding C4 from the preceding C-major chord does not answer
the new C4. Release C4 and press it again. E4 and G4 can retire through the
transition under the overlap rule, but the new C4, F4 and A4 all need their own
attacks. The same rule applies when an entire target repeats, and at the loop
boundary. Duplicate MIDI note-on messages while a pitch remains physically held
do not count as rearticulation.

Separate actual key illumination from target credit in a narration. A held C
can still be visible on the keyboard while the new written C has not earned its
tick. The application is showing both physical state and current-task credit.
It is not contradicting itself.

Release between targets provides a more deliberate alternative. The correct
physical chord must settle for approximately 120 milliseconds and progression
then waits for physical key release. Visual keys still respond immediately;
this small stable-match gate belongs only to this progression option. Do not
describe it as input latency or claim that Fluid has the same delay.

Sustain is separate from the physical set in either pitch progression. Keeping
the pedal down does not supply missing keys. Once the fingers release, a note
can remain audible and patterned on the keyboard, but it is not physically held
for the next pitch target. Source/channel ownership is preserved, so pedal and
release events from one input are not a reason to invent fresh attacks on another.
The user-visible lesson is simple: make a real release and press of the required
key, even if the previous sound is still ringing.

## 6. Feedback, aids and chord names

Correct feedback uses ticks, extras crosses, sustain an approximation mark and
diagonal pattern, and optional targets diamonds. Read the symbols as well as the
colour. Target diamonds are dark orange on light keys and bright amber on dark
keys, following actual key background even when inversion is enabled. This makes
the target aid usable in either page theme and either keyboard colouring.

Show targets on keyboard begins off. Turn it on for a specific stalled note or
chord, establish its keyboard position, then hide it and reread the notation.
Hiding targets leaves actual played-note feedback and matching intact. Show note
names is a separate option in Workspace. It can clarify an accidental or octave,
but looking at names for every target changes the skill being practised. Suggest
using it as a check rather than claiming the app enforces any teaching method.

Direction arrows appear beside the affected written note and on the played key.
For a single target against one played pitch, the application can indicate up
or down even over a large distance. With chords it locks already-correct notes
and only pairs a missing pitch and wrong pitch if they are each other’s unique
nearest unmatched neighbour within two semitones. Ties and distant pairings get
no arbitrary assignment. Therefore no arrow can mean “the correspondence is
ambiguous”, not “you are close enough”. The arrows concern pitch, not a detected
finger or instruction to slide a particular finger.

A chord name is shown after correct playing when the exact pitch-class set fits
a recognised template. It is a feasible label, possibly with a slash bass for
an inversion. Single notes do not get chord names. Arbitrary clusters can remain
unnamed. Do not announce a name as the only analysis or assume it reveals the
function in the surrounding music. Advanced functional spelling can teach
something that a generic after-the-fact chord label does not express.

## 7. Designing generated practice: pitch, key and range

Source → Random pitches creates note combinations within the selected limits.
Begin with one note, a small reading range and a familiar key. Set both minimum
and maximum chord sizes to one to keep the session genuinely single-note.
Choose Repeat passage for a short study, then Continuous for unfamiliar examples.

Key selects all fifteen standard signatures, from seven flats through seven
sharps, labelled as relative major / natural-minor pairs. C major / A minor
denotes one shared signature. In harmonic generation, Tonality chooses which
member of that pair is the tonic. Selecting that Key label alone does not tell
Random pitches to create a harmonic A-minor progression.

Pitch material → Notes in key restricts the pool to the selected signature.
Chromatic · prefer sharps and Chromatic · prefer flats allow chromatic notes
while choosing a spelling preference. They are not transposition controls.
Chromatic notes use explicit cancellations or alterations against the signature.
Natural keys remain natural when appropriate. Chords may use an enharmonic
alternative to avoid two distinct notes colliding on one written position.

Written letter, accidental and octave are meaningful independently of physical
pitch. B-sharp 3 sounds like C4; C-flat 4 sounds like B3. Do not simplify those
names to a misleading written octave or tell a viewer that an accidental means
the key must be black. The pitch matcher still expects the correct physical key.

Reading range offers Near middle C, Wider staff range and All available notes.
These intersect physical endpoints, hand selection and the other constraints.
For reference, Near uses C3–B3 for the generated left-hand region and C4–C5 for
right; Wider uses C2–C4 for left and C4–C6 for right. Both-hand pools cover the
combined region, with generated planning placing left below middle C and right
from middle C upwards. All available notes uses the eligible physical range;
it does not disable the hand plan or expand the instrument.

Do not treat the hand selector as fingering detection. In generated material it
selects the intended stave/hand region. For imported material an explicit track
staff assignment can make a treble line cross below middle C or a bass line
above it. The hand filter then follows that assignment, while pitch/range
filters can still remove notes. Practical diagnosis should consider both staff
assignment and eligible pitch range.

Ledger lines offers Unrestricted, Within staves, One, Two or Four. Use it to
isolate staff recognition before adding distant notes. It works alongside Reading
range, not instead of it. A player can allow a physically wide keyboard but
limit written distance. In unusual keys, spelling affects the written position,
so two enharmonically equivalent sounds need not present the same ledger problem.

## 8. Density, hand span and leaps

Minimum notes per chord and Maximum notes per chord range from 1 to 10 for
generated targets. Equal settings request consistent density where feasible;
minimum 1 / maximum 3 permits a mixture. The minimum cannot exceed the maximum.
These are total target bounds, not “this many notes in each hand”.

Left hand notes and Right hand notes cap each hand from one to five notes.
Only relevant hand controls are shown. A five-note total target can be split
between hands under those caps. Textures with a moving single note can produce
fewer notes than a nominal minimum. A narrow range, spelling collisions or
harmonic vocabulary can also reduce feasible density. If no target can be
formed, the app asks for adjustment; it does not silently extend the range.

Maximum hand span offers Fifth, Octave, Tenth and Two octaves. These are pitch
distance bounds for each hand’s selected notes, not assurances that a chord is
comfortable for a particular player. Choose a comfortable span and lower density
first. Two octaves is a generous permitted region, not advice to stretch one
hand physically across two octaves.

Left hand leap and Right hand leap offer Unrestricted, Whole tone, Fourth,
Octave or Two octaves. They limit movement between successive hand voicings by
nearest-voice distances in both directions. They do not track fingers. A small
leap choice can make a reading drill smoother, but combined with a remote chord
family and narrow range it can make the constraints impossible. If so, loosen
the leap or range rather than repeatedly pressing a target that cannot exist.

For ninth-chord practice, a five-tone vocabulary needs room to be represented.
Allow five total notes and sufficient per-hand density. A tenth or larger span,
or distribution over both hands, may be needed to retain the full shape.
Otherwise a reduced selection is an exercise within limits, not proof that the
named chord family always has fewer tones.

With generated material these settings compose a suitable exercise. With a
piece or study the corresponding limits reduce existing notes. That distinction
explains why changing the same control can result in a newly generated chord
in one source and omitted notes or rests in another.

## 9. Harmonic sources, textures and attack groups

Diatonic chords chooses scale-degree harmonies within the selected major or
relative natural-minor scale. Chord vocabulary chooses Triads or Diatonic
sevenths. It is a useful move away from unrelated random clusters while keeping
new voicings to read. Cadence constrains harmony order, with Cadence sequence
offering I–IV–V–I, ii–V–I and I–vi–ii–V in major. Labels adapt to minor and to
seventh vocabulary. In natural minor the ordinary diatonic dominant is minor;
do not narrate every minor cadence as harmonic minor.

Advanced harmony uses authored chromatic functions. Advanced vocabulary offers
Secondary dominant, Leading-tone diminished seventh, Borrowed minor subdominant,
German augmented sixth, Extended ii9–V9–Imaj9, ii7–V7-flat-9–I, and Quartal planing.
Some labels adapt in minor, including half-diminished and altered dominant forms.
Functional dominants in minor use the authored raised leading tone. Written
spellings, including double accidentals in remote signatures, are part of the
exercise rather than accidental display errors.

Harmonic sources determine pitch content, so Pitch material is inactive there.
Changing a chromatic preference is not the way to override a secondary dominant’s
functional spelling. Change Source if the goal is arbitrary chromatic reading.

Texture provides five different reading organisations:

1. **Block chords:** read each simultaneous group as a whole.
2. **Melody with chords:** a moving note in the upper hand against lower chord
   attacks in two-hand practice.
3. **Bass with chords:** a moving bass note against upper chord attacks.
4. **Broken chords:** the moving pattern is low–middle–high–middle.
5. **Alberti bass:** the moving pattern is low–high–middle–high.

Single-hand moving textures use a single moving note. In the two broken-pattern
textures one harmony lasts four targets. A phrase length of four is therefore
four attacks, not four harmonies. For a complete four-harmony cycle in a broken
texture, sixteen targets is a natural choice. Repeat lengths that cut a cycle
are allowed, but do not promise a complete cadence at their boundary.

Attack pattern, available for both hands, supplies Hands together, Alternate
hands, Right twice per left attack, and Right three per two left attacks. These
specify attack order. The two-to-one group starts with both hands, then right;
the three-to-two group uses both, right, left, right. They do not impose equal
time intervals, notate a polyrhythm or require a voice to stay held through the
other hand’s attack. Every displayed note is a new attack. Demonstrate Hands
together with Block chords when the goal is a fully voiced simultaneous harmony.

Choose Phrase length from 1–32 targets for generated Repeat or Stop at end.
The menu provides selected lengths within that range. Continuous disables this
control because it keeps supplying material; it retains the previous repeat
length for a return to Repeat. There are no redundant manual Repeat phrase or
New phrase buttons. Changing musical-generation settings starts new material;
release held keys before attempting it.

## 10. Three concrete generated-session recipes

**Single-note bass recognition.** Use Pitch practice, Random pitches, Bass ·
left hand, C major / A minor, Notes in key, Near middle C, both chord-size bounds
at one, Fluid and Continuous. Keep targets and names hidden. If recognition is
slow, pause, reveal the name briefly, then resume with fresh notes. After a few
minutes try Wider staff range without changing key or density. This makes the
new challenge specifically one of staff position.

**Triads without a memory loop.** Use Diatonic chords, Major, Triads, Block chords,
a comfortable one-hand range, three-note bounds and an octave span. Begin in
Repeat with a short phrase. Recognise thirds and fifths as shapes, then switch
to Continuous. If the constraints produce fewer notes, widen the appropriate
range or use Both hands rather than claiming every target will contain a full
root-position triad. Inversions and selected voicings are reading material too.

**Chromatic harmonic literacy.** Choose Advanced harmony, a familiar Key and
Secondary dominant or Borrowed minor subdominant. Begin with Block chords and
Hands together, modest density and enough range. Read the altered letters before
playing. Move to German augmented sixth or diminished sevenths only after the
notation is comfortable. When changing to a remote key, expect legitimate double
accidentals; use note names to check the written identity, not to erase it.

These are recommendations for arranging practice, not preset lesson buttons.
The application does not automatically advance a syllabus or diagnose technique.

## 11. Library browsing and the preview/active distinction

Music library is below the settings. Search accepts title, composer or opus;
accent and common opus-spacing differences are tolerated. Composer, Era, Style
and Difficulty narrow the catalogue. Piece selects a candidate; Load piece
opens it. Random piece loads a choice from the current filtered set. If no
choices remain, broaden the search and filters. All current difficulty entries
are Unrated; do not invent examination grades from the file or title.

The included editions cover Bach, Chopin, Beethoven, Haydn, Handel, Schumann,
Clementi, Rachmaninoff, Burgmüller, Satie and Joplin. Describe reading demands,
not unverified pedagogical levels. La Candeur has melody and sustained chords;
Arabesque has quicker passagework; Gymnopédie No. 1 has slow melody and wider
bass-to-chord movement; The Entertainer brings syncopation and ragtime leaps.
The extent to which those durations survive matters in Passage study, whereas
the pitch outline initially isolates their new attacks.

Edition and licence opens the source/credit information. The bundled musical
editions have separate redistribution terms; the application’s GPL is not a
blanket statement about every music asset. A spoken tutorial needs only a short
acknowledgement and a pointer to the provided credits, not a licence lecture.

Recent pieces remembers up to twenty bundled choices by catalogue identity and
checksum. Selecting one reopens a preview and clears browsing filters so that
old search restrictions do not hide it. Clear recent removes that convenience
list without clearing attempt history or saved passages. It does not remember
private file paths or automatically reopen a local file from disk.

Loading is deliberately separate from activation. If the player is practising
a Chopin window and loads a Bach preview, the staff can remain on Chopin. The
heading is the authority for active practice; the lower preview describes the
candidate source. Source listening uses the preview selection, so a listener
can audition Bach while the pitch exercise still identifies Chopin.

Selecting a Suggested section, editing First attack or Last attack, changing
track inclusion/staff assignment, or selecting a Saved passage activates the
new selection automatically. Start practising this passage activates it explicitly
without requiring an endpoint change. This is a useful button to demonstrate
after simply loading a file. Do not tell users that every subsequent endpoint
edit requires another press of it.

## 12. Attack endpoints, tracks, keys and reductions

MIDI First attack and Last attack are one-based source-onset group numbers.
Several notes beginning at one source tick form one group. They are not bar
numbers, seconds, beats or a count of filtered targets. A passage can contain
up to 512 selected source onsets. After filtering, some attack groups may disappear,
so a window of eight source attacks need not yield eight displayed targets.

Suggested section proposes ranges using available markers, gaps and meter
boundaries. Its reason is shown. Treat it as a useful starting cut; it is not
an editor’s recovered phrase analysis. Use a small range first, listen, adjust
endpoints, and give the useful cut a memorable name.

The track list shows source names and piano-attack counts. Include the relevant
tracks and exclude unwanted accompaniment. Tracks with no playable piano attacks
are unavailable. MIDI percussion channel ten is excluded from piano outlines.
Track names are source text, not guaranteed hand labels. One MIDI track can
contain both hands; several tracks can belong to one part.

Each playable track offers Infer from middle C, Treble or Bass. Inference uses
pitch rather than recovering a printed staff. Use explicit assignment if a known
line crosses middle C or inference makes the reading unhelpful. Staff assignment
and Staff / hand filtering interact: explicitly assigning a track to Bass makes
it a bass/left candidate, but does not override physical or reading-range filters.

Key follows a passage’s opening MIDI signature when it is started. If none is
present, the app only adopts a pitch-profile estimate when confidence is strong;
otherwise the current selection remains. This estimate uses local evidence and
does not identify the private piece online. Loading a preview alone does not
change the active key. Later source key markers can be reported, but the untimed
pitch outline uses a single selected signature throughout. The player can select
another Key manually. MIDI study can use supplied key changes in its derived
notation; authored studies retain their written signatures.

For a piece, shared filters select and reduce source pitches. They do not compose
new replacement notes, shift the piece into another key, or rewrite the file.
Reduction prioritises the highest note, then the bass, then inner notes, while
respecting hand, span, leap, density, pitch and ledger constraints. A maximum of
one can therefore retain melody rather than an evenly distributed miniature
of the original texture. Review what is omitted before judging your reading.

The preview reports target count and source notes retained/omitted. A large
omission count is often explained by a single-hand filter, Notes in key during
a chromatic passage, a narrow reading range, or the default low chord maximum.
Diagnose in that order, then check per-hand density/span/leap/ledger constraints.
Physical endpoints are another independent limit. If nothing survives, widen
the appropriate filters and check that a playable track is included.

For a faithful inspection of a comfortable excerpt, select Both hands, All
available notes, chromatic pitch material, enough total/per-hand notes and
generous span/leap/ledger limits. This is a diagnostic configuration, not advice
to play unsafe reaches. For a simpler lesson, deliberately restore comfortable
limits and accept that the displayed selection is reduced.

Minimum generated chord size, generated Phrase length, Texture and Attack pattern
do not add or rearrange missing source notes. In authored studies, complete tied
sounds are retained or removed coherently; timing remains, and omitted sounds
can leave rests. Continuing held voices also occupy the study’s density/span
budget, so fewer new notes may fit than a new-attack-only count would suggest.

## 13. Looping a piece and saving useful passages

Repeat passage in Pitch practice loops the active MIDI window with fresh attacks.
Continue through piece proceeds to following source windows until the file ends;
it does not replay the first window forever or start random generation. The
selected window length supplies the continuing window size, and windows empty
after filtering can be skipped. Stop at end completes only the current selection
and offers Restart passage afterwards. These are progression choices, independent
of how many targets fit on a page.

Save passage stores the current endpoints and track/staff choices with a Passage
name; up to fifty bookmarks are retained in this browser. A useful name describes the source location or task: “opening bass”,
“cadence attacks 30–45”, or “wide leap”. If no name is entered, a range-based
name is available. Saving is a bookmark operation, not a new music file export.

To return later, load the same library edition or exact same local MIDI file,
then select Saved passages. Matching uses file identity, not just a similar
title. A different edition or modified file can have different attack indexing
and will not be treated as the same source simply because its filename matches.
Selecting the saved item restores its endpoints and track choices and activates
it. Current global reading filters still apply. The bookmark does not restore
every Key, range, density, audio and layout setting from the earlier lesson.

Delete saved passage removes the selected bookmark. It does not delete music
from the library or the player’s disk. Clear recent is unrelated. There is no
general passage-bookmark export control to promise here; Export history exports
attempt records, not every piece of browser state.

To return to generation, choose Pitch practice and Source → Random pitches,
Diatonic chords, Cadence or Advanced harmony. The loaded MIDI can remain available
as Local MIDI outline. Avoid inventing a separate “return to random” shortcut.

## 14. Local MIDI import and what can be heard or exported

Choose MIDI file opens a local .mid or .midi file. MIDI formats zero and one with
ticks-per-quarter timing are supported within bounded import limits; an audio
recording, PDF or compressed download is not a MIDI file. Extract a downloaded
ZIP first. The current MIDI size limit is 256,000 bytes, labelled 256 KB, with
up to 64 tracks and 25,000 events. Invalid data or unsupported timing produces
a message instead of an imported exercise.

The browser sends the file only to the server running on this computer for
inspection. It is not published, inserted into the shared music catalogue or
saved as a private project. Source note events, tick positions, tracks, channels,
velocities, controllers, tempo, meter/key messages and a source hash remain
available in the inspection. Warnings can report missing releases or ambiguous
repeated notes. An outline may still be useful for attacks when duration-aware
study cannot honestly be derived.

Download MIDI data (JSON) saves this inspection. It is useful when investigating
source data or sharing an issue; it is not sheet music, a new MIDI performance,
an audio recording or a saved practice session. There is no corresponding promise
that selecting this JSON in Choose MIDI file will reload it. Keep the original
MIDI file for another visit.

Play source passage listens to the preview’s selected tracks and source range
with original timing, tempo changes and pedal where available. It uses Target
instrument and Target volume, not Live instrument. Practice pitch reductions
are not a promise that source listening will be reduced to the same notes;
source listening is the reference performance for the selected source tracks.

Playback speed offers 25%, 50%, 75%, 100%, 125%, 150% and 200%. This scales
timing without transposing pitches. Pause retains a listening position; the play
action becomes Resume passage. Stop playback resets that listening transport.
Changing the passage or its source-playback timing options stops the current
playback so the old scheduling does not continue against new choices. Notes
already sounding at the selection’s entry can be resumed, and notes are cut at
its exit. A resumed tone uses a fresh sound envelope/sample rather than a
recording spliced seamlessly through the pause. Target sound uses the selected
application instrument; source program/bank changes, pitch bends and other
expressive controllers are retained as data rather than fully reproduced.
Passages above 128 simultaneous playback voices report a limit instead of
overloading the instrument; shorten the cut or exclude tracks in that case.

Click with source playback aligns a click to source beats. Source count-in offers
None, one bar or two bars; it belongs to source-aligned clicking, so enable the
click checkbox when demonstrating it. Pause/resume does not add another
count-in. These clicks use the Metronome card’s Click volume. Compound meter such as 6/8 uses dotted
beats. Source MIDI does not necessarily contain a printed pickup or an irregular
grouping such as 2+3, so do not infer those facts just because a click is audible.
Standalone metronome settings are a different practice clock.

Source listening is independent of the untimed pitch cursor. It does not enter
MIDI answers or automatically move the user through correct targets. For a clear
lesson, pause pitch progression while listening, then stop the reference and
resume playing. Actual key feedback remains useful while paused.

## 15. Passage study: choosing the right source

Passage study shares the playing surface but replaces the pitch-generation setup
with study controls. Its Source menu includes:

- **Loaded MIDI passage:** the active, started MIDI selection, not merely the
  most recently browsed preview.
- **Imported MusicXML:** a successfully imported notation source for this visit.
- **La Candeur · verified bars 1–4:** a verified pitch/rhythm excerpt, including
  a tied bass chord. Fingering, expression and repeats are outside that excerpt.
- **Independent voices · original study:** a short original example for learning
  independent holds, attacks and rests.
- **Notation and continuity · original study:** a longer example covering varied
  notation, cross-staff/unison cases, tuplets, signatures, clefs and ties.
- **Meter and beat groups · original study:** a six-bar example with a pickup,
  compound meter, contrasting 2+3 and 3+2 groups in 5/8, and a short middle bar.
- **Gradual tempo · original study:** an example of acceleration and slowing.

Loaded MIDI passage is unavailable until a MIDI passage has been activated.
Imported MusicXML is unavailable until import succeeds. Source selection is
therefore a meaningful state indicator rather than a list of empty promised
features. Choosing a built-in study does not require downloading music.

For a study derived from a piece: load the piece, choose tracks/endpoints, use
Start practising this passage if necessary, then switch to Passage study. Its
source becomes Loaded MIDI passage. For an original or verified excerpt: switch
to Passage study, choose the named source, and check shared filters before
assuming every voice is visible. A right-hand-only setting from earlier pitch
practice can reduce the study too.

The passage-study buttons sit directly under the staff. Practise passage begins
the patient matcher. Play study hears the study notation. They are different
actions; listening does not start the practice gate. There is no need to
reconnect MIDI or create another audio setup between them.

## 16. Patient duration practice, explained through voices

Select a simple study and choose Practise passage. Entry asks for release of
keys and pedal so old holds do not supply the opening. Play the required attacks.
When the state is correct, the duration until the next musical event begins to
run. If a note releases too early or an extra physical key is pressed, the
remaining time waits until the state is corrected. The application does not let
the rest of the piece run away while the pianist finds the next event.

Suppose the bass has a long C while the melody moves through E and F. Press the
initial C and E, hold the bass through the melody change, release E when its
duration ends, and attack F freshly. The long bass belongs to a continuing voice;
it should not be restruck at every melody event. Conversely, a genuinely repeated
C written as a new attack requires a new press. This is where study differs
fundamentally from an untimed outline in which each retained source note-on is
a fresh target attack.

A rest belongs to its voice. If the melody rests while the bass continues, release
the melody and keep the bass supported under the chosen continuity policy. A
rest is not necessarily a global demand to release every key. For an all-voice
rest, physical silence is the required state and the rest’s duration still matters.

Feedback may ask Play followed by missing notes, Hold again after a short hold,
or Release extra keys. A correct ongoing state can show a tick and Hold. Short
holds and Extra notes counters describe corrections in the current study practice.
They are not onset-lateness scores or the pitch-practice history charts.

The important time distinction is between an unhurried arrival and a written
hold. The player can need extra time to find the next attack. Once established,
its duration should be maintained. Slowing Speed gives more time in each correct
duration; it does not turn wrong notes into correct notes or remove ties.

Continuity offers Finger held and Pedal supported. Finger held requires physical
key continuity for continuing sounds. Pedal supported also accepts a previously
attacked note sustained by the relevant input/channel. Pedal can support an
established note but cannot create the required opening or repeated attack.
Choose Finger held when practising finger legato and independent holds; choose
Pedal supported when deliberate pedal support is appropriate to the task.

MIDI sees pitches, not fingers. Simultaneous unisons can share one observable
press. A repeat against a held unison requires a fresh press, but the software
cannot prove which hand or finger supplied it. Do not present the feedback as
an assessment of a particular fingering. Half-pedal, sostenuto, soft pedal,
expressive velocity assessment and an onset score are not part of this practice.

## 17. Study speed, tempo, cuts and transport

Speed offers 50%, 75%, 100%, 150% and 200%. Tempo → Score tempo follows authored
tempo changes, including gradual changes where the study supplies them. Steady
tempo uses the opening quarter-note tempo throughout. Speed scales either
choice. Written tempo markings remain visible in Steady tempo; their presence
does not mean the practice clock is following them in that mode.

For the Gradual tempo example, first listen with Score tempo and notice the
change, then choose Steady tempo and listen again. Choose 50% for an exploratory
practice run. The Metronome card’s Tempo field is not a substitute for these
settings, and the MIDI Playback speed selector below does not set study speed.

Entry beat and Exit beat select a cut using quarter-note beats counted from
zero. The menus show available event positions, including rational values where
needed. These are not bar numbers and are not the conducted beats of every
meter. For instance, a complete 6/8 measure occupies three quarter-note units,
although it is commonly felt as two dotted-quarter pulses. A pickup or short
measure changes where the next measure starts; count from the study’s actual
timeline rather than multiplying every displayed bar by a fixed length.

The entry is included; new attacks at the exit are excluded. Choose a boundary
after the intended material. A cut beginning in the middle of an existing tie
requires a fresh attack of that continuing note on entry so its sound can be
established. That deliberate loop-entry articulation is not an assertion that
the original full score has a new attack at that location.

Loop passage starts on and is remembered. In practice, completing the cut waits
for release of keys and pedal before looping with fresh attacks. In listening,
the selected cut loops on the audio clock. Uncheck Loop passage for one traversal.
The study’s loop control is separate from the Repeat/Continuous/Stop choices
used by pitch practice.

Position selects a study moment for inspection; clicking a written note can also
select its position. Seeking stops the current activity so a selection is not
silently treated as already played. Entry/Exit define the practice cut: choose
them when the intent is to practise a smaller segment. Practise passage begins
that cut rather than treating a casual inspection selection as a new stored loop.

The transport actions have different uses:

- **Practise passage:** begins patient practice of the selected cut.
- **Pause** in the top playing toolbar: pauses practice; **Resume** requires
  release and fresh attacks and restarts the current position’s duration.
- **Stop study:** stops activity and returns to Entry beat.
- **Play study:** starts listening from the current applicable position, or
  starts again after the end; becomes **Resume study** after a playback pause.
- **Pause playback:** retains the listening position.
- **Rewind:** returns to Entry beat; if listening was running, it continues
  listening from there.

Changing study timing/cut/continuity options stops the current activity. Choose
the desired action again after editing. Resizing the panel or changing Bars per
line is a display operation and preserves the study cursor/gate. Backgrounding
or losing the device pauses safely; a return is not a way to earn credit from
keys already held.

## 18. Derived MIDI notation versus authored notation

MIDI primarily records performance events. It does not reliably contain the
printed spelling, voice allocation, beaming, fingering or edition layout.
Loaded MIDI passage in study derives notation on a 1/32-note grid. It uses
supplied meter, key and tempo changes where available; without meter metadata,
4/4 is a notation default, not a discovered fact about a lost printed score.

Coincident notes with matching releases can form chords. Different durations
can become independent lanes. A source note spanning a bar can be split with
ties into written segments of that single sound. Separate note-on events remain
separate attacks; the app does not merge them into a held note merely because
their pitches match. Source pedal can sound beyond a notated finger duration.

The player can compare three useful things: the untimed outline to learn attacks,
source listening to hear original performance timing/pedal, and study notation
to practise the derived holds and voices. Play study hears the derived notation
and selected study cut; Play source passage hears the preview’s source timing.
They need not sound identical after grid rounding, filtering or a different cut.
Starting either listening route stops the other reference scheduler.

Derivation preserves source IDs and raw ticks for traceability, but its written
choices remain derived. Do not call them the original edition. The verified
La Candeur excerpt and a supported MusicXML import have a different provenance:
they explicitly supply notation. Even then, omitted expression or unsupported
notation must not be filled in from imagination.

The MIDI study has bounds of 512 selected attacks, 1,024 retained notes, sixteen
simultaneous notation lanes and 256 measures within the model’s limits. Missing
source releases or attacks too close to remain distinct on the grid can make a
study unavailable. In that case, use the diagnostic: try a shorter suitable
passage or use pitch practice. Do not tell the user to keep retrying until the
software invents a duration or combines separate attacks.

## 19. MusicXML as a local notation source

Import MusicXML in Passage study accepts local UTF-8, uncompressed .musicxml or
.xml, with a practical advertised limit of 256 KB. The parser’s byte cap is
256,000, so keep close-to-limit files below that value. It supports one two-staff
piano part, written pitches, ordinary voices/chords, whole through thirty-second
notes, up to two dots, rests and ties. Export without a DOCTYPE declaration.
Compressed .mxl is not the accepted input format.

Unsupported tuplets, grace notes and repeats are rejected with a diagnostic.
The fact that an original built-in study can demonstrate tuplets does not imply
that the current MusicXML importer accepts them. Expression annotations that
cannot be rendered or judged are disclosed; original XML remains available in
memory for the visit. Do not narrate unrendered fingering, dynamics or repeats
as if they were part of the active practice contract.

A successful import selects Imported MusicXML as study source. Shared filters
can reduce it while preserving authored spelling, timing and complete ties.
Changing Key under Notes in key filters retained pitches; it does not transpose
the notation into that key. When the goal is to inspect the full notation, use
chromatic material and broad enough range/density limits rather than treating
the current global key as a transposition command.

A failed import leaves the existing study intact. Read the import message and
correct the format or choose another file. Imports stay in memory for this visit,
are not saved as browser music documents, and are not added to the public library.
Keep the source file and import it again next time. Selecting another built-in
source is the ordinary way to return to those examples.

## 20. Sound paths and choosing a listening setup

Sound my playing enables local audio for actual MIDI or on-screen input. It
starts off each visit. If a digital piano already produces sound, leaving this
off avoids hearing both the instrument and browser piano with different delays
or timbres. A silent controller needs an enabled sound route or external sound
source; successful pitch feedback does not depend on audible sound.

Live instrument and Live volume affect the user’s local playing sound. Target
sound, Target instrument and Target volume affect Hear target and the source/
study reference path. Both paths offer Piano synth, Acoustic grand piano and
Organ synth. One path can use organ and the other piano. MIDI velocity affects
attack strength, but the application is not grading expressive velocity.

Hear live instrument auditions the current target with Live instrument and Live
volume. It does not toggle Sound my playing. Hear target auditions with the
Target path and needs Target sound enabled. If there are no current target notes,
the audition can use a C-major chord. Do not call an audition an automatic correct
answer or a recording of the player.

Acoustic grand piano uses locally bundled Salamander recordings of a Yamaha C5.
First use can show a loading message; it is loading from the local application,
not downloading the pianist’s playing. The available single sampled velocity
layer is volume-scaled with input velocity; do not promise multiple recorded
dynamic layers. Sound credits contains attribution and licence links. The synth
options are useful alternatives when the acoustic route is unavailable.

Browser audio begins through a click/tap or another user activation. If sound
is suspended, click an audition or enable the intended route and check the sound
status. Then check the path’s volume, system output and headphones. MIDI permission
and audio activation solve different problems.

Stop sound is the broad audio panic: it stops reference sound, live sound and
metronome activity and disables live sound. It does not change a played wrong
note into a correct one or reset the physical instrument. Clear held keys is
the input-state recovery control. Use the one corresponding to the problem,
or both when necessary, after releasing the physical keys.

Moving away from the page stops sound safely. Live sound and the metronome do
not restart themselves on a new visit just because their instrument/tempo
preferences were remembered. Check switches when returning. Avoid promising a
particular real-device input-to-sound or input-to-paint latency; these guides
did not measure a physical piano.

## 21. Metronome, source clicks and musical timing choices

The Metronome card supplies a standalone on/off checkbox, Tempo from 30–240 BPM,
Beats per bar choices of 2, 3, 4 or 6, and Click volume. It is useful for setting
one’s own reading pulse. Targets in pitch practice still wait when the player
misses that pulse. Turning on a click does not switch to a timed scoring mode.

Beats per bar controls the standalone accent cycle, not the written meter of a
piece. For source listening, Click with source playback follows the source beat
map and Source count-in belongs to that playback. For study, Score tempo/Steady
tempo and Speed govern the notated timeline. Demonstrate these separately so
the listener can locate the correct tempo control without memorising internals.

Source-aligned clicks replace a conflicting standalone click while that listening
is active. Do not deliberately stack clocks to teach rhythm. For a clear first
lesson, leave the standalone metronome off, listen at a slower source or study
speed, then practise. Later use a comfortable standalone pulse in pitch practice
as a voluntary goal, recognising that the application is not marking early or
late attacks there.

## 22. Layout, reading space and accessibility

Workspace → Layout offers Automatic, 720p, 1080p, 1440p, 2160p and Custom.
Automatic responds to actual browser height. Resolution choices budget for
browser/desktop chrome and still respect the available viewport; they do not
change the computer’s monitor resolution. The 720p layout uses smaller notation.
Use a lower preset if a laptop cannot comfortably show staff and keyboard together.

The staff pane reserves space; distant ledger notation can scroll inside it.
Feedback and activity rows have reserved room so a new message should not push
the keyboard down during playing. Settings remain centered below the playing
canvas even when panels are spread across a wide screen.

Scale above the staff offers 40%–160%. Moving the dotted grip above a panel
changes its position; dragging its lower-right corner resizes it. Keyboard
resizing changes key height. Keyboard key size separately sets width: Automatic,
Large 36 px, Medium 28 px or Small 20 px. Fixed widths can require horizontal
keyboard scrolling. Automatic aims to fit a normal full-size instrument in a
desktop width; a full MIDI 0–127 display can still need scrolling. Touch layouts
preserve usable key targets rather than making every key microscopic.

Moving/resizing/scaling selects Custom and remembers the arrangement. Focused
grips/corners accept arrow keys; Shift makes larger adjustments. A smaller window
fits panels within reach without overwriting the saved larger-window geometry.
Choose a preset for a regular layout again; choose Custom to recover the saved
custom arrangement. These operations preserve practice position and actual held
feedback rather than creating a fresh exercise.

Passage study has Bars per line beside Scale: Automatic or one through four.
Choose one for dense polyphony or accidentals. This reflows engraving without
restarting the duration gate. It does not alter the loop boundaries or number
of source attacks. For distant notes, allow vertical room before shrinking
notation so far that the reading task becomes one of eyesight.

Dark mode toggles the page palette and is remembered. Invert keyboard colours
independently swaps the piano’s key backgrounds and is remembered. A dark page
can use conventional keys. Show targets is independent of both. Illustrate
symbols and patterned sustain in an accessible tutorial, not just “the green
one” or “the red one”. The user should be able to interpret correctness without
relying on red/green discrimination.

## 23. Pause, completion and ordinary session interruptions

In Pitch practice, Pause stops progression and response-time measurement but
leaves actual keys visible and, when enabled, audible. Resume requires fresh
articulation; it is not a way to hold a chord while paused and gain credit at
the button press. Pause is session state, not a remembered preference.

Stop at end means finish the selected phrase/window once. It is not an audio
panic or an instruction to discard the exercise immediately. After completion,
Restart passage is available. In Repeat and Continuous, automatic progression
removes the need for manual new-phrase controls.

In study, Stop study returns to the cut’s entry, and Pause/Resume has the
duration/re-entry behaviour described earlier. Keep the two Pause buttons in a
source listening area and the practice toolbar distinct when narrating: one
pauses playback, the other pauses the practice task.

When backgrounding, changing input devices or reconnecting, release the real
keys and pedal before re-entering. Do not rely on state held through a window
switch. If on-screen state is stuck, Clear held keys resets the app’s input
state, but the player should still physically release and restrike rather than
expect a pedal or a stale device message to fix articulation.

Help near Connect MIDI, or Help & guide near Music library, opens local help in
a separate tab. On narrow screens the top link may be a question mark. The help
page has its own light/theme action and an × close action. It does not initialise
a second MIDI/audio app or reset the practice session. Returning to the existing
practice tab is preferable to starting another practice page just to read help.
Window-focus safety still applies on returning to playing.

## 24. Reading progress: what each measurement means

Progress in Pitch practice records completed pitch targets. Targets is the
retained attempt count, not the count of individual chord tones. Average response
is the arithmetic mean. Median response is the middle of the observed times and
is less dominated by a few long waits. 90% within is the slower-tail threshold:
nine in ten recorded responses were at least that fast. First-attempt accuracy
is the fraction of targets completed without a wrong extra pitch, not a grade
for hitting every chord finger at exactly the same moment.

Response timing starts when the target becomes active and ends at the first
correct physical pitch set. Release-mode confirmation and release waiting are
excluded. Paused/background time, endpoint learning and MIDI-reconnection waits
are excluded. Staggered correct chord fingers are allowed; wrong physical pitches
affect accuracy. This is a reading-response measurement, not a latency benchmark
or a recording of a fluent timed performance.

Best for this target compares a clean completion with comparable target/settings
and the relevant repeat-phrase or MIDI context. Changing key, density, range or
source can make a different comparison. Display changes do not make harder
music easier in the measurement identity, but switching musical material does.
Treat the overall summary as a record of what was attempted; a mixture of easy
and hard exercises is not a controlled before/after comparison.

Daily graphs show median response times. Daily measurements (UTC) expands exact
daily rows, grouped by UTC date. Clear today, in contrast, uses the player’s local
calendar day. Around midnight those boundaries can differ without data loss.
The daily display covers recent days with data, not a promise of a year-long
unbounded training diary.

Breakdown chooses Hand, Key, Note, Staff position or Accidental. The latter
note-level analyses use single-note targets, so a wrong chord is not arbitrarily
blamed on a particular finger or chord tone. Staff-position groups distinguish
on-staff and ledger/space positions. Accidental groups concern written spelling;
a note affected by a key signature is not the same pedagogical question as an
arbitrary black-key pattern.

Reading patterns surfaces repeated corrections only after enough comparable
single-note attempts: at least eight for a note with three or more corrected
targets. Slower-response flags need broader evidence, including at least three
different notes and twenty-four matching-context attempts, before comparison
with that exercise’s baseline. The visible counts explain why a new session may
show no patterns. Do not call the empty state a failure to analyse or claim a
few mistakes reveal a neurological or technical problem.

Use a pattern as a practice question. If one bass ledger note repeatedly needs
correction, return to a manageable bass reading range, try fresh notes and check
the written octave. Do not automatically prescribe a finger exercise based on
pitch recognition statistics. Study short-hold/extra counters remain separate;
the application is not putting a rhythm examination into these pitch charts.

## 25. History saving, backup, clearing and browser boundaries

Attempts are session-only unless Save history locally is checked. With it
enabled, the browser stores up to 1,000 attempts, saving periodically during
playing and when leaving/refreshing. It is sensible to enable it early if the
player wants continuity across visits. Browser storage can fail or be restricted;
the app reports that while allowing session practice to continue.

Unchecking Save history locally stops future automatic saving. It does not
erase records already saved. Use the clearing actions when deletion is intended.
Clear last hour removes recent attempts in that moving period. Clear today
removes attempts since local midnight. Clear all removes the retained history.
These actions are immediate controls, so export first if the records matter.
They do not remove private MIDI files or saved passage bookmarks.

Export history downloads the application’s JSON history file. Import history
chooses a previous export, validates it and merges without duplicating attempts.
Invalid data, an oversized file above 16 MB or an over-limit import is rejected
without replacing valid current history. It is not a generic CSV import. Imported
records stay subject to the retained-history bound; do not sell this as an
unlimited archival database.

History export is a useful backup and a way to move attempts between browser
profiles. It does not package private music, layouts, sounds, recent pieces or
passage bookmarks into one portable project. Keep original source files and
write down an important practice recipe separately if needed.

Settings and saved records are scoped to the browser profile and local origin,
including port. The usual launcher uses 127.0.0.1:8767; manually starting the
server at its default 8766 is a different origin. A different browser, private
window, hostname spelling or port can appear to have fresh settings. Return to
the previous address/profile before concluding data vanished. Clearing browser
site data can remove remembered preferences and records; history exports remain
ordinary files under the player’s control.

The app remembers many exercise/display/audio preferences, theme, inversion,
target visibility, layout, keyboard sizing, study bars-per-line, study loop and
tempo-mode choices, passage bookmarks, recent library identities and opted-in
history. Do not promise that every transient control is remembered: live audio,
metronome activity, pause state, the current generated sequence, private file
contents, current imports and all study cut/speed/position choices are not a
saved rehearsal project. On return, expect to reload private files and select
the intended passage/study rather than resuming a recorded performance exactly.

## 26. Recommended repertoire workflow, from notes to voices

First set a comfortable instrument range and turn browser live sound off if
the piano already sounds. Choose a short bundled excerpt or local MIDI. Load it,
select a section, check tracks and assign staves where helpful. Start with one
hand and a small source attack range. Listen to the original passage once at a
slower source Playback speed to establish the phrase.

Use Repeat passage in Pitch practice to learn the attacks. Keep the target aid
off initially; reveal it only for a specific uncertainty. Attend to repeated
pitches: every source note-on needs a new press. If the passage is simplified,
read the retained/omitted count and decide whether the reduction addresses the
lesson. Do not mistake completing a reduced melody outline for playing the
whole original two-hand texture.

Restore more notes gradually, perhaps add the other hand, then activate the
same passage and choose Passage study. Inspect whether the MIDI derivation is
usable. Set a smaller beat cut if needed. Listen with Play study, then practise
at 50% or 75%, first with Finger held to understand independent durations.
Use Pedal supported only where intended. Keep observing which notes attack,
which continue and which must release.

Save the MIDI passage with a meaningful name. The bookmark does not encode
every current reduction or study cut, so note an essential recipe elsewhere.
On a later visit reload the same source, restore the bookmark and recheck filters.
To assess transfer, finish with a fresh generated exercise in the troublesome
key/range rather than replaying the memorised excerpt indefinitely.

For narration, this workflow supplies a natural progression: learn where the
notes are, learn the combinations, then coordinate independent durations. It
does not imply the app renders a complete authoritative edition or replaces
playing from a score outside the tool.

## 27. Troubleshooting by observation

**No connection action succeeds.** Check that the page is running from the
local server and the browser supports Web MIDI. Use Chrome/Edge, grant site
permission and retry. An unsupported browser is not repaired by changing sound
instruments. If permission was denied, adjust that site permission in the
browser; do not ask the pianist to reinstall music files.

**Device exists but nothing lights up.** Check Input and last-note activity.
Reconnect the cable or power the device as appropriate, refresh MIDI and close
another application that may own the port. Read opening errors. A listed input
is not proof that notes are arriving.

**Notes light but targets do not complete.** Identify the view. In pitch practice,
check exact octave, extra keys, a shared pitch that has not been reattacked,
Pause, or completed Stop at end. In study, check the requested release, continuing
voice and continuity policy. Do not use pedal as a substitute for a fresh press.

**A different piece seems to be playing than is shown.** Compare the active
staff heading with the loaded preview. Source listening follows the preview;
active practice can still be an earlier selection. Activate the intended passage
or stop listening and return to the correct active source.

**A piece has few or no notes.** Check included tracks, hand, current Key with
Notes in key, physical endpoints, Reading range, total/per-hand density, span,
leaps and ledger limits. Look at retained/omitted counts. Set generous eligible
filters as a diagnostic, then reduce deliberately. A filter is not an instrument
transposition or a missing-file repair.

**A study is unavailable while the outline works.** Read the reason. The source
may lack releases or contain attacks too close for the study grid, or the selected
window may exceed bounds. Use a shorter suitable section, an explicit notation
source or the untimed outline. The problem is not cured by treating all same-pitch
attacks as ties.

**Sound is silent or doubled.** Check Sound my playing versus Target sound and
their independent volumes. Click an audition to activate audio, check the output
device and allow local samples to load. If the hardware piano and browser both
sound, disable browser live audio if one sound is preferred. Stop sound handles
stuck application audio; Clear held keys handles stale input display.

**Controls vanish or appear changed.** Check the active view, source and hand.
Source-specific fields are hidden when inapplicable. If all preferences look
new, check browser/profile/address/port. If notation is still the old exercise
after loading a piece, activate the preview. These are distinct situations.

**The screen is cramped.** Use Automatic or a smaller-height preset, adjust
Scale and key width, or restore a sensible preset from an awkward Custom layout.
Use one bar per line in study. Scrolling the page reaches settings; scrolling
inside the staff reaches extreme notation. Changing these display choices does
not require throwing away current practice progress.

**History appears empty.** Confirm saving was enabled, the correct origin/profile
is open, and whether the user changed to Passage study, where pitch Progress is
hidden. Import a history export if one exists. A saved passage and a remembered
piece are not stored attempts. Never promise recovery of browser data that was
cleared without a backup.

## 28. Finding more music and understanding the supporting links

The bundled library is immediately usable offline. Finding additional editions
is an optional activity. The README’s Finding your own music section documents
the discovery helper and exact commands. It searches online metadata and writes
a local shortlist; it needs internet access for that search, whereas ordinary
playing with installed assets does not. A narrator should not describe the helper
as an in-app download button or a service that automatically expands the library.

The user opens the shortlist, chooses an edition, visits its source page and
downloads the particular MIDI asset manually. Check the edition and asset terms,
not just whether the composer’s music is old. The default discovery policy
shortlists explicit public-domain/CC0 editions; including CC BY-SA 4.0 editions
is an explicit option with attribution/share-alike obligations. Keep source links
and credits with any redistributed music.

After downloading, extract a ZIP if necessary and open the desired movement’s
.mid/.midi through Choose MIDI file. Review warnings, tracks and the proposed
attack range, then activate the passage. That file follows exactly the same
private-file, filtering, listening, study and bookmark workflow as another local
MIDI file. Discovery does not download, ingest, persist or publish music for
the user. A saved shortlist is not a saved playable session.

Edition and licence in Music library identifies the selected bundled edition.
Sound credits identifies the acoustic sample source and terms. Help supplies
local operational instructions. The voluntary support link opens the author’s
Buy Me a Coffee page; contributing is optional and does not unlock practice
features. These links have different purposes and none is a prerequisite for
connecting MIDI or practising.

## 29. Suggested structure for an audio or video guide

Open with a pianist at the keyboard, not an installation lecture. Explain the
two practice views, then connect MIDI and show one real key lighting. Teach
physical endpoints and middle-C naming only as much as needed to start safely.
Create an easy four-target right-hand phrase, complete it, and show the automatic
return. Then change to Continuous and explain why fresh material tests reading.

Use a repeated shared pitch to demonstrate fresh articulation. Demonstrate pedal
separately so sustained sound is not mistaken for a held physical key. Show a
correct tick, an extra cross and a direction arrow, including the fact that chord
arrows are conservative suggestions. Reveal a target briefly, then hide it.

Move to a library piece, explain the preview/active distinction with the headings,
choose a short attack window, listen to the source, and activate practice. Show
one deliberate reduction and its note counts. Save the passage and explain how
to restore it next visit. Return to generation through Source so the user knows
how to leave repertoire mode.

Introduce Passage study using a short explicit notation example, then return
to a loaded MIDI derivation to explain the provenance difference. Contrast a
new attack with a tie and a melody rest over a held bass. Demonstrate Finger
held, then Pedal supported. Use a short Entry/Exit cut with Loop passage, and
show the required release at the loop boundary. Keep source and study listening
controls visually distinct.

Close with a comfortable layout, a modest practice routine, and the choice to
save/export history. Explain one useful reading-pattern question rather than
turning the statistics into a competitive score. Mention local privacy, the need
to keep source files, and the same-browser/address rule for returning tomorrow.

For pronunciation, read accidentals as sharp, flat, double sharp and double flat;
read “ii–V–I” as “two, five, one” with major/minor context where relevant. Explain
MIDI once as the instrument’s note messages. Pronounce UI labels clearly and
keep them exact enough to find. In video, use the provided screenshots for
orientation and new live captures for demonstrations of playing. Do not present
the screenshots’ generated pitches as a repeatable lesson sequence.

For freshness checks before generating a later guide, compare visible controls
with templates/index.html and templates/help.html, then use the README for
current file/setup limits. The repository can answer implementation questions;
this document supplies the deeper user journey. Do not turn unimplemented
roadmap ideas into available menu items, rhythm scores, teacher diagnoses,
automatic fingering, microphone following or a cloud account workflow.
