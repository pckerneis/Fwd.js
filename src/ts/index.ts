import Split from 'split.js'
import { fwdInit, FwdLogger, Fwd } from './fwd';
import { init as initSketch } from './sketch';
import hljs from 'highlightjs';

const startButtonId = 'start-button';
const stopButtonId = 'stop-button';

document.addEventListener('DOMContentLoaded', () => {
  let fwd: Fwd = null;

  loadScriptContent();
  prepareLayout();
  initializeHighlightJS();

  document.getElementById(startButtonId).onclick = () => {
    if (fwd != null) {
      fwd.stop();
    }

    fwd = fwdInit({ fwdLogger: prepareLogger() });
    initSketch(fwd);
    console.log(fwd);
    fwd.start();
  };

  document.getElementById(stopButtonId).onclick = () => {
    if (fwd != null) {
      fwd.stop();
    }
  };
});

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
    return { log: console.log };
  }

  return { 
    log(messages) {
      console.log(...messages);

      consoleCode.innerHTML += messages.join(' ');
      consoleCode.innerHTML += '\n';

      if (autoScroll) {
        consoleDiv.scrollTop = consoleDiv.scrollHeight;
      }
    }
  };
}