import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Check if the DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not defined');
}

// Create a simple PostgreSQL client with minimal configuration
export const client = postgres(process.env.DATABASE_URL, {
  max: 1, // Single connection to avoid overload
  idle_timeout: 0, // No idle timeout
  connect_timeout: 3, // Quick timeout
  prepare: false,
  onnotice: () => {}, // Suppress notices
  transform: {
    undefined: null,
  },
  debug: false,
  connection: {
    application_name: 'business_management_app'
  }
});

// Create the Drizzle ORM instance
export const db = drizzle(client, { schema });