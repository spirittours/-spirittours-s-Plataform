/**
 * Advanced Security System
 * Enterprise-grade security with encryption, audit logging, and threat detection
 * $100K IA Multi-Modelo Upgrade - Security Component
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const EventEmitter = require('events');
const logger = require('../logging/logger');

class AdvancedSecuritySystem extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            // Encryption Configuration
            encryptionAlgorithm: options.encryptionAlgorithm || 'aes-256-gcm',
            keyDerivationIterations: options.keyDerivationIterations || 100000,
            saltLength: options.saltLength || 32,
            ivLength: options.ivLength || 16,
            tagLength: options.tagLength || 16,
            
            // Authentication Configuration
            jwtSecret: options.jwtSecret || process.env.JWT_SECRET,
            jwtExpiresIn: options.jwtExpiresIn || '24h',
            refreshTokenSecret: options.refreshTokenSecret || process.env.REFRESH_TOKEN_SECRET,
            bcryptRounds: options.bcryptRounds || 12,
            
            // Security Policies
            passwordPolicy: {
                minLength: 8,
                requireUppercase: true,
                requireLowercase: true,
                requireNumbers: true,
                requireSymbols: true,
                maxAge: 90, // days
                preventReuse: 5 // last N passwords
            },
            
            // Rate Limiting
            rateLimiting: {
                windowMs: 15 * 60 * 1000, // 15 minutes
                maxAttempts: 5,
                blockDuration: 30 * 60 * 1000 // 30 minutes
            },
            
            // Audit Logging
            auditLogging: {
                enabled: true,
                retentionDays: 365,
                encryptLogs: true,
                realTimeAlerts: true
            },
            
            // Threat Detection
            threatDetection: {
                enabled: true,
                suspiciousActivityThreshold: 10,
                bruteForceThreshold: 5,
                anomalyDetection: true
            },
            
            ...options
        };

        // Security Components
        this.encryptionKeys = new Map();
        this.auditLogs = [];
        this.securityEvents = [];
        this.threatIntelligence = new Map();
        this.activeTokens = new Set();
        this.rateLimitStore = new Map();
        this.securityMetrics = {
            totalAuditEvents: 0,
            securityThreats: 0,
            blockedAttempts: 0,
            encryptionOperations: 0
        };

        // Initialize security system
        this.initializeSecurity();
    }

    /**
     * Initialize security system
     */
    async initializeSecurity() {
        try {
            this.generateMasterKeys();
            this.setupAuditLogging();
            this.setupThreatDetection();
            this.startSecurityMonitoring();
            
            logger.info('Advanced Security System initialized', {
                service: 'ai-multi-model-manager',
                version: '2.0.0',
                phase: 'phase-2',
                encryptionAlgorithm: this.config.encryptionAlgorithm,
                auditLoggingEnabled: this.config.auditLogging.enabled,
                threatDetectionEnabled: this.config.threatDetection.enabled
            });
            
            this.auditLog('SYSTEM_INITIALIZED', {
                component: 'AdvancedSecuritySystem',
                timestamp: new Date().toISOString()
            });
            
            this.emit('security.initialized');
            
        } catch (error) {
            logger.error('Failed to initialize security system', error);
            throw error;
        }
    }

    /**
     * Generate master encryption keys
     */
    generateMasterKeys() {
        // Generate master key for data encryption
        const masterKey = crypto.randomBytes(32);
        this.encryptionKeys.set('master', masterKey);
        
        // Generate key for audit log encryption
        const auditKey = crypto.randomBytes(32);
        this.encryptionKeys.set('audit', auditKey);
        
        // Generate key for session encryption
        const sessionKey = crypto.randomBytes(32);
        this.encryptionKeys.set('session', sessionKey);
        
        logger.info('Encryption keys generated', {
            service: 'ai-multi-model-manager',
            version: '2.0.0',
            phase: 'phase-2',
            keysGenerated: this.encryptionKeys.size
        });
    }

    /**
     * Encrypt data using AES-256-GCM
     */
    encrypt(data, keyType = 'master') {
        try {
            const key = this.encryptionKeys.get(keyType);
            if (!key) {
                throw new Error(`Encryption key '${keyType}' not found`);
            }

            const iv = crypto.randomBytes(this.config.ivLength);
            const cipher = crypto.createCipher(this.config.encryptionAlgorithm, key, iv);
            
            let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const tag = cipher.getAuthTag();
            
            this.securityMetrics.encryptionOperations++;
            
            return {
                encrypted,
                iv: iv.toString('hex'),
                tag: tag.toString('hex'),
                algorithm: this.config.encryptionAlgorithm
            };
            
        } catch (error) {
            this.auditLog('ENCRYPTION_ERROR', {
                error: error.message,
                keyType,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Decrypt data using AES-256-GCM
     */
    decrypt(encryptedData, keyType = 'master') {
        try {
            const key = this.encryptionKeys.get(keyType);
            if (!key) {
                throw new Error(`Decryption key '${keyType}' not found`);
            }

            const { encrypted, iv, tag, algorithm } = encryptedData;
            
            const decipher = crypto.createDecipher(algorithm, key, Buffer.from(iv, 'hex'));
            decipher.setAuthTag(Buffer.from(tag, 'hex'));
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return JSON.parse(decrypted);
            
        } catch (error) {
            this.auditLog('DECRYPTION_ERROR', {
                error: error.message,
                keyType,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Hash password using bcrypt
     */
    async hashPassword(password) {
        try {
            this.validatePassword(password);
            const hash = await bcrypt.hash(password, this.config.bcryptRounds);
            
            this.auditLog('PASSWORD_HASHED', {
                timestamp: new Date().toISOString()
            });
            
            return hash;
        } catch (error) {
            this.auditLog('PASSWORD_HASH_ERROR', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Verify password against hash
     */
    async verifyPassword(password, hash) {
        try {
            const isValid = await bcrypt.compare(password, hash);
            
            this.auditLog('PASSWORD_VERIFICATION', {
                result: isValid ? 'SUCCESS' : 'FAILED',
                timestamp: new Date().toISOString()
            });
            
            return isValid;
        } catch (error) {
            this.auditLog('PASSWORD_VERIFICATION_ERROR', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Validate password against security policy
     */
    validatePassword(password) {
        const policy = this.config.passwordPolicy;
        const errors = [];
        
        if (password.length < policy.minLength) {
            errors.push(`Password must be at least ${policy.minLength} characters long`);
        }
        
        if (policy.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        
        if (policy.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        
        if (policy.requireNumbers && !/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        
        if (policy.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Password must contain at least one symbol');
        }
        
        if (errors.length > 0) {
            const error = new Error('Password does not meet security requirements');
            error.validationErrors = errors;
            throw error;
        }
        
        return true;
    }

    /**
     * Generate JWT token
     */
    generateJWT(payload, expiresIn = null) {
        try {
            const token = jwt.sign(
                payload,
                this.config.jwtSecret,
                { expiresIn: expiresIn || this.config.jwtExpiresIn }
            );
            
            this.activeTokens.add(token);
            
            this.auditLog('JWT_GENERATED', {
                userId: payload.userId,
                expiresIn: expiresIn || this.config.jwtExpiresIn,
                timestamp: new Date().toISOString()
            });
            
            return token;
        } catch (error) {
            this.auditLog('JWT_GENERATION_ERROR', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Verify JWT token
     */
    verifyJWT(token) {
        try {
            if (!this.activeTokens.has(token)) {
                throw new Error('Token has been revoked');
            }
            
            const decoded = jwt.verify(token, this.config.jwtSecret);
            
            this.auditLog('JWT_VERIFIED', {
                userId: decoded.userId,
                timestamp: new Date().toISOString()
            });
            
            return decoded;
        } catch (error) {
            this.auditLog('JWT_VERIFICATION_ERROR', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            if (error.name === 'TokenExpiredError') {
                this.activeTokens.delete(token);
            }
            
            throw error;
        }
    }

    /**
     * Revoke JWT token
     */
    revokeJWT(token) {
        this.activeTokens.delete(token);
        
        this.auditLog('JWT_REVOKED', {
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Generate refresh token
     */
    generateRefreshToken(payload) {
        try {
            const refreshToken = jwt.sign(
                payload,
                this.config.refreshTokenSecret,
                { expiresIn: '30d' }
            );
            
            this.auditLog('REFRESH_TOKEN_GENERATED', {
                userId: payload.userId,
                timestamp: new Date().toISOString()
            });
            
            return refreshToken;
        } catch (error) {
            this.auditLog('REFRESH_TOKEN_ERROR', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Verify refresh token
     */
    verifyRefreshToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, this.config.refreshTokenSecret);
            
            this.auditLog('REFRESH_TOKEN_VERIFIED', {
                userId: decoded.userId,
                timestamp: new Date().toISOString()
            });
            
            return decoded;
        } catch (error) {
            this.auditLog('REFRESH_TOKEN_VERIFICATION_ERROR', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Rate limiting implementation
     */
    checkRateLimit(identifier, endpoint = 'default') {
        const key = `${identifier}:${endpoint}`;
        const now = Date.now();
        const window = this.config.rateLimiting.windowMs;
        
        if (!this.rateLimitStore.has(key)) {
            this.rateLimitStore.set(key, {
                attempts: 1,
                firstAttempt: now,
                blocked: false,
                blockExpires: null
            });
            return { allowed: true, remaining: this.config.rateLimiting.maxAttempts - 1 };
        }
        
        const record = this.rateLimitStore.get(key);
        
        // Check if currently blocked
        if (record.blocked && now < record.blockExpires) {
            this.securityMetrics.blockedAttempts++;
            
            this.auditLog('RATE_LIMIT_BLOCKED', {
                identifier,
                endpoint,
                blockExpires: new Date(record.blockExpires).toISOString(),
                timestamp: new Date().toISOString()
            });
            
            return { 
                allowed: false, 
                remaining: 0, 
                resetTime: record.blockExpires,
                blocked: true 
            };
        }
        
        // Reset window if needed
        if (now - record.firstAttempt > window) {
            record.attempts = 1;
            record.firstAttempt = now;
            record.blocked = false;
            record.blockExpires = null;
        } else {
            record.attempts++;
        }
        
        // Check if exceeded limit
        if (record.attempts > this.config.rateLimiting.maxAttempts) {
            record.blocked = true;
            record.blockExpires = now + this.config.rateLimiting.blockDuration;
            
            this.detectThreat('RATE_LIMIT_EXCEEDED', {
                identifier,
                endpoint,
                attempts: record.attempts
            });
            
            return { 
                allowed: false, 
                remaining: 0, 
                resetTime: record.blockExpires,
                blocked: true 
            };
        }
        
        return { 
            allowed: true, 
            remaining: this.config.rateLimiting.maxAttempts - record.attempts 
        };
    }

    /**
     * Setup audit logging
     */
    setupAuditLogging() {
        if (!this.config.auditLogging.enabled) return;
        
        // Setup log rotation
        setInterval(() => {
            this.rotateAuditLogs();
        }, 24 * 60 * 60 * 1000); // Daily rotation
        
        logger.info('Audit logging configured', {
            service: 'ai-multi-model-manager',
            version: '2.0.0',
            phase: 'phase-2',
            retentionDays: this.config.auditLogging.retentionDays,
            encryptLogs: this.config.auditLogging.encryptLogs
        });
    }

    /**
     * Audit log entry
     */
    auditLog(eventType, data = {}) {
        if (!this.config.auditLogging.enabled) return;
        
        const auditEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            eventType,
            data,
            source: 'AdvancedSecuritySystem',
            sessionId: data.sessionId || null,
            userId: data.userId || null,
            ipAddress: data.ipAddress || null,
            userAgent: data.userAgent || null
        };
        
        // Encrypt audit log if configured
        if (this.config.auditLogging.encryptLogs) {
            auditEntry.encrypted = this.encrypt(auditEntry, 'audit');
            delete auditEntry.data;
        }
        
        this.auditLogs.push(auditEntry);
        this.securityMetrics.totalAuditEvents++;
        
        // Real-time alerts for critical events
        if (this.config.auditLogging.realTimeAlerts && this.isCriticalEvent(eventType)) {
            this.emit('security.critical', auditEntry);
        }
        
        // Emit audit event
        this.emit('security.audit', auditEntry);
        
        // Keep audit logs within memory limits
        if (this.auditLogs.length > 10000) {
            this.auditLogs = this.auditLogs.slice(-5000);
        }
    }

    /**
     * Check if event is critical
     */
    isCriticalEvent(eventType) {
        const criticalEvents = [
            'AUTHENTICATION_FAILURE',
            'AUTHORIZATION_DENIED',
            'BRUTE_FORCE_DETECTED',
            'SUSPICIOUS_ACTIVITY',
            'DATA_BREACH_ATTEMPT',
            'ENCRYPTION_ERROR',
            'DECRYPTION_ERROR',
            'RATE_LIMIT_EXCEEDED'
        ];
        
        return criticalEvents.includes(eventType);
    }

    /**
     * Rotate audit logs
     */
    rotateAuditLogs() {
        const retentionMs = this.config.auditLogging.retentionDays * 24 * 60 * 60 * 1000;
        const cutoffTime = Date.now() - retentionMs;
        
        const originalLength = this.auditLogs.length;
        this.auditLogs = this.auditLogs.filter(log => {
            return new Date(log.timestamp).getTime() > cutoffTime;
        });
        
        const removedLogs = originalLength - this.auditLogs.length;
        
        if (removedLogs > 0) {
            logger.info('Audit logs rotated', {
                service: 'ai-multi-model-manager',
                version: '2.0.0',
                phase: 'phase-2',
                removedLogs,
                remainingLogs: this.auditLogs.length
            });
        }
    }

    /**
     * Setup threat detection
     */
    setupThreatDetection() {
        if (!this.config.threatDetection.enabled) return;
        
        // Monitor security events
        this.on('security.audit', (auditEntry) => {
            this.analyzeThreat(auditEntry);
        });
        
        // Periodic threat analysis
        setInterval(() => {
            this.performThreatAnalysis();
        }, 5 * 60 * 1000); // Every 5 minutes
        
        logger.info('Threat detection configured', {
            service: 'ai-multi-model-manager',
            version: '2.0.0',
            phase: 'phase-2',
            suspiciousActivityThreshold: this.config.threatDetection.suspiciousActivityThreshold,
            bruteForceThreshold: this.config.threatDetection.bruteForceThreshold
        });
    }

    /**
     * Analyze individual threat
     */
    analyzeThreat(auditEntry) {
        const { eventType, data, userId, ipAddress } = auditEntry;
        
        // Track failed authentication attempts
        if (eventType === 'PASSWORD_VERIFICATION' && data.result === 'FAILED') {
            this.trackFailedLogin(userId || 'anonymous', ipAddress);
        }
        
        // Monitor suspicious patterns
        if (eventType === 'JWT_VERIFICATION_ERROR' || eventType === 'AUTHORIZATION_DENIED') {
            this.trackSuspiciousActivity(userId || 'anonymous', ipAddress, eventType);
        }
        
        // Rate limit violations
        if (eventType === 'RATE_LIMIT_BLOCKED') {
            this.detectThreat('RATE_LIMIT_VIOLATION', {
                identifier: data.identifier,
                endpoint: data.endpoint,
                ipAddress
            });
        }
    }

    /**
     * Track failed login attempts
     */
    trackFailedLogin(identifier, ipAddress) {
        const key = `failed_login:${identifier}:${ipAddress}`;
        
        if (!this.threatIntelligence.has(key)) {
            this.threatIntelligence.set(key, {
                count: 0,
                firstAttempt: Date.now(),
                lastAttempt: Date.now()
            });
        }
        
        const record = this.threatIntelligence.get(key);
        record.count++;
        record.lastAttempt = Date.now();
        
        if (record.count >= this.config.threatDetection.bruteForceThreshold) {
            this.detectThreat('BRUTE_FORCE_DETECTED', {
                identifier,
                ipAddress,
                attempts: record.count,
                timeframe: record.lastAttempt - record.firstAttempt
            });
        }
    }

    /**
     * Track suspicious activity
     */
    trackSuspiciousActivity(identifier, ipAddress, activity) {
        const key = `suspicious:${identifier}:${ipAddress}`;
        
        if (!this.threatIntelligence.has(key)) {
            this.threatIntelligence.set(key, {
                activities: [],
                count: 0,
                firstActivity: Date.now()
            });
        }
        
        const record = this.threatIntelligence.get(key);
        record.activities.push({
            activity,
            timestamp: Date.now()
        });
        record.count++;
        
        if (record.count >= this.config.threatDetection.suspiciousActivityThreshold) {
            this.detectThreat('SUSPICIOUS_ACTIVITY', {
                identifier,
                ipAddress,
                activitiesCount: record.count,
                activities: record.activities.slice(-5) // Last 5 activities
            });
        }
    }

    /**
     * Detect and handle threats
     */
    detectThreat(threatType, data) {
        const threat = {
            id: crypto.randomUUID(),
            type: threatType,
            severity: this.getThreatSeverity(threatType),
            timestamp: new Date().toISOString(),
            data,
            status: 'active'
        };
        
        this.securityEvents.push(threat);
        this.securityMetrics.securityThreats++;
        
        // Log threat
        this.auditLog('THREAT_DETECTED', {
            threatId: threat.id,
            threatType,
            severity: threat.severity,
            data
        });
        
        // Emit threat event
        this.emit('security.threat', threat);
        
        // Auto-response based on severity
        if (threat.severity === 'high' || threat.severity === 'critical') {
            this.handleHighSeverityThreat(threat);
        }
        
        logger.warn('Security threat detected', {
            service: 'ai-multi-model-manager',
            version: '2.0.0',
            phase: 'phase-2',
            threatType,
            severity: threat.severity,
            threatId: threat.id
        });
    }

    /**
     * Get threat severity level
     */
    getThreatSeverity(threatType) {
        const severityMap = {
            'BRUTE_FORCE_DETECTED': 'high',
            'SUSPICIOUS_ACTIVITY': 'medium',
            'RATE_LIMIT_VIOLATION': 'low',
            'DATA_BREACH_ATTEMPT': 'critical',
            'UNAUTHORIZED_ACCESS': 'high',
            'MALICIOUS_REQUEST': 'medium'
        };
        
        return severityMap[threatType] || 'low';
    }

    /**
     * Handle high severity threats
     */
    handleHighSeverityThreat(threat) {
        // Implement automatic response measures
        switch (threat.type) {
            case 'BRUTE_FORCE_DETECTED':
                this.blockIPAddress(threat.data.ipAddress, 24 * 60 * 60 * 1000); // 24 hours
                break;
                
            case 'DATA_BREACH_ATTEMPT':
                this.lockdownUser(threat.data.identifier);
                break;
                
            case 'UNAUTHORIZED_ACCESS':
                this.revokeAllUserTokens(threat.data.identifier);
                break;
        }
    }

    /**
     * Block IP address
     */
    blockIPAddress(ipAddress, duration) {
        const blockKey = `blocked_ip:${ipAddress}`;
        this.threatIntelligence.set(blockKey, {
            blocked: true,
            blockedAt: Date.now(),
            expiresAt: Date.now() + duration,
            reason: 'Security threat detected'
        });
        
        this.auditLog('IP_ADDRESS_BLOCKED', {
            ipAddress,
            duration,
            reason: 'Security threat detected'
        });
    }

    /**
     * Check if IP address is blocked
     */
    isIPBlocked(ipAddress) {
        const blockKey = `blocked_ip:${ipAddress}`;
        const blockRecord = this.threatIntelligence.get(blockKey);
        
        if (!blockRecord || !blockRecord.blocked) {
            return false;
        }
        
        if (Date.now() > blockRecord.expiresAt) {
            this.threatIntelligence.delete(blockKey);
            return false;
        }
        
        return true;
    }

    /**
     * Perform periodic threat analysis
     */
    performThreatAnalysis() {
        // Clean up expired threat intelligence data
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        for (const [key, value] of this.threatIntelligence) {
            if (value.firstAttempt && (now - value.firstAttempt) > maxAge) {
                this.threatIntelligence.delete(key);
            }
            
            if (value.expiresAt && now > value.expiresAt) {
                this.threatIntelligence.delete(key);
            }
        }
        
        // Analyze patterns
        this.analyzeSecurityPatterns();
    }

    /**
     * Analyze security patterns
     */
    analyzeSecurityPatterns() {
        // Analyze recent security events
        const recentEvents = this.securityEvents.filter(event => {
            const eventTime = new Date(event.timestamp).getTime();
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            return eventTime > oneHourAgo;
        });
        
        // Look for patterns
        const eventTypes = recentEvents.reduce((acc, event) => {
            acc[event.type] = (acc[event.type] || 0) + 1;
            return acc;
        }, {});
        
        // Alert on unusual patterns
        for (const [type, count] of Object.entries(eventTypes)) {
            if (count > 5) { // Threshold for pattern detection
                this.auditLog('SECURITY_PATTERN_DETECTED', {
                    patternType: type,
                    occurrences: count,
                    timeframe: '1_hour'
                });
            }
        }
    }

    /**
     * Start security monitoring
     */
    startSecurityMonitoring() {
        // Monitor system health
        setInterval(() => {
            this.monitorSystemSecurity();
        }, 60000); // Every minute
        
        logger.info('Security monitoring started', {
            service: 'ai-multi-model-manager',
            version: '2.0.0',
            phase: 'phase-2'
        });
    }

    /**
     * Monitor system security
     */
    monitorSystemSecurity() {
        // Check for security anomalies
        const metrics = this.getSecurityMetrics();
        
        // Alert on high threat activity
        if (metrics.threatsLastHour > 10) {
            this.detectThreat('HIGH_THREAT_ACTIVITY', {
                threatsLastHour: metrics.threatsLastHour,
                timestamp: new Date().toISOString()
            });
        }
        
        // Monitor audit log growth
        if (this.auditLogs.length > 8000) {
            this.auditLog('HIGH_AUDIT_VOLUME', {
                auditLogCount: this.auditLogs.length,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Get security metrics
     */
    getSecurityMetrics() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        const threatsLastHour = this.securityEvents.filter(event => {
            return new Date(event.timestamp).getTime() > oneHourAgo;
        }).length;
        
        const auditEventsLastHour = this.auditLogs.filter(log => {
            return new Date(log.timestamp).getTime() > oneHourAgo;
        }).length;
        
        return {
            ...this.securityMetrics,
            threatsLastHour,
            auditEventsLastHour,
            activeTokens: this.activeTokens.size,
            blockedIPs: Array.from(this.threatIntelligence.keys()).filter(key => 
                key.startsWith('blocked_ip:')
            ).length,
            threatIntelligenceRecords: this.threatIntelligence.size
        };
    }

    /**
     * Get security status
     */
    getSecurityStatus() {
        const metrics = this.getSecurityMetrics();
        
        return {
            status: metrics.threatsLastHour > 20 ? 'high_alert' : 
                   metrics.threatsLastHour > 10 ? 'elevated' : 'normal',
            metrics,
            recentThreats: this.securityEvents.slice(-10),
            systemHealth: {
                encryptionSystem: 'operational',
                auditLogging: this.config.auditLogging.enabled ? 'operational' : 'disabled',
                threatDetection: this.config.threatDetection.enabled ? 'operational' : 'disabled',
                rateLimiting: 'operational'
            }
        };
    }

    /**
     * Shutdown security system
     */
    async shutdown() {
        // Clear sensitive data
        this.encryptionKeys.clear();
        this.activeTokens.clear();
        this.rateLimitStore.clear();
        
        this.auditLog('SYSTEM_SHUTDOWN', {
            timestamp: new Date().toISOString()
        });
        
        this.removeAllListeners();
        
        logger.info('Advanced Security System shutdown complete', {
            service: 'ai-multi-model-manager',
            version: '2.0.0',
            phase: 'phase-2'
        });
    }
}

module.exports = AdvancedSecuritySystem;