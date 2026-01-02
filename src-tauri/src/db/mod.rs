//! Database module for Phronesis FCIP
//! 
//! Provides SQLite database operations using sqlx.

pub mod schema;

use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DbError {
    #[error("Database connection error: {0}")]
    Connection(#[from] sqlx::Error),
    #[error("Migration error: {0}")]
    Migration(String),
    #[error("Query error: {0}")]
    Query(String),
}

pub type DbResult<T> = Result<T, DbError>;

/// Database connection pool
pub struct Database {
    pool: SqlitePool,
}

impl Database {
    /// Create a new database connection
    pub async fn new(db_path: PathBuf) -> DbResult<Self> {
        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let db_url = format!("sqlite:{}?mode=rwc", db_path.display());
        
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(&db_url)
            .await?;

        // Enable WAL mode and busy timeout for better concurrency
        sqlx::query("PRAGMA journal_mode = WAL;")
            .execute(&pool)
            .await?;
        sqlx::query("PRAGMA busy_timeout = 5000;")  // 5 second timeout
            .execute(&pool)
            .await?;
        sqlx::query("PRAGMA synchronous = NORMAL;")
            .execute(&pool)
            .await?;
        sqlx::query("PRAGMA cache_size = -64000;")  // 64MB cache
            .execute(&pool)
            .await?;

        let db = Self { pool };
        db.run_migrations().await?;
        
        Ok(db)
    }

    /// Run database migrations
    async fn run_migrations(&self) -> DbResult<()> {
        sqlx::query(schema::CREATE_TABLES)
            .execute(&self.pool)
            .await
            .map_err(|e| DbError::Migration(e.to_string()))?;
        
        log::info!("Database migrations completed");
        Ok(())
    }

    /// Get the connection pool
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }
}

