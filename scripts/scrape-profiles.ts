import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Ignore SSL errors (for scraping only)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function main() {
    console.log("Fetching institutions with URLs...");
    const { data: institutions } = await supabase
        .from('universities')
        .select('*')
        .not('website', 'is', null)
        .is('description', null); // Optimization: Skip already scraped

    if (!institutions || institutions.length === 0) {
        console.log("No institutions with websites found.");
        return;
    }

    console.log(`Scraping ${institutions.length} sites...`);
    const results: any[] = [];

    for (const inst of institutions) {
        const url = inst.website;
        console.log(`Visiting ${inst.name} (${url})...`);

        try {
            const response = await fetch(url, {
                signal: AbortSignal.timeout(20000), // 20s Timeout
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9"
                }
            });

            if (!response.ok) {
                console.warn(`Failed to fetch ${url}: ${response.status}`);
                continue;
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            // Extract Data
            const description = $('meta[name="description"]').attr('content') ||
                $('meta[property="og:description"]').attr('content') ||
                // Try finding p in About section roughly?
                null;

            const logo = $('meta[property="og:image"]').attr('content') ||
                // Try finding logo img
                $('img[src*="logo"]').first().attr('src') ||
                null;

            // Basic Contact Search (Regex)
            const bodyText = $('body').text();
            const emails = bodyText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
            const phones = bodyText.match(/(\+254\s?\d{3}\s?\d{6}|\d{10})/g);

            const email = emails ? emails[0] : null;
            const phone = phones ? phones[0] : null;

            // Resolve logo URL if relative
            let finalLogo = logo;
            if (logo && !logo.startsWith('http')) {
                try {
                    finalLogo = new URL(logo, url).toString();
                } catch (e) { }
            }

            results.push({
                id: inst.id,
                name: inst.name,
                url: url,
                description: description ? description.trim() : null,
                logo: finalLogo,
                email: email,
                phone: phone
            });

            console.log(`   Found: ${description ? 'Desc' : ''} ${finalLogo ? 'Logo' : ''} ${email ? 'Email' : ''}`);

        } catch (e: any) {
            console.error(`   Error scraping ${inst.name}: ${e.message}`);
        }
    }

    const outPath = path.join('scripts', 'data', 'scraped_profiles.json');
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log(`Saved ${results.length} scraped profiles to ${outPath}`);
}

main();
