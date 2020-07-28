class GuiManager {
    sliders = [];
    index = 0;
    update = null;

    horizontalSlider(provider, validator) {
        if (this.sliders[this.index] == null) {
            const s = GuiManager.createSlider();
            this.sliders[this.index] = s;

            s.oninput = () => {
                s.value = s.validator(s.value);
                this.changed();
            }

            // Do add it...
            fwd.editor.root.htmlElement.append(s);

            console.log('create slider #' + this.index);
        }

        this.sliders[this.index].validator = validator;
        this.sliders[this.index].provider = provider;

        this.index++;
    }

    changed() {
        this.index = 0;

        //=================================================================

        if (this.update && typeof this.update === 'function') {
            this.update();
        }

        //=================================================================

        // Cleanup (remove excessive controls)
        this.sliders.filter((s, i) => i >= this.index && !!s)
            .forEach((s) => {
                s.remove();
                this.sliders[this.sliders.indexOf(s)] = undefined;
            });

        // Apply values (model to view)
        this.sliders.filter(s => !!s).forEach(s => s.value = s.provider().toString());
    }

    static createSlider() {
        const s = document.createElement('input');
        s.type = "range";
        s.min = '0';
        s.max = '1';
        s.step = '0.1';

        return s;
    }
}

if (window['guiManager'] == null) {
    window['guiManager'] = new GuiManager();
}

const instance = window['guiManager'];

export default instance;