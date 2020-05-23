import { AudioMixerElement } from "./fwd/editor/elements/AudioMixerPanel/AudioMixerElement";
import { FlexPanel } from "./fwd/editor/elements/FlexPanel/FlexPanel";
import { NoteSequencerElement } from "./fwd/editor/elements/NoteSequencer/NoteSequencer";
import { TextEditorElement } from "./fwd/editor/elements/TextEditor/TextEditor";

export default function declareAPI(namespace: string): void {
  if (window[namespace]) {
    throw new Error(`The global name ${namespace} is already used!`)
  }

  window[namespace] = {
    AudioMixerPanel: AudioMixerElement,
    FlexPanel,
    NoteSequencerElement,
    TextEditorElement,
  };
}

