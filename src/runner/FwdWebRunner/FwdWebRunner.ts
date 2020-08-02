import { FwdAudio } from '../../api/audio/FwdAudio';
import { FwdAudioImpl } from '../../api/audio/FwdAudioImpl';
import { FwdContext } from '../../api/core/FwdContext';
import { FlexPanel } from '../../api/editor/elements/FlexPanel/FlexPanel';
import { clearGuiManagers } from '../../api/gui/Gui';
import { DevClient } from '../../server/DevClient';
import { formatTime } from '../../utils/time';
import debounce from '../../utils/time-filters/debounce';
import FwdRunner from '../FwdRunner';
import { RunnerCodeEditor } from './components/RunnerCodeEditor';
import { RunnerFooter } from './components/RunnerFooter';
import { RunnerHeader } from './components/RunnerHeader';
import FwdWebImpl from './FwdWebImpl';
import { injectStyle } from './StyleInjector';

export type RunnerCodeExecutionState = 'up-to-date' | 'out-of-date' | 'code-errors';

export default class FwdWebRunner implements FwdRunner {
  private readonly _fwd: FwdContext;
  private readonly _audio: FwdAudio;

  private readonly _header: RunnerHeader;
  private readonly _footer: RunnerFooter;

  private codeEditor: RunnerCodeEditor;

  private _transformedSource: string;
  private _audioReady: boolean;
  private _sketchWasInitialized: boolean;
  private _running: boolean;
  private _autoBuilds: boolean;

  private _devClient: DevClient;
  private _watchedFile: string;
  private _sketchIsDirty: boolean = false;
  private _executedCode: string;
  private _savedCode: string;

  constructor() {
    this._fwd = new FwdWebImpl(this);

    this._audio = new FwdAudioImpl(this._fwd.scheduler);

    this.initDevClient();

    this._header = new RunnerHeader(this, this._devClient);
    this._footer = new RunnerFooter(this);

    this._fwd.scheduler.onEnded = () => {
      this._header.onRunnerStop();
      this._running = false;
    };

    this.buildEditor();

    this.prepareConsoleWrappers();
  }

  public get fwd(): FwdContext {
    return this._fwd;
  }

  public get audio(): FwdAudio {
    return this._audio;
  }

  public setSketchCode(newCode: string, transformedSource: string): void {
    this._transformedSource = transformedSource;
    this._savedCode = newCode;

    if (this.codeEditor) {
      this.codeEditor.code = newCode;
    }

    this.setDirty(false);

    if (this._sketchWasInitialized && this._autoBuilds) {
      this.build();
    } else {
      this.initializeSketchIfReady();
    }
  }

  public setFiles(files: string[]): void {
    this._header.setFiles(files);
  }

  public setAutoBuilds(autoBuilds: boolean): void {
    this._autoBuilds = autoBuilds;
  }

  public startAudioContext(): void {
    this._audio.start();
    this._audioReady = true;
    this.initializeSketchIfReady();
    this._footer.masterSlider.meter.audioSource = this._audio.master;
  }

  public reset(): void {
    if (this._running) {
      this.stop();
    }

    this._fwd.onInit = null;
    this._fwd.onStart = null;
    this._fwd.onStop = null;
    this._fwd.editor.reset();
    this._transformedSource = null;
    this._sketchWasInitialized = false;
    this._fwd.globals = {};
    this._fwd.scheduler.resetActions();
    clearGuiManagers();
  }

  public save(): void {
    if (! this.codeEditor) {
      throw new Error('Cannot save when code editor is not used.');
    }

    this._devClient.saveFile(this._watchedFile, this.codeEditor.code);
  }

  public start(): void {
    this.checkSketchCanBeStarted();

    this._fwd.scheduler.clearEvents();

    this._running = true;

    this.startAudioContext();
    this.fwd.onStart();
    this._fwd.scheduler.start();

    this._header.onRunnerStart();
    this._footer.applyMasterValue();
  }

  public render(duration: number, fileName: string = 'audio.wav'): void {
    this.checkSketchCanBeStarted();

    this._fwd.scheduler.clearEvents();

    this._running = true;
    const offlineContext = this._audio.startOffline(duration);
    this.fwd.onStart();
    this._fwd.scheduler.runSync(duration);
    offlineContext.startRendering().then((renderedBuffer: AudioBuffer) => {
      downloadFile(
        bufferToWave(renderedBuffer, 0, 44100 * 90),
        fileName);
    }).catch((err) => {
      console.error(err);
    });
  }

  public stop(): void {
    if (this._fwd != null) {
      this._fwd.scheduler.stop();
    }
  }

  public build(): void {
    if (this._transformedSource == null) {
      throw new Error('The sketch could not be executed');
    }

    try {
      new Function(this._transformedSource)(window);

      if (! this._sketchWasInitialized) {
        if (typeof this._fwd.onInit === 'function') {
          try {
            this._fwd.onInit();
          } catch (e) {
            console.error(e);
          }
        }

        this._sketchWasInitialized = true;
      }

      this._executedCode = this._transformedSource;
      this._header.setSyncState('up-to-date');
    } catch (e) {
      this._header.setSyncState('code-errors');
      console.error(e);
    }
  }

  //==================================================================

  private buildEditor(): void {
    this.prepareHeader();
    this.prepareFooter();
    this.buildMainSection();
  }

  private prepareConsoleWrappers(): void {
    const useWebConsole = false;

    const methodNames = ['log', 'error', 'warn', 'info'];

    const handler = {
      get: (target: any, key: any) => {
        if (methodNames.includes(key)) {
          const time = this._running ? this._fwd.scheduler.now() : null;

          if (useWebConsole) {
            return (...messages: any[]) => {
              this._footer.print(time, ...messages);

              if (time === null) {
                Reflect.get(target, key)(...messages);
              } else {
                const timeStr = formatTime(time);

                Reflect.get(target, key)(
                  `%c[${timeStr}]`,
                  'font-weight:bold; color:grey;',
                  ...messages,
                );
              }
            }
          }

          if (time != null) {
            return Function.prototype.bind.call(
              Reflect.get(target, key),   // Original method
              target,                     // ... on original console
              `%c[${formatTime(time)}]`,
              'font-weight:bold; color:grey;',
            );
          }
        }

        // Just return the original thing
        return Reflect.get(target, key);
      },
    };

    const proxyObject = new Proxy(window.console, handler);

    Object.defineProperty(window, 'console', {
      get: () => {
        return proxyObject;
      },
    });
  }

  private prepareFooter(): void {
    document.body.append(this._footer.terminalDrawer);
    document.body.append(this._footer.htmlElement);
  }

  private prepareHeader(): void {
    document.body.prepend(this._header.htmlElement)
  }

  private initializeSketchIfReady(): void {
    if (! this._sketchWasInitialized
      && this._transformedSource != null
      && this._audioReady) {
      this.build();
    }
  }

  private initDevClient(): void {
    this._devClient = new DevClient();

    this._devClient.onFilesAvailable = (files) => {
      this.setFiles(files);
      this._devClient.watchFile(files[0]);
    };

    this._devClient.onServerError = (errors: string[]) => {
      console.error(...errors);
    };

    this._devClient.onFileChange = (file, content, transformedSource) => {
      if (this._watchedFile != file) {
        this.reset();
        this._watchedFile = file;
        this.setDirty(false);
        this._header.setSyncState('out-of-date');
      }

      this.setSketchCode(content, transformedSource || content);
    };
  }

  private setDirty(isDirty: boolean): void {
    if (isDirty === this._sketchIsDirty) {
      return;
    }

    this._sketchIsDirty = isDirty;
    this._header.setDirty(isDirty);
  }

  private checkSketchCanBeStarted(): void {
    if (! this._sketchWasInitialized) {
      throw new Error('The sketch was not initialized');
    }

    if (typeof this.fwd.onStart !== 'function') {
      throw new Error(`Nothing to start.`);
    }
  }

  private buildMainSection(): void {
    const useCodeEditor = true;
    const useEditorApi = true;

    const flexPanel = new FlexPanel();
    document.getElementById('fwd-runner-container').append(flexPanel.htmlElement);

    if (useCodeEditor) {
      this.codeEditor = this.buildCodeEditor();

      flexPanel.addFlexItem('left', this.codeEditor, {
        minWidth: 100,
        maxWidth: 5000,
        width: 600,
        flexShrink: 0,
        flexGrow: useEditorApi ? undefined : 1,
      });
    }

    if (useCodeEditor && useEditorApi) {
      const separator = flexPanel.addSeparator(0, true);
      separator.separatorSize = 10;
      separator.htmlElement.classList.add('fwd-runner-large-separator');
    }

    if (useEditorApi) {
      flexPanel.addFlexItem('right', this._fwd.editor.root, {
        flexGrow: 1,
        minWidth: 100,
        maxWidth: 5000,
      });
    }
  }

  private buildCodeEditor(): RunnerCodeEditor {
    const editor = new RunnerCodeEditor();

    editor.codeMirror.on('changes', debounce(() => {
      if (this.codeEditor.code !== this._executedCode) {
        this._header.setSyncState('out-of-date');
      } else {
        this._header.setSyncState('up-to-date')
      }

      this.setDirty(this.codeEditor.code !== this._savedCode);

      if (this._autoBuilds) {
        this.build();
      }
    }, 200));

    return editor;
  }
}

injectStyle('FwdWebRunner', `
.fwd-runner-one-line-logger {
  font-family: monospace;
  margin: auto 0 auto 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fwd-runner-large-separator {
  border-left: solid 1px #00000015;
  border-right: solid 1px #00000015;
}
`);

// Convert a audio-buffer segment to a Blob using WAVE representation
function bufferToWave(audioBuffer: AudioBuffer, offset: number, len: number): Blob {
  const numOfChan = audioBuffer.numberOfChannels;
  const length = len * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const channels: Float32Array[] = [];

  let i: number;
  let sample: number;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952);                         // "RIFF"
  setUint32(length - 8);                         // file length - 8
  setUint32(0x45564157);                         // "WAVE"

  setUint32(0x20746d66);                         // "fmt " chunk
  setUint32(16);                                 // length = 16
  setUint16(1);                                  // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(audioBuffer.sampleRate);
  setUint32(audioBuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2);                      // block-align
  setUint16(16);                                 // 16-bit (hardcoded in this demo)

  setUint32(0x61746164);                         // "data" - chunk
  setUint32(length - pos - 4);                   // chunk length

  // write interleaved data
  for (i = 0; i < audioBuffer.numberOfChannels; i++)
    channels.push(audioBuffer.getChannelData(i));

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {             // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
      view.setInt16(pos, sample, true);          // update data chunk
      pos += 2;
    }
    offset++                                     // next source sample
  }

  // create Blob
  return new Blob([buffer], {type: 'audio/wav'});

  function setUint16(data: number): void {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number): void {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}

function downloadFile(blob: Blob, fileName: any): void {
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style.display = 'none';

  const url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);

  a.remove();
}

function playBack(audioBuffer: Blob): void {
  const url = window.URL.createObjectURL(audioBuffer);
  const audio = new Audio(url);
  audio.controls = true;
  audio.volume = 0.75;
  document.body.appendChild(audio);
  audio.play();
}
