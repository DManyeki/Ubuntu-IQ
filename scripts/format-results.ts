import * as fs from 'fs';
import * as path from 'path';

async function main() {
    const listPath = path.join('scripts', 'data', 'retry_list.json');
    const resultsPath = path.join('scripts', 'data', 'deep_scrape_results.json');

    if (!fs.existsSync(listPath) || !fs.existsSync(resultsPath)) {
        console.error("Missing files");
        return;
    }

    const retryList = JSON.parse(fs.readFileSync(listPath, 'utf-8'));
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

    const formatted = results.map((res: any) => {
        const original = retryList.find((i: any) => i.id === res.id);
        return {
            name: original ? original.name : "Unknown",
            old_phone: original ? original.phone : null,
            new_phone: res.phone,
            id: res.id
        };
    });

    fs.writeFileSync(resultsPath, JSON.stringify(formatted, null, 2));
    console.log(`Reformatted ${formatted.length} results with Names.`);
}

main();
