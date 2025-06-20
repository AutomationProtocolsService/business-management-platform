import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Check if the DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not defined');
}

// Create PostgreSQL client with proper SSL configuration
export const client = postgres(process.env.DATABASE_URL, {
  max: 2,
  idle_timeout: 20,
  connect_timeout: 5,
  prepare: false,
  onnotice: () => {},
  transform: {
    undefined: null,
  },
  debug: false,
  connection: {
    application_name: 'business_management_app'
  },
  ssl: 'require', // Enable SSL as required by database
  fetch_types: false
});

// Create the Drizzle ORM instance
export const db = drizzle(client, { schema });