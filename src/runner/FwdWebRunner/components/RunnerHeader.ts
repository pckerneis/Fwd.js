import { DevClient } from '../../../server/DevClient';
import FwdRunner from '../../FwdRunner';
import { darkTheme, defaultTheme } from '../../style.constants';
import { RunnerClientState } from '../FwdWebRunner';
import { injectStyle } from '../StyleInjector';
import { IconButton } from './IconButton';
import { SyncStateElement } from './SyncState';
import { TimeDisplay } from './TimeDisplay';

export class RunnerHeader {
  public readonly htmlElement: HTMLDivElement;
  public readonly rightDrawerToggle: IconButton;

  private readonly _toolbar: HTMLElement;
  private readonly _playButton: IconButton;
  private readonly _projectSelect: HTMLSelectElement;
  private readonly _timeDisplay: TimeDisplay;

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
    this._playButton.htmlElement.onclick = () => this.runner.start();

    this._timeDisplay = new TimeDisplay(this.runner.fwd.scheduler);

    const firstSpacer = spacer();

    this.rightDrawerToggle = new IconButton('tools');
    this.rightDrawerToggle.htmlElement.onclick = () => this.runner.toggleRightDrawerVisibility();

    this._toolbar.append(
      this._projectSelect,
      firstSpacer,
      this._playButton.htmlElement,
      this._timeDisplay.htmlElement,
      spacer(),
      this.rightDrawerToggle.htmlElement,
    );
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
}

injectStyle('RunnerHeader', `
.fwd-runner-header {
  background: ${defaultTheme.bgSecondary};
  border-bottom: solid 1px ${defaultTheme.border};
  display: flex;
  user-select: none;
  flex-shrink: 0;
  height: 2rem;
}

.fwd-runner-toolbar {
  display: flex;
  width: 100%;
}

.fwd-runner-toolbar .fwd-file-select {
  min-width: 120px;
}

.fwd-file-select.dirty {
  font-style: italic;
}

.fwd-runner-dark-mode .fwd-runner-header {
  background: ${darkTheme.bgSecondary};
  border-bottom: solid 1px ${darkTheme.border};
}
`);
