
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("🔄 Swapping Dead DB URLs with Found URLs (Archiving Old)...\n");

    const reportPath = path.join(__dirname, 'data', 'existing_url_review.md');
    const dbPath = path.join(__dirname, 'data', 'tvet_db_export.json');

    if (!fs.existsSync(reportPath) || !fs.existsSync(dbPath)) {
        console.error("❌ Missing input files.");
        process.exit(1);
    }

    const reportContent = fs.readFileSync(reportPath, 'utf-8');
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

    // Regex to parse the markdown table rows with 🔴
    // Matches: | # | Name | 🔴 URL | Found URL | Note |
    const regex = /\|\s*\d+\s*\|\s*(.*?)\s*\|\s*🔴\s*(.*?)\s*\|\s*(.*?)\s*\|/g;

    let match;
    let updateCount = 0;
    const updates = [] as any[];

    // Parse Report
    while ((match = regex.exec(reportContent)) !== null) {
        const name = match[1].trim();
        const oldUrlBlob = match[2].trim(); // Might have extra text? "http://..."
        const foundUrl = match[3].trim();

        // The oldUrlBlob in the report is just the URL "http://..." because 🔴 is outside or inside?
        // In the report generation: `| 🔴 ${i.db_url} |` or `| ${i.db_status} ${i.db_url} |`
        // My regex `🔴\s*(.*?)` captures everything after the red circle.
        // It should match the URL.

        if (foundUrl && foundUrl !== 'undefined' && foundUrl.length > 5) {
            updates.push({ name, oldUrl: oldUrlBlob, newUrl: foundUrl });
        }
    }

    console.log(`Found ${updates.length} candidates for swapping based on '🔴' status.`);

    // Apply Updates
    for (const update of updates) {
        const item = dbData.find((d: any) => d.name === update.name);
        if (item) {
            // Initialize other_websites as array if missing
            if (!item.other_websites) item.other_websites = [];
            else if (typeof item.other_websites === 'string') {
                // Handle legacy case if any, though schema is JSONB default []
                try { item.other_websites = JSON.parse(item.other_websites); } catch { item.other_websites = []; }
            }

            // Avoid duplicate archiving
            if (!item.other_websites.includes(item.website)) {
                if (item.website) item.other_websites.push(item.website);
            }

            // Set new main URL
            if (item.website !== update.newUrl) {
                console.log(`✅ Swapping: ${item.name}`);
                console.log(`   Old (Archived): ${item.website}`);
                console.log(`   New (Main): ${update.newUrl}`);
                item.website = update.newUrl;
                updateCount++;
            }
        } else {
            console.warn(`⚠️ Could not find DB record for: "${update.name}"`);
        }
    }

    if (updateCount > 0) {
        fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 4));
        console.log(`\n🎉 Successfully swapped and archived ${updateCount} URLs in tvet_db_export.json`);
    } else {
        console.log("\nNo changes made (Already verified or no matches).");
    }
}

main().catch(console.error);
