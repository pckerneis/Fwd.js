import { Overlay } from "../../../../src/runner/FwdWebRunner/components/Overlay";

describe('Overlay', () => {
  it('can be created', () => {
    const overlay = new Overlay();
    expect(overlay).toBeTruthy();
  });
});
