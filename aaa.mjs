import {getGuiManager} from "./dist/api/api/gui/Gui";

const gui = getGuiManager(fwd.editor.root.htmlElement);

if (typeof window.__min !== 'number') {
  window.__min = 0;
}

if (typeof window.__max !== 'number') {
  window.__max = 1;
}

gui.update = () => {
  gui.horizontalSlider({
    provide: () => window.__min,
    validate: (v) => {
      window.__max = Math.max(window.__max, v);
      window.__min = v;
      return v;
    },
  });

  gui.horizontalSlider({
    provide: () => window.__max,
    validate: (v) => {
      window.__min = Math.min(window.__min, v);
      window.__max = v;
      return v;
    },
  });

  gui.horizontalSlider('param', { style: { width: "200px" } });

  if (gui.getValue('param') > 0.5) {
    gui.horizontalSlider('other', {min: 0, max: 100});
  }

  gui.horizontalSlider('param', { style: { width: "40px" } });
  
  console.log(JSON.stringify(gui.getValues()));
}

gui.changed();