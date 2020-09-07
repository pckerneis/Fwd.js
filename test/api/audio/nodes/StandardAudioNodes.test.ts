import { FwdAudioImpl } from '../../../../src/fwd/audio/FwdAudioImpl';
import { FwdAudioNode } from '../../../../src/fwd/audio/nodes/FwdAudioNode';
import { FwdAudioNodeWrapper } from '../../../../src/fwd/audio/nodes/FwdAudioNodeWrapper';
import { FwdAudioParamWrapper } from '../../../../src/fwd/audio/nodes/FwdAudioParamWrapper';
import {
  FwdCompressorNode,
  FwdDelayLineNode, FwdDistortionNode,
  FwdGainNode,
  FwdLFONode, FwdNoiseNode,
  FwdOscillatorNode, FwdReverbNode,
  FwdSamplerNode, FwdStereoDelayNode, tearDownNativeNode,
} from '../../../../src/fwd/audio/nodes/StandardAudioNodes';
import { Time } from '../../../../src/fwd/scheduler/EventQueue/EventQueue';
import { Logger, LoggerLevel } from '../../../../src/fwd/utils/Logger';
import { mockFwd } from '../../../mocks/Fwd.mock';
import { mockFwdAudio } from '../../../mocks/FwdAudio.mock';
import { mockAudioContext, mockAudioNode, mockAudioParam } from '../../../mocks/WebAudio.mock';
import { seconds } from '../../../test-utils';

Logger.runtimeLevel = LoggerLevel.none;

describe('StandardAudioNodes', () => {
  beforeEach(() => {
    mockFwdAudio.mockClear();
    mockFwd.mockClear();

    global['AudioParam'] = mockAudioParam;

    jest.useRealTimers();
  });

  describe('FwdAudioParamWrapper ', () => {
    it('wraps an audio parameter', () => {
      const param = mockAudioParam();

      class ConcreteParam extends FwdAudioParamWrapper {
        constructor() {
          super(mockFwdAudio(), param);
        }
      }

      const wrapper = new ConcreteParam();
      expect(wrapper.nativeParam).toBe(param);
      expect(wrapper.value).toBe(param.value);
    });

    it('sets the value', () => {
      const audioParamMock = mockAudioParam();
      const fwdAudioMock = mockFwdAudio();

      class ConcreteParam extends FwdAudioParamWrapper {
        constructor() {
          super(fwdAudioMock, audioParamMock);
        }
      }

      fwdAudioMock['now'] = jest.fn().mockImplementation(() => 30);

      const wrapper = new ConcreteParam();
      wrapper.value = 12;
      expect(audioParamMock['linearRampToValueAtTime']).toHaveBeenCalledWith(12, 30);
    });

    it('gets value at a given time based on scheduled ramps', () => {
      const audioParamMock = mockAudioParam();
      const fwdAudioMock = mockFwdAudio();

      class ConcreteParam extends FwdAudioParamWrapper {
        constructor() {
          super(fwdAudioMock, audioParamMock);
        }
      }

      fwdAudioMock['now'] = jest.fn().mockImplementation(() => 10);

      const wrapper = new ConcreteParam();
      wrapper.value = 12;
      wrapper.rampTo(0, 10);
      expect(wrapper['getValueAtTime'](0)).toBe(12);
      expect(wrapper['getValueAtTime'](10)).toBe(12);
      expect(wrapper['getValueAtTime'](12.5)).toBe(9);
      expect(wrapper['getValueAtTime'](15)).toBe(6);
      expect(wrapper['getValueAtTime'](20)).toBe(0);
      expect(wrapper['getValueAtTime'](30)).toBe(0);
    });
  });

  describe('FwdAudioNodeWrapper', () => {
    class ConcreteNode extends FwdAudioNodeWrapper<AudioNode> {
      constructor() {
        super(null, null);
      }

      public get inputNode(): AudioNode | AudioParam {
        return undefined;
      }

      public get outputNode(): AudioNode {
        return undefined;
      }

      protected doTearDown(when: number): void {
      }
    }

    it('throw when calling assertIsReady with null native node', () => {
      const node = new ConcreteNode();
      expect(node.nativeNode).toBeNull();
      expect(() => node['assertIsReady']('')).toThrowError();
    });
  });

  describe('FwdGainNode', () => {
    it('creates a gain node', () => {
      const node = new FwdGainNode(mockFwdAudio());

      expect(node).toBeTruthy();
      expect(node.inputNode).not.toBeNull();
      expect(node.outputNode).not.toBeNull();
      expect(node.gain).not.toBeNull();

      checkTearDown(node);
    });

    it('uses "rampTo" shortcut to gain.rampTo', () => {
      const node = new FwdGainNode(mockFwdAudio());
      node.gain.rampTo = jest.fn();
      node.rampTo(0, 0);
      expect(node.gain.rampTo).toHaveBeenCalled();
    });
  });

  describe('FwdOscillatorNode', () => {
    it('creates a oscillator node', () => {
      const node = new FwdOscillatorNode(mockFwdAudio(), 220, 'square');

      expect(node).toBeTruthy();
      expect(node.inputNode).toBeNull();
      expect(node.outputNode).not.toBeNull();
      expect(node.frequency).not.toBeNull();

      checkTearDown(node);
    });

    it('uses default frequency value if the value provided isn\'t a number', () => {
      (global as any).AudioParam = mockAudioParam;
      // @ts-ignore
      const node = new FwdOscillatorNode(mockFwdAudio(), {foo: 'bar'}, 'square');

      expect(node).toBeTruthy();
      expect(node.oscillator.frequency.value).toBe(0);
    });

    it('accept frequencies and types', () => {
      (global as any).AudioParam = mockAudioParam;
      const fwdAudioMock = mockFwdAudio();
      fwdAudioMock.fwdScheduler['scheduleNow'] = (fn: Function) => fn();

      const node = new FwdOscillatorNode(fwdAudioMock, 440, 'sine');
      node.setFrequency(220);
      node.setType('triangle');

      expect(node.oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(220, undefined);
      expect(node.type).toBe('triangle');
    });

    it('reject invalid frequencies', () => {
      (global as any).AudioParam = mockAudioParam;

      const node = new FwdOscillatorNode(mockFwdAudio(), 440, 'sine');

      // @ts-ignore
      node.setFrequency('foo');
      expect(node.oscillator.frequency.setValueAtTime).not.toHaveBeenCalled();

      // @ts-ignore
      node.setFrequency({foo: 'bar'});
      expect(node.oscillator.frequency.setValueAtTime).not.toHaveBeenCalled();
    });

    it('can be stopped', () => {
      (global as any).AudioNode = mockAudioNode;

      const node = new FwdOscillatorNode(mockFwdAudio(), 440, 'sine');
      node.stop();

      expect(node.oscillator.stop).toHaveBeenCalled();
    });

    it('throw an exception when not ready', () => {
      (global as any).AudioNode = mockAudioNode;

      const node = new FwdOscillatorNode(mockFwdAudio(), 440, 'sine');

      node.tearDown();
      expect(() => node.setFrequency(12)).toThrowError();
    });
  });

  describe('FwdLFONode', () => {
    it('creates a lfo node', () => {
      const node = new FwdLFONode(mockFwdAudio(), 0.1, 'square');

      expect(node).toBeTruthy();
      expect(node.inputNode).toBeNull();
      expect(node.outputNode).not.toBeNull();
      expect(node.frequency).not.toBeNull();

      checkTearDown(node);
    });

    it('allow to change type and frequency', () => {
      (global as any).AudioParam = mockAudioParam;
      const fwdAudioMock = mockFwdAudio();
      fwdAudioMock.fwdScheduler['scheduleNow'] = (fn: Function) => fn();

      const node = new FwdLFONode(fwdAudioMock, 0.1, 'square');

      node.frequency = 3;
      node.type = 'triangle';

      expect(node.oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(3, undefined);
      expect(node.oscillator.type).toBe('triangle');
    });

    it('defaults to frequency = 0 when constructor parameter is not a number', () => {
      (global as any).AudioParam = mockAudioParam;
      const fwdAudioMock = mockFwdAudio();
      fwdAudioMock.fwdScheduler['scheduleNow'] = (fn: Function) => fn();

      // @ts-ignore
      const node = new FwdLFONode(fwdAudioMock, 'bonjour', 'square');

      expect(node.oscillator.frequency.value).toBe(0);
    });
  });

  describe('FwdSamplerNode', () => {
    it('creates a sampler node', () => {
      // We need to provide fetch
      (global as any).fetch = jest.fn().mockImplementation(() => {
        return new Promise(jest.fn());
      });

      const node = new FwdSamplerNode(mockFwdAudio(), '');

      expect(node).toBeTruthy();
      expect(node.inputNode).toBeNull();
      expect(node.outputNode).not.toBeNull();
      expect(node.pathToFile).not.toBeNull();

      checkTearDown(node);
    });

    it('can be played', () => {
      (global as any).AudioParam = mockAudioParam;
      const fwdAudioMock = mockFwdAudio();
      fwdAudioMock.fwdScheduler['schedule'] = (t: Time, fn: Function) => fn();

      // We need to provide fetch
      (global as any).fetch = jest.fn().mockImplementation(() => {
        return new Promise(jest.fn());
      });

      const node = new FwdSamplerNode(fwdAudioMock, '');
      // @ts-ignore
      node.outputNode['context'] = mockAudioContext();

      node.play();

      expect(node.outputNode.context.createBufferSource).toHaveBeenCalled();
    });
  });

  describe('FwdNoiseNode', () => {
    it('creates a noise node', () => {
      (global as any).AudioContext = mockAudioContext;
      const fwdAudio = new FwdAudioImpl(mockFwd().scheduler);
      fwdAudio.start();
      const node = new FwdNoiseNode(fwdAudio);

      expect(node).toBeTruthy();
      expect(node.inputNode).toBeNull();
      expect(node.outputNode).not.toBeNull();

      checkTearDown(node);
    });
  });

  describe('FwdDelayLineNode', () => {
    it('creates a delay line node', () => {
      const node = new FwdDelayLineNode(mockFwdAudio(), 1);

      expect(node).toBeTruthy();
      expect(node.inputNode).not.toBeNull();
      expect(node.outputNode).not.toBeNull();
      expect(node.delayTime).not.toBeNull();

      checkTearDown(node);
    });
  });

  describe('FwdStereoDelayNode', () => {
    it('creates a delay line node', () => {
      const node = new FwdStereoDelayNode(mockFwdAudio());

      expect(node).toBeTruthy();
      expect(node.inputNode).not.toBeNull();
      expect(node.outputNode).not.toBeNull();

      checkTearDown(node);
    });
  });

  describe('FwdDistortionNode', () => {
    it('creates a distortion node', () => {
      const node = new FwdDistortionNode(mockFwdAudio(), 10);

      expect(node).toBeTruthy();
      expect(node.inputNode).not.toBeNull();
      expect(node.outputNode).not.toBeNull();

      checkTearDown(node);
    });
  });

  describe('FwdCompressorNode', () => {
    it('creates a compressor node', () => {
      const node = new FwdCompressorNode(mockFwdAudio());

      expect(node).toBeTruthy();
      expect(node.inputNode).not.toBeNull();
      expect(node.outputNode).not.toBeNull();

      checkTearDown(node);
    });
  });


  describe('FwdReverbNode', () => {
    it('creates a reverb node', () => {
      jest.useFakeTimers();

      (global as any).OfflineAudioContext = mockAudioContext;
      (global as any).AudioScheduledSourceNode = mockAudioNode;
      const node = new FwdReverbNode(mockFwdAudio());

      expect(node).toBeTruthy();
      expect(node.inputNode).not.toBeNull();
      expect(node.outputNode).not.toBeNull();

      checkTearDown(node);

      jest.runAllTimers();
    });
  });

  describe('tearDownNativeNode', () => {
    it('tears down a native audio node', async () => {
      (global as any).AudioScheduledSourceNode = mockAudioNode;
      const audioNode = mockAudioNode();

      await tearDownNativeNode(audioNode, 0);
      await seconds(0);

      expect(audioNode.disconnect).toHaveBeenCalled();
    });
  });

  function checkTearDown(node: FwdAudioNode): void {
    expect(() => node.tearDown()).not.toThrowError();
    expect(() => node.tearDown()).toThrowError();
  }
});
