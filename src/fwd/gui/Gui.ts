import { Logger } from '../utils/Logger';
import parentLogger from './logger.gui';

const DBG = new Logger('gui', parentLogger);

export interface ControlModel<T> {
    provide: () => T;
    validate: (value: T) => T;
}

export interface Slider {
    shouldBeDeleted: boolean;
    readonly htmlElement: HTMLInputElement;
    controlModel: ControlModel<number>;
}

export interface ElementOptions {
    id: string;
    className: string;

    defaultValue: number;
    min: number;
    max: number;
    step: number;
}

export type ElementOptionsAndStyle = ElementOptions & ElementCSSInlineStyle;

const defaultElementOptionsAndStyle: ElementOptionsAndStyle = {
    id: '',
    className: '',
    style: null,

    defaultValue: undefined,
    min: undefined,
    max: undefined,
    step: undefined,
};

export class GuiManager {

    public update: Function = null;

    private sliders: Slider[] = [];

    private controls: Map<string, ControlModel<number>> = new Map();

    private index: number = 0;

    private labels: HTMLElement[] = [];

    constructor(public readonly rootElement: HTMLElement) {
    }

    private static createSliderElement(): HTMLInputElement {
        const s = document.createElement('input');
        s.type = "range";
        return s;
    }

    private static createLabelElement(): HTMLSpanElement {
        return document.createElement('span');
    }

    private static setOptionOrDefault(element: HTMLInputElement, options: ElementOptions, key: keyof ElementOptions): any {
        const isOptionDefined = !!options && Object.keys(options).includes(key);
        const value = isOptionDefined ? options[key] : defaultElementOptionsAndStyle[key];
        element[key] = typeof value === 'string' ? value : value?.toString();
    }

    public label(text: string): void {
        this.createAndAddLabel(text, this.index);
        this.index++;
    }

    public horizontalSlider(modelOrId: string | ControlModel<number>, elementOptions?: ElementOptionsAndStyle): void {
        const controlModel = typeof modelOrId === 'string' ?
            (this.controls.get(modelOrId) || this.createAndAddControlModel(modelOrId, elementOptions?.defaultValue))
            : modelOrId;

        const unusedSlider = this.sliders.filter(s => !!s && s.shouldBeDeleted)[0];
        const slider = unusedSlider || this.createSlider();
        slider.shouldBeDeleted = false;

        // Do add it...
        const nextElement = this.rootElement.children.item(this.index);

        if (nextElement !== slider.htmlElement) {
            slider.htmlElement.remove();

            if (!!nextElement) {
                this.rootElement.insertBefore(slider.htmlElement, nextElement);
            } else {
                this.rootElement.append(slider.htmlElement);
            }
        }

        this.bindToControlModel(slider, controlModel);
        slider.htmlElement.value = controlModel.provide()?.toString();

        this.applyElementOptionsAndStyle(slider, elementOptions);
        this.index++;
    }

    public setValue(controlId: string, newValue: any): void {
        const control = this.controls.get(controlId);

        if (control == null) {
            this.createAndAddControlModel(controlId, newValue);
        } else if(control.provide() !== newValue) {
            control.validate(newValue);
        }
    }

    public getValue(controlId: string): number {
        return this.controls.get(controlId)?.provide();
    }

    public getValues(): any {
        const result = {};

        Array.from(this.controls.entries(), ((entry) => [entry[0], entry[1].provide()]))
            .forEach(entry => result[entry[0]] = entry[1]);

        return result;
    }

    public changed(): void {
        this.index = 0;

        this.clearLabels();

        this.sliders
          .filter(s => !!s)
          .forEach(slider => slider.shouldBeDeleted = true);

        if (this.update && typeof this.update === 'function') {
            this.update();
        }

        // Cleanup (remove excessive controls)
        this.sliders.filter(s => s.shouldBeDeleted)
            .forEach((s) => {
                s.htmlElement.remove();
                this.sliders[this.sliders.indexOf(s)] = undefined;
            });

        // Apply values (model to view)
        this.sliders
            .filter(s => !!s)
            .forEach(s => s.htmlElement.value = s.controlModel.provide()?.toString());
    }

    private clearLabels(): void {
        this.labels.forEach(label => label.remove());
        this.labels = [];
    }

    private createSlider(): Slider {
        const htmlElement = GuiManager.createSliderElement();

        const slider: Slider = { htmlElement, controlModel: null, shouldBeDeleted: false };
        this.sliders[this.index] = slider;

        DBG.info('created slider #' + this.index);
        return slider;
    }

    private bindToControlModel(slider: Slider, controlModel: ControlModel<number>): void {
        slider.controlModel = controlModel;
        slider.htmlElement.oninput = () => {
            slider.htmlElement.value = controlModel.validate(Number(slider.htmlElement.value))?.toString();
            this.changed();
        }
    }

    private applyElementOptionsAndStyle(slider: Slider, elementOptions: ElementOptionsAndStyle): void {
        slider.htmlElement.id = elementOptions?.id || '';
        slider.htmlElement.className = elementOptions?.className || '';
        GuiManager.setOptionOrDefault(slider.htmlElement, elementOptions, 'step');
        GuiManager.setOptionOrDefault(slider.htmlElement, elementOptions, 'min');
        GuiManager.setOptionOrDefault(slider.htmlElement, elementOptions, 'max');

        slider.htmlElement.removeAttribute('style');

        if (elementOptions?.style) {
            Object.keys(elementOptions.style).forEach((key) => {
                slider.htmlElement.style[key] = elementOptions.style[key];
            });
        }
    }

    private createAndAddControlModel(controlId: string, defaultValue: number): ControlModel<number> {
        let memoized = isNaN(defaultValue) ? defaultElementOptionsAndStyle.defaultValue : defaultValue;

        const controlModel = {
            provide: () => memoized,
            validate: (value: number) => { memoized = value; return value; },
        };

        this.controls.set(controlId, controlModel);

        return controlModel;
    }

    private createAndAddLabel(text: string, index: number): void {
        const labelElement = GuiManager.createLabelElement();
        labelElement.textContent = text;

        this.labels.push(labelElement);

        // Do add it...
        const nextElement = this.rootElement.children.item(index);
        if (!!nextElement) {
            this.rootElement.insertBefore(labelElement, nextElement);
        } else {
            this.rootElement.append(labelElement);
        }

        DBG.info('created label with text "' + text + '"');
    }
}

const STATIC_MAP_NAME = '__fwdGuiManagers';

if (window[STATIC_MAP_NAME] == null) {
    window[STATIC_MAP_NAME] = new Map<HTMLElement, GuiManager>();
}

const staticMap = window[STATIC_MAP_NAME] as Map<HTMLElement, GuiManager>;

export function getGuiManager(root: HTMLElement): GuiManager {
    return staticMap.get(root) || (() => {
        const guiManager = new GuiManager(root);
        staticMap.set(root, guiManager);
        return guiManager;
    })();
}

export function clearGuiManagers(): void {
    DBG.info('clear gui managers');
    staticMap.clear();
}
