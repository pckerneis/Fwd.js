import { EditorElement } from '../../../fwd/editor/elements/EditorElement';
import { ComponentBounds } from '../canvas/BaseComponent';
import { RootComponentHolder } from '../canvas/RootComponentHolder';
import { commandManager } from '../commands/command-manager';
import { addConnection } from '../commands/graph-sequencer.commands';
import { GraphSequencerService } from '../services/graph-sequencer.service';
import { ConnectionState, InitNodeState, MidiClipNodeState, NodeState } from '../state/project.state';
import { injectStyle } from '../StyleInjector';
import { GraphNode, InitNode } from './canvas-components/GraphNode';
import { GraphRoot } from './canvas-components/GraphRoot';
import { MidiClipNode } from './canvas-components/MidiClipNode';
import { InletPin, OutletPin } from './canvas-components/Pin';

export class GraphElement implements EditorElement {
  public readonly htmlElement: HTMLElement;

  private readonly _rootHolder: RootComponentHolder<GraphRoot>;
  private readonly _graphRoot: GraphRoot;

  constructor(public readonly graphSequencerService: GraphSequencerService) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add(CONTAINER_CLASS)

    this._graphRoot = new GraphRoot();
    this._rootHolder = new RootComponentHolder(100, 100, this._graphRoot);

    this.htmlElement.append(this._rootHolder.canvas);
    this._rootHolder.attachResizeObserver(this.htmlElement);
    this._rootHolder.attachMouseEventListeners();

    graphSequencerService.nodes$.subscribe((newNodes: NodeState[]) => {
      this._graphRoot.clearAll();

      newNodes.forEach(n => {
        switch (n.kind) {
          case 'MidiClip':
            this.addMidiClipNode(n);
            break;
          case 'Init':
            this.addInitNode(n);
            break;
        }
      });
    });

    graphSequencerService.connections$.subscribe((newConnections: ConnectionState[]) => {
      this._graphRoot.setConnections([]);
      newConnections.forEach(c => this.addConnection(c));
    });

    this._graphRoot.connectionAdded$.subscribe((connection) => {
      commandManager.perform(addConnection(connection));
    });
  }

  public get nodes(): readonly GraphNode[] {
    return this._graphRoot.nodes.array;
  }

  private addInitNode(state: InitNodeState): InitNode {
    const n = new InitNode(this._graphRoot);
    n.id = state.id;
    this.addNode(n);
    n.setBounds(ComponentBounds.fromIBounds(state.bounds));
    n.label = state.label;
    return n;
  }

  private addMidiClipNode(state: MidiClipNodeState): MidiClipNode {
    const nodeService = this.graphSequencerService.getMidiClipNodeService(state.id, state);
    const n = new MidiClipNode(this._graphRoot, nodeService);
    n.id = state.id;
    this.addNode(n);
    n.setBounds(ComponentBounds.fromIBounds(state.bounds));
    n.attachObservers();

    return n;
  }

  private addNode(node: GraphNode): void {
    this._graphRoot.addNode(node);
  }

  private addConnection(connection: ConnectionState): void {
    const {source, target} = this.findPins(connection);

    if (source != null && target != null) {
      this._graphRoot.addConnection(source, target);
    }
  }

  private removeConnection(connection: ConnectionState): void {
    const {source, target} = this.findPins(connection);

    if (source != null && target != null) {
      this._graphRoot.removeConnection(source, target);
    }
  }

  private findNode(id: string): GraphNode {
    return this.nodes.find(n => n.id === id);
  }

  private findPins(connection: ConnectionState): { source: OutletPin, target: InletPin } {
    return {
      source: this.findNode(connection.sourceNode)?.outlets.array.find(p => p.id === connection.sourcePinId),
      target: this.findNode(connection.targetNode)?.inlets.array.find(p => p.id === connection.targetPinId),
    };
  }
}

const CONTAINER_CLASS = 'fwd-runner-graph-element';

injectStyle('GraphElement', `
.${CONTAINER_CLASS} {
  overflow: hidden;
  position: relative;
}
`);
