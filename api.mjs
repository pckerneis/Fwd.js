fwd.onStart = () => fwd.scheduler.fire('beep').trigger();

fwd.scheduler.defineAction('beep', () => {
  let osc = fwd.audio.osc();
  osc.connectToMaster();

  fwd.scheduler
    .fire(() => console.log('beep'))
    .fire(() => osc.gain.rampTo(0.5, 0.01))
    .fire(() => osc.frequency.value = 288)
    .wait(0.5)
    .fire(() => osc.gain.rampTo(0, 0.01))
    .wait(0.1)
    .fire(() => osc.tearDown())
    .trigger();

  fwd.scheduler
    .wait(1)
    .continueIfStillRunning()
    .fire('beep')
    .trigger();
});
