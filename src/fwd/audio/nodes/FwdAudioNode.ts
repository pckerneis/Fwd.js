import { FwdAudio } from "../FwdAudio";

export abstract class FwdAudioNode {
  public abstract inputNode?: AudioNode | AudioParam;
  public abstract outputNode?: AudioNode;
  public abstract readonly fwdAudio: FwdAudio;

  protected tearedDownCalled: boolean = false;

  public get wasTornDown(): boolean { return this.tearedDownCalled; }

  public connect(destination: FwdAudioNode | AudioNode | AudioParam,
                 output?: number, input?: number): FwdAudioNode | undefined {

    if (this.outputNode == null || (destination instanceof FwdAudioNode && destination.inputNode == null)) {
      throw new Error('Error while trying to connect the audio node');
    }

    if (destination instanceof AudioNode) {
      this.outputNode.connect(destination, output, input);
      return;
    }

    if (this.outputNode && destination instanceof AudioParam) {
      this.outputNode.connect(destination, output);
      return;
    }

    if (destination instanceof FwdAudioNode) {
      if (destination.inputNode instanceof AudioNode) {
        this.outputNode.connect(destination.inputNode, output, input);
      } else if (destination.inputNode instanceof AudioParam) {
        this.outputNode.connect(destination.inputNode, output);
      }
      return destination;
    }
  }

  public connectToMaster(): this {
    if (this.outputNode == null) {
      throw new Error('Error while trying to connect the audio node');
    }

    if (this.fwdAudio.master) {
      this.connect(this.fwdAudio.master);
    }

    return this;
  }

  public tearDown(): void {
    if (this.tearedDownCalled) {
      throw new Error('You cannot call tearDown more than once on the same audio node!');
    }

    this.tearedDownCalled = true;

    const dueTime = this.fwdAudio.now();
    const when = dueTime - this.fwdAudio.context.currentTime;
    this.doTearDown(when);
  }

  protected abstract doTearDown(when: number): void;
}
