/**
 * Enterprise Logger Service
 * Winston-based logging for AI Multi-Model Manager
 * Phase 2 - $100K IA Multi-Modelo Upgrade
 */

const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let metaString = '';
        if (Object.keys(meta).length > 0) {
            metaString = ` ${JSON.stringify(meta)}`;
        }
        return `${timestamp} [${level.toUpperCase()}]: ${message}${metaString}`;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { 
        service: 'ai-multi-model-manager',
        version: '2.0.0',
        phase: 'phase-2'
    },
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    let metaString = '';
                    if (Object.keys(meta).length > 0) {
                        metaString = ` ${JSON.stringify(meta, null, 2)}`;
                    }
                    return `${timestamp} ${level}: ${message}${metaString}`;
                })
            )
        }),
        
        // File transport for all logs
        new winston.transports.File({
            filename: path.join(logsDir, 'app.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: logFormat
        }),
        
        // Error file transport
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: logFormat
        }),
        
        // AI-specific logs
        new winston.transports.File({
            filename: path.join(logsDir, 'ai-operations.log'),
            level: 'info',
            maxsize: 10485760, // 10MB
            maxFiles: 10,
            format: logFormat
        })
    ],
    
    // Handle uncaught exceptions and rejections
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log'),
            maxsize: 5242880,
            maxFiles: 3
        })
    ],
    
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log'),
            maxsize: 5242880,
            maxFiles: 3
        })
    ]
});

// Custom logging methods for AI operations
logger.aiRequest = function(data) {
    this.info('AI Request', {
        type: 'ai_request',
        model: data.model,
        useCase: data.useCase,
        userId: data.userId,
        requestId: data.requestId,
        timestamp: new Date().toISOString()
    });
};

logger.aiResponse = function(data) {
    this.info('AI Response', {
        type: 'ai_response',
        model: data.model,
        success: data.success,
        responseTime: data.responseTime,
        tokensUsed: data.tokensUsed,
        cached: data.cached,
        requestId: data.requestId,
        timestamp: new Date().toISOString()
    });
};

logger.aiError = function(data) {
    this.error('AI Error', {
        type: 'ai_error',
        model: data.model,
        error: data.error,
        requestId: data.requestId,
        userId: data.userId,
        timestamp: new Date().toISOString()
    });
};

logger.modelSwitch = function(data) {
    this.info('Model Switch', {
        type: 'model_switch',
        fromModel: data.fromModel,
        toModel: data.toModel,
        userId: data.userId,
        reason: data.reason,
        timestamp: new Date().toISOString()
    });
};

logger.consensusRequest = function(data) {
    this.info('Consensus Request', {
        type: 'consensus_request',
        models: data.models,
        userId: data.userId,
        requestId: data.requestId,
        timestamp: new Date().toISOString()
    });
};

// Add metadata to all logs in production
if (process.env.NODE_ENV === 'production') {
    logger.defaultMeta.environment = 'production';
    logger.defaultMeta.server = process.env.SERVER_NAME || 'unknown';
}

// Log startup message
logger.info('Enterprise Logger initialized', {
    level: logger.level,
    environment: process.env.NODE_ENV || 'development',
    logDirectory: logsDir
});

module.exports = logger;