import { logger } from "../logger";

/**
 * Database connection fallback handler
 * Provides graceful degradation when database is unavailable
 */
export class DatabaseFallback {
  private static isConnected = false;
  private static lastConnectionAttempt = 0;
  private static connectionRetryDelay = 30000; // 30 seconds

  static setConnected(status: boolean) {
    this.isConnected = status;
    this.lastConnectionAttempt = Date.now();
  }

  static shouldRetryConnection(): boolean {
    return Date.now() - this.lastConnectionAttempt > this.connectionRetryDelay;
  }

  static handleDatabaseError(error: any): void {
    logger.error("Database operation failed:", error.message);
    this.setConnected(false);
  }

  static async withFallback<T>(
    operation: () => Promise<T>,
    fallbackValue: T
  ): Promise<T> {
    try {
      const result = await operation();
      this.setConnected(true);
      return result;
    } catch (error) {
      this.handleDatabaseError(error);
      return fallbackValue;
    }
  }
}