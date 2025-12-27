#!/usr/bin/env node
/**
 * Copy api/data to stem-project/backend/data
 * Ensures data files are available to the backend in all environments
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'api/data');
const destDir = path.join(__dirname, 'stem-project/backend/data');

console.log(`[CopyData] Copying from ${srcDir} to ${destDir}`);

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log(`[CopyData] Created directory: ${destDir}`);
}

// Copy all files
try {
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    const src = path.join(srcDir, file);
    const dest = path.join(destDir, file);
    
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dest);
      console.log(`[CopyData] ✓ Copied ${file}`);
    }
  }
  console.log(`[CopyData] Done! Copied ${files.length} files`);
} catch (error) {
  console.error(`[CopyData] Error:`, error.message);
  process.exit(1);
}
