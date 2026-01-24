/**
 * Reclassify and upload selected "mistaken finds" to the database.
 * 
 * User has manually reviewed mistaken_finds.md and identified:
 * - Items to move to VALID_HIGH (confirmed correct matches)
 * - Items needing review (NEEDS_REVIEW status)
 * - Items that are affiliations (POTENTIAL_AFFILIATION)
 * 
 * Database schema for updates:
 * - phone, town, website: direct columns
 * - google_maps_data: JSON column containing scraped data + verification_note + needs_verification
 * - source_url: maps link
 * - source_type: google_maps_verified / google_maps_manual_affiliation / google_maps_needs_review
 * - verified_at: timestamp
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Row numbers from mistaken_finds.md (1-indexed based on table rows)
// These correspond to array indices in mistaken_finds.json (0-indexed)
const MOVE_TO_VALID_HIGH = [3, 10, 18, 20, 21, 22, 23, 30, 35, 38, 43, 46, 49, 103, 127, 145, 214, 215, 269, 272];
const NEEDS_REVIEW = [182, 184, 211, 212, 213, 218];
const MOVE_TO_AFFILIATION = [32, 167, 168, 233];

// Disclaimers matching existing patterns
const AFFILIATION_DISCLAIMER = "User flagged: Affiliated Institute / Business / Location";
const NEEDS_REVIEW_NOTE = "User flagged: Needs manual verification";
const VALID_HIGH_NOTE = "User confirmed: Scraped name matches institution";

interface MistakenFind {
    id: string;
    searched_for: string;
    found_instead: string;
    county: string;
    status: string;
    has_phone: boolean;
    has_address: boolean;
    has_website: boolean;
}

interface VerifiedData {
    id: string;
    scraped_name?: string;
    scraped_phone?: string;
    scraped_address?: string;
    scraped_website?: string;
    google_maps_link?: string;
}

async function main() {
    console.log("📋 Processing Mistaken Finds Reclassifications...\n");

    // Load mistaken finds
    const mistakenFile = path.join(__dirname, 'data', 'mistaken_finds.json');
    const mistakenFinds: MistakenFind[] = JSON.parse(fs.readFileSync(mistakenFile, 'utf-8'));
    console.log(`   Loaded ${mistakenFinds.length} mistaken finds`);

    // Load original verified data to get scraped contact info
    const verifiedFile = path.join(__dirname, 'data', 'tvet_verified_enrichment.json');
    const verifiedData = fs.existsSync(verifiedFile)
        ? JSON.parse(fs.readFileSync(verifiedFile, 'utf-8'))
        : [];
    const verifiedMap = new Map(verifiedData.map((v: any) => [v.id, v]));

    // Load retry data for additional contact info
    const retryFile = path.join(__dirname, 'data', 'retry_classification_report.json');
    const retryData = fs.existsSync(retryFile)
        ? JSON.parse(fs.readFileSync(retryFile, 'utf-8'))
        : [];
    const retryMap = new Map(retryData.map((r: any) => [r.id, r]));

    // Load original Google Maps scraped data
    const gmapsFile = path.join(__dirname, 'data', 'tvet_google_maps.json');
    const gmapsData = fs.existsSync(gmapsFile)
        ? JSON.parse(fs.readFileSync(gmapsFile, 'utf-8'))
        : [];
    const gmapsMap = new Map(gmapsData.map((g: any) => [g.name, g]));

    // Convert row numbers to 0-indexed array indices
    const toIndex = (rowNum: number) => rowNum - 1;

    // Collect items to process
    const validHighItems: MistakenFind[] = [];
    const needsReviewItems: MistakenFind[] = [];
    const affiliationItems: MistakenFind[] = [];

    for (const rowNum of MOVE_TO_VALID_HIGH) {
        const idx = toIndex(rowNum);
        if (idx >= 0 && idx < mistakenFinds.length) {
            validHighItems.push(mistakenFinds[idx]);
        } else {
            console.warn(`   ⚠️ Invalid row number: ${rowNum}`);
        }
    }

    for (const rowNum of NEEDS_REVIEW) {
        const idx = toIndex(rowNum);
        if (idx >= 0 && idx < mistakenFinds.length) {
            needsReviewItems.push(mistakenFinds[idx]);
        } else {
            console.warn(`   ⚠️ Invalid row number: ${rowNum}`);
        }
    }

    for (const rowNum of MOVE_TO_AFFILIATION) {
        const idx = toIndex(rowNum);
        if (idx >= 0 && idx < mistakenFinds.length) {
            affiliationItems.push(mistakenFinds[idx]);
        } else {
            console.warn(`   ⚠️ Invalid row number: ${rowNum}`);
        }
    }

    console.log(`\n📊 Items to process:`);
    console.log(`   Valid High: ${validHighItems.length}`);
    console.log(`   Needs Review: ${needsReviewItems.length}`);
    console.log(`   Affiliation: ${affiliationItems.length}`);

    // Helper to get contact data from various sources
    function getContactData(item: MistakenFind): any {
        // First check retry data
        const retryItem = retryMap.get(item.id);
        if (retryItem && (retryItem.retry_phone || retryItem.retry_address || retryItem.retry_website)) {
            return {
                phone: retryItem.retry_phone || null,
                address: retryItem.retry_address || null,
                website: retryItem.retry_website || null,
                link: retryItem.retry_maps_link || null,
                name: retryItem.retry_scraped_name || item.found_instead
            };
        }

        // Check verified data
        const verifiedItem = verifiedMap.get(item.id);
        if (verifiedItem && (verifiedItem.scraped_phone || verifiedItem.scraped_address || verifiedItem.scraped_website)) {
            return {
                phone: verifiedItem.scraped_phone || null,
                address: verifiedItem.scraped_address || null,
                website: verifiedItem.scraped_website || null,
                link: verifiedItem.google_maps_link || null,
                name: verifiedItem.scraped_name || item.found_instead
            };
        }

        // Check original gmaps data by institution name
        const gmapsItem = gmapsMap.get(item.searched_for);
        if (gmapsItem) {
            return {
                phone: gmapsItem.phone || null,
                address: gmapsItem.address || null,
                website: gmapsItem.website || null,
                link: gmapsItem.google_maps_link || null,
                name: gmapsItem.name || item.found_instead
            };
        }

        return {
            phone: null,
            address: null,
            website: null,
            link: null,
            name: item.found_instead
        };
    }

    // Upload functions
    async function uploadValidHigh(items: MistakenFind[]) {
        console.log(`\n🔄 Uploading ${items.length} Valid High items...`);
        let success = 0;
        let failed = 0;

        for (const item of items) {
            const contactData = getContactData(item);

            const updates: any = {
                verified_at: new Date().toISOString(),
                source_type: 'google_maps_verified',
                google_maps_data: {
                    name: contactData.name,
                    phone: contactData.phone,
                    address: contactData.address,
                    website: contactData.website,
                    link: contactData.link,
                    verification_note: VALID_HIGH_NOTE,
                    scraped_at: new Date().toISOString()
                }
            };

            // Add top-level fields
            if (contactData.phone) updates.phone = contactData.phone;
            if (contactData.address) updates.town = contactData.address;
            if (contactData.website) updates.website = contactData.website;
            if (contactData.link) updates.source_url = contactData.link;

            const { error } = await supabase
                .from('tvet_institutions')
                .update(updates)
                .eq('id', item.id);

            if (error) {
                console.error(`   ❌ Failed: ${item.searched_for} - ${error.message}`);
                failed++;
            } else {
                console.log(`   ✅ Updated: ${item.searched_for}`);
                success++;
            }
        }

        return { success, failed };
    }

    async function uploadNeedsReview(items: MistakenFind[]) {
        console.log(`\n🔄 Uploading ${items.length} Needs Review items...`);
        let success = 0;
        let failed = 0;

        for (const item of items) {
            const contactData = getContactData(item);

            const updates: any = {
                verified_at: new Date().toISOString(),
                source_type: 'google_maps_needs_review',
                google_maps_data: {
                    name: contactData.name,
                    phone: contactData.phone,
                    address: contactData.address,
                    website: contactData.website,
                    link: contactData.link,
                    verification_note: NEEDS_REVIEW_NOTE,
                    needs_verification: true,
                    scraped_at: new Date().toISOString()
                }
            };

            // Add top-level fields
            if (contactData.phone) updates.phone = contactData.phone;
            if (contactData.address) updates.town = contactData.address;
            if (contactData.website) updates.website = contactData.website;
            if (contactData.link) updates.source_url = contactData.link;

            const { error } = await supabase
                .from('tvet_institutions')
                .update(updates)
                .eq('id', item.id);

            if (error) {
                console.error(`   ❌ Failed: ${item.searched_for} - ${error.message}`);
                failed++;
            } else {
                console.log(`   ✅ Updated: ${item.searched_for}`);
                success++;
            }
        }

        return { success, failed };
    }

    async function uploadAffiliations(items: MistakenFind[]) {
        console.log(`\n🔄 Uploading ${items.length} Affiliation items...`);
        let success = 0;
        let failed = 0;

        for (const item of items) {
            const contactData = getContactData(item);

            const updates: any = {
                verified_at: new Date().toISOString(),
                source_type: 'google_maps_manual_affiliation',
                google_maps_data: {
                    name: contactData.name,
                    phone: contactData.phone,
                    address: contactData.address,
                    website: contactData.website,
                    link: contactData.link,
                    verification_note: AFFILIATION_DISCLAIMER,
                    needs_verification: true,
                    scraped_at: new Date().toISOString()
                }
            };

            // Add top-level fields
            if (contactData.phone) updates.phone = contactData.phone;
            if (contactData.address) updates.town = contactData.address;
            if (contactData.website) updates.website = contactData.website;
            if (contactData.link) updates.source_url = contactData.link;

            const { error } = await supabase
                .from('tvet_institutions')
                .update(updates)
                .eq('id', item.id);

            if (error) {
                console.error(`   ❌ Failed: ${item.searched_for} - ${error.message}`);
                failed++;
            } else {
                console.log(`   ✅ Updated: ${item.searched_for}`);
                success++;
            }
        }

        return { success, failed };
    }

    // Show preview first
    console.log("\n📝 Preview of items to upload:\n");

    console.log("=== VALID HIGH (User Confirmed) ===");
    validHighItems.forEach((item, i) => {
        console.log(`   ${i + 1}. "${item.searched_for}" → "${item.found_instead}"`);
    });

    console.log("\n=== NEEDS REVIEW ===");
    needsReviewItems.forEach((item, i) => {
        console.log(`   ${i + 1}. "${item.searched_for}" → "${item.found_instead}"`);
    });

    console.log("\n=== AFFILIATIONS ===");
    affiliationItems.forEach((item, i) => {
        console.log(`   ${i + 1}. "${item.searched_for}" → "${item.found_instead}"`);
    });

    // Perform uploads
    console.log("\n" + "=".repeat(50));
    console.log("Starting database uploads...");
    console.log("=".repeat(50));

    const validResult = await uploadValidHigh(validHighItems);
    const reviewResult = await uploadNeedsReview(needsReviewItems);
    const affResult = await uploadAffiliations(affiliationItems);

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 UPLOAD SUMMARY");
    console.log("=".repeat(50));
    console.log(`Valid High:   ${validResult.success} success, ${validResult.failed} failed`);
    console.log(`Needs Review: ${reviewResult.success} success, ${reviewResult.failed} failed`);
    console.log(`Affiliations: ${affResult.success} success, ${affResult.failed} failed`);
    console.log(`\nTotal: ${validResult.success + reviewResult.success + affResult.success} updated`);
}

main().catch(console.error);
