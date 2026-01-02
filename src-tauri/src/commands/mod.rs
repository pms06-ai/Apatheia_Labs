//! Tauri command handlers for Phronesis FCIP
//! 
//! All IPC commands exposed to the frontend.

pub mod documents;
pub mod analysis;
pub mod cases;
pub mod settings;

pub use documents::*;
pub use analysis::*;
pub use cases::*;
pub use settings::*;

