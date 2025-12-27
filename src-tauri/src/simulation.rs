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

const DEFAULT_BABY_CHAIRS: i32 = 4; // 題目規定嬰兒椅總數固定為 4
const WAIT_TIMEOUT_MS: u64 = 2000;  // 避免死結的超時機制

struct SushiResources {
    // 資源計數 (Semaphores)
    baby_chairs_available: i32,
    // 注意：移除 wheelchair_spots_available，因為輪椅改為直接佔用沙發資源
    
    // 座位資源
    seats: Vec<SeatState>,
    
    // 事件紀錄
    events: Vec<SimEvent>,
}

#[derive(Clone, Debug)]
struct SeatState {
    config: SeatConfig,
    occupied_by: Option<u32>, // Family ID
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
    Error(String),
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
        
        // 調整機率以測試多種情境
        let type_roll = rng.gen_range(0..100);
        let (type_, party_size, baby_chairs, wheelchairs) = if type_roll < 40 {
            ("INDIVIDUAL", 1, 0, 0)
        } else if type_roll < 65 {
            ("FAMILY", 4, 0, 0) 
        } else if type_roll < 85 {
            // 1大人帶2小孩測試 (需1座位, 2嬰兒椅)
            ("WITH_BABY", 1, 2, 0) 
        } else {
            // 輪椅測試 (需佔用沙發)
            ("WHEELCHAIR", 1, 0, 1) 
        };

        customers.push(CustomerConfig {
            id, family_id: id, arrival_time, type_: type_.to_string(),
            party_size, baby_chair_count: baby_chairs, wheelchair_count: wheelchairs,
            est_dining_time: rng.gen_range(30..=60),
        });
    }
    customers.sort_by_key(|c| c.arrival_time);
    customers
}

#[tauri::command]
pub fn start_simulation(csv_content: String, seat_config_json: String) -> Result<Vec<SimulationFrame>> {
    let customers = parser::parse_customers(&csv_content)
        .map_err(|e| AppError::CsvParseError(e.to_string()))?;
    
    let seats_config: Vec<SeatConfig> = serde_json::from_str(&seat_config_json)
        .map_err(|e| AppError::JsonParseError(e.to_string()))?;

    if customers.is_empty() { return Ok(Vec::new()); }

    // 初始化資源 Monitor
    let initial_resources = SushiResources {
        baby_chairs_available: DEFAULT_BABY_CHAIRS,
        // 不再設定輪椅計數，改為邏輯判斷
        seats: seats_config.iter().map(|s| SeatState { 
            config: s.clone(), 
            occupied_by: None 
        }).collect(),
        events: Vec::new(),
    };

    let monitor = Arc::new((Mutex::new(initial_resources), Condvar::new()));
    let mut handles = vec![];

    for customer in customers.clone() {
        let monitor_clone = Arc::clone(&monitor);
        
        let handle = thread::spawn(move || {
            let (lock, cvar) = &*monitor_clone;
            
            // --- 階段 1: 抵達 ---
            {
                let mut res = lock.lock().unwrap();
                let log = format!("[{}] [{}] ID: {} | 需求: {}位, B={}, W={} | Arrived", 
                    customer.arrival_time, customer.type_, customer.id, customer.party_size, customer.baby_chair_count, customer.wheelchair_count);
                res.events.push(SimEvent {
                    time: customer.arrival_time, family_id: customer.family_id, customer_id: customer.id,
                    action: Action::Arrive, log_message: log,
                });
            }

            // --- 階段 2: 競爭資源 ---
            let mut seated_seat_ids: Vec<String> = Vec::new();
            let mut res = lock.lock().unwrap();
            let mut waited = false;
            
            loop {
                // 嘗試分配 (核心邏輯修改處)
                let allocation = try_allocate(&res, &customer);
                
                if let Some(seat_ids) = allocation {
                    // [成功] 扣除嬰兒椅資源
                    res.baby_chairs_available -= customer.baby_chair_count as i32;
                    
                    // 標記座位佔用
                    for sid in &seat_ids {
                        if let Some(seat) = res.seats.iter_mut().find(|s| s.config.id == *sid) {
                            seat.occupied_by = Some(customer.family_id);
                        }
                    }
                    seated_seat_ids = seat_ids;
                    break; 
                } else {
                    // [失敗] 等待
                    waited = true;
                    let result = cvar.wait_timeout(res, Duration::from_millis(WAIT_TIMEOUT_MS)).unwrap();
                    res = result.0;
                    
                    if result.1.timed_out() {
                        let log_err = format!("[TIMEOUT] ID: {} 等待超時 (疑似資源不足/死結)", customer.id);
                        res.events.push(SimEvent {
                            time: customer.arrival_time + 999, family_id: customer.family_id, customer_id: customer.id,
                            action: Action::Error("TIMEOUT".to_string()), log_message: log_err,
                        });
                        return;
                    }
                }
            }

            // --- 階段 3: 用餐 ---
            // 修正時間計算邏輯：
            // 如果沒有等待，入座時間 = 抵達時間
            // 如果有等待，入座時間 = max(抵達時間, 最後一次有人離開的時間)
            let sit_time = if waited {
                let max_leave = res.events.iter()
                    .filter(|e| matches!(e.action, Action::Leave(_)))
                    .map(|e| e.time)
                    .max().unwrap_or(0);
                std::cmp::max(max_leave, customer.arrival_time)
            } else {
                customer.arrival_time
            };
            
            let seat_str = seated_seat_ids.join(",");
            let log_sit = format!("[{}] [{}] ID: {} | 入座: {} | 剩餘嬰兒椅: {}", 
                sit_time, customer.type_, customer.id, seat_str, res.baby_chairs_available);
            
            res.events.push(SimEvent {
                time: sit_time, family_id: customer.family_id, customer_id: customer.id,
                action: Action::Sit(seat_str.clone()), log_message: log_sit,
            });

            drop(res); // 釋放鎖，模擬用餐時間
            
            // 加入微小延遲以確保執行緒交錯 (模擬真實並發)
            thread::sleep(Duration::from_millis(10));

            // --- 階段 4: 離開 ---
            let leave_time = sit_time + customer.est_dining_time;
            let mut res = lock.lock().unwrap();
            
            // 歸還資源
            res.baby_chairs_available += customer.baby_chair_count as i32;
            
            for sid in &seated_seat_ids {
                if let Some(seat) = res.seats.iter_mut().find(|s| s.config.id == *sid) {
                    seat.occupied_by = None;
                }
            }
            
            let log_leave = format!("[{}] [{}] ID: {} | 離開", leave_time, customer.type_, customer.id);
            res.events.push(SimEvent {
                time: leave_time, family_id: customer.family_id, customer_id: customer.id,
                action: Action::Leave(seat_str), log_message: log_leave,
            });

            cvar.notify_all();
        });
        handles.push(handle);
    }

    for h in handles { let _ = h.join(); }

    generate_frames(monitor, &seats_config)
}

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
                Action::Sit(ids) => {
                    // 簡單判斷：Log 訊息裡包含 "B=1" 或 "B=2" 代表有嬰兒
                    let has_baby = evt.log_message.contains("B=1") || evt.log_message.contains("B=2");
                    update_seats(&mut current_seats, ids, Some(evt.family_id), has_baby);
                },
                Action::Leave(ids) => update_seats(&mut current_seats, ids, None, false),
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

fn update_seats(seats: &mut Vec<Seat>, ids_str: &str, family_id: Option<u32>, has_baby: bool) {
    for id in ids_str.split(',') {
        if let Some(s) = seats.iter_mut().find(|s| s.id == id) {
            s.occupied_by = family_id;
            s.is_baby_chair_attached = has_baby; // 若入座且有嬰兒需求，設為 true
        }
    }
}

// ==========================================
// 3. 分配演算法 (符合您的新需求)
// ==========================================
fn try_allocate(res: &SushiResources, customer: &CustomerConfig) -> Option<Vec<String>> {
    // 規則 A: 嬰兒椅檢查 (全域數量 4)
    if customer.baby_chair_count > 0 && res.baby_chairs_available < customer.baby_chair_count as i32 { 
        return None; 
    }

    let required = customer.party_size as usize;
    
    // 規則 B: 輪椅 (強制坐沙發 4P/6P)
    // 題目要求：輪椅取代一般椅子，但必須在沙發區
    if customer.wheelchair_count > 0 {
        let sofa: Vec<String> = res.seats.iter()
            .filter(|s| s.occupied_by.is_none() && (s.config.type_ == "4P" || s.config.type_ == "6P"))
            .take(required).map(|s| s.config.id.clone()).collect();
        
        // 只要找到足夠的沙發空位，就允許入座 (不需管無障礙標記，因為所有沙發都可以撤椅子)
        return if sofa.len() == required { Some(sofa) } else { None };
    }

    // 規則 C: 一般家庭/帶小孩 (優先沙發)
    // 小孩椅只要依附大人，不需特定座位類型
    if customer.party_size >= 3 {
        // 1. 找沙發
        let sofa: Vec<String> = res.seats.iter()
            .filter(|s| s.occupied_by.is_none() && (s.config.type_ == "4P" || s.config.type_ == "6P"))
            .take(required).map(|s| s.config.id.clone()).collect();
        if sofa.len() == required { return Some(sofa); }
        
        // 2. 降級找吧台
        let bar: Vec<String> = res.seats.iter()
            .filter(|s| s.occupied_by.is_none() && s.config.type_ == "SINGLE")
            .take(required).map(|s| s.config.id.clone()).collect();
        if bar.len() == required { return Some(bar); }
    } else {
        // 規則 D: 單人/雙人
        let bar: Vec<String> = res.seats.iter()
            .filter(|s| s.occupied_by.is_none() && s.config.type_ == "SINGLE")
            .take(required).map(|s| s.config.id.clone()).collect();
        if bar.len() == required { return Some(bar); }
        
        // 允許坐沙發 (如果吧台滿了)
        let sofa: Vec<String> = res.seats.iter()
            .filter(|s| s.occupied_by.is_none() && (s.config.type_ == "4P" || s.config.type_ == "6P"))
            .take(required).map(|s| s.config.id.clone()).collect();
        if sofa.len() == required { return Some(sofa); }
    }
    None
}
