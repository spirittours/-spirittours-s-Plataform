const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * SecurityAuditor - Comprehensive security scanning and auditing
 * 
 * Features:
 * - Vulnerability scanning
 * - Dependency audit
 * - Configuration security check
 * - API security assessment
 * - Secret detection
 * - Security best practices validation
 * - Compliance checking
 * - Security report generation
 */
class SecurityAuditor {
  constructor() {
    this.config = {
      enableAutoScanning: process.env.ENABLE_SECURITY_SCANNING === 'true',
      scanInterval: 86400000, // 24 hours
      secretPatterns: [
        /(?:password|passwd|pwd)\s*[:=]\s*['"]?([^'";\s]+)/gi,
        /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?([^'";\s]+)/gi,
        /(?:secret|token)\s*[:=]\s*['"]?([^'";\s]+)/gi,
        /(?:aws[_-]?access[_-]?key)\s*[:=]\s*['"]?([A-Z0-9]{20})/gi,
        /(?:private[_-]?key)\s*[:=]\s*['"]?([^'";\s]+)/gi
      ],
      criticalFiles: [
        '.env',
        'config/database.js',
        'config/secrets.js',
        'package.json',
        'package-lock.json'
      ]
    };

    this.vulnerabilities = [];
    this.findings = [];
    this.auditHistory = [];

    this.stats = {
      totalScans: 0,
      vulnerabilitiesFound: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      secretsDetected: 0
    };

    // Security best practices checklist
    this.securityChecks = [
      {
        id: 'env-variables',
        name: 'Environment Variables',
        check: this.checkEnvironmentVariables.bind(this)
      },
      {
        id: 'https-enforcement',
        name: 'HTTPS Enforcement',
        check: this.checkHTTPSEnforcement.bind(this)
      },
      {
        id: 'cors-config',
        name: 'CORS Configuration',
        check: this.checkCORSConfiguration.bind(this)
      },
      {
        id: 'rate-limiting',
        name: 'Rate Limiting',
        check: this.checkRateLimiting.bind(this)
      },
      {
        id: 'input-validation',
        name: 'Input Validation',
        check: this.checkInputValidation.bind(this)
      },
      {
        id: 'authentication',
        name: 'Authentication Security',
        check: this.checkAuthentication.bind(this)
      },
      {
        id: 'secrets-management',
        name: 'Secrets Management',
        check: this.checkSecretsManagement.bind(this)
      },
      {
        id: 'dependency-vulnerabilities',
        name: 'Dependency Vulnerabilities',
        check: this.checkDependencies.bind(this)
      }
    ];
  }

  /**
   * Run comprehensive security audit
   */
  async runAudit(options = {}) {
    this.stats.totalScans++;
    const startTime = Date.now();

    console.log('Starting security audit...');

    const auditResults = {
      timestamp: new Date(),
      duration: 0,
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
      },
      checks: [],
      vulnerabilities: [],
      recommendations: []
    };

    // Run all security checks
    for (const check of this.securityChecks) {
      try {
        const result = await check.check();
        auditResults.checks.push({
          id: check.id,
          name: check.name,
          ...result
        });

        // Count findings by severity
        if (result.findings) {
          result.findings.forEach(finding => {
            auditResults.summary.total++;
            auditResults.summary[finding.severity]++;
            
            if (finding.severity === 'critical') {
              this.stats.criticalIssues++;
            } else if (finding.severity === 'high') {
              this.stats.highIssues++;
            } else if (finding.severity === 'medium') {
              this.stats.mediumIssues++;
            } else if (finding.severity === 'low') {
              this.stats.lowIssues++;
            }
          });
        }
      } catch (error) {
        console.error(`Security check failed: ${check.name}`, error);
        auditResults.checks.push({
          id: check.id,
          name: check.name,
          status: 'error',
          error: error.message
        });
      }
    }

    // Scan for secrets in code
    if (options.scanSecrets !== false) {
      const secretFindings = await this.scanForSecrets();
      if (secretFindings.length > 0) {
        auditResults.checks.push({
          id: 'secret-detection',
          name: 'Secret Detection',
          status: 'warning',
          findings: secretFindings
        });
      }
    }

    // Generate recommendations
    auditResults.recommendations = this.generateRecommendations(auditResults);

    auditResults.duration = Date.now() - startTime;

    // Store in history
    this.auditHistory.push({
      timestamp: auditResults.timestamp,
      summary: auditResults.summary,
      duration: auditResults.duration
    });

    // Keep last 100 audits
    if (this.auditHistory.length > 100) {
      this.auditHistory.shift();
    }

    console.log(`Security audit completed in ${auditResults.duration}ms`);
    console.log(`Found ${auditResults.summary.total} issues: ${auditResults.summary.critical} critical, ${auditResults.summary.high} high, ${auditResults.summary.medium} medium, ${auditResults.summary.low} low`);

    return auditResults;
  }

  /**
   * Check environment variables security
   */
  async checkEnvironmentVariables() {
    const findings = [];

    // Check if .env file exists and is properly secured
    try {
      const envPath = path.join(process.cwd(), '.env');
      const stats = await fs.stat(envPath);

      // Check file permissions (should not be world-readable)
      const mode = stats.mode.toString(8);
      if (mode.endsWith('4') || mode.endsWith('6')) {
        findings.push({
          severity: 'high',
          message: '.env file is world-readable',
          recommendation: 'Set file permissions to 600 (owner read/write only)'
        });
      }
    } catch (error) {
      // .env file might not exist, which is okay if using other config methods
    }

    // Check for sensitive env variables
    const requiredEnvVars = [
      'NODE_ENV',
      'JWT_SECRET',
      'DATABASE_URL',
      'REDIS_URL'
    ];

    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
      findings.push({
        severity: 'medium',
        message: `Missing environment variables: ${missingVars.join(', ')}`,
        recommendation: 'Set all required environment variables'
      });
    }

    // Check NODE_ENV
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      findings.push({
        severity: 'info',
        message: 'Application not running in production mode',
        recommendation: 'Set NODE_ENV=production for production deployment'
      });
    }

    return {
      status: findings.length === 0 ? 'pass' : 'warning',
      findings
    };
  }

  /**
   * Check HTTPS enforcement
   */
  async checkHTTPSEnforcement() {
    const findings = [];

    if (!process.env.FORCE_HTTPS && process.env.NODE_ENV === 'production') {
      findings.push({
        severity: 'high',
        message: 'HTTPS not enforced in production',
        recommendation: 'Enable HTTPS enforcement with FORCE_HTTPS=true'
      });
    }

    return {
      status: findings.length === 0 ? 'pass' : 'warning',
      findings
    };
  }

  /**
   * Check CORS configuration
   */
  async checkCORSConfiguration() {
    const findings = [];

    const corsOrigins = process.env.CORS_ORIGINS;
    
    if (!corsOrigins) {
      findings.push({
        severity: 'medium',
        message: 'CORS origins not configured',
        recommendation: 'Set CORS_ORIGINS environment variable'
      });
    } else if (corsOrigins === '*') {
      findings.push({
        severity: 'high',
        message: 'CORS allows all origins (*)  ',
        recommendation: 'Restrict CORS to specific trusted domains'
      });
    }

    return {
      status: findings.length === 0 ? 'pass' : 'warning',
      findings
    };
  }

  /**
   * Check rate limiting configuration
   */
  async checkRateLimiting() {
    const findings = [];

    // Check if rate limiting is enabled
    if (!process.env.ENABLE_RATE_LIMITING && process.env.NODE_ENV === 'production') {
      findings.push({
        severity: 'high',
        message: 'Rate limiting not enabled',
        recommendation: 'Enable rate limiting with ENABLE_RATE_LIMITING=true'
      });
    }

    return {
      status: findings.length === 0 ? 'pass' : 'warning',
      findings
    };
  }

  /**
   * Check input validation
   */
  async checkInputValidation() {
    const findings = [];

    // This would require code analysis - simplified check
    findings.push({
      severity: 'info',
      message: 'Manual code review recommended for input validation',
      recommendation: 'Ensure all user inputs are validated and sanitized'
    });

    return {
      status: 'info',
      findings
    };
  }

  /**
   * Check authentication security
   */
  async checkAuthentication() {
    const findings = [];

    // Check JWT secret strength
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      findings.push({
        severity: 'high',
        message: 'JWT secret is too short',
        recommendation: 'Use a JWT secret with at least 32 characters'
      });
    }

    // Check password requirements
    if (!process.env.MIN_PASSWORD_LENGTH) {
      findings.push({
        severity: 'medium',
        message: 'Minimum password length not configured',
        recommendation: 'Set MIN_PASSWORD_LENGTH environment variable (recommended: 8+)'
      });
    }

    return {
      status: findings.length === 0 ? 'pass' : 'warning',
      findings
    };
  }

  /**
   * Check secrets management
   */
  async checkSecretsManagement() {
    const findings = [];

    // Check if secrets are properly managed
    const hasVault = !!process.env.VAULT_URL;
    const hasKMS = !!process.env.AWS_KMS_KEY_ID;

    if (!hasVault && !hasKMS && process.env.NODE_ENV === 'production') {
      findings.push({
        severity: 'medium',
        message: 'No secrets management system detected',
        recommendation: 'Consider using AWS Secrets Manager, HashiCorp Vault, or similar'
      });
    }

    return {
      status: findings.length === 0 ? 'pass' : 'info',
      findings
    };
  }

  /**
   * Check dependency vulnerabilities
   */
  async checkDependencies() {
    const findings = [];

    try {
      // Check if package-lock.json exists
      const lockPath = path.join(process.cwd(), 'package-lock.json');
      await fs.access(lockPath);

      findings.push({
        severity: 'info',
        message: 'Run "npm audit" to check for known vulnerabilities',
        recommendation: 'Regularly update dependencies and run npm audit'
      });
    } catch (error) {
      findings.push({
        severity: 'medium',
        message: 'package-lock.json not found',
        recommendation: 'Use package-lock.json for consistent dependency versions'
      });
    }

    return {
      status: 'info',
      findings
    };
  }

  /**
   * Scan for secrets in code
   */
  async scanForSecrets(directory = process.cwd()) {
    const findings = [];

    try {
      const files = await this.getFiles(directory, [
        '.js', '.ts', '.json', '.env', '.yaml', '.yml'
      ]);

      for (const file of files) {
        // Skip node_modules and other excluded directories
        if (file.includes('node_modules') || file.includes('.git')) {
          continue;
        }

        try {
          const content = await fs.readFile(file, 'utf8');
          
          for (const pattern of this.config.secretPatterns) {
            const matches = content.match(pattern);
            if (matches) {
              findings.push({
                severity: 'critical',
                file: path.relative(process.cwd(), file),
                message: 'Potential secret detected in code',
                recommendation: 'Remove hardcoded secrets and use environment variables'
              });
              
              this.stats.secretsDetected++;
              break; // One finding per file is enough
            }
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    } catch (error) {
      console.error('Secret scanning error:', error);
    }

    return findings;
  }

  /**
   * Get all files with specific extensions
   */
  async getFiles(dir, extensions, files = []) {
    try {
      const items = await fs.readdir(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        
        try {
          const stat = await fs.stat(fullPath);
          
          if (stat.isDirectory()) {
            // Skip certain directories
            if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
              await this.getFiles(fullPath, extensions, files);
            }
          } else if (stat.isFile()) {
            const ext = path.extname(fullPath);
            if (extensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        } catch (error) {
          // Skip items that can't be accessed
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }

    return files;
  }

  /**
   * Generate recommendations based on findings
   */
  generateRecommendations(auditResults) {
    const recommendations = [];

    // High-priority recommendations
    if (auditResults.summary.critical > 0) {
      recommendations.push({
        priority: 'critical',
        message: `Address ${auditResults.summary.critical} critical security issues immediately`,
        action: 'Review and fix all critical findings'
      });
    }

    if (auditResults.summary.high > 5) {
      recommendations.push({
        priority: 'high',
        message: `${auditResults.summary.high} high-severity issues need attention`,
        action: 'Create a remediation plan for high-severity issues'
      });
    }

    // General recommendations
    recommendations.push({
      priority: 'medium',
      message: 'Regular security audits recommended',
      action: 'Schedule monthly security audits'
    });

    recommendations.push({
      priority: 'low',
      message: 'Keep dependencies updated',
      action: 'Run "npm update" and "npm audit fix" regularly'
    });

    return recommendations;
  }

  /**
   * Get security statistics
   */
  getStats() {
    return {
      ...this.stats,
      auditHistorySize: this.auditHistory.length,
      lastAudit: this.auditHistory.length > 0 
        ? this.auditHistory[this.auditHistory.length - 1].timestamp 
        : null
    };
  }

  /**
   * Get audit history
   */
  getAuditHistory(limit = 10) {
    return this.auditHistory.slice(-limit);
  }

  /**
   * Export audit report
   */
  exportReport(auditResults) {
    return {
      reportId: crypto.randomUUID(),
      generatedAt: new Date(),
      summary: auditResults.summary,
      findings: auditResults.checks,
      recommendations: auditResults.recommendations,
      statistics: this.getStats()
    };
  }

  /**
   * Get security score
   */
  calculateSecurityScore(auditResults) {
    let score = 100;

    // Deduct points based on severity
    score -= auditResults.summary.critical * 20;
    score -= auditResults.summary.high * 10;
    score -= auditResults.summary.medium * 5;
    score -= auditResults.summary.low * 2;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get security grade
   */
  getSecurityGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}

module.exports = new SecurityAuditor();
