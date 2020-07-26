import { FwdWebConsole } from "../../../../src/runner/FwdWebRunner/components/Console";

describe('FwdWebConsole', () => {
  it('can be created', () => {
    const console = new FwdWebConsole();
    expect(console).toBeTruthy();
  });
});
