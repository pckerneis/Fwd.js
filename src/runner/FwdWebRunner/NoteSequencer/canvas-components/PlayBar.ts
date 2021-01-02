import { Component } from '../../canvas/BaseComponent';
import { SequencerDisplayModel } from '../note-sequencer';
import { NoteGridComponent } from './NoteGridComponent';

export class PlayBar extends Component {
  private time: number;

  constructor(private readonly model: SequencerDisplayModel, private readonly grid: NoteGridComponent) {
    super();
    this.setInterceptsMouseEvents(false);
  }

  public setTime(time: number): void {
    this.time = time;
    this.repaint();
  }

  protected render(g: CanvasRenderingContext2D): void {
    if (this.time != null) {
      const pos = this.grid.getPositionForTime(this.time);
      this.model.theme.drawPlayBar(g, pos, this.height, this.model.colors);
    }
  }

  protected resized(): void {
  }
}
