
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

// User's specific list (Mapped to DB/Scraped name fragments)
const USER_AFFILIATION_TARGETS = [
    "Tender Touch Homecare",
    "Danid Training Institute", // User typed "Daneed"
    "Bungule Vocational Training Center",
    "Uhai Christian College",
    "Kandisi Skills Capacity",
    "Ujuzi Fursa Africa",
    "Stedmak Hospitality", // User typed "Stedmark"
    "PUEA TVET Institute", // User typed "PUEA Tibet"
    "Vessel of Hope",
    "Doan Education Institute",
    "Skyview International",
    "Sauti Kuu Resource",
    "Kit Mikayi Technical",
    "Visualdo Institute"
];

async function processAffiliations() {
    console.log(`🤝 Processing ${USER_AFFILIATION_TARGETS.length} User-Defined Affiliations...`);

    if (!fs.existsSync(RAW_FILE) || !fs.existsSync(VERIFIED_FILE)) {
        console.error("Missing Data Files.");
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    const verifiedData = JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf-8'));
    const rawMap = new Map();
    rawData.forEach((item: any) => rawMap.set(item.id, item));

    let updatedCount = 0;

    for (const term of USER_AFFILIATION_TARGETS) {
        // Find in Verified Data
        const matchIndex = verifiedData.findIndex((v: any) =>
            v.db_name.toLowerCase().includes(term.toLowerCase())
        );

        if (matchIndex === -1) {
            console.warn(`⚠️ Could not find match for "${term}"`);
            continue;
        }

        const match = verifiedData[matchIndex];
        const rawItem = rawMap.get(match.id);

        if (!rawItem || !rawItem.google_maps) {
            console.warn(`No Google Maps data for ${match.db_name}`);
            continue;
        }

        const maps = rawItem.google_maps;

        // 1. Update Database
        const updates: any = {
            verified_at: new Date().toISOString(),
            source_type: 'google_maps_manual_affiliation',
            source_url: maps.maps_link,
            google_maps_data: {
                ...maps,
                scraped_data_match_status: 'USER_FLAGGED_AFFILIATION',
                verification_note: `User flagged: Affiliated Institute / Business / Location`,
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
            console.error(`❌ DB Error ${match.db_name}:`, error.message);
        } else {
            console.log(`✅ DB Updated: ${match.db_name}`);

            // 2. Update Verified JSON Status (For Report)
            verifiedData[matchIndex].status = 'POTENTIAL_AFFILIATION';
            verifiedData[matchIndex].notes = '(User Flagged Affiliation)';
            updatedCount++;
        }
    }

    // Save Updated JSON for Report Generator
    fs.writeFileSync(VERIFIED_FILE, JSON.stringify(verifiedData, null, 2));
    console.log(`\n💾 Saved updated status to JSON. Total processed: ${updatedCount}`);
}

processAffiliations();
