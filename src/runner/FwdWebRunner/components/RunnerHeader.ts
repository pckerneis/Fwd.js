import { DevClient } from '../../../server/DevClient';
import FwdRunner from '../../FwdRunner';
import { darkTheme, defaultTheme } from '../../style.constants';
import { injectStyle } from '../StyleInjector';
import { IconButton } from './IconButton';
import { TimeDisplay } from './TimeDisplay';

export class RunnerHeader {
  public readonly htmlElement: HTMLDivElement;
  public readonly rightDrawerToggle: IconButton;

  private readonly _toolbar: HTMLElement;
  private readonly _playButton: IconButton;
  private readonly _programSelect: HTMLSelectElement;
  private readonly _timeDisplay: TimeDisplay;
  private readonly _newProgramButton: IconButton;

  constructor(private readonly runner: FwdRunner, private readonly _devClient: DevClient) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('fwd-runner-header');

    this._toolbar = document.createElement('div');
    this._toolbar.classList.add('fwd-runner-toolbar');

    this.htmlElement.append(this._toolbar);

    this._programSelect = document.createElement('select');
    this._programSelect.classList.add('fwd-file-select');
    this._programSelect.oninput = () => {
      // TODO warn user if unsaved changes

      // Remove all extra '*' characters
      for (let i = 0; i < this._programSelect.options.length; ++i) {
        this._programSelect.options.item(i).label = this._programSelect.options.item(i).value;
      }

      this._devClient.watchFile(this._programSelect.value);
    };

    this._newProgramButton = new IconButton('add');
    this._newProgramButton.htmlElement.onclick = () => this.runner.createNewProgram();

    const spacer = () => {
      const elem = document.createElement('span');
      elem.style.flexGrow = '1';
      return elem;
    };

    const firstSpacer = spacer();

    this._playButton = new IconButton('play-button');
    this._playButton.htmlElement.onclick = () => this.runner.start();

    this._timeDisplay = new TimeDisplay(this.runner.fwd.scheduler);

    this.rightDrawerToggle = new IconButton('tools');
    // TODO
    // this.rightDrawerToggle.htmlElement.onclick = () => this.runner.toggleRightDrawerVisibility();

    this._toolbar.append(
      this._programSelect,
      this._newProgramButton.htmlElement,
      firstSpacer,
      this._playButton.htmlElement,
      this._timeDisplay.htmlElement,
      spacer(),
      this.rightDrawerToggle.htmlElement,
    );
  }

  public setFiles(files: string[]): void {
    this._programSelect.innerHTML = '';

    files
      .map(label => {
        const option = document.createElement('option');
        option.value = label;
        option.innerText = label;
        return option;
      }).forEach(option => {
      this._programSelect.append(option);
    });
  }

  public setSelectedFile(file: string): void {
    for (let i = 0; i < this._programSelect.options.length; ++i) {
      this._programSelect.options.item(i).selected = this._programSelect.options.item(i).value === file;
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
    const currentFileOption = this._programSelect.options.item(this._programSelect.options.selectedIndex);

    if (isDirty) {
      this._programSelect.classList.add('dirty');
      currentFileOption.innerText = currentFileOption.value + '*';
    } else {
      this._programSelect.classList.remove('dirty');
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
