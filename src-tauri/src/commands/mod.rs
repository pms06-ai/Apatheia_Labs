//! Tauri command handlers for Phronesis FCIP
//!
//! All IPC commands exposed to the frontend.

pub mod analysis;
pub mod cases;
pub mod documents;
pub mod export;
pub mod settings;

pub use analysis::*;
pub use cases::*;
pub use documents::*;
pub use export::*;
pub use settings::*;

