import {RootComponentHolder} from './canvas-components/RootComponentHolder';
import {SequencerRoot} from './canvas-components/SequencerRoot';
import {LookAndFeel, LookAndFeel_Default, LookAndFeel_Live} from './themes/LookAndFeel';

export const MIN_SEMI_H: number = 4;
export const MAX_SEMI_H: number = 30;
export const PITCH_PATTERN: number[] = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
export const MIN_PITCH: number = 0;
export const MAX_PITCH: number = 127;
export const MAX_VELOCITY: number = 127;

declare class ResizeObserver {
  constructor(...args: any[]);

  public observe(element: HTMLElement, options?: any): any;
}

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

/**
 * A canvas-based note sequencer.
 *
 * @noInheritDoc
 */
export class NoteSequencer {
  public static readonly TIME_START: string = 'time-start';
  public static readonly DURATION: string = 'duration';
  public static readonly THEME: string = 'theme';

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

    const styleElement = document.createElement('style');
    styleElement.innerHTML = CSS_STYLE;
    this.container.append(styleElement);

    // Events handlers
    const resizeObserver = new ResizeObserver(() => this.resizeAndDraw());
    resizeObserver.observe(this.container);

    this._rootHolder.attachMouseEventListeners();
  }

  /**
   * HTML tag name used for this element.
   */
  public static get tag(): string {
    return 'note-sequencer';
  }

  /**
   * Observed HTML attributes (custom element implementation).
   */
  public static get observedAttributes(): string[] {
    return [
      NoteSequencer.TIME_START,
      'duration',
      'pitch-start',
      'pitch-end',
    ];
  }

  public get colors(): Colors {
    return this._model.colors;
  }

  // Attributes/properties reflection

  /**
   * First time value to show.
   */
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

  /**
   * Maximum visible time range from timeStart.
   */
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

  /**
   * Set the current theme. Defaults to 'default'.
   */
  public get theme(): string {
    return this._model.theme.name;
  }

  /**
   * Set the current theme. Defaults to 'default'.
   */
  public set theme(value: string) {
    switch(value) {
      case 'live':
        this._model.theme = new LookAndFeel_Live();
        break;
      case 'default':
      default:
        this._model.theme = new LookAndFeel_Default();
        value = 'default';
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

  private resizeAndDraw(): void {
    const boundingClientRect = this.container.getBoundingClientRect();
    this._rootHolder.resize(Math.ceil(boundingClientRect.width), Math.ceil(boundingClientRect.height));
    this.draw();
  }
}

const CSS_STYLE = `
:host {
  position: relative;
  min-width: 200px;
  min-height: 200px;
  width: 100%;
  height: 100%;
  display: inline-block;
}

canvas {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
`;
