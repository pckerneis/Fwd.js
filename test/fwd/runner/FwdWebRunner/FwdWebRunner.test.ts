import FwdWebRunner from "../../../../src/fwd/runner/FwdWebRunner/FwdWebRunner";
import { Logger, LoggerLevel } from "../../../../src/fwd/utils/Logger";
import { mockFwd } from "../../../mocks/Fwd.mock";
import { mockFwdAudio } from "../../../mocks/FwdAudio.mock";
import { mockAudioContext, mockAudioNodeWithAudioParams } from "../../../mocks/WebAudio.mock";

Logger.runtimeLevel = LoggerLevel.error;

describe('FwdWebRunner', () => {
  beforeEach(() => {
    document.body.innerHTML = bodyContent;

    (global as any).AudioContext = mockAudioContext;
  });

  it('creates a web runner', () => {
    const runner = new FwdWebRunner();
    expect(runner).toBeTruthy();
    expect(runner.audio).toBeTruthy();
    expect(runner.controls).toBeTruthy();
    expect(runner.logger).toBeTruthy();
  });

  it('can be started with start button', () => {
    const runner = new FwdWebRunner();
    (global as any).fwd = mockFwd();
    runner.entryPoint = jest.fn();
    // @ts-ignore
    runner['_audio'] = mockFwdAudio();
    // @ts-ignore
    runner['_audio']['master'].nativeNode = mockAudioNodeWithAudioParams('gain');

    document.getElementById('start-button').click();
    expect((document.getElementById('start-button') as HTMLButtonElement).disabled).toBeTruthy();
    expect((document.getElementById('stop-button') as HTMLButtonElement).disabled).toBeFalsy();
    expect(runner.entryPoint).toHaveBeenCalledTimes(1);
  });

  it('stops when the scheduler ends', () => {
    const runner = new FwdWebRunner();
    (global as any).fwd = mockFwd();
    runner.entryPoint = jest.fn();
    // @ts-ignore
    runner['_audio'] = mockFwdAudio();
    // @ts-ignore
    runner['_audio']['master'].nativeNode = mockAudioNodeWithAudioParams('gain');

    document.getElementById('start-button').click();
    expect((document.getElementById('start-button') as HTMLButtonElement).disabled).toBeTruthy();
    expect((document.getElementById('stop-button') as HTMLButtonElement).disabled).toBeFalsy();

    runner['_fwd'].scheduler.onEnded();
    expect((document.getElementById('start-button') as HTMLButtonElement).disabled).toBeFalsy();
    expect((document.getElementById('stop-button') as HTMLButtonElement).disabled).toBeTruthy();
  });

  it('stops the scheduler when the stop button is pressed', () => {
    const runner = new FwdWebRunner();
    runner.entryPoint = jest.fn();

    // @ts-ignore
    runner['_audio'] = mockFwdAudio();
    // @ts-ignore
    runner['_audio']['master'].nativeNode = mockAudioNodeWithAudioParams('gain');
    runner['_fwd'].scheduler.stop = jest.fn();

    document.getElementById('start-button').click();
    document.getElementById('stop-button').click();

    expect(runner['_fwd'].scheduler.stop).toHaveBeenCalledTimes(1);
  });

  it('action button click calls a sketch function', () => {
    const runner = new FwdWebRunner();
    runner.sketchModule = jest.fn().mockImplementation(() => {
      return {
        one: jest.fn(),
        two: jest.fn(),
      }
    })();
    runner.entryPoint = jest.fn();
    runner.actions = ['one', 'two'];

    // @ts-ignore
    runner['_audio'] = mockFwdAudio();
    // @ts-ignore
    runner['_audio']['master'].nativeNode = mockAudioNodeWithAudioParams('gain');

    expect(runner['_actionButtons'].length).toBe(2);
    runner['_actionButtons'].forEach((button) => expect(button.active).toBeFalsy);

    runner['_actionButtons'][0]['_button'].click();
    expect(runner.sketchModule['one']).not.toHaveBeenCalled();

    document.getElementById('start-button').click();

    runner['_actionButtons'][0]['_button'].click();
    expect(runner.sketchModule['one']).not.toHaveBeenCalledTimes(1);
  });
});

const bodyContent = `
<div class="full-page">
  <div id="container" class="flex-column">
    <div class="top-row">
      <div id="project-name">
        <span class="project-name">Project name</span>
      </div>
      <div id="settings-button">
        <img src="img/icon-settings.png" alt="Settings"/>
      </div>
    </div>
    <div class="buttons">
      <button id="start-button">Start</button>
      <button id="stop-button" disabled>Stop</button>
      <div class="time-code-container">
        <span id="time-code"></span>
      </div>
    </div>
    <div id="actions"></div>
  </div>
</div>
`;
