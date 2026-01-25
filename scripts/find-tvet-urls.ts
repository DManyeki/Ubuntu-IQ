
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// --- Configuration ---
const BATCH_SIZE = 3000; // Process all institutions
const HEADLESS = false; // VISIBLE browser to avoid bot detection
const OUTPUT_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'tvet_urls_found.json');
const DELAY_BETWEEN_SEARCHES = 3000; // 3 seconds between searches

// --- Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// --- URL Finder ---

async function findFirstUrl(institutionName: string, county: string, page: any): Promise<string | null> {
    const query = `${institutionName} ${county} Kenya official website`;

    try {
        // Use DuckDuckGo HTML version (lighter, less blocking)
        await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Wait for results
        await page.waitForSelector('.result', { timeout: 10000 });

        // Get the first result URL
        const firstUrl = await page.evaluate(() => {
            const firstLink = document.querySelector('.result__a') as HTMLAnchorElement;
            return firstLink ? firstLink.href : null;
        });

        // Clean the URL (DDG sometimes wraps URLs)
        if (firstUrl && firstUrl.includes('duckduckgo.com/l/?')) {
            // Extract actual URL from DDG redirect
            const urlMatch = firstUrl.match(/uddg=([^&]+)/);
            if (urlMatch) {
                return decodeURIComponent(urlMatch[1]);
            }
        }

        return firstUrl;

    } catch (e: any) {
        console.error(`   Search error: ${e.message}`);
        return null;
    }
}

// --- Main ---

async function main() {
    console.log(`🔍 Starting Browser-Based URL Discovery...`);
    console.log(`   Mode: ${HEADLESS ? 'Headless' : 'Visible Browser'}`);
    console.log(`   Output: ${OUTPUT_FILE}\n`);

    // Fetch ALL institutions using pagination
    let allInstitutions: any[] = [];
    let pageNum = 0;
    const pageSize = 1000;
    let hasMore = true;

    console.log("Fetching ALL institutions from Supabase (with pagination)...");

    while (hasMore) {
        const { data, error } = await supabase
            .from('tvet_institutions')
            .select('id, name, county')
            .order('name', { ascending: true })
            .range(pageNum * pageSize, (pageNum + 1) * pageSize - 1);

        if (error) {
            console.error("Supabase Error:", error);
            return;
        }

        if (data && data.length > 0) {
            allInstitutions = [...allInstitutions, ...data];
            console.log(`   Fetched ${allInstitutions.length} so far...`);
            pageNum++;
            if (data.length < pageSize) hasMore = false;
        } else {
            hasMore = false;
        }
    }

    const institutions = allInstitutions;

    if (institutions.length === 0) {
        console.log("No institutions found.");
        return;
    }

    console.log(`\nFound ${institutions.length} total institutions in database.\n`);

    // Load existing results if any
    let results: any[] = [];
    if (fs.existsSync(OUTPUT_FILE)) {
        results = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
        console.log(`Loaded ${results.length} existing results.\n`);
    }

    // Launch browser (VISIBLE mode)
    const browser = await chromium.launch({
        headless: HEADLESS,
        slowMo: 100 // Slow down actions slightly
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    let foundCount = 0;

    for (let i = 0; i < institutions.length; i++) {
        const inst = institutions[i];

        // Skip if already processed
        if (results.find(r => r.id === inst.id)) {
            console.log(`[${i + 1}/${institutions.length}] ${inst.name} - Already processed, skipping`);
            continue;
        }

        console.log(`[${i + 1}/${institutions.length}] ${inst.name} (${inst.county})`);

        const url = await findFirstUrl(inst.name, inst.county || '', page);

        if (url) {
            foundCount++;
            console.log(`   ✅ Found: ${url}`);
        } else {
            console.log(`   ❌ No URL found`);
        }

        results.push({
            id: inst.id,
            name: inst.name,
            county: inst.county,
            website: url,
            found_at: new Date().toISOString()
        });

        // Save incrementally
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

        // Delay between searches
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_SEARCHES));
    }

    await browser.close();

    console.log(`\n🎉 URL Discovery complete!`);
    console.log(`   Total processed: ${results.length}`);
    console.log(`   URLs found: ${foundCount}`);
    console.log(`   Saved to: ${OUTPUT_FILE}`);
}

main().catch(console.error);
