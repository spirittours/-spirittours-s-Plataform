/**
 * Bug Detection Script
 * Scans codebase for common bugs and anti-patterns
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

class BugDetector {
  constructor() {
    this.issues = [];
    this.stats = {
      filesScanned: 0,
      issuesFound: 0,
      critical: 0,
      warning: 0,
      info: 0
    };
  }

  async scanDirectory(dir, extensions = ['.js', '.ts', '.jsx', '.tsx']) {
    try {
      const files = await readdir(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const fileStat = await stat(filePath);
        
        if (fileStat.isDirectory()) {
          // Skip node_modules and other ignored directories
          if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(file)) {
            await this.scanDirectory(filePath, extensions);
          }
        } else {
          const ext = path.extname(file);
          if (extensions.includes(ext)) {
            await this.scanFile(filePath);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error.message);
    }
  }

  async scanFile(filePath) {
    try {
      const content = await readFile(filePath, 'utf8');
      this.stats.filesScanned++;
      
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        const lineNumber = index + 1;
        
        // Check for various anti-patterns and bugs
        this.checkConsoleStatements(line, filePath, lineNumber);
        this.checkDebuggers(line, filePath, lineNumber);
        this.checkTodoFixme(line, filePath, lineNumber);
        this.checkUnhandledPromises(line, filePath, lineNumber);
        this.checkSQLInjection(line, filePath, lineNumber);
        this.checkHardcodedCredentials(line, filePath, lineNumber);
        this.checkEmptyCatch(content, filePath);
        this.checkUnusedVariables(line, filePath, lineNumber);
        this.checkDeprecatedAPIs(line, filePath, lineNumber);
      });
      
    } catch (error) {
      console.error(`Error scanning file ${filePath}:`, error.message);
    }
  }

  checkConsoleStatements(line, file, lineNumber) {
    if (line.includes('console.log') || line.includes('console.error')) {
      // Skip if it's in a comment
      if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
        this.addIssue('info', 'Console Statement', file, lineNumber, 
          'Remove console.log/error statements in production code');
      }
    }
  }

  checkDebuggers(line, file, lineNumber) {
    if (line.includes('debugger')) {
      this.addIssue('critical', 'Debugger Statement', file, lineNumber,
        'Remove debugger statements before deployment');
    }
  }

  checkTodoFixme(line, file, lineNumber) {
    if (line.includes('TODO') || line.includes('FIXME')) {
      this.addIssue('warning', 'TODO/FIXME', file, lineNumber,
        'Address TODO/FIXME before production');
    }
  }

  checkUnhandledPromises(line, file, lineNumber) {
    // Check for promises without .catch() or try/catch
    if (line.includes('.then(') && !line.includes('.catch(')) {
      this.addIssue('warning', 'Unhandled Promise', file, lineNumber,
        'Add .catch() handler for promise');
    }
  }

  checkSQLInjection(line, file, lineNumber) {
    // Check for string concatenation in queries
    if ((line.includes('SELECT') || line.includes('INSERT') || line.includes('UPDATE')) &&
        (line.includes('+') || line.includes('${')) &&
        !line.trim().startsWith('//')) {
      this.addIssue('critical', 'Potential SQL Injection', file, lineNumber,
        'Use parameterized queries instead of string concatenation');
    }
  }

  checkHardcodedCredentials(line, file, lineNumber) {
    const patterns = [
      /password\s*=\s*['"][^'"]+['"]/i,
      /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
      /secret\s*=\s*['"][^'"]+['"]/i,
      /token\s*=\s*['"][^'"]+['"]/i
    ];

    patterns.forEach(pattern => {
      if (pattern.test(line) && !line.includes('process.env') && !line.trim().startsWith('//')) {
        this.addIssue('critical', 'Hardcoded Credential', file, lineNumber,
          'Move credentials to environment variables');
      }
    });
  }

  checkEmptyCatch(content, file) {
    const emptyCatchPattern = /catch\s*\([^)]*\)\s*{\s*}/g;
    const matches = content.match(emptyCatchPattern);
    
    if (matches) {
      this.addIssue('warning', 'Empty Catch Block', file, 0,
        `Found ${matches.length} empty catch block(s) - handle errors properly`);
    }
  }

  checkUnusedVariables(line, file, lineNumber) {
    // Simple check for var declarations (var is deprecated)
    if (line.includes('var ') && !line.trim().startsWith('//')) {
      this.addIssue('warning', 'var Declaration', file, lineNumber,
        'Use const or let instead of var');
    }
  }

  checkDeprecatedAPIs(line, file, lineNumber) {
    const deprecated = {
      'request': 'Use axios or fetch instead',
      'body-parser': 'Use express.json() instead',
      'moment': 'Consider using date-fns or dayjs',
    };

    Object.entries(deprecated).forEach(([api, suggestion]) => {
      if (line.includes(`require('${api}')`) || line.includes(`from '${api}'`)) {
        this.addIssue('info', 'Deprecated Package', file, lineNumber, suggestion);
      }
    });
  }

  addIssue(severity, type, file, lineNumber, message) {
    this.issues.push({
      severity,
      type,
      file: path.relative(process.cwd(), file),
      lineNumber,
      message
    });
    
    this.stats.issuesFound++;
    this.stats[severity]++;
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 BUG DETECTION REPORT');
    console.log('='.repeat(80));
    
    console.log('\n📊 Statistics:');
    console.log(`   Files Scanned: ${this.stats.filesScanned}`);
    console.log(`   Issues Found: ${this.stats.issuesFound}`);
    console.log(`   🔴 Critical: ${this.stats.critical}`);
    console.log(`   🟡 Warning: ${this.stats.warning}`);
    console.log(`   🔵 Info: ${this.stats.info}`);
    
    if (this.issues.length === 0) {
      console.log('\n✅ No issues found!');
      return;
    }
    
    // Group by severity
    const grouped = {
      critical: this.issues.filter(i => i.severity === 'critical'),
      warning: this.issues.filter(i => i.severity === 'warning'),
      info: this.issues.filter(i => i.severity === 'info')
    };
    
    // Print critical issues
    if (grouped.critical.length > 0) {
      console.log('\n🔴 CRITICAL ISSUES:');
      console.log('-'.repeat(80));
      grouped.critical.forEach(issue => {
        this.printIssue(issue);
      });
    }
    
    // Print warnings
    if (grouped.warning.length > 0) {
      console.log('\n🟡 WARNINGS:');
      console.log('-'.repeat(80));
      grouped.warning.slice(0, 20).forEach(issue => { // Limit to first 20
        this.printIssue(issue);
      });
      if (grouped.warning.length > 20) {
        console.log(`   ... and ${grouped.warning.length - 20} more warnings`);
      }
    }
    
    // Print info
    if (grouped.info.length > 0) {
      console.log('\n🔵 INFO:');
      console.log('-'.repeat(80));
      console.log(`   ${grouped.info.length} informational issues found`);
      console.log('   (Run with --verbose to see all info messages)');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n💡 Recommendations:');
    console.log('   1. Fix all CRITICAL issues immediately');
    console.log('   2. Address WARNINGS before production deployment');
    console.log('   3. Review INFO items for code quality improvements');
    console.log('   4. Run ESLint for more detailed analysis');
    console.log('   5. Set up pre-commit hooks to catch issues early');
    console.log('='.repeat(80) + '\n');
  }

  printIssue(issue) {
    const icon = {
      critical: '🔴',
      warning: '🟡',
      info: '🔵'
    }[issue.severity];
    
    console.log(`   ${icon} [${issue.type}] ${issue.file}:${issue.lineNumber}`);
    console.log(`      ${issue.message}`);
  }

  async saveReport(filename = 'bug-report.json') {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      issues: this.issues
    };
    
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to: ${filename}`);
  }
}

// Main execution
async function main() {
  const detector = new BugDetector();
  
  console.log('🔍 Starting bug detection...\n');
  
  // Scan backend directory
  await detector.scanDirectory(path.join(__dirname, '..', 'backend'));
  
  // Generate and display report
  detector.generateReport();
  
  // Save detailed report
  await detector.saveReport('bug-detection-report.json');
  
  // Exit with error code if critical issues found
  if (detector.stats.critical > 0) {
    console.log('❌ Critical issues found. Please fix before deployment.');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Error running bug detector:', error);
    process.exit(1);
  });
}

module.exports = BugDetector;
