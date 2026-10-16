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
Use your instrument’s sound or enable the optional local piano/organ synthesis.

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
- **Layout** defaults to Automatic, using compact spacing on shorter desktop
  windows. Choose Comfortable or Compact explicitly; the choice is remembered.
  Compact removes whitespace while retaining note sizes and ledger-line room.
- **Scrolling** offers **Note by note** (active target stays beside the clefs) or
  **Page by page** (pointer moves through a stationary group, then the next page appears).
  Changing scrolling preserves the phrase and progress.
- The current target stays beside the clefs in note-by-note view. Correct answers move the next one
  in from the right. **Look-ahead** controls the maximum number of upcoming
  targets shown; the display fits fewer on smaller screens or for larger chords.
  **None** shows only the current target. Changing look-ahead preserves the phrase.
- **Exercise** chooses Random pitches, Diatonic chords or Cadence. Harmonic
  exercises follow the selected key's major or relative natural-minor tonality;
  Cadence uses I–IV–V–I (i–iv–v–i in natural minor). Set both chord-size bounds to
  3 for full triads, or allow single chord tones and doublings. Maximum hand span
  bounds harmonic voicings; smaller targets may be necessary in narrow ranges.
  Harmonic exercises stay diatonic, so chromatic preference is inactive there.
- Choose **Key** for the signature on both staves. All 15 standard signatures
  are available, labelled with relative major/minor pairs. **Notes in key** follows
  that signature; chromatic modes add accidentals and naturals as needed. Minor
  labels refer to natural minor, without harmonic or melodic alterations.
- Play all written pitches together without extra notes. There is no timer:
  fingers can arrive at different times. Hold the correct set briefly (120 ms),
  then release your keys for the next target. The sustain pedal may stay down.
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
  play single notes; you can also focus a key and hold Space or Enter. Chords
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

**Sound my playing** enables local sound for MIDI and on-screen keys. Choose piano
or organ synthesis and adjust its volume independently of **Target audition**.
**Hear target** plays the current target briefly without counting it as your input.
These are original synthetic instruments; no samples or downloads are needed.
Your keyboard may also make its own sound: leave live sound off if you prefer that.

The metronome has its own volume, tempo (30–240 BPM) and bar accent. It is a practice
click: targets still wait for you, and these generated exercises have no timed rhythm.
**Stop sound** silences both instruments and the click. Leaving the tab also stops
sound. Instrument/volume/tempo choices are remembered; live sound and the metronome
start off each visit. Audio requires a click/tap in the browser.

## Progress

The Progress section measures targets correctly played, average/median response time,
first-attempt accuracy and a clean best time for the current comparable target.
Response time starts when the target activates and ends at the first stable correct
pitch set; the deliberate 120 ms confirmation and release delay are excluded. Window
pauses are excluded. Staggering chord fingers is allowed; wrong pitches affect accuracy.

History is session-only unless **Save history locally** is checked. The browser keeps
up to 1,000 attempts, including exercise settings and written pitches. **Export history**
saves JSON; **Clear history** deletes the current history. Nothing is uploaded. Daily
median response times and hand/key/note/staff-position/accidental breakdowns help spot
patterns. Note-level breakdowns use single-note targets so chord mistakes are not
arbitrarily blamed on one finger. Counts remain visible; small samples are not diagnoses.
Personal bests compare the same target, settings and (in Repeat) phrase, not easier
material against harder exercises. These are reading measurements, not game points.

## Inspecting a local MIDI file

Choose a `.mid` or `.midi` file under **Local MIDI file**. The app previews its note
attacks, tracks and duration; **Export inspection** saves the normalized performance
as JSON, including original tick positions, channels, velocities, tempo/meter/key
messages, controllers and a source-file hash. Missing note-offs and ambiguous repeated
pitches are reported. Your original file stays unchanged and is not saved by the app.
The file is sent only to the Python server on this computer, with no external upload.

Choose **First attack** and **Last attack**, then **Practise pitch outline** to loop
that passage (up to 512 source onsets). The current range, hand, key, pitch material
and maximum chord size filter the source. Reduction keeps the highest note, then
the bass, then inner notes; it never adds notes. Empty attacks are omitted from this
untimed reading exercise. Minimum chord size and generated phrase length do not
apply. The preview reports retained/omitted notes before starting.

Each target contains simultaneous note attacks, not every note still sounding.
Play it, release and advance as in generated practice. Spelling and the middle-C
staff split are derived choices, not original notation or detected hands. Source
durations, overlaps, pedal, rests and tempo remain in the inspection but are not
judged or drawn as timed music yet. Reloading clears the local file and returns
to generated practice; personal bests retain its source hash and passage identity.

This inspection step accepts synchronous MIDI formats 0/1 with ticks-per-quarter
timing, up to 256 KB, 64 tracks and 25,000 events. MIDI does not preserve original
spelling, printed voices, ties or notation; these are not inferred as authored facts.
A failed import leaves the previous valid inspection available. Files are not added
to a shared library, and their redistribution rights are not assumed.

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
