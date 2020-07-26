import { MIDIAccess, MIDIInput, MIDIOutput, requestMIDIAccess } from '../../../api/midi/helpers';
import { injectStyle } from '../StyleInjector';

export class ConfigurationPanel {
  public readonly htmlElement: HTMLDivElement;

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('configuration-panel');

    const title = document.createElement('h2');
    title.innerText = 'Settings';
    this.htmlElement.append(title);

    this.buildAudioSection();
    this.buildMIDISection();
  }

  private buildAudioSection(): void {
    const audioTitle = document.createElement('h3');
    audioTitle.innerText = 'Audio';
    this.htmlElement.append(audioTitle);

    const testSoundButton = document.createElement('button');
    testSoundButton.innerText = 'Test audio';
    this.htmlElement.append(testSoundButton);

    testSoundButton.onclick = () => {
      testSoundButton.disabled = true;
      this.testBeep();
      setTimeout(() => testSoundButton.disabled = false, 1500);
    };
  }

  private buildMIDISection(): void {
    const midiTitle = document.createElement('h3');
    midiTitle.innerText = 'MIDI';
    this.htmlElement.append(midiTitle);

    requestMIDIAccess().then(
      (access: MIDIAccess) => {

        if (access === null) {
          const midiErrorMessage = 'Your browser doesn\'t support the WebMIDI API.';
          const paragraphElement = document.createElement('p');
          paragraphElement.innerText = midiErrorMessage;
          this.htmlElement.append(paragraphElement);
          return;
        }

        const buildRow = (type: string, name: string) => {
          const row = document.createElement('div');

          const input = document.createElement('input');
          input.type = 'checkbox';
          input.checked = true;

          const text = `${type}: ${name}`;
          const label = document.createElement('label');
          label.innerText = text;
          label.prepend(input);

          row.classList.add('device-row');

          const aliasInput = document.createElement('input');
          aliasInput.classList.add('alias-input');

          row.append(label, aliasInput);
          this.htmlElement.append(row);
        };

        access.inputs.forEach((input: MIDIInput) => buildRow('Input', input.name));
        access.outputs.forEach((output: MIDIOutput) => buildRow('Output', output.name));
      },
      (err: any) => {
        console.error(err);
        const errorMessage = document.createElement('span');
        errorMessage.innerText = 'Your browser doesn\'t support the WebMidi API.';
        this.htmlElement.append(errorMessage);
      },
    );
  }

  private testBeep(): void {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);

    const now = ctx.currentTime;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.5);
    gain.gain.linearRampToValueAtTime(0, now + 1);

    setTimeout(() => {
      osc.stop();
      osc.disconnect();
      gain.disconnect();
    }, 2000);

    osc.start(now);
  }
}

injectStyle('ConfigurationPanel', `
.configuration-panel {
  min-width: 300px;
  min-height: 300px;
  max-height: 90%;
  padding: 2px 22px;
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
}

.device-row {
  margin: 1px;
  display: flex;
  flex-direction: row;
  flex-wrap: no-wrap;
}

.device-row label {
  flex-grow: 1;
  display: flex;
  align-items: center;
  background: none;
  user-select: none;
}

.alias-input {
  width: 100px;
  margin-left: 12px;
  background: none;
  border: 1px solid #80808070;
  box-shadow: 2px 2px 4px 0 #0000000f inset;
  padding: 2px;
  font-family: monospace;
}
`);
