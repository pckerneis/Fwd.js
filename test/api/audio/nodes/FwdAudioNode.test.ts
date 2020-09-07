import { FwdAudio } from '../../../../src/fwd/audio/FwdAudio';
import { FwdAudioNode } from "../../../../src/fwd/audio/nodes/FwdAudioNode";
import { Logger, LoggerLevel } from "../../../../src/fwd/utils/Logger";
import { mockFwd } from "../../../mocks/Fwd.mock";
import { mockFwdAudio } from "../../../mocks/FwdAudio.mock";
import { mockAudioContext, mockAudioNode, mockAudioParam } from "../../../mocks/WebAudio.mock";

Logger.runtimeLevel = LoggerLevel.none;

class ConcreteNode extends FwdAudioNode {
  public readonly fwdAudio: FwdAudio = mockFwdAudio();
  public inputNode: AudioNode | AudioParam;
  public outputNode: AudioNode;
  protected doTearDown(): void {}
}

describe('FwdAudioNode', () => {
  beforeEach(() => {
    mockFwd.mockClear();

    (global as any).AudioContext = mockAudioContext;
    (global as any).AudioParam = mockAudioParam;
    (global as any).AudioNode = mockAudioNode;
  });

  it ('creates a node', () => {
    const node = new ConcreteNode();
    expect(node).toBeTruthy();
  });

  it ('connects nodes', () => {
    const node1 = new ConcreteNode();
    node1.inputNode = mockAudioNode();
    node1.outputNode = mockAudioNode();

    const node2 = new ConcreteNode();
    node2.inputNode = mockAudioNode();
    node2.outputNode = mockAudioNode();

    const node3 = new ConcreteNode();
    node3.inputNode = mockAudioParam();
    node3.outputNode = mockAudioNode();

    const fwdAudio = mockFwdAudio();

    // @ts-ignore
    node3['fwdAudio'] = fwdAudio;
    // @ts-ignore
    fwdAudio['master'] = {
      inputNode: mockAudioNode(),
    };

    node1.connect(node2).connect(node3).connectToMaster();
  });

  it ('throws when trying to connect to invalid nodes', () => {
    const node1 = new ConcreteNode();
    node1.inputNode = mockAudioNode();
    node1.outputNode = mockAudioNode();

    expect(() => node1.connect(null)).toThrowError();
  });

  it ('throws when trying to connect while having invalid input/output', () => {
    const node1 = new ConcreteNode();

    const node2 = new ConcreteNode();
    node1.inputNode = mockAudioNode();

    const node3 = new ConcreteNode();
    node1.outputNode = mockAudioNode();

    expect(() => node1.connect(null)).toThrowError();
    expect(() => node1.connect(node2)).toThrowError();
    expect(() => node3.connect(node1)).toThrowError();
    expect(() => node1.connectToMaster()).toThrowError();
    expect(() => node3.connectToMaster()).toThrowError();
  });

  it('can be torn down', () => {
    const node1 = new ConcreteNode();
    expect(node1.wasTornDown).toBeFalsy();
    node1.tearDown();
    expect(node1.wasTornDown).toBeTruthy();
  });
});
