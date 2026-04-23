import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

let chimePlayer: AudioPlayer | null = null;

function getChime(): AudioPlayer | null {
  if (chimePlayer) return chimePlayer;
  try {
    chimePlayer = createAudioPlayer(require('@/assets/sounds/chime.mp3'));
  } catch {
    chimePlayer = null;
  }
  return chimePlayer;
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
  const player = getChime();
  if (player) {
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // audio playback is best-effort
    }
  }
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // listener errors should not break the chain
    }
  });
}
