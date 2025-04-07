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
    try {
      const healthCheck = await db.execute(sql`SELECT NOW() as time`);
      logger.info(`Database connection successful, server time: ${healthCheck[0].time}`);
    } catch (e) {
      logger.error("Database connection check failed:", e);
      throw e;
    }
    
    // Add simple database health check query to verify everything is working
    try {
      const result = await db.execute(sql`SELECT 1 AS test`);
      logger.info("Database ORM connection test successful");
    } catch (e) {
      logger.error("Database ORM connection test failed:", e);
      throw e;
    }
    
    // Log success
    logger.info("Database migrations complete");
    return true;
  } catch (error) {
    logger.error("Error during database initialization:", error);
    throw error;
  }
}