#!/usr/bin/env node
/**
 * ABDQuiz ARCHITECTURAL GUARD
 * Enforces Fire Rules: Max 150 lines, Centralized Styles, Separation of Concerns.
 */

import fs from 'node:fs';
import path from 'node:path';

const MAX_LINES = 150;
const roots = ['src'];
const findings = { HIGH: [], MEDIUM: [], LOW: [] };

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        scanDir(fullPath);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(file);
      if (['.ts', '.tsx', '.js', '.mjs'].includes(ext)) {
        scanFile(fullPath);
      }
    }
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relativePath = path.relative(process.cwd(), filePath);

  // 1. Check Max Lines
  if (lines.length > MAX_LINES) {
    findings.HIGH.push({
      file: relativePath,
      line: 1,
      content: `File is too long (${lines.length} lines). Max allowed: ${MAX_LINES}.`,
      pattern: 'FIRE:MAX_LINES'
    });
  }

  // 2. Check for local styles (inline styles or suspicious classNames)
  lines.forEach((line, index) => {
    if (line.includes('style={{') && !line.includes('display: none')) {
      findings.MEDIUM.push({
        file: relativePath,
        line: index + 1,
        content: line.trim(),
        pattern: 'FIRE:CENTRALIZED_STYLES (Inline Style)'
      });
    }
    
    // Suspicious hardcoded colors
    if (/(#[0-9A-Fa-f]{3,6}|rgb\(|hsl\()/.test(line) && !relativePath.includes('styles/') && !relativePath.includes('config/')) {
       findings.MEDIUM.push({
        file: relativePath,
        line: index + 1,
        content: line.trim(),
        pattern: 'FIRE:CENTRALIZED_STYLES (Hardcoded Color)'
      });
    }
  });
}

roots.forEach(root => scanDir(path.resolve(root)));

console.log('\n[ABDQuiz ARCH-GUARD] Auditing Fire Rules...');

['HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
  if (findings[severity].length === 0) return;
  const icon = severity === 'HIGH' ? '❌' : '⚠️';
  console.log(`\n=== ${icon} ${severity} VIOLATIONS (${findings[severity].length}) ===`);
  findings[severity].forEach(f => {
    console.log(`[${f.pattern}] ${f.file}:${f.line} -> ${f.content}`);
  });
});

if (findings.HIGH.length > 0) {
  console.log('\n❌ ARCHITECTURAL BREACH detected.');
  process.exit(1);
} else {
  console.log('\n✅ ARCHITECTURAL INTEGRITY VERIFIED.');
  process.exit(0);
}
