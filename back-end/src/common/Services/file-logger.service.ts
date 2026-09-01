import { Injectable, LoggerService, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { existsSync, mkdirSync, appendFileSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';

@Injectable()
export class FileLoggerService implements LoggerService, OnModuleInit, OnModuleDestroy {
  // Use dot-folder `.logs` so file watchers (Live Server, nodemon, nest CLI) ignore log file changes
  private readonly logsDir = join(process.cwd(), '.logs');
  private readonly visibleLogsDir = join(process.cwd(), 'logs');
  private readonly combinedLogPath = join(this.logsDir, 'combined.log');
  private readonly errorLogPath = join(this.logsDir, 'error.log');
  private intervalTimer: NodeJS.Timeout | null = null;
  private rotationTimer: NodeJS.Timeout | null = null;
  private logBuffer: string[] = [];
  private currentDate: string = this.todayStr();

  /** Maximum age of rotated log files in days before cleanup */
  private readonly MAX_LOG_AGE_DAYS = 30;

  constructor() {
    this.ensureLogsDirExists();
  }

  onModuleInit() {
    // Flush buffered logs to disk every 60 seconds if buffer has content
    this.intervalTimer = setInterval(() => {
      if (this.logBuffer.length > 0) {
        this.flushBuffer();
      }
    }, 60000);

    // Check for date-based log rotation every 60 seconds
    this.rotationTimer = setInterval(() => {
      this.checkRotation();
    }, 60000);

    // Run initial cleanup of old log files
    this.cleanupOldLogs();
  }

  onModuleDestroy() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
    this.flushBuffer();
  }

  private todayStr(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  /** Get the path for today's application log in the visible logs/ directory */
  private applicationLogPath(): string {
    return join(this.visibleLogsDir, `application-${this.currentDate}.log`);
  }

  /** Get the path for today's error log in the visible logs/ directory */
  private errorVisibleLogPath(): string {
    return join(this.visibleLogsDir, `error-${this.currentDate}.log`);
  }

  /** Check if date has changed and rotate log file paths accordingly */
  private checkRotation() {
    const today = this.todayStr();
    if (today !== this.currentDate) {
      this.flushBuffer();
      this.currentDate = today;
      this.log(`Log rotation: switched to ${today}`, 'LogRotation');
      this.cleanupOldLogs();
    }
  }

  /** Remove log files older than MAX_LOG_AGE_DAYS */
  private cleanupOldLogs() {
    try {
      if (!existsSync(this.visibleLogsDir)) return;
      const cutoff = Date.now() - this.MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000;
      const files = readdirSync(this.visibleLogsDir);
      for (const file of files) {
        if (!file.endsWith('.log')) continue;
        const filePath = join(this.visibleLogsDir, file);
        try {
          const stat = statSync(filePath);
          if (stat.mtimeMs < cutoff) {
            unlinkSync(filePath);
            this.log(`Cleaned up old log file: ${file}`, 'LogRotation');
          }
        } catch {
          // Ignore individual file errors
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  private ensureLogsDirExists() {
    if (!existsSync(this.logsDir)) {
      mkdirSync(this.logsDir, { recursive: true });
    }
    if (!existsSync(this.visibleLogsDir)) {
      mkdirSync(this.visibleLogsDir, { recursive: true });
    }
  }

  private writeCombined(message: string) {
    this.ensureLogsDirExists();
    try {
      appendFileSync(this.combinedLogPath, message, 'utf8');
    } catch (err) {
      console.error('Failed to write to combined log file:', err);
    }
  }

  /** Write to the visible application log (date-based rotation) */
  private writeApplicationLog(message: string) {
    this.ensureLogsDirExists();
    try {
      appendFileSync(this.applicationLogPath(), message, 'utf8');
    } catch (err) {
      console.error('Failed to write to application log file:', err);
    }
  }

  private writeError(message: string) {
    this.ensureLogsDirExists();
    try {
      appendFileSync(this.errorLogPath, message, 'utf8');
      appendFileSync(this.combinedLogPath, message, 'utf8');
      // Also write to visible date-based error log
      appendFileSync(this.errorVisibleLogPath(), message, 'utf8');
    } catch (err) {
      console.error('Failed to write to error log file:', err);
    }
  }

  log(message: string, context?: string) {
    const formatted = `[${new Date().toISOString()}] [LOG] ${context ? `[${context}] ` : ''}${message}\n`;
    console.log(formatted.trim());
    this.logBuffer.push(formatted);
    if (this.logBuffer.length >= 10) {
      this.flushBuffer();
    }
  }

  error(message: string, trace?: string, context?: string) {
    const formatted = `[${new Date().toISOString()}] [ERROR] ${context ? `[${context}] ` : ''}${message}${trace ? `\nTrace: ${trace}` : ''}\n`;
    console.error(formatted.trim());
    this.writeError(formatted);
  }

  warn(message: string, context?: string) {
    const formatted = `[${new Date().toISOString()}] [WARN] ${context ? `[${context}] ` : ''}${message}\n`;
    console.warn(formatted.trim());
    this.logBuffer.push(formatted);
  }

  debug(message: string, context?: string) {
    const formatted = `[${new Date().toISOString()}] [DEBUG] ${context ? `[${context}] ` : ''}${message}\n`;
    console.debug(formatted.trim());
    this.logBuffer.push(formatted);
  }

  verbose(message: string, context?: string) {
    const formatted = `[${new Date().toISOString()}] [VERBOSE] ${context ? `[${context}] ` : ''}${message}\n`;
    this.logBuffer.push(formatted);
  }

  private flushBuffer() {
    if (this.logBuffer.length > 0) {
      const content = this.logBuffer.join('');
      this.logBuffer = [];
      this.writeCombined(content);
      // Also write to visible date-based application log
      this.writeApplicationLog(content);
    }
  }
}
