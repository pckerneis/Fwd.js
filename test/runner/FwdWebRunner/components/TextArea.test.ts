import { TextAreaElement } from '../../../../src/api/editor/elements/TextArea/TextArea';

describe('TextArea', () => {
  it('can be created', () => {
    const textArea = new TextAreaElement();
    expect(textArea).toBeTruthy();
  });
});
