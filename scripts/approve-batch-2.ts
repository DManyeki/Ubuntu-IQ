
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

// User's requested list (Batch 2) - Mapped to DB Name fragments
const BATCH_2_TARGETS = [
    "Lusaka Institute of Science and Technology",
    "Kairo College of Leadership and Hospitality",
    "Sipet College of Professional Studies",
    "Headway College", // User said "Headwig"
    "Frelearn Training College", // User said "Freelance"
    "RAHMA LUMINOUS COLLEGE",
    "MIRERA VOCATIONAL TRAINING CENTER", // User said "Mirrera"
    "Igembe Central Technical",
    "MANNA COLLEGE",
    "Saku Technical and Vocational College",
    "Marere Technical and Vocational College",
    "Yatta Technical and Vocational College"
];

async function approveBatch2() {
    console.log(`🕵️ Processing Batch 2 Approvals (${BATCH_2_TARGETS.length} items)...`);

    const rawData = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    const verifiedData = JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf-8'));
    const rawMap = new Map();
    rawData.forEach((item: any) => rawMap.set(item.id, item));

    let successCount = 0;

    for (const term of BATCH_2_TARGETS) {
        // loose match
        const match = verifiedData.find((v: any) => v.db_name.toLowerCase().includes(term.toLowerCase()));

        if (!match) {
            console.warn(`⚠️ Could not find match for "${term}"`);
            continue;
        }

        const rawItem = rawMap.get(match.id);
        if (!rawItem || !rawItem.google_maps) continue;

        const maps = rawItem.google_maps;

        // Update DB
        const updates: any = {
            verified_at: new Date().toISOString(),
            source_type: 'google_maps_manual_approval',
            source_url: maps.maps_link,
            google_maps_data: {
                ...maps,
                scraped_data_match_status: 'MANUAL_APPROVAL',
                verification_note: `Manually approved by user (Batch 2)`,
                needs_verification: true
            }
        };

        if (maps.phone) updates.phone = maps.phone;
        if (maps.address) updates.town = maps.address;
        if (maps.website) updates.website = maps.website;

        const { error } = await supabase
            .from('tvet_institutions')
            .update(updates)
            .eq('id', match.id);

        if (error) {
            console.error(`❌ Error updating ${match.db_name}:`, error.message);
        } else {
            console.log(`✅ Approved: ${match.db_name}`);
            successCount++;
        }
    }

    console.log(`\nBatch 2 Complete. ${successCount}/${BATCH_2_TARGETS.length} updated.`);
}

approveBatch2();
