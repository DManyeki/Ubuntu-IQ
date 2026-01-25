
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INPUT_FILE = path.join(__dirname, 'data', 'tvet_urls_found.json');
const OUTPUT_FILE = path.join(__dirname, 'data', 'tvet_urls_verified.json');
const TIMEOUT_MS = 10000;
const DELAY_BETWEEN_CHECKS = 500;

// --- Verification ---

async function verifyUrl(url: string): Promise<{ accessible: boolean, status: number | null, finalUrl: string | null }> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const response = await fetch(url, {
            method: 'HEAD', // Just check headers, don't download body
            signal: controller.signal,
            redirect: 'follow'
        });

        clearTimeout(timeoutId);

        return {
            accessible: response.ok,
            status: response.status,
            finalUrl: response.url
        };
    } catch (e: any) {
        return {
            accessible: false,
            status: null,
            finalUrl: null
        };
    }
}

function categorizeUrl(url: string): string {
    if (!url) return 'none';
    if (url.includes('.ac.ke')) return 'official_ac_ke';
    if (url.includes('education.co.ke') || url.includes('colleges.co.ke') || url.includes('angazetu.com') || url.includes('kenyaplex.com')) return 'directory';
    if (url.includes('facebook.com') || url.includes('twitter.com') || url.includes('instagram.com')) return 'social';
    if (url.includes('.co.ke') || url.includes('.com') || url.includes('.org')) return 'official_other';
    return 'unknown';
}

// --- Main ---

async function main() {
    console.log(`🔍 Starting URL Verification...`);
    console.log(`   Input: ${INPUT_FILE}`);
    console.log(`   Output: ${OUTPUT_FILE}\n`);

    // Read found URLs
    if (!fs.existsSync(INPUT_FILE)) {
        console.log("No URLs file found yet. Run find-tvet-urls.ts first.");
        return;
    }

    const foundUrls = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    console.log(`Found ${foundUrls.length} URLs to verify.\n`);

    // Load existing verified if any
    let verified: any[] = [];
    if (fs.existsSync(OUTPUT_FILE)) {
        verified = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
        console.log(`Loaded ${verified.length} already verified.\n`);
    }

    const processedIds = new Set(verified.map((v: any) => v.id));

    let accessibleCount = 0;
    let directoryCount = 0;
    let officialCount = 0;

    for (let i = 0; i < foundUrls.length; i++) {
        const item = foundUrls[i];

        // Skip if already verified
        if (processedIds.has(item.id)) {
            continue;
        }

        const url = item.website;
        const category = categorizeUrl(url);

        console.log(`[${i + 1}/${foundUrls.length}] ${item.name}`);
        console.log(`   URL: ${url}`);
        console.log(`   Category: ${category}`);

        let result: any = {
            id: item.id,
            name: item.name,
            county: item.county,
            website: url,
            category,
            accessible: false,
            status: null,
            final_url: null,
            verified_at: new Date().toISOString()
        };

        if (url) {
            const check = await verifyUrl(url);
            result.accessible = check.accessible;
            result.status = check.status;
            result.final_url = check.finalUrl;

            if (check.accessible) {
                accessibleCount++;
                console.log(`   ✅ Accessible (${check.status})`);
            } else {
                console.log(`   ❌ Not accessible (${check.status || 'timeout/error'})`);
            }

            if (category === 'directory') directoryCount++;
            if (category.startsWith('official')) officialCount++;
        } else {
            console.log(`   ⚠️ No URL to verify`);
        }

        verified.push(result);

        // Save incrementally
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(verified, null, 2));

        await new Promise(r => setTimeout(r, DELAY_BETWEEN_CHECKS));
    }

    console.log(`\n🎉 Verification complete!`);
    console.log(`   Total verified: ${verified.length}`);
    console.log(`   Accessible: ${accessibleCount}`);
    console.log(`   Official sites: ${officialCount}`);
    console.log(`   Directory listings: ${directoryCount}`);
    console.log(`   Saved to: ${OUTPUT_FILE}`);
}

main().catch(console.error);
