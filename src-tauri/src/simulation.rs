use crate::models::{CustomerConfig, SeatConfig, SimulationFrame, SimulationEvent, Seat};
use crate::parser;
use crate::errors::{AppError, Result};
use rand::Rng;
use std::sync::{Arc, Mutex, Condvar};
use std::thread;
use std::time::{Duration, Instant};

// ==========================================
// 1. 資源與常數定義
// ==========================================

const DEFAULT_BABY_CHAIRS: i32 = 4; // 題目規定預設值
const WAIT_TIMEOUT_MS: u64 = 2000;  // 超時設定：模擬死結/飢餓偵測 (2秒)

struct SushiResources {
    // 資源計數 (Semaphores)
    baby_chairs_available: i32,
    wheelchair_spots_available: i32,
    
    // 座位資源
    seats: Vec<SeatState>,
    
    // 事件紀錄
    events: Vec<SimEvent>,
}

#[derive(Clone, Debug)]
struct SeatState {
    config: SeatConfig,
    occupied_by: Option<u32>,
}

#[derive(Debug, Clone)]
struct SimEvent {
    time: u64,
    family_id: u32,
    customer_id: u32,
    action: Action,
    log_message: String,
}

#[derive(Debug, Clone)]
enum Action {
    Arrive,
    Sit(String),
    Leave(String),
    Error(String), // 新增：錯誤事件 (用於回報 Deadlock/Timeout)
}

// ==========================================
// 2. 模擬入口
// ==========================================

#[tauri::command]
pub fn generate_customers(count: u32, max_arrival_time: u64) -> Vec<CustomerConfig> {
    let mut rng = rand::thread_rng();
    let mut customers = Vec::new();

    for i in 0..count {
        let id = i + 1;
        let family_id = id;
        let arrival_time = rng.gen_range(0..=max_arrival_time);
        
        // 隨機生成符合題目情境的客戶類型
        let type_roll = rng.gen_range(0..100);
        let (type_, party_size, baby_chairs, wheelchairs) = if type_roll < 40 {
            ("INDIVIDUAL", 1, 0, 0)
        } else if type_roll < 70 {
            ("FAMILY", 4, 0, 0) // 假設家庭固定4人以展示優先級/降級
        } else if type_roll < 90 {
            ("WITH_BABY", 2, 1, 0) // 1大人+1嬰兒 (共2座位，需1嬰兒椅)
        } else {
            ("WHEELCHAIR", 1, 0, 1) // 1人+1輪椅
        };

        let est_dining_time = rng.gen_range(30..=60);

        customers.push(CustomerConfig {
            id,
            family_id,
            arrival_time,
            type_: type_.to_string(),
            party_size,
            baby_chair_count: baby_chairs,
            wheelchair_count: wheelchairs,
            est_dining_time,
        });
    }
    
    customers.sort_by_key(|c| c.arrival_time);
    customers
}

#[tauri::command]
pub fn start_simulation(csv_content: String, seat_config_json: String) -> Result<Vec<SimulationFrame>> {
    // 1. 解析資料
    let customers = parser::parse_customers(&csv_content)
        .map_err(|e| AppError::CsvParseError(e.to_string()))?;
    
    let seats_config: Vec<SeatConfig> = serde_json::from_str(&seat_config_json)
        .map_err(|e| AppError::JsonParseError(e.to_string()))?;

    if customers.is_empty() { return Ok(Vec::new()); }

    // ------------------------------------------------------------
    // 🔥 修改點 1: 動態資源初始化 (Dynamic Resource Initialization)
    // ------------------------------------------------------------
    
    // A. 輪椅位：動態從地圖計算
    // 這解決了「可調整」的需求。載入預設地圖時它會是 2，畫新地圖時會自動更新。
    let total_wheelchair_spots = seats_config.iter()
        .filter(|s| s.is_wheelchair_accessible)
        .count() as i32;

    // B. 嬰兒椅：使用常數預設值
    // (進階：若前端有傳參數，可在此替換 DEFAULT_BABY_CHAIRS)
    let total_baby_chairs = DEFAULT_BABY_CHAIRS;

    // 初始化 Monitor
    let initial_resources = SushiResources {
        baby_chairs_available: total_baby_chairs,
        wheelchair_spots_available: total_wheelchair_spots,
        seats: seats_config.iter().map(|s| SeatState { 
            config: s.clone(), 
            occupied_by: None 
        }).collect(),
        events: Vec::new(),
    };

    let monitor = Arc::new((Mutex::new(initial_resources), Condvar::new()));
    let mut handles = vec![];

    // 2. 執行緒模擬
    for customer in customers.clone() {
        let monitor_clone = Arc::clone(&monitor);
        
        let handle = thread::spawn(move || {
            let (lock, cvar) = &*monitor_clone;
            
            // --- 階段 1: 抵達 ---
            {
                let mut res = lock.lock().unwrap();
                let log = format!("[{}] [{}] ID: {} | Arrived", customer.arrival_time, customer.type_, customer.id);
                res.events.push(SimEvent {
                    time: customer.arrival_time, family_id: customer.family_id, customer_id: customer.id,
                    action: Action::Arrive, log_message: log,
                });
            }

            // --- 階段 2: 競爭資源 (含 Deadlock/Starvation 處理) ---
            let mut seated_seat_ids: Vec<String> = Vec::new();
            let mut res = lock.lock().unwrap();
            let _start_wait_time = Instant::now();
            
            loop {
                // 嘗試分配
                let allocation = try_allocate(&res, &customer);
                
                if let Some(seat_ids) = allocation {
                    // [成功] 扣除資源
                    res.baby_chairs_available -= customer.baby_chair_count as i32;
                    res.wheelchair_spots_available -= customer.wheelchair_count as i32;
                    for sid in &seat_ids {
                        if let Some(seat) = res.seats.iter_mut().find(|s| s.config.id == *sid) {
                            seat.occupied_by = Some(customer.family_id);
                        }
                    }
                    seated_seat_ids = seat_ids;
                    break; 
                } else {
                    // [失敗] 進入等待 (Wait)
                    // 🔥 修改點 2: 使用 wait_timeout 來處理「疑似死結/飢餓」
                    // 如果等太久 (WAIT_TIMEOUT_MS)，我們會收到 timeout
                    let result = cvar.wait_timeout(res, Duration::from_millis(WAIT_TIMEOUT_MS)).unwrap();
                    res = result.0; // 取回鎖
                    
                    if result.1.timed_out() {
                        // 發生超時！這可能是 Deadlock 或 資源極度短缺 (Starvation)
                        let log_err = format!("[TIMEOUT] ID: {} 等待資源超時！疑似 Deadlock 或飢餓。", customer.id);
                        res.events.push(SimEvent {
                            time: customer.arrival_time + 999, // 標記為很久以後
                            family_id: customer.family_id,
                            customer_id: customer.id,
                            action: Action::Error("TIMEOUT".to_string()),
                            log_message: log_err,
                        });
                        return; // 強制退出執行緒，避免程式卡死
                    }
                }
            }

            // --- 階段 3: 用餐 ---
            // (這段邏輯與之前相同，計算時間並釋放鎖)
            let last_time = res.events.last().map(|e| e.time).unwrap_or(0);
            let sit_time = std::cmp::max(last_time, customer.arrival_time);
            
            let seat_str = seated_seat_ids.join(",");
            let log_sit = format!("[{}] [{}] ID: {} | Seated: {}", sit_time, customer.type_, customer.id, seat_str);
            res.events.push(SimEvent {
                time: sit_time, family_id: customer.family_id, customer_id: customer.id,
                action: Action::Sit(seat_str.clone()), log_message: log_sit,
            });

            drop(res); // 釋放鎖吃飯

            // --- 階段 4: 離開 ---
            let leave_time = sit_time + customer.est_dining_time;
            let mut res = lock.lock().unwrap();
            
            // 歸還資源
            res.baby_chairs_available += customer.baby_chair_count as i32;
            res.wheelchair_spots_available += customer.wheelchair_count as i32;
            for sid in &seated_seat_ids {
                if let Some(seat) = res.seats.iter_mut().find(|s| s.config.id == *sid) {
                    seat.occupied_by = None;
                }
            }
            
            let log_leave = format!("[{}] [{}] ID: {} | Left", leave_time, customer.type_, customer.id);
            res.events.push(SimEvent {
                time: leave_time, family_id: customer.family_id, customer_id: customer.id,
                action: Action::Leave(seat_str), log_message: log_leave,
            });

            cvar.notify_all(); // 通知其他人
        });
        handles.push(handle);
    }

    for h in handles { let _ = h.join(); }

    // 3. 產生前端 Frames (Replay)
    // (邏輯與之前相同，這裡做簡化整合)
    generate_frames(monitor, &seats_config)
}

// 輔助函式：產生 Frames (將原本長長的程式碼移出來比較乾淨)
fn generate_frames(monitor: Arc<(Mutex<SushiResources>, Condvar)>, seats_config: &Vec<SeatConfig>) -> Result<Vec<SimulationFrame>> {
    let result_lock = monitor.0.lock().unwrap();
    let mut sorted_events = result_lock.events.clone();
    sorted_events.sort_by_key(|e| e.time);

    let max_time = sorted_events.last().map(|e| e.time).unwrap_or(0);
    let mut frames = Vec::new();
    
    // 初始狀態
    let mut current_seats: Vec<Seat> = seats_config.iter().map(|s| Seat {
        id: s.id.clone(), type_: s.type_.clone(), occupied_by: None,
        is_baby_chair_attached: false, is_wheelchair_accessible: s.is_wheelchair_accessible,
    }).collect();
    let mut current_logs = Vec::new();
    let mut event_idx = 0;
    let mut accumulated_events = Vec::new();

    for t in 0..=max_time + 5 {
        let mut frame_events = Vec::new();
        while event_idx < sorted_events.len() && sorted_events[event_idx].time <= t {
            let evt = &sorted_events[event_idx];
            current_logs.push(evt.log_message.clone());
            
            match &evt.action {
                Action::Sit(ids) => update_seats(&mut current_seats, ids, Some(evt.family_id)),
                Action::Leave(ids) => update_seats(&mut current_seats, ids, None),
                Action::Error(_) => {}, // 錯誤事件只顯示在 Log，不影響座位
                _ => {}
            }
            
            let fe = SimulationEvent {
                timestamp: t, type_: format!("{:?}", evt.action), customer_id: evt.customer_id,
                family_id: evt.family_id, seat_id: None, message: evt.log_message.clone(),
            };
            frame_events.push(fe.clone());
            accumulated_events.push(fe);
            event_idx += 1;
        }
        frames.push(SimulationFrame {
            timestamp: t, seats: current_seats.clone(), waiting_queue: Vec::new(),
            events: accumulated_events.clone(), logs: current_logs.clone(),
        });
    }
    Ok(frames)
}

fn update_seats(seats: &mut Vec<Seat>, ids_str: &str, family_id: Option<u32>) {
    for id in ids_str.split(',') {
        if let Some(s) = seats.iter_mut().find(|s| s.id == id) {
            s.occupied_by = family_id;
            // 簡單處理：如果有人坐，假設 Baby Chair 可能被用了 (這裡可以做更細的視覺化)
            s.is_baby_chair_attached = family_id.is_some(); 
        }
    }
}

// ==========================================
// 3. 分配演算法 (try_allocate)
// ==========================================
// (請保持之前的 try_allocate 邏輯，它是正確的 Atomic Allocation)
fn try_allocate(res: &SushiResources, customer: &CustomerConfig) -> Option<Vec<String>> {
    // 檢查全域資源 (Semaphore)
    if customer.baby_chair_count > 0 && res.baby_chairs_available < customer.baby_chair_count as i32 { return None; }
    if customer.wheelchair_count > 0 && res.wheelchair_spots_available < customer.wheelchair_count as i32 { return None; }

    let required = customer.party_size as usize;
    let needs_baby_chair = customer.baby_chair_count > 0;
    
    // 策略 A: 輪椅
    if customer.wheelchair_count > 0 {
        let seats: Vec<String> = res.seats.iter()
            .filter(|s| s.occupied_by.is_none() && s.config.is_wheelchair_accessible)
            .take(required).map(|s| s.config.id.clone()).collect();
        return if seats.len() == required { Some(seats) } else { None };
    }

    // 策略 B: 家庭 (優先沙發 4P/6P)
    if customer.party_size >= 3 {
        let sofa: Vec<String> = res.seats.iter()
            .filter(|s| s.occupied_by.is_none() 
                     && (s.config.type_ == "4P" || s.config.type_ == "6P")
                     && (!needs_baby_chair || s.config.can_attach_baby_chair))
            .take(required).map(|s| s.config.id.clone()).collect();
        if sofa.len() == required { return Some(sofa); }
        
        // 降級：找連續 SINGLE (簡化版：只找任意 SINGLE)
        let bar: Vec<String> = res.seats.iter()
            .filter(|s| s.occupied_by.is_none() 
                     && s.config.type_ == "SINGLE"
                     && (!needs_baby_chair || s.config.can_attach_baby_chair))
            .take(required).map(|s| s.config.id.clone()).collect();
        if bar.len() == required { return Some(bar); }
    } else {
        // 策略 C: 單人 (優先 SINGLE)
        let bar: Vec<String> = res.seats.iter()
            .filter(|s| s.occupied_by.is_none() 
                     && s.config.type_ == "SINGLE"
                     && (!needs_baby_chair || s.config.can_attach_baby_chair))
            .take(required).map(|s| s.config.id.clone()).collect();
        if bar.len() == required { return Some(bar); }
    }
    None
}
