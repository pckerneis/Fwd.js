import { BindableButton } from "../../../../../src/fwd/runner/FwdWebRunner/components/BindableButton";

describe('BindableButton', () => {
  it('can be created', () => {
    const bindableButton = new BindableButton('button');
    expect(bindableButton).toBeTruthy();
  });
});