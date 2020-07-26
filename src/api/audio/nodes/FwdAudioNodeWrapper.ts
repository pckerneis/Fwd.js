import { Logger } from '../../../utils/Logger';
import { Time } from '../../core/EventQueue/EventQueue';
import { FwdAudio } from '../FwdAudio';
import parentLogger from '../logger.audio';
import { FwdAudioNode } from './FwdAudioNode';
import { FwdAudioParamWrapper } from './FwdAudioParamWrapper';
import { tearDownNativeNode } from './StandardAudioNodes';

const DBG = new Logger('FwdAudioNodeWrapper', parentLogger);

type AudioParams<NodeType> = Pick<NodeType, {
  [Key in keyof NodeType]: NodeType[Key] extends AudioParam ? Key : never
}[keyof NodeType]>;

type AudioParamWrappers<NodeType> = { [Key in keyof AudioParams<NodeType>]: FwdAudioParamWrapper }

//=========================================================================

export abstract class FwdAudioNodeWrapper<T extends AudioNode> extends FwdAudioNode {

  public readonly params: AudioParamWrappers<T>;

  protected constructor(private readonly _fwdAudio: FwdAudio, private _nativeNode: T) {
    super();

    if (_nativeNode != null) {
      this.params = wrapNativeAudioParams<T>(_nativeNode, _fwdAudio);
      DBG.debug('Extracted params: ', this.params);
    }
  }

  public abstract get inputNode(): AudioNode | AudioParam;

  public abstract get outputNode(): AudioNode;

  public get nativeNode(): T {
    return this._nativeNode;
  }

  public get fwdAudio(): FwdAudio {
    return this._fwdAudio;
  }

  protected assertIsReady(context: string): void {
    if (this._nativeNode == null) {
      throw new Error(context + ': this audio node was teared down or not initialized.');
    }
  }

  protected doTearDown(when: Time): void {
    tearDownNativeNode(this._nativeNode, when).then(() => {
      this._nativeNode = null;
    });
  }
}

//=========================================================================

function wrapNativeAudioParams<T extends AudioNode>(audioNode: T, fwdAudio: FwdAudio): AudioParamWrappers<T> {
  const properties = Object.getOwnPropertyNames(Object.getPrototypeOf(audioNode));
  DBG.debug('Properties found in audioNode prototype:', properties);

  return properties
    .filter(key => audioNode[key] instanceof AudioParam)
    .map((key => ({key, wrapper: new FwdAudioParamWrapper(fwdAudio, audioNode[key])})))
    .reduce((obj: AudioParamWrappers<T>, {key, wrapper}) => ({
      ...obj,
      [key]: wrapper,
    }), {} as AudioParamWrappers<T>);
}
