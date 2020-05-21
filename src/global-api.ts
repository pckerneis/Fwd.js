import { AudioMixerPanel } from "./fwd/editor/components/AudioMixerPanel/AudioMixerPanel";

export default function declareAPI(namespace: string): void {
  if (window[namespace]) {
    throw new Error(`The global name ${namespace} is already used!`)
  }

  window[namespace] = {
    AudioMixerPanel: AudioMixerPanel,
  };
}

