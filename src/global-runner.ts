import { fwd } from "./fwd/core/Fwd";
import rootLogger from './fwd/logger.fwd';
import FwdRunner from './fwd/runner/FwdRunner';
import { Overlay } from "./fwd/runner/FwdWebRunner/components/Overlay";
import FwdWebRunner from './fwd/runner/FwdWebRunner/FwdWebRunner';
import { Logger, LoggerLevel } from "./fwd/utils/dbg";

// Logger.runtimeLevel = LoggerLevel.error;
const DBG = new Logger('global-runner', rootLogger, LoggerLevel.debug);

let sketchModule: any;
let audioReady: boolean;

// TODO: action buttons are broken for now

function loadSketchModule(str: string, execute: boolean = true): void {
  sketchModule = Function(str);

  if (execute && audioReady) {
    sketchModule();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const runner: FwdRunner = new FwdWebRunner();

  runner.entryPoint = () => {
    if (sketchModule == null) {
      runner.logger.err(null, `The sketch file is not ready or could not be found.`);
    }

    sketchModule();

    if (typeof (window as any).init === 'function') {
      (window as any).init();
    } else {
      runner.logger.err(null, `It seems like your sketch doesn't export a 'init' function.`);
    }
  };

  (window as any).fwd = fwd;

  const ws = new WebSocket(location.origin.replace(/^http/, 'ws'));
  const handshakeMessage = '__HANDSHAKE__';

  ws.onmessage = msg => {
    DBG.debug('Message received from server.');

    try {
      const {type, textContent} = JSON.parse(msg.data);

      if (type === 'sketch') {
        DBG.debug('Sketch received.');
        loadSketchModule(textContent);
      } else if (type === 'cssInject') {
        DBG.debug('Stylesheet received.');
        Array.from(document.querySelectorAll('link'))
          // .filter(link => link.href.includes(path))
          .forEach(link => {
            link.href = link.href;
            DBG.debug('Refresh style sheet', link.href);
          });
      }
    } catch (e) {
      DBG.error(e);
    }
  };

  ws.onopen = () => {
    ws.send(handshakeMessage);
  };

  // Add audio gesture overlay
  const overlay = new Overlay();
  const message = document.createElement('span');
  message.innerText = 'Click anywhere or press a key to start.';
  overlay.container.style.padding = '12px';
  overlay.container.style.minHeight = '55px';
  overlay.container.style.height = '55px';
  overlay.container.style.padding = '12px';
  overlay.container.style.display = 'flex';
  overlay.container.style.alignItems = 'center';
  overlay.container.append(message);
  overlay.container.onclick = () =>  overlay.hide();

  overlay.show();

  overlay.onclose = () => {
    if (audioReady) {
      return;
    }

    DBG.info('Starting audio context.');
    runner.startAudioContext();

    audioReady = true;

    if (sketchModule !== null) {
      sketchModule();
    }

    document.removeEventListener('keydown', closeListener);
  };

  const closeListener = () => {
    overlay.hide();
  };

  document.body.addEventListener('keydown', closeListener);
});

