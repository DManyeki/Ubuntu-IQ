import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string, fileList: string[] = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                walk(filePath, fileList);
            }
        } else {
            if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js')) {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}

const rootDir = process.cwd();
const files = walk(rootDir);

let changed = 0;

files.forEach(file => {
    // Skip this script itself and migration files
    if (file.includes('refactor-table-name.ts')) return;

    let content = fs.readFileSync(file, 'utf-8');
    const original = content;

    // Replace .from('institutions')
    content = content.replace(/\.from\(['"]institutions['"]\)/g, ".from('universities')");

    // Also replace references in JSON files if needed? No, user only mentioned table rename.
    // Check constraints or strings?
    // Maybe generic strings? "institutions table" -> "universities table"?
    // User description: "...Universities offering...".
    // I'll stick to code references first.

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated: ${path.relative(rootDir, file)}`);
        changed++;
    }
});

console.log(`Refactored ${changed} files.`);
