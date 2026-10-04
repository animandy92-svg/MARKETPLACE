import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const source = JSON.parse(readFileSync(new URL('../src/app/data/categories.json', import.meta.url), 'utf8'));
const target = new URL('../mobile/lib/models/categories.dart', import.meta.url);
const output = '// Generated from src/app/data/categories.json by scripts/sync-mobile-categories.mjs.\n'
  + 'const categories = <String, String>{\n  "all": "All",\n'
  + source.map((item) => `  ${JSON.stringify(item.id)}: ${JSON.stringify(item.name)},`).join('\n') + '\n};\n';
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== output) throw new Error('Run node scripts/sync-mobile-categories.mjs');
} else {
  writeFileSync(fileURLToPath(target), output);
}
