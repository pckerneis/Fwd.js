import { pluck, takeUntil } from 'rxjs/operators';
import { EditorElement } from '../../../fwd/editor/elements/EditorElement';
import { FlexPanel } from '../../../fwd/editor/elements/FlexPanel/FlexPanel';
import { TabbedPanel } from '../../../fwd/editor/elements/TabbedPanel/TabbedPanel';
import { Logger } from '../../../fwd/utils/Logger';
import parentLogger from '../../logger.runner';
import { CodeEditorPanel } from '../components/CodeEditorPanel';
import { InitNode } from '../GraphComponent/canvas-components/GraphNode';
import { MidiClipNode } from '../GraphComponent/canvas-components/MidiClipNode';
import { GraphElement } from '../GraphComponent/graph-element';
import { GraphSequencerService } from '../services/graph-sequencer.service';
import { injectStyle } from '../StyleInjector';
import { MidiClipPanel } from './MidiClipPanel';

const DBG = new Logger('PanelManager', parentLogger);

export class PanelManager {
  private _graphEditor: GraphElement;
  private _contextualTabbedPanel: TabbedPanel;

  private readonly tabPanels: Map<number, EditorElement>;

  constructor() {
    this.tabPanels = new Map();
  }

  public get graphSequencerPanel(): GraphElement {
    return this._graphEditor;
  }

  public reset(): void {
    this.tabPanels.clear();
  }

  public showMidiEditor(node: MidiClipNode): void {
    if (this._contextualTabbedPanel.hasTab(node.id)) {
      this._contextualTabbedPanel.setCurrentTab(node.id);
    } else {
      const panel = new MidiClipPanel(node.graphSequencerService, node.id);
      this._contextualTabbedPanel.addTab({
        id: node.id,
        tabName: node.label,
        closeable: true,
        tabContent: panel,
      });

      this._contextualTabbedPanel.setCurrentTab(node.id);
      this.tabPanels.set(node.id, panel);

      node.graphSequencerService.observeNode(node.id).pipe(
        takeUntil(node.graphSequencerService.observeNodeRemoval(node.id)),
        pluck('label'),
      ).subscribe((newLabel) => {
        if (this._contextualTabbedPanel.hasTab(node.id)) {
          this._contextualTabbedPanel.renameTab(node.id, newLabel);
        }
      });

      node.graphSequencerService.observeNodeRemoval(node.id).subscribe(() => {
        if (this._contextualTabbedPanel.hasTab(node.id)) {
          this._contextualTabbedPanel.removeTab(node.id);
        }
      });
    }
  }

  public buildMainSection(graphSequencerService: GraphSequencerService): void {
    const parentFlexPanel = new FlexPanel();
    parentFlexPanel.htmlElement.style.justifyContent = 'flex-end';
    const container = document.getElementById('fwd-runner-container');

    if (container != null) {
      container.append(parentFlexPanel.htmlElement);
    } else {
      DBG.error('Cannot find runner\'s container element.')
    }

    // const structurePanel = new StructurePanel();
    //
    // parentFlexPanel.addFlexItem(structurePanel, {
    //   width: 220,
    //   minWidth: 200,
    //   maxWidth: 5000,
    // });
    //
    // const separator = parentFlexPanel.addSeparator(true);
    // separator.separatorSize = 5;
    // separator.htmlElement.classList.add('fwd-runner-large-separator');

    const flexPanel = new FlexPanel();
    flexPanel.htmlElement.style.flexGrow = '1';

    parentFlexPanel.addFlexItem(flexPanel, {
      width: 1000,
      minWidth: 200,
      maxWidth: 5000,
    });

    const centerFlex = new FlexPanel('column');
    centerFlex.setAlignment('end');

    flexPanel.addFlexItem(centerFlex, {
      width: 600,
      minWidth: 200,
      maxWidth: 5000,
    });

    const graphEditor = new GraphElement(graphSequencerService, this);
    graphEditor.htmlElement.style.flexGrow = '1';
    this._graphEditor = graphEditor;

    centerFlex.addFlexItem(graphEditor, {
      height: 400,
      minHeight: 100,
      maxHeight: 5000,
    });

    const hSeparator = centerFlex.addSeparator(true);
    hSeparator.separatorSize = 10;
    hSeparator.htmlElement.classList.add('fwd-runner-large-hseparator');

    const tabbedPanel = new TabbedPanel();
    tabbedPanel.setElementToShowWhenEmpty(getElementToShowWhenEmpty())
    this._contextualTabbedPanel = tabbedPanel;
    this._contextualTabbedPanel.htmlElement.style.flexGrow = '1';

    centerFlex.addFlexItem(tabbedPanel, {
      height: 400,
      minHeight: 200,
      maxHeight: 5000,
    });
  }

  public showCodeEditor(node: InitNode): void {
    if (this._contextualTabbedPanel.hasTab(node.id)) {
      this._contextualTabbedPanel.setCurrentTab(node.id);
    } else {
      const panel = new CodeEditorPanel();
      this._contextualTabbedPanel.addTab({
        id: node.id,
        tabName: node.label,
        closeable: true,
        tabContent: panel,
      });

      this._contextualTabbedPanel.setCurrentTab(node.id);
      this.tabPanels.set(node.id, panel);

      node.graphSequencerService.observeNode(node.id).pipe(
        takeUntil(node.graphSequencerService.observeNodeRemoval(node.id)),
        pluck('label'),
      ).subscribe((newLabel) => {
        if (this._contextualTabbedPanel.hasTab(node.id)) {
          this._contextualTabbedPanel.renameTab(node.id, newLabel);
        }
      });

      node.graphSequencerService.observeNodeRemoval(node.id).subscribe(() => {
        if (this._contextualTabbedPanel.hasTab(node.id)) {
          this._contextualTabbedPanel.removeTab(node.id);
        }
      });
    }
  }
}

function getElementToShowWhenEmpty(): HTMLElement {
  const e = document.createElement('div');
  e.classList.add('fwd-tab-element-to-show-when-empty');
  e.innerText = 'Nothing to show';
  return e;
}

injectStyle('TabElementToShowWhenEmpty', `
.fwd-tab-element-to-show-when-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  color: lightgrey;
  user-select: none;
  font-size: smaller;
}
`);
