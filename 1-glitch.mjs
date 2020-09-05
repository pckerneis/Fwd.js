import {random} from "./dist/fwd/utils/numbers";
import {getGuiManager} from "./dist/fwd/gui/Gui";
import {bufferToWave, downloadFile} from "./dist/fwd/audio/utils";

let counter = 0;

const gui = getGuiManager(fwd.editor.root.htmlElement);

gui.update = () => {
  gui.rootElement.style.display = 'grid';
  gui.rootElement.style.gridTemplateColumns = '1fr 3fr 1fr';
  gui.rootElement.style.gridAutoRows = '20px';
  gui.rootElement.style.padding = '6px';

  labeledSwitch(gui, 'save to file', 0);

  header('Global');
  labeledSlider(gui, 'duration', { defaultValue: 0.5, min: 0.01, max: 2, step: 0.01 });
  labeledSwitch(gui, 'stereo', 1);
  labeledSlider(gui, 'gain', { defaultValue: 0.2, min: 0, max: 1, step: 0.01 });

  header('Source');
  labeledSlider(gui, 'minFreq', { defaultValue: 200, min: 0, max: 20000 });
  labeledSlider(gui, 'maxFreq', { defaultValue: 200, min: 0, max: 20000 });
  labeledSlider(gui, 'changeProb', { defaultValue: 0.001, min: 0, max: 0.01, step: 0.00001 });
  labeledSlider(gui, 'noiseAmount', { defaultValue: 0.5, min: 0, max: 1, step: 0.0001 });
  
  header('Scrambler');
  labeledSwitch(gui, 'bypassScrambler', 0);
  labeledSlider(gui, 'numCuts', { defaultValue: 32, min: 0, max: 200 });
  labeledSlider(gui, 'minRepeat', { defaultValue: 0, min: 0, max: 200 });
  labeledSlider(gui, 'maxRepeat', { defaultValue: 100, min: 0, max: 200 });
  labeledSlider(gui, 'minCutLength', { defaultValue: 56, min: 16, max: 44100 });
  labeledSlider(gui, 'maxCutLength', { defaultValue: 2048, min: 16, max: 44100 });

  function header(text) {
    gui.label(text, { style: { 
      gridColumn: '1 / span 3',
      fontWeight: 'bold',
      background: '#efefef',
    	padding: '2px',
    }});
  }

  function labeledSlider(gui, name, options) {
    gui.label(name);
    gui.slider(name, options);
    gui.slider(name, {type: 'number', style: { maxWidth: '100px', margin: '1px 4px' } });
  }
  
  function labeledSwitch(gui, name, defaultValue) {
    gui.label(name);
    gui.slider(name, { 
      defaultValue,
      min: 0,
      max: 1,
      step: 1,
      style: { maxWidth: '50px', margin: 'auto' } });
        
    gui.slider(name, {type: 'number', style: { maxWidth: '100px', margin: '1px 4px' } });
  }
}

gui.changed();

fwd.onStart = () => {
  const chain = fwd.scheduler
    .fire('glitch')
    .wait(3)
  	.continueIfStillRunning()
  	.fire(() => chain.trigger());
  
  chain.trigger();
};

fwd.scheduler.defineAction('glitch', () => {
  const numSamples = Math.floor(44100 * gui.getValue('duration'));
  const sr = 44100;
  
  const numChannels = gui.getValue('stereo') ? 2 : 1;
  
  const audioBuffer = new AudioContext().createBuffer(
  	numChannels,
  	numSamples,
  	sr
  );
  
  for (let c = 0; c < numChannels; c++) {
    const channelData = audioBuffer.getChannelData(c)

    // Generate crazy sine
    const incr = (freq) => 2 * Math.PI / (sr / freq);
    const changeProb = gui.getValue('changeProb');

    let t = 0;
    let fq = random(30, 2000);


    for (let i = 0; i < numSamples; i++) {
      channelData[i] = Math.sin(t + incr(fq) * i);

      if (random() < changeProb) {
        fq = random(30, 2000);
      }
    }

    // Add white noise
    let noiseAmp = random(0, 1);
    const noiseAmount = gui.getValue('noiseAmount');
    
    for (let i = 0; i < numSamples; i++) {
      channelData[i] = channelData[i] + noiseAmount * noiseAmp * (Math.random() * 2 - 1);

      if (random() < changeProb) {
        fq = noiseAmp = random(0, 1);
      }
    }

    // Scramble and repeat
    if (! gui.getValue('bypassScrambler')) {
      const numCuts = 			gui.getValue('numCuts');
      const minRepeat = 		gui.getValue('minRepeat');
      const maxRepeat = 		gui.getValue('maxRepeat');
      const minCutLength = 	gui.getValue('minCutLength');
      const maxCutLength = 	gui.getValue('maxCutLength');

      for (let i = numCuts; --i >= 0;) {
        const start = Math.floor(random(0, numSamples - maxCutLength));
        const numRepeat = Math.floor(random(minRepeat, maxRepeat));
        const length = Math.floor(random(minCutLength, maxCutLength));

        for (let r = 1; r < numRepeat; ++r) {
          for (let s = 0; s < length; ++s) {
            const target = start + s + r * length;

            if (target < numSamples) {
              channelData[target] = channelData[start + s];
            }
          }
        }
      }
    }
  }

  if (gui.getValue('save')) {
  	downloadFile(bufferToWave(audioBuffer), 'glitch' + (counter++));
  }

  const bufferNode = fwd.audio.bufferNode(audioBuffer);
  const gain = fwd.audio.gain(gui.getValue('gain'));
  
  fwd.scheduler.fire(() => bufferNode.start())
  	.wait(5)
  	.fire(() => bufferNode.tearDown())
  	.fire(() => gain.tearDown())
  	.trigger();
  
  bufferNode.connect(gain);
  gain.connectToMaster();
});
