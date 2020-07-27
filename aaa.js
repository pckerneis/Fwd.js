if (imgui.textButton("do something")) {
  someFunction();
}

imgui.collapsePanel("source settings", () => {
  imgui.verticalSlider("osc freq", osc.frequency);
  imgui.verticalSlider("osc gain", osc.gain);
  
  imgui.collapsePanel("LFO", () => {
    imgui.rotarySlider("lfo freq", lfo.frequency.value);
    imgui.rotarySlider("lfo gain", lfo.gain.value);
  });
});

imgui.toggleButton("mute", (toggled) => {
  gain.value = toggled ? 0 : 1;
});