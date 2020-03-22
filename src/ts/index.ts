import Split from 'split.js'
import { fwdInit, FwdLogger, Fwd } from './fwd';
import { init as initSketch } from './sketch';
import hljs from 'highlightjs';
import { Time } from './fwd/core';

const startButtonId = 'start-button';
const stopButtonId = 'stop-button';
const masterSliderId = 'master-slider';

document.addEventListener('DOMContentLoaded', () => {
  loadScriptContent();
  prepareLayout();
  initializeHighlightJS();
  initializeMainControls();
});

function initializeMainControls() {
  let fwd: Fwd = null;
  const masterSlider = document.getElementById(masterSliderId) as HTMLInputElement;
  const startButton = document.getElementById(startButtonId) as HTMLButtonElement;
  const stopButton = document.getElementById(stopButtonId) as HTMLButtonElement;

  startButton.onclick = () => {
    if (fwd != null) {
      fwd.stop();
    }

    fwd = fwdInit({ fwdLogger: prepareLogger() });
    applyMasterValue();
    initSketch();
    fwd.start();
  };

  stopButton.onclick = () => {
    if (fwd != null) {
      fwd.stop();
    }
  };

  masterSlider.oninput = () => applyMasterValue();

  function applyMasterValue() {
    if (fwd != null) {
      const v = parseNumber(masterSlider.value) / 100;
      fwd.audio.master.nativeNode.gain.linearRampToValueAtTime(v, 0);
    }    
  }
}

function initializeHighlightJS() {
  document.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightBlock(block);
  });
}

function loadScriptContent() {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', 'src/ts/sketch.ts', false);
  xhr.send();

  if (xhr.status == 200) {
    document.getElementById('sketch-code').innerText = xhr.responseText;
  }
}

function prepareLayout() {  
  // Prepare split layout
  Split(['#editor', '#console'], {
      sizes: [70, 30],
      minSize: [0, 0],
      direction: 'vertical',
      gutterSize: 6,
      snapOffset: 80
    }
  );
}

function prepareLogger(): FwdLogger {
  const consoleDiv = document.getElementById('console');
  const consoleCode = consoleDiv.children[0];
  const autoScroll = true;

  if (!consoleCode || !consoleDiv) {
    return { log: console.log, err: console.error };
  }

  const internalLog = (timeStr: string, ...messages: any[]) => {
    consoleCode.innerHTML += [timeStr, ...messages].join(' ');
    consoleCode.innerHTML += '\n';

    if (autoScroll) {
      consoleDiv.scrollTop = consoleDiv.scrollHeight;
    }    
  }

  return {
    log(time, messages) {
      const timeStr = formatTime(time);
      internalLog(timeStr, ...messages);
      console.log(timeStr, ...messages);
    },
    
    err(time, messages) {
      const timeStr = formatTime(time);
      internalLog(timeStr, ...messages);
      console.error(timeStr, ...messages);
    }
  };
}

function parseNumber(number: string) {
  return number == null ? 0 : 
    (typeof number === 'number' ? number :
      (typeof number === 'string' ? Number.parseFloat(number) : 0));
}

function formatTime(t: Time) {
  const seconds = Math.floor((t / 1000) % 60);
  const minutes = Math.floor((t / 1000 / 60));
  const ms = Math.floor(t % 1000);

  return [
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
    ms.toString().padStart(3, '0').substr(0, 3)
  ].join(':');
}