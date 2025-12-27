<script lang="ts">
  import { simulationStore } from '../stores/simulation';
  import { playbackStore } from '../stores/playback';
  
  // 安全獲取長度，避免 undefined 錯誤
  $: totalDuration = $simulationStore.frames ? $simulationStore.frames.length : 0;
  $: currentFrame = Math.floor($playbackStore.currentTime);
  
  function handleSeek(e: Event) {
    const target = e.target as HTMLInputElement;
    const val = parseInt(target.value);
    playbackStore.update(s => ({ ...s, currentTime: val }));
  }
</script>

<div class="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-[100] px-6 py-2 flex flex-col justify-center">
  
  <div class="flex justify-between text-xs font-mono text-gray-500 mb-2">
    <span>00:00</span>
    <span class="font-bold text-blue-600 text-sm">T = {currentFrame} / {totalDuration}</span>
    <span>End</span>
  </div>

  <input
    type="range"
    min="0"
    max={totalDuration > 0 ? totalDuration - 1 : 0}
    value={currentFrame}
    oninput={handleSeek}
    class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500 transition-all"
    disabled={totalDuration === 0}
  />
</div>
