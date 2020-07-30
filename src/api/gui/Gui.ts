export interface ControlModel<T> {
    provide: () => T;
    validate: (value: T) => T;
}

export interface Slider {
    readonly htmlElement: HTMLInputElement;
    controlModel: ControlModel<number>;
}

export interface ElementOptions {
    id: string;
    className: string;

    min: number;
    max: number;
    step: number;
}

export type ElementOptionsAndStyle = ElementOptions & ElementCSSInlineStyle;

const defaultElementOptionsAndStyle: ElementOptionsAndStyle = {
    id: '',
    className: '',
    style: null,

    min: 0,
    max: 1,
    step: 0.1,
}

export class GuiManager {

    public update: Function = null;

    private sliders: Slider[] = [];

    private controls: Map<string, ControlModel<number>> = new Map();
    
    private index: number = 0;
    
    constructor(public readonly rootElement: HTMLElement) {
    }

    private static createSliderElement(): HTMLInputElement {
        const s = document.createElement('input');
        s.type = "range";
        s.min = '0';
        s.max = '1';
        s.step = '0.1';

        return s;
    }
    
    private static setOptionOrDefault(element: HTMLInputElement, options: ElementOptions, key: keyof ElementOptions): any {
        const isOptionDefined = !!options && Object.keys(options).includes(key);
        const value = isOptionDefined ? options[key] : defaultElementOptionsAndStyle[key];
        element[key] = typeof value === 'string' ? value : value.toString();
    }

    public horizontalSlider(controlId: string | ControlModel<number>, elementOptions?: ElementOptionsAndStyle): void {
        const controlModel = typeof controlId === 'string' ?
            (this.controls.get(controlId) || this.createAndAddControlModel(controlId))
            : controlId;

        const slider = this.sliders[this.index] || this.createAndAddSlider();

        this.bindToControlModel(slider, controlModel);
        slider.htmlElement.value = controlModel.provide()?.toString();

        this.applyElementOptionsAndStyle(slider, elementOptions);
        this.index++;
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

    private changed(): void {
        const previousIndex = this.index;
        this.index = 0;

        //=================================================================

        if (this.update && typeof this.update === 'function') {
            this.update();
        }

        //=================================================================

        // Cleanup (remove excessive controls)
        this.sliders.filter((s, i) => i >= this.index && !!s)
            .forEach((s) => {
                s.htmlElement.remove();
                this.sliders[this.sliders.indexOf(s)] = undefined;
            });

        if (previousIndex !== this.index)

        // Apply values (model to view)
        this.sliders
            .filter(s => !!s)
            .forEach(s => s.htmlElement.value = s.controlModel.provide()?.toString());
    }
    
    private createAndAddSlider(): Slider {
        const htmlElement = GuiManager.createSliderElement();

        const slider: Slider = { htmlElement, controlModel: null };
        this.sliders[this.index] = slider;

        // Do add it...
        this.rootElement.append(htmlElement);

        console.log('created slider #' + this.index);
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

    private createAndAddControlModel(controlId: string): ControlModel<number> {
        let memoized = 0;

        const controlModel = {
            provide: () => memoized,
            validate: (value: number) => { memoized = value; return value; },
        };

        this.controls.set(controlId, controlModel);

        return controlModel;
    }
}

const STATIC_MAP_NAME = '__fwdGuiManagers';

if (window[STATIC_MAP_NAME] == null) {
    window[STATIC_MAP_NAME] = new Map<HTMLElement, GuiManager>();
}

const staticMap = window[STATIC_MAP_NAME] as Map<HTMLElement, GuiManager>;

export function getGuiManager(root: HTMLElement): GuiManager {
    return staticMap.get(root) || (() => {
        const guiManager = new GuiManager(root)
        staticMap.set(root, guiManager);
        return guiManager;
    })();
}
