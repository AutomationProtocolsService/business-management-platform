import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Check if the DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not defined');
}

// Create the PostgreSQL client
export const client = postgres(process.env.DATABASE_URL);

// Create the Drizzle ORM instance
export const db = drizzle(client, { schema });