use crate::models::{CustomerConfig, SeatConfig, SimulationFrame, SimulationEvent, Seat, Customer};
use crate::parser;
use crate::errors::{AppError, Result};

#[tauri::command]
pub fn start_simulation(csv_content: String, seat_config_json: String) -> Result<Vec<SimulationFrame>> {
    let customers_config = parser::parse_customers(&csv_content)
        .map_err(|e| AppError::CsvParseError(e.to_string()))?;
    
    let seats_config: Vec<SeatConfig> = serde_json::from_str(&seat_config_json)
        .map_err(|e| AppError::JsonParseError(e.to_string()))?;

    let mut frames = Vec::new();
    let mut current_time = 0;
    let mut events = Vec::new();
    
    // State
    let mut waiting_queue: Vec<CustomerConfig> = Vec::new();
    let mut active_customers: Vec<(CustomerConfig, u64)> = Vec::new(); // (customer, end_time)
    let mut seat_states: Vec<Seat> = seats_config.iter().map(|s| Seat {
        id: s.id.clone(),
        type_: s.type_.clone(),
        occupied_by: None,
        is_baby_chair_attached: false,
        is_wheelchair_accessible: s.is_wheelchair_accessible,
    }).collect();

    // Sort customers by arrival
    let mut incoming_customers = customers_config.clone();
    incoming_customers.sort_by_key(|c| c.arrival_time);
    let mut incoming_idx = 0;

    // Simulation Loop (Max 7200s or until done)
    while (incoming_idx < incoming_customers.len() || !waiting_queue.is_empty() || !active_customers.is_empty()) && current_time < 7200 {
        let mut frame_events = Vec::new();

        // 1. Process Arrivals
        while incoming_idx < incoming_customers.len() && incoming_customers[incoming_idx].arrival_time <= current_time {
            let customer = incoming_customers[incoming_idx].clone();
            waiting_queue.push(customer.clone());
            
            frame_events.push(SimulationEvent {
                timestamp: current_time,
                type_: "ARRIVAL".to_string(),
                customer_id: customer.id,
                family_id: customer.family_id,
                seat_id: None,
                message: format!("Family {} arrived.", customer.family_id),
            });
            incoming_idx += 1;
        }

        // 2. Process Departures
        let mut finished_indices = Vec::new();
        for (i, (customer, end_time)) in active_customers.iter().enumerate() {
            if *end_time <= current_time {
                finished_indices.push(i);
                // Free seat
                if let Some(seat) = seat_states.iter_mut().find(|s| s.occupied_by == Some(customer.family_id)) {
                    seat.occupied_by = None;
                    frame_events.push(SimulationEvent {
                        timestamp: current_time,
                        type_: "LEFT".to_string(),
                        customer_id: customer.id,
                        family_id: customer.family_id,
                        seat_id: Some(seat.id.clone()),
                        message: format!("Family {} left seat {}.", customer.family_id, seat.id),
                    });
                }
            }
        }
        // Remove finished (reverse order to keep indices valid)
        for i in finished_indices.iter().rev() {
            active_customers.remove(*i);
        }

        // 3. Process Seating (Simple FIFO)
        let mut seated_indices = Vec::new();
        for (i, customer) in waiting_queue.iter().enumerate() {
            // Find suitable seat
            if let Some(seat) = seat_states.iter_mut().find(|s| s.occupied_by.is_none()) {
                // Check capacity (simplified)
                let capacity = match seat.type_.as_str() {
                    "SINGLE" => 1,
                    "4P" => 4,
                    "6P" => 6,
                    _ => 0
                };
                
                if capacity >= customer.party_size {
                    seat.occupied_by = Some(customer.family_id);
                    active_customers.push((customer.clone(), current_time + customer.est_dining_time * 60)); // min to sec
                    seated_indices.push(i);
                    
                    frame_events.push(SimulationEvent {
                        timestamp: current_time,
                        type_: "SEATED".to_string(),
                        customer_id: customer.id,
                        family_id: customer.family_id,
                        seat_id: Some(seat.id.clone()),
                        message: format!("Family {} seated at {}.", customer.family_id, seat.id),
                    });
                    break; // One per tick for simplicity
                }
            }
        }
        // Remove seated
        for i in seated_indices.iter().rev() {
            waiting_queue.remove(*i);
        }

        // 4. Record Frame
        events.extend(frame_events.clone());
        
        // Convert waiting queue to display format
        let display_queue: Vec<Customer> = waiting_queue.iter().map(|c| Customer {
            id: c.id,
            family_id: c.family_id,
            type_: c.type_.clone(),
            party_size: c.party_size,
            color: "#FF7E67".to_string(), // Default color, frontend handles actual color
        }).collect();

        frames.push(SimulationFrame {
            timestamp: current_time,
            seats: seat_states.clone(),
            waiting_queue: display_queue,
            events: frame_events,
            logs: events.iter().map(|e| e.message.clone()).collect(),
        });

        current_time += 1;
    }

    Ok(frames)
}
