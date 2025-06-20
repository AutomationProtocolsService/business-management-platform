import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Check if the DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not defined');
}

// Create the PostgreSQL client with connection pooling and retry logic
export const client = postgres(process.env.DATABASE_URL, {
  max: 10, // Maximum number of connections
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
  onnotice: () => {}, // Suppress notices
  transform: {
    undefined: null,
  },
});

// Create the Drizzle ORM instance
export const db = drizzle(client, { schema });