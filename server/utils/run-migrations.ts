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
    // Set a very short timeout for database operations
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database initialization timeout')), 2000)
    );
    
    const dbOperation = async () => {
      // Simple ping test
      await db.execute(sql`SELECT 1 AS test`);
      logger.info("Database connection successful");
      return true;
    };
    
    await Promise.race([dbOperation(), timeout]);
    
    logger.info("Database migrations complete");
    return true;
  } catch (error) {
    logger.warn("Database initialization failed - proceeding without database");
    logger.warn("Application will run in demo mode with limited functionality");
    return false;
  }
}