import { TextArea } from "../../../../../src/fwd/runner/FwdWebRunner/components/TextArea";

describe('TextArea', () => {
  it('can be created', () => {
    const textArea = new TextArea();
    expect(textArea).toBeTruthy();
  });
});
