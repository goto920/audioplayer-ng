export type Lang = 'ja' | 'en';

export interface PlayerState {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  loopA: number;
  loopB: number;
  isLoopEnabled: boolean;
  loopCountdown: number | null;
  semitones: number;
  cents: number;
  tempo: number;
  volume: number;
}
