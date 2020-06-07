import {
  CSS_TYPE,
  HANDSHAKE_MESSAGE,
  PING_MESSAGE,
  PONG_MESSAGE, REFRESH_TYPE,
  SKETCH_TYPE, WATCH_TYPE,
  WELCOME_TYPE,
} from '../server/DevServer.constants';
import { fwd } from "./fwd/core/fwd";
import rootLogger from './fwd/logger.fwd';
import FwdRunner from './fwd/runner/FwdRunner';
import { Overlay } from "./fwd/runner/FwdWebRunner/components/Overlay";
import FwdWebRunner from './fwd/runner/FwdWebRunner/FwdWebRunner';
import { Logger, LoggerLevel } from "./fwd/utils/Logger";
import declareAPI from "./global-api";

const DBG = new Logger('global-runner', rootLogger, LoggerLevel.error);

declareAPI('Fwd');

document.addEventListener('DOMContentLoaded', () => {
  const runner: FwdRunner = new FwdWebRunner();

  (window as any).fwd = fwd;

  const ws = new WebSocket(location.origin.replace(/^http/, 'ws'));

  let watchedFile: string = null;

  ws.onmessage = msg => {
    DBG.debug('Message received from server.');

    if (msg.data == PING_MESSAGE) {
      ws.send(PONG_MESSAGE);
      return;
    }

    try {
      const {type, textContent, files, file} = JSON.parse(msg.data);
      DBG.debug(type);

      if (type === WELCOME_TYPE) {
        DBG.debug('Welcome received.');

        runner.setFiles(files);

        ws.send(JSON.stringify({
          type: WATCH_TYPE,
          file: files[0],
        }));
      } else if (type === SKETCH_TYPE) {
        DBG.debug('Sketch received.');

        if (watchedFile != file) {
          runner.reset();
          watchedFile = file;
        }

        runner.setSketchCode(textContent);
      } else if (type === CSS_TYPE) {
        DBG.debug('Stylesheet received.');
        Array.from(document.querySelectorAll('link'))
          .forEach(link => {
            link.href = link.href;
            DBG.debug('Refresh style sheet', link.href);
          });

      } else if (type === REFRESH_TYPE) {
        DBG.debug('Refreshing...');
        location.reload();
      }
    } catch (e) {
      DBG.error(e);
    }
  };

  ws.onopen = () => {
    ws.send(HANDSHAKE_MESSAGE);
  };

  // Change runner on sketch file change
  runner.onSketchFileChange = (file) => {
    ws.send(JSON.stringify({
      type: 'watch',
      file,
    }));
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
