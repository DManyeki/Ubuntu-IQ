/**
 * Generate a Verified Master URL Report using fresh DB Export
 * Ensures accuracy against the live database state.
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
        if (clean.includes(' ')) {
            // Handle cases like "http://foo.com - some text"
            clean = clean.split(' ')[0];
        }
        if (!clean.startsWith('http')) clean = 'http://' + clean;
        const hostname = new URL(clean).hostname;
        return hostname.replace(/^www\./, '');
    } catch (e) {
        return null; // Invalid URL
    }
}

async function main() {
    console.log("📊 Generating VERIFIED Master URL Report...\n");

    const dbPath = path.join(__dirname, 'data', 'tvet_db_export.json');
    const urlsPath = path.join(__dirname, 'data', 'tvet_urls_found.json');

    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const foundData = JSON.parse(fs.readFileSync(urlsPath, 'utf-8'));

    // Create Map of Found URLs
    const foundMap = new Map();
    foundData.forEach((item: any) => {
        if (item.website) {
            foundMap.set(item.id, {
                url: item.website,
                domain: getDomain(item.website),
                found_at: item.found_at
            });
        }
    });

    // Process all DB entries
    const reportParams = [];
    const proposedUpdates = [];
    const proposedCorrections = [];

    let counts = {
        matched: 0,
        new_data: 0,
        mismatch: 0,
        missing: 0,
        db_only: 0
    };

    for (const item of dbData) {
        // Extract Website from DB record (Logic: Priority to top-level, then JSON)
        // Note: In schema, top-level `website` column doesn't exist yet (it was 'google_maps_data->website').
        // Wait, I saw `website` in the export sample in my previous thought? 
        // Let's check the schema logic again.
        // The export script printed `r.website`. If it's null in DB, it's null.

        let dbUrl = item.website;
        if (!dbUrl && item.google_maps_data && item.google_maps_data.website) {
            dbUrl = item.google_maps_data.website;
        }
        if (!dbUrl && item.source_url) {
            // source_url might be the map link, or the website? 
            // In `update-tvet-maps.ts`, `source_url` was set to map link? 
            // Let's assume website is primarily in `google_maps_data.website`
        }

        const dbDomain = getDomain(dbUrl);
        const found = foundMap.get(item.id);
        const foundUrl = found?.url;
        const foundDomain = found?.domain;

        let status = 'Missing';
        let note = '-';

        if (dbUrl && foundUrl) {
            if (dbDomain === foundDomain) {
                status = 'Match';
                counts.matched++;
            } else {
                status = 'Mismatch';
                counts.mismatch++;
                note = `DB: ${dbDomain} vs Found: ${foundDomain}`;
                proposedCorrections.push({
                    id: item.id,
                    name: item.name,
                    db_url: dbUrl,
                    found_url: foundUrl,
                    db_domain: dbDomain,
                    found_domain: foundDomain
                });
            }
        } else if (dbUrl && !foundUrl) {
            status = 'DB Only';
            counts.db_only++;
        } else if (!dbUrl && foundUrl) {
            status = 'New Data';
            counts.new_data++;
            proposedUpdates.push({
                id: item.id,
                name: item.name,
                found_url: foundUrl,
                found_domain: foundDomain
            });
        } else {
            status = 'Missing';
            counts.missing++;
        }

        reportParams.push({
            name: item.name,
            county: item.county || 'Unknown',
            status: status,
            db_url: dbUrl || '-',
            found_url: foundUrl || '-',
            note: note
        });
    }

    // Generate Markdown
    let md = `# 🛡️ VERIFIED Master TVET URL Report\n\n`;
    md += `> **Source:** Live Database Export (${new Date().toISOString().split('T')[0]})\n`;
    md += `> **Total Institutions:** ${dbData.length}\n\n`;

    md += `## 📊 Status Summary\n\n`;
    md += `| Status | Count | Description |\n`;
    md += `|--------|-------|-------------|\n`;
    md += `| **Match** | ${counts.matched} | URL exists in DB and matches Found URL |\n`;
    md += `| **New Data** | ${counts.new_data} | No URL in DB, but one was Found |\n`;
    md += `| **Mismatch** | ${counts.mismatch} | URLs exist in both but differ |\n`;
    md += `| **DB Only** | ${counts.db_only} | URL exists in DB, none found by scraper |\n`;
    md += `| **Missing** | ${counts.missing} | No URL in DB or Found |\n\n`;

    // Save Updates JSON for action
    const updatesJsonPath = path.join(__dirname, 'data', 'verified_url_updates.json');
    fs.writeFileSync(updatesJsonPath, JSON.stringify({ updates: proposedUpdates, corrections: proposedCorrections }, null, 2));

    // Group by County
    const byCounty: any = {};
    reportParams.forEach(p => {
        byCounty[p.county] = byCounty[p.county] || [];
        byCounty[p.county].push(p);
    });

    md += `## 📋 Detailed List by County\n\n`;

    Object.keys(byCounty).sort().forEach(county => {
        md += `### ${county} (${byCounty[county].length})\n\n`;
        md += `| Institution | Status | DB URL | Found URL |\n`;
        md += `|-------------|--------|--------|-----------|\n`;

        byCounty[county].sort((a: any, b: any) => a.name.localeCompare(b.name)).forEach((p: any) => {
            const statusIcon =
                p.status === 'Match' ? '✅' :
                    p.status === 'New Data' ? '🆕' :
                        p.status === 'Mismatch' ? '⚠️' :
                            p.status === 'DB Only' ? '💾' : '❌';

            md += `| ${p.name} | ${statusIcon} ${p.status} | ${p.db_url} | ${p.found_url} |\n`;
        });
        md += `\n`;
    });

    fs.writeFileSync(path.join(__dirname, 'data', 'verified_master_url_report.md'), md);
    console.log('Report saved to: scripts/data/verified_master_url_report.md');
    console.log(`Saved ${proposedUpdates.length} updates and ${proposedCorrections.length} corrections to verified_url_updates.json`);
}

main().catch(console.error);
