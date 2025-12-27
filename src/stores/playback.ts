import { writable, derived } from 'svelte/store';

interface PlaybackState {
  currentTime: number;
  isPlaying: boolean;
  speed: number;  // 0.5, 1, 2, 4
  maxTime: number;
}

export const playbackStore = writable<PlaybackState>({
  currentTime: 0,
  isPlaying: false,
  speed: 1,
  maxTime: 100
});

// Derived store for formatted time display
export const formattedCurrentTime = derived(
  playbackStore,
  $playback => formatTime($playback.currentTime)
);

export const formattedMaxTime = derived(
  playbackStore,
  $playback => formatTime($playback.maxTime)
);

// Derived store for progress percentage
export const progressPercentage = derived(
  playbackStore,
  $playback => $playback.maxTime > 0 ? ($playback.currentTime / $playback.maxTime) * 100 : 0
);

// Derived store to check if playback is at the end
export const isAtEnd = derived(
  playbackStore,
  $playback => $playback.currentTime >= $playback.maxTime
);

// Derived store to check if playback is at the beginning
export const isAtStart = derived(
  playbackStore,
  $playback => $playback.currentTime <= 0
);

// Internal interval reference
let playbackInterval: number | null = null;

// Helper functions
export function play() {
  playbackStore.update(state => {
    if (state.currentTime >= state.maxTime) {
      // If at the end, restart from beginning
      return { ...state, currentTime: 0, isPlaying: true };
    }
    return { ...state, isPlaying: true };
  });
  
  startPlaybackInterval();
}

export function pause() {
  playbackStore.update(state => ({ ...state, isPlaying: false }));
  stopPlaybackInterval();
}

export function toggle() {
  const currentState = getCurrentPlaybackState();
  if (currentState.isPlaying) {
    pause();
  } else {
    play();
  }
}

export function setTime(time: number) {
  playbackStore.update(state => ({
    ...state,
    currentTime: Math.max(0, Math.min(time, state.maxTime))
  }));
}

export function setSpeed(speed: number) {
  const validSpeeds = [0.25, 0.5, 1, 2, 4];
  const clampedSpeed = validSpeeds.includes(speed) ? speed : 1;
  
  playbackStore.update(state => ({ ...state, speed: clampedSpeed }));
  
  // Restart interval with new speed if playing
  const currentState = getCurrentPlaybackState();
  if (currentState.isPlaying) {
    stopPlaybackInterval();
    startPlaybackInterval();
  }
}

export function setMaxTime(max: number) {
  playbackStore.update(state => ({
    ...state,
    maxTime: Math.max(0, max),
    currentTime: Math.min(state.currentTime, max)
  }));
}

export function stepForward() {
  playbackStore.update(state => ({
    ...state,
    currentTime: Math.min(state.currentTime + 1, state.maxTime)
  }));
}

export function stepBackward() {
  playbackStore.update(state => ({
    ...state,
    currentTime: Math.max(state.currentTime - 1, 0)
  }));
}

export function jumpToStart() {
  setTime(0);
}

export function jumpToEnd() {
  playbackStore.update(state => {
    setTime(state.maxTime);
    return state;
  });
}

export function reset() {
  pause();
  setTime(0);
}

// Internal helper functions
function getCurrentPlaybackState(): PlaybackState {
  let currentState: PlaybackState;
  playbackStore.subscribe(state => {
    currentState = state;
  })();
  return currentState!;
}

function startPlaybackInterval() {
  stopPlaybackInterval(); // Clear any existing interval
  
  const currentState = getCurrentPlaybackState();
  const intervalMs = Math.max(50, 1000 / currentState.speed); // Minimum 50ms interval
  
  playbackInterval = setInterval(() => {
    playbackStore.update(state => {
      if (!state.isPlaying) {
        stopPlaybackInterval();
        return state;
      }
      
      const newTime = state.currentTime + (state.speed * 0.1); // Increment by 0.1 seconds * speed
      
      if (newTime >= state.maxTime) {
        // Reached the end
        stopPlaybackInterval();
        return { ...state, currentTime: state.maxTime, isPlaying: false };
      }
      
      return { ...state, currentTime: newTime };
    });
  }, intervalMs);
}

function stopPlaybackInterval() {
  if (playbackInterval !== null) {
    clearInterval(playbackInterval);
    playbackInterval = null;
  }
}

// Utility function to format time as HH:MM:SS
export function formatTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Utility function to parse time string back to seconds
export function parseTime(timeString: string): number {
  const parts = timeString.split(':').map(p => parseInt(p, 10));
  if (parts.length !== 3) return 0;
  
  const [hours, minutes, seconds] = parts;
  return hours * 3600 + minutes * 60 + seconds;
}

// Speed presets
export const SPEED_PRESETS = [0.25, 0.5, 1, 2, 4] as const;
export type SpeedPreset = typeof SPEED_PRESETS[number];

export function getNextSpeed(currentSpeed: number): SpeedPreset {
  const currentIndex = SPEED_PRESETS.indexOf(currentSpeed as SpeedPreset);
  const nextIndex = (currentIndex + 1) % SPEED_PRESETS.length;
  return SPEED_PRESETS[nextIndex];
}

export function getPreviousSpeed(currentSpeed: number): SpeedPreset {
  const currentIndex = SPEED_PRESETS.indexOf(currentSpeed as SpeedPreset);
  const prevIndex = currentIndex <= 0 ? SPEED_PRESETS.length - 1 : currentIndex - 1;
  return SPEED_PRESETS[prevIndex];
}

// Cleanup function to be called when component unmounts
export function cleanup() {
  stopPlaybackInterval();
}