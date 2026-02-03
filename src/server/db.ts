import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
const DB_PATH = path.join(DATA_DIR, 'logs.db');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize DB
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      model TEXT,
      prompt TEXT,
      response TEXT,
      duration_ms REAL,
      error TEXT,
      metadata TEXT,
      response_meta TEXT,
      locked BOOLEAN DEFAULT 0,
      tag TEXT
    )
  `);
  
  // Migrations could go here
  try { db.exec('ALTER TABLE logs ADD COLUMN locked BOOLEAN DEFAULT 0'); } catch (e) {}
  try { db.exec('ALTER TABLE logs ADD COLUMN tag TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE logs ADD COLUMN response_meta TEXT'); } catch (e) {}
}

export interface LogEntry {
  id: number;
  timestamp: string;
  model: string;
  prompt: string;
  response: any;
  duration_ms: number;
  error: string | null;
  metadata: any;
  response_meta: any;
  locked: boolean;
  tag: string | null;
}

export function logCall(data: Omit<LogEntry, 'id' | 'timestamp' | 'locked'> & { timestamp?: string }) {
  const stmt = db.prepare(`
    INSERT INTO logs (timestamp, model, prompt, response, duration_ms, error, metadata, response_meta, locked, tag)
    VALUES (@timestamp, @model, @prompt, @response, @duration_ms, @error, @metadata, @response_meta, 0, @tag)
  `);
  
  const info = stmt.run({
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
    response: JSON.stringify(data.response),
    metadata: JSON.stringify(data.metadata || {}),
    response_meta: JSON.stringify(data.response_meta || {})
  });
  
  return info.lastInsertRowid;
}

export function getLogs(limit = 50, offset = 0, filters: { tag?: string, start_date?: string, end_date?: string } = {}) {
  let query = 'SELECT * FROM logs';
  const params: any[] = [];
  const conditions: string[] = [];
  
  if (filters.tag) {
    conditions.push('tag LIKE ?');
    params.push(`%${filters.tag}%`);
  }
  if (filters.start_date) {
    conditions.push('timestamp >= ?');
    params.push(filters.start_date);
  }
  if (filters.end_date) {
    conditions.push('timestamp <= ?');
    params.push(filters.end_date);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const rules = db.prepare(query).all(...params);
  
  return rules.map((row: any) => ({
    ...row,
    response: parseJsonSafe(row.response),
    metadata: parseJsonSafe(row.metadata),
    response_meta: parseJsonSafe(row.response_meta),
    locked: Boolean(row.locked)
  }));
}

export function countLogs(filters: { tag?: string, start_date?: string, end_date?: string } = {}) {
  let query = 'SELECT COUNT(*) as count FROM logs';
  const params: any[] = [];
  const conditions: string[] = [];
  
  if (filters.tag) {
    conditions.push('tag LIKE ?');
    params.push(`%${filters.tag}%`);
  }
  if (filters.start_date) {
    conditions.push('timestamp >= ?');
    params.push(filters.start_date);
  }
  if (filters.end_date) {
    conditions.push('timestamp <= ?');
    params.push(filters.end_date);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  const result = db.prepare(query).get(...params) as { count: number };
  return result.count;
}

export function getUniqueTags(): string[] {
  const rows = db.prepare("SELECT DISTINCT tag FROM logs WHERE tag IS NOT NULL AND tag != '' ORDER BY tag COLLATE NOCASE").all();
  return rows.map((r: any) => r.tag);
}

function parseJsonSafe(str: string) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
}
