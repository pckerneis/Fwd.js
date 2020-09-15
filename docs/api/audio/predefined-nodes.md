# Predefined audio nodes

## gain

Allows to multiply the amplitude of a signal by some value.

```javascript
const gainNode = fwd.audio.gain(defaultGain);

// Change gain value
gainNode.gain.value = 0.5;
```

## osc

Produces a periodic signal. Different waveforms are available such as ```sine```,
```square``` or ```sawtooth```.

```fwd.audio.osc``` actually returns a wrapper around an OscillatorNode and a GainNode so you can also
access a ```gain``` audio parameter.

```javascript
const oscNode = fwd.audio.osc(defaultFrequency);

// Change waveform type
oscNode.type = 'triangle';

// Change frequency value
oscNode.frequency.value = 220;

// Change gain value
oscNode.gain.value = 0.5;
```

## lfo

Produces a low-frequency periodic signal.

This node is really similar to the ```osc``` (it is built on the same native AudioNodes) except its output
ranges from 0 to 1. This makes ```lfo``` more suitable for audio parameter modulation.

```javascript
// Tremolo
// Use a LFO to modulate the gain of an oscillator from 0.8 to 1.0 at 0.5 Hz
const oscNode = fwd.audio.osc(440);
oscNode.gain = 0.8;
const lfoNode = fwd.audio.lfo(0.5, 0.2);
lfoNode.connect(oscNode.frequency);
oscNode.connectToMaster();
```

## sampler

## noise

## delayLine

## stereoDelay

## distortion

## compressor

## reverb

## bufferNode

## convolver

## highPass

## lowPass

## bandPass

## allPass

## waveShaper

