import { EditorElement } from '../../../fwd/editor/elements/EditorElement';
import { RootComponentHolder } from '../canvas/RootComponentHolder';
import { injectStyle } from '../StyleInjector';
import { GraphRoot } from './canvas-components/GraphRoot';

export class GraphElement implements EditorElement {
  public readonly htmlElement: HTMLElement;
  private readonly _rootHolder: RootComponentHolder<GraphRoot>;
  private readonly _graphRoot: GraphRoot;

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add(CONTAINER_CLASS)

    this._graphRoot = new GraphRoot();
    this._rootHolder = new RootComponentHolder(100, 100, this._graphRoot);

    this.htmlElement.append(this._rootHolder.canvas);
    this._rootHolder.attachResizeObserver(this.htmlElement);
    this._rootHolder.attachMouseEventListeners();
  }
}

const CONTAINER_CLASS = 'fwd-runner-graph-element';

injectStyle('GraphElement', `
.${CONTAINER_CLASS} {
  overflow: hidden;
  position: relative;
}
`);
