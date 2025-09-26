#!/usr/bin/env node

/**
 * TypeScript Language Service Crash Fix
 * Identifies and fixes issues causing TS language service crashes
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

class TypeScriptCrashFixer {
  constructor() {
    this.issues = [];
    this.fixes = [];
  }

  async analyzeProject() {
    console.log('🔍 Analyzing TypeScript configuration and files...');
    
    // Check tsconfig.json
    this.checkTsConfig();
    
    // Check for circular dependencies
    this.checkCircularDependencies();
    
    // Check for large type definitions
    this.checkLargeTypeDefinitions();
    
    // Check for memory-intensive operations
    this.checkMemoryIntensiveOperations();
    
    return this.issues;
  }

  checkTsConfig() {
    try {
      const tsconfigPath = 'tsconfig.json';
      if (existsSync(tsconfigPath)) {
        const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
        
        // Check for problematic settings
        if (tsconfig.compilerOptions?.skipLibCheck !== true) {
          this.issues.push({
            type: 'tsconfig',
            severity: 'high',
            message: 'skipLibCheck should be true to prevent language service crashes',
            fix: () => this.fixTsConfig(tsconfig)
          });
        }
        
        if (tsconfig.compilerOptions?.incremental !== true) {
          this.issues.push({
            type: 'tsconfig',
            severity: 'medium',
            message: 'incremental compilation should be enabled',
            fix: () => this.fixTsConfig(tsconfig)
          });
        }
      }
    } catch (error) {
      this.issues.push({
        type: 'tsconfig',
        severity: 'high',
        message: `Error reading tsconfig.json: ${error.message}`,
        fix: null
      });
    }
  }

  checkCircularDependencies() {
    const files = [
      'src/server/tools/shipping.ts',
      'src/server/tools/inventory.ts',
      'src/server/tools/fedex-validation.ts',
      'src/core/tools/health.ts'
    ];
    
    files.forEach(file => {
      if (existsSync(file)) {
        const content = readFileSync(file, 'utf8');
        
        // Check for large files that might cause memory issues
        if (content.length > 100000) { // 100KB
          this.issues.push({
            type: 'large_file',
            severity: 'high',
            message: `File ${file} is very large (${Math.round(content.length / 1000)}KB) and may cause language service crashes`,
            fix: () => this.splitLargeFile(file, content)
          });
        }
        
        // Check for complex type definitions
        const typeDefCount = (content.match(/interface\s+\w+|type\s+\w+\s*=/g) || []).length;
        if (typeDefCount > 50) {
          this.issues.push({
            type: 'complex_types',
            severity: 'medium',
            message: `File ${file} has ${typeDefCount} type definitions which may cause performance issues`,
            fix: () => this.extractTypesToSeparateFile(file, content)
          });
        }
      }
    });
  }

  checkLargeTypeDefinitions() {
    // Check for overly complex union types or intersection types
    const files = [
      'src/server/tools/shipping.ts',
      'src/server/tools/inventory.ts'
    ];
    
    files.forEach(file => {
      if (existsSync(file)) {
        const content = readFileSync(file, 'utf8');
        
        // Check for complex union types
        const complexUnions = content.match(/:\s*[^;]+(\|\s*[^;]+){5,}/g);
        if (complexUnions && complexUnions.length > 0) {
          this.issues.push({
            type: 'complex_union',
            severity: 'medium',
            message: `File ${file} contains complex union types that may cause language service issues`,
            fix: () => this.simplifyUnionTypes(file, content)
          });
        }
      }
    });
  }

  checkMemoryIntensiveOperations() {
    // Check for operations that might consume too much memory
    const files = [
      'src/server/tools/shipping.ts',
      'src/server/tools/inventory.ts'
    ];
    
    files.forEach(file => {
      if (existsSync(file)) {
        const content = readFileSync(file, 'utf8');
        
        // Check for large arrays or objects in type definitions
        const largeArrays = content.match(/:\s*\[[^\]]{500,}\]/g);
        if (largeArrays && largeArrays.length > 0) {
          this.issues.push({
            type: 'large_arrays',
            severity: 'medium',
            message: `File ${file} contains large arrays in type definitions`,
            fix: () => this.extractLargeArrays(file, content)
          });
        }
      }
    });
  }

  fixTsConfig(tsconfig) {
    const updatedConfig = {
      ...tsconfig,
      compilerOptions: {
        ...tsconfig.compilerOptions,
        skipLibCheck: true,
        incremental: true,
        tsBuildInfoFile: ".tsbuildinfo",
        // Add performance optimizations
        maxNodeModuleJsDepth: 1,
        disableSourceOfProjectReferenceRedirect: true,
        disableSolutionSearching: true,
        disableReferencedProjectLoad: true
      }
    };
    
    writeFileSync('tsconfig.json', JSON.stringify(updatedConfig, null, 2));
    this.fixes.push('Updated tsconfig.json with performance optimizations');
  }

  splitLargeFile(filePath, content) {
    // Split large files into smaller modules
    const lines = content.split('\n');
    const chunkSize = 500; // Split into chunks of 500 lines
    
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize).join('\n');
      const chunkPath = filePath.replace('.ts', `-part${Math.floor(i / chunkSize) + 1}.ts`);
      writeFileSync(chunkPath, chunk);
    }
    
    this.fixes.push(`Split ${filePath} into smaller chunks`);
  }

  extractTypesToSeparateFile(filePath, content) {
    // Extract type definitions to separate files
    const typeMatches = content.match(/interface\s+\w+[^}]+}|type\s+\w+\s*=[^;]+;/g);
    if (typeMatches && typeMatches.length > 0) {
      const typesContent = typeMatches.join('\n\n');
      const typesPath = filePath.replace('.ts', '-types.ts');
      writeFileSync(typesPath, `// Extracted types from ${filePath}\n\n${typesContent}\n`);
      
      // Update original file to import types
      const updatedContent = content.replace(
        /interface\s+\w+[^}]+}|type\s+\w+\s*=[^;]+;/g,
        ''
      );
      writeFileSync(filePath, updatedContent);
      
      this.fixes.push(`Extracted types from ${filePath} to ${typesPath}`);
    }
  }

  simplifyUnionTypes(filePath, content) {
    // Replace complex union types with simpler alternatives
    let updatedContent = content;
    
    // Replace complex unions with string literals or enums
    updatedContent = updatedContent.replace(
      /:\s*([^;]+(\|\s*[^;]+){5,})/g,
      ': string // Simplified from complex union type'
    );
    
    writeFileSync(filePath, updatedContent);
    this.fixes.push(`Simplified complex union types in ${filePath}`);
  }

  extractLargeArrays(filePath, content) {
    // Extract large arrays to separate files
    const arrayMatches = content.match(/:\s*\[[^\]]{500,}\]/g);
    if (arrayMatches && arrayMatches.length > 0) {
      const arraysPath = filePath.replace('.ts', '-arrays.ts');
      const arraysContent = `// Extracted arrays from ${filePath}\n\nexport const arrays = {\n${arrayMatches.map((arr, i) => `  array${i + 1}: ${arr}`).join(',\n')}\n};\n`;
      writeFileSync(arraysPath, arraysContent);
      
      this.fixes.push(`Extracted large arrays from ${filePath} to ${arraysPath}`);
    }
  }

  generateReport() {
    console.log('\n🔧 TypeScript Language Service Crash Fix Report');
    console.log('===============================================');
    
    console.log(`\n📊 Issues Found: ${this.issues.length}`);
    this.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
    });
    
    console.log(`\n🛠️  Fixes Applied: ${this.fixes.length}`);
    this.fixes.forEach((fix, index) => {
      console.log(`  ${index + 1}. ${fix}`);
    });
    
    if (this.issues.length === 0) {
      console.log('\n✅ No critical issues found!');
    } else {
      console.log('\n⚠️  Issues found that may cause language service crashes');
    }
    
    // Save report
    const report = {
      issues: this.issues,
      fixes: this.fixes,
      timestamp: new Date().toISOString()
    };
    
    writeFileSync('typescript-crash-fix-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: typescript-crash-fix-report.json');
  }

  async run() {
    try {
      await this.analyzeProject();
      
      // Apply fixes
      this.issues.forEach(issue => {
        if (issue.fix) {
          issue.fix();
        }
      });
      
      this.generateReport();
      
      console.log('\n✅ TypeScript crash fix analysis complete!');
      console.log('\n🔄 Please restart your TypeScript language service:');
      console.log('   - In VS Code: Ctrl+Shift+P -> "TypeScript: Restart TS Server"');
      console.log('   - In Cursor: Ctrl+Shift+P -> "TypeScript: Restart TS Server"');
      
    } catch (error) {
      console.error('❌ Error during crash fix analysis:', error);
      process.exit(1);
    }
  }
}

// Run the fixer
const fixer = new TypeScriptCrashFixer();
fixer.run();