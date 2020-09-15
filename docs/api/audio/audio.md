# Audio API

The ```fwd.audio``` module is a layer added on top of the WebAudio API.
It allows creating and connecting audio nodes into a processing graph.

## Accessing the AudioContext

Using the ```fwd.audio``` module, you don't instantiate an ```AudioContext``` as you would do with the WebAudio API.
Instead, the audio module manages the context internally. You can still access the native ```AudioContext``` object with ```fwd.audio.context```.

## Create nodes

The ```fwd.audio``` provides pre-defined audio nodes (or group of audio nodes) made available with factory methods.

```javascript
const osc = fwd.audio.osc();
const gain = fwd.audio.gain();
const lfo = fwd.audio.lfo();
```

You can find a list of all the predefined audio nodes at the section [Predefined nodes](api/audio/predefined-nodes.md)

These nodes can be connected together to form a graph.

```javascript
// Connect osc to gain and gain to master
osc.connect(gain).connectToMaster();

// Connect lfo output to gain node's gain parameter.
lfo.connect(gain.gain);
```

## Dispose of unused audio nodes

When you're done using a node, you should call ```tearDown``` to disconnect it and release the memory.
If you forget tearing down your nodes you're likely to reach an excessive memory usage which causes audible audio artifacts.

You cannot use a node anymore after it has been teared down.

```javascript
osc.tearDown();
gain.tearDown();
lfo.tearDown();
```

## Parameter automation and implicit timing

Most ```FwdAudioNode``` objects expose audio parameters.
Automating audio parameters means that we schedule value changes for an audio parameter such as discrete value changes or ramps.

```javascript
// Schedule a ramp from the current value to 220 Hz in 1 second
osc.frequency.rampTo(220, 1.0);
```

Unlike native ```AudioParam``` objects, the ```FwdAudioNode``` parameters abstract the current time away using the notion of implicit timing.
This allows writing parameter automation chains with ease.

```javascript
const osc = fwd.audio.osc();
const attack = 1.5;
const release = 3.0;

fwd.scheduler
    .fire(() => osc.gain.rampTo(1.0, attack))
    .wait(attack)
    .fire(() => osc.gain.rampTo(0.0, release))
    .wait(release)
    .fire(() => osc.tearDown())
    .trigger();
```

