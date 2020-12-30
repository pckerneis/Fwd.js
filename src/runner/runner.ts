import * as FwdRuntime from '../fwd/FwdRuntime';
import rootLogger from '../fwd/logger.fwd';
import { Logger, LoggerLevel } from "../fwd/utils/Logger";
import FwdRunner from './FwdRunner';
import { Overlay } from "./FwdWebRunner/components/Overlay";
import FwdWebRunner from './FwdWebRunner/FwdWebRunner';

const DBG = new Logger('global-runner', rootLogger, LoggerLevel.error);

document.addEventListener('DOMContentLoaded', () => {
  const runner: FwdRunner = new FwdWebRunner(FwdRuntime.getContext(''), {
    writeToFile: true,
    useConsoleRedirection: false,
    useConsoleTimePrefix: true,
    darkMode: false,
  });

  (window as any).fwd = runner.fwd;

  // Add audio gesture overlay
  const overlay = new Overlay({
    hideWhenContainerClicked: true,
    hideWhenBackdropClicked: true,
  });
  const message = document.createElement('span');
  message.innerText = 'Click anywhere or press a key to start.';
  overlay.container.style.padding = '12px';
  overlay.container.style.display = 'flex';
  overlay.container.style.alignItems = 'center';
  overlay.container.append(message);

  overlay.show();

  const closeListener = () => {
    overlay.hide();
  };

  overlay.onclose = () => {
    DBG.info('Starting audio context.');
    runner.fwd.audio.start();
    runner.runCode();
    document.removeEventListener('keydown', closeListener);
  };

  document.body.addEventListener('keydown', closeListener);
});
