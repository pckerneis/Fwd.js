import { init } from './sketch';
import { fwdInit } from './fwd';
import Split from 'split.js'
import { FwdLogger } from './fwd/core/fwd';

document.addEventListener('DOMContentLoaded', () => {
  loadScriptContent();
  prepareLayout();

  document.getElementById('start').onclick = () => {
    const fwd = fwdInit({ fwdLogger: prepareLogger() });
    init(fwd);
    fwd.start();
  };
});

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