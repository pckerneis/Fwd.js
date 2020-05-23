import { TextAreaElement } from "../../../../../src/fwd/editor/elements/TextArea/TextAreaElement";

describe('TextArea', () => {
  it('can be created', () => {
    const textArea = new TextAreaElement();
    expect(textArea).toBeTruthy();
  });
});
