import fs from 'fs';
import path from 'path';

const migrationName = process.argv[2];
if (!migrationName) {
  console.error('Usage: npm run create-migration -- <name>');
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const filename = `${timestamp}_${migrationName}.ts`;
const migrationsPath = path.join(process.cwd(), 'migrations');
const filePath = path.join(migrationsPath, filename);

// Read the template
const templatePath = path.join(__dirname, 'templates', 'migration-template.ts');
const template = fs.readFileSync(templatePath, 'utf8');

// Replace placeholder with actual migration name
const migrationContent = template.replace(
  '// Write your migration logic here',
  `// Migration: ${migrationName}`
);

fs.writeFileSync(filePath, migrationContent);
console.log(`Created migration file: ${filename}`);
