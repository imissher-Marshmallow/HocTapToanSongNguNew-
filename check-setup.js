#!/usr/bin/env node
/**
 * Startup Verification Script
 * Checks all services are configured and ready to run
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function check(condition, passMsg, failMsg) {
  if (condition) {
    log(`✓ ${passMsg}`, 'green');
    return true;
  } else {
    log(`✗ ${failMsg}`, 'red');
    return false;
  }
}

function checkFile(filePath, description) {
  return check(
    fs.existsSync(filePath),
    `Found: ${description}`,
    `Missing: ${description} at ${filePath}`
  );
}

function checkDir(dirPath, description) {
  return check(
    fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory(),
    `Found: ${description} directory`,
    `Missing: ${description} directory at ${dirPath}`
  );
}

log('\n🔍 Deep Learning With Love - Setup Verification\n', 'cyan');

let allGood = true;

// Check root structure
log('📂 Project Structure', 'blue');
allGood &= checkDir('stem-project', 'Frontend (React)');
allGood &= checkDir('stem-project/backend', 'Backend (Node.js)');
allGood &= checkDir('ai_engine', 'AI Engine (Python)');

// Check configuration files
log('\n⚙️  Configuration Files', 'blue');
allGood &= checkFile('package.json', 'Root package.json');
allGood &= checkFile('stem-project/package.json', 'Frontend package.json');
allGood &= checkFile('stem-project/backend/package.json', 'Backend package.json');
allGood &= checkFile('ai_engine/requirements.txt', 'AI Engine requirements.txt');

// Check environment examples
log('\n🔐 Environment Variables', 'blue');
allGood &= checkFile('.env.example', '.env.example template');
const aiEnvExists = checkFile('ai_engine/.env', 'AI Engine .env (set DATABASE_URL!)');

// Check npm packages installed
log('\n📦 Installed Dependencies', 'blue');
allGood &= checkDir('node_modules', 'Root node_modules');
allGood &= checkDir('stem-project/node_modules', 'Frontend node_modules');
allGood &= checkDir('stem-project/backend/node_modules', 'Backend node_modules');

// Check Python venv
log('\n🐍 Python Environment', 'blue');
const venvExists = checkDir('ai_engine/venv', 'AI Engine venv');
if (!venvExists) {
  log('  → Run: npm run ai:setup', 'yellow');
}

// Check scripts
log('\n📋 Available Scripts', 'blue');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const scripts = Object.keys(packageJson.scripts || {});
const requiredScripts = [
  'dev',
  'dev:frontend',
  'dev:backend',
  'dev:ai',
  'start',
  'build',
];

for (const script of requiredScripts) {
  check(
    scripts.includes(script),
    `Script available: npm run ${script}`,
    `Missing script: npm run ${script}`
  );
}

// Summary
log('\n' + '='.repeat(50), 'cyan');
if (allGood) {
  log('✓ All checks passed! Ready to start.', 'green');
  log('\nNext steps:', 'cyan');
  log('  1. npm run dev              # Start all services', 'yellow');
  log('  2. Open http://localhost:3000  # Frontend', 'yellow');
  log('  3. Open http://localhost:8000/docs  # API docs', 'yellow');
  log('='.repeat(50) + '\n', 'cyan');
  process.exit(0);
} else {
  log('⚠️  Some checks failed. Review messages above.', 'red');
  log('\nCommon fixes:', 'cyan');
  log('  npm install                # Install root dependencies', 'yellow');
  log('  npm run ai:setup          # Setup Python environment', 'yellow');
  log('  npm run build:frontend    # Build React app', 'yellow');
  log('='.repeat(50) + '\n', 'cyan');
  process.exit(1);
}
