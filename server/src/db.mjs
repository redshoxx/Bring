import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';

// SQLite is exclusively the local/test adapter. Production uses PostgreSQL.
export async function database(url, filename = ':memory:') {
  const pool = url ? new pg.Pool({ connectionString: url, max: 8 }) : null;
  const sqlite = pool ? null : new DatabaseSync(filename);
  if (sqlite) sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  const query = async (sql, values = [], connection = pool) => {
    if (pool) return (await connection.query(sql, values)).rows;
    const params = [];
    const normalized = sql.replace(/\$(\d+)/g, (_, n) => { params.push(values[Number(n) - 1]); return '?'; });
    const statement = sqlite.prepare(normalized);
    return statement.all(...params);
  };
  // A queue avoids transaction interleaving on the single SQLite connection.
  let tail = Promise.resolve();
  const transaction = (fn) => {
    const run = async () => {
      const connection = pool ? await pool.connect() : null;
      const execute = (sql, args = []) => query(sql, args, connection);
      try {
        await execute(pool ? 'BEGIN' : 'BEGIN IMMEDIATE');
        const value = await fn(execute);
        await execute('COMMIT');
        return value;
      } catch (error) { await execute('ROLLBACK'); throw error; }
      finally { connection?.release(); }
    };
    if (pool) return run();
    const next = tail.then(run, run); tail = next.catch(() => {}); return next;
  };
  const schema = [
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password TEXT NOT NULL, household TEXT NOT NULL, settings TEXT NOT NULL DEFAULT '{}')`,
    `CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires BIGINT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS households (id TEXT PRIMARY KEY)`,
    `CREATE TABLE IF NOT EXISTS invites (hash TEXT PRIMARY KEY, household TEXT NOT NULL, expires BIGINT NOT NULL, used INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id), household TEXT NOT NULL, kind TEXT NOT NULL, visibility TEXT NOT NULL, data TEXT NOT NULL, rev INTEGER NOT NULL DEFAULT 1, updated BIGINT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS items_household ON items(household, kind)`,
    `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`,
    `CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id), fingerprint TEXT NOT NULL, prompt TEXT NOT NULL, status TEXT NOT NULL, filename TEXT, created BIGINT NOT NULL, UNIQUE(owner, fingerprint))`,
  ];
  for (const sql of schema) await query(sql);
  return { query, transaction, close: async () => { if (pool) await pool.end(); else sqlite.close(); }, postgres: !!pool };
}
