import { RunnerCodeExecutionState } from '../FwdWebRunner';
import { injectStyle } from '../StyleInjector';

export class SyncStateElement {
  public readonly htmlElement: HTMLElement;

  private _syncState: RunnerCodeExecutionState;

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('fwd-runner-sync-state');
  }

  private static getStateDisplayString(state: RunnerCodeExecutionState): string {
    switch (state) {
      case 'code-errors':   return 'Code has error(s)';
      case 'up-to-date':    return 'Up to date';
      case 'out-of-date':   return 'Out of date';
      default:              return '';

    }
  }

  public setSyncState(newState: RunnerCodeExecutionState): void {
    if (newState === this._syncState) {
      return;
    }

    if (this._syncState) {
      this.htmlElement.classList.replace(this._syncState, newState);
    }

    this.htmlElement.classList.add(newState);
    this.htmlElement.title = SyncStateElement.getStateDisplayString(newState);

    this._syncState = newState;
  }
}

injectStyle('SyncStateElement', `
.fwd-runner-sync-state {
  margin: auto 10px auto 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: inset 1px 1px 4px 0 #00000020;
  border: 1px solid #00000069;
}

.fwd-runner-sync-state.up-to-date {
  background: #15f765;
}

.fwd-runner-sync-state.out-of-date {
  background: #ffe52a;
}

.fwd-runner-sync-state.code-errors {
  background: #ff4242;
}
`);
