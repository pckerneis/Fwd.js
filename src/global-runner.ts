import { fwd } from "./fwd/core/Fwd";
import rootLogger from './fwd/logger.fwd';
import FwdRunner from './fwd/runner/FwdRunner';
import { Overlay } from "./fwd/runner/FwdWebRunner/components/Overlay";
import FwdWebRunner from './fwd/runner/FwdWebRunner/FwdWebRunner';
import { Logger, LoggerLevel } from "./fwd/utils/Logger";
import declareAPI from "./global-api";

// Logger.runtimeLevel = LoggerLevel.error;
const DBG = new Logger('global-runner', rootLogger, LoggerLevel.debug);

declareAPI('Fwd');

document.addEventListener('DOMContentLoaded', () => {
  const runner: FwdRunner = new FwdWebRunner();

  (window as any).fwd = fwd;

  const ws = new WebSocket(location.origin.replace(/^http/, 'ws'));
  const handshakeMessage = '__HANDSHAKE__';

  ws.onmessage = msg => {
    DBG.debug('Message received from server.');

    try {
      const {type, textContent} = JSON.parse(msg.data);
      DBG.debug(type);

      if (type === 'sketch') {
        DBG.debug('Sketch received.');
        runner.setSketchCode(textContent);
      } else if (type === 'cssInject') {
        DBG.debug('Stylesheet received.');
        Array.from(document.querySelectorAll('link'))
          // .filter(link => link.href.includes(path))
          .forEach(link => {
            link.href = link.href;
            DBG.debug('Refresh style sheet', link.href);
          });
      } else if (type === 'refresh') {
        DBG.debug('Refreshing...');
        location.reload();
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

  const closeListener = () => {
    overlay.hide();
  };

  overlay.onclose = () => {
    DBG.info('Starting audio context.');
    runner.startAudioContext();
    document.removeEventListener('keydown', closeListener);
  };

  document.body.addEventListener('keydown', closeListener);
});
