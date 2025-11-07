/**
 * Auto-Fix Common Issues Script
 * Automatically fixes common bugs and code quality issues
 */

const fs = require('fs').promises;
const path = require('path');

class AutoFixer {
  constructor() {
    this.fixCount = {
      total: 0,
      consoleRemoved: 0,
      debuggerRemoved: 0,
      varToConst: 0,
      emptyCatchFixed: 0
    };
  }

  async fixDirectory(dir, extensions = ['.js']) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip certain directories
          if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
            await this.fixDirectory(fullPath, extensions);
          }
        } else {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            await this.fixFile(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing directory ${dir}:`, error.message);
    }
  }

  async fixFile(filePath) {
    try {
      let content = await fs.readFile(filePath, 'utf8');
      let modified = false;
      
      // Store original for comparison
      const original = content;
      
      // Fix 1: Remove standalone console.log (keep error logging)
      const consoleLogRegex = /^\s*console\.log\([^)]*\);?\s*$/gm;
      if (consoleLogRegex.test(content)) {
        content = content.replace(consoleLogRegex, '');
        this.fixCount.consoleRemoved++;
        modified = true;
      }
      
      // Fix 2: Remove debugger statements
      const debuggerRegex = /^\s*debugger;?\s*$/gm;
      if (debuggerRegex.test(content)) {
        content = content.replace(debuggerRegex, '');
        this.fixCount.debuggerRemoved++;
        modified = true;
      }
      
      // Fix 3: Convert var to const/let
      // Simple heuristic: if assigned once, use const, otherwise let
      const varRegex = /\bvar\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g;
      let match;
      while ((match = varRegex.exec(content)) !== null) {
        const varName = match[1];
        // Count assignments
        const assignmentRegex = new RegExp(`\\b${varName}\\s*=`, 'g');
        const assignments = (content.match(assignmentRegex) || []).length;
        
        // Replace var with const or let
        const replacement = assignments === 1 ? 'const' : 'let';
        content = content.replace(
          new RegExp(`\\bvar\\s+${varName}\\s*=`, 'g'),
          `${replacement} ${varName} =`
        );
        this.fixCount.varToConst++;
        modified = true;
      }
      
      // Fix 4: Add error handling to empty catch blocks
      const emptyCatchRegex = /catch\s*\(([^)]*)\)\s*{\s*}/g;
      if (emptyCatchRegex.test(content)) {
        content = content.replace(
          emptyCatchRegex,
          'catch ($1) {\n    console.error(\'Error:\', $1);\n  }'
        );
        this.fixCount.emptyCatchFixed++;
        modified = true;
      }
      
      // Save if modified
      if (modified && content !== original) {
        await fs.writeFile(filePath, content, 'utf8');
        this.fixCount.total++;
        console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
      }
      
    } catch (error) {
      console.error(`Error fixing file ${filePath}:`, error.message);
    }
  }

  printReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 AUTO-FIX REPORT');
    console.log('='.repeat(60));
    console.log(`Total files fixed: ${this.fixCount.total}`);
    console.log(`Console.log removed: ${this.fixCount.consoleRemoved}`);
    console.log(`Debugger removed: ${this.fixCount.debuggerRemoved}`);
    console.log(`var → const/let: ${this.fixCount.varToConst}`);
    console.log(`Empty catch fixed: ${this.fixCount.emptyCatchFixed}`);
    console.log('='.repeat(60) + '\n');
  }
}

async function main() {
  const fixer = new AutoFixer();
  
  console.log('🔧 Starting auto-fix process...\n');
  
  // Fix backend directory
  await fixer.fixDirectory(path.join(__dirname, '..', 'backend'));
  
  // Print report
  fixer.printReport();
  
  console.log('✅ Auto-fix completed!');
}

if (require.main === module) {
  main().catch(error => {
    console.error('Error running auto-fixer:', error);
    process.exit(1);
  });
}

module.exports = AutoFixer;
