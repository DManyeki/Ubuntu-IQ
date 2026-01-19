import * as fs from 'fs';
import * as path from 'path';

async function main() {
    const p = path.join('scripts', 'data', 'retry_list.json');
    try {
        let content = fs.readFileSync(p, 'utf-8');
        // Strip BOM
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
            console.log("Removed BOM");
        }

        const json = JSON.parse(content);
        console.log(`JSON parsed successfully. ${json.length} items.`);

        fs.writeFileSync(p, JSON.stringify(json, null, 2));
        console.log("Re-wrote clean JSON.");
    } catch (e) {
        console.error("Parse Error:", e);
        // If drastic, maybe over-write with empty array?
        // fs.writeFileSync(p, "[]");
    }
}
main();
