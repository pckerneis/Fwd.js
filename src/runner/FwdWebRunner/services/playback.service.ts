import { getMidiOutputNames, getOutputByName } from '../../../fwd/midi/FwdMidi';
import { FwdScheduler } from '../../../fwd/scheduler/FwdScheduler';
import { ConnectionState, MidiClipNodeState, NodeState } from '../state/project.state';
import { GraphSequencerService } from './graph-sequencer.service';

export class PlaybackService {
  constructor(public readonly graphSequencerService: GraphSequencerService) {
  }

  public get nodes(): NodeState[] {
    return this.graphSequencerService.snapshot.nodes;
  }

  public get connections(): ConnectionState[] {
    return this.graphSequencerService.snapshot.connections;
  }

  public startPlayback(scheduler: FwdScheduler): void {
    const initNodes = this.nodes.filter(n => n.kind === 'Init');

    initNodes.forEach(initNode => {
      this.fireNextNodes(scheduler, initNode, 0);
    });
  }

  private fireNextNodes(scheduler: FwdScheduler,
                        startNode: NodeState,
                        when: number): void {
    const connectedClips = this.connections.map((connection) => {
      if (connection.sourceNode === startNode.id) {
        return connection.targetNode;
      } else {
        return undefined;
      }
    })
      .filter(n => Boolean(n))
      .map(id => this.nodes.find(n => n.id === id));

    scheduler.scheduleAhead(when, () => {
      connectedClips.forEach(clip => {
        if (clip.kind === 'MidiClip') {
          this.fireMidiClip(scheduler, clip);
        }
      });
    });
  }

  private fireMidiClip(scheduler: FwdScheduler, clip: MidiClipNodeState): void {
    const startTime = clip.flags.find(c => c.kind === 'inlet')?.time || 0;
    const endTime = clip.flags.find(c => c.kind === 'outlet')?.time || 0;
    const notesToPlay = clip.notes
      .map((note) => ({...note, time: note.time - startTime}))
      .filter(n => n.time >= 0)
      .filter(n => n.time < endTime);

    const output = getOutputByName(getMidiOutputNames()[1]);

    notesToPlay.forEach((note) => {
      scheduler.scheduleAhead(note.time, () => {
        console.log(note);
        output.playNote(note.pitch, 1, {
          velocity: note.velocity,
          duration: note.duration * 1000,
        });
      });
    });

    this.fireNextNodes(scheduler, clip, endTime - startTime);
  }
}
