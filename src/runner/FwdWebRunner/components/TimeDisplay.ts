import { FwdScheduler } from '../../../api/core/FwdScheduler';
import { formatTime } from '../../../utils/time';
import { injectStyle } from '../StyleInjector';

export class TimeDisplay {
  public readonly htmlElement: HTMLSpanElement;

  constructor(private readonly scheduler: FwdScheduler) {
    this.htmlElement = document.createElement('span');
    this.htmlElement.classList.add('fwd-time-display');

    this.updateTime();
  }

  public animate(): void {
    this.updateTime();
  }

  private updateTime(): void {
    this.htmlElement.innerText = this.getTimeString();

    if (this.scheduler.state !== 'stopped') {
      requestAnimationFrame(() => this.updateTime());
    }
  }

  private getTimeString(): string {
    return formatTime(this.scheduler.clock());
  }
}

injectStyle('TimeDisplay', `
.fwd-time-display {
    color: #525252;
    font-family: monospace;
    border: 1px solid #00000026;
    padding: 0px 10px;
    margin: auto 4px;
    font-size: 15px;
    border-radius: 2px;
    background: #00000005;
}
`);
