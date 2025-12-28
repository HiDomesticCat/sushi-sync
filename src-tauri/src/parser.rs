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
        if parts.len() < 7 { continue; }

        let id = parts[0].trim().parse::<u32>().unwrap_or(0);
        if id == 0 { continue; }

        let arrival_time = parts[1].trim().parse::<u64>().unwrap_or(0);
        let type_str = parts[2].trim().to_uppercase();
        let party_size = parts[3].trim().parse::<u32>().unwrap_or(1);
        
        let baby_str = parts[4].trim().to_lowercase();
        let baby_chair_count = if baby_str == "true" { 1 } else { baby_str.parse().unwrap_or(0) };

        let wheel_str = parts[5].trim().to_lowercase();
        let wheelchair_count = if wheel_str == "true" { 1 } else { wheel_str.parse().unwrap_or(0) };

        let est_dining_time = parts[6].trim().parse::<u64>().unwrap_or(60);

        customers.push(CustomerConfig {
            id,
            family_id: id,
            arrival_time,
            type_: type_str,
            party_size,
            baby_chair_count,
            wheelchair_count,
            est_dining_time,
        });
    }

    Ok(customers)
}
