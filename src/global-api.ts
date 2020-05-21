import { AudioMixerPanel } from "./fwd/editor/components/AudioMixerPanel/AudioMixerPanel";
import { FlexPanel } from "./fwd/editor/components/FlexPanel/FlexPanel";
import { NoteSequencerElement } from "./fwd/editor/components/NoteSequencer/NoteSequencer";

export default function declareAPI(namespace: string): void {
  if (window[namespace]) {
    throw new Error(`The global name ${namespace} is already used!`)
  }

  window[namespace] = {
    AudioMixerPanel,
    FlexPanel,
    NoteSequencerElement,
  };
}

