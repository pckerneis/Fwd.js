import { FwdHTMLControls } from "../../../src/fwd/control/FwdHtmlControl";

describe('FwdHtmlControls', () => {
  beforeAll(() => {
    const selection = {
      focusOffset: 0,
      anchorOffset: 0,
      anchorNode: {},
      focusNode: {},
      isCollapsed: false,
      rangeCount: 0,
    };

    (global as any).getSelection = jest.fn().mockImplementation(() => {
      return selection;
    });
  });

  it('creates a FwdHtmlControls instance', () => {
    const controls = new FwdHTMLControls();

    expect(controls).toBeTruthy();
  });

  it('can add controls', () => {
    const controls = new FwdHTMLControls();

    const slider = controls.addSlider('slider');
    const text = controls.addTextEditor('text');

    expect(slider).toBeTruthy();
    expect(text).toBeTruthy();
    expect(controls.getSlider('slider')).toBe(slider);
    expect(controls.getTextEditor('text')).toBe(text);
  });

  it('forbids duplicate control names', () => {
    const controls = new FwdHTMLControls();

    controls.addTextEditor('');

    expect(controls.addSlider('')).toBeNull();
    expect(controls.addTextEditor('')).toBeNull();
  });

  it('allows to create a slider with options', () => {
    const controls = new FwdHTMLControls();

    const slider = controls.addSlider('slider', {
      defaultValue: 12,
      max: 24,
      min: 0,
      step: 1,
    });

    expect(slider.value).toBe(12);
    expect(slider.max).toBe(24);
    expect(slider.min).toBe(0);
    expect(slider.step).toBe(1);
  });

  it('allows to create a slider with options', () => {
    const controls = new FwdHTMLControls();

    const textEditor = controls.addTextEditor('slider', {
      defaultValue: 'hey',
      writeMode: 'overwrite',
      maxLength: 123,
    });

    expect(textEditor.value).toBe('hey');
    expect(textEditor.writeMode).toBe('overwrite');
    expect(textEditor.maxLength).toBe(123);
  });


  it('can be reset', () => {
    const controls = new FwdHTMLControls();

    controls.addSlider('slider');
    controls.addTextEditor('text');
    controls.reset();

    expect(controls.getSlider('slider')).toBeFalsy();
    expect(controls.getTextEditor('text')).toBeFalsy();
  });
});
