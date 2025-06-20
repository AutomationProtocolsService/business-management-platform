import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Check if the DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not defined');
}

// Create the PostgreSQL client with connection pooling and retry logic
export const client = postgres(process.env.DATABASE_URL, {
  max: 3, // Reduce maximum connections to prevent overload
  idle_timeout: 30, // Increase idle timeout
  connect_timeout: 5, // Reduce connect timeout
  prepare: false,
  onnotice: () => {}, // Suppress notices
  transform: {
    undefined: null,
  },
  connection: {
    application_name: 'business_management_app'
  }
});

// Create the Drizzle ORM instance
export const db = drizzle(client, { schema });