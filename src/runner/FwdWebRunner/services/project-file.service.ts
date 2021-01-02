import { PanelManager } from '../panels/PanelManager';
import { GraphSequencerService } from './graph-sequencer.service';

export class ProjectFileService {
  constructor(public readonly graphSequencerService: GraphSequencerService,
              public readonly panelManager: PanelManager) {
  }

  public getStateAsJson(): string {
    return JSON.stringify(this.graphSequencerService.snapshot);
  }

  public loadStateFromJson(state: string): void {
    const graphState = JSON.parse(state);
    this.panelManager.reset();
    this.graphSequencerService.loadState(graphState);
  }

  public loadInteractive(): void {
    openInteractive()
      .then((state) => this.loadStateFromJson(state))
      .then(() => console.info('Project loaded.'))
      .catch((err) => console.info('Open aborted.', err));
  }

  public saveInteractive(state: string): void {
    getNewFileHandle()
      .then((handle) => writeFile(handle, state))
      .then(() => console.log('Saved project to file.'))
      .catch((err) => console.info('Save aborted.', err));
  }
}

const projectFileOptions = {
  types: [
    {
      description: 'Project file',
      accept: { 'application/json': ['.json'] },
    },
  ],
};

function getNewFileHandle(): Promise<any> {
  return (window as any).showSaveFilePicker(projectFileOptions);
}

function writeFile(fileHandle: any, contents: any): Promise<void> {
  return fileHandle.createWritable()
    .then((writable: any) => writable.write(contents).then(() => writable))
    .then((writable: any) => writable.close());
}

function openInteractive(): Promise<string> {
  return (window as any).showOpenFilePicker(projectFileOptions)
    .then(([fileHandle]: [any]) => fileHandle.getFile())
    .then((file: any) => file.text());
}
