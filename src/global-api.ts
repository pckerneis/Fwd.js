import { AudioMixerPanel } from "./fwd/editor/components/AudioMixerPanel/AudioMixerPanel";
import { FlexPanel } from "./fwd/editor/components/FlexPanel/FlexPanel";

export default function declareAPI(namespace: string): void {
  if (window[namespace]) {
    throw new Error(`The global name ${namespace} is already used!`)
  }

  window[namespace] = {
    AudioMixerPanel: AudioMixerPanel,
    FlexPanel: FlexPanel,
  };
}

