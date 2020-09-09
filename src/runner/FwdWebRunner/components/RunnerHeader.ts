import { DevClient } from '../../../server/DevClient';
import FwdRunner from '../../FwdRunner';
import { RunnerClientState } from '../FwdWebRunner';
import { injectStyle } from '../StyleInjector';
import { IconButton } from './IconButton';
import { SyncStateElement } from './SyncState';
import { TimeDisplay } from './TimeDisplay';

export class RunnerHeader {
  public readonly htmlElement: HTMLDivElement;

  private readonly _toolbar: HTMLElement;
  private readonly _playButton: IconButton;
  private readonly _codeEditorButton: IconButton;
  private readonly _projectSelect: HTMLSelectElement;
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

    this._playButton = new IconButton('play-button');
    this._syncStateElem = new SyncStateElement();
    this._timeDisplay = new TimeDisplay(this.runner.fwd.scheduler);

    const firstSpacer = spacer();

    this._toolbar.append(
      this._projectSelect,
      firstSpacer,
      this._playButton.htmlElement,
      this._timeDisplay.htmlElement,
      spacer(),
      this._syncStateElem.htmlElement,
    );

    this._playButton.htmlElement.onclick = () => this.runner.start();

    if (this.runner.config.useCodeEditor) {
      this._codeEditorButton = new IconButton('edit');
      this._toolbar.insertBefore(this._codeEditorButton.htmlElement, firstSpacer);
      this._codeEditorButton.htmlElement.onclick = () => this.runner.toggleCodeEditorVisibility();
    }

    const exportButton = new IconButton('export');
    this._toolbar.insertBefore(exportButton.htmlElement, firstSpacer);
    exportButton.htmlElement.onclick = () => this.runner.toggleExportPanelVisibility();
  }

  public setFiles(files: string[]): void {
    this._projectSelect.innerHTML = '';

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

  public setSelectedFile(file: string): void {
    for (let i = 0; i < this._projectSelect.options.length; ++i) {
      this._projectSelect.options.item(i).selected = this._projectSelect.options.item(i).value === file;
    }
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

  public setRunnerClientState(newState: RunnerClientState): void {
    this._syncStateElem.setSyncState(newState);
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

.fwd-runner-auto-build-label {
  font-size: 11px;
  display: flex;
    align-items: center;
}

.fwd-file-select.dirty {
  font-style: italic;
}
`);
