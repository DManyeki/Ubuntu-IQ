/**
 * Generate a cleaned mistaken finds report - only items with phone data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MistakenFind {
    id: string;
    searched_for: string;
    found_instead: string;
    county: string;
    status: string;
    has_phone: boolean;
    has_address: boolean;
    has_website: boolean;
}

async function main() {
    console.log("📋 Generating Cleaned Mistaken Finds Report...\n");

    // Load data
    const mistakenFile = path.join(__dirname, 'data', 'mistaken_finds.json');
    const data: MistakenFind[] = JSON.parse(fs.readFileSync(mistakenFile, 'utf-8'));

    // Filter to only those with phone
    const cleaned = data.filter(d => d.has_phone);

    console.log(`   Total mistaken finds: ${data.length}`);
    console.log(`   With phone data: ${cleaned.length}`);

    // Group by county
    const byCounty = new Map<string, MistakenFind[]>();
    for (const item of cleaned) {
        const county = item.county || 'Unknown';
        if (!byCounty.has(county)) byCounty.set(county, []);
        byCounty.get(county)!.push(item);
    }

    // Generate markdown
    let md = `# 📱 Cleaned Mistaken Finds - With Phone Data

> **Generated:** ${new Date().toISOString().split('T')[0]}  
> **Total:** ${cleaned.length} (filtered from ${data.length})

These are institutions that Google Maps returned that:
- Don't match any TVET institution we searched for
- BUT have phone numbers (useful contact data)

They could potentially be:
- Related/affiliated institutions worth tracking
- Separate institutions that exist at similar locations
- Alternative names for institutions in our database

---

## Full List

| # | Searched For | Found Instead | County | Data |
|:---:|:---|:---|:---|:---:|
`;

    cleaned.forEach((item, i) => {
        const data = [
            item.has_phone ? '📞' : '',
            item.has_address ? '📍' : '',
            item.has_website ? '🌐' : ''
        ].filter(Boolean).join(' ');
        md += `| ${i + 1} | ${item.searched_for} | ${item.found_instead} | ${item.county || '—'} | ${data} |\n`;
    });

    // Add by-county breakdown
    md += `\n---\n\n## By County\n\n`;

    const sortedCounties = [...byCounty.entries()].sort((a, b) => b[1].length - a[1].length);
    for (const [county, items] of sortedCounties) {
        md += `### ${county} (${items.length})\n\n`;
        items.forEach((item, i) => {
            const data = [
                item.has_phone ? '📞' : '',
                item.has_address ? '📍' : '',
                item.has_website ? '🌐' : ''
            ].filter(Boolean).join(' ');
            md += `${i + 1}. **${item.found_instead}** ${data}\n`;
            md += `   - Searched for: ${item.searched_for}\n\n`;
        });
    }

    // Save files
    const outputMd = path.join(__dirname, 'data', 'mistaken_finds_cleaned.md');
    const outputJson = path.join(__dirname, 'data', 'mistaken_finds_cleaned.json');

    fs.writeFileSync(outputMd, md);
    fs.writeFileSync(outputJson, JSON.stringify(cleaned, null, 2));

    console.log(`\n✅ Reports generated:`);
    console.log(`   ${outputMd}`);
    console.log(`   ${outputJson}`);
}

main().catch(console.error);
