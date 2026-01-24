
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Reused constants
const DIRECTORY_DOMAINS = new Set([
    'education.co.ke', 'educationnewshub.co.ke', 'angazetu.com', 'schoolandcollegelistings.com',
    'kenyayote.com', 'victormatara.com', 'tuko.co.ke', 'kenyacolleges.co.ke', 'kuccps.net',
    'tveta.go.ke', 'yellowpageskenya.com', 'businesslist.co.ke', 'kenyaplex.com', 'colleges.co.ke',
    'courses.co.ke', 'glunis.com', 'africabizinfo.com', 'teacher.co.ke'
]);

function getDomain(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        let clean = url.trim();
        if (clean.includes(' ')) clean = clean.split(' ')[0];
        if (!clean.startsWith('http')) clean = 'http://' + clean;
        const hostname = new URL(clean).hostname;
        return hostname.replace(/^www\./, '');
    } catch { return null; }
}

function getRootDomain(domain: string): string {
    if (!domain) return '';
    const parts = domain.split('.');
    return parts.length < 2 ? domain : parts[0];
}

// Validation function
async function checkUrl(url: string): Promise<string> {
    return new Promise((resolve) => {
        if (!url) return resolve('Missing');

        const lib = url.startsWith('https') ? https : http;
        const request = lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, (res) => {
            const code = res.statusCode || 0;
            request.destroy(); // Done
            if (code >= 200 && code < 400) resolve('🟢'); // Valid (OK/Redirect)
            else resolve('🔴'); // Error (404/500/403)
        });

        request.on('error', () => resolve('🔴'));
        request.on('timeout', () => {
            request.destroy();
            resolve('🔴');
        });
    });
}

// Processing concurrency
async function processBatch(items: any[], batchSize: number, label: string) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        console.log(`Processing ${label}: ${i + 1}-${Math.min(i + batchSize, items.length)} of ${items.length}...`);

        const promises = batch.map(async (item) => {
            const status = await checkUrl(item.db_url);
            return { ...item, db_status: status };
        });

        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
    }
    return results;
}

async function main() {
    console.log("📊 Categorizing and Validating DB URLs (Sections 3-5)...\n");

    const dbPath = path.join(__dirname, 'data', 'tvet_db_export.json');
    const urlsPath = path.join(__dirname, 'data', 'tvet_urls_found.json');
    const reportPath = path.join(__dirname, 'data', 'existing_url_review.md');

    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const foundData = JSON.parse(fs.readFileSync(urlsPath, 'utf-8'));

    // Map Found URLs
    const foundMap = new Map();
    foundData.forEach((item: any) => {
        if (item.website) foundMap.set(item.id, { url: item.website, domain: getDomain(item.website) });
    });

    const categories = {
        exact: [] as any[],
        soft: [] as any[],
        directory: [] as any[],
        facebook: [] as any[],
        other: [] as any[]
    };

    let processedCount = 0;

    // Phase 1: Re-classify
    for (const item of dbData) {
        let dbUrl = item.website || (item.google_maps_data ? item.google_maps_data.website : null);
        if (!dbUrl) continue;
        const found = foundMap.get(item.id);
        if (!found) continue;

        processedCount++;
        const dbDomain = getDomain(dbUrl) || '';
        const foundDomain = found.domain || '';
        const foundUrl = found.url;

        if (dbDomain === foundDomain) {
            categories.exact.push({ name: item.name, db_url: dbUrl, found_url: foundUrl });
        } else {
            const dbRoot = getRootDomain(dbDomain);
            const foundRoot = getRootDomain(foundDomain);
            const isFB = foundDomain.includes('facebook.com');
            const isDir = DIRECTORY_DOMAINS.has(foundDomain) || foundDomain.includes('wordpress') || foundDomain.includes('blogspot');

            if (dbRoot === foundRoot && dbRoot.length > 3 && !isFB && !isDir) {
                categories.soft.push({ name: item.name, db_url: dbUrl, found_url: foundUrl, note: `Extension/Subdomain diff` });
            } else if (isDir) {
                categories.directory.push({ name: item.name, db_url: dbUrl, found_url: foundUrl, note: `Found Directory: ${foundDomain}` });
            } else if (isFB) {
                categories.facebook.push({ name: item.name, db_url: dbUrl, found_url: foundUrl, note: 'Found Facebook' });
            } else {
                categories.other.push({ name: item.name, db_url: dbUrl, found_url: foundUrl, note: `True Mismatch` });
            }
        }
    }

    // Phase 2: Validate Sections 3, 4, 5
    // Section 1 & 2 are assumed handled or low priority for this specific request, 
    // but the user said "Section 3 and below". However, to generate a full report, 
    // we should probably just print simplified lists for 1 & 2, and detailed validated lists for 3,4,5.

    // Actually, user said update file, so we must regenerate whole file.
    // I will validate 3, 4, 5. I will leave 1, 2 as is (no status check) to save time, unless user wants it everywhere.
    // "Let's move to the section 3, and below, run a script to find which DB urls are valid"
    // So 3, 4, 5.

    const validatedDirectory = await processBatch(categories.directory, 20, "Directory Mismatches");
    const validatedFacebook = await processBatch(categories.facebook, 20, "Facebook Mismatches");
    const validatedOther = await processBatch(categories.other, 20, "Other Mismatches");

    // Phase 3: Generate Markdown
    let md = `# 🧐 Existing URL Review Report (Validated)\n\n`;
    md += `> **Source:** Verification of ${processedCount} existing DB records against new search results.\n\n`;
    md += `> **Legend:** 🟢 = DB Link Valid (200 OK), 🔴 = DB Link Invalid/Error\n\n`;

    // Section 1
    md += `## 1. ✅ 100% Domain Match (${categories.exact.length})\n`;
    md += `**Action:** Verified. **(Mark as Green)** in Directory.\n\n`;
    md += `<details><summary>View Verified List</summary>\n\n`;
    md += `| # | Institution | DB URL | Found URL | Note |\n|---|---|---|---|---|\n`;
    categories.exact.forEach((i, idx) => md += `| ${idx + 1} | ${i.name} | ${i.db_url} | ${i.found_url} | Verified (Exact Match) |\n`);
    md += `\n</details>\n\n`;

    // Section 2
    md += `## 2. 🔄 Domain Match (Different Extension/Subdomain) (${categories.soft.length})\n`;
    md += `**Action:** Reviewed. These are remaining variations.\n\n`;
    md += `| # | Institution | DB URL | Found URL | Note |\n|---|---|---|---|---|\n`;
    categories.soft.forEach((i, idx) => md += `| ${idx + 1} | ${i.name} | ${i.db_url} | ${i.found_url} | ${i.note} |\n`);
    md += `\n`;

    // Section 3 (Validated)
    md += `## 3. 📂 Complete Mismatch (Found Directory) (${validatedDirectory.length})\n`;
    md += `**Action:** Ignore "Found" (it's a directory). Check DB Status (🔴 means DB is dead, so we have NO working site).\n\n`;
    md += `| # | Institution | DB URL (Status) | Found URL | Note |\n|---|---|---|---|---|\n`;
    validatedDirectory.forEach((i: any, idx: number) => {
        md += `| ${idx + 1} | ${i.name} | ${i.db_status} ${i.db_url} | ${i.found_url} | ${i.note} |\n`;
    });
    md += `\n`;

    // Section 4 (Validated)
    md += `## 4. 👤 Complete Mismatch (Found Facebook) (${validatedFacebook.length})\n`;
    md += `**Action:** If DB is 🟢, Keep DB. If DB is 🔴, maybe fallback to Found FB.\n\n`;
    md += `| # | Institution | DB URL (Status) | Found URL | Note |\n|---|---|---|---|---|\n`;
    validatedFacebook.forEach((i: any, idx: number) => {
        md += `| ${idx + 1} | ${i.name} | ${i.db_status} ${i.db_url} | ${i.found_url} | ${i.note} |\n`;
    });
    md += `\n`;

    // Section 5 (Validated)
    md += `## 5. ⚠️ Other Mismatches (Potential Major Corrections) (${validatedOther.length})\n`;
    md += `**Action:** **HIGH PRIORITY**. If DB is 🔴 and Found is working, UPDATE. If DB is 🟢, Manual Review.\n\n`;
    md += `| # | Institution | DB URL (Status) | Found URL | Note |\n|---|---|---|---|---|\n`;
    validatedOther.forEach((i: any, idx: number) => {
        md += `| ${idx + 1} | ${i.name} | ${i.db_status} ${i.db_url} | ${i.found_url} | ${i.note} |\n`;
    });
    md += `\n`;

    fs.writeFileSync(reportPath, md);
    console.log(`\nReport updated: ${reportPath}`);
}

main().catch(console.error);
