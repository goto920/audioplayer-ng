// @ts-ignore
import { Mp3Encoder } from '@breezystack/lamejs';

export function audioBufferToMp3Blob(buffer: AudioBuffer, kbps = 192): Blob {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const encoder = new Mp3Encoder(channels, sampleRate, kbps);

  // 16bit PCM 整数配列へ変換するヘルパー
  const floatToInt16 = (float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  };

  const leftData = floatToInt16(buffer.getChannelData(0));
  const rightData = channels >= 2 ? floatToInt16(buffer.getChannelData(1)) : leftData;

  const sampleBlockSize = 1152; // MP3 エンコードの1ブロック長
  const mp3Data: Uint8Array[] = [];

  for (let i = 0; i < leftData.length; i += sampleBlockSize) {
    const leftChunk = leftData.subarray(i, i + sampleBlockSize);
    const rightChunk = rightData.subarray(i, i + sampleBlockSize);
    
    let mp3buf: Int8Array;
    if (channels === 1) {
      mp3buf = encoder.encodeBuffer(leftChunk);
    } else {
      mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
    }

    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }

  // 最終ブロックの書き出し
  const finalMp3buf: Int8Array = encoder.flush();
  if (finalMp3buf.length > 0) {
    mp3Data.push(new Uint8Array(finalMp3buf));
  }

  return new Blob(mp3Data, { type: 'audio/mp3' });
}
