import { ToggleButton } from "../../../../../src/fwd/runner/FwdWebRunner/components/ToggleButton";

describe('ToggleButton', () => {
  it('can be created', () => {
    const toggleButton = new ToggleButton('button');
    expect(toggleButton).toBeTruthy();
  });
});
