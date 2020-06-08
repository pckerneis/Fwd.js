import { DevClient } from '../server/DevClient';
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
