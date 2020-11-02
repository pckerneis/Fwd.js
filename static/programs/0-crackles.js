let counter = 0;

const gui = fwd.gui.getGuiManager(fwd.editor.root.htmlElement);

gui.update = () => {
  gui.rootElement.style.display = 'grid';
  gui.rootElement.style.gridTemplateColumns = '2fr 2fr 1fr';
  gui.rootElement.style.gridAutoRows = '1.5rem';
  gui.rootElement.style.padding = '6px';
  gui.rootElement.style.width = '100%';

  labeledSwitch(gui, 'save', 0);

  header('Global');
  labeledSlider(gui, 'duration', { defaultValue: 5, min: 1, max: 20, step: 0.01 });
  labeledSwitch(gui, 'stereo', 1);
  labeledSlider(gui, 'gain', { defaultValue: 0.2, min: 0, max: 1, step: 0.01 });

  header('Burst');
  labeledSlider(gui, 'bufferSize', { defaultValue: 373, min: 1, max: 512 });
  labeledSlider(gui, 'sizeNoise', { defaultValue: 64, min: 0, max: 512 });

  labeledSlider(gui, 'attack', { defaultValue: 0, min: 0, max: 512 });
  labeledSlider(gui, 'attackNoise', { defaultValue: 1, min: 0, max: 512 });

  labeledSlider(gui, 'release', { defaultValue: 230, min: 0, max: 2048 });
  labeledSlider(gui, 'releaseNoise', { defaultValue: 180, min: 0, max: 512 });
  
  header('Cloud');
  labeledSlider(gui, 'numParticles', { defaultValue: 20, min: 1, max: 100 });
  labeledSlider(gui, 'timeSpan', { defaultValue: 6, min: 1, max: 10 });
  labeledSlider(gui, 'noiseScale', { defaultValue: 0.3, min: 0.001, max: 2, step: 0.001 });
  
  header('Reverb');
  labeledSlider(gui, 'dryGain', { defaultValue: 1, min: 0, max: 2, step: 0.001 });
  labeledSlider(gui, 'wetGain', { defaultValue: 1, min: 0, max: 2, step: 0.001 });
};

gui.changed();

fwd.onStart = () => {
  const rvb = fwd.audio.reverb(1);
  rvb.wetGain.gain.value = gui.getValue('wetGain');
  rvb.dryGain.gain.value = gui.getValue('dryGain');
  rvb.connectToMaster();
  
  const chain = fwd.scheduler
    .fire('cloud', rvb)
    .wait(() => gui.getValue('duration'))
  	.continueIfStillRunning()
  	.fire(() => chain.trigger());
  
  chain.trigger();
};

fwd.scheduler.set('cloud', (rvb) => {
  rvb.wetGain.gain.value = gui.getValue('wetGain');
  rvb.dryGain.gain.value = gui.getValue('dryGain');
  
  const timeSpan = gui.getValue('timeSpan');
  const noiseScale = gui.getValue('noiseScale');
  const numParticles = gui.getValue('numParticles');
  
	for (let i = 0; i < numParticles; ++i) {
    let t = Math.abs(fwd.utils.simplex(fwd.scheduler.clock() * noiseScale, i * noiseScale)) * timeSpan;
    fwd.scheduler.wait(t).fire('burst', rvb).trigger();
  }
});

fwd.scheduler.set('burst', (rvb) => {
  const attNoise = gui.getValue('attackNoise');
  const attack = Math.max(1, Math.floor(gui.getValue('attack') + fwd.utils.random(-attNoise, attNoise)));

  const releaseNoise = gui.getValue('releaseNoise');
  const release = Math.max(1, Math.floor(gui.getValue('release') + fwd.utils.random(-releaseNoise, releaseNoise)));

  const sizeNoise = gui.getValue('sizeNoise');
  const bufferSize = Math.max(1, Math.floor(gui.getValue('bufferSize') + fwd.utils.random(-sizeNoise, sizeNoise)));

  const numChannels = gui.getValue('stereo') ? 2 : 1;
  
  const numSamples = Math.floor(44100 * gui.getValue('duration'));
  const sr = 44100;
  
  const audioBuffer = new AudioContext().createBuffer(numChannels, attack + release, sr);
  const randomArray = [...Array(bufferSize)].map(() => fwd.utils.random(-1, 1));
  
  const burstPeak = fwd.utils.random(0.5, 1.1);
  
  for (let c = 0; c < numChannels; c++) {
    const channelData = audioBuffer.getChannelData(c);
    
    // white noise
    for (let i = 0; i < numSamples; i++) {
      const env = i < attack ? fwd.utils.map(i, 0, attack, 0, burstPeak)
      	: fwd.utils.map(i - attack, 0, release, burstPeak, 0);

      const gain = fwd.audio.utils.decibelsToGain(fwd.utils.map(env, 0, 1, -80, 0));
      
      channelData[i] = gain * randomArray[i % bufferSize];
    }
  }

  if (gui.getValue('save')) {
    fwd.audio.utils.downloadFile(
      fwd.audio.utils.bufferToWave(audioBuffer), 'glitch' + (counter++));
  }

  const bufferNode = fwd.audio.bufferNode(audioBuffer);
  const gain = fwd.audio.gain(gui.getValue('gain'));

  fwd.scheduler
    .fire(() => bufferNode.start())
  	.wait(5)
  	.fire(() => bufferNode.tearDown())
  	.fire(() => gain.tearDown())
  	.trigger();
  
  bufferNode.connect(gain);
  gain.connect(rvb);
});

function header(text) {
  gui.label(text, { style: { 
    gridColumn: '1 / span 3',
    fontWeight: 'bold',
    background: '#88888820',
    padding: '2px',
  }});
}

function labeledSlider(gui, name, options) {
  gui.label(name);

  gui.slider(name, { 
    ...options,
    cssClasses: ["slider"],
  });

  gui.slider(name, {
    ...options,
    type: 'number', 
    style: { maxWidth: '80px', margin: '1px 4px' },
  });
}

function labeledSwitch(gui, name, defaultValue) {
  gui.label(name);
  gui.slider(name, { 
    defaultValue,
    min: 0,
    max: 1,
    step: 1,
    style: { maxWidth: '50px', margin: 'auto' },
    cssClasses: ['slider']
  });

  gui.slider(name, {type: 'number', style: { maxWidth: '80px', margin: '1px 4px' } });
}
