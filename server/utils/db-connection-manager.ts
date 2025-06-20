import { logger } from "../logger";
import { client, db } from "../db";
import { sql } from "drizzle-orm";

class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private isConnected = false;
  private retryCount = 0;
  private maxRetries = 3;

  static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  async initialize(): Promise<boolean> {
    try {
      // Quick connection test with timeout
      const testQuery = Promise.race([
        db.execute(sql`SELECT 1 as test`),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 1000)
        )
      ]);

      await testQuery;
      this.isConnected = true;
      logger.info("Database connection established successfully");
      return true;
    } catch (error) {
      this.isConnected = false;
      this.retryCount++;
      
      if (this.retryCount < this.maxRetries) {
        logger.warn(`Database connection failed, retrying... (${this.retryCount}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.initialize();
      } else {
        logger.error("Database connection failed after all retries");
        return false;
      }
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }

  async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallback: T
  ): Promise<T> {
    try {
      // Always try the operation with a timeout
      const timeoutPromise = new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), 1500)
      );
      
      const result = await Promise.race([operation(), timeoutPromise]);
      this.isConnected = true;
      return result;
    } catch (error) {
      logger.warn("Database operation failed, using fallback:", error instanceof Error ? error.message : String(error));
      this.isConnected = false;
      return fallback;
    }
  }
}

export const dbManager = DatabaseConnectionManager.getInstance();