import {getGuiManager} from "./dist/fwd/gui/Gui";

const gui = getGuiManager(fwd.editor.root.htmlElement);
gui.setValue('min', 10);
gui.setValue('max', 90);
gui.setValue('other', 45);

gui.update = () => {
  gui.rootElement.style.display = 'grid';
  gui.rootElement.style.gridTemplateColumns = '1fr 3fr';
  gui.rootElement.style.gridAutoRows = '20px';
  gui.rootElement.style.padding = '6px';

  gui.label('Minimum');
  gui.horizontalSlider(
    {
      provide: () => gui.getValue('min'),
      validate: (newValue) => {
        gui.setValue('min', newValue);
        gui.setValue('max', Math.max(newValue, gui.getValue('max')));
        return newValue;
      }
    });

  if (gui.getValue('min') > 50) {
  	gui.label('Heey', { style: { gridColumn: '1 / span 2' }});
  	gui.label('Some other value');
    gui.horizontalSlider('other');
  }

  gui.label('Maximum');
  gui.horizontalSlider({
    provide: () => gui.getValue('max'),
    validate: (newValue) => {
      gui.setValue('max', newValue);
      gui.setValue('min', Math.min(newValue, gui.getValue('min')));
      return newValue;
    }
  });

  gui.label('Some other value');
  gui.horizontalSlider('other');

  gui.label(JSON.stringify(gui.getValues()), { style: { gridColumn: '1 / span 2' }});
};

gui.changed();
