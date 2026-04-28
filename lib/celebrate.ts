import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

let chimePlayer: AudioPlayer | null = null;
let cheerPlayer: AudioPlayer | null = null;
let completePlayer: AudioPlayer | null = null;
let upliftPlayer: AudioPlayer | null = null;
let levelUpPlayer: AudioPlayer | null = null;

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

function getComplete(): AudioPlayer | null {
  if (completePlayer) return completePlayer;
  try {
    completePlayer = createAudioPlayer(require('@/assets/sounds/complete.mp3'));
  } catch {
    completePlayer = null;
  }
  return completePlayer;
}

function getUplift(): AudioPlayer | null {
  if (upliftPlayer) return upliftPlayer;
  try {
    upliftPlayer = createAudioPlayer(require('@/assets/sounds/uplift.mp3'));
  } catch {
    upliftPlayer = null;
  }
  return upliftPlayer;
}

function getLevelUp(): AudioPlayer | null {
  if (levelUpPlayer) return levelUpPlayer;
  try {
    levelUpPlayer = createAudioPlayer(require('@/assets/sounds/level-up.mp3'));
  } catch {
    levelUpPlayer = null;
  }
  return levelUpPlayer;
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
const trophyListeners = new Set<Listener>();
const goalListeners = new Set<Listener>();

export function onCelebrate(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function onCelebrateTrophy(listener: Listener): () => void {
  trophyListeners.add(listener);
  return () => {
    trophyListeners.delete(listener);
  };
}

export function onCelebrateGoal(listener: Listener): () => void {
  goalListeners.add(listener);
  return () => {
    goalListeners.delete(listener);
  };
}

export function celebrate() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  playSafely(getLevelUp());
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // listener errors should not break the chain
    }
  });
}

export function celebrateTodoCheck() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  playSafely(getChime());
}

export function celebrateTrophy() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  playSafely(getCheer());
  playSafely(getUplift());
  trophyListeners.forEach((l) => {
    try {
      l();
    } catch {
      // listener errors should not break the chain
    }
  });
}

export function celebrateGoal() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  playSafely(getCheer());
  playSafely(getUplift());
  goalListeners.forEach((l) => {
    try {
      l();
    } catch {
      // listener errors should not break the chain
    }
  });
}

export function startCompletionSound() {
  playSafely(getComplete());
}

export function stopCompletionSound() {
  const player = getComplete();
  if (!player) return;
  try {
    player.pause();
    player.seekTo(0);
  } catch {
    // best-effort
  }
}
