import { RunnerClientState } from '../FwdWebRunner';
import { injectStyle } from '../StyleInjector';

export class SyncStateElement {
  public readonly htmlElement: HTMLElement;

  private _runnerClientState: RunnerClientState;

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('fwd-runner-sync-state');
  }

  private static getStateDisplayString(state: RunnerClientState): string {
    switch (state) {
      case RunnerClientState.codeErrors:    return 'Code has error(s)';
      case RunnerClientState.upToDate:      return 'Up to date';
      case RunnerClientState.outOfDate:     return 'Out of date';
      case RunnerClientState.disconnected:  return 'Disconnected';
      case RunnerClientState.connected:     return 'Connected';
      default:                              return '';

    }
  }

  public setSyncState(newState: RunnerClientState): void {
    if (newState === this._runnerClientState) {
      return;
    }

    if (this._runnerClientState) {
      this.htmlElement.classList.replace(this._runnerClientState, newState);
    }

    this.htmlElement.classList.add(newState);
    this.htmlElement.title = SyncStateElement.getStateDisplayString(newState);

    this._runnerClientState = newState;
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

.fwd-runner-sync-state.upToDate {
  background: #15f765;
}

.fwd-runner-sync-state.outOfDate,
.fwd-runner-sync-state.connected {
  background: #ffe52a;
}

.fwd-runner-sync-state.codeErrors {
  background: #ff4242;
}
`);
