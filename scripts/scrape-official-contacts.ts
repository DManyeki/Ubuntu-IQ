
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INPUT_FILE = path.join(__dirname, 'data', 'tvet_urls_found.json');
const OUTPUT_FILE = path.join(__dirname, 'data', 'tvet_official_contacts.json');
const CONCURRENCY = 3; // Minimal concurrency to avoid overloading the machine

interface ContactData {
    id: string;
    name: string;
    website: string;
    emails: string[];
    phones: string[];
    source_url: string;
    scraped_at: string;
}

// Regex patterns
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+254|0)(?:7|1)\d{8}|(?:\+254|0)(?:20|41)\d{7}/g;

async function scrapeContacts(page: any, url: string): Promise<{ emails: string[], phones: string[] }> {
    const data = { emails: new Set<string>(), phones: new Set<string>() };

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Extract from body
        const content = await page.content();
        const emails = content.match(EMAIL_REGEX) || [];
        const phones = content.match(PHONE_REGEX) || [];

        emails.forEach(e => data.emails.add(e.toLowerCase()));
        phones.forEach(p => data.phones.add(p.replace(/\D/g, '')));

        // Check for 'Contact Us' link if few details found
        if (data.emails.size === 0 || data.phones.size === 0) {
            const contactLink = page.locator('a:has-text("Contact"), a:has-text("Reach Us")').first();
            if (await contactLink.isVisible()) {
                const contactUrl = await contactLink.getAttribute('href');
                if (contactUrl) {
                    const absoluteUrl = new URL(contactUrl, url).toString();
                    await page.goto(absoluteUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
                    const contactContent = await page.content();
                    const contactEmails = contactContent.match(EMAIL_REGEX) || [];
                    const contactPhones = contactContent.match(PHONE_REGEX) || [];

                    contactEmails.forEach(e => data.emails.add(e.toLowerCase()));
                    contactPhones.forEach(p => data.phones.add(p.replace(/\D/g, '')));
                }
            }
        }

    } catch (e) {
        // Ignore navigation errors
    }

    return {
        emails: Array.from(data.emails),
        phones: Array.from(data.phones)
    };
}

// ... imports kept same ...
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ... contact interface ...

// ... scrapeContacts function kept same ...

async function main() {
    console.log("🌐 Starting Official Website Contact Scraper (Supabase Mode)...");

    // Fetch targets: Has Website, Missing Email
    const { data: institutions, error } = await supabase
        .from('tvet_institutions')
        .select('id, name, website')
        .not('website', 'is', null)
        .is('email', null)
        // Filter out obviously bad websites if possible, e.g. "facebook.com" if we don't want social?
        // For now, take all.
        .limit(500); // Batch size to be safe

    if (error || !institutions) {
        console.error("Error fetching from Supabase:", error);
        return;
    }

    // Filter out generic google searches or directories if present
    const cleanList = institutions.filter(i =>
        i.website &&
        !i.website.includes('google.com/search') &&
        !i.website.includes('education.co.ke') // Directory
    );

    console.log(`Found ${cleanList.length} institutions with websites but no email.`);

    const browser = await chromium.launch({ headless: true });

    let successCount = 0;

    // Process in chunks
    for (let i = 0; i < cleanList.length; i += CONCURRENCY) {
        const batch = cleanList.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(async (inst: any) => {
            const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' });
            const page = await context.newPage();

            // Block images/fonts
            await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', route => route.abort());

            console.log(`Scraping: ${inst.name} (${inst.website})`);
            const contacts = await scrapeContacts(page, inst.website);

            if (contacts.emails.length > 0 || contacts.phones.length > 0) {
                console.log(`   ✅ Found for ${inst.name}: ${contacts.emails.length} emails`);

                // Update Supabase immediately
                const updates: any = {};
                if (contacts.emails.length > 0) updates.email = contacts.emails[0]; // Take first one
                // We could also append phones if missing, but we trust Google Maps phones more usually? 
                // Let's only fill phone if we have none.
                // Actually, let's just save email for now as that's the primary gap.

                const { error: updateError } = await supabase
                    .from('tvet_institutions')
                    .update(updates)
                    .eq('id', inst.id);

                if (!updateError) successCount++;
            } else {
                console.log(`   ❌ No contacts found`);
            }

            await context.close();
        }));
    }

    await browser.close();
    console.log(`\n🎉 Scraper Complete! Updated ${successCount} records.`);
}

main().catch(console.error);
