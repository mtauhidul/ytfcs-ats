#!/usr/bin/env node
// scripts/workflow-health-check.js
// Production readiness checker for workflow system

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Workflow System Health Check
 * Validates that all critical workflow features are production-ready
 */

const REQUIRED_FILES = [
  'app/features/workflowSlice.ts',
  'app/services/workflowRealtimeService.ts',
  'app/lib/workflow-error-handler.ts',
  'app/dashboard/workflow/components/WorkflowErrorBoundary.tsx',
  'app/dashboard/workflow/hooks/useWorkflowData.ts',
  'app/dashboard/workflow/utils/workflowUtils.ts',
  'app/types/workflow.ts',
  'app/types/stage.ts',
];

const CRITICAL_PATTERNS = [
  // Error handling patterns
  { pattern: /WorkflowErrorHandler/g, files: ['app/features/workflowSlice.ts'], description: 'Error handling in Redux' },
  { pattern: /withWorkflowErrorHandling/g, files: ['app/features/workflowSlice.ts'], description: 'Async error wrapping' },
  { pattern: /WorkflowErrorBoundary/g, files: ['app/dashboard/workflow/new-workflow-management.tsx'], description: 'Error boundary usage' },
  
  // Type safety patterns
  { pattern: /order: number/g, files: ['app/types/stage.ts'], description: 'Required order property' },
  { pattern: /rejectWithValue/g, files: ['app/features/workflowSlice.ts'], description: 'Proper error handling in thunks' },
  
  // Real-time patterns
  { pattern: /cleanup\(\)/g, files: ['app/services/workflowRealtimeService.ts'], description: 'Memory leak prevention' },
  { pattern: /unsubscribe/g, files: ['app/services/workflowRealtimeService.ts'], description: 'Subscription management' },
];

async function runHealthCheck() {
  console.log('🏥 Running Workflow System Health Check...\n');
  
  let score = 0;
  let maxScore = 0;
  const issues = [];
  const warnings = [];
  
  // Check required files exist
  console.log('📁 Checking Required Files...');
  const workspaceRoot = path.resolve(__dirname, '..');
  for (const filePath of REQUIRED_FILES) {
    maxScore++;
    const fullPath = path.join(workspaceRoot, filePath);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${filePath}`);
      score++;
    } else {
      console.log(`❌ ${filePath} - MISSING`);
      issues.push(`Missing required file: ${filePath}`);
    }
  }
  
  // Check critical patterns
  console.log('\n🔍 Checking Critical Implementation Patterns...');
  for (const check of CRITICAL_PATTERNS) {
    maxScore++;
    let found = false;
    
    for (const filePath of check.files) {
      const fullPath = path.join(workspaceRoot, filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (check.pattern.test(content)) {
          found = true;
          break;
        }
      }
    }
    
    if (found) {
      console.log(`✅ ${check.description}`);
      score++;
    } else {
      console.log(`❌ ${check.description} - NOT IMPLEMENTED`);
      issues.push(`Missing implementation: ${check.description}`);
    }
  }
  
  // Check for anti-patterns
  console.log('\n🚫 Checking for Anti-patterns...');
  const antiPatterns = [
    { pattern: /console\.log/g, severity: 'warning', description: 'Development console.log statements' },
    { pattern: /TODO|FIXME|HACK/gi, severity: 'warning', description: 'Development comments' },
    { pattern: /\.catch\(\s*\)\s*;/g, severity: 'error', description: 'Empty catch blocks' },
    { pattern: /any(?!\[\])/g, severity: 'warning', description: 'TypeScript any types' },
  ];
  
  for (const file of REQUIRED_FILES) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      for (const antiPattern of antiPatterns) {
        const matches = content.match(antiPattern.pattern);
        if (matches) {
          const message = `${file}: Found ${matches.length} instances of ${antiPattern.description}`;
          if (antiPattern.severity === 'error') {
            issues.push(message);
          } else {
            warnings.push(message);
          }
        }
      }
    }
  }
  
  // Check package.json for required dependencies
  console.log('\n📦 Checking Dependencies...');
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const requiredDeps = ['firebase', '@reduxjs/toolkit', 'react-redux', 'sonner'];
    
    for (const dep of requiredDeps) {
      maxScore++;
      if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
        console.log(`✅ ${dep}`);
        score++;
      } else {
        console.log(`❌ ${dep} - MISSING`);
        issues.push(`Missing dependency: ${dep}`);
      }
    }
  }
  
  // Check TypeScript configuration
  console.log('\n⚙️  Checking TypeScript Configuration...');
  const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    maxScore++;
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    const requiredSettings = {
      strict: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
    };
    
    let tsconfigValid = true;
    for (const [setting, expectedValue] of Object.entries(requiredSettings)) {
      if (tsconfig.compilerOptions?.[setting] !== expectedValue) {
        tsconfigValid = false;
        warnings.push(`TypeScript setting ${setting} should be ${expectedValue}`);
      }
    }
    
    if (tsconfigValid) {
      console.log(`✅ TypeScript configuration`);
      score++;
    } else {
      console.log(`⚠️  TypeScript configuration needs improvement`);
    }
  }
  
  // Generate report
  console.log('\n📊 Health Check Results');
  console.log('========================');
  
  const percentage = Math.round((score / maxScore) * 100);
  console.log(`Score: ${score}/${maxScore} (${percentage}%)\n`);
  
  if (issues.length > 0) {
    console.log('🚨 Critical Issues:');
    issues.forEach(issue => console.log(`  ❌ ${issue}`));
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
    console.log('');
  }
  
  // Production readiness assessment
  let readinessLevel;
  if (percentage >= 90 && issues.length === 0) {
    readinessLevel = '🟢 PRODUCTION READY';
  } else if (percentage >= 75 && issues.length <= 2) {
    readinessLevel = '🟡 NEARLY READY - Minor fixes needed';
  } else if (percentage >= 50) {
    readinessLevel = '🟠 DEVELOPMENT READY - Major fixes needed';
  } else {
    readinessLevel = '🔴 NOT READY - Critical issues must be fixed';
  }
  
  console.log(`Production Readiness: ${readinessLevel}\n`);
  
  // Recommendations
  if (percentage < 90 || issues.length > 0) {
    console.log('💡 Recommendations:');
    
    if (issues.length > 0) {
      console.log('  1. Fix all critical issues listed above');
    }
    
    if (warnings.length > 0) {
      console.log('  2. Address warnings for better code quality');
    }
    
    if (percentage < 80) {
      console.log('  3. Complete missing implementations');
      console.log('  4. Add comprehensive error handling');
      console.log('  5. Implement proper TypeScript types');
    }
    
    console.log('  6. Run tests before deploying to production');
    console.log('  7. Set up monitoring and error tracking');
    console.log('  8. Create deployment checklist');
  }
  
  return {
    score,
    maxScore,
    percentage,
    issues,
    warnings,
    isProductionReady: percentage >= 90 && issues.length === 0
  };
}

// CLI usage
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  runHealthCheck()
    .then(result => {
      process.exit(result.isProductionReady ? 0 : 1);
    })
    .catch(error => {
      console.error('Health check failed:', error);
      process.exit(1);
    });
}

export { runHealthCheck };
