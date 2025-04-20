import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './database';

// This will automatically run needed migrations on the database
async function main() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations complete!');
}

main().catch((e) => {
  console.error('Error during migration:', e);
  process.exit(1);
});