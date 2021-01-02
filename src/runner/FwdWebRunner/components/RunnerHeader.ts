import FwdRunner from '../../FwdRunner';
import { darkTheme, defaultTheme } from '../../style.constants';
import { commandManager } from '../commands/command-manager';
import { injectStyle } from '../StyleInjector';
import { IconButton } from './IconButton';
import { TimeDisplay } from './TimeDisplay';

export class RunnerHeader {
  public readonly htmlElement: HTMLDivElement;
  public readonly rightDrawerToggle: IconButton;

  private readonly _toolbar: HTMLElement;
  private readonly _playButton: IconButton;
  private readonly _timeDisplay: TimeDisplay;
  private _openButton: IconButton;
  private _saveButton: IconButton;
  private _undoButton: IconButton;
  private _redoButton: IconButton;

  constructor(private readonly runner: FwdRunner) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('fwd-runner-header');

    this._toolbar = document.createElement('div');
    this._toolbar.classList.add('fwd-runner-toolbar');

    this.htmlElement.append(this._toolbar);

    const spacer = () => {
      const elem = document.createElement('span');
      elem.style.flexGrow = '1';
      return elem;
    };

    const separator = () => {
      const elem = document.createElement('span');
      elem.style.flexGrow = '0';
      elem.style.borderLeft = `1px solid ${defaultTheme.border}`;
      elem.style.margin = '4px';
      return elem;
    };

    this._playButton = new IconButton('play-button');
    this._playButton.htmlElement.onclick = () => this.runner.start();

    this._timeDisplay = new TimeDisplay(this.runner.fwd.scheduler);

    this._openButton = new IconButton('folder');
    this._openButton.htmlElement.onclick = () => this.runner.openInteractive();
    this._saveButton = new IconButton('save');
    this._saveButton.htmlElement.onclick = () => this.runner.save();

    this._undoButton = new IconButton('undo');
    this._undoButton.onclick = () => commandManager.undo();
    this._redoButton = new IconButton('undo');
    this._redoButton.onclick = () => commandManager.redo();
    this._redoButton.htmlElement.style.transform = 'scale(-1, 1)';

    commandManager.historyChanged$.subscribe(() => {
      this.refreshUndoRedoButtons();
    });

    this.refreshUndoRedoButtons();

    this._toolbar.append(
      this._openButton.htmlElement,
      this._saveButton.htmlElement,
      separator(),
      this._undoButton.htmlElement,
      this._redoButton.htmlElement,
      spacer(),
      this._playButton.htmlElement,
      this._timeDisplay.htmlElement,
      spacer(),
    );
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

  private refreshUndoRedoButtons(): void {
    this._redoButton.disabled = ! commandManager.canRedo();
    this._undoButton.disabled = ! commandManager.canUndo();
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
