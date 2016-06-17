Virtuoso
========

Technologically-assisted musical performance taken to the extreme. It handles
the notes for you; just relax and hit the rhythm.

Works best with MIDI keyboards, but you can use your computer keyboard too!

## Installation

```bash
git clone https://github.com/rileyjshaw/virtuoso.git
cd virtuoso
git submodule init
git submodule update
npm i && npm i --prefix node-midi
```

## Usage

```bash
node index.js
```

Then open a DAW like GarageBand or Ableton and hook the "Virtuoso" MIDI
instrument up to some sound! Turn up the volume and mash some keys :)

The repo is pre-loaded with Mozart's "Rondo alla Turca", but you can use your
own MIDI file by passing it as an argument to the launcher:

```bash
node index.js ./star_wars.mid
```

## Related works

 - Stephen Malinowski's "The Conductor Program"
 - Batuhan Bozkurt's "Touch Pianist"
 - Smule's "Magic Piano"
 - Simone Masiero's "Hacker Typer"

## Notes

 - If you're using GarageBand, you'll want to hijack & block your actual MIDI
 instrument's stream so that you don't get double notes. I included a [sample
 MidiPipe configuration](./block_keyboard.mipi) that does the trick. [You can
 download MidiPipe here](http://www.subtlesoft.square7.net/MidiPipe.html).
 - I bundled in a copy of [node-midi]
 (https://github.com/justinlatimer/node-midi) because I'm waiting
 for a PR to make it to npm. I'll clear it out once that propagates :)

-------------------------------------------------------------------------------

Licensed under
[MIT](https://github.com/rileyjshaw/virtuoso/blob/master/LICENSE).

Created by [rileyjshaw](http://rileyjshaw.com/).
