/**
 * Populate other_tvets table with discovered institutions
 * These are institutions found during Google Maps scraping that are not in the main database
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface NewInstitution {
    found_name: string;
    searched_for: string;
    county: string;
    source: string;
    phone?: string;
    address?: string;
    website?: string;
    has_phone?: boolean;
    has_address?: boolean;
    has_website?: boolean;
    maps_link?: string;
}

async function main() {
    console.log("🏫 Populating other_tvets table...\n");

    // Load the discovered institutions
    const dataPath = path.join(__dirname, 'data', 'complete_new_institutions.json');
    const institutions: NewInstitution[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    console.log(`Found ${institutions.length} institutions to insert\n`);

    // Load the original Google Maps data for full details
    const gmapsPath = path.join(__dirname, 'data', 'tvet_google_maps.json');
    const gmapsData = JSON.parse(fs.readFileSync(gmapsPath, 'utf-8'));

    // Create lookup by name for Google Maps data
    const gmapsBySearchName = new Map();
    gmapsData.forEach((g: any) => {
        gmapsBySearchName.set(g.name.toLowerCase(), g);
    });

    // Track results
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const inst of institutions) {
        try {
            // Get full Google Maps data if available
            const gmapsEntry = gmapsBySearchName.get(inst.searched_for.toLowerCase());
            const googleMapsData = gmapsEntry?.google_maps || {};

            const record = {
                name: inst.found_name,
                county: inst.county,
                discovered_via: inst.searched_for,
                discovery_source: inst.source,
                phone: inst.phone || (inst.has_phone ? googleMapsData.phone : null),
                address: inst.address || (inst.has_address ? googleMapsData.address : null),
                website: inst.website || (inst.has_website ? googleMapsData.website : null),
                google_maps_link: inst.maps_link || googleMapsData.maps_link,
                google_maps_data: googleMapsData,
                status: 'unverified',
                verification_note: `Discovered when searching for "${inst.searched_for}" in ${inst.county} county`
            };

            // Check if already exists
            const { data: existing } = await supabase
                .from('other_tvets')
                .select('id')
                .eq('name', inst.found_name)
                .eq('county', inst.county)
                .maybeSingle();

            if (existing) {
                console.log(`⏭️  Skipping (exists): ${inst.found_name}`);
                skipped++;
                continue;
            }

            // Insert
            const { error } = await supabase
                .from('other_tvets')
                .insert(record);

            if (error) {
                console.error(`❌ Error inserting ${inst.found_name}:`, error.message);
                errors++;
            } else {
                console.log(`✅ Inserted: ${inst.found_name} (${inst.county})`);
                inserted++;
            }

        } catch (err) {
            console.error(`❌ Error processing ${inst.found_name}:`, err);
            errors++;
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 Summary");
    console.log("=".repeat(50));
    console.log(`✅ Inserted: ${inserted}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📋 Total: ${institutions.length}`);
}

main().catch(console.error);
