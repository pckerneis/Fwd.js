import { AudioMixerElement } from "./fwd/editor/elements/AudioMixerPanel/AudioMixerElement";
import { CodeEditorElement } from './fwd/editor/elements/CodeEditor';
import { FlexPanel } from "./fwd/editor/elements/FlexPanel/FlexPanel";
import { NoteSequencerElement } from "./fwd/editor/elements/NoteSequencer/NoteSequencer";
import { TextAreaElement } from "./fwd/editor/elements/TextArea/TextArea";

export default function declareAPI(namespace: string): void {
  if (window[namespace]) {
    throw new Error(`The global name ${namespace} is already used!`)
  }

  window[namespace] = {
    AudioMixerPanel: AudioMixerElement,
    FlexPanel,
    NoteSequencerElement,
    TextAreaElement,
    CodeEditorElement,
  };
}

