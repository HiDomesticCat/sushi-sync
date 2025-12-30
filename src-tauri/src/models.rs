use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CustomerConfig {
    pub id: u32,
    pub family_id: u32,
    pub arrival_time: u64,
    #[serde(rename = "type")]
    pub type_: String,
    pub party_size: u32,
    pub baby_chair_count: u32,
    pub wheelchair_count: u32,
    pub est_dining_time: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SeatConfig {
    pub id: String,
    pub x: Option<f32>,
    pub y: Option<f32>,
    #[serde(rename = "type")]
    pub type_: String,
    pub is_wheelchair_accessible: bool,
    pub label: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Seat {
    pub id: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub occupied_by: Option<u32>,
    pub baby_chair_count: u32,
    pub is_wheelchair_accessible: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SimulationEvent {
    pub timestamp: u64,
    #[serde(rename = "type")]
    pub type_: String,
    pub customer_id: u32,
    pub family_id: u32,
    pub seat_id: Option<String>,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SimulationFrame {
    pub timestamp: u64,
    pub seats: Vec<Seat>,
    pub waiting_queue: Vec<CustomerConfig>,
    pub events: Vec<SimulationEvent>,
    pub logs: Vec<String>,
}
