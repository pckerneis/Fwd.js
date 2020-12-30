import { FlexPanel } from '../../../fwd/editor/elements/FlexPanel/FlexPanel';
import { TabbedPanel } from '../../../fwd/editor/elements/TabbedPanel/TabbedPanel';
import { Logger } from '../../../fwd/utils/Logger';
import parentLogger from '../../logger.runner';
import { MidiClipNode } from '../GraphComponent/canvas-components/GraphNode';
import { GraphElement } from '../GraphComponent/graph-element';
import { MidiClipPanel } from './MidiClipPanel';
import { StructurePanel } from './StructurePanel';

const DBG = new Logger('PanelManager', parentLogger);

export class PanelManager {
  private _contextualTabbedPanel: TabbedPanel;

  private readonly noteSequencerPanels: Map<MidiClipNode, MidiClipPanel>;

  constructor() {
    this.noteSequencerPanels = new Map();
  }

  public showMidiEditor(node: MidiClipNode): void {
    if (this.noteSequencerPanels.get(node)) {
      // TODO: don't like this because there's state duplication between label and tab name. This may lead to sync issues!
      this._contextualTabbedPanel.setCurrentTab(node.label);
    } else {
      const panel = new MidiClipPanel();
      this._contextualTabbedPanel.addTab({
        tabName: node.label,
        closeable: true,
        tabContent: panel,
      });

      this._contextualTabbedPanel.setCurrentTab(node.label);

      this.noteSequencerPanels.set(node, panel);
    }
  }

  public buildMainSection(): void {
    const parentFlexPanel = new FlexPanel();
    parentFlexPanel.htmlElement.style.justifyContent = 'flex-end';
    const container = document.getElementById('fwd-runner-container');

    if (container != null) {
      container.append(parentFlexPanel.htmlElement);
    } else {
      DBG.error('Cannot find runner\'s container element.')
    }

    const structurePanel = new StructurePanel();

    parentFlexPanel.addFlexItem('left', structurePanel, {
      width: 220,
      minWidth: 200,
      maxWidth: 5000,
    });

    const separator = parentFlexPanel.addSeparator(0, true);
    separator.separatorSize = 10;
    separator.htmlElement.classList.add('fwd-runner-large-separator');

    const flexPanel = new FlexPanel();
    flexPanel.htmlElement.style.flexGrow = '1';

    parentFlexPanel.addFlexItem('main', flexPanel, {
      width: 1000,
      minWidth: 200,
      maxWidth: 5000,
    });

    const centerFlex = new FlexPanel('column');

    const graphEditor = new GraphElement();
    graphEditor.htmlElement.style.flexGrow = '1';

    centerFlex.addFlexItem('top', graphEditor, {
      height: 600,
      minHeight: 100,
      maxHeight: 5000,
    });

    const hSeparator = centerFlex.addSeparator(0, true);
    hSeparator.separatorSize = 10;
    hSeparator.htmlElement.classList.add('fwd-runner-large-hseparator');

    const tabbedPanel = new TabbedPanel();
    this._contextualTabbedPanel = tabbedPanel;
    this._contextualTabbedPanel.htmlElement.style.flexGrow = '1';

    centerFlex.addFlexItem('bottom', tabbedPanel, {
      height: 0,
      minHeight: 100,
      maxHeight: 5000,
    });

    flexPanel.addFlexItem('center', centerFlex, {
      width: 600,
      minWidth: 200,
      maxWidth: 5000,
    });
  }
}
