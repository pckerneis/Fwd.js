import { BindableSlider } from "../../../../../src/fwd/runner/FwdWebRunner/components/BindableSlider";

describe('BindableSlider', () => {
  it('can be created', () => {
    const slider = new BindableSlider('slider', {
      step: 0, min: 0, max: 1, defaultValue: 0,
    });

    expect(slider).toBeTruthy();
  });
});
