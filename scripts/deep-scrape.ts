import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Ignore SSL

async function main() {
    console.log("Starting Deep Scrape for 50 targets...");
    const retryPath = path.join('scripts', 'data', 'retry_list.json');
    if (!fs.existsSync(retryPath)) { console.error("No retry list"); return; }

    const targets = JSON.parse(fs.readFileSync(retryPath, 'utf-8'));
    const results: any[] = [];

    for (const t of targets) {
        console.log(`Processing ${t.name} (${t.url})...`);
        const url = t.url;
        if (!url) continue;

        let phone = t.phone; // Keep existing if validatable, else scrape
        let email = null; // We might want to refresh email too

        try {
            // 1. Visit Home
            const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36" } });
            if (!res.ok) throw new Error(res.statusText);
            const html = await res.text();
            let $ = cheerio.load(html);

            // Extract from Home first
            let scrapedPhones = extractPhones($('body').text());

            // 2. Find Contact Link
            const contactHref = $('a[href*="contact"]').first().attr('href') ||
                $('a:contains("Contact")').first().attr('href');

            if (contactHref) {
                const contactUrl = new URL(contactHref, url).toString();
                console.log(`   Following: ${contactUrl}`);
                try {
                    const cRes = await fetch(contactUrl, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "Mozilla/5.0" } });
                    if (cRes.ok) {
                        const cHtml = await cRes.text();
                        const c$ = cheerio.load(cHtml);
                        const cPhones = extractPhones(c$('body').text());
                        scrapedPhones = [...scrapedPhones, ...cPhones];
                    }
                } catch (e) { console.log("   Contact page fetch failed"); }
            }

            // 3. Normalize & Pick Best
            // Prefer +254...
            // If existing phone starts with 07/01, normalize it too
            if (phone && (phone.startsWith('07') || phone.startsWith('01'))) {
                scrapedPhones.push(phone.replace(/^0/, '+254 '));
            }

            // Filter valid
            const validPhones = scrapedPhones.map(p => normalizePhone(p)).filter(p => p && (p.startsWith('+254')));
            const uniquePhones = [...new Set(validPhones)];

            if (uniquePhones.length > 0) {
                phone = uniquePhones[0]; // Pick first valid
                console.log(`   Resolved Phone: ${phone}`);
            } else {
                console.log("   No valid phones found.");
            }

        } catch (e: any) {
            console.error(`   Error: ${e.message}`);
        }

        if (phone && phone !== t.phone) {
            results.push({ id: t.id, phone: phone });
        }
    }

    const outPath = path.join('scripts', 'data', 'deep_scrape_results.json');
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log(`Saved ${results.length} improved profiles.`);
}

function extractPhones(text: string): string[] {
    // Regex for +254..., 07..., 01...
    // Matches: +254 712 345678, 0712 345 678, 020 ...
    const matches = text.match(/(\+254\s?\d{3}\s?\d{3}\s?\d{3}|\+254\d{9}|0[17]\d{8}|020\s?\d{7})/g);
    return matches || [];
}

function normalizePhone(p: string): string | null {
    p = p.replace(/\s+/g, '');
    if (p.startsWith('+254')) return `+254 ${p.substring(4, 7)} ${p.substring(7, 10)} ${p.substring(10)}`;
    if (p.startsWith('0')) return `+254 ${p.substring(1, 4)} ${p.substring(4, 7)} ${p.substring(7)}`; // 07xx -> +254 7xx
    return null;
}

main();
