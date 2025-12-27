use serde::Serialize;
use std::fmt;

#[derive(Debug)]
pub enum AppError {
    CsvParseError(String),
    JsonParseError(String),
    SimulationError(String),
    IoError(std::io::Error),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::CsvParseError(msg) => write!(f, "CSV Parsing Error: {}", msg),
            AppError::JsonParseError(msg) => write!(f, "JSON Parsing Error: {}", msg),
            AppError::SimulationError(msg) => write!(f, "Simulation Error: {}", msg),
            AppError::IoError(e) => write!(f, "IO Error: {}", e),
        }
    }
}

impl std::error::Error for AppError {}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
