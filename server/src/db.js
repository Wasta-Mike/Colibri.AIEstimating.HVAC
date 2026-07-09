import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data", "app.sqlite");

export const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    cohort_code TEXT NOT NULL,
    trade TEXT NOT NULL DEFAULT 'HVAC',
    project_type TEXT,
    scope TEXT,
    current_step_id TEXT DEFAULT 'orientation-0',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS captures (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    label TEXT NOT NULL,
    page_number INTEGER,
    image_path TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    capture_type TEXT NOT NULL DEFAULT 'region',
    pixels_per_foot REAL,
    calibration_note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS grid_rows (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    section TEXT NOT NULL,
    item TEXT NOT NULL,
    qty REAL DEFAULT 0,
    unit TEXT,
    material_cost REAL DEFAULT 0,
    labor_cost REAL DEFAULT 0,
    extended REAL DEFAULT 0,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'proposed',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    step_id TEXT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    task_type TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS annotations (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    capture_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    room TEXT,
    kind TEXT NOT NULL DEFAULT 'point',
    points TEXT NOT NULL,
    confidence REAL,
    status TEXT NOT NULL DEFAULT 'proposed',
    length_ft REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS deltas (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    step_id TEXT,
    capture_id TEXT,
    item_type TEXT,
    proposed TEXT,
    corrected TEXT,
    error_type TEXT,
    timestamp TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS help_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now'))
  );
`);
