const fs = require('fs');
const path = require('path');

const replacements = [
  { regex: /text-\[#0D1B1E\]/g, replacement: 'text-content-primary' },
  { regex: /text-\[#4A6670\]/g, replacement: 'text-content-secondary' },
  { regex: /text-\[#8BA3AB\]/g, replacement: 'text-content-muted' },
  { regex: /bg-white/g, replacement: 'bg-surface-card' },
  { regex: /border-\[#E8EDF0\]/g, replacement: 'border-surface-border' },
  { regex: /bg-\[#F8FAFB\]/g, replacement: 'bg-surface-base' },
  { regex: /text-\[#006D77\]/g, replacement: 'text-teal' },
  { regex: /bg-\[#006D77\]/g, replacement: 'bg-teal' },
  { regex: /border-\[#006D77\]/g, replacement: 'border-teal' },
  { regex: /text-\[#E8A838\]/g, replacement: 'text-gold' },
  { regex: /bg-gray-50/g, replacement: 'bg-surface-hover' },
  { regex: /hover:bg-gray-50/g, replacement: 'hover:bg-surface-hover' },
  { regex: /hover:bg-white/g, replacement: 'hover:bg-surface-card' },
  { regex: /hover:text-\[#0D1B1E\]/g, replacement: 'hover:text-content-primary' },
  { regex: /bg-\[#004E57\]/g, replacement: 'bg-teal-dark' },
];

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const { regex, replacement } of replacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Updated:', fullPath);
      }
    }
  }
}

walk('/Users/hanson/Code-Projects/Kirospace/Azzay Pharmacy/apps/web/src/components');
