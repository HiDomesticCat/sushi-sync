use crate::models::{CustomerConfig, SeatConfig, SimulationFrame, SimulationEvent, Seat};
use crate::parser;
use crate::errors::{AppError, Result};
use std::sync::{Arc, Mutex, Condvar};
use std::thread;
use std::time::{Duration, Instant};

// 常數設定
const DEFAULT_BABY_CHAIRS: i32 = 4;
const WAIT_TIMEOUT_MS: u64 = 3000;

struct SushiResources {
    baby_chairs_available: i32,
    seats: Vec<SeatState>,
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
    Error(String),
}

#[tauri::command]
pub fn start_simulation(csv_content: String, seat_config_json: String) -> Result<Vec<SimulationFrame>> {
    let customers = parser::parse_customers(&csv_content)
        .map_err(|e| AppError::CsvParseError(e.to_string()))?;
    
    let seats_config: Vec<SeatConfig> = serde_json::from_str(&seat_config_json)
        .map_err(|e| AppError::JsonParseError(e.to_string()))?;

    if customers.is_empty() { return Ok(Vec::new()); }

    let initial_resources = SushiResources {
        baby_chairs_available: DEFAULT_BABY_CHAIRS,
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
            
            // 1. Arrive
            {
                let mut res = lock.lock().unwrap();
                let log = format!("[{}] Customer {} Arrived (Party: {}, Baby: {}, Wheel: {})", 
                    customer.arrival_time, customer.id, customer.party_size, customer.baby_chair_count, customer.wheelchair_count);
                res.events.push(SimEvent {
                    time: customer.arrival_time, family_id: customer.family_id, customer_id: customer.id,
                    action: Action::Arrive, log_message: log,
                });
            }

            // 2. Wait & Allocate
            let mut seated_seat_ids: Vec<String> = Vec::new();
            let mut res = lock.lock().unwrap();
            
            loop {
                // 使用 try_allocate 嘗試分配
                if let Some(seat_ids) = try_allocate(&res, &customer) {
                    // 分配成功：扣資源
                    res.baby_chairs_available -= customer.baby_chair_count as i32;
                    for sid in &seat_ids {
                        if let Some(seat) = res.seats.iter_mut().find(|s| s.config.id == *sid) {
                            seat.occupied_by = Some(customer.family_id);
                        }
                    }
                    seated_seat_ids = seat_ids;
                    break;
                }

                // 分配失敗：等待
                let result = cvar.wait_timeout(res, Duration::from_millis(WAIT_TIMEOUT_MS)).unwrap();
                res = result.0;
                if result.1.timed_out() {
                    let log = format!("[TIMEOUT] Customer {} waited too long.", customer.id);
                    res.events.push(SimEvent {
                        time: customer.arrival_time + 999, family_id: customer.family_id, customer_id: customer.id,
                        action: Action::Error("TIMEOUT".to_string()), log_message: log,
                    });
                    return;
                }
            }

            // 3. Sit & Eat
            let last_time = res.events.last().map(|e| e.time).unwrap_or(0);
            let sit_time = std::cmp::max(last_time, customer.arrival_time);
            let seat_str = seated_seat_ids.join(",");
            
            res.events.push(SimEvent {
                time: sit_time, family_id: customer.family_id, customer_id: customer.id,
                action: Action::Sit(seat_str.clone()), 
                log_message: format!("[{}] Customer {} Sat at {}", sit_time, customer.id, seat_str),
            });

            drop(res); // 釋放鎖模擬吃飯

            // 4. Leave
            let leave_time = sit_time + customer.est_dining_time;
            let mut res = lock.lock().unwrap();
            
            // 歸還資源
            res.baby_chairs_available += customer.baby_chair_count as i32;
            for sid in &seated_seat_ids {
                if let Some(seat) = res.seats.iter_mut().find(|s| s.config.id == *sid) {
                    seat.occupied_by = None;
                }
            }
            
            res.events.push(SimEvent {
                time: leave_time, family_id: customer.family_id, customer_id: customer.id,
                action: Action::Leave(seat_str),
                log_message: format!("[{}] Customer {} Left", leave_time, customer.id),
            });
            
            cvar.notify_all();
        });
        handles.push(handle);
    }

    for h in handles { let _ = h.join(); }

    generate_frames(monitor, &seats_config)
}

fn try_allocate(res: &SushiResources, customer: &CustomerConfig) -> Option<Vec<String>> {
    // 🔥 檢查庫存 (u32 比較)
    if customer.baby_chair_count > 0 && res.baby_chairs_available < customer.baby_chair_count as i32 {
        return None;
    }

    let required = customer.party_size as usize;

    // 輪椅邏輯：必須坐沙發 (4P/6P)
    if customer.wheelchair_count > 0 {
        let seats: Vec<String> = res.seats.iter()
            .filter(|s| s.occupied_by.is_none() && (s.config.type_ == "4P" || s.config.type_ == "6P"))
            .take(required).map(|s| s.config.id.clone()).collect();
        return if seats.len() == required { Some(seats) } else { None };
    }

    // 一般邏輯：多人優先坐沙發，沒位子坐吧台
    if customer.party_size > 1 {
        let sofa: Vec<String> = res.seats.iter()
            .filter(|s| s.occupied_by.is_none() && (s.config.type_ == "4P" || s.config.type_ == "6P"))
            .take(required).map(|s| s.config.id.clone()).collect();
        if sofa.len() == required { return Some(sofa); }
    }

    // 最後嘗試任意位子 (例如吧台)
    let any_seats: Vec<String> = res.seats.iter()
        .filter(|s| s.occupied_by.is_none())
        .take(required).map(|s| s.config.id.clone()).collect();
        
    if any_seats.len() == required { Some(any_seats) } else { None }
}

fn generate_frames(monitor: Arc<(Mutex<SushiResources>, Condvar)>, seats_config: &Vec<SeatConfig>) -> Result<Vec<SimulationFrame>> {
    let result_lock = monitor.0.lock().unwrap();
    let mut sorted_events = result_lock.events.clone();
    sorted_events.sort_by_key(|e| e.time);

    let max_time = sorted_events.last().map(|e| e.time).unwrap_or(0);
    let mut frames = Vec::new();
    
    let mut current_seats: Vec<Seat> = seats_config.iter().map(|s| Seat {
        id: s.id.clone(), type_: s.type_.clone(), occupied_by: None,
        is_baby_chair_attached: false, is_wheelchair_accessible: s.is_wheelchair_accessible,
    }).collect();
    
    let mut event_idx = 0;
    // 建立快取：哪些家庭有帶小孩 (用於視覺化 isBabyChairAttached)
    let mut family_has_baby = std::collections::HashMap::new();

    // 預先掃描所有事件來標記屬性
    for evt in &sorted_events {
        // 修復語法錯誤：使用正確的 match 語法
        match evt.action {
            Action::Arrive => {
                if evt.log_message.contains("Baby:") {
                    // 簡單解析 Log 字串判斷是否有嬰兒，或者更好是直接存起來
                    // 這裡為了簡化，假設 log 格式正確
                    if evt.log_message.contains("Baby: 1") || evt.log_message.contains("Baby: 2") {
                        family_has_baby.insert(evt.family_id, true);
                    }
                }
            }
            _ => {}
        }
    }

    for t in 0..=max_time + 5 {
        while event_idx < sorted_events.len() && sorted_events[event_idx].time <= t {
            let evt = &sorted_events[event_idx];
            match &evt.action {
                Action::Sit(ids) => {
                    for id in ids.split(',') {
                        if let Some(s) = current_seats.iter_mut().find(|seat| seat.id == id) {
                            s.occupied_by = Some(evt.family_id);
                            // 如果這個家庭有帶小孩，將座位標記為有嬰兒椅
                            // 前端會根據此屬性顯示氣泡
                            if family_has_baby.contains_key(&evt.family_id) {
                                s.is_baby_chair_attached = true;
                            }
                        }
                    }
                },
                Action::Leave(ids) => {
                    for id in ids.split(',') {
                        if let Some(s) = current_seats.iter_mut().find(|seat| seat.id == id) {
                            s.occupied_by = None;
                            s.is_baby_chair_attached = false;
                        }
                    }
                },
                _ => {}
            }
            event_idx += 1;
        }
        
        frames.push(SimulationFrame {
            timestamp: t,
            seats: current_seats.clone(),
            waiting_queue: vec![], // 可根據需要實作等待隊列
            events: vec![],
            logs: vec![],
        });
    }
    Ok(frames)
}
