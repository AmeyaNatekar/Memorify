import { db } from './database';
import * as schema from '@shared/schema';

async function initDatabase() {
  console.log('Creating database tables...');
  
  try {
    // Create tables if they don't exist
    const users = await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

    const images = await db.run(`
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        path TEXT NOT NULL,
        description TEXT,
        uploaded_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    const friends = await db.run(`
      CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requester_id INTEGER NOT NULL,
        addressee_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (requester_id) REFERENCES users(id),
        FOREIGN KEY (addressee_id) REFERENCES users(id)
      )
    `);

    const groups = await db.run(`
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_by INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    const groupMembers = await db.run(`
      CREATE TABLE IF NOT EXISTS group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at INTEGER NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    const imageShares = await db.run(`
      CREATE TABLE IF NOT EXISTS image_shares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_id INTEGER NOT NULL,
        user_id INTEGER,
        group_id INTEGER,
        shared_at INTEGER NOT NULL,
        FOREIGN KEY (image_id) REFERENCES images(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (group_id) REFERENCES groups(id)
      )
    `);

    const notifications = await db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        sender_id INTEGER,
        group_id INTEGER,
        image_id INTEGER,
        is_read INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (group_id) REFERENCES groups(id),
        FOREIGN KEY (image_id) REFERENCES images(id)
      )
    `);

    console.log('Database tables created successfully!');
  } catch (error) {
    console.error('Error creating database tables:', error);
    process.exit(1);
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  initDatabase();
}

export default initDatabase;