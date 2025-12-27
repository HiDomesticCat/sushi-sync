use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CustomerConfig {
    pub family_id: u32,
    pub id: u32,
    pub arrival_time: u64,
    pub type_: String,
    pub party_size: u32,
    pub baby_chair: bool,
    pub wheel_chair: bool,
    pub est_dining_time: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SeatConfig {
    pub id: String,
    pub type_: String,
    pub canAttachBabyChair: bool,
    pub isWheelchairAccessible: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SimulationEvent {
    pub timestamp: u64,
    pub type_: String, // "ARRIVAL", "SEATED", "LEFT", "CONFLICT"
    pub customer_id: u32,
    pub family_id: u32,
    pub seat_id: Option<String>,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Seat {
    pub id: String,
    pub type_: String,
    pub occupied_by: Option<u32>, // family_id
    pub is_baby_chair_attached: bool,
    pub is_wheelchair_accessible: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Customer {
    pub id: u32,
    pub family_id: u32,
    pub type_: String,
    pub party_size: u32,
    pub color: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SimulationFrame {
    pub timestamp: u64,
    pub seats: Vec<Seat>,
    pub waiting_queue: Vec<Customer>,
    pub events: Vec<SimulationEvent>,
    pub logs: Vec<String>,
}
