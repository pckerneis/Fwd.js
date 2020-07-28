// imgui.textButton("do something", () => {
//   someFunction();
// });
//
// imgui.collapsePanel("source settings", () => {
//   imgui.verticalSlider("osc freq", osc.frequency);
//   imgui.verticalSlider("osc gain", osc.gain);
//
//   imgui.collapsePanel("LFO", () => {
//     imgui.rotarySlider("lfo freq", lfo.frequency.value);
//     imgui.rotarySlider("lfo gain", lfo.gain.value);
//   });
// });
//
// imgui.toggleButton("mute", (toggled) => {
//   gain.value = toggled ? 0 : 1;
// });

import gui from "./gui.js";

console.log(gui);

if (window.programState == null) {
  window.programState = {
    min: {value: 0},
    max: {value: 1},
  };
}

const min = window.programState.min;
const max = window.programState.max;

gui.update = () => {
  gui.horizontalSlider(() => min.value, (newValue) => {
    min.value = newValue;
    max.value = Math.max(newValue, max.value);
    return newValue;
  });

  if (min.value > 0.5) {
    gui.horizontalSlider(() => 0.3, () => {
      return 0.3;
    });
  }

  gui.horizontalSlider(() => max.value, (newValue) => {
    max.value = newValue;
    min.value = Math.min(newValue, min.value);
    return newValue;
  });
  
  // gui.horizontalSlider(() => max.value, (newValue) => {
  //   max.value = newValue;
  //   min.value = Math.min(newValue, min.value);
  //   return newValue;
  // });
}

gui.changed();