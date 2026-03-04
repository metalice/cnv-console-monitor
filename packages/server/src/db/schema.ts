import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dbDir = path.dirname(config.db.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    db = new Database(config.db.path);
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS launches (
      id INTEGER PRIMARY KEY,
      rp_id INTEGER NOT NULL,
      uuid TEXT NOT NULL,
      name TEXT NOT NULL,
      number INTEGER NOT NULL,
      status TEXT NOT NULL,
      cnv_version TEXT,
      bundle TEXT,
      ocp_version TEXT,
      tier TEXT,
      cluster_name TEXT,
      total INTEGER NOT NULL DEFAULT 0,
      passed INTEGER NOT NULL DEFAULT 0,
      failed INTEGER NOT NULL DEFAULT 0,
      skipped INTEGER NOT NULL DEFAULT 0,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration REAL,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(rp_id)
    );

    CREATE TABLE IF NOT EXISTS test_items (
      id INTEGER PRIMARY KEY,
      rp_id INTEGER NOT NULL,
      launch_rp_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      polarion_id TEXT,
      defect_type TEXT,
      defect_comment TEXT,
      ai_prediction TEXT,
      ai_confidence INTEGER,
      error_message TEXT,
      jira_key TEXT,
      jira_status TEXT,
      unique_id TEXT,
      start_time INTEGER,
      end_time INTEGER,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(rp_id),
      FOREIGN KEY (launch_rp_id) REFERENCES launches(rp_id)
    );

    CREATE TABLE IF NOT EXISTS acknowledgments (
      id INTEGER PRIMARY KEY,
      date TEXT NOT NULL,
      reviewer TEXT NOT NULL,
      notes TEXT,
      acknowledged_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(date, reviewer)
    );

    CREATE TABLE IF NOT EXISTS triage_log (
      id INTEGER PRIMARY KEY,
      test_item_rp_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      performed_by TEXT,
      performed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_launches_start_time ON launches(start_time);
    CREATE INDEX IF NOT EXISTS idx_launches_name ON launches(name);
    CREATE INDEX IF NOT EXISTS idx_launches_status ON launches(status);
    CREATE INDEX IF NOT EXISTS idx_test_items_launch ON test_items(launch_rp_id);
    CREATE INDEX IF NOT EXISTS idx_test_items_status ON test_items(status);
    CREATE INDEX IF NOT EXISTS idx_test_items_unique_id ON test_items(unique_id);
    CREATE INDEX IF NOT EXISTS idx_acknowledgments_date ON acknowledgments(date);
  `);
}
