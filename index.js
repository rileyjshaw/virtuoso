'use strict';

/**
 * Technologically-assisted musical performance taken to the extreme. It
 * handles the notes for you; just relax and hit the rhythm.
 *
 * Works best with MIDI keyboards, but you can use your computer keyboard too!
 *
 * Usage:
 *  > npm i
 *  > node index.js [path/to/midi/file.mid]
 *
 *  Then open a DAW like GarageBand or Ableton and hook the "Virtuoso" MIDI
 *  instrument up to some sound! Turn up the volume and mash some keys :)
 *
 * Related works:
 *  - Stephen Malinowski's "The Conductor Program"
 *  - Batuhan Bozkurt's "Touch Pianist"
 *  - Smule's "Magic Piano"
 *  - Simone Masiero's "Hacker Typer"
 */
const fs = require('fs');

const inquirer = require('inquirer');
const {parseMidi} = require('midi-file');
const midi = require('./node-midi/midi.js');

// Helpers
const isType = a => ({type}) => type === a;
const bye = msg => {
	console.error(msg);
	process.exit(1);
};

// Set up a new MIDI input.
const input = new midi.input();
const numInputs = input.getPortCount();
const instrumentChoices = Array.from({length: numInputs}, (_, i) => ({
	name: input.getPortName(i),
	value: i,
})).concat({name: 'Computer keyboard', value: -1});

// Pull in a list of tracks from the MIDI file.
const fileName = process.argv[2] || './rondo_alla_turca.mid';
const midiFile = fs.readFileSync(fileName);
const {header: {ticksPerBeat}, tracks} = parseMidi(midiFile);

// We only care about MIDI tracks containing "noteOn" signals. Filter the rest.
const trackChoices = tracks
	.map(track => {
		// Since we only care about "noteOn" signals, we'll remove other types
		// while we're in here. MIDI's "deltaTime" attributes are cumulative,
		// so we want to add the values from removed signals to the value of
		// the next "noteOn" signal. Tempo changes are taken into account. MIDI
		// defaults to a tempo of 500k microseconds / beat.
		const {notes} = track.reduce((acc, cur) => {
			acc.deltaTime += cur.deltaTime / acc.tempo * 1000 * ticksPerBeat;
			if (isType('noteOn')(cur)) {
				acc.notes.push(
					Object.assign({}, cur, {deltaTime: acc.deltaTime}));
				acc.deltaTime = 0;
			} else {
				if (isType('setTempo')(cur)) {
					acc.tempo = cur.microsecondsPerBeat;
				}
			}
			return acc;
		}, {deltaTime: 0, tempo: 500000, notes: []});

		// Name the track, eg. "Piano right (1512 notes)"
		const {text} = track.find(isType('trackName')) || {};
		const name = (text || 'Mystery track') + ` (${notes.length} notes)`;

		return {name, value: notes};
	})
	.filter(({value}) => value.length)
	;

if (!trackChoices.length) {
	bye('Oh no! I can\'t read any note data from the provided track.');
}

const questions = [
	{
		name: 'instrument',
		type: 'list',
		message: 'Which instrument do you want to use?',
		choices: instrumentChoices,
	},
	{
		name: 'track',
		type: 'list',
		message: 'Which track do you want to play?',
		choices: trackChoices,
	},
	{
		name: 'groupChords',
		type: 'confirm',
		message: 'Do you want to play chords with a single key? It\'s easier.',
		default: true,
	},
	{
		when: ({groupChords}) => groupChords,
		name: 'chordThreshold',
		type: 'input',
		message: 'Will do! How far apart should two notes be for me to ' +
			'consider them separate? (in milliseconds)',
		// Default to 60% of the track's average deltaTime.
		default: ({track}) => Math.round(0.6 * track.reduce(
			(acc, {deltaTime}) => acc + deltaTime, 0) / track.length),
		filter: n => +n,
		validate: n => !isNaN(parseInt(n)) || 'I was hoping for a number...',
	},
];

// Set up a new output and create a virtual virtuoso with it.
const output = new midi.output();
output.openVirtualPort('Virtuoso');

// Kick off the questions!
inquirer.prompt(questions).then(({
	instrument,
	track,
	groupChords,
	chordThreshold,
}) => {
	function triggerNextNote () {
		// Notes are grouped into their own arrays so that chords can be kept
		// together. The first note of a group is played immediately; anything
		// following that might have an offset added based on the cumulative
		// deltaTime since the original note.
		//
		// This uses reduce for side-effects only (yuck).
		track.shift().reduce((dt, chord) => {
			const {noteNumber, velocity, deltaTime} = chord;
			const playTime = dt + deltaTime;

			setTimeout(_ => output.sendMessage([0x90, noteNumber, velocity]),
				dt);
			setTimeout(_ => output.sendMessage([0x80, noteNumber, 0]),
				dt + 200);

			return playTime;
		}, 0);

		// Exit the app once the last note is played.
		if (!track.length) {bye('Thanks for playing!');}
	}

	// Group notes that play at the same time (or in quick succession) into
	// chords.
	track = track.reduce((acc, cur, i) => {
		if (!groupChords || cur.deltaTime > chordThreshold || !i) {
			// Make it the first note in its own chord.
			acc.push([Object.assign({}, cur, {deltaTime: 0})]);
		} else {
			// Add it as part of an existing chord.
			acc[acc.length - 1].push(cur);
		}

		return acc;
	}, []);

	// Listen to stdin for ctrl-c, ctrl-d, and esc.
	const {stdin} = process;
	stdin.setRawMode(true);
	stdin.resume();
	stdin.setEncoding('utf8');
	stdin.on('data', key => {
		if (['\u0003', '\u0004', '\u001b'].includes(key)) {process.exit();}
	});
	console.log('\nYou can exit at any time by hitting the Esc key.\n');

	if (instrument === -1) {
		// Also listen for anything else and trigger a keystroke.
		stdin.on('data', triggerNextNote);
	} else {
		// If they chose MIDI, open the port and trigger on "noteOn" signals.
		input.openPort(instrument);
		input.on('message', (_, [status, __, velocity]) => {
			if (status !== 0x90 || !velocity) {return;}
			triggerNextNote();
		});
	}
});
