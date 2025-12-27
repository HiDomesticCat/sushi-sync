use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
#[allow(dead_code)]
pub enum AppError {
    #[error("Simulation error: {0}")]
    SimulationError(String),
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    #[error("CSV parsing error: {0}")]
    CsvParseError(String),
    #[error("JSON parsing error: {0}")]
    JsonParseError(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_str())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
