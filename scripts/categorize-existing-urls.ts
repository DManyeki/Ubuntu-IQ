/**
 * Refine the 749 existing URL matches int 5 categories for manual review
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Common directory/aggregator domains
const DIRECTORY_DOMAINS = new Set([
    'education.co.ke',
    'educationnewshub.co.ke',
    'angazetu.com',
    'schoolandcollegelistings.com',
    'kenyayote.com',
    'victormatara.com',
    'tuko.co.ke',
    'kenyacolleges.co.ke',
    'kuccps.net',
    'tveta.go.ke',
    'yellowpageskenya.com',
    'businesslist.co.ke',
    'kenyaplex.com',
    'colleges.co.ke',
    'courses.co.ke',
    'glunis.com',
    'africabizinfo.com',
    'teacher.co.ke'
]);

function getDomain(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        let clean = url.toLowerCase().trim();
        if (clean.includes(' ')) clean = clean.split(' ')[0];
        if (!clean.startsWith('http')) clean = 'http://' + clean;
        const hostname = new URL(clean).hostname;
        return hostname.replace(/^www\./, '');
    } catch (e) {
        return null;
    }
}

// Get the "root" domain (second level + TLD or just name)
function getRootDomain(domain: string): string {
    if (!domain) return '';
    const parts = domain.split('.');
    if (parts.length < 2) return domain;
    // Remove known TLDs to compare the "name" part
    // e.g. kist.ac.ke -> kist
    // kist.co.ke -> kist
    // facebook.com -> facebook

    // Heuristic: take the part before the last 2 if it ends in .ke, or last 1 if .com
    // Actually, just taking the first significant part is often enough for "soft match" comparison
    // But let's be smarter.
    return parts[0];
}

async function main() {
    console.log("📊 Categorizing Existing URLs for Review...\n");

    const dbPath = path.join(__dirname, 'data', 'tvet_db_export.json');
    const urlsPath = path.join(__dirname, 'data', 'tvet_urls_found.json');

    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const foundData = JSON.parse(fs.readFileSync(urlsPath, 'utf-8'));

    // Map Found URLs
    const foundMap = new Map();
    foundData.forEach((item: any) => {
        if (item.website) {
            foundMap.set(item.id, {
                url: item.website,
                domain: getDomain(item.website)
            });
        }
    });

    const categories = {
        exact: [] as any[],
        soft: [] as any[],
        directory: [] as any[],
        facebook: [] as any[],
        other: [] as any[]
    };

    let processedCount = 0;

    for (const item of dbData) {
        // Resolve DB URL
        let dbUrl = item.website;
        if (!dbUrl && item.google_maps_data && item.google_maps_data.website) {
            dbUrl = item.google_maps_data.website;
        }

        if (!dbUrl) continue; // Skip if DB has no URL (User wants to focus on "already in DB")

        const found = foundMap.get(item.id);
        if (!found) continue; // Skip if we didn't find anything (rare)

        processedCount++;

        const dbDomain = getDomain(dbUrl) || '';
        const foundDomain = found.domain || '';
        const foundUrl = found.url;

        // Classification Logic
        if (dbDomain === foundDomain) {
            categories.exact.push({
                name: item.name,
                county: item.county,
                db_url: dbUrl,
                found_url: foundUrl
            });
        } else {
            // Mismatch Analysis
            const dbRoot = getRootDomain(dbDomain);
            const foundRoot = getRootDomain(foundDomain);
            const isFB = foundDomain.includes('facebook.com');
            const isDir = DIRECTORY_DOMAINS.has(foundDomain) || foundDomain.includes('wordpress') || foundDomain.includes('blogspot');

            if (dbRoot === foundRoot && dbRoot.length > 3 && !isFB && !isDir) {
                // e.g. example.com vs example.co.ke
                categories.soft.push({
                    name: item.name,
                    db_url: dbUrl,
                    found_url: foundUrl,
                    note: `Extension/Subdomain diff: ${dbDomain} vs ${foundDomain}`
                });
            } else if (isDir) {
                categories.directory.push({
                    name: item.name,
                    db_url: dbUrl,
                    found_url: foundUrl,
                    note: `Found Directory: ${foundDomain}`
                });
            } else if (isFB) {
                categories.facebook.push({
                    name: item.name,
                    db_url: dbUrl,
                    found_url: foundUrl,
                    note: 'Found Facebook'
                });
            } else {
                categories.other.push({
                    name: item.name,
                    db_url: dbUrl,
                    found_url: foundUrl,
                    note: `True Mismatch: ${dbDomain} vs ${foundDomain}`
                });
            }
        }
    }

    console.log(`Processed: ${processedCount} records with existing DB URLs.`);
    console.log(`\nCategories:`);
    console.log(`1. Exact Match: ${categories.exact.length}`);
    console.log(`2. Soft Match: ${categories.soft.length}`);
    console.log(`3. Directory Mismatch: ${categories.directory.length}`);
    console.log(`4. Facebook Mismatch: ${categories.facebook.length}`);
    console.log(`5. Other Mismatch: ${categories.other.length}`);

    // Generate Markdown Report
    let md = `# 🧐 Existing URL Review Report\n\n`;
    md += `> **Source:** Verification of ${processedCount} existing DB records against new search results.\n\n`;

    md += `## 1. ✅ 100% Domain Match (${categories.exact.length})\n`;
    md += `**Action:** No change needed. Validated.\n\n`;
    // List sample only? Or all? User said "refine this list... for manual review". 
    // Usually manual review needs the Full list. But Exact matches usually don't need review.
    // I'll put them in a collapsible section or just summary.
    md += `<details><summary>View Verified List</summary>\n\n`;
    md += `| # | Institution | DB URL | Found URL |\n|---|---|---|---|\n`;
    categories.exact.forEach((i, idx) => md += `| ${idx + 1} | ${i.name} | ${i.db_url} | ${i.found_url} |\n`);
    md += `\n</details>\n\n`;

    md += `## 2. 🔄 Domain Match (Different Extension/Subdomain) (${categories.soft.length})\n`;
    md += `**Action:** Review. Usually upgrading to \`.ac.ke\` or fixing \`www\` or protocol.\n\n`;
    md += `| # | Institution | DB URL | Found URL | Note |\n|---|---|---|---|---|\n`;
    categories.soft.forEach((i, idx) => md += `| ${idx + 1} | ${i.name} | ${i.db_url} | ${i.found_url} | ${i.note} |\n`);
    md += `\n`;

    md += `## 3. 📂 Complete Mismatch (Found Directory) (${categories.directory.length})\n`;
    md += `**Action:** Ignore "Found". DB is likely better or Found is just SEO spam.\n\n`;
    md += `| # | Institution | DB URL | Found URL | Note |\n|---|---|---|---|---|\n`;
    categories.directory.forEach((i, idx) => md += `| ${idx + 1} | ${i.name} | ${i.db_url} | ${i.found_url} | ${i.note} |\n`);
    md += `\n`;

    md += `## 4. 👤 Complete Mismatch (Found Facebook) (${categories.facebook.length})\n`;
    md += `**Action:** Check if DB is broken. If DB is official site, Keep. If DB is broken, maybe fallback to FB.\n\n`;
    md += `| # | Institution | DB URL | Found URL | Note |\n|---|---|---|---|---|\n`;
    categories.facebook.forEach((i, idx) => md += `| ${idx + 1} | ${i.name} | ${i.db_url} | ${i.found_url} | ${i.note} |\n`);
    md += `\n`;

    md += `## 5. ⚠️ Other Mismatches (Potential Major Corrections) (${categories.other.length})\n`;
    md += `**Action:** **HIGH PRIORITY REVIEW**. DB might be wrong (generic) or outdated.\n\n`;
    md += `| # | Institution | DB URL | Found URL | Note |\n|---|---|---|---|---|\n`;
    categories.other.forEach((i, idx) => md += `| ${idx + 1} | ${i.name} | ${i.db_url} | ${i.found_url} | ${i.note} |\n`);
    md += `\n`;

    fs.writeFileSync(path.join(__dirname, 'data', 'existing_url_review.md'), md);
    console.log('Report saved to: scripts/data/existing_url_review.md');
}

main().catch(console.error);
