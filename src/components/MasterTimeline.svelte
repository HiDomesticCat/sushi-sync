<script lang="ts">
  import { simulationStore } from '../stores/simulation';
  import { playbackStore, setTime } from '../stores/playback';
  
  // 取得總時間與當前時間
  let totalDuration = $derived($simulationStore.frames.length);
  let currentTime = $derived($playbackStore.currentTime);
  
  function handleSeek(e: Event) {
    const target = e.target as HTMLInputElement;
    const time = parseInt(target.value);
    setTime(time);
  }
</script>

<div class="w-full h-16 flex-none bg-white/90 border-t border-gray-200 px-4 py-2 flex flex-col justify-center z-50 shadow-lg">
  
  <div class="flex justify-between text-xs text-gray-500 mb-1">
    <span>Start (0s)</span>
    <span class="font-bold text-primary">Current: {currentTime}s</span>
    <span>End ({totalDuration}s)</span>
  </div>

  <input
    type="range"
    min="0"
    max={totalDuration > 0 ? totalDuration - 1 : 0}
    value={currentTime}
    oninput={handleSeek}
    class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
    disabled={totalDuration === 0}
  />
  
  <style>
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      height: 16px;
      width: 16px;
      border-radius: 50%;
      background: #ff6b6b; /* Primary color */
      cursor: pointer;
      margin-top: -6px; /* 垂直置中修正 */
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    input[type=range]::-webkit-slider-runnable-track {
      width: 100%;
      height: 4px;
      cursor: pointer;
      background: #e5e7eb;
      border-radius: 2px;
    }
  </style>
</div>
