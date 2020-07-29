import {getGuiManager} from "./dist/api/api/gui/GuiManager";

const gui = getGuiManager(fwd.editor.root.htmlElement);

console.log(gui);

if (window.programState == null) {
  window.programState = {
    min: {value: 0},
    max: {value: 1},
    other: {value: 0.3},
  };
}

const min = window.programState.min;
const max = window.programState.max;

gui.update = () => {
  gui.horizontalSlider(
    {
      provide: () => min.value,
      validate: (newValue) => {
        min.value = newValue;
        max.value = Math.max(newValue, max.value);
        return newValue;
      }
    },
    {
      style: { width: "200px" }
    });

  if (min.value > 0.5) {
    gui.horizontalSlider({
      provide: () => window.programState.other,
      validate: (v) => v,
    }, {min: 0, max: 100});
  }

  gui.horizontalSlider({
    provide: () => max.value,
    validate: (newValue) => {
      max.value = newValue;
      min.value = Math.min(newValue, min.value);
      return newValue;
    }
  });
  
  gui.horizontalSlider({
    provide: () => window.programState.other,
    validate: (v) => { window.programState.other.value = v; return v; },
  }, {style:{width:'500px'}});

  console.dir(Object.keys(window.programState).map(key => `${key}: ${window.programState[key].value}`).join(', '));
}

gui.changed();