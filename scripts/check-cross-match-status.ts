
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VERIFIED_FILE = path.join(__dirname, 'data', 'tvet_verified_enrichment.json');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCrossMatchStatus() {
    console.log("🔍 Checking Database Status for Cross-Matched Items...\n");

    if (!fs.existsSync(VERIFIED_FILE)) {
        console.error("Verified data file not found.");
        return;
    }

    const verifiedData = JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf-8'));
    const crossMatches = verifiedData.filter((i: any) => i.status === 'MISMATCH_CROSS_MATCH');

    console.log(`Found ${crossMatches.length} Cross-Matches in verification file.`);

    if (crossMatches.length === 0) return;

    const idsToCheck = crossMatches.map((i: any) => i.id);

    // Fetch current state from DB
    const { data: dbItems, error } = await supabase
        .from('tvet_institutions')
        .select('id, name, google_maps_data, town, phone')
        .in('id', idsToCheck);

    if (error) {
        console.error("Supabase Error:", error);
        return;
    }

    let enrichedCount = 0;
    let emptyCount = 0;

    console.log(`Fetched ${dbItems.length} records from DB.\n`);
    console.log(`| Status | Institution Name | Analysis |`);
    console.log(`| :--- | :--- | :--- |`);

    dbItems.forEach(item => {
        const isEnriched = !!item.google_maps_data || !!item.town;
        if (isEnriched) enrichedCount++;
        else emptyCount++;

        const statusIcon = isEnriched ? "⚠️ Enriched (Unexpected?)" : "✅ Empty";
        // console.log(`${statusIcon} ${item.name}`); // Too noisy for all
    });

    // Sample output
    dbItems.slice(0, 10).forEach(item => {
        const hasMaps = !!item.google_maps_data;
        const icon = hasMaps ? "⚠️" : "✅";
        console.log(`${icon} ${item.name.padEnd(40)} | Maps Data: ${hasMaps ? 'PRESENT' : 'NULL'}`);
    });

    console.log(`\n------------------------------------------------`);
    console.log(`📊 Summary for ${crossMatches.length} Cross-Matched Items:`);
    console.log(`   ✅ Empty / Not Enriched: ${emptyCount}`);
    console.log(`   ⚠️ Enriched (Has Data):   ${enrichedCount}`);

    if (enrichedCount === 0) {
        console.log(`\n✨ CONFIRMED: All cross-matched items were successfully SKIPPED during update.`);
    } else {
        console.log(`\n⚠️ WARNING: Some items have data. They might have been updated manually or matched correctly in a previous run.`);
    }
}

checkCrossMatchStatus();
