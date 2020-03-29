import { injectStyle } from '../StyleInjector';
import { requestMIDIAccess, MIDIAccess, MIDIInput, MIDIOutput } from '../../../midi/FwdMidi';

export class ConfigurationPanel {
  public readonly htmlElement: HTMLDivElement;

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('configuration-panel');

    const title = document.createElement('h2');
    title.innerText = 'Settings';
    this.htmlElement.append(title);

    // Audio
    const audioTitle = document.createElement('h3');
    audioTitle.innerText = 'Audio';
    this.htmlElement.append(audioTitle);

    const testSoundButton = document.createElement('button');
    testSoundButton.innerText = 'Test';
    this.htmlElement.append(testSoundButton);

    // MIDI
    const midiTitle = document.createElement('h3');
    midiTitle.innerText = 'MIDI';
    this.htmlElement.append(midiTitle);

    requestMIDIAccess().then(
      (access: MIDIAccess) => {
        console.log('success', access);

        const buildRow = (type: string, name: string) => {
          const row = document.createElement('div');
          const text = `${type}: ${name}`;
          const span = document.createElement('div');
          span.innerText = text;
          row.classList.add('device-row');
          row.append(span);
          this.htmlElement.append(row);
        };

        access.inputs.forEach((input: MIDIInput) => buildRow('Input', input.name));
        access.outputs.forEach((output: MIDIOutput) => buildRow('Output', output.name));
      },
      (err: any) => {
        const errorMessage = document.createElement('span');
        errorMessage.innerText = 'Your browser doesn\'t support the WebMidi API.';
        this.htmlElement.append(errorMessage);
      },
    );
  }
}

injectStyle('ConfigurationPanel', `
.configuration-panel {
  min-width: 300px;
  min-height: 300px;
  padding: 2px 22px;
  display: flex;
  flex-direction: column;
}

.device-row {
  padding: 3px;
}
`);