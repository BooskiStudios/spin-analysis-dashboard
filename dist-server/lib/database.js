import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
const storageRoot = path.resolve(process.cwd(), 'storage');
export const sessionsStorageDir = path.join(storageRoot, 'sessions');
export const uploadsStorageDir = path.join(storageRoot, 'uploads');
const databasePath = path.join(storageRoot, 'slot-analytics.sqlite');
let databasePromise = null;
async function ensureStorage() {
    await mkdir(sessionsStorageDir, { recursive: true });
    await mkdir(uploadsStorageDir, { recursive: true });
}
async function ensureColumn(database, tableName, columnDefinition) {
    const columnName = columnDefinition.trim().split(/\s+/, 1)[0];
    if (!columnName) {
        return;
    }
    const tableInfo = await database.all(`PRAGMA table_info(${tableName})`);
    const hasColumn = tableInfo.some((column) => column.name === columnName);
    if (!hasColumn) {
        await database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`);
    }
}
async function initializeDatabase(database) {
    await database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      provider TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      total_spins INTEGER NOT NULL DEFAULT 0,
      rtp REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS spins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      spin_number INTEGER NOT NULL,
      win_amount REAL NOT NULL,
      cascades INTEGER NOT NULL,
      bonus_triggered INTEGER NOT NULL,
      duration REAL NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      spin_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      timestamp REAL NOT NULL,
      FOREIGN KEY (spin_id) REFERENCES spins (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS videos (
      spin_id INTEGER PRIMARY KEY,
      video_path TEXT NOT NULL,
      FOREIGN KEY (spin_id) REFERENCES spins (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS game_base_breakdowns (
      game_id INTEGER PRIMARY KEY,
      breakdown_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by_email TEXT,
      FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS game_bonus_breakdowns (
      game_id INTEGER PRIMARY KEY,
      breakdown_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by_email TEXT,
      FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE
    );
  `);
    await ensureColumn(database, 'games', "game_type TEXT");
    await ensureColumn(database, 'games', 'assigned_rtp REAL');
    await ensureColumn(database, 'sessions', "source_video_path TEXT");
    await ensureColumn(database, 'sessions', "processing_status TEXT NOT NULL DEFAULT 'completed'");
    await ensureColumn(database, 'sessions', 'processing_error TEXT');
    await ensureColumn(database, 'spins', 'start_frame INTEGER');
    await ensureColumn(database, 'spins', 'end_frame INTEGER');
}
export async function getDatabase() {
    if (!databasePromise) {
        databasePromise = (async () => {
            await ensureStorage();
            const database = await open({
                filename: databasePath,
                driver: sqlite3.Database,
            });
            await initializeDatabase(database);
            return database;
        })();
    }
    return databasePromise;
}
