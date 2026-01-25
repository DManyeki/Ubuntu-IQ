
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

// User's requested list (fuzzy terms mapped to DB Names)
const MANUAL_TARGETS = [
    "African Institute of Research and Development Studies", // BUNGOMA
    "AHITI Ndomba",
    "Butsotso Central County Polytechnic",
    "DELIGHT TECHNICAL COLLEGE",
    "Docawood College",
    "ICS Technical College", // "HCS" in user prompt, inferred from context
    "Kenia College",
    "KIPKELION TECHNICAL TRAINING INSTITUTE",
    "KUTRRH Training Institute",
    "LAKE INSTITUTE OF TROPICAL MEDICINE",
    "Medstar Training Institute",
    "NYS Tumaini Agricultural College", // "NYS to Mining"
    "PERFECT INSTITUTE OF TECHNOLOGY",
    "Pretata Institute of Professional Studies",
    "SEKU Mtito Andei TVET Center", // "Seku Mtituandei Tibet"
    "St. Dominics Technical",
    "West Wick College"
];

async function approveManualList() {
    console.log(`🕵️ Processing Manual Approvals for ${MANUAL_TARGETS.length} items...`);

    if (!fs.existsSync(RAW_FILE) || !fs.existsSync(VERIFIED_FILE)) {
        console.error("Required data files not found!");
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    const verifiedData = JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf-8'));

    const rawMap = new Map();
    rawData.forEach((item: any) => rawMap.set(item.id, item));

    // Find IDs based on partial name match in verified (Low Confidence) list
    // We search the 'db_name' in the verified list
    const targetsToUpdate = [];
    const notFound = [];

    for (const term of MANUAL_TARGETS) {
        // Find matching item in Verified List (Low Confidence or Generic)
        const match = verifiedData.find((v: any) =>
            v.db_name.toLowerCase().includes(term.toLowerCase()) &&
            (v.status === 'INVALID_LOW_CONFIDENCE' || v.status === 'INVALID_GENERIC' || v.status === 'MISMATCH_CROSS_MATCH')
        );

        if (match) {
            targetsToUpdate.push({
                term,
                id: match.id,
                db_name: match.db_name,
                scraped_name: match.scraped_name,
                similarity: match.similarity
            });
        } else {
            // Try matching scraped items directly if not found in verified
            notFound.push(term);
        }
    }

    console.log(`   ✅ Matched ${targetsToUpdate.length} records.`);
    if (notFound.length > 0) {
        console.warn(`   ⚠️ Could not find matches for:`, notFound);
    }

    let successCount = 0;

    for (const target of targetsToUpdate) {
        const rawItem = rawMap.get(target.id);
        if (!rawItem || !rawItem.google_maps) {
            console.error(`   ❌ Raw Google Maps data missing for ${target.db_name}`);
            continue;
        }

        const maps = rawItem.google_maps;

        // Perform Update
        const updates: any = {
            verified_at: new Date().toISOString(),
            source_type: 'google_maps_manual_approval',
            source_url: maps.maps_link,
            google_maps_data: {
                place_name: maps.name,
                rating: maps.rating,
                reviews: maps.review_count,
                coordinates: maps.coordinates,
                link: maps.maps_link,

                // --- MANUAL FLAG ---
                scraped_data_match_status: 'MANUAL_APPROVAL',
                verification_note: `Manually approved by user (Similarity: ${Math.round(target.similarity * 100)}%)`,
                needs_verification: true // Requested by user
            }
        };

        if (maps.phone) updates.phone = maps.phone;
        if (maps.address) updates.town = maps.address;
        if (maps.website) updates.website = maps.website;

        const { error } = await supabase
            .from('tvet_institutions')
            .update(updates)
            .eq('id', target.id);

        if (error) {
            console.error(`   Error updating ${target.db_name}: ${error.message}`);
        } else {
            console.log(`   Updated: ${target.db_name} -> ${maps.name}`);
            successCount++;
        }
    }

    console.log(`\n🎉 Manual Update Complete! Successfully updated ${successCount} institutions.`);
}

approveManualList().catch(console.error);
