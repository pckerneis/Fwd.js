import { Component } from '../../canvas/BaseComponent';
import { GraphNode } from './GraphNode';

export class ViewportArea extends Component {

  private _backgroundColor: string = 'white';

  constructor() {
    super();

    const node1 = new GraphNode();
    node1.width = 120;
    node1.height = 28;
    node1.label = 'node 1';
    this.addAndMakeVisible(node1);

    const node2 = new GraphNode();
    node2.width = 120;
    node2.height = 28;
    node2.label = 'node 2 with long name that will overflow for sure';
    this.addAndMakeVisible(node2);

    node1.addInlet();
    node1.addOutlet();

    node2.addInlet();
    node2.addOutlet();
    node2.addOutlet();
    node2.addOutlet();
  }

  protected render(g: CanvasRenderingContext2D): void {
    g.fillStyle = this._backgroundColor;
    g.fillRect(0, 0, this.width, this.height);
  }

  protected resized(): void {
  }

}
