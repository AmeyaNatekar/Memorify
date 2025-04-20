import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@shared/schema';
import path from 'path';
import fs from 'fs';

// Create the database directory if it doesn't exist
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize the SQLite database
const sqlite = new Database(path.join(dbDir, 'database.db'));

// Enable foreign keys
sqlite.exec('PRAGMA foreign_keys = ON;');

// Create the Drizzle database instance
export const db = drizzle(sqlite, { schema });

// Export the raw sqlite instance for use with session store
export { sqlite };