#!/usr/bin/env node
/**
 * ABDQuiz ARCHITECTURAL GUARD - INDUSTRIAL STABILITY EDITION
 */

import fs from 'node:fs';
import path from 'node:path';

const WARN_LINES = 150;
const MAX_LINES = 500;
const roots = ['src'];
const logFile = "abd-audit-results.log";
const phase = process.argv[2] || 'all';

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        if (!['node_modules', '.git', '.next', 'dist'].includes(file)) {
          getAllFiles(fullPath, fileList);
        }
      } else if (['.ts', '.tsx'].includes(path.extname(file))) {
        fileList.push(fullPath);
      }
    });
  } catch (e) {}
  return fileList;
}

let violationCount = 0;
let warningCount = 0;
let highViolations = 0;

function addFinding(severity, pattern, file, line, message, allLines) {
  if (severity === 'HIGH') {
    violationCount++;
    highViolations++;
  } else {
    warningCount++;
  }
  const context = linesContext(allLines, line);
  const report = `\n[${severity}:${pattern}] ${file}:${line}\nMessage: ${message}\n${context}\n`;
  fs.appendFileSync(logFile, report, 'utf8');
}

function linesContext(lines, lineNum) {
  const start = Math.max(0, lineNum - 2);
  const end = Math.min(lines.length, lineNum + 1);
  return lines.slice(start, end).map((l, i) => {
    const currentLine = start + i + 1;
    const prefix = currentLine === lineNum ? '> ' : '  ';
    return `${prefix}${currentLine.toString().padStart(3)} | ${l.trim()}`;
  }).join('\n');
}

try {
  const allFiles = roots.flatMap(root => getAllFiles(path.resolve(root)));
  const totalFiles = allFiles.length;

  allFiles.forEach((filePath, index) => {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const relPath = path.relative(process.cwd(), filePath);
    const ext = path.extname(filePath);

    // Structural
    if (phase === 'all' || phase === 'structural') {
      if (lines.length > MAX_LINES) {
        addFinding('HIGH', 'FIRE:MAX_LINES', relPath, 1, `CRITICAL: File too long (${lines.length} lines).`, lines);
      } else if (lines.length > WARN_LINES) {
        addFinding('MEDIUM', 'FIRE:LARGE_FILE', relPath, 1, `WARNING: File is long (${lines.length} lines).`, lines);
      }
      lines.forEach((line, idx) => {
        if (line.includes('style={{') && !line.includes('display: none')) {
          addFinding('HIGH', 'FIRE:INLINE_STYLE', relPath, idx + 1, 'Inline style detected.', lines);
        }
      });
    }

    // i18n
    if ((phase === 'all' || phase === 'i18n') && ext === '.tsx') {
      lines.forEach((line, idx) => {
        const match = line.match(/>([^<{}>]{3,})</);
        if (match) {
            const text = match[1].trim();
            if (text.length > 2 && /[a-zA-Z]/.test(text) && !line.includes('{t(') && !line.includes('console.')) {
                addFinding('HIGH', 'FIRE:I18N', relPath, idx + 1, `Hardcoded: "${text}"`, lines);
            }
        }
      });
    }

    // a11y
    if ((phase === 'all' || phase === 'a11y') && ext === '.tsx') {
      lines.forEach((line, idx) => {
        if (line.includes('<button')) {
          let hasLabel = line.toLowerCase().includes('aria-label');
          for(let k=1; k<20 && (idx+k)<lines.length; k++) {
            const l = lines[idx+k].toLowerCase();
            if (l.includes('aria-label') || l.includes('{t(') || l.includes('{common(') || l.includes('{h(')) hasLabel = true;
            if (lines[idx+k].includes('>')) {
                if (/>[^< \n\t]+</.test(lines[idx+k])) hasLabel = true;
                break;
            }
          }
          if (!hasLabel) addFinding('HIGH', 'FIRE:A11Y', relPath, idx + 1, 'Button missing label', lines);
        }
      });
    }

    // Purity
    if (phase === 'all' || phase === 'purity') {
      lines.forEach((line, idx) => {
        if (line.includes(': any') || line.includes('as any')) {
          if (!relPath.includes('scripts/') && !line.includes('//')) {
            addFinding('HIGH', 'FIRE:PURITY', relPath, idx + 1, 'Avoid any', lines);
          }
        }
      });
    }

    // PROGRESS:FILE_INDEX:TOTAL_FILES:ERRORS:WARNINGS
    process.stdout.write(`PROGRESS:${index + 1}:${totalFiles}:${violationCount}:${warningCount}\n`);
  });

  if (highViolations > 0) process.exit(1);
  process.exit(0);

} catch (err) {
  fs.appendFileSync(logFile, `FATAL: ${err.message}\n`);
  process.exit(1);
}
