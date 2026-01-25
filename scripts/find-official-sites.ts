
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INPUT_FILE = path.join(__dirname, 'data', 'tvet_urls_found.json');
const OUTPUT_FILE = path.join(__dirname, 'data', 'tvet_official_search.json');
const HEADLESS = false;
const DELAY_BETWEEN_SEARCHES = 3000;

// Directory domains to EXCLUDE when looking for official sites
const DIRECTORY_DOMAINS = [
    'education.co.ke',
    'colleges.co.ke',
    'angazetu.com',
    'kenyaplex.com',
    'kenyaeducationguide.com',
    'educationnewshub.co.ke',
    'facebook.com',
    'twitter.com',
    'instagram.com',
    'linkedin.com'
];

// Official domain extensions to INCLUDE (in priority order)
const OFFICIAL_EXTENSIONS = ['.ac.ke', '.co.ke', '.com', '.org', '.net'];

function isDirectoryUrl(url: string): boolean {
    if (!url) return false;
    return DIRECTORY_DOMAINS.some(domain => url.toLowerCase().includes(domain));
}

function generateAbbreviations(name: string): string[] {
    // Generate possible abbreviations from institution name
    const words = name.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(w => w.length > 1);
    const abbrevs: string[] = [];

    // First letters of each word (e.g., "Kenya Medical Training College" -> "kmtc")
    if (words.length >= 2) {
        abbrevs.push(words.map(w => w[0]).join('').toLowerCase());
    }

    // First letters of significant words (skip common words)
    const skipWords = ['of', 'and', 'the', 'for', 'in', 'at', 'to', 'a', 'an', 'training', 'vocational', 'center', 'centre', 'institute', 'college', 'technical'];
    const significantWords = words.filter(w => !skipWords.includes(w.toLowerCase()));
    if (significantWords.length >= 2) {
        abbrevs.push(significantWords.map(w => w[0]).join('').toLowerCase());
    }

    // First word if it's a proper name
    if (words.length > 0 && words[0].length > 3) {
        abbrevs.push(words[0].toLowerCase());
    }

    return [...new Set(abbrevs)]; // Remove duplicates
}

function scoreUrl(url: string, institutionName: string, abbreviations: string[]): number {
    const urlLower = url.toLowerCase();
    const nameLower = institutionName.toLowerCase();
    let score = 0;

    // Check for official domain extensions (higher score for .ac.ke)
    if (urlLower.includes('.ac.ke')) score += 50;
    else if (urlLower.includes('.co.ke')) score += 40;
    else if (urlLower.includes('.com')) score += 30;
    else if (urlLower.includes('.org')) score += 25;
    else if (urlLower.includes('.net')) score += 20;

    // Check if URL contains abbreviation
    for (const abbrev of abbreviations) {
        if (abbrev.length >= 3 && urlLower.includes(abbrev)) {
            score += 30;
            break;
        }
    }

    // Check if URL contains significant words from institution name
    const significantWords = nameLower.split(/\s+/).filter(w => w.length > 4);
    for (const word of significantWords) {
        if (urlLower.includes(word)) {
            score += 10;
        }
    }

    return score;
}

async function searchForOfficialSite(institutionName: string, county: string, page: any): Promise<{ url: string | null, score: number }> {
    // More targeted search for official website
    const query = `"${institutionName}" Kenya official website`;

    try {
        await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await page.waitForSelector('.result', { timeout: 10000 });

        // Get first 10 results
        const rawUrls = await page.evaluate(() => {
            const links = document.querySelectorAll('.result__a');
            const urls: string[] = [];
            links.forEach((link, i) => {
                if (i < 10) {
                    urls.push((link as HTMLAnchorElement).href);
                }
            });
            return urls;
        });

        // Decode DDG redirect URLs
        const urls = rawUrls.map(url => {
            if (url.includes('duckduckgo.com/l/?')) {
                const urlMatch = url.match(/uddg=([^&]+)/);
                if (urlMatch) {
                    return decodeURIComponent(urlMatch[1]);
                }
            }
            return url;
        });

        // Filter out directory sites and score remaining
        const abbreviations = generateAbbreviations(institutionName);
        const candidates = urls
            .filter(url => !isDirectoryUrl(url))
            .map(url => ({ url, score: scoreUrl(url, institutionName, abbreviations) }))
            .filter(c => c.score > 0)
            .sort((a, b) => b.score - a.score);

        if (candidates.length > 0) {
            return candidates[0];
        }

        return { url: null, score: 0 };

    } catch (e: any) {
        console.error(`   Search error: ${e.message}`);
        return { url: null, score: 0 };
    }
}

async function main() {
    console.log(`🔍 Searching for Official Websites (Improved Algorithm)...`);
    console.log(`   - Includes: .ac.ke, .co.ke, .com, .org, .net`);
    console.log(`   - Checks 10 results per institution`);
    console.log(`   - Prioritizes URLs with institution abbreviations`);
    console.log(`   Input: ${INPUT_FILE}`);
    console.log(`   Output: ${OUTPUT_FILE}\n`);

    if (!fs.existsSync(INPUT_FILE)) {
        console.log("No URLs file found. Run find-tvet-urls.ts first.");
        return;
    }

    const allUrls = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));

    // Filter for directory-listed institutions only
    const directoryListed = allUrls.filter((item: any) => isDirectoryUrl(item.website));
    console.log(`Found ${directoryListed.length} directory-listed institutions to re-search.\n`);

    // Load existing results
    let results: any[] = [];
    if (fs.existsSync(OUTPUT_FILE)) {
        results = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
        console.log(`Loaded ${results.length} existing results.\n`);
    }
    const processedIds = new Set(results.map((r: any) => r.id));

    // Launch browser
    const browser = await chromium.launch({ headless: HEADLESS, slowMo: 100 });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    let foundCount = 0;

    for (let i = 0; i < directoryListed.length; i++) {
        const item = directoryListed[i];

        if (processedIds.has(item.id)) {
            continue;
        }

        const abbreviations = generateAbbreviations(item.name);
        console.log(`[${i + 1}/${directoryListed.length}] ${item.name}`);
        console.log(`   Abbreviations: ${abbreviations.join(', ') || 'none'}`);
        console.log(`   Directory URL: ${item.website}`);

        const { url: officialUrl, score } = await searchForOfficialSite(item.name, item.county || '', page);

        if (officialUrl) {
            foundCount++;
            console.log(`   ✅ Official found (score: ${score}): ${officialUrl}`);
        } else {
            console.log(`   ❌ No official site found`);
        }

        results.push({
            id: item.id,
            name: item.name,
            county: item.county,
            abbreviations,
            directory_url: item.website,
            official_url: officialUrl,
            score,
            searched_at: new Date().toISOString()
        });

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_SEARCHES));
    }

    await browser.close();

    console.log(`\n🎉 Official Site Search complete!`);
    console.log(`   Total searched: ${results.length}`);
    console.log(`   Official sites found: ${foundCount}`);
    console.log(`   Saved to: ${OUTPUT_FILE}`);
}

main().catch(console.error);
