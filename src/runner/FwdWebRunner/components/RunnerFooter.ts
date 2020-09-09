import { parseNumber } from '../../../fwd/utils/numbers';
import { formatTime } from '../../../fwd/utils/time';
import audit from '../../../fwd/utils/time-filters/audit';
import FwdRunner from '../../FwdRunner';
import { darkTheme, defaultTheme } from '../../style.constants';
import { injectStyle } from '../StyleInjector';
import { FwdWebConsole } from './Console';
import { IconButton } from './IconButton';
import { MasterSlider } from './MasterSlider';

export class RunnerFooter {
  public readonly htmlElement: HTMLElement;
  public readonly terminalDrawer: HTMLElement;

  public readonly _webConsole: FwdWebConsole;

  public readonly masterSlider: MasterSlider;

  private _oneLineLogger: HTMLLabelElement;

  constructor(private readonly runner: FwdRunner) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('fwd-runner-footer');

    this.terminalDrawer = document.createElement('div');
    this.terminalDrawer.classList.add('fwd-runner-terminal-drawer');
    this.terminalDrawer.style.display = 'none';

    this._oneLineLogger = document.createElement('label');
    this._oneLineLogger.classList.add('fwd-runner-one-line-logger');
    this._oneLineLogger.style.cursor = 'default';

    const terminalButton = new IconButton('terminal');
    terminalButton.htmlElement.id = 'terminal-drawer-toggle';
    this._oneLineLogger.htmlFor = terminalButton.htmlElement.id;
    terminalButton.htmlElement.onclick = () => this.toggleTerminalDrawer();

    this.masterSlider = new MasterSlider();
    this.masterSlider.slider.oninput = audit(() => this.applyMasterValue());

    this.htmlElement.append(terminalButton.htmlElement, this._oneLineLogger, this.masterSlider.htmlElement);

    this._webConsole = new FwdWebConsole();
    this.terminalDrawer.append(this._webConsole.htmlElement);
  }

  public print(time: number, ...messages: any[]): void {
    this._webConsole.print(time, ...messages);

    if (time === null) {
      this._oneLineLogger.innerText = messages[messages.length - 1];
    } else {
      const timeStr = formatTime(time);
      this._oneLineLogger.innerText = timeStr + ' ' + messages[messages.length - 1];
    }
  }

  public applyMasterValue(): void {
    const masterSlider = this.masterSlider.slider;
    const masterGain = this.runner.fwd.audio.master.gain;
    const now = this.runner.fwd.audio.context.currentTime;
    const value = parseNumber(masterSlider.value) / 100;
    masterGain.linearRampToValueAtTime(value, now + 0.01);
  }

  private toggleTerminalDrawer(): void {
    if (this.terminalDrawer.style.display === 'none') {
      this.terminalDrawer.style.display = 'flex';
      this._oneLineLogger.style.display = 'none';
    } else {
      this.terminalDrawer.style.display = 'none';
      this._oneLineLogger.style.display = 'block';
    }
  }
}

injectStyle('RunnerFooter', `
.fwd-runner-footer {
  height: 26px;
  background: ${defaultTheme.bgSecondary};
  border-top: solid 1px #00000020;
  display: flex;
  user-select: none;
  flex-shrink: 0;
}

.fwd-runner-terminal-drawer {
  background: ${defaultTheme.bgSecondary};
  border-top: solid 1px #00000020;
  display: flex;
}

.fwd-runner-dark-mode .fwd-runner-footer,
.fwd-runner-dark-mode .fwd-runner-terminal-drawer {
  background: ${darkTheme.bgSecondary};
}
`);
