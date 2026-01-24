/**
 * Analyze URL matches between Database (via tvet_google_maps.json) and Found URLs (tvet_urls_found.json)
 * Focus on domain matching
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to sanitize domain
function getDomain(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        let clean = url.toLowerCase().trim();
        if (!clean.startsWith('http')) clean = 'http://' + clean;
        const hostname = new URL(clean).hostname;
        return hostname.replace(/^www\./, '');
    } catch (e) {
        return null;
    }
}

async function main() {
    console.log("🔍 Analyzing URL Matches (DB vs Browser Finder)...\n");

    const gmapsPath = path.join(__dirname, 'data', 'tvet_google_maps.json');
    const urlsPath = path.join(__dirname, 'data', 'tvet_urls_found.json');

    const dbData = JSON.parse(fs.readFileSync(gmapsPath, 'utf-8'));
    const foundData = JSON.parse(fs.readFileSync(urlsPath, 'utf-8'));

    // Create Map of DB entries by ID
    const dbMap = new Map();
    let dbHasWebsite = 0;

    dbData.forEach((item: any) => {
        // Website might be top-level or in google_maps object, or in a 'website' field if it exists
        // Based on previous checks, we rely on checking all possible locations
        const website = item.website || item.google_maps?.website || item.google_maps_data?.website;
        if (website) dbHasWebsite++;

        dbMap.set(item.id, {
            id: item.id,
            name: item.name,
            website: website,
            domain: getDomain(website)
        });
    });

    console.log(`DB Entries: ${dbData.length}`);
    console.log(`DB with Website: ${dbHasWebsite}`);
    console.log(`mFound URLs: ${foundData.length}\n`);

    // Compare
    const matches = [];
    const mismatches = [];
    const newWebsites = [];
    const alreadyHadSame = [];

    for (const found of foundData) {
        if (!found.website) continue;

        const dbItem = dbMap.get(found.id);
        if (!dbItem) continue; // Should not happen if IDs align

        const foundDomain = getDomain(found.website);
        const dbDomain = dbItem.domain;

        if (!dbItem.website) {
            // Case 1: DB has no website, but we found one
            newWebsites.push({
                institution: found.name,
                found_url: found.website,
                found_domain: foundDomain
            });
        } else {
            // Case 2: DB has a website, compare them
            if (foundDomain === dbDomain) {
                matches.push({
                    institution: found.name,
                    url: found.website,
                    domain: foundDomain
                });
            } else {
                // Different domains?
                mismatches.push({
                    institution: found.name,
                    db_url: dbItem.website,
                    db_domain: dbDomain,
                    found_url: found.website,
                    found_domain: foundDomain
                });
            }
        }
    }

    // Output Results
    console.log("=".repeat(60));
    console.log(`✅ MATCHES ID & DOMAIN: ${matches.length}`);
    console.log("=".repeat(60));
    console.log("(Browser finder confirmed existing DB data)\n");

    console.log("=".repeat(60));
    console.log(`🆕 NEW DATA OPPORTUNITIES: ${newWebsites.length}`);
    console.log("=".repeat(60));
    console.log("(DB has no website, but Browser Finder found one)\n");
    if (newWebsites.length > 0) {
        console.log("Sample of new websites found:");
        newWebsites.slice(0, 10).forEach((item, i) => {
            console.log(`${i + 1}. ${item.institution}`);
            console.log(`   + ${item.found_url}`);
        });
        console.log(`\n...and ${newWebsites.length - 10} more.\n`);
    }

    console.log("=".repeat(60));
    console.log(`⚠️  DOMAIN MISMATCHES: ${mismatches.length}`);
    console.log("=".repeat(60));
    console.log("(DB has one website, Browser Finder found a DIFFERENT domain)\n");

    if (mismatches.length > 0) {
        mismatches.forEach((item, i) => {
            console.log(`${i + 1}. ${item.institution}`);
            console.log(`   DB:    ${item.db_url} (${item.db_domain})`);
            console.log(`   Found: ${item.found_url} (${item.found_domain})`);
            console.log("");
        });
    }

    // Save mismatched report for closer review
    fs.writeFileSync(path.join(__dirname, 'data', 'url_mismatches.json'), JSON.stringify(mismatches, null, 2));

    // Save valid new data for upload
    fs.writeFileSync(path.join(__dirname, 'data', 'url_new_data.json'), JSON.stringify(newWebsites, null, 2));

}

main().catch(console.error);
