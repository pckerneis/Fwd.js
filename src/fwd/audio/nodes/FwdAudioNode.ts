import { FwdAudio } from "../FwdAudio";

export abstract class FwdAudioNode {
  public abstract inputNode: AudioNode | AudioParam;
  public abstract outputNode: AudioNode;
  public abstract readonly fwdAudio: FwdAudio;

  public connect(destination: FwdAudioNode, output?: number, input?: number): FwdAudioNode {
    if (this.outputNode == null || destination.inputNode == null) {
      throw new Error('Error while trying to connect the audio node');
    }

    if (destination.inputNode instanceof AudioNode) {
      this.outputNode.connect(destination.inputNode, output, input);
    } else {
      this.outputNode.connect(destination.inputNode, output);
    }

    return destination;
  }

  public connectToMaster(): this {
    if (this.outputNode == null) {
      throw new Error('Error while trying to connect the audio node');
    }

    this.connect(this.fwdAudio.master);
    return this;
  }
}