use crate::models::{CustomerConfig, SeatConfig, SimulationFrame, SimulationEvent, Seat};
use crate::parser;
use crate::errors::{AppError, Result};
use rand::Rng;
use std::sync::{Arc, Mutex};
use std::thread;
use std::collections::HashMap;

#[tauri::command]
pub fn generate_customers(count: u32, max_arrival_time: u64) -> Vec<CustomerConfig> {
    let mut rng = rand::rng();
    let mut customers = Vec::new();

    for i in 0..count {
        let id = i + 1;
        let family_id = id;
        let arrival_time = rng.random_range(0..=max_arrival_time);
        
        // Determine type
        let type_roll = rng.random_range(0..100);
        let (type_, party_size_range, can_attach_baby_chair, is_wheelchair_accessible) = if type_roll < 40 {
            ("INDIVIDUAL", 1..=2, false, false)
        } else if type_roll < 70 {
            ("FAMILY", 3..=6, false, false)
        } else if type_roll < 90 {
            ("WITH_BABY", 2..=5, true, false)
        } else {
            ("WHEELCHAIR", 1..=3, false, true)
        };

        let party_size = rng.random_range(party_size_range);
        let est_dining_time = rng.random_range(30..=90);

        customers.push(CustomerConfig {
            id,
            family_id,
            arrival_time,
            type_: type_.to_string(),
            party_size,
            can_attach_baby_chair,
            is_wheelchair_accessible,
            est_dining_time,
        });
    }
    
    // Sort by arrival time
    customers.sort_by_key(|c| c.arrival_time);
    
    customers
}

#[derive(Debug, Clone)]
struct SimEvent {
    time: u64,
    customer_id: u32,
    family_id: u32,
    action: Action,
}

#[derive(Debug, Clone)]
enum Action {
    Arrive,
    Sit(String), // Seat ID
    Leave(String), // Seat ID
}

#[tauri::command]
pub fn start_simulation(csv_content: String, seat_config_json: String) -> Result<Vec<SimulationFrame>> {
    // 1. Parse Customers
    let customers = parser::parse_customers(&csv_content)
        .map_err(|e| AppError::CsvParseError(e.to_string()))?;

    if customers.is_empty() {
        return Ok(Vec::new());
    }
    
    // Parse Seats
    let seats_config: Vec<SeatConfig> = serde_json::from_str(&seat_config_json)
        .map_err(|e| AppError::JsonParseError(e.to_string()))?;

    // 2. Run Simulation (Threads) to collect events
    let events = Arc::new(Mutex::new(Vec::<SimEvent>::new()));
    let mut handles = vec![];

    // Allocation Logic
    // We'll use a simple round-robin logic but map to ACTUAL seat IDs from config
    let mut assigned_seats: HashMap<u32, String> = HashMap::new();
    if !seats_config.is_empty() {
        let mut seat_idx = 0;
        for c in &customers {
            let seat = &seats_config[seat_idx % seats_config.len()];
            assigned_seats.insert(c.id, seat.id.clone());
            seat_idx += 1;
        }
    }
    let assigned_seats = Arc::new(assigned_seats);

    for customer in customers.clone() {
        let events_clone = Arc::clone(&events);
        let seats_map = Arc::clone(&assigned_seats);

        let handle = thread::spawn(move || {
            // 2.1 Customer Arrives
            {
                let mut guard = events_clone.lock().unwrap();
                guard.push(SimEvent {
                    time: customer.arrival_time,
                    customer_id: customer.id,
                    family_id: customer.family_id,
                    action: Action::Arrive,
                });
            }

            // 2.2 Customer Sits (Mock: assume they sit immediately upon arrival + 1s)
            // Use assigned seat or fallback
            let default_seat = "S01".to_string();
            let seat_id = seats_map.get(&customer.id).unwrap_or(&default_seat).clone();

            {
                let mut guard = events_clone.lock().unwrap();
                guard.push(SimEvent {
                    time: customer.arrival_time + 1,
                    customer_id: customer.id,
                    family_id: customer.family_id,
                    action: Action::Sit(seat_id.clone()),
                });
            }

            // 2.3 Customer Leaves
            {
                let mut guard = events_clone.lock().unwrap();
                guard.push(SimEvent {
                    time: customer.arrival_time + 1 + customer.est_dining_time * 60, // min to sec
                    customer_id: customer.id,
                    family_id: customer.family_id,
                    action: Action::Leave(seat_id),
                });
            }
        });
        handles.push(handle);
    }

    for h in handles {
        let _ = h.join();
    }

    // 3. Generate Frames (Replay Logic)
    let final_events = events.lock().unwrap();
    let mut sorted_events = final_events.clone();
    sorted_events.sort_by_key(|e| e.time);

    let max_time = sorted_events.last().map(|e| e.time).unwrap_or(0);
    let mut frames = Vec::new();
    
    // Initialize seats from config
    let mut current_seats: Vec<Seat> = seats_config.iter().map(|s| Seat {
        id: s.id.clone(),
        type_: s.type_.clone(),
        occupied_by: None,
        is_baby_chair_attached: false,
        is_wheelchair_accessible: s.is_wheelchair_accessible,
    }).collect();

    let mut current_logs = Vec::new();
    let mut event_idx = 0;
    let mut frame_events_accum = Vec::new();

    // Time step: 1 second
    for t in 0..=max_time + 2 {
        let mut frame_events = Vec::new();

        // Process all events happening at time t
        while event_idx < sorted_events.len() && sorted_events[event_idx].time <= t {
            let evt = &sorted_events[event_idx];
            
            // Create SimulationEvent for frontend
            let sim_event = match &evt.action {
                Action::Arrive => {
                    current_logs.push(format!("[{}] Family {} Arrived", t, evt.family_id));
                    SimulationEvent {
                        timestamp: t,
                        type_: "ARRIVAL".to_string(),
                        customer_id: evt.customer_id,
                        family_id: evt.family_id,
                        seat_id: None,
                        message: format!("Family {} arrived.", evt.family_id),
                    }
                }
                Action::Sit(seat_id) => {
                    current_logs.push(format!("[{}] Family {} Sat at {}", t, evt.family_id, seat_id));
                    // Update seat state
                    if let Some(seat) = current_seats.iter_mut().find(|s| s.id == *seat_id) {
                        seat.occupied_by = Some(evt.family_id);
                    }
                    SimulationEvent {
                        timestamp: t,
                        type_: "SEATED".to_string(),
                        customer_id: evt.customer_id,
                        family_id: evt.family_id,
                        seat_id: Some(seat_id.clone()),
                        message: format!("Family {} seated at {}.", evt.family_id, seat_id),
                    }
                }
                Action::Leave(seat_id) => {
                    current_logs.push(format!("[{}] Family {} Left {}", t, evt.family_id, seat_id));
                    // Clear seat state
                    if let Some(seat) = current_seats.iter_mut().find(|s| s.id == *seat_id) {
                        seat.occupied_by = None;
                    }
                    SimulationEvent {
                        timestamp: t,
                        type_: "LEFT".to_string(),
                        customer_id: evt.customer_id,
                        family_id: evt.family_id,
                        seat_id: Some(seat_id.clone()),
                        message: format!("Family {} left seat {}.", evt.family_id, seat_id),
                    }
                }
            };
            frame_events.push(sim_event);
            event_idx += 1;
        }
        
        frame_events_accum.extend(frame_events.clone());

        // Push frame snapshot
        frames.push(SimulationFrame {
            timestamp: t,
            seats: current_seats.clone(),
            waiting_queue: Vec::new(), // Simplified: no waiting queue visualization in this mock
            events: frame_events_accum.clone(), // Events happening UP TO THIS FRAME
            logs: current_logs.clone(),
        });
    }

    Ok(frames)
}
