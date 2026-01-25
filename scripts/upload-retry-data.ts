/**
 * Reclassify LOW_CONFIDENCE items and upload to database
 * 
 * Moves specific items to VALID_HIGH or POTENTIAL_AFFILIATION based on user review,
 * then uploads approved data to database with appropriate disclaimers.
 * 
 * Database Schema:
 * - google_maps_data: JSON column for all scraped data
 * - phone, town, website: direct contact columns
 * - verified_at, source_type, source_url, verification_note: metadata
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

const REPORT_FILE = path.join(__dirname, 'data', 'retry_classification_report.json');
const MAPS_FILE = path.join(__dirname, 'data', 'tvet_google_maps.json');

// Items to move from LOW_CONFIDENCE to VALID_HIGH
const MOVE_TO_HIGH = [
    "Akdogan Glaszner German Training Institute", // #5 - found AG German Institute
    "Clinical Mastery Training Institute", // #32 - found CM Training Institute
    "GAKOE VOCATIONAL TRAINING CENTER - KIAMBU", // #49 - found Gokoe VTC
    "KAIMOSI FRIENDS NATIONAL POLYTECHNIC", // #72 - found Friends College Kaimosi
    "KATWALA VOCATIONAL TRAINING CENTER", // #91 - found Kawala VTC
    "KENYA METHODIST UNIVERSITY TVET INSTITUTE", // #104 - found KeMU TVET
    "NYS Institute of Business Studies", // #155 - found NYS-IBS
    "Regional College of Management and Accountancy", // #168 - found RCM Online College
    "THE CUK NAIROBI CBD TRAINING INSTITUTE", // #199 - found Co-operative University
];

// Items to move from LOW_CONFIDENCE to POTENTIAL_AFFILIATION
const MOVE_TO_AFFILIATION = [
    "PAC Institute of Technology and Social Studies", // #165 - found Pan Africa Christian University
];

// Standard disclaimer for affiliated entries (as used in existing DB)
const AFFILIATION_DISCLAIMER = "User flagged: Affiliated Institute / Business / Location";

async function main() {
    console.log("🔧 Reclassifying LOW_CONFIDENCE items based on user review...\n");

    // Load classification data
    const classData = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8'));
    const mapsData = JSON.parse(fs.readFileSync(MAPS_FILE, 'utf-8'));

    // Create maps lookup
    const mapsLookup = new Map(mapsData.filter((m: any) => m.source === 'google_maps_retry').map((m: any) => [m.id, m]));

    let movedToHigh = 0;
    let movedToAffiliation = 0;

    const toUpload: any[] = [];
    const affiliationsToUpload: any[] = [];

    for (const item of classData) {
        // Reclassify LOW_CONFIDENCE → VALID_HIGH
        if (MOVE_TO_HIGH.includes(item.db_name) && item.status === 'RETRY_LOW_CONFIDENCE') {
            console.log(`✅ → VALID_HIGH: ${item.db_name}`);
            console.log(`   Found: ${item.retry_scraped_name}`);
            item.status = 'RETRY_VALID_HIGH';
            item.notes = 'User approved: moved from LOW_CONFIDENCE';
            movedToHigh++;
            toUpload.push(item);
        }

        // Reclassify LOW_CONFIDENCE → AFFILIATION
        if (MOVE_TO_AFFILIATION.includes(item.db_name) && item.status === 'RETRY_LOW_CONFIDENCE') {
            console.log(`🏢 → AFFILIATION: ${item.db_name}`);
            console.log(`   Found: ${item.retry_scraped_name}`);
            item.status = 'RETRY_POTENTIAL_AFFILIATION';
            item.notes = AFFILIATION_DISCLAIMER;
            movedToAffiliation++;
            affiliationsToUpload.push(item);
        }

        // Also collect existing VALID_HIGH for upload
        if (item.status === 'RETRY_VALID_HIGH') {
            toUpload.push(item);
        }

        // Collect existing POTENTIAL_AFFILIATION for upload
        if (item.status === 'RETRY_POTENTIAL_AFFILIATION') {
            affiliationsToUpload.push(item);
        }
    }

    // Save updated classification
    fs.writeFileSync(REPORT_FILE, JSON.stringify(classData, null, 2));

    console.log(`\n✅ Moved ${movedToHigh} items to VALID_HIGH`);
    console.log(`🏢 Moved ${movedToAffiliation} items to POTENTIAL_AFFILIATION`);

    // Re-count categories
    const stats: { [key: string]: number } = {};
    for (const item of classData) {
        stats[item.status] = (stats[item.status] || 0) + 1;
    }

    console.log("\n📊 Updated Classification Summary:");
    for (const [status, count] of Object.entries(stats).sort()) {
        console.log(`   ${status}: ${count}`);
    }

    // Deduplicate toUpload (remove items that are in affiliationsToUpload)
    const affiliationIds = new Set(affiliationsToUpload.map(a => a.id));
    const validHighOnly = toUpload.filter(item => !affiliationIds.has(item.id));

    console.log(`\n🚀 Uploading to Database...`);
    console.log(`   VALID_HIGH entries: ${validHighOnly.length}`);
    console.log(`   AFFILIATION entries: ${affiliationsToUpload.length}`);

    let successCount = 0;
    let errorCount = 0;

    // Upload VALID_HIGH entries
    for (const item of validHighOnly) {
        const mapsEntry = mapsLookup.get(item.id);
        if (!mapsEntry || !mapsEntry.google_maps) continue;

        const gm = mapsEntry.google_maps;

        // Construct update object following existing schema pattern
        const updates: any = {
            verified_at: new Date().toISOString(),
            source_type: 'google_maps_retry',
            source_url: gm.maps_link,
            google_maps_data: {
                place_name: gm.name || item.retry_scraped_name,
                link: gm.maps_link,
                scraped_data_match_status: 'RETRY_VALID_HIGH'
            }
        };

        // Update direct contact columns
        if (gm.phone) updates.phone = gm.phone;
        if (gm.address) updates.town = gm.address; // address → town column
        if (gm.website) updates.website = gm.website;

        const { error } = await supabase
            .from('tvet_institutions')
            .update(updates)
            .eq('id', item.id);

        if (error) {
            console.error(`   ❌ Error updating ${item.db_name}: ${error.message}`);
            errorCount++;
        } else {
            successCount++;
        }
    }

    // Upload AFFILIATION entries with disclaimer
    for (const item of affiliationsToUpload) {
        const mapsEntry = mapsLookup.get(item.id);
        if (!mapsEntry || !mapsEntry.google_maps) continue;

        const gm = mapsEntry.google_maps;

        // Construct update object with affiliation metadata
        // Note: verification_note goes INSIDE google_maps_data, not as a top-level column
        const updates: any = {
            verified_at: new Date().toISOString(),
            source_type: 'google_maps_manual_affiliation',
            source_url: gm.maps_link,
            google_maps_data: {
                place_name: gm.name || item.retry_scraped_name,
                link: gm.maps_link,
                scraped_data_match_status: 'AFFILIATION_APPROVED',
                verification_note: AFFILIATION_DISCLAIMER,
                needs_verification: true
            }
        };

        // Update direct contact columns
        if (gm.phone) updates.phone = gm.phone;
        if (gm.address) updates.town = gm.address;
        if (gm.website) updates.website = gm.website;

        const { error } = await supabase
            .from('tvet_institutions')
            .update(updates)
            .eq('id', item.id);

        if (error) {
            console.error(`   ❌ Error updating affiliation ${item.db_name}: ${error.message}`);
            errorCount++;
        } else {
            successCount++;
        }
    }

    console.log(`\n✅ Database upload complete!`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Classification saved to: ${REPORT_FILE}`);
}

main().catch(console.error);
