import { AudioMixerElement } from "./fwd/editor/components/AudioMixerPanel/AudioMixerElement";
import { FlexPanel } from "./fwd/editor/components/FlexPanel/FlexPanel";
import { NoteSequencerElement } from "./fwd/editor/components/NoteSequencer/NoteSequencer";
import { TextEditorElement } from "./fwd/editor/components/TextEditor/TextEditor";

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

