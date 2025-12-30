use crate::models::{CustomerConfig, SeatConfig, SimulationFrame, SimulationEvent, Seat};
use crate::parser;
use crate::errors::{AppError, Result};
use std::sync::{Arc, Mutex, Condvar};
use std::thread;
use std::time::Duration;

// 根據題目範例設定預設資源
const DEFAULT_BABY_CHAIRS: i32 = 4;  // 依據需求文件截圖
const DEFAULT_WHEELCHAIRS: i32 = 2;  
const WAIT_TIMEOUT_MS: u64 = 3600000; // 增加到 1 小時，避免過早逾時

struct SushiResources {
    baby_chairs_available: i32,
    wheelchairs_available: i32,
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
    sequence: usize, // 新增：確保排序穩定
    family_id: u32,
    action: Action,
    log_message: String,
}

#[derive(Debug, Clone)]
enum Action {
    Arrive,
    Wait,   // ✅ 新增：符合題目要求的等待事件
    Sit(String),
    Leave(String),
    Error(String),
}

// 輔助函式：產生符合 output_rule.txt 的詳細 Log
// 格式: [Thread ID] [時間] [事件] ID:.. | 需求:.. | 結果 | 剩餘資源:..
fn generate_log(
    time: u64, 
    customer: &CustomerConfig, 
    event_type: &str, 
    result_str: &str, 
    res: &SushiResources
) -> String {
    // 計算剩餘座位
    let s_cnt = res.seats.iter().filter(|s| s.config.type_ == "SINGLE" && s.occupied_by.is_none()).count();
    let p4_cnt = res.seats.iter().filter(|s| s.config.type_ == "4P" && s.occupied_by.is_none()).count();
    let p6_cnt = res.seats.iter().filter(|s| s.config.type_ == "6P" && s.occupied_by.is_none()).count();
    
    // 取得 Thread ID (簡化為數字顯示)
    let thread_id = format!("{:?}", thread::current().id())
        .replace("ThreadId(", "")
        .replace(")", "");

    // 產生需求字串
    let mut req_parts = vec![format!("{} seats", customer.party_size)];
    if customer.baby_chair_count > 0 { req_parts.push(format!("{} baby_chair", customer.baby_chair_count)); }
    if customer.wheelchair_count > 0 { req_parts.push(format!("{} wheelchair", customer.wheelchair_count)); }
    let req_str = req_parts.join(", ");

    format!(
        "[{}] [{}] [{}] ID: {} | Requirements: {} | {} | Remaining: S={}, 4P={}, 6P={}, B={}, W={}",
        thread_id,
        time,
        event_type, // 修正：這裡應該顯示事件類型 (ARRIVE, SIT, LEAVE, WAIT)
        customer.id,
        req_str,
        result_str,
        s_cnt, p4_cnt, p6_cnt, 
        res.baby_chairs_available, 
        res.wheelchairs_available
    )
}

#[tauri::command]
pub fn load_customers(csv_content: String) -> Result<Vec<CustomerConfig>> {
    parser::parse_customers(&csv_content).map_err(|e| AppError::CsvParseError(e.to_string()))
}

#[tauri::command]
pub fn start_simulation(
    csv_content: String, 
    seat_config_json: String,
    baby_chairs: i32,
    wheelchairs: i32
) -> Result<Vec<SimulationFrame>> {
    let customers = parser::parse_customers(&csv_content)
        .map_err(|e| AppError::CsvParseError(e.to_string()))?;
    
    let seats_config: Vec<SeatConfig> = serde_json::from_str(&seat_config_json)
        .map_err(|e| AppError::JsonParseError(e.to_string()))?;

    if customers.is_empty() { return Ok(Vec::new()); }

    let initial_resources = SushiResources {
        baby_chairs_available: baby_chairs,
        wheelchairs_available: wheelchairs,
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
            
            // 1. Arrive (抵達)
            {
                let mut res = lock.lock().unwrap();
                let log = generate_log(customer.arrival_time, &customer, "ARRIVAL", "arrived", &res);
                let seq = res.events.len();
                res.events.push(SimEvent {
                    time: customer.arrival_time, 
                    sequence: seq,
                    family_id: customer.family_id,
                    action: Action::Arrive, log_message: log,
                });
            }

            // 2. Wait & Allocate (等待與分配)
            let mut seated_seat_ids: Vec<String> = Vec::new();
            let mut res = lock.lock().unwrap();
            let mut has_logged_wait = false; // 避免重複記錄 wait
            
            loop {
                // 嘗試分配資源
                if let Some(seat_ids) = try_allocate(&res, &customer) {
                    // 分配成功：扣除資源
                    res.baby_chairs_available -= customer.baby_chair_count as i32;
                    res.wheelchairs_available -= customer.wheelchair_count as i32; // ✅ 扣除輪椅
                    
                    for sid in &seat_ids {
                        if let Some(seat) = res.seats.iter_mut().find(|s| s.config.id == *sid) {
                            seat.occupied_by = Some(customer.family_id);
                        }
                    }
                    seated_seat_ids = seat_ids;
                    break; // 跳出等待迴圈
                }

                // 分配失敗：如果是第一次失敗，記錄 Waited 事件
                if !has_logged_wait {
                    let log = generate_log(customer.arrival_time, &customer, "WAITING", "waited", &res);
                    let seq = res.events.len();
                    res.events.push(SimEvent {
                        time: customer.arrival_time, 
                        sequence: seq,
                        family_id: customer.family_id, // 注意：時間暫定為抵達時間
                        action: Action::Wait, log_message: log,
                    });
                    has_logged_wait = true;
                }

                // 等待通知
                let result = cvar.wait_timeout(res, Duration::from_millis(WAIT_TIMEOUT_MS)).unwrap();
                res = result.0;
                if result.1.timed_out() {
                    // 逾時處理
                    let log = format!("[TIMEOUT] Customer {} gave up.", customer.id);
                    let seq = res.events.len();
                    res.events.push(SimEvent {
                        time: customer.arrival_time + 999, 
                        sequence: seq,
                        family_id: customer.family_id,
                        action: Action::Error("TIMEOUT".to_string()), log_message: log,
                    });
                    return;
                }
            }

            // 3. Sit (入座)
            let last_time = res.events.last().map(|e| e.time).unwrap_or(0);
            let sit_time = std::cmp::max(last_time, customer.arrival_time);
            let seat_str = seated_seat_ids.join(",");
            let result_str = format!("seated, id:[{}]", seat_str);
            
            let log = generate_log(sit_time, &customer, "SEATED", &result_str, &res);
            let seq = res.events.len();
            res.events.push(SimEvent {
                time: sit_time, 
                sequence: seq,
                family_id: customer.family_id,
                action: Action::Sit(seat_str.clone()),
                log_message: log,
            });

            drop(res); // 釋放鎖，開始用餐
            
            // 增加微小延遲，模擬用餐過程，防止資源被瞬間釋放導致競爭
            thread::sleep(Duration::from_millis(customer.est_dining_time * 10));

            // 4. Leave (離開)
            let leave_time = sit_time + customer.est_dining_time;
            let mut res = lock.lock().unwrap();
            
            // 歸還資源
            res.baby_chairs_available += customer.baby_chair_count as i32;
            res.wheelchairs_available += customer.wheelchair_count as i32; // ✅ 歸還輪椅
            
            for sid in &seated_seat_ids {
                if let Some(seat) = res.seats.iter_mut().find(|s| s.config.id == *sid) {
                    seat.occupied_by = None;
                }
            }
            
            let result_str = format!("release, id:[{}]", seat_str);
            let log = generate_log(leave_time, &customer, "LEFT", &result_str, &res);
            
            let seq = res.events.len();
            res.events.push(SimEvent {
                time: leave_time, 
                sequence: seq,
                family_id: customer.family_id,
                action: Action::Leave(seat_str),
                log_message: log,
            });
            
            cvar.notify_all(); // 通知等待中的顧客
        });
        handles.push(handle);
    }

    for h in handles { let _ = h.join(); }

    generate_frames(monitor, &seats_config, &customers)
}

fn try_allocate(res: &SushiResources, customer: &CustomerConfig) -> Option<Vec<String>> {
    // 1. 檢查全域資源 (嬰兒椅 & 輪椅)
    if customer.baby_chair_count > 0 && res.baby_chairs_available < customer.baby_chair_count as i32 {
        return None;
    }
    if customer.wheelchair_count > 0 && res.wheelchairs_available < customer.wheelchair_count as i32 {
        return None;
    }

    let mut chosen_seats = Vec::new();

    // 2. 尋找座位 (嚴格執行「一桌一家人，不併桌」原則)
    if customer.wheelchair_count > 0 {
        // 輪椅客：必須坐無障礙沙發 (4P/6P)，不能坐吧台 (SINGLE)
        // 佔用整張桌子，不與他人併桌
        let seat = res.seats.iter()
            .find(|s| {
                s.occupied_by.is_none() && 
                s.config.is_wheelchair_accessible && 
                s.config.type_ != "SINGLE"
            });
            
        if let Some(s) = seat {
            chosen_seats.push(s.config.id.clone());
        }
    } else if customer.party_size > 1 {
        // 多人家庭：首選沙發 (4P/6P)
        let sofa = res.seats.iter()
            .find(|s| {
                s.occupied_by.is_none() && 
                ((s.config.type_ == "4P" && customer.party_size <= 4) || 
                 (s.config.type_ == "6P" && customer.party_size <= 6))
            });
            
        if let Some(s) = sofa {
            chosen_seats.push(s.config.id.clone());
        } else if customer.party_size == 4 {
            // 降級邏輯：4 人家庭可以接受吧台區的 4 個連續單人位
            // 假設吧台位 ID 是按順序排列的 (例如 S01, S02...)
            let single_seats: Vec<&SeatState> = res.seats.iter()
                .filter(|s| s.config.type_ == "SINGLE")
                .collect();
            
            for i in 0..=single_seats.len().saturating_sub(4) {
                let window = &single_seats[i..i+4];
                if window.iter().all(|s| s.occupied_by.is_none()) {
                    chosen_seats = window.iter().map(|s| s.config.id.clone()).collect();
                    break;
                }
            }
        }
    } else {
        // 單人：優先找吧台 (SINGLE)
        let seat = res.seats.iter()
            .find(|s| s.occupied_by.is_none() && s.config.type_ == "SINGLE");
            
        if let Some(s) = seat {
            chosen_seats.push(s.config.id.clone());
        } else {
             // Fallback: 找任何空的多人桌 (4P/6P)
             let any_sofa = res.seats.iter()
                .find(|s| s.occupied_by.is_none() && s.config.type_ != "SINGLE");
             if let Some(s) = any_sofa {
                 chosen_seats.push(s.config.id.clone());
             }
        }
    }

    if chosen_seats.is_empty() {
        None
    } else {
        Some(chosen_seats)
    }
}

// 產生前端需要的 Frames
fn generate_frames(monitor: Arc<(Mutex<SushiResources>, Condvar)>, seats_config: &Vec<SeatConfig>, customers: &Vec<CustomerConfig>) -> Result<Vec<SimulationFrame>> {
    let result_lock = monitor.0.lock().unwrap();
    let mut sorted_events = result_lock.events.clone();
    // 使用穩定排序，並考慮 sequence 確保順序正確
    sorted_events.sort_by(|a, b| a.time.cmp(&b.time).then(a.sequence.cmp(&b.sequence)));

    let max_time = sorted_events.last().map(|e| e.time).unwrap_or(0);
    let mut frames = Vec::new();
    
    let mut current_seats: Vec<Seat> = seats_config.iter().map(|s| Seat {
        id: s.id.clone(), type_: s.type_.clone(), occupied_by: None,
        occupant_type: None,
        baby_chair_count: 0, 
        is_wheelchair_accessible: s.is_wheelchair_accessible,
    }).collect();
    
    // 用來標記視覺效果 (不影響邏輯)
    // 儲存家庭的特殊需求與嬰兒椅總數
    let mut family_info = std::collections::HashMap::new();

    for customer in customers {
        family_info.insert(customer.family_id, (
            customer.baby_chair_count,
            customer.wheelchair_count,
            customer.party_size
        ));
    }

    let mut event_idx = 0;
    let mut waiting_family_ids = std::collections::HashSet::new();
    
    // 產生每一秒的 Frame
    for t in 0..=max_time + 5 {
        while event_idx < sorted_events.len() && sorted_events[event_idx].time <= t {
            let evt = &sorted_events[event_idx];
            
            match &evt.action {
                Action::Arrive | Action::Wait => {
                    waiting_family_ids.insert(evt.family_id);
                },
                Action::Sit(ids) => {
                    waiting_family_ids.remove(&evt.family_id);
                    let seat_ids: Vec<&str> = ids.split(',').map(|s| s.trim()).collect();
                    let num_seats = seat_ids.len();
                    
                    if let Some(&(baby_cnt, wheel_cnt, _party_size)) = family_info.get(&evt.family_id) {
                        // 計算每個座位分配到的嬰兒椅 (平分)
                        let base_baby = baby_cnt / num_seats as u32;
                        let mut extra_baby = baby_cnt % num_seats as u32;

                        for (i, id) in seat_ids.iter().enumerate() {
                            if let Some(s) = current_seats.iter_mut().find(|seat| seat.id == *id) {
                                s.occupied_by = Some(evt.family_id);
                                
                                // 分配嬰兒椅
                                let mut my_baby = base_baby;
                                if extra_baby > 0 {
                                    my_baby += 1;
                                    extra_baby -= 1;
                                }
                                s.baby_chair_count = my_baby;

                                // 設定佔用者類型
                                if wheel_cnt > 0 && i == 0 {
                                    s.occupant_type = Some("WHEELCHAIR".to_string());
                                } else {
                                    s.occupant_type = Some("NORMAL".to_string());
                                }
                            }
                        }
                    }
                },
                Action::Leave(ids) => {
                    for id in ids.split(',') {
                        if let Some(s) = current_seats.iter_mut().find(|seat| seat.id == id.trim()) {
                            s.occupied_by = None;
                            s.occupant_type = None;
                            s.baby_chair_count = 0;
                        }
                    }
                },
                Action::Error(_) => {
                    waiting_family_ids.remove(&evt.family_id);
                }
            }
            event_idx += 1;
        }
        
        // 篩選出發生在此刻的事件，傳給前端 LogTerminal 顯示
        let current_events: Vec<SimulationEvent> = sorted_events.iter()
            .filter(|e| e.time == t)
            .map(|e| SimulationEvent {
                timestamp: e.time,
                type_: match e.action {
                    Action::Arrive => "ARRIVAL".into(),
                    Action::Wait => "WAITING".into(), 
                    Action::Sit(_) => "SEATED".into(),
                    Action::Leave(_) => "LEFT".into(),
                    Action::Error(_) => "ERROR".into(),
                },
                customer_id: e.family_id,
                family_id: e.family_id,
                seat_id: match &e.action {
                    Action::Sit(s) | Action::Leave(s) => Some(s.clone()),
                    _ => None,
                },
                message: e.log_message.clone(),
            }).collect();

        let waiting_customers: Vec<CustomerConfig> = waiting_family_ids.iter()
            .filter_map(|fid| customers.iter().find(|c| c.family_id == *fid).cloned())
            .collect();

        frames.push(SimulationFrame {
            timestamp: t,
            seats: current_seats.clone(),
            waiting_queue: waiting_customers, 
            events: current_events,
            logs: vec![],
        });
    }
    Ok(frames)
}
