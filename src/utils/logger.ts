/**
 * Logger System
 * Centralized logging with log levels and conditional output
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private enabledCategories: Set<string> = new Set();

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set the minimum log level to display
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Enable logging for specific categories
   */
  enableCategory(...categories: string[]): void {
    categories.forEach((cat) => this.enabledCategories.add(cat));
  }

  /**
   * Disable logging for specific categories
   */
  disableCategory(...categories: string[]): void {
    categories.forEach((cat) => this.enabledCategories.delete(cat));
  }

  /**
   * Clear all category filters
   */
  clearCategories(): void {
    this.enabledCategories.clear();
  }

  /**
   * Check if a log should be output
   */
  private shouldLog(level: LogLevel, category?: string): boolean {
    if (level < this.logLevel) return false;
    if (category && this.enabledCategories.size > 0) {
      return this.enabledCategories.has(category);
    }
    return true;
  }

  /**
   * Format log message with timestamp and category
   */
  private format(
    level: string,
    category: string | undefined,
    args: unknown[],
  ): unknown[] {
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    const prefix = category
      ? `[${timestamp}] [${level}] [${category}]`
      : `[${timestamp}] [${level}]`;
    return [prefix, ...args];
  }

  debug(category: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG, category)) {
      console.log(...this.format("DEBUG", category, args));
    }
  }

  info(category: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO, category)) {
      console.log(...this.format("INFO", category, args));
    }
  }

  warn(category: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN, category)) {
      console.warn(...this.format("WARN", category, args));
    }
  }

  error(category: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR, category)) {
      console.error(...this.format("ERROR", category, args));
    }
  }

  /**
   * Simple logging without category (always shown if level permits)
   */
  log(level: LogLevel, ...args: unknown[]): void {
    if (level >= this.logLevel) {
      const levelName = LogLevel[level];
      console.log(...this.format(levelName, undefined, args));
    }
  }
}

// Export singleton instance for convenience
export const logger = Logger.getInstance();

// Export helper functions for common use cases
export const debug = (category: string, ...args: unknown[]) =>
  logger.debug(category, ...args);
export const info = (category: string, ...args: unknown[]) =>
  logger.info(category, ...args);
export const warn = (category: string, ...args: unknown[]) =>
  logger.warn(category, ...args);
export const error = (category: string, ...args: unknown[]) =>
  logger.error(category, ...args);
