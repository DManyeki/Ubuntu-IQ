
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_FILE = path.join(__dirname, 'data', 'tvet_google_maps.json');
const HEADLESS = false; // Visible browser for debugging

// --- Setup ---
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Google Maps Extraction ---

interface GoogleMapsData {
    found: boolean;
    name?: string;
    phone?: string;
    address?: string;
    website?: string;
    rating?: number;
    review_count?: number;
    place_type?: string;
    coordinates?: { lat: number; lng: number };
    maps_link?: string;
}

async function handleConsent(page: any) {
    try {
        // Wait a bit for potential consent dialog
        await page.waitForTimeout(2000);

        // Try multiple consent button variations
        const consentButtons = [
            'button:has-text("Accept all")',
            'button:has-text("I agree")',
            'button:has-text("Reject all")',
            '[aria-label="Accept all"]',
            'form[action*="consent"] button'
        ];

        for (const selector of consentButtons) {
            const btn = page.locator(selector).first();
            if (await btn.count() > 0 && await btn.isVisible()) {
                console.log('   Found consent dialog, clicking accept...');
                await btn.click();
                await page.waitForTimeout(2000);
                break;
            }
        }
    } catch (e) {
        // No consent dialog, continue
    }
}

async function searchGoogleMaps(institutionName: string, county: string, page: any, isFirstSearch: boolean): Promise<GoogleMapsData> {
    const searchQuery = `${institutionName}, ${county}, Kenya`;

    try {
        // Page navigation is now handled in the main loop to ensure fresh state

        await page.waitForTimeout(2000);

        // Robust search box finding - avoid dynamic IDs
        const searchInput = page.locator('input[id="searchboxinput"], input[name="q"], input[aria-label="Search Google Maps"]').first();
        try {
            await searchInput.waitFor({ state: 'visible', timeout: 10000 });
        } catch (e) {
            console.log('   Search input not found, reloading page...');
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3000);
        }

        // Capture current state to detect change
        const oldUrl = page.url();
        const oldH1 = await page.locator('h1').first().textContent().catch(() => '');

        await searchInput.click();
        await searchInput.fill('');
        await searchInput.type(searchQuery, { delay: 100 }); // Slower typing
        await page.keyboard.press('Enter');

        // Wait for results - either URL change, Header change, or List View
        try {
            await Promise.race([
                page.waitForFunction((old: any) => document.querySelector('h1')?.textContent !== old, oldH1, { timeout: 10000 }),
                page.waitForFunction((old: any) => window.location.href !== old, oldUrl, { timeout: 10000 }),
                page.waitForSelector('div[role="feed"]', { timeout: 10000 })
            ]);
        } catch (e) {
            // Timeout, might simply be slow or no results found logic needed
        }
        await page.waitForTimeout(3000);

        // Check if we are on a list of results and click the first one if so
        const feedSelector = 'div[role="feed"]';
        const resultLinkSelector = 'a[href*="/maps/place/"]';

        // Wait briefly to see which view loads
        try {
            await Promise.race([
                page.waitForSelector('h1', { timeout: 5000 }), // Single result header
                page.waitForSelector(feedSelector, { timeout: 5000 }) // List view
            ]);
        } catch (e) {
            // Check visibility manually if timeout
        }

        const isList = await page.locator(feedSelector).isVisible().catch(() => false);

        if (isList) {
            console.log('   Found list of results, selecting first organic match...');

            // Find first real place link (skip ads if any)
            const firstResult = page.locator(`${feedSelector} ${resultLinkSelector}`).first();

            if (await firstResult.count() > 0) {
                // Scroll into view if needed
                await firstResult.scrollIntoViewIfNeeded();
                await firstResult.click();

                // CRITICAL: Wait for the DETAILS view to load
                // We know we are in details view when we see actions like "Directions", "Save", "Share"
                // or specific data buttons
                try {
                    await page.waitForSelector('button[data-value="Share"], button[aria-label*="Share"], [data-item-id="address"]', { timeout: 10000 });
                    await page.waitForTimeout(1000); // Small stability wait
                } catch (e) {
                    console.log('   Warning: Timeout waiting for details panel after click');
                }
            } else {
                console.log('   List found but no clickable place links detected');
                return { found: false };
            }
        }

        // Extract data
        const data: GoogleMapsData = { found: false };

        // Name (H1)
        const nameEl = page.locator('h1').first();
        if (await nameEl.count() > 0) {
            data.name = await nameEl.textContent();
            data.found = true;
        }

        // Rating and Reviews
        // Rating: Look for numeric rating (e.g. "4.5")
        const ratingEl = page.locator('div.F7nice span[aria-hidden="true"]').first();
        if (await ratingEl.count() > 0) {
            const ratingText = await ratingEl.textContent();
            if (ratingText) data.rating = parseFloat(ratingText);
        }

        // Reviews: Look for the review count text specifically (e.g. "(123)", "123 reviews")
        // Often inside parentheses or next to rating
        const reviewEl = page.locator('div.F7nice span[aria-label*="reviews"], div.F7nice span:has-text("(")').first();
        if (await reviewEl.count() > 0) {
            let reviewText = await reviewEl.getAttribute('aria-label'); // "1,234 reviews"
            if (!reviewText) reviewText = await reviewEl.textContent(); // "(1,234)"

            if (reviewText) {
                // Remove commas and extract number
                const cleanText = reviewText.replace(/,/g, '');
                const match = cleanText.match(/(\d+)/);
                if (match) data.review_count = parseInt(match[1]);
            }
        }

        // Details (Address, Phone, Website) via aria-labels on buttons
        const buttons = page.locator('button[data-item-id]');
        const count = await buttons.count();
        for (let i = 0; i < count; i++) {
            const btn = buttons.nth(i);
            const itemId = await btn.getAttribute('data-item-id');
            const label = await btn.getAttribute('aria-label');

            if (!itemId || !label) continue;

            if (itemId.includes('address')) {
                data.address = label.replace(/^Address: /i, '');
            } else if (itemId.includes('phone')) {
                data.phone = label.replace(/^Phone: /i, '');
            }
        }

        // Website: Try multiple selectors
        // 1. Standard "authority" ID
        let websiteEl = page.locator('a[data-item-id="authority"]').first();
        // 2. Look for aria-label "Website"
        if (await websiteEl.count() === 0) {
            websiteEl = page.locator('a[aria-label*="website" i], a[aria-label*="ovuti" i]').first(); // English + Swahili fallback
        }

        if (await websiteEl.count() > 0) {
            const href = await websiteEl.getAttribute('href');
            if (href) data.website = href;
        }

        // Coordinates from URL
        const currentUrl = page.url();
        const coordMatch = currentUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (coordMatch) {
            data.coordinates = {
                lat: parseFloat(coordMatch[1]),
                lng: parseFloat(coordMatch[2])
            };
        }

        // Capture the Google Maps Link
        try {
            await page.waitForURL(/.*\/place\/.*/, { timeout: 2000 });
        } catch (e) {
            // Ignore timeout, just take current URL
        }
        data.maps_link = page.url();

        return data;

    } catch (e: any) {
        console.error(`   Error details: ${e.message}`);
        try {
            await page.screenshot({ path: path.join(__dirname, 'data', 'error_screenshot.png') });
        } catch (s) { /* ignore */ }
        return { found: false };
    }
}

// --- Main ---

async function main() {
    console.log(`🗺️ Google Maps Enrichment (Remaining Batch: Non-Priority Items)`);
    console.log(`   Batch size: All Remaining`);
    console.log(`   Output: ${OUTPUT_FILE}\n`);

    // Fetch details for ALL institutions to filter locally
    // Fetch details for ALL institutions to filter locally
    let allInstitutions: any[] = [];
    let pageNum = 0;
    const pageSize = 1000;
    let hasMore = true;

    console.log("Fetching institutions from Supabase...");

    while (hasMore) {
        const { data, error } = await supabase
            .from('tvet_institutions')
            .select('id, name, county')
            .range(pageNum * pageSize, (pageNum + 1) * pageSize - 1)
            .order('name');

        if (error) {
            console.error("Supabase Error fetching details:", error);
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

    // Use the fetched data
    const institutions = allInstitutions;

    // Load priority IDs (from URL finder)
    const URLS_FILE = path.join(__dirname, 'data', 'tvet_urls_found.json');
    let priorityIds = new Set<string>();
    if (fs.existsSync(URLS_FILE)) {
        const urlData = JSON.parse(fs.readFileSync(URLS_FILE, 'utf-8'));
        priorityIds = new Set(urlData.map((u: any) => u.id));
        console.log(`Loaded ${priorityIds.size} priority institutions (to exclude).\n`);
    }

    // Load existing result IDs to exclude
    let results: any[] = [];
    if (fs.existsSync(OUTPUT_FILE)) {
        results = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    }
    const processedIds = new Set(results.map((r: any) => r.id));

    // Filter to only those NOT PROCESSED and NOT IN PRIORITY LIST
    // (Priority list is handled by the other script)
    const pending = institutions.filter(inst => {
        const isNotProcessed = !processedIds.has(inst.id);
        const isPriority = priorityIds.has(inst.id);
        return isNotProcessed && !isPriority; // Skip priority items
    });

    console.log(`Found ${institutions.length} total in DB.`);
    console.log(`Processed ${processedIds.size} already.`);
    console.log(`Priority Items ${priorityIds.size} (Excluded).`);
    console.log(`Queued ${pending.length} remaining items for processing.\n`);

    if (pending.length === 0) {
        console.log("All remaining institutions processed! 🎉");
        return;
    }

    const browser = await chromium.launch({
        headless: HEADLESS,
        slowMo: 100,
        args: ['--lang=en-US'] // Force Chrome to use English
    });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1400, height: 900 },
        locale: 'en-US',
        timezoneId: 'Africa/Nairobi',
        geolocation: { latitude: -1.286389, longitude: 36.817223 }, // Nairobi
        permissions: ['geolocation']
    });
    const page = await context.newPage();

    let foundCount = 0;

    // Process pending institutions
    for (let i = 0; i < pending.length; i++) {
        const inst = pending[i];

        console.log(`[${i + 1}/${pending.length}] ${inst.name} (${inst.county})`);

        // Force fresh navigation to prevent stale data
        try {
            await page.goto('https://www.google.com/maps?hl=en', { waitUntil: 'load', timeout: 30000 });
            if (i === 0) await handleConsent(page);
        } catch (e) {
            console.log('   Warning: Nav error, retrying...');
            await page.waitForTimeout(2000);
            await page.goto('https://www.google.com/maps?hl=en', { waitUntil: 'load', timeout: 30000 });
        }

        const mapsData = await searchGoogleMaps(inst.name, inst.county || '', page, false);

        if (mapsData.found) {
            foundCount++;
            console.log(`   ✅ Found: ${mapsData.name || 'Unknown'}`);
            if (mapsData.phone) console.log(`      📞 ${mapsData.phone}`);
            if (mapsData.address) console.log(`      📍 ${mapsData.address}`);
            if (mapsData.rating) console.log(`      ⭐ ${mapsData.rating} (${mapsData.review_count || 0} reviews)`);
            if (mapsData.website) console.log(`      🌐 ${mapsData.website}`);
        } else {
            console.log(`   ❌ Not found on Google Maps`);
        }

        results.push({
            id: inst.id,
            name: inst.name,
            county: inst.county,
            google_maps: mapsData,
            source: 'google_maps',
            searched_at: new Date().toISOString()
        });

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

        // Randomized delay 5-15s to be safe(er)
        const delay = Math.floor(Math.random() * 10000) + 5000;
        await new Promise(r => setTimeout(r, delay));
    }

    await browser.close();

    console.log(`\n🎉 Google Maps enrichment complete!`);
    console.log(`   Total: ${results.length}`);
    console.log(`   Found: ${foundCount}`);
    console.log(`   Saved to: ${OUTPUT_FILE}`);
}

main().catch(console.error);
