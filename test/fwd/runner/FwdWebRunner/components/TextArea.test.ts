import { TextAreaElement } from '../../../../../src/client/fwd/editor/elements/TextArea/TextArea';

describe('TextArea', () => {
  it('can be created', () => {
    const textArea = new TextAreaElement();
    expect(textArea).toBeTruthy();
  });
});
