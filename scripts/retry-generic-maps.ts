
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
const VERIFIED_FILE = path.join(__dirname, 'data', 'tvet_verified_enrichment.json');
const HEADLESS = false; // Visible browser for debugging

// --- Setup ---
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Google Maps Extraction (Copied from working script) ---

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
        await page.waitForTimeout(2000);
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

async function searchGoogleMaps(institutionName: string, county: string, page: any): Promise<GoogleMapsData> {
    // Use county if available, fallback to just "Kenya"
    const searchQuery = county
        ? `${institutionName}, ${county}, Kenya`
        : `${institutionName}, Kenya`;

    try {
        await page.waitForTimeout(2000);

        // Robust search box finding
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
        await searchInput.type(searchQuery, { delay: 100 });
        await page.keyboard.press('Enter');

        // Wait for results
        try {
            await Promise.race([
                page.waitForFunction((old: any) => document.querySelector('h1')?.textContent !== old, oldH1, { timeout: 10000 }),
                page.waitForFunction((old: any) => window.location.href !== old, oldUrl, { timeout: 10000 }),
                page.waitForSelector('div[role="feed"]', { timeout: 10000 })
            ]);
        } catch (e) {
            // Timeout, continue anyway
        }
        await page.waitForTimeout(3000);

        // Check if we are on a list of results and click the first one
        const feedSelector = 'div[role="feed"]';
        const resultLinkSelector = 'a[href*="/maps/place/"]';

        try {
            await Promise.race([
                page.waitForSelector('h1', { timeout: 5000 }),
                page.waitForSelector(feedSelector, { timeout: 5000 })
            ]);
        } catch (e) {
            // Continue
        }

        const isList = await page.locator(feedSelector).isVisible().catch(() => false);

        if (isList) {
            console.log('   Found list of results, selecting first match...');
            const firstResult = page.locator(`${feedSelector} ${resultLinkSelector}`).first();

            if (await firstResult.count() > 0) {
                await firstResult.scrollIntoViewIfNeeded();
                await firstResult.click();

                try {
                    await page.waitForSelector('button[data-value="Share"], button[aria-label*="Share"], [data-item-id="address"]', { timeout: 10000 });
                    await page.waitForTimeout(1000);
                } catch (e) {
                    console.log('   Warning: Timeout waiting for details panel');
                }
            } else {
                console.log('   List found but no clickable place links');
                return { found: false };
            }
        }

        // Extract data - FULLY RELAXED: Accept ANY name found for later analysis
        const data: GoogleMapsData = { found: false };

        // Name (H1) - Get ALL H1 elements and prefer non-"Results" ones
        const allH1s = await page.locator('h1').allTextContents();

        // First, try to find a non-generic H1 (the actual place name)
        const genericHeaders = ['Results', 'Google Maps', 'Search', 'Maelezo', 'Matokeo'];
        let foundName = '';

        for (const h1 of allH1s) {
            const trimmed = h1?.trim() || '';
            if (trimmed.length > 0 && !genericHeaders.includes(trimmed)) {
                foundName = trimmed;
                break; // Found a real name, use it
            }
        }

        // If no non-generic H1 found, fall back to first H1 (including "Results")
        if (!foundName && allH1s.length > 0) {
            foundName = allH1s[0]?.trim() || '';
        }

        if (foundName.length > 0) {
            data.name = foundName;
            data.found = true;
        }

        // Rating
        const ratingEl = page.locator('div.F7nice span[aria-hidden="true"]').first();
        if (await ratingEl.count() > 0) {
            const ratingText = await ratingEl.textContent();
            if (ratingText) data.rating = parseFloat(ratingText);
        }

        // Reviews
        const reviewEl = page.locator('div.F7nice span[aria-label*="reviews"], div.F7nice span:has-text("(")').first();
        if (await reviewEl.count() > 0) {
            let reviewText = await reviewEl.getAttribute('aria-label');
            if (!reviewText) reviewText = await reviewEl.textContent();
            if (reviewText) {
                const cleanText = reviewText.replace(/,/g, '');
                const match = cleanText.match(/(\d+)/);
                if (match) data.review_count = parseInt(match[1]);
            }
        }

        // Details (Address, Phone)
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

        // Website
        let websiteEl = page.locator('a[data-item-id="authority"]').first();
        if (await websiteEl.count() === 0) {
            websiteEl = page.locator('a[aria-label*="website" i], a[aria-label*="ovuti" i]').first();
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

        // Maps Link
        try {
            await page.waitForURL(/.*\/place\/.*/, { timeout: 2000 });
        } catch (e) { }
        data.maps_link = page.url();

        return data;

    } catch (e: any) {
        console.error(`   Error details: ${e.message}`);
        return { found: false };
    }
}

// --- Main ---

async function main() {
    console.log(`🔄 Google Maps Retry - INVALID_GENERIC Institutions`);
    console.log(`   Using proven enrichment logic`);
    console.log(`   Output: ${OUTPUT_FILE}\n`);

    // Load verified data to get INVALID_GENERIC list
    if (!fs.existsSync(VERIFIED_FILE)) {
        console.error("Verified file not found:", VERIFIED_FILE);
        return;
    }

    const verifiedData = JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf-8'));
    const genericTargets = verifiedData.filter((v: any) => v.status === 'INVALID_GENERIC');
    const genericIds = new Set(genericTargets.map((t: any) => t.id));

    console.log(`Found ${genericTargets.length} INVALID_GENERIC institutions to retry.\n`);

    if (genericTargets.length === 0) {
        console.log("No INVALID_GENERIC items to retry! 🎉");
        return;
    }

    // Fetch institution details (specifically county) from Supabase
    console.log("Fetching institution details from Supabase...");
    let allInstitutions: any[] = [];
    let pageNum = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('tvet_institutions')
            .select('id, name, county')
            .range(pageNum * pageSize, (pageNum + 1) * pageSize - 1)
            .order('name');

        if (error) {
            console.error("Supabase Error:", error);
            return;
        }

        if (data && data.length > 0) {
            allInstitutions = [...allInstitutions, ...data];
            pageNum++;
            if (data.length < pageSize) hasMore = false;
        } else {
            hasMore = false;
        }
    }

    // Create lookup map
    const instMap = new Map(allInstitutions.map(inst => [inst.id, inst]));

    // Load existing results
    let results: any[] = [];
    if (fs.existsSync(OUTPUT_FILE)) {
        results = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    }

    // Get IDs that were already retried (to skip on resume)
    const alreadyRetriedIds = new Set(
        results.filter((r: any) => r.source === 'google_maps_retry').map((r: any) => r.id)
    );
    console.log(`Already retried: ${alreadyRetriedIds.size} items (will skip).`);

    // Build pending list - institutions that are INVALID_GENERIC and NOT already retried
    const pending = genericTargets
        .filter((t: any) => !alreadyRetriedIds.has(t.id)) // Skip already retried
        .map((t: any) => {
            const inst = instMap.get(t.id);
            return inst ? { ...inst, db_name: t.db_name } : null;
        })
        .filter(Boolean);

    console.log(`Queued ${pending.length} remaining items for retry.\n`);

    const browser = await chromium.launch({
        headless: HEADLESS,
        slowMo: 100,
        args: ['--lang=en-US']
    });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1400, height: 900 },
        locale: 'en-US',
        timezoneId: 'Africa/Nairobi',
        geolocation: { latitude: -1.286389, longitude: 36.817223 },
        permissions: ['geolocation']
    });
    const page = await context.newPage();

    let foundCount = 0;

    for (let i = 0; i < pending.length; i++) {
        const inst = pending[i];

        console.log(`[${i + 1}/${pending.length}] ${inst.name} (${inst.county || '(no county)'})`);

        // Fresh navigation to prevent stale state
        try {
            await page.goto('https://www.google.com/maps?hl=en', { waitUntil: 'load', timeout: 30000 });
            if (i === 0) await handleConsent(page);
        } catch (e) {
            console.log('   Warning: Nav error, retrying...');
            await page.waitForTimeout(2000);
            await page.goto('https://www.google.com/maps?hl=en', { waitUntil: 'load', timeout: 30000 });
        }

        const mapsData = await searchGoogleMaps(inst.name, inst.county || '', page);

        if (mapsData.found) {
            foundCount++;
            console.log(`   ✅ Found: ${mapsData.name || 'Unknown'}`);
            if (mapsData.phone) console.log(`      📞 ${mapsData.phone}`);
            if (mapsData.address) console.log(`      📍 ${mapsData.address}`);
        } else {
            console.log(`   ❌ Not found on Google Maps`);
        }

        // Update existing result or add new
        const existingIdx = results.findIndex((r: any) => r.id === inst.id);
        const resultEntry = {
            id: inst.id,
            name: inst.name,
            county: inst.county,
            google_maps: mapsData,
            source: 'google_maps_retry',
            searched_at: new Date().toISOString()
        };

        if (existingIdx !== -1) {
            results[existingIdx] = resultEntry;
        } else {
            results.push(resultEntry);
        }

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

        // Randomized delay 5-15s
        const delay = Math.floor(Math.random() * 10000) + 5000;
        await new Promise(r => setTimeout(r, delay));
    }

    await browser.close();

    console.log(`\n🎉 Retry complete!`);
    console.log(`   Processed: ${pending.length}`);
    console.log(`   Found: ${foundCount}`);
    console.log(`   Saved to: ${OUTPUT_FILE}`);
}

main().catch(console.error);
