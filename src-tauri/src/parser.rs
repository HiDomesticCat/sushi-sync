use crate::models::CustomerConfig;
use std::error::Error;

pub fn parse_customers(csv_content: &str) -> Result<Vec<CustomerConfig>, Box<dyn Error>> {
    let mut customers = Vec::new();
    
    for (i, line) in csv_content.lines().enumerate() {
        let line = line.trim();
        if line.is_empty() || (i == 0 && line.to_lowercase().starts_with("id")) {
            continue;
        }

        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() < 2 { continue; } // Lenient check, as long as basic fields exist

        let id_raw = parts[0].trim().parse::<i32>().unwrap_or(0);
        if id_raw == 0 { continue; }
        // Use raw i32 bits cast to u32 to preserve negative IDs for the backend
        // while allowing the frontend to handle the display if needed.
        let id = id_raw as u32;

        let arrival_time_raw = parts.get(1).and_then(|s| s.trim().parse::<i64>().ok()).unwrap_or(0);
        
        // Skip parts[2] (original type field)
        let party_size = parts.get(3).and_then(|s| s.trim().parse().ok()).unwrap_or(1);
        
        let baby_str = parts.get(4).unwrap_or(&"0").trim().to_lowercase();
        let baby_chair_count = if baby_str == "true" { 1 } else { baby_str.parse().unwrap_or(0) };

        let wheel_str = parts.get(5).unwrap_or(&"0").trim().to_lowercase();
        let wheelchair_count = if wheel_str == "true" { 1 } else { wheel_str.parse().unwrap_or(0) };

        let est_dining_time = parts.get(6).and_then(|s| s.trim().parse().ok()).unwrap_or(60);

        // 🔥 Auto-determine type: ensure type always has a value
        let type_ = if wheelchair_count > 0 {
            "WHEELCHAIR".to_string()
        } else if baby_chair_count > 0 {
            "WITH_BABY".to_string()
        } else if party_size > 4 {
            "LARGE_GROUP".to_string()
        } else if party_size > 1 {
            "FAMILY".to_string()
        } else {
            "INDIVIDUAL".to_string()
        };

        // Handle arrival_time = -1 (Pre-occupied)
        // We map it to 0 for the struct, but we'll use a separate flag or 
        // handle the priority in simulation.rs without breaking the u64 type.
        let arrival_time = if arrival_time_raw < 0 { 0 } else { arrival_time_raw as u64 };

        customers.push(CustomerConfig {
            id,
            family_id: id,
            arrival_time,
            type_, // Use the auto-determined result here
            party_size,
            baby_chair_count,
            wheelchair_count,
            est_dining_time,
        });
    }

    Ok(customers)
}