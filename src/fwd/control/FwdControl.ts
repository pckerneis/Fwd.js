type ControlType = 'slider';

export interface ValueSource<T> {
  get(): T;
}

//=============================================================

export interface SliderOptions {
  defaultValue: number,
  min: number,
  max: number,
  step: number,
}

export const defaultSliderOptions: SliderOptions = {
  defaultValue: 1,
  min: 0,
  max: 0,
  step: 0.01,
};

export class FwdSlider {

  public readonly min: number;

  public readonly max: number;

  public readonly step: number;

  public readonly type: ControlType = 'slider';

  // TODO: FwdSlider should be the value source...
  constructor(private _valueSource: ValueSource<number>, options: SliderOptions) {
    this.min = options.min;
    this.max = options.max;
    this.step = options.step;
  }

  public get value(): number { return this._valueSource.get(); }
}

//=============================================================

export type WriteMode = 'insert' | 'overwrite';

export interface TextEditorOptions {
  maxLength: number,
  defaultValue: string,
  writeMode: WriteMode,
}

export const defaultTextEditorOptions: TextEditorOptions = {
  maxLength: Infinity,
  defaultValue: '',
  writeMode: 'insert',
};

export class FwdTextEditor {

  public readonly maxLength: number;
  public readonly writeMode: WriteMode;

  constructor(private _valueSource: ValueSource<string>, options: TextEditorOptions) {
    this.maxLength = options.maxLength;
    this.writeMode = options.writeMode;
  }

  public get value(): string { return this._valueSource.get(); }

}

//=============================================================

export type FwdController = FwdSlider | FwdTextEditor;

export interface FwdControls {
  readonly htmlElement: HTMLElement;

  reset(): void;

  addSlider(name: string, options: Partial<SliderOptions>): FwdSlider;
  getSlider(name: string): FwdSlider;

  addTextEditor(name: string, options: Partial<TextEditorOptions>): FwdTextEditor;
  getTextEditor(name: string): FwdTextEditor;
}

