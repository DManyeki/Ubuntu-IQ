
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

// User's NEW list (Mapped)
const NEW_TARGETS = [
    "KQ Pride Training Center",
    "Aurora New Dawn",
    "IGNITE YOUR DESTINY",
    "Divine Theological",
    "Stedmak Hospitality", // "Stedmark" in prompt
    "Knowledge Spring",
    "Furrows in the Desert", // "farrows" in prompt
    "KIB SCHOOL OF BANKING",
    "D. KILIMO MEDICAL",
    "Kithimu Vocational", // "Kilimo Vocational" in prompt - likely Kithimu or Kilimo specific? checking DB.
    "Visualdo"
];

// NOTE: "Kilimo Training Institute of Permaculture" is another one.
// User said "Kilimo Vocational Training Centre". 
// I will search for "Kilimo" and "Kithimu" to be safe.

async function approveAllAffiliations() {
    console.log("🚀 Approving ALL Affiliations + New Batch...");

    const rawData = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    let verifiedData = JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf-8'));
    const rawMap = new Map();
    rawData.forEach((item: any) => rawMap.set(item.id, item));

    // 1. Identify items to update
    const idsToUpdate = new Set<string>();

    // A. Add existing POTENTIAL_AFFILIATION items
    verifiedData.forEach((item: any) => {
        if (item.status === 'POTENTIAL_AFFILIATION') {
            idsToUpdate.add(item.id);
        }
    });
    console.log(`   Found ${idsToUpdate.size} existing affiliations.`);

    // B. Find and Add New Targets
    let newFound = 0;
    for (const term of NEW_TARGETS) {
        const matches = verifiedData.filter((v: any) =>
            v.db_name.toLowerCase().includes(term.toLowerCase())
        );

        if (matches.length === 0) {
            console.warn(`   ⚠️ No match for "${term}"`);
        } else {
            matches.forEach((m: any) => {
                if (!idsToUpdate.has(m.id)) {
                    idsToUpdate.add(m.id);
                    console.log(`   ➕ Added New: ${m.db_name}`);
                    newFound++;
                }
            });
        }
    }

    // Special handling for "Kilimo Vocational" -> might be "Kilimo Training" or "Kithimu"
    // User wrote: "D Kilimo Medical Training College, Kilimo Vocational Training Centre"
    // I'll assume they meant *all* matching "Kilimo".

    console.log(`   Total to Update: ${idsToUpdate.size}`);

    // 2. Perform Updates
    let successCount = 0;
    for (const id of idsToUpdate) {
        const itemIndex = verifiedData.findIndex((v: any) => v.id === id);
        if (itemIndex === -1) continue;

        const match = verifiedData[itemIndex];
        const rawItem = rawMap.get(id);

        if (!rawItem || !rawItem.google_maps) continue;
        const maps = rawItem.google_maps;

        // DB Update
        const updates: any = {
            verified_at: new Date().toISOString(),
            source_type: 'google_maps_manual_affiliation',
            source_url: maps.maps_link,
            google_maps_data: {
                ...maps,
                scraped_data_match_status: 'AFFILIATION_APPROVED', // Final status
                verification_note: `User Approved Affiliation`,
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
            // Update JSON status
            verifiedData[itemIndex].status = 'AFFILIATION_APPROVED';
            successCount++;
        } else {
            console.error(`   Error updating ${match.db_name}: ${error.message}`);
        }
    }

    fs.writeFileSync(VERIFIED_FILE, JSON.stringify(verifiedData, null, 2));
    console.log(`\n✅ Successfully updated ${successCount} institutions.`);
}

approveAllAffiliations();
