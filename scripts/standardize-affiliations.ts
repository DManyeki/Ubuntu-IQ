
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RAW_FILE = path.join(__dirname, 'data', 'tvet_google_maps.json');
const VERIFIED_FILE = path.join(__dirname, 'data', 'tvet_verified_enrichment.json');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// 1. Items to specifically adding now
const NEW_ADDITIONS = ["Elwak Vocational"];

async function standardize() {
    console.log("🔄 Standardizing Affiliation Notes & Adding Elwak...");

    const rawData = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    let verifiedData = JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf-8'));
    const rawMap = new Map();
    rawData.forEach((item: any) => rawMap.set(item.id, item));

    // Identify all items currently marked as approved affiliation OR matching the new addition
    const idsToUpdate = new Set<string>();

    verifiedData.forEach((item: any) => {
        // Existing Approvals
        if (item.status === 'AFFILIATION_APPROVED' || item.status === 'MANUAL_APPROVAL') {
            // We only want to update the disclaimer for "Likely Affiliations" that we moved.
            // But since we merged them, we might overwrite "Manual Approval".
            // User asked specifically for "Likely Affiliations Disclaimer".
            // I will target only those that were 'AFFILIATION_APPROVED' (which includes the batch of 50).
            if (item.status === 'AFFILIATION_APPROVED') {
                idsToUpdate.add(item.id);
            }
        }

        // New Addition
        if (NEW_ADDITIONS.some(t => item.db_name.toLowerCase().includes(t.toLowerCase()))) {
            idsToUpdate.add(item.id);
            console.log(`   ➕ Found Elwak: ${item.db_name}`);
        }
    });

    console.log(`   Updating ${idsToUpdate.size} records with uniform disclaimer...`);

    let successCount = 0;
    for (const id of idsToUpdate) {
        const itemIndex = verifiedData.findIndex((v: any) => v.id === id);
        if (itemIndex === -1) continue;

        const rawItem = rawMap.get(id);
        if (!rawItem || !rawItem.google_maps) continue;
        const maps = rawItem.google_maps;

        // Specific Disclaimer Request: "needs verification" 'affiliated institutes' or 'business or location'
        const disclaimer = "User flagged: Affiliated Institute / Business / Location";

        const updates: any = {
            verified_at: new Date().toISOString(),
            source_type: 'google_maps_manual_affiliation',
            source_url: maps.maps_link,
            google_maps_data: {
                ...maps,
                scraped_data_match_status: 'AFFILIATION_APPROVED',
                verification_note: disclaimer,
                needs_verification: true
            }
        };

        if (maps.phone) updates.phone = maps.phone;
        if (maps.address) updates.town = maps.address;
        if (maps.website) updates.website = maps.website;

        const { error } = await supabase
            .from('tvet_institutions')
            .update(updates)
            .eq('id', id);

        if (!error) {
            verifiedData[itemIndex].status = 'AFFILIATION_APPROVED';
            successCount++;
        } else {
            console.error(`   Error updating ${verifiedData[itemIndex].db_name}:`, error.message);
        }
    }

    fs.writeFileSync(VERIFIED_FILE, JSON.stringify(verifiedData, null, 2));
    console.log(`\n✅ Updated ${successCount} items with disclaimer: "${"User flagged: Affiliated Institute / Business / Location"}"`);
}

standardize();
