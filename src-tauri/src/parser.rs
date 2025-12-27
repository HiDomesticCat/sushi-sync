use crate::models::{CustomerConfig}; // 移除 SeatConfig 引用如果沒用到
use std::error::Error;

pub fn parse_customers(csv_content: &str) -> Result<Vec<CustomerConfig>, Box<dyn Error>> {
    let mut customers = Vec::new();
    
    for (i, line) in csv_content.lines().enumerate() {
        let line = line.trim();
        if line.is_empty() { continue; }

        let parts: Vec<&str> = line.split(',').collect();
        // 允許欄位少一點，我們會給預設值
        if parts.len() < 2 { continue; }

        // 1. 嘗試解析 ID (跳過標題)
        let id_parse = parts[0].trim().parse::<u32>();
        if id_parse.is_err() { continue; }
        let id = id_parse?;

        // 2. 解析數值欄位
        let arrival_time = parts.get(1).and_then(|s| s.trim().parse().ok()).unwrap_or(0);
        // CSV 第 2 欄原本是 type，我們現在忽略它 (parts[2])，直接跳去讀人數
        // 假設格式: id, arrival, type, party_size, baby..., wheel..., time
        let party_size = parts.get(3).and_then(|s| s.trim().parse().ok()).unwrap_or(1);
        
        // 處理 Boolean/Number 混用的情況 (支援 "true", "1", "2" 等)
        let baby_chair_input = parts.get(4).unwrap_or(&"0").trim().to_lowercase();
        let baby_chair_count = if baby_chair_input == "true" { 1 } else { baby_chair_input.parse().unwrap_or(0) };

        let wheel_chair_input = parts.get(5).unwrap_or(&"0").trim().to_lowercase();
        let wheelchair_count = if wheel_chair_input == "true" { 1 } else { wheel_chair_input.parse().unwrap_or(0) };

        let est_dining_time = parts.get(6).and_then(|s| s.trim().parse().ok()).unwrap_or(60);

        // 3. 🔥 自動推斷類型 (Auto-Type Logic) 🔥
        // 這是您最想要的功能：程式自己看！
        let type_ = if wheelchair_count > 0 {
            "WHEELCHAIR".to_string()
        } else if baby_chair_count > 0 {
            "WITH_BABY".to_string()
        } else if party_size > 1 {
            "FAMILY".to_string()
        } else {
            "INDIVIDUAL".to_string()
        };

        let customer = CustomerConfig {
            id,
            family_id: id, // 簡單將 ID 當作 Family ID
            arrival_time,
            type_,
            party_size,
            baby_chair_count,
            wheelchair_count,
            est_dining_time,
        };
        customers.push(customer);
    }

    Ok(customers)
}
