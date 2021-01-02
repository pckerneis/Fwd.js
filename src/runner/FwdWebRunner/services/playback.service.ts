import { getMidiOutputNames, getOutputByName } from '../../../fwd/midi/FwdMidi';
import { FwdScheduler } from '../../../fwd/scheduler/FwdScheduler';
import { ConnectionState, InitNodeState, MidiClipNodeState, MidiFlagState, NodeState } from '../state/project.state';
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
    const initNodes = this.nodes.filter(n => n.kind === 'Init') as InitNodeState[];

    initNodes.forEach(initNode => {
      this.fireNextNodes(scheduler, initNode, initNode.outletId, 0);
    });
  }

  private fireNextNodes(scheduler: FwdScheduler,
                        startNode: NodeState,
                        startPin: number,
                        when: number): void {
    const connectedClips = this.connections
      .map((connection) => {
        if (connection.sourceNode === startNode.id && connection.sourcePinId === startPin) {
          const targetNode = this.nodes.find(n => n.id === connection.targetNode);
          return {targetNode, targetPin: connection.targetPinId};
        } else {
          return undefined;
        }
      })
      .filter(n => Boolean(n));

    scheduler.scheduleAhead(when, () => {
      connectedClips.forEach(clipNodeAndPin => {
        if (clipNodeAndPin.targetNode.kind === 'MidiClip') {
          this.fireMidiClip(scheduler, clipNodeAndPin.targetNode, clipNodeAndPin.targetPin);
        }
      });
    });
  }

  private fireMidiClip(scheduler: FwdScheduler, clip: MidiClipNodeState, inletPin: number): void {
    const startTime = clip.flags.find(c => c.id === inletPin)?.time || 0;
    this.playMidiClipSlice(scheduler, clip, startTime);
  }


  private playMidiClipSlice(scheduler: FwdScheduler, clip: MidiClipNodeState, startTime: number): void {
    console.log('play slice');
    // Get fresh reference...
    clip = this.nodes.find(c => c.kind === 'MidiClip' && c.id === clip.id) as MidiClipNodeState;

    this.graphSequencerService.setMidiClipPlayPosition(clip.id, startTime);

    const sliceDuration = 0.05;

    const flagsSlice = clip.flags
      .map(f => ({...f, time: f.time - startTime}))
      .filter(f => f.time > 0 && f.time < sliceDuration);

    let foundJump: MidiFlagState = null;
    let flagIdx = 0;

    while (flagIdx < flagsSlice.length) {
      const flag = flagsSlice[flagIdx];
      if (flag.kind === 'outlet' || flag.kind === 'jump') {
        foundJump = flag;
        break;
      }

      flagIdx++;
    }

    const endOfNoteSlice = foundJump?.time || sliceDuration;

    const notesSlice = clip.notes
      .map(note => ({...note, time: note.time - startTime}))
      .filter(n => n.time >= 0 && n.time < endOfNoteSlice);

    const output = getOutputByName(getMidiOutputNames()[1]);

    notesSlice.forEach((note) => {
      scheduler.scheduleAhead(note.time, () => {
        output.playNote(note.pitch, 1, {
          velocity: note.velocity,
          duration: note.duration * 1000,
        });
      });
    });

    if (foundJump != null) {
      switch (foundJump.kind) {
        case 'outlet':
          this.graphSequencerService.setMidiClipPlayPosition(clip.id, null);
          this.fireNextNodes(scheduler, clip, foundJump.id, endOfNoteSlice);
          break;
        case 'jump':
          scheduler.scheduleAhead(endOfNoteSlice, () => {
            if (foundJump.jumpDestination != null) {
              this.fireMidiClip(scheduler, clip, foundJump.jumpDestination);
            }
          });
          break;
      }
    } else {
      scheduler.scheduleAhead(endOfNoteSlice, () => {
        this.playMidiClipSlice(scheduler, clip, startTime + endOfNoteSlice);
      });
    }
  }
}
