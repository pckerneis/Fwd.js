import {RootComponentHolder} from '../canvas/RootComponentHolder';
import { injectStyle } from '../StyleInjector';
import {SequencerRoot} from './canvas-components/SequencerRoot';
import {LookAndFeel, LookAndFeel_Default, LookAndFeel_Live} from './themes/LookAndFeel';

export const MIN_SEMI_H: number = 4;
export const MAX_SEMI_H: number = 30;
export const PITCH_PATTERN: number[] = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
export const MIN_PITCH: number = 0;
export const MAX_PITCH: number = 127;
export const MAX_VELOCITY: number = 127;

export interface Range {
  start: number,
  end: number,
}

export interface TimeSignature {
  upper: number,
  lower: number,
}

export interface SequencerDisplayModel {
  velocityTrackHeight: number,
  zoomSensitivity: number;
  verticalRange: Range,
  visibleTimeRange: Range,
  maxTimeRange: Range,
  signature: TimeSignature,
  adaptiveMode: boolean,
  colors: Colors,
  theme: LookAndFeel,
}

export interface Colors {
  background: string,
  backgroundAlternate: string,
  backgroundBlackKey: string,
  strokeLight: string,
  strokeDark: string,
  text: string,
  velocityHandle: string,
  velocityHandleSelected: string,
  whiteKey: string,
  blackKey: string,
  noteHigh: string,
  noteLowBlend: string,
  noteOutline: string,
  noteOutlineSelected: string,
  draggableBorder: string,
  draggableBorderHover: string,
  lassoBackground: string,
  lassoOutline: string,
}

const defaultColors: Colors = {
  background: '#ffffff',
  backgroundAlternate: '#0000000f',
  backgroundBlackKey: '#00000017',
  strokeLight: '#00000020',
  strokeDark: '#00000050',
  text: '#000000',
  velocityHandle: '#ff1906',
  velocityHandleSelected: '#00a8ff',
  whiteKey: '#ffffff',
  blackKey: '#5e5e5e',
  noteHigh: '#ff1906',
  noteLowBlend: '#d2c263',
  noteOutline: '#60606090',
  noteOutlineSelected: '#00a8ff',
  draggableBorder: '#8f8f8f',
  draggableBorderHover: '#676767',
  lassoBackground: '#00a8ff20',
  lassoOutline: '#00a8ff80',
};

export class NoteSequencer {
  public readonly container: HTMLElement;
  private _rootHolder: RootComponentHolder<SequencerRoot>;
  private readonly _model: SequencerDisplayModel;
  private readonly _sequencerRoot: SequencerRoot;

  constructor() {
    this._model = {
      velocityTrackHeight: -0.3,
      verticalRange: {start: 60, end: 72},
      visibleTimeRange: {start: 0, end: 16},
      maxTimeRange: {start: 0, end: 16},
      signature: {upper: 4, lower: 4},
      zoomSensitivity: 30,
      adaptiveMode: true,
      colors: defaultColors,
      theme: new LookAndFeel_Default(),
    };

    this.container = document.createElement('div');

    this._sequencerRoot = new SequencerRoot(this._model);
    this._rootHolder = new RootComponentHolder<SequencerRoot>(100, 100, this._sequencerRoot);

    this.container.append(this._rootHolder.canvas);
    this.container.classList.add(CONTAINER_CLASS);

    this._rootHolder.attachMouseEventListeners();
    this._rootHolder.attachResizeObserver(this.container);
  }

  public get colors(): Colors {
    return this._model.colors;
  }

  public get timeStart(): number {
    return this._model.maxTimeRange.start;
  }

  public set timeStart(value: number) {
    let numberValue: number = Number(value);

    if (isNaN(numberValue)) {
      throw new Error('Unhandled type error when setting timeStart');
    }

    this._sequencerRoot.setTimeStart(numberValue);
  }

  public get duration(): number {
    return this._model.maxTimeRange.start + this._model.maxTimeRange.end;
  }

  public set duration(newValue: number) {
    let numberValue: number = Number(newValue);

    if (isNaN(numberValue)) {
      throw new Error('Unhandled type error when setting duration');
    }

    this._sequencerRoot.setDuration(numberValue);
  }

  public get theme(): string {
    return this._model.theme.name;
  }

  public set theme(value: string) {
    switch(value) {
      case 'live':
        this._model.theme = new LookAndFeel_Live();
        break;
      case 'default':
      default:
        this._model.theme = new LookAndFeel_Default();
        break;
    }

    this.draw();
  }

  public removeMouseEventListeners(): void {
    this._rootHolder.removeMouseEventListeners();
  }

  public draw(): void {
    this._rootHolder.repaint();
  }
}

const CONTAINER_CLASS = 'fwd-runner-note-sequencer';

injectStyle('NoteSequencer', `
${CONTAINER_CLASS} {
  position: relative;
  min-width: 200px;
  min-height: 200px;
  width: 100%;
  height: 100%;
  display: inline-block;
}

${CONTAINER_CLASS} canvas {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
`);
