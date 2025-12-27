use crate::models::CustomerConfig;
use std::error::Error;

pub fn parse_customers(csv_content: &str) -> Result<Vec<CustomerConfig>, Box<dyn Error>> {
    let mut customers = Vec::new();
    
    // Skip header if present, handle empty lines
    for line in csv_content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with("id,") || line.starts_with("ID,") {
            continue;
        }

        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() < 8 {
            // Skip malformed lines instead of panicking
            println!("Skipping malformed line: {}", line);
            continue;
        }

        // Safe parsing with defaults or error propagation
        let customer = CustomerConfig {
            family_id: parts[0].trim().parse()?,
            id: parts[1].trim().parse()?,
            type_: parts[2].trim().to_string(),
            arrival_time: parts[3].trim().parse()?,
            party_size: parts[4].trim().parse()?,
            can_attach_baby_chair: parts[5].trim().parse().unwrap_or(false),
            is_wheelchair_accessible: parts[6].trim().parse().unwrap_or(false),
            est_dining_time: parts[7].trim().parse()?,
        };
        customers.push(customer);
    }

    Ok(customers)
}