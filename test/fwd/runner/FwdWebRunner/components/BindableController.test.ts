import { ControlBindingManager } from "../../../../../src/client/fwd/runner/FwdWebRunner/components/BindableController";

describe('ControlBindingManager', () => {
  it('can be accessed as a singleton', () => {
    const controlBindingManager = ControlBindingManager.getInstance();
    expect(controlBindingManager).toBeTruthy();
  });
});
