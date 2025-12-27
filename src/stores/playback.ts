import { writable, derived, get } from 'svelte/store';

interface PlaybackState {
  currentTime: number;
  isPlaying: boolean;
  speed: number;
  maxTime: number;
}

export const playbackStore = writable<PlaybackState>({
  currentTime: 0,
  isPlaying: false,
  speed: 1,
  maxTime: 100
});

// ===== Derived Stores =====
export const formattedCurrentTime = derived(playbackStore, ($playback) => 
  formatTime($playback.currentTime)
);

export const formattedMaxTime = derived(playbackStore, ($playback) => 
  formatTime($playback.maxTime)
);

export const progressPercentage = derived(playbackStore, ($playback) =>
  $playback.maxTime > 0 ? ($playback.currentTime / $playback.maxTime) * 100 : 0
);

export const isAtEnd = derived(playbackStore, ($playback) =>
  $playback.currentTime >= $playback.maxTime
);

export const isAtStart = derived(playbackStore, ($playback) =>
  $playback.currentTime <= 0
);

// ===== Internal State =====
let playbackInterval: ReturnType<typeof setInterval> | null = null;

// ===== Control Functions =====
export function play() {
  const state = get(playbackStore);
  
  if (state.currentTime >= state.maxTime) {
    playbackStore.update(s => ({ ...s, currentTime: 0 }));
  }
  
  playbackStore.update(s => ({ ...s, isPlaying: true }));
  startPlaybackInterval();
}

export function pause() {
  playbackStore.update(s => ({ ...s, isPlaying: false }));
  stopPlaybackInterval();
}

export function toggle() {
  const state = get(playbackStore);
  if (state.isPlaying) {
    pause();
  } else {
    play();
  }
}

export function setTime(time: number) {
  playbackStore.update(s => ({
    ...s,
    currentTime: Math.max(0, Math.min(time, s.maxTime))
  }));
}

export function setSpeed(speed: number) {
  const validSpeeds = [0.25, 0.5, 1, 2, 4];
  const clampedSpeed = validSpeeds.includes(speed) ? speed : 1;
  
  playbackStore.update(s => ({ ...s, speed: clampedSpeed }));
  
  const state = get(playbackStore);
  if (state.isPlaying) {
    stopPlaybackInterval();
    startPlaybackInterval();
  }
}

export function setMaxTime(max: number) {
  playbackStore.update(s => ({
    ...s,
    maxTime: Math.max(0, max),
    currentTime: Math.min(s.currentTime, max)
  }));
}

export function stepForward() {
  playbackStore.update(s => ({
    ...s,
    currentTime: Math.min(s.currentTime + 1, s.maxTime)
  }));
}

export function stepBackward() {
  playbackStore.update(s => ({
    ...s,
    currentTime: Math.max(s.currentTime - 1, 0)
  }));
}

export function jumpToStart() {
  setTime(0);
}

export function jumpToEnd() {
  const state = get(playbackStore);
  setTime(state.maxTime);
}

export function reset() {
  pause();
  setTime(0);
}

// ===== Internal Functions =====
function startPlaybackInterval() {
  stopPlaybackInterval();
  
  const state = get(playbackStore);
  const intervalMs = Math.max(50, 100 / state.speed);
  
  playbackInterval = setInterval(() => {
    playbackStore.update(s => {
      if (!s.isPlaying) {
        stopPlaybackInterval();
        return s;
      }
      
      const increment = s.speed * 0.1;
      const newTime = s.currentTime + increment;
      
      if (newTime >= s.maxTime) {
        stopPlaybackInterval();
        return { ...s, currentTime: s.maxTime, isPlaying: false };
      }
      
      return { ...s, currentTime: newTime };
    });
  }, intervalMs);
}

function stopPlaybackInterval() {
  if (playbackInterval !== null) {
    clearInterval(playbackInterval);
    playbackInterval = null;
  }
}

// ===== Utility Functions =====
export function formatTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function parseTime(timeString: string): number {
  const parts = timeString.split(':').map(p => parseInt(p, 10));
  if (parts.length !== 3) return 0;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

export const SPEED_PRESETS = [0.25, 0.5, 1, 2, 4] as const;
export type SpeedPreset = typeof SPEED_PRESETS[number];

export function cycleSpeed() {
  const state = get(playbackStore);
  const currentIndex = SPEED_PRESETS.indexOf(state.speed as SpeedPreset);
  const nextIndex = (currentIndex + 1) % SPEED_PRESETS.length;
  setSpeed(SPEED_PRESETS[nextIndex]);
}

export function cleanup() {
  stopPlaybackInterval();
}
