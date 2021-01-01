import { EditorElement } from '../../../fwd/editor/elements/EditorElement';
import { ComponentBounds } from '../canvas/BaseComponent';
import { RootComponentHolder } from '../canvas/RootComponentHolder';
import { ObservableState } from '../state/observable-state';
import { ProjectModel } from '../state/project.model';
import { ConnectionState, MidiClipNodeState, NodeState } from '../state/project.state';
import { injectStyle } from '../StyleInjector';
import { GraphNode, InitNode } from './canvas-components/GraphNode';
import { GraphRoot } from './canvas-components/GraphRoot';
import { MidiClipNode } from './canvas-components/MidiClipNode';

export class GraphElement implements EditorElement {
  public readonly htmlElement: HTMLElement;
  private readonly _rootHolder: RootComponentHolder<GraphRoot>;
  private readonly _graphRoot: GraphRoot;

  constructor(projectModel: ProjectModel) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add(CONTAINER_CLASS)

    this._graphRoot = new GraphRoot();
    this._rootHolder = new RootComponentHolder(100, 100, this._graphRoot);

    this.htmlElement.append(this._rootHolder.canvas);
    this._rootHolder.attachResizeObserver(this.htmlElement);
    this._rootHolder.attachMouseEventListeners();

    projectModel.nodes.observeAdd((nodeState: ObservableState<NodeState>) => {
      switch (nodeState.get().kind) {
        case 'MidiClip':
          this.addMidiClipNode(nodeState);
          break;
        case 'Init':
          this.addInitNode(nodeState);
          break;
      }
    });

    projectModel.nodes.observeRemove((nodeState: NodeState) => {
      this._graphRoot.removeNode(nodeState.id);
      console.log(this._graphRoot.nodes.array);
    });

    projectModel.connections.observeAdd((connection: ObservableState<ConnectionState>) => {
      this.addConnection(connection.get());
    });

    projectModel.connections.observeRemove((connection: ConnectionState) => {
      this.removeConnection(connection);
    });
  }

  public get nodes(): readonly GraphNode[] {
    return this._graphRoot.nodes.array;
  }

  private addInitNode(nodeState: ObservableState<NodeState>): InitNode {
    const n = new InitNode(this._graphRoot, nodeState);
    const state = nodeState.get();
    n.id = state.id;
    this.addNode(n);
    n.setBounds(ComponentBounds.fromIBounds(state.bounds));
    n.label = state.label;
    return n;
  }

  private addMidiClipNode(nodeState: ObservableState<NodeState>): MidiClipNode {
    let state = nodeState.get() as MidiClipNodeState;
    const n = new MidiClipNode(this._graphRoot, nodeState);
    n.id = state.id;
    this.addNode(n);
    n.setBounds(ComponentBounds.fromIBounds(state.bounds));
    n.label = state.label;

    state.flags.forEach((flag) => {
      if (flag.kind === 'inlet') {
        n.addInlet();
      } else if (flag.kind === 'outlet') {
        n.addOutlet();
      }
    });

    n.signature = state.timeSignature;
    n.duration = state.duration;
    n.notes = state.notes;
    return n;
  }

  private addNode(node: GraphNode): void {
    this._graphRoot.addNode(node);
  }

  private addConnection(connection: ConnectionState): void {
    const firstPin = this.findNode(connection.sourceNode)?.outlets.get(connection.sourcePinIndex);
    const secondPin = this.findNode(connection.targetNode)?.inlets.get(connection.targetPinIndex);

    if (firstPin != null && secondPin != null) {
      this._graphRoot.addConnection(firstPin, secondPin);
    }
  }

  private removeConnection(connection: ConnectionState): void {
    const firstPin = this.findNode(connection.sourceNode)?.outlets.get(connection.sourcePinIndex);
    const secondPin = this.findNode(connection.targetNode)?.inlets.get(connection.targetPinIndex);

    if (firstPin != null && secondPin != null) {
      this._graphRoot.removeConnection(firstPin, secondPin);
    }
  }

  private findNode(id: string): GraphNode {
    return this.nodes.find(n => n.id === id);
  }
}

const CONTAINER_CLASS = 'fwd-runner-graph-element';

injectStyle('GraphElement', `
.${CONTAINER_CLASS} {
  overflow: hidden;
  position: relative;
}
`);
