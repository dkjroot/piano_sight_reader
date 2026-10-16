# Piano sight reader

A local piano sight-reading practice app with a grand staff, an on-screen
keyboard, and live USB MIDI feedback. Start with single white notes and build up
to chords on both staves, at your own pace. Free software under the [GNU GPL](LICENSE).

## Install and run

You need **Python 3.10 or newer** and a browser. For USB MIDI, use Chrome or Edge.
Download or clone this repository, open a terminal in its folder, then run:

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

To start again later, run the last command from the project folder. After updating
the app, repeat the dependency installation command before starting it.

There is no front-end build step or Node.js requirement to use the app.
Nothing you play is uploaded; MIDI and practice run locally in your browser.
Use your instrument’s sound or enable the local acoustic piano, piano synth or organ.

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
- Choose **Repeat phrase** to loop the same material automatically, or
  **Continuous** for an ongoing stream of fresh random practice. The choice is
  remembered. In Repeat, the opening appears beyond a double barline as you near
  the end, keeping the preview populated. Both modes wait for correct playing
  and physical release; neither mode is timed.
- In Repeat, set **Phrase length** (1–32 notes or chords) and the **minimum/maximum notes
  per chord** (1–10). For a mix of single notes and small chords, use minimum 1
  and maximum 3. Equal bounds give a fixed chord size, where the range allows it.
  Phrase length is disabled in Continuous; your repeat length is retained.
- **Layout** offers Automatic or **720p / 1080p / 1440p / 2160p** display presets.
  Presets allow 180 pixels for browser/desktop chrome and also respect the actual
  viewport. Automatic chooses from available browser height. The choice is remembered;
  existing Compact/Comfortable choices migrate to 1080p/1440p. The 720p preset reduces
  notation to 75%; larger presets retain normal note sizes. Distant ledger notes can
  scroll within the reserved staff pane. Feedback and MIDI activity reserve space
  so playing does not move the keyboard. Mode and note-name options are in Practice setup.
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
- **Exercise** chooses Random pitches, Diatonic chords or Cadence. Harmonic
  exercises follow the selected key's major or relative natural-minor tonality;
  Cadence offers I–IV–V–I, ii–V–I and I–vi–ii–V, with the corresponding natural-minor
  degrees when Minor is selected. Choose Triads or Diatonic sevenths. Set both
  chord-size bounds to 3 for full triads or 4 for full seventh chords, or allow
  single chord tones and doublings. Phrase lengths 3/6 suit ii–V–I loops. Maximum hand span
  bounds harmonic voicings; smaller targets may be necessary in narrow ranges.
  Harmonic exercises stay diatonic, so chromatic preference is inactive there.
- Choose **Key** for the signature on both staves. All 15 standard signatures
  are available, labelled with relative major/minor pairs. **Notes in key** follows
  that signature; chromatic modes add accidentals and naturals as needed. Minor
  labels refer to natural minor, without harmonic or melodic alterations.
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

## Active exercise

The heading above the stave names the active exercise. Its description lists the
key, hand, reading and keyboard ranges, chord limit and pitch material. For MIDI
practice it also names the active piece and source attack range. Loading a new
preview does not change this description until you start practising it.

## Help

Choose **Help** beside **Connect MIDI** at the top (a **?** on narrow screens), or
**Help & guide** beside Music library, for the local help page. Either link opens in
a separate tab, with a quick start, piece/passage instructions, repeated-note
behavior, sound controls, progress and MIDI troubleshooting. Use the **×** in
the top-right corner to close the guide and return to your existing practice tab.

## Music library

The **Music library** includes Bach’s Prelude in C major BWV 846 and Chopin’s Prelude
Op. 28 No. 7, ready to load offline. Filter by composer, era, style or difficulty,
then select a piece, choose **Load piece**, adjust the
preview if needed, then **Start practising this passage**. Your range, hand and pitch
filters still apply. Edition credits are linked beside the selection and recorded
in `static/library/NOTICES.md`; these Mutopia editions carry a public-domain dedication.
Difficulty is currently **Unrated** until an editorial review establishes useful
levels; no exam grades are inferred from MIDI. Browsing filters never replace
the current practice passage.

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

Choose **First attack** and **Last attack**, then **Start practising this passage** to loop
that passage (up to 512 source onsets). The current range, hand, key, pitch material
and maximum chord size filter the source. Reduction keeps the highest note, then
the bass, then inner notes; it never adds notes. Empty attacks are omitted from this
untimed reading exercise. Minimum chord size and generated phrase length do not
apply. The preview reports retained/omitted notes before starting. Include or exclude MIDI
tracks and assign each to treble/bass explicitly, or keep the middle-C inference.
An explicit assignment allows crossing middle C; the hand selector then follows
your assigned staff. Track changes remain a preview until **Start practising this passage**
is clicked.

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
to restore the preview. **Start practising this passage**
still starts it explicitly. Current pitch/range filters stay under your control.
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
MIDI time-signature denominator as the pulse (six eighth-note pulses in 6/8), with
an accent at the MIDI bar boundary. Missing meter defaults to 4/4. Printed pickups
and compound-beat grouping are not recovered from MIDI.

## Finding music for future practice

The score-discovery helper produces a list to choose from, without downloading or
adding music to the app. From the project folder, run:

```powershell
python tools/discover_scores.py --composer ChopinFF --limit 8
```

Open `score-shortlists/mutopia.md` for the shortlist and links. The matching JSON
retains edition, contributor, licence evidence and retrieval details. Omit
`--composer` to browse piano works, or use Mutopia codes such as `BachJS` or
`MozartWA`. `--max-review` limits metadata requests (default 30); `--output` changes
the report location. The script needs internet access but no additional packages.

This first source is [Mutopia](https://www.mutopiaproject.org/), using its explicit
public-domain/CC0 metadata. Candidates still need an edition/asset/jurisdiction
review before redistribution; other licences are omitted for separate review.
See [Mutopia's licence details](https://www.mutopiaproject.org/legal.html).
MIDI pitch outlines can already be practised; full notation and rhythmic performance remain planned.

## Troubleshooting

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
