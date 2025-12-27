use crate::models::CustomerConfig;
use std::error::Error;

pub fn parse_customers(csv_content: &str) -> Result<Vec<CustomerConfig>, Box<dyn Error>> {
    let mut customers = Vec::new();
    
    for (i, line) in csv_content.lines().enumerate() {
        let line = line.trim();
        // Skip header or empty lines
        if line.is_empty() || (i == 0 && line.to_lowercase().starts_with("id")) {
            continue;
        }

        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() < 2 { continue; }

        let id = parts[0].trim().parse::<u32>().unwrap_or(0);
        if id == 0 { continue; }

        let arrival_time = parts.get(1).and_then(|s| s.trim().parse().ok()).unwrap_or(0);
        // Read party_size from index 3
        let party_size = parts.get(3).and_then(|s| s.trim().parse().ok()).unwrap_or(1);
        
        // Critical fix: compatible with "true"/"1" as 1, "false"/"0" as 0, or direct numeric parsing
        let baby_str = parts.get(4).unwrap_or(&"0").trim().to_lowercase();
        let baby_chair_count = if baby_str == "true" { 1 } else { baby_str.parse().unwrap_or(0) };

        let wheel_str = parts.get(5).unwrap_or(&"0").trim().to_lowercase();
        let wheelchair_count = if wheel_str == "true" { 1 } else { wheel_str.parse().unwrap_or(0) };

        let est_dining_time = parts.get(6).and_then(|s| s.trim().parse().ok()).unwrap_or(60);

        // Auto-determine type
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

        customers.push(CustomerConfig {
            id,
            family_id: id,
            arrival_time,
            type_,
            party_size,
            baby_chair_count,
            wheelchair_count,
            est_dining_time,
        });
    }

    Ok(customers)
}
