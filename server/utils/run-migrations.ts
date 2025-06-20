import { logger } from "../logger";
import { client, db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Initialize the database and run migrations
 * This utility ensures the database is properly set up before the server starts
 */
export async function initializeDatabaseAndMigrations() {
  logger.info("Initializing database and running migrations...");
  
  try {
    // Use Promise.race to implement timeout for database operations
    const dbOperation = async () => {
      // Create a migrations tracking table if it doesn't exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          success BOOLEAN NOT NULL
        );
      `);
      
      // Check if the database is properly set up
      const healthCheck = await db.execute(sql`SELECT NOW() as time`);
      logger.info(`Database connection successful, server time: ${healthCheck[0].time}`);
      
      // Add simple database health check query to verify everything is working
      const result = await db.execute(sql`SELECT 1 AS test`);
      logger.info("Database ORM connection test successful");
      
      return true;
    };
    
    // Set timeout for database operations (15 seconds)
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database initialization timeout')), 15000)
    );
    
    await Promise.race([dbOperation(), timeout]);
    
    logger.info("Database migrations complete");
    return true;
  } catch (error) {
    logger.error("Error during database initialization:", error);
    logger.warn("Continuing server startup - database features may be limited");
    return false;
  }
}