import { EditorElement } from '../../../fwd/editor/elements/EditorElement';
import { Rectangle } from '../canvas/Rectangle';
import { RootComponentHolder } from '../canvas/RootComponentHolder';
import { commandManager } from '../commands/command-manager';
import { addConnection, createAndAddInitNode, createAndAddMidiClipNode } from '../commands/graph-sequencer.commands';
import { ContextualMenu } from '../components/ContextualMenu';
import { PanelManager } from '../panels/PanelManager';
import { GraphSequencerService } from '../services/graph-sequencer.service';
import { ConnectionState, InitNodeState, MidiClipNodeState, NodeState } from '../state/project.state';
import { injectStyle } from '../StyleInjector';
import { Connection } from './canvas-components/Connection';
import { GraphNode, InitNode } from './canvas-components/GraphNode';
import { GraphRoot } from './canvas-components/GraphRoot';
import { MidiClipNode } from './canvas-components/MidiClipNode';
import { InletPin, OutletPin } from './canvas-components/Pin';

export class GraphElement implements EditorElement {
  public readonly htmlElement: HTMLElement;

  private readonly _rootHolder: RootComponentHolder<GraphRoot>;
  private readonly _graphRoot: GraphRoot;
  private readonly _contextMenu: ContextualMenu;

  constructor(public readonly graphSequencerService: GraphSequencerService,
              public readonly panelManager: PanelManager) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add(CONTAINER_CLASS)

    this._graphRoot = new GraphRoot();
    this._rootHolder = new RootComponentHolder(100, 100, this._graphRoot);

    this.htmlElement.append(this._rootHolder.canvas);
    this._rootHolder.attachResizeObserver(this.htmlElement);
    this._rootHolder.attachMouseEventListeners();
    this._rootHolder.canvas.tabIndex = 0;
    this._rootHolder.canvas.onkeydown = event => this.handleKeyDown(event);
    this._rootHolder.canvas.oncontextmenu = event => this._contextMenu.show(event);

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

    this._graphRoot.nodeBoundsChanged$.subscribe((nodes) => {
      this.graphSequencerService.nodeBoundsChanged(nodes);
    });

    this._graphRoot.selectionChanged$.subscribe((items) => {
      this.graphSequencerService.selectionChanged(items);
    });

    this._contextMenu = new ContextualMenu([
      {
        label: 'Add init node',
        action: (infos) => commandManager.perform(createAndAddInitNode({
          x: infos.eventThatFiredMenu.clientX  - this.htmlElement.getBoundingClientRect().left
            - this._graphRoot.viewport.getViewOffset().x,
          y: infos.eventThatFiredMenu.clientY - this.htmlElement.getBoundingClientRect().top
            - this._graphRoot.viewport.getViewOffset().y,
        })),
      },
      {
        label: 'Add midi clip node',
        action: (infos) => commandManager.perform(createAndAddMidiClipNode({
          x: infos.eventThatFiredMenu.clientX - this.htmlElement.getBoundingClientRect().left
            - this._graphRoot.viewport.getViewOffset().x,
          y: infos.eventThatFiredMenu.clientY - this.htmlElement.getBoundingClientRect().top
            - this._graphRoot.viewport.getViewOffset().y,
        })),
      },
    ]);
  }

  public get nodes(): readonly GraphNode[] {
    return this._graphRoot.nodes.array;
  }

  private addInitNode(state: InitNodeState): InitNode {
    // Initialize service
    this.graphSequencerService.getNodeService(state.id, state);
    const n = new InitNode(this._graphRoot, state);
    this.addNode(n);
    n.setBounds(Rectangle.fromIBounds(state.bounds));
    return n;
  }

  private addMidiClipNode(state: MidiClipNodeState): MidiClipNode {
    const nodeService = this.graphSequencerService.getMidiNodeService(state.id, state);
    const n = new MidiClipNode(this._graphRoot, state, nodeService, this.panelManager);
    this.addNode(n);
    n.setBounds(Rectangle.fromIBounds(state.bounds));
    n.attachObservers();

    return n;
  }

  private addNode(node: GraphNode): void {
    this._graphRoot.addNode(node);
  }

  private addConnection(connection: ConnectionState): void {
    const {source, target} = this.findPins(connection);

    if (source != null && target != null) {
      this._graphRoot.addConnection(source, target, connection.selected);
    }
  }

  private removeNode(item: GraphNode): void {
    this.graphSequencerService.removeNodeById(item.id).subscribe();
  }

  private findNode(id: number): GraphNode {
    return this.nodes.find(n => n.id === id);
  }

  private findPins(connection: ConnectionState): { source: OutletPin, target: InletPin } {
    return {
      source: this.findNode(connection.sourceNode)?.outlets.array.find(p => p.id === connection.sourcePinId),
      target: this.findNode(connection.targetNode)?.inlets.array.find(p => p.id === connection.targetPinId),
    };
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      this.deleteSelection();
    }
  }

  private deleteSelection(): void {
    this._graphRoot.selection.getItems().forEach(item => {
      if (item instanceof GraphNode) {
        this.removeNode(item);
      } else if (item instanceof Connection) {
        this._graphRoot.removeConnection(item.first, item.second);
      }
    });

    this._graphRoot.selection.deselectAll();
    this._graphRoot.repaint();
  }
}

const CONTAINER_CLASS = 'fwd-runner-graph-element';

injectStyle('GraphElement', `
.${CONTAINER_CLASS} {
  overflow: hidden;
  position: relative;
}
`);
