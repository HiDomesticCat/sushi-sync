use crate::models::{CustomerConfig, SeatConfig, SimulationFrame, Seat};
use crate::parser;
use crate::errors::{AppError, Result};
use std::sync::{Arc, Mutex, Condvar};
use std::thread;
use std::time::Duration;
use std::collections::HashMap;

// Constants
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
    action: Action,
    log_message: String,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
enum Action {
    Arrive,
    Sit(String),
    Leave(String),
    Error(String),
}

// Command to load and parse customers from CSV
#[tauri::command]
pub fn load_customers(csv_content: String) -> Result<Vec<CustomerConfig>> {
    parser::parse_customers(&csv_content).map_err(|e| AppError::CsvParseError(e.to_string()))
}

#[tauri::command]
pub fn start_simulation(csv_content: String, seat_config_json: String) -> Result<Vec<SimulationFrame>> {
    println!("Rust: start_simulation called with CSV length: {}", csv_content.len());
    let customers = parser::parse_customers(&csv_content)
        .map_err(|e| {
            println!("Rust: CSV Parse Error: {}", e);
            AppError::CsvParseError(e.to_string())
        })?;
    
    println!("Rust: Parsed {} customers", customers.len());
    
    let seats_config: Vec<SeatConfig> = serde_json::from_str(&seat_config_json)
        .map_err(|e| {
            println!("Rust: JSON Parse Error: {}", e);
            AppError::JsonParseError(e.to_string())
        })?;

    println!("Rust: Parsed {} seats", seats_config.len());

    if customers.is_empty() { 
        println!("Rust: No customers to simulate");
        return Ok(Vec::new()); 
    }

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
                    time: customer.arrival_time, family_id: customer.family_id,
                    action: Action::Arrive, log_message: log,
                });
            }

            // Variable declared outside loop for scope access
            let seated_seat_ids: Vec<String>; 
            let mut res = lock.lock().unwrap();
            
            loop {
                if let Some(seat_ids) = try_allocate(&res, &customer) {
                    res.baby_chairs_available -= customer.baby_chair_count as i32;
                    for sid in &seat_ids {
                        if let Some(seat) = res.seats.iter_mut().find(|s| s.config.id == *sid) {
                            seat.occupied_by = Some(customer.family_id);
                        }
                    }
                    seated_seat_ids = seat_ids; // Assign to outer variable
                    break;
                }

                let result = cvar.wait_timeout(res, Duration::from_millis(WAIT_TIMEOUT_MS)).unwrap();
                res = result.0;
                if result.1.timed_out() {
                    let log = format!("[TIMEOUT] Customer {} waited too long.", customer.id);
                    res.events.push(SimEvent {
                        time: customer.arrival_time + 999, family_id: customer.family_id,
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
                time: sit_time, family_id: customer.family_id,
                action: Action::Sit(seat_str.clone()),
                log_message: format!("[{}] Customer {} Sat at {}", sit_time, customer.id, seat_str),
            });

            drop(res); // Simulating eating...

            // 4. Leave
            let leave_time = sit_time + customer.est_dining_time;
            let mut res = lock.lock().unwrap();
            
            res.baby_chairs_available += customer.baby_chair_count as i32;
            for sid in &seated_seat_ids {
                if let Some(seat) = res.seats.iter_mut().find(|s| s.config.id == *sid) {
                    seat.occupied_by = None;
                }
            }
            
            res.events.push(SimEvent {
                time: leave_time, family_id: customer.family_id,
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
    if customer.baby_chair_count > 0 && res.baby_chairs_available < customer.baby_chair_count as i32 {
        return None;
    }

    // Wheelchair logic: must sit in sofa (4P/6P)
    if customer.wheelchair_count > 0 {
        let seat = res.seats.iter()
            .find(|s| s.occupied_by.is_none() && (s.config.type_ == "4P" || s.config.type_ == "6P"));
        return seat.map(|s| vec![s.config.id.clone()]);
    }

    // General logic: groups prefer sofas, otherwise bar counter
    if customer.party_size > 1 {
        let sofa = res.seats.iter()
            .find(|s| s.occupied_by.is_none() && (s.config.type_ == "4P" || s.config.type_ == "6P"));
        if let Some(s) = sofa {
            return Some(vec![s.config.id.clone()]);
        }
    }

    // Finally try any available seats (e.g., bar counter)
    let any_seat = res.seats.iter()
        .find(|s| s.occupied_by.is_none());
        
    any_seat.map(|s| vec![s.config.id.clone()])
}

fn generate_frames(monitor: Arc<(Mutex<SushiResources>, Condvar)>, seats_config: &Vec<SeatConfig>) -> Result<Vec<SimulationFrame>> {
    let result_lock = monitor.0.lock().unwrap();
    let mut sorted_events = result_lock.events.clone();
    sorted_events.sort_by_key(|e| e.time);

    let max_time = sorted_events.last().map(|e| e.time).unwrap_or(0);
    let mut frames = Vec::new();
    
    let mut current_seats: Vec<Seat> = seats_config.iter().map(|s| Seat {
        id: s.id.clone(), type_: s.type_.clone(), occupied_by: None,
        baby_chair_count: 0, is_wheelchair_accessible: s.is_wheelchair_accessible,
    }).collect();
    
    let mut event_idx = 0;
    // Pre-scan: identify families with babies for visualization
    let mut family_baby_count: HashMap<u32, u32> = HashMap::new();
    for evt in &sorted_events {
        match &evt.action {
            Action::Arrive => {
                 // Extract baby count from log message: "Baby: X"
                 if let Some(pos) = evt.log_message.find("Baby: ") {
                     let start = pos + 6;
                     let end = evt.log_message[start..].find(',').map(|p| start + p).unwrap_or(evt.log_message.len());
                     if let Ok(count) = evt.log_message[start..end].trim().parse::<u32>() {
                         if count > 0 {
                             family_baby_count.insert(evt.family_id, count);
                         }
                     }
                 }
            },
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
                            if let Some(&count) = family_baby_count.get(&evt.family_id) {
                                s.baby_chair_count = count;
                            }
                        }
                    }
                },
                Action::Leave(ids) => {
                    for id in ids.split(',') {
                        if let Some(s) = current_seats.iter_mut().find(|seat| seat.id == id) {
                            s.occupied_by = None;
                            s.baby_chair_count = 0;
                        }
                    }
                },
                _ => {}
            }
            event_idx += 1;
        }
        
        let frame_events: Vec<crate::models::SimulationEvent> = sorted_events.iter()
            .filter(|e| e.time == t)
            .map(|e| crate::models::SimulationEvent {
                timestamp: e.time,
                type_: match &e.action {
                    Action::Arrive => "ARRIVAL".to_string(),
                    Action::Sit(_) => "SEATED".to_string(),
                    Action::Leave(_) => "LEFT".to_string(),
                    Action::Error(_) => "ERROR".to_string(),
                },
                customer_id: 0, // Simplified
                family_id: e.family_id,
                seat_id: match &e.action {
                    Action::Sit(id) | Action::Leave(id) => Some(id.clone()),
                    _ => None,
                },
                message: e.log_message.clone(),
            }).collect();

        let frame_logs: Vec<String> = frame_events.iter().map(|e| e.message.clone()).collect();

        frames.push(SimulationFrame {
            timestamp: t,
            seats: current_seats.clone(),
            waiting_queue: vec![],
            events: frame_events,
            logs: frame_logs,
        });
    }
    Ok(frames)
}
