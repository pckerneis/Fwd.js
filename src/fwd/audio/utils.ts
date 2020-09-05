// Convert a audio-buffer segment to a Blob using WAVE representation
export function bufferToWave(audioBuffer: AudioBuffer, offset?: number, len?: number): Blob {
  offset = offset || 0;
  len = len || audioBuffer.length;
  const numOfChan = audioBuffer.numberOfChannels;
  const length = len * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const channels: Float32Array[] = [];

  let i: number;
  let sample: number;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952);                         // "RIFF"
  setUint32(length - 8);                         // file length - 8
  setUint32(0x45564157);                         // "WAVE"

  setUint32(0x20746d66);                         // "fmt " chunk
  setUint32(16);                                 // length = 16
  setUint16(1);                                  // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(audioBuffer.sampleRate);
  setUint32(audioBuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2);                      // block-align
  setUint16(16);                                 // 16-bit (hardcoded in this demo)

  setUint32(0x61746164);                         // "data" - chunk
  setUint32(length - pos - 4);                   // chunk length

  // write interleaved data
  for (i = 0; i < audioBuffer.numberOfChannels; i++)
    channels.push(audioBuffer.getChannelData(i));

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {             // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
      view.setInt16(pos, sample, true);          // update data chunk
      pos += 2;
    }
    offset++                                     // next source sample
  }

  // create Blob
  return new Blob([buffer], {type: 'audio/wav'});

  function setUint16(data: number): void {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number): void {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}

export function downloadFile(blob: Blob, fileName: any): void {
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style.display = 'none';

  const url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);

  a.remove();
}

export function playBack(audioBuffer: Blob): void {
  const url = window.URL.createObjectURL(audioBuffer);
  const audio = new Audio(url);
  audio.controls = true;
  audio.volume = 0.75;
  document.body.appendChild(audio);
  audio.play();
}
