/**
 * Frontend Logger Utility
 * Provides structured logging with levels, timestamps, and optional external service integration
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs: number = 100;
  private enableConsole: boolean = true;
  private enableStorage: boolean = false;
  private enableRemote: boolean = false;

  private constructor() {
    this.enableConsole = process.env.NODE_ENV !== 'production';
    this.enableRemote = process.env.NODE_ENV === 'production';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Log a debug message
   */
  public debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log an info message
   */
  public info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a warning message
   */
  public warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log an error message
   */
  public error(message: string, error?: Error, context?: Record<string, any>): void {
    const entry: LogEntry = {
      level: LogLevel.ERROR,
      message,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        errorName: error?.name,
        errorMessage: error?.message,
      },
      stack: error?.stack,
    };

    this.processLog(entry);
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    this.processLog(entry);
  }

  /**
   * Process log entry
   */
  private processLog(entry: LogEntry): void {
    // Add to in-memory logs
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output (development)
    if (this.enableConsole) {
      this.logToConsole(entry);
    }

    // LocalStorage output (optional)
    if (this.enableStorage) {
      this.logToStorage(entry);
    }

    // Remote service (production)
    if (this.enableRemote && entry.level === LogLevel.ERROR) {
      this.logToRemote(entry);
    }
  }

  /**
   * Log to browser console
   */
  private logToConsole(entry: LogEntry): void {
    const style = this.getConsoleStyle(entry.level);
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(`%c${prefix}`, style, entry.message, entry.context || '');
        break;
      case LogLevel.INFO:
        console.info(`%c${prefix}`, style, entry.message, entry.context || '');
        break;
      case LogLevel.WARN:
        console.warn(`%c${prefix}`, style, entry.message, entry.context || '');
        break;
      case LogLevel.ERROR:
        console.error(`%c${prefix}`, style, entry.message, entry.context || '');
        if (entry.stack) {
          console.error('Stack trace:', entry.stack);
        }
        break;
    }
  }

  /**
   * Get console style for log level
   */
  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'color: #888; font-weight: normal;';
      case LogLevel.INFO:
        return 'color: #2196F3; font-weight: bold;';
      case LogLevel.WARN:
        return 'color: #FF9800; font-weight: bold;';
      case LogLevel.ERROR:
        return 'color: #F44336; font-weight: bold;';
      default:
        return '';
    }
  }

  /**
   * Log to localStorage
   */
  private logToStorage(entry: LogEntry): void {
    try {
      const storageKey = 'app_logs';
      const existingLogs = localStorage.getItem(storageKey);
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      logs.push(entry);
      
      // Keep only last 50 logs in storage
      if (logs.length > 50) {
        logs.shift();
      }
      
      localStorage.setItem(storageKey, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to save log to localStorage:', error);
    }
  }

  /**
   * Send log to remote service
   */
  private async logToRemote(entry: LogEntry): Promise<void> {
    try {
      // Example: Send to Sentry, LogRocket, or custom endpoint
      // This is a placeholder - implement based on your service
      
      const endpoint = process.env.VITE_LOGGING_ENDPOINT;
      if (!endpoint) return;

      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...entry,
          userAgent: navigator.userAgent,
          url: window.location.href,
          environment: process.env.NODE_ENV,
        }),
      });
    } catch (error) {
      console.error('Failed to send log to remote service:', error);
    }
  }

  /**
   * Get all logs
   */
  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs from localStorage
   */
  public getStoredLogs(): LogEntry[] {
    try {
      const storageKey = 'app_logs';
      const logs = localStorage.getItem(storageKey);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Failed to retrieve logs from localStorage:', error);
      return [];
    }
  }

  /**
   * Clear all logs
   */
  public clearLogs(): void {
    this.logs = [];
    try {
      localStorage.removeItem('app_logs');
    } catch (error) {
      console.error('Failed to clear logs from localStorage:', error);
    }
  }

  /**
   * Export logs as JSON
   */
  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Download logs as file
   */
  public downloadLogs(): void {
    const data = this.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
const logger = Logger.getInstance();
export default logger;

// Export convenience methods
export const debug = (message: string, context?: Record<string, any>) => logger.debug(message, context);
export const info = (message: string, context?: Record<string, any>) => logger.info(message, context);
export const warn = (message: string, context?: Record<string, any>) => logger.warn(message, context);
export const error = (message: string, err?: Error, context?: Record<string, any>) => logger.error(message, err, context);
