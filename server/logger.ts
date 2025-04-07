/**
 * Structured Logger Module
 * 
 * Provides a standardized logging interface with the following features:
 * - Consistent JSON format for easy parsing
 * - Different log levels (debug, info, warn, error)
 * - Automatic timestamp inclusion 
 * - Context object support for structured data
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private serviceName: string;
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }
  
  /**
   * Format and output a log message
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: this.serviceName,
      message,
      ...context
    };
    
    // Print log in JSON format
    console.log(JSON.stringify(logEntry));
  }
  
  /**
   * Debug level logging - for development information
   */
  debug(context: LogContext, message: string): void {
    if (process.env.NODE_ENV !== 'production') {
      this.log('debug', message, context);
    }
  }
  
  /**
   * Info level logging - for operational events
   */
  info(context: LogContext, message: string): void {
    this.log('info', message, context);
  }
  
  /**
   * Warning level logging - for potential issues
   */
  warn(context: LogContext, message: string): void {
    this.log('warn', message, context);
  }
  
  /**
   * Error level logging - for application errors
   */
  error(context: LogContext, message: string): void {
    this.log('error', message, context);
  }
}

// Create and export a default logger instance for the auth service
const logger = new Logger('AuthService');
export default logger;