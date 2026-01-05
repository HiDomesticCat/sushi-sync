use crate::models::{CustomerConfig, SeatConfig, SimulationFrame, SimulationEvent, Seat};
use crate::parser;
use crate::errors::{AppError, Result};
use std::sync::{Arc, Mutex, Condvar};
use std::thread;
use std::time::Duration;

// Default wait timeout (1 hour) to prevent premature timeout in simulation
const WAIT_TIMEOUT_MS: u64 = 3600000; 

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
    sequence: usize, // Sequence number to ensure stable sorting for concurrent events
    family_id: u32,
    action: Action,
    log_message: String,
}

#[derive(Debug, Clone)]
enum Action {
    Arrive,
    Wait,   
    Sit(String),
    Leave(String),
    Error,
}

// Helper: Generate detailed log matching output_rule.txt
// Format: [Thread ID] [Time] [Event] ID:.. | Requirements:.. | Result | Remaining: S=.., 4P=.., 6P=.., B=.., W=..
fn generate_log(
    time: u64, 
    customer: &CustomerConfig, 
    event_type: &str, 
    result_str: &str, 
    res: &SushiResources
) -> String {
    // Calculate remaining seats
    let s_cnt = res.seats.iter().filter(|s| s.config.type_ == "SINGLE" && s.occupied_by.is_none()).count();
    let p4_cnt = res.seats.iter().filter(|s| s.config.type_ == "4P" && s.occupied_by.is_none()).count();
    let p6_cnt = res.seats.iter().filter(|s| s.config.type_ == "6P" && s.occupied_by.is_none()).count();
    
    // Get Thread ID (simplified numeric display)
    let thread_id = format!("{:?}", thread::current().id())
        .replace("ThreadId(", "")
        .replace(")", "");

    // Generate requirements string
    let mut req_parts = vec![format!("{} seats", customer.party_size)];
    if customer.baby_chair_count > 0 { req_parts.push(format!("{} baby_chair", customer.baby_chair_count)); }
    if customer.wheelchair_count > 0 { req_parts.push(format!("{} wheelchair", customer.wheelchair_count)); }
    let req_str = req_parts.join(", ");

    format!(
        "[{}] [{}] [{}] ID: {} | Requirements: {} | {} | Remaining: S={}, 4P={}, 6P={}, B={}, W={}",
        thread_id,
        time,
        event_type, 
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
    let mut customers = parser::parse_customers(&csv_content)
        .map_err(|e| AppError::CsvParseError(e.to_string()))?;
    
    // Sort customers by arrival time
    // Since we already normalized -1 to 0 in parser.rs, we need to ensure 
    // those that were originally -1 are processed first.
    // The parser preserves order, so a stable sort on arrival_time is sufficient.
    customers.sort_by_key(|c| c.arrival_time);

    let mut pre_occupied_ids = std::collections::HashSet::new();
    // We can't rely on raw_time < 0 here because it's already normalized.
    // However, we know that pre-occupied customers are at the start of the list 
    // and have arrival_time 0.
    for c in &customers {
        if c.arrival_time == 0 && c.family_id >= 10000 {
            pre_occupied_ids.insert(c.family_id);
        }
    }

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
        let is_pre_occupied = pre_occupied_ids.contains(&customer.family_id);
        
        let handle = thread::spawn(move || {
            let (lock, cvar) = &*monitor_clone;
            
            // 1. Arrive
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

            // 2. Wait & Allocate
            let seated_seat_ids: Vec<String>;
            let mut res = lock.lock().unwrap();
            let mut has_logged_wait = false; // Avoid duplicate wait logging
            
            loop {
                // Try to allocate resources (Atomic check and allocation)
                if let Some(seat_ids) = try_allocate(&res, &customer) {
                    // Allocation success: deduct resources
                    res.baby_chairs_available -= customer.baby_chair_count as i32;
                    res.wheelchairs_available -= customer.wheelchair_count as i32;
                    
                    for sid in &seat_ids {
                        if let Some(seat) = res.seats.iter_mut().find(|s| s.config.id == *sid) {
                            seat.occupied_by = Some(customer.family_id);
                        }
                    }
                    seated_seat_ids = seat_ids;

                    // Generate SEATED log immediately while holding the lock to ensure atomicity
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

                    break; // Exit wait loop
                }

                // Pre-occupied customers MUST be seated at time 0. 
                // If resources are unavailable, they still wait but this should not happen 
                // if the restaurant capacity is configured correctly for the initial state.
                
                // Allocation failed: log WAITING event if first time
                if !has_logged_wait {
                    let log = generate_log(customer.arrival_time, &customer, "WAITING", "waited", &res);
                    let seq = res.events.len();
                    res.events.push(SimEvent {
                        time: customer.arrival_time, 
                        sequence: seq,
                        family_id: customer.family_id,
                        action: Action::Wait, log_message: log,
                    });
                    has_logged_wait = true;
                }

                // Wait for notification
                res = cvar.wait(res).unwrap();
            }

            // 3. Dining (Lock is released here)
            drop(res); 
            thread::sleep(Duration::from_millis(customer.est_dining_time * 10));

            // 4. Leave
            let mut res = lock.lock().unwrap();
            let last_time = res.events.last().map(|e| e.time).unwrap_or(0);
            let sit_time = res.events.iter()
                .filter(|e| e.family_id == customer.family_id)
                .filter_map(|e| if let Action::Sit(_) = e.action { Some(e.time) } else { None })
                .next()
                .unwrap_or(customer.arrival_time);
            
            let leave_time = sit_time + customer.est_dining_time;
            
            // Return resources
            res.baby_chairs_available += customer.baby_chair_count as i32;
            res.wheelchairs_available += customer.wheelchair_count as i32;
            
            for sid in &seated_seat_ids {
                if let Some(seat) = res.seats.iter_mut().find(|s| s.config.id == *sid) {
                    seat.occupied_by = None;
                }
            }
            
            let seat_str = seated_seat_ids.join(",");
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
            
            cvar.notify_all(); // Notify waiting customers
        });
        handles.push(handle);
    }

    for h in handles { let _ = h.join(); }

    generate_frames(monitor, &seats_config, &customers)
}

fn try_allocate(res: &SushiResources, customer: &CustomerConfig) -> Option<Vec<String>> {
    // 1. Check global resources (Baby Chairs & Wheelchairs)
    if customer.baby_chair_count > 0 && res.baby_chairs_available < customer.baby_chair_count as i32 {
        return None;
    }
    if customer.wheelchair_count > 0 && res.wheelchairs_available < customer.wheelchair_count as i32 {
        return None;
    }

    let mut chosen_seats = Vec::new();

    // 2. Find seats (Strictly enforce "One Table per Family, No Sharing" principle)
    if customer.wheelchair_count > 0 {
        // Wheelchair users: Must sit in accessible sofa (4P/6P), cannot sit at bar (SINGLE)
        // Occupy the entire table, no sharing with others
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
        // Multi-person families: Prefer sofa (4P/6P)
        let sofa = res.seats.iter()
            .find(|s| {
                s.occupied_by.is_none() && 
                ((s.config.type_ == "4P" && customer.party_size <= 4) || 
                 (s.config.type_ == "6P" && customer.party_size <= 6))
            });
            
        if let Some(s) = sofa {
            chosen_seats.push(s.config.id.clone());
        } else if customer.party_size == 4 {
            // Downgrade logic: 4-person families can accept 4 consecutive single seats at the bar
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
        // Individuals: MUST use bar (SINGLE) first
        let bar_seat = res.seats.iter()
            .find(|s| s.occupied_by.is_none() && s.config.type_ == "SINGLE");
            
        if let Some(s) = bar_seat {
            chosen_seats.push(s.config.id.clone());
        } else {
             // Fallback: Only use sofa if NO bar seats are available (Lowest priority)
             // This is strictly for when the bar is completely full
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

// Generate Frames needed for frontend
fn generate_frames(monitor: Arc<(Mutex<SushiResources>, Condvar)>, seats_config: &Vec<SeatConfig>, customers: &Vec<CustomerConfig>) -> Result<Vec<SimulationFrame>> {
    let result_lock = monitor.0.lock().unwrap();
    let mut sorted_events = result_lock.events.clone();
    // Use stable sort considering sequence to ensure correct order
    sorted_events.sort_by(|a, b| a.time.cmp(&b.time).then(a.sequence.cmp(&b.sequence)));

    let max_time = sorted_events.last().map(|e| e.time).unwrap_or(0);
    let mut frames = Vec::new();
    
    let mut current_seats: Vec<Seat> = seats_config.iter().map(|s| Seat {
        id: s.id.clone(), type_: s.type_.clone(), occupied_by: None,
        occupant_type: None,
        baby_chair_count: 0, 
        is_wheelchair_accessible: s.is_wheelchair_accessible,
    }).collect();
    
    // Used for visual markers (does not affect logic)
    // Store family special needs and total baby chairs
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
    
    // Generate Frame for every second
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
                        // Calculate baby chairs assigned to each seat (distributed)
                        let base_baby = baby_cnt / num_seats as u32;
                        let mut extra_baby = baby_cnt % num_seats as u32;

                        for (i, id) in seat_ids.iter().enumerate() {
                            if let Some(s) = current_seats.iter_mut().find(|seat| seat.id == *id) {
                                s.occupied_by = Some(evt.family_id);
                                
                                // Assign baby chairs
                                let mut my_baby = base_baby;
                                if extra_baby > 0 {
                                    my_baby += 1;
                                    extra_baby -= 1;
                                }
                                s.baby_chair_count = my_baby;

                                // Set occupant type
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
                Action::Error => {
                    waiting_family_ids.remove(&evt.family_id);
                }
            }
            event_idx += 1;
        }
        
        // Filter events occurring at this moment for frontend LogTerminal
        let current_events: Vec<SimulationEvent> = sorted_events.iter()
            .filter(|e| e.time == t)
            .map(|e| SimulationEvent {
                timestamp: e.time,
                type_: match e.action {
                    Action::Arrive => "ARRIVAL".into(),
                    Action::Wait => "WAITING".into(), 
                    Action::Sit(_) => "SEATED".into(),
                    Action::Leave(_) => "LEFT".into(),
                    Action::Error => "ERROR".into(),
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
