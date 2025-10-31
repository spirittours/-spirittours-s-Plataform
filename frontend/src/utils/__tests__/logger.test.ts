/**
 * Tests for Logger Utility
 */

import { Logger } from '../logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new Logger();
    localStorage.clear();
    jest.clearAllMocks();

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('debug', () => {
    it('should log debug messages in development', () => {
      logger.debug('Debug message', { extra: 'data' });

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should include context in debug logs', () => {
      const context = { userId: 123, action: 'click' };

      logger.debug('User action', context);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('User action'),
        expect.objectContaining(context)
      );
    });
  });

  describe('info', () => {
    it('should log info messages', () => {
      logger.info('Info message');

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle info logs with context', () => {
      const context = { event: 'pageView', page: '/dashboard' };

      logger.info('Page viewed', context);

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      logger.warn('Warning message');

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should include context in warnings', () => {
      const context = { reason: 'deprecated_api' };

      logger.warn('Using deprecated API', context);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using deprecated API'),
        expect.objectContaining(context)
      );
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      const error = new Error('Test error');

      logger.error('Error occurred', error);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should include error details', () => {
      const error = new Error('Test error');
      const context = { operation: 'fetchData' };

      logger.error('Failed to fetch', error, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch'),
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Test error',
          }),
        })
      );
    });

    it('should handle errors without Error objects', () => {
      logger.error('String error', undefined, { detail: 'info' });

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('persistence', () => {
    it('should store logs in localStorage', () => {
      logger.info('Persistent log');

      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should retrieve logs from localStorage', () => {
      const mockLogs = [
        { level: 'info', message: 'Test log', timestamp: Date.now() },
      ];

      localStorage.getItem = jest.fn(() => JSON.stringify(mockLogs));

      const logs = logger.getLogs();

      expect(logs).toEqual(mockLogs);
    });

    it('should limit stored logs to prevent overflow', () => {
      // Create many logs
      for (let i = 0; i < 150; i++) {
        logger.info(`Log ${i}`);
      }

      const logs = logger.getLogs();

      // Should keep only most recent 100 logs (or configured limit)
      expect(logs.length).toBeLessThanOrEqual(100);
    });
  });

  describe('log filtering', () => {
    it('should filter logs by level', () => {
      logger.debug('Debug log');
      logger.info('Info log');
      logger.warn('Warn log');
      logger.error('Error log');

      const errorLogs = logger.getLogs('error');

      expect(errorLogs.every(log => log.level === 'error')).toBe(true);
    });

    it('should return all logs when no filter specified', () => {
      logger.info('Log 1');
      logger.warn('Log 2');

      const allLogs = logger.getLogs();

      expect(allLogs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('clear logs', () => {
    it('should clear all stored logs', () => {
      logger.info('Log 1');
      logger.info('Log 2');

      expect(logger.getLogs().length).toBeGreaterThan(0);

      logger.clearLogs();

      expect(logger.getLogs().length).toBe(0);
    });

    it('should remove logs from localStorage', () => {
      logger.info('Log');

      logger.clearLogs();

      expect(localStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('export logs', () => {
    it('should export logs as JSON string', () => {
      logger.info('Export test');

      const exported = logger.exportLogs();

      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it('should include all log data in export', () => {
      logger.info('Test log', { extra: 'data' });

      const exported = logger.exportLogs();
      const parsed = JSON.parse(exported);

      expect(parsed).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'info',
            message: 'Test log',
          }),
        ])
      );
    });
  });

  describe('download logs', () => {
    it('should trigger download', () => {
      // Mock createElement and other DOM methods
      const mockLink = {
        click: jest.fn(),
        setAttribute: jest.fn(),
        style: {},
      };

      document.createElement = jest.fn(() => mockLink as any);
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();

      logger.info('Test log');
      logger.downloadLogs();

      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  describe('log levels in production', () => {
    it('should respect log level configuration', () => {
      // Set production mode
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const prodLogger = new Logger();

      prodLogger.debug('Debug in prod'); // Should not log
      prodLogger.info('Info in prod'); // Should log

      // Debug should be filtered in production
      expect(consoleLogSpy).toHaveBeenCalledTimes(1); // Only info

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('context enrichment', () => {
    it('should add timestamp to logs', () => {
      logger.info('Timestamped log');

      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1];

      expect(lastLog.timestamp).toBeDefined();
      expect(typeof lastLog.timestamp).toBe('number');
    });

    it('should merge multiple context objects', () => {
      const context1 = { userId: 123 };
      const context2 = { sessionId: 'abc' };

      logger.info('Merged context', { ...context1, ...context2 });

      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1];

      expect(lastLog.context).toMatchObject(context1);
      expect(lastLog.context).toMatchObject(context2);
    });
  });
});
