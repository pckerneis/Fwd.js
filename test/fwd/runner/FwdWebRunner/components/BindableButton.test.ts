import { BindableButton } from "../../../../../src/fwd/runner/FwdWebRunner/components/BindableButton";
import {
  ControlBinding,
  ControlBindingManager,
} from "../../../../../src/fwd/runner/FwdWebRunner/components/BindableController";

describe('BindableButton', () => {
  it('can be created', () => {
    const bindableButton = new BindableButton('button');
    expect(bindableButton).toBeTruthy();
    expect(bindableButton.controlElement).toBeTruthy();
    expect(bindableButton.text).toBe('button');
    expect(bindableButton.disabled).toBeFalsy();
  });

  it('can be right clicked to show mappings menu', () => {
    const mockSetControlBeingEdited = jest.fn();

    ControlBindingManager.getInstance = jest.fn().mockImplementation(() => {
      return {
        setControlBeingEdited: mockSetControlBeingEdited,
      }
    });

    const bindableButton = new BindableButton('button');

    bindableButton.button.oncontextmenu({
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        cancelBubble: false,
    } as unknown as MouseEvent);

    expect(mockSetControlBeingEdited).toHaveBeenCalledTimes(1);
  });

  it('accepts binding with NoteOn and KeyPress events', () => {
    const bindableButton = new BindableButton('button');
    expect(bindableButton.acceptsBinding({
      kind: 'NoteOn',
    } as ControlBinding)).toBeTruthy();

    expect(bindableButton.acceptsBinding({
      kind: 'KeyPress',
    } as ControlBinding)).toBeTruthy();

    expect(bindableButton.acceptsBinding({
      kind: 'foo',
    } as unknown as ControlBinding)).toBeFalsy();
  });

  it('blinks and call action when receiving events', () => {
    const bindableButton = new BindableButton('button');
    bindableButton['blink'] = jest.fn();
    bindableButton.action = jest.fn();
    bindableButton.active = true;

    bindableButton.handleNoteOn(12, 0, 1, 'deviceId');
    bindableButton.triggerKeyAction({
      code: 'A', controlId: 123, kind: 'KeyPress',
    });

    expect(bindableButton['blink']).toHaveBeenCalledTimes(2);
    expect(bindableButton.action).toHaveBeenCalledTimes(2);
  });

  it('changes appearance when blinking', () => {
    jest.useFakeTimers();

    const bindableButton = new BindableButton('button');
    bindableButton.action = jest.fn();
    bindableButton.active = true;
    bindableButton.handleNoteOn(12, 0, 1, 'deviceId');

    expect(bindableButton['_indicator'].classList.contains('blinking')).toBeTruthy();

    jest.runOnlyPendingTimers();

    expect(bindableButton['_indicator'].classList.contains('blinking')).toBeFalsy();
  });

  it('changes appearance when being set active or inactive', () => {
    jest.useFakeTimers();

    const bindableButton = new BindableButton('button');
    expect(bindableButton.button.classList.contains('active')).toBeFalsy();
    bindableButton.active = true;
    expect(bindableButton.button.classList.contains('active')).toBeTruthy();
    bindableButton.active = false;
    expect(bindableButton.button.classList.contains('active')).toBeFalsy();
  });

  it('can be disabled', () => {
    const bindableButton = new BindableButton('button');
    expect(bindableButton.button.disabled).toBeFalsy();
    bindableButton.disabled = true;
    expect(bindableButton.button.disabled).toBeTruthy();
  });

  it('changes appearance when bound', () => {
    const bindableButton = new BindableButton('button');
    expect(bindableButton['_indicator'].classList.contains('bound')).toBeFalsy();
    // @ts-ignore
    bindableButton.setBindings([{}, {}]);
    expect(bindableButton['_indicator'].classList.contains('bound')).toBeTruthy();
    bindableButton.setBindings(null);
    expect(bindableButton['_indicator'].classList.contains('bound')).toBeFalsy();
    bindableButton.setBindings([]);
    expect(bindableButton['_indicator'].classList.contains('bound')).toBeFalsy();
  });

  it('throws when receiving a control change event', () => {
    const bindableButton = new BindableButton('button');
    expect(bindableButton['_indicator'].classList.contains('bound')).toBeFalsy();
    // @ts-ignore
    expect(() => bindableButton.handleControlChange(0, 0, 0, 0))
      .toThrowError();
  });

  // TODO: ... that's not even a test
  it('doesn\'t do anything when setting binding mode', () => {
    const bindableButton = new BindableButton('button');
    bindableButton.setBindingMode(true);
  });

  it('doesn\'t trigger action when not active', () => {
    const bindableButton = new BindableButton('button');
    bindableButton.action = jest.fn();

    bindableButton.triggerKeyAction({controlId: 1, code: 'a', kind: 'KeyPress'});
    bindableButton.handleNoteOn(0, 0, 0, '');

    expect(bindableButton.action).toHaveBeenCalledTimes(0);
  });

  it('doesn\'t crash if action is not callable', () => {
    const bindableButton = new BindableButton('button');
    bindableButton.active = true;
    // @ts-ignore
    bindableButton.action = 'foo';

    expect(() => bindableButton.triggerKeyAction({controlId: 1, code: 'a', kind: 'KeyPress'}))
      .not.toThrow();
    expect(() => bindableButton.handleNoteOn(0, 0, 0, '')).not.toThrow();
  });
});