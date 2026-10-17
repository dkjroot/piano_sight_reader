# Piano sight reader

A local piano practice workspace with generated pitch exercises, MIDI passage
practice and written-duration studies, a grand staff, an on-screen keyboard and
live USB MIDI feedback. Practise at your own pace with optional local sound.
Free software under the [GNU GPL](LICENSE).

## Install and run

You need **Python 3.10 or newer** and a browser. For USB MIDI, use Chrome or Edge.
Download or clone this repository. On **Windows**, double-click **start.cmd**.
It creates the private `.venv` environment if needed, installs missing or changed
versions from `requirements.txt`, starts the server and opens your default browser
at **http://127.0.0.1:8767**. The first setup may need internet access for Python
packages; it does not download music. Use Chrome or Edge for USB MIDI.
Keep the launcher window open and press Ctrl+C there to stop the server.
Starting it again reuses this app if it is already running on that port.

On **macOS / Linux**, run `python3 launch.py` from the project folder. The same
launcher options apply. On any platform, `python launch.py --no-browser` prints
the address without opening a browser; `--port 8768` chooses another port.
The launcher reports incomplete environments, install failures and occupied ports;
it never stops an unrelated server or resets your settings/music.

Settings and history belong to the browser and local address/port. Keep using the
same port to keep your existing preferences. The launcher uses 8767, while the
manual server command below defaults to 8766. After updating the app, stop its
old server before restarting so Python changes take effect.

For manual setup, open a terminal in the project folder and run:

**Windows (PowerShell)**

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

**macOS / Linux**

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python app.py
```

Open **http://127.0.0.1:8766** in your browser. Keep the terminal running; press
Ctrl+C to stop. The server is accessible only on your computer. If port 8766 is
already in use, add `--port 8767` to the last command and open that port instead.

For subsequent manual starts, run the last command from the project folder. After
updating the app, repeat the dependency installation command before starting it;
the launcher checks those versions automatically.

There is no front-end build step or Node.js requirement to use the app.
Nothing you play is uploaded; MIDI and practice run locally in your browser.
Use your instrument’s sound or enable the local acoustic piano, piano synth or organ.

The current MVP covers generated untimed practice, selected MIDI attack outlines,
and patient passage study with written durations, rests and ties. MIDI-derived
notation uses a bounded 1/32 grid and inferred spelling/voice lanes; it is not a
recovered printed score. MusicXML has the supported subset described below.
Rhythmic scoring, continuous timed performance and game modes remain future work.

## Connect your piano

1. Plug in your USB MIDI keyboard.
2. Click **Connect MIDI**, allow the browser's MIDI permission, and select its input.
3. Set the **lowest** and **highest** available notes with the sliders, or click each
   **Learn** button and play that physical endpoint on your instrument.

The initial C3–C6 range is just a starting point, not a specification for your
keyboard. All MIDI notes 0–127 are configurable. Middle C is labelled **C4 / MIDI
60**; some manufacturers use different octave names. Settings stay in this browser.
You can practise without MIDI by using the on-screen keys.

## Practise

- Use **Dark mode** at the top to switch between dark and light backgrounds.
  Dark mode starts on; your choice is remembered. **Invert keyboard colours**
  independently swaps the light and dark piano keys in either theme. Leave it
  off for a conventional keyboard. This choice is remembered too.
- **Show targets on keyboard** is off by default, so the on-screen keyboard
  does not give away the written pitches. Turn it on when you want help with a
  difficult chord. Your choice is remembered; played-note feedback stays visible.
- Begin with **C major / A minor**, **Treble**, minimum and maximum **1**,
  **Notes in key**, **Near middle C**.
  Choose bass or both hands, chromatic notes, a wider range, or up to ten notes
  per target when ready. Turn on **Show note names** for help.
- Choose **Repeat passage** to loop the same material automatically, or
  **Continuous** for an ongoing stream of fresh random practice. The choice is
  remembered. In Repeat, the opening appears beyond a double barline as you near
  the end, keeping the preview populated. Both modes wait for correct playing
  and physical release; neither mode is timed.
- In Repeat, set **Phrase length** (1–32 notes or chords) and the **minimum/maximum notes
  per chord** (1–10). For a mix of single notes and small chords, use minimum 1
  and maximum 3. Equal bounds give a fixed chord size, where the range allows it.
  Phrase length is disabled in Continuous; your repeat length is retained.
  **Stop at end** finishes one phrase and offers **Restart passage**.
- **Layout** offers Automatic or **720p / 1080p / 1440p / 2160p** display presets.
  Presets allow 180 pixels for browser/desktop chrome and also respect the actual
  viewport. Automatic chooses from available browser height. The choice is remembered;
  existing Compact/Comfortable choices migrate to 1080p/1440p. The 720p preset reduces
  notation to 75%; larger presets retain normal note sizes. Distant ledger notes can
  scroll within the reserved staff pane. Feedback and MIDI activity reserve space
  so playing does not move the keyboard. Mode and note-name options are in Practice setup.
- Drag the grip in the bar above the staff or keyboard to position that panel;
  drag its lower-right corner to resize it. The panels can be arranged side by
  side or one above the other. **Scale** above the staff adjusts notation size
  from 40% to 160%, so you can combine a taller pane with smaller notation for
  extreme ledger ranges. Resizing the keyboard changes key height; **Keyboard
  key size** still controls their width independently.
  Any adjustment selects **Custom** layout, remembered across reloads and restarts
  in the same browser. The grip and corner controls also accept arrow keys
  (Shift for larger steps). Choose a built-in **Layout** to return to a preset;
  choose **Custom** again to restore your last arrangement. Smaller windows fit
  the panels within reach without overwriting the saved desktop layout.
  Layout changes preserve the current phrase, position and held-key feedback.
  Only the playing area expands: the header, settings and library stay centered
  within their normal maximum width, including on ultrawide screens.
- **Keyboard key size** is remembered independently. Automatic fits an 88-key piano
  into the available desktop width. Choose 20/28/36 px for a fixed width and horizontal
  scrolling. Automatic keeps wider touch targets on coarse-pointer devices; the full
  MIDI 0–127 range may still scroll. Changing key size preserves the exercise and held keys.
- **Scrolling** offers **Note by note** (active target stays beside the clefs) or
  **Page by page** (pointer moves through a stationary group, then the next page appears).
  Changing scrolling preserves the phrase and progress.
- The current target stays beside the clefs in note-by-note view. Correct answers move the next one
  in from the right. **Look-ahead** controls the maximum number of upcoming
  targets shown; the display fits fewer on smaller screens or for larger chords.
  **None** shows only the current target. Changing look-ahead preserves the phrase.
- **Exercise** chooses Random pitches, Diatonic chords, Cadence or Advanced harmony.
  Diatonic exercises use the selected major or relative natural-minor scale, with
  triads or sevenths and I–IV–V–I, ii–V–I or I–vi–ii–V sequences (corresponding
  degrees in minor). Advanced harmony supplies authored secondary dominants,
  leading-tone diminished sevenths, borrowed minor subdominants, German augmented
  sixths, ninths, altered dominants and quartal planing. Chromatic functions retain
  their written spelling, including double sharps/flats in remote keys; minor
  dominant functions use a raised leading tone. Harmonic vocabulary determines
  the pitches, so **Pitch material** is inactive for harmonic exercises.
- **Texture** chooses block chords, a moving melody with lower chords, moving bass
  with upper chords, broken chords (low–middle–high–middle), or Alberti bass
  (low–high–middle–high). Single-hand textures use a single moving note; two-hand
  textures place the moving note in its named hand with chord attacks in the other.
  For broken/Alberti textures one harmony lasts four targets. Every written note is
  a fresh attack; these are untimed reading patterns, without implied ties or holds.
- Set **Minimum notes per chord** and **Maximum notes per chord** together for
  consistent density, or apart for variety. Generated exercises compose directly
  within your limits, rather than simplifying an existing piece. **Left hand notes**
  and **Right hand notes** cap each hand separately; **Maximum hand span**, separate
  hand leap limits and **Ledger lines** apply to all generated sources. Leap limits
  bound the largest nearest-voice movement in either direction, not fingering.
  Two-hand exercises plan left below middle C and right from middle C upward;
  they do not model hand crossing. Textures, spelling and available keys can require
  fewer notes than the minimum. A target that cannot fit is reported; constraints
  are never silently widened. To hear a full ninth chord, allow five notes and a
  tenth or wider span, or share it across the hands.
- **Attack pattern** can alternate hands or order right/left attacks in 2:1 or
  3:2 groups. This separates hand independence from density, range, accidentals,
  ledger lines and leaps. The groups prescribe attack order only: there is no
  rhythmic notation, timing judgement or requirement to hold a voice through
  another attack. The optional metronome remains independent. For fully voiced
  harmony with both hands attacking together, use **Hands together** and
  **Block chords**. For cadential closure, use a phrase length covering whole
  progressions (four targets per harmony for broken/Alberti textures).
- Choose **Key** for the signature on both staves. All 15 standard signatures
  are available, labelled with relative major/minor pairs. **Notes in key** follows
  that signature; chromatic modes add accidentals and naturals as needed. Diatonic minor
  exercises use natural minor; Advanced harmony adds explicitly authored alterations.
- Play all written pitches together without extra notes. There is no timer:
  fingers can arrive at different times. Fluid progression advances immediately;
  every pitch needs a fresh release and press for each target, including notes
  shared between changing chords. Other retiring notes may overlap briefly for legato. Choose Release between targets for deliberate step-by-step practice.
  The sustain pedal may stay down.
- When enabled, amber marks target keys. Green marks correct held keys, red marks
  extra held keys, and blue marks released but sustained keys. Arrows appear
  beside the written note and on the wrong key. In chords, a wrong pitch within
  two semitones of a missing note gets a hint when each is the other's unique
  nearest unmatched neighbour. Correct notes stay fixed; ties and distant pairs
  get no chord hint. These are likely pitch corrections, not detected fingerings.
  Feedback also uses symbols: ✓ correct, × extra, ≈ sustained and ◆ targets.
  Correct written notes have a tick; sustained keys use diagonal hatching.
  Target diamonds use dark orange on light keys and bright amber on dark keys.
- Repeat and Continuous advance automatically; no manual phrase buttons are needed.
  Changing practice material starts a fresh sequence. Release held keys before
  starting it. Repeat counts completed repetitions; Continuous counts played targets.
  If too few eligible pitches fit the range and spelling, chords shrink to fit;
  an empty range asks you to adjust the settings.
- After a correct chord, a common name appears when the pitches match a known
  chord (for example Cmaj7, Dm7, or Cmaj7♭5). Inversions can show a slash bass.
  This is one feasible name, without harmonic context; unnamed combinations stay
  blank. Single notes are not named as chords.
- On a touch screen, hold multiple keys with multiple fingers. With a mouse,
  play single notes; you can also focus a key and hold Space or Enter. Each press
  counts once; keyboard auto-repeat is ignored. Chords
  work best with MIDI or multitouch.

These are generated pitch exercises, not composed pieces or suggested fingerings.
Large random chords can span wide intervals; use fewer notes and the near range
for easier practice. Local MIDI pitch outlines are also available; full score notation and rhythm are planned.
Sharp/flat choices are preferences: chords use alternate enharmonic spellings
when needed to keep notes on distinct staff positions (for example D–E♭–G).
If a very narrow chromatic range cannot fit the requested count without a
spelling collision, the target uses fewer notes.
The grand staff expands vertically for distant ledger notes above and below
either staff, with extra room between the staves. Choose **All available notes**
and set your physical keyboard range to practise further from the staff.

## Sound and metronome

**Hear live instrument** briefly plays the current target with your selected live
instrument and volume, without enabling or disabling **Sound my playing**.
**Hear target** auditions the same notes using the Target instrument and volume.
If the current exercise has no notes, either audition uses a C major chord.

**Acoustic grand piano** uses bundled recordings of a real Yamaha C5, alongside
**Piano synth** and **Organ synth**. Choose it independently for Live instrument or
Target instrument. Samples load from your local server on first use; no internet
connection is needed. The acoustic option uses one sampled velocity layer, with
volume following your MIDI velocity. Salamander Grand Piano V2 recordings by
Alexander Holm are distributed under CC BY 3.0; credits and the full licence are in
`static/audio/salamander/` and linked in **Sound credits**.

**Sound my playing** enables local sound for MIDI and on-screen keys. MIDI velocity
controls attack strength; restriking a note under sustain produces a fresh attack. Choose
an instrument and adjust its volume independently of **Target sound**.
**Hear target** plays the current target briefly without counting it as your input.
The target sound path also plays imported source passages; its instrument/volume are
independent of your live playing.
The piano/organ synths are original additive instruments; the acoustic piano uses local samples.
Your keyboard may also make its own sound: leave live sound off if you prefer that.

The metronome has its own volume, tempo (30–240 BPM) and bar accent. It is a practice
click: targets still wait for you, and these generated exercises have no timed rhythm.
**Stop sound** silences both instruments and the click. Leaving the tab also stops
sound. Instrument/volume/tempo choices are remembered; live sound and the metronome
start off each visit. Audio requires a click/tap in the browser.

**Pause**, beside the phrase counter, stops practice progression and response-time
measurement. You can still see and hear the keys you play. **Resume** requires a
fresh attack; held keys cannot complete a target merely by resuming. Target
playback and the metronome have their own controls. Pause is not saved across visits.

## Progress

The Progress section measures targets correctly played, average/median response time,
first-attempt accuracy and a clean best time for the current comparable target.
Response time starts when the target activates and ends at the first correct
pitch set. In release-between-targets mode, confirmation and release delays are excluded. Window
pauses, keyboard-endpoint learning and MIDI reconnection waits are excluded. Staggering chord fingers is allowed; wrong pitches affect accuracy.

History is session-only unless **Save history locally** is checked. The browser keeps
up to 1,000 attempts, including exercise settings and written pitches. Queued results are saved when you leave or refresh the page, and periodically during continuous playing. **Export history**
saves JSON; **Import history** merges a previous export without duplicates;
**Clear last hour** and **Clear today** remove recent attempts; today starts at midnight in your local timezone. **Clear all** deletes the entire history. Invalid imports, files over 16 MB, or more than 1,000 attempts leave it intact. Nothing is uploaded. Daily
median response times and hand/key/note/staff-position/accidental breakdowns help spot
patterns. Expand **Daily measurements (UTC)** for exact daily values. **90% within**
shows the slower-tail response time: nine out of ten recorded attempts were at least
that fast. Note-level breakdowns use single-note targets so chord mistakes are not
arbitrarily blamed on one finger. Counts remain visible; small samples are not diagnoses.
Personal bests compare the same target, settings and (in Repeat) phrase, not easier
material against harder exercises. These are reading measurements, not game points.

**Reading patterns** lists repeated corrections after at least eight comparable
single-note attempts (three or more corrected targets). Slower-response flags also
need three different notes and 24 attempts with matching settings, then compare a
note's median against that exercise's baseline. Key, range, mode, source passage and
spelling remain distinct. These are practice clues with visible evidence counts,
not diagnoses of finger/hand ability or conclusions from sparse samples.

## Pitch practice and passage study

Use **Pitch practice** and **Passage study** in the top navigation to switch views
in the same workspace. Both use the same MIDI connection, on-screen keyboard,
layout presets, Custom panel positions, staff Scale, keyboard size, themes, target
markers, note names and sound controls. Switching preserves the current pitch
phrase and the selected study position; returning to a running study requires
fresh articulation. Settings show the controls relevant to the selected source.

For a MIDI study, load a library piece or local MIDI, choose tracks and passage
endpoints (section and endpoint changes apply automatically). **Start practising
this passage**, beside Save passage, also activates the selection. Choose
**Passage study**: its Source is now **Loaded MIDI passage**. Key, staff, range, pitch material and density
filters remain available in both views. Browsing another preview does not replace
active practice. Source playback remains available to hear the MIDI timing and
pedal; **Play study** previews the derived notation with the shared Target sound.
Starting either preview stops the other. Live sound remains independent.

Key, staff/hand, reading range, pitch material, maximum chord size, per-hand
note limits, hand span, leap limits and ledger limits are available for MIDI
passages in both views, and for the authored studies. Passage filters remove
notes; they never add substitute pitches or rewrite the source file. Authored
studies retain their written keys, spelling, timing and complete ties: Key is
used by the Notes in key filter, rather than transposing the written score.
Study limits include continuing physical holds. An empty selection asks you to
widen the filters. Texture, attack pattern,
minimum generated chord size and generated phrase length apply to generation.

Source and progression choices sit at the top of Practice setup. **Repeat passage**
loops the selected MIDI window. **Continue through piece** moves through following
source attacks in windows of the selected length, ending at the file boundary;
filtered empty windows are skipped. **Stop at end** finishes only the current
selection. Generated Continuous still creates fresh targets. To return to random
notes, choose **Pitch practice**, then **Random pitches** in **Source**. The Source
selector stays at the top; the loaded MIDI remains available.

MIDI study notation is a local derivation, not a recovery of a printed edition.
It preserves every retained source attack and its note IDs, original ticks,
track/channel and source hash, while retaining the raw inspection unchanged.
Written timing is rounded to a 1/32-note grid; spelling and independent voice lanes
are derived. Coincident notes with matching releases form chords; distinct
durations remain separate voices. Dotted values avoid unnecessary tied fragments.
A source note spanning a bar is split with explicit ties referring
back to that one attack; separate source attacks are never converted into shared
holds. Meter/key/tempo changes are used where supplied. Without meter metadata,
4/4 is a notation default. Damper resonance follows the source channel independently
of notated finger duration. Pedal values/controllers remain in the original data.

The study currently accepts up to 512 selected attacks, 1,024 retained notes,
16 simultaneous notation lanes and 256 measures, within the model's event limit.
Unknown source note releases and repeated attacks collapsing into the same grid
cell report an unavailable study rather than fabricating durations or merging
attacks. For dense passages, choose **1** under **Bars per line** beside Scale.
Automatic or 1–4 bars per line is remembered. Reflow preserves your position.
Study playback and practice controls sit directly below the stave. Files and
derivations stay in memory; nothing is uploaded or bundled.

The Source selector also offers the original **Independent voices** two-bar study,
**Notation and continuity** ten-bar study, and **Meter and beat groups** six-bar
study. Bar 1 of Independent voices includes
4/4, dotted rhythm and triplets; the inner G ties across the barline, and bar 2 has
a melody rest. The longer study adds nested/mixed tuplets, cross-staff beams,
changing signatures/clefs and paginated ties. Existing `/notation-study` links
forward into this same workspace.

**Meter and beat groups** includes a pickup, 6/8 grouped 3+3, contrasting 5/8
groupings of 2+3 and 3+2, a short middle bar, rests and independent hands. Choose
Both hands and chromatic material to inspect every voice. Staff beams follow
the authored groups; source playback/count-in uses dotted beats for compound
MIDI meters such as 6/8. MIDI does not supply an irregular grouping or printed
pickup, so those are not invented.

Choose **Practise passage** to begin duration-aware patient practice. New attacks
must be physically pressed; tied voices continue. Correct states start the next
written duration at the selected Speed. Short holds or extra keys freeze remaining
time until corrected. A voice rest leaves other voices active. Ticks, crosses,
directions and patterned ≈ sustain states work on the shared playing surface.

**Finger held** requires physical continuity. **Pedal supported** also accepts
previously attacked notes sustained by their own input/channel; a pedal never
supplies an attack. Coincident unisons share one observable press; a repeat against
a held unison needs one new press. MIDI cannot identify fingers. There is no onset
score, half-pedal, sostenuto, soft-pedal or velocity assessment.

Entry beat and Exit beat select a study cut in quarter-note beats counted from
zero, excluding new attacks at the exit. **Loop passage**, on by default and
remembered, repeats practice after releasing
keys and pedal; entry and resume require fresh attacks of all active notes,
including cut ties. Resume restarts the current position's duration. **Pause**
uses the shared playing toolbar. **Stop study** stops and returns to Entry beat;
**Pause playback** keeps the listening position. **Rewind** returns to Entry beat
and keeps listening if playback is running. Play study restarts after reaching
the end. Listening follows Entry/Exit and Loop passage too, with loops scheduled
on audio time. Backgrounding and unplugging pause safely.

The **Gradual tempo · original study** source demonstrates acceleration and slowing.
In Passage study, **Tempo → Score tempo** follows written changes; **Steady tempo**
uses the opening quarter-note tempo throughout. Both apply to listening and patient
practice, alongside Speed. Tempo marks remain visible in either setting.

In Passage study, **Source → La Candeur · verified bars 1–4** opens a written
pitch/rhythm excerpt from the reviewed Mutopia edition. It preserves the moving
melody and the bass chord tied across bars 3–4. Expression, fingering and repeats
are outside this excerpt. Select both hands and widen the note/range filters to
see every voice.

**Import MusicXML** loads a local UTF-8 `.musicxml`/`.xml` file into the same study
workspace. The current subset supports one two-staff piano part, written pitches,
voices/chords, whole through 32nd notes with up to two dots, rests and ties. Files
must be uncompressed, no larger than 256 KB, and exported without a DOCTYPE.
Unsupported tuplets, grace notes and repeats are rejected with a diagnostic.
Expression annotations remain in the original XML with a warning when they cannot
yet be rendered or judged. A failed import leaves the current study intact.
Files stay on this computer, in memory for this visit; imports are not saved to
browser storage or added to the shared library. Use Source to switch back to a
built-in study or the loaded MIDI passage.

## Active exercise

The heading above the stave names the active exercise. Its description lists the
key, hand, reading and keyboard ranges, chord limit and pitch material. For MIDI
practice it also names the active piece and source attack range. Loading a new
file preview leaves this description intact; selecting a section updates it.

## Help

Choose **Help** beside **Connect MIDI** at the top (a **?** on narrow screens), or
**Help & guide** beside Music library, for the local help page. Either link opens in
a separate tab, with a quick start, piece/passage instructions, repeated-note
behavior, sound controls, progress and MIDI troubleshooting. Use the **×** in
the top-right corner to close the guide and return to your existing practice tab.

## Music library

The **Music library** has twelve editions ready to load offline, including Bach, Chopin,
Beethoven, Haydn, Handel, Schumann, Clementi, Rachmaninoff, Burgmüller, Satie and Joplin. Filter by composer,
era, style or difficulty. Search by title, composer or opus number (accents and
opus spacing are optional), then select a piece and choose **Load piece**, or choose
**Random piece** for a selection within those filters. Adjust the preview if needed,
then **Start practising this passage**. Your range, hand and pitch filters still apply.
Edition credits are linked beside the selection and recorded in
[the music notices](static/library/NOTICES.md). Eleven editions have explicit Mutopia
public-domain dedications; Rachmaninoff's Prelude retains its **CC BY-SA 4.0** licence,
attribution and share-alike terms. These music licences are separate from the
application's GPL licence. Only editions with reviewed redistribution terms are bundled.
Difficulty is currently **Unrated** until an editorial review establishes useful
levels; no exam grades are inferred from MIDI. Browsing filters never replace
the current practice passage.

New choices include **La Candeur, Op. 100 No. 1** (melody over sustained chords),
**Arabesque, Op. 100 No. 2** (quicker passagework), **Gymnopédie No. 1** (slow melody
and wide bass-to-chord moves), and **The Entertainer** (syncopation and ragtime leaps).
These descriptions indicate reading demands, rather than formal difficulty grades.

**Recent pieces** reopens a bundled piece's preview and clears the browsing filters.
The list remembers up to 20 opened library pieces in this browser, using only their
catalogue IDs and checksums. It stores no local MIDI files or paths. **Clear recent**
removes the list independently of your practice history and saved passages.

**Suggested section** splits a MIDI into manageable attack ranges, using marker
messages, rest gaps and meter boundaries where available. These are practice
suggestions, not recovered musical phrase markings. Adjust First/Last attack and
save a named passage as usual. A local file uses the same section suggestions.

## Inspecting a local MIDI file

Choose a `.mid` or `.midi` file under **Local MIDI file**. The app previews its note
attacks, tracks and duration; **Download MIDI data (JSON)** saves the normalized performance
as JSON, including original tick positions, channels, velocities, tempo/meter/key
messages, controllers and a source-file hash. Missing note-offs and ambiguous repeated
pitches are reported. Your original file stays unchanged and is not saved by the app. MIDI percussion
(channel 10) is excluded from piano outlines.
The file is sent only to the Python server on this computer, with no external upload.

Changing **First attack** or **Last attack** automatically selects
that passage (up to 512 source onsets). The current range, hand, key, pitch material
and maximum chord size filter the source. Reduction keeps the highest note, then
the bass, then inner notes; it never adds notes. Empty attacks are omitted from this
untimed reading exercise. Minimum chord size and generated phrase length do not
apply. The preview reports retained/omitted notes before starting. Include or exclude MIDI
tracks and assign each to treble/bass explicitly, or keep the middle-C inference.
An explicit assignment allows crossing middle C; the hand selector then follows
your assigned staff. Track and staff changes automatically update the active passage.

When you start a passage, the **Key** setting follows its opening key signature if the
MIDI contains one. If it does not, the app estimates the key signature from note
patterns only when the evidence is strong; an uncertain file keeps your selected key.
Later key-change markers are reported. The current untimed pitch outline applies the
opening key throughout, so a passage with modulations is not yet shown with changing
key signatures. You can choose another key yourself at any time. Key checks run locally;
the app does not search for the identity of a private MIDI file online.

Each target contains simultaneous note attacks, not every note still sounding.
Play through it using your chosen Fluid or Release-between-targets progression.
In Fluid mode, every written note requires a fresh key press, including
notes shared with the preceding chord. Other notes may overlap briefly for legato.
A MIDI note-on is a new attack; printed ties require a notation source and are not inferred.
Written-note ticks and green noteheads credit only the presses accepted for the
current target, so held repeated pitches stay unmarked in the following column. Spelling and inferred/selected
staff assignments are derived choices, not recovered notation or detected hands. Source
durations, overlaps, pedal, rests and tempo remain in the inspection but are not
judged or drawn as timed music yet. Reloading clears the local file and returns
to generated practice; personal bests retain its source hash and passage identity.

This inspection step accepts synchronous MIDI formats 0/1 with ticks-per-quarter
timing, up to 256 KB, 64 tracks and 25,000 events. MIDI does not preserve original
spelling, printed voices, ties or notation; these are not inferred as authored facts.
A failed import leaves the previous valid inspection available. Files are not added
to a shared library, and their redistribution rights are not assumed.

### Saved passages

Give a selected attack range a name and choose **Save passage**. Up to 50 bookmarks
stay in this browser, including the track and staff choices. Load the library
piece again or reopen the same local MIDI file, then choose its saved passage
to activate it immediately. Current pitch/range filters stay under your control.
Bookmarks match the file's hash, so another file with the same name cannot receive
the wrong range. **Delete saved passage** removes a bookmark. Uploaded music files
are not kept in browser storage. Other tabs in the same browser receive bookmark changes.

### Listening to the source passage

**Play source passage** plays the selected MIDI tracks and attack range through
Target sound, retaining source tempo changes, velocities and sustain. Choose
25–200% **Playback speed**, pause/resume, or stop. Sounding notes from before the
passage start are resumed; notes are cut off at its end. **Stop sound**, leaving
the tab, changing the source passage/tracks/instrument or disabling Target sound
also stops playback. Re-enable Target sound if playback controls are disabled.

This is the selected source performance, including pitches your outline filters
omit. It never counts as your playing or moves the practice pointer. The
target instrument uses your chosen sound; MIDI program/bank changes,
pitch bends and expressive controllers remain data for future instrument support.
A resumed held tone starts a fresh envelope and, for the acoustic piano, a fresh sample. Playback rejects passages
above 128 simultaneous voices rather than overloading the sound engine.

For a click aligned to a piece, enable **Click with source playback**. It follows
MIDI tempo/meter changes and Playback speed, with the metronome’s Click volume.
**Source count-in** adds one or two bars before a fresh start. Pause/resume continues
without another count-in. Starting aligned playback stops the standalone click;
starting the standalone metronome stops aligned playback. Source clicks use the
MIDI time-signature groups as the pulse (two dotted-quarter pulses in 6/8), with
an accent at the MIDI bar boundary. Missing meter defaults to 4/4. Printed pickups
and compound-beat grouping are not recovered from MIDI.

## Finding your own music

From the project folder, with your Python environment activated as described above,
run the discovery helper:

```powershell
python tools/discover_scores.py --composer ChopinFF --limit 8
```

Open `score-shortlists/mutopia.md` for a shortlist of titles, editions, licence links
and MIDI downloads. Visit a source page, choose a MIDI file to download, then use
**Choose MIDI file** in the app. If the download is a MIDI ZIP, extract it first and
choose the movement you want. Check the preview, then choose **Start practising this
passage**. Your downloaded file is not added to the public library or stored by the app.

Omit `--composer` to browse keyboard works, or use Mutopia codes such as `BachJS`,
`BeethovenLv`, `HaydnFJ`, `HandelGF`, `SchumannR` or `ClementiM`. By default the helper
shortlists explicit public-domain/CC0 editions. To include editions explicitly marked
CC BY-SA 4.0, opt in, for example:

```powershell
python tools/discover_scores.py --composer RachmaninoffS --include-by-sa-4
```

Discovery reads online metadata and writes local reports; it never downloads music
or imports it automatically. It needs internet access but no additional packages.
`--max-review` limits edition-page requests (default 30); `--output` changes the
report location. The matching JSON keeps dated metadata hashes and permission evidence.

[Mutopia](https://www.mutopiaproject.org/) explicitly shares its editions under the
terms shown on each source page. Keep those credits and terms if you redistribute
files. A shortlist is a starting point for reviewing the particular edition and asset;
being free to download or being an old composition does not itself grant redistribution
rights. See [Mutopia's licence details](https://www.mutopiaproject.org/legal.html).
MIDI pitch outlines can already be practised; full notation and rhythmic performance
remain planned.

## Troubleshooting

- **Launcher reports an occupied port:** close the old app server if it is yours,
  or run `start.cmd --port 8768` / `python3 launch.py --port 8768`.
- **Launcher setup failed:** check internet access for dependency installation;
  retry or use the manual commands above. An incomplete `.venv` is reported
  explicitly; rename that folder before rebuilding it.
- **Python is missing:** install Python 3.10+ from [python.org](https://www.python.org/downloads/),
  then reopen your terminal. On Windows, ensure the Python launcher is installed.
- **MIDI unavailable:** open the local URL above in Chrome or Edge. Web MIDI needs
  a supported browser and a secure context; local loopback URLs are suitable.
  See [browser MIDI requirements](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API).
- **Permission denied:** allow MIDI for this site in browser settings and reconnect.
- **No device:** reconnect the cable, click **Refresh MIDI**, and check the input
  selector. Try closing other MIDI applications if they hold exclusive device access.
- **Device listed but no notes:** **Refresh MIDI** closes and reopens the input.
  The connection status reports port-opening errors; a last-note indicator appears
  when an actual note arrives. Close other MIDI tabs/apps if opening fails, then
  refresh. A device appearing in the list does not by itself mean its input is open.
- **Keys stuck on screen:** release the physical keys and click **Clear held keys**.
  Unplugging or switching away from the window clears held state, so release and
  replay any keys you were holding when you return.

This is an early working version. For development and planned features, see
[DEVELOPMENT.md](DEVELOPMENT.md).
