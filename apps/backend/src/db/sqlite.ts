import initSqlJs from 'sql.js';
import type { Database as SqlJsDatabase } from 'sql.js';
import path from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'treadmill.db');

/** Possible paths to sql.js wasm (workspace root or backend node_modules). */
const WASM_CANDIDATES = [
  path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
  path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
];

/**
 * Thin adapter so our db layer can use a better-sqlite3-like API.
 * sql.js is used so no native compilation is required (works on Windows without VS).
 */
export interface DbStatement {
  run(...params: unknown[]): void;
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Record<string, unknown>[];
}

export interface Db {
  exec(sql: string): void;
  prepare(sql: string): DbStatement;
}

function wrapStatement(
  nativeDb: SqlJsDatabase,
  sql: string,
  save: () => void
): DbStatement {
  return {
    run(...params: unknown[]) {
      const stmt = nativeDb.prepare(sql);
      try {
        stmt.bind(params as number[]);
        stmt.step();
        save();
      } finally {
        stmt.free();
      }
    },
    get(...params: unknown[]) {
      const stmt = nativeDb.prepare(sql);
      try {
        stmt.bind(params as number[]);
        if (stmt.step()) return stmt.getAsObject() as Record<string, unknown>;
        return undefined;
      } finally {
        stmt.free();
      }
    },
    all(...params: unknown[]) {
      const stmt = nativeDb.prepare(sql);
      const rows: Record<string, unknown>[] = [];
      try {
        stmt.bind(params as number[]);
        while (stmt.step()) rows.push(stmt.getAsObject() as Record<string, unknown>);
        return rows;
      } finally {
        stmt.free();
      }
    },
  };
}

function wrapDb(nativeDb: SqlJsDatabase, save: () => void): Db {
  return {
    exec(sql: string) {
      nativeDb.exec(sql);
      save();
    },
    prepare(sql: string) {
      return wrapStatement(nativeDb, sql, save);
    },
  };
}

let db: Db | null = null;

export async function initDb(): Promise<Db> {
  if (db) return db;
  const wasmPath = WASM_CANDIDATES.find((p) => existsSync(p));
  const wasmBinary = wasmPath ? readFileSync(wasmPath) : undefined;
  const SQL = await initSqlJs(wasmBinary ? { wasmBinary } : undefined);
  const dir = path.dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  let nativeDb: SqlJsDatabase;
  if (existsSync(DB_PATH)) {
    const buf = readFileSync(DB_PATH);
    nativeDb = new SQL.Database(buf);
  } else {
    nativeDb = new SQL.Database();
  }
  const save = () => {
    try {
      const data = nativeDb.export();
      writeFileSync(DB_PATH, Buffer.from(data));
    } catch (e) {
      console.warn('Could not persist SQLite DB:', e);
    }
  };
  db = wrapDb(nativeDb, save);
  return db;
}

export function getDbSync(): Db {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

/**
 * In-memory DB for tests (no file I/O). Do not use in production request path.
 */
export async function openInMemoryDatabaseForTests(): Promise<Db> {
  const wasmPath = WASM_CANDIDATES.find((p) => existsSync(p));
  const wasmBinary = wasmPath ? readFileSync(wasmPath) : undefined;
  const SQL = await initSqlJs(wasmBinary ? { wasmBinary } : undefined);
  return wrapDb(new SQL.Database(), () => {});
}