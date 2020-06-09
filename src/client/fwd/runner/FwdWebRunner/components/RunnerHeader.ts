import { DevClient } from '../../../../../server/DevClient';
import FwdRunner from '../../FwdRunner';
import { RunnerCodeExecutionState } from '../FwdWebRunner';
import { injectStyle } from '../StyleInjector';
import { IconButton } from './IconButton';
import { SyncStateElement } from './SyncState';
import { TimeDisplay } from './TimeDisplay';

export class RunnerHeader {
  public readonly htmlElement: HTMLDivElement;

  private readonly _toolbar: HTMLElement;
  private readonly _buildButton: IconButton;
  private readonly _playButton: IconButton;
  private readonly _saveButton: IconButton;
  private readonly _projectSelect: HTMLSelectElement;
  private readonly _autoBuildInput: HTMLInputElement;
  private readonly _timeDisplay: TimeDisplay;
  private readonly _syncStateElem: SyncStateElement;

  constructor(private readonly runner: FwdRunner, private readonly _devClient: DevClient) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('fwd-runner-header');

    this._toolbar = document.createElement('div');
    this._toolbar.classList.add('fwd-runner-toolbar');

    this.htmlElement.append(this._toolbar);

    this._projectSelect = document.createElement('select');
    this._projectSelect.classList.add('fwd-file-select');
    this._projectSelect.oninput = () => {
      // TODO warn user if unsaved changes

      // Remove all extra '*' characters
      for (let i = 0; i < this._projectSelect.options.length; ++i) {
        this._projectSelect.options.item(i).label = this._projectSelect.options.item(i).value;
      }

      this._devClient.watchFile(this._projectSelect.value);
    };

    const spacer = () => {
      const elem = document.createElement('span');
      elem.style.flexGrow = '1';
      return elem;
    };

    this._autoBuildInput = document.createElement('input');
    this._autoBuildInput.type = 'checkbox';

    const autoBuildLabel = document.createElement('label');
    autoBuildLabel.classList.add('fwd-runner-auto-build-label');
    autoBuildLabel.innerText = 'Auto-build';
    autoBuildLabel.append(this._autoBuildInput);

    this._buildButton = new IconButton('tools');
    this._playButton = new IconButton('play-button');
    this._saveButton = new IconButton('save');
    this._syncStateElem = new SyncStateElement();
    this._timeDisplay = new TimeDisplay(this.runner.fwd.scheduler);

    this._toolbar.append(
      this._projectSelect,
      this._saveButton.htmlElement,
      spacer(),
      this._playButton.htmlElement,
      this._timeDisplay.htmlElement,
      spacer(),
      autoBuildLabel,
      this._buildButton.htmlElement,
      this._syncStateElem.htmlElement,
    );

    this._autoBuildInput.oninput = () => this.runner.setAutoBuilds(this._autoBuildInput.checked);
    this._buildButton.htmlElement.onclick = () => this.runner.build();
    this._playButton.htmlElement.onclick = () => this.runner.start();
    this._saveButton.htmlElement.onclick = () => this.runner.save();
  }

  public setFiles(files: string[]): void {
    files
      .map(label => {
        const option = document.createElement('option');
        option.value = label;
        option.innerText = label;
        return option;
      }).forEach(option => {
      this._projectSelect.append(option);
    });
  }

  public onRunnerStop(): void {
    this._playButton.iconName = 'play-button';
    this._playButton.htmlElement.onclick = () => this.runner.start();
  }

  public onRunnerStart(): void {
    this._playButton.iconName = 'stop';
    this._playButton.htmlElement.onclick = () => this.runner.stop();

    this._timeDisplay.animate();
  }

  public setSyncState(syncState: RunnerCodeExecutionState): void {
    this._syncStateElem.setSyncState(syncState);
  }

  public setDirty(isDirty: boolean): void {
    const currentFileOption = this._projectSelect.options.item(this._projectSelect.options.selectedIndex);

    if (isDirty) {
      this._projectSelect.classList.add('dirty');
      currentFileOption.innerText = currentFileOption.value + '*';
    } else {
      this._projectSelect.classList.remove('dirty');
      currentFileOption.innerText = currentFileOption.value;
    }
  }
}

injectStyle('RunnerHeader', `
.fwd-runner-header {
  height: 27px;
  background: rgb(247, 248, 249);
  border-bottom: solid 1px #00000020;
  display: flex;
  user-select: none;
  flex-shrink: 0;
}

.fwd-runner-toolbar {
  display: flex;
  width: 100%;
}

.fwd-runner-toolbar .fwd-file-select {
  border: none;
  background: none;
  min-width: 120px;
}
`);
