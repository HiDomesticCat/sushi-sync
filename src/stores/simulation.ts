import { writable, derived, get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import type { SimulationFrame, CustomerConfig, SeatConfig } from '../types';
import { customerConfigStore, seatConfigStore, exportCustomersToCSV, resourceLimitsStore } from './config';

// ===== 狀態介面定義 =====
interface SimulationState {
  frames: SimulationFrame[];
  currentFrameIndex: number;
  isPlaying: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: SimulationState = {
  frames: [],
  currentFrameIndex: 0,
  isPlaying: false,
  loading: false,
  error: null
};

// ===== 主要 Store =====
export const simulationStore = writable<SimulationState>(initialState);

// ===== 衍生狀態 (Derived Stores) =====
export const isSimulationComplete = derived(simulationStore, $s => $s.frames.length > 0);
export const isSimulationRunning = derived(simulationStore, $s => $s.isPlaying);

export const currentFrame = derived(simulationStore, ($store) => {
  if ($store.frames.length === 0) return null;
  return $store.frames[$store.currentFrameIndex];
});

// 取得所有事件 (用於 Log Terminal)
export const allEvents = derived(simulationStore, ($store) => {
  if ($store.frames.length === 0) return [];
  const events: any[] = [];
  const seen = new Set();
  
  $store.frames.forEach(frame => {
    frame.events.forEach(event => {
      // 產生唯一 Key 避免重複顯示
      const key = `${event.timestamp}-${event.type}-${event.familyId}`;
      if (!seen.has(key)) {
        events.push(event);
        seen.add(key);
      }
    });
  });
  
  return events.sort((a, b) => a.timestamp - b.timestamp);
});

// 計算統計數據 (用於 Analysis Panel)
export const simulationStats = derived(simulationStore, ($store) => {
  const frames = $store.frames;
  if (frames.length === 0) {
    return {
      totalCustomers: 0,
      averageWaitTime: 0,
      averageDiningTime: 0,
      tableUtilization: 0,
      totalFrames: 0,
      totalEvents: 0,
      maxWaitingCustomers: 0,
      totalConflicts: 0,
      duration: 0,
      seatUtilization: 0
    };
  }
  
  const lastFrame = frames[frames.length - 1];
  const duration = lastFrame?.timestamp || 0;
  
  let totalSeatFrames = 0;
  let occupiedSeatFrames = 0;
  
  // 計算座位利用率
  frames.forEach(frame => {
    if (frame.seats) {
      totalSeatFrames += frame.seats.length;
      occupiedSeatFrames += frame.seats.filter(seat => seat.occupiedBy !== null).length;
    }
  });
  
  const seatUtilization = totalSeatFrames > 0 ? (occupiedSeatFrames / totalSeatFrames) * 100 : 0;
  
  return {
    totalCustomers: get(customerConfigStore).length,
    averageWaitTime: 0, // 可根據需要實作更複雜的等待時間計算
    averageDiningTime: 0,
    tableUtilization: seatUtilization,
    totalFrames: frames.length,
    totalEvents: 0,
    maxWaitingCustomers: 0,
    totalConflicts: 0,
    duration,
    seatUtilization
  };
});

// ===== 輔助函式 =====

// 根據時間戳取得 Frame
export function getFrameAtTime(timestamp: number) {
  const store = get(simulationStore);
  if (store.frames.length === 0) return null;
  
  let bestFrame = store.frames[0];
  for (let i = 0; i < store.frames.length; i++) {
    if (store.frames[i].timestamp <= timestamp) {
      bestFrame = store.frames[i];
    } else {
      break;
    }
  }
  return bestFrame;
}

export function loadSimulationFrames(frames: SimulationFrame[]) {
  simulationStore.update(s => ({
    ...s,
    frames: frames,
    currentFrameIndex: 0,
    loading: false
  }));
}

export function resetSimulation() {
  simulationStore.update(s => ({
    ...initialState
  }));
}

// ===== Actions (核心邏輯) =====
export const actions = {
  // 啟動模擬：這是唯一入口
  startSimulation: async (csvContent?: string) => {
    simulationStore.update(s => ({ ...s, loading: true, error: null }));
    
    try {
      // 1. 準備資料
      // 如果沒有傳入 CSV，則從目前的 Store 產生 (支援使用者在 UI 修改過顧客資料的情況)
      const finalCsvContent = csvContent || exportCustomersToCSV();
      const seatConfig = get(seatConfigStore);
      const seatConfigJson = JSON.stringify(seatConfig);
      
      console.log("Starting simulation...");

      // 2. 載入並解析顧客資料
      // 🔥 關鍵修正：直接使用泛型 <CustomerConfig[]>，Tauri 會自動對應 camelCase 欄位
      // 絕對不要在這裡手動 map (例如 c.type_ 或 c.party_size)，那是導致 NaN 的原因
      const customers = await invoke<CustomerConfig[]>('load_customers', { csvContent: finalCsvContent });
      
      console.log("Customers loaded from backend:", customers.length);
      // 將正確解析後的資料存回 Store (這會更新 UI 顯示)
      customerConfigStore.set(customers);

      // 3. 執行模擬
      const limits = get(resourceLimitsStore);
      const frames = await invoke<SimulationFrame[]>('start_simulation', { 
        csvContent: finalCsvContent,
        seatConfigJson,
        babyChairs: limits.babyChairs,
        wheelchairs: limits.wheelchairs
      });

      console.log("Simulation finished:", frames.length, "frames generated.");

      // 4. 更新模擬狀態
      simulationStore.update(s => ({
        ...s,
        frames: frames,
        currentFrameIndex: 0,
        loading: false
      }));

      return frames;

    } catch (err) {
      console.error("Simulation failed:", err);
      const errorMsg = String(err);
      simulationStore.update(s => ({ ...s, loading: false, error: errorMsg }));
      alert("Simulation Error: " + errorMsg);
      return [];
    }
  },

  setFrameIndex: (index: number) => {
    simulationStore.update(s => {
      const safeIndex = Math.max(0, Math.min(index, s.frames.length - 1));
      return { ...s, currentFrameIndex: safeIndex };
    });
  },

  togglePlayback: () => {
    simulationStore.update(s => ({ ...s, isPlaying: !s.isPlaying }));
  },

  reset: () => {
    resetSimulation();
  }
};

// ===== 相容性函式 (Deprecated) =====
// 為了防止舊的 UI 程式碼報錯，我們保留這個函式，但讓它轉發給新的 actions
export async function runSimulation(seatConfig: any[], customerConfig: any[]) {
  console.log("Legacy runSimulation called, redirecting to actions.startSimulation...");
  // 無論傳入什麼參數，我們都重新從 Store 匯出 CSV 以確保一致性
  // 或是直接呼叫 actions.startSimulation() 讓它自己去抓
  return await actions.startSimulation();
}