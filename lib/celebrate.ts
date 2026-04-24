import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

let chimePlayer: AudioPlayer | null = null;
let cheerPlayer: AudioPlayer | null = null;

function getChime(): AudioPlayer | null {
  if (chimePlayer) return chimePlayer;
  try {
    chimePlayer = createAudioPlayer(require('@/assets/sounds/chime.mp3'));
  } catch {
    chimePlayer = null;
  }
  return chimePlayer;
}

function getCheer(): AudioPlayer | null {
  if (cheerPlayer) return cheerPlayer;
  try {
    cheerPlayer = createAudioPlayer(require('@/assets/sounds/cheer.mp3'));
  } catch {
    cheerPlayer = null;
  }
  return cheerPlayer;
}

function playSafely(player: AudioPlayer | null) {
  if (!player) return;
  try {
    player.seekTo(0);
    player.play();
  } catch {
    // audio playback is best-effort
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function onCelebrate(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function celebrate() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  playSafely(getChime());
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // listener errors should not break the chain
    }
  });
}

export function celebrateTrophy() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  playSafely(getCheer());
}
