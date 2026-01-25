
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RAW_FILE = path.join(__dirname, 'data', 'tvet_google_maps.json');
const VERIFIED_FILE = path.join(__dirname, 'data', 'tvet_verified_enrichment.json');

// --- Setup ---
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateInstitutions() {
    console.log(`💾 Updating TVET Institutions with VERIFIED Google Maps Data`);

    if (!fs.existsSync(RAW_FILE) || !fs.existsSync(VERIFIED_FILE)) {
        console.error("Required data files not found!");
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    const verifiedData = JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf-8'));

    // Create Map for quick lookup of raw data
    const rawMap = new Map();
    rawData.forEach((item: any) => rawMap.set(item.id, item));

    // Filter for VALID items
    const validItems = verifiedData.filter((v: any) =>
        ['VALID_HIGH', 'VALID_MEDIUM', 'VALID_CAMPUS'].includes(v.status)
    );

    console.log(`   Total Verified Records: ${verifiedData.length}`);
    console.log(`   Valid to Update: ${validItems.length}`);

    let successCount = 0;
    let errorCount = 0;

    for (const vItem of validItems) {
        const rawItem = rawMap.get(vItem.id);
        if (!rawItem || !rawItem.google_maps) continue;

        const maps = rawItem.google_maps;

        // Construct update object
        const updates: any = {
            verified_at: new Date().toISOString(),
            source_type: 'google_maps',
            source_url: maps.maps_link,
            google_maps_data: {
                place_name: maps.name,
                rating: maps.rating,
                reviews: maps.review_count,
                coordinates: maps.coordinates,
                link: maps.maps_link,
                scraped_data_match_status: vItem.status // Store why we trusted this match
            }
        };

        // Enrich fields if present (overwrite only if null? No, user implied enrichment means filling gaps or updating)
        // We will overwrite to ensure latest data, assuming Google Maps is "fresher" for contacts
        if (maps.phone) updates.phone = maps.phone;
        if (maps.address) updates.town = maps.address;
        if (maps.website) updates.website = maps.website;

        const { error } = await supabase
            .from('tvet_institutions')
            .update(updates)
            .eq('id', vItem.id);

        if (error) {
            console.error(`   Error updating ${vItem.db_name}: ${error.message}`);
            errorCount++;
        } else {
            // successCount++; // Silent success to reduce log noise
            process.stdout.write('.'); // Progress indicator
            successCount++;
        }
    }

    console.log(`\n\n🎉 Update Complete!`);
    console.log(`   Updated: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
}

updateInstitutions().catch(console.error);
