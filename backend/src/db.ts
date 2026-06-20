import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(__dirname, '../../fare_evasion_saas.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS reconciliation_events (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    bus_id    TEXT    NOT NULL,
    onboard   INTEGER NOT NULL,
    validated INTEGER NOT NULL,
    evaders   INTEGER NOT NULL,
    lat       REAL,
    lon       REAL,
    source    TEXT    NOT NULL DEFAULT 'poll',
    ts        INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_recon_ts ON reconciliation_events(ts DESC);
`);

const insert = db.prepare<[string, number, number, number, number | null, number | null, string, number]>(
  `INSERT INTO reconciliation_events
     (bus_id, onboard, validated, evaders, lat, lon, source, ts)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

export function recordReconciliation(
  busId: string,
  onboard: number,
  validated: number,
  evaders: number,
  lat: number | null,
  lon: number | null,
  source: 'poll' | 'manual' = 'poll',
): void {
  insert.run(busId, onboard, validated, evaders, lat, lon, source, Date.now());
}

export default db;
