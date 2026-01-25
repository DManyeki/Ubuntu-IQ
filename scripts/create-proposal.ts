import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Map from Step 1903 + User Adjustments
const urlMap: Record<string, string> = {
    "Adventist University of Africa": "https://www.aua.ac.ke",
    "Africa Nazarene University": "https://www.anu.ac.ke",
    "Amref International University": "https://www.amref.ac.ke",
    "Daystar University": "https://www.daystar.ac.ke",
    "Egerton University": "https://www.egerton.ac.ke",
    "Great Lakes University of Kisumu": "https://www.gluk.ac.ke",
    "Jomo Kenyatta University of Agriculture and Technology": "https://www.jkuat.ac.ke",
    "Kenyatta University": "https://www.ku.ac.ke", // Fixed
    "Marist International University College": "https://www.miuc.ac.ke",
    "Maasai Mara University": "https://www.mmarau.ac.ke",
    "Maseno University": "https://www.maseno.ac.ke",
    "Multimedia University of Kenya": "https://www.mmu.ac.ke",
    "National Defence University-Kenya": "https://www.ndu.ac.ke",
    "Pan Africa Christian University": "https://www.pacuniversity.ac.ke",
    "Pioneer International University": "https://www.piu.ac.ke",
    "RAF International University": "https://www.riu.ac.ke",
    "Rongo University": "https://www.rongovarsity.ac.ke",
    "Scott Christian University": "https://www.scott.ac.ke",
    "South Eastern Kenya University": "https://www.seku.ac.ke",
    "Taita Taveta University": "https://www.ttu.ac.ke",
    "Technical University of Mombasa": "https://www.tum.ac.ke",
    "The Co-operative University of Kenya": "https://www.cuk.ac.ke",
    "University of Eastern Africa, Baraton": "https://www.ueab.ac.ke",
    "University of Embu": "https://www.embuni.ac.ke",
    "United States International University": "https://www.usiu.ac.ke",
    "Uzima University": "https://www.uzimauniversity.ac.ke"
};

async function main() {
    console.log("Fetching DB names...");
    const { data: dbInsts } = await supabase.from('universities').select('id, name');

    if (!dbInsts) return;

    const updates: any[] = [];
    dbInsts.forEach(inst => {
        const dbName = inst.name.toLowerCase().trim();
        let matchedUrl = null;

        for (const [key, url] of Object.entries(urlMap)) {
            const mapName = key.toLowerCase();

            // 1. Exact Name
            if (dbName === mapName) { matchedUrl = url; break; }

            // 2. Specific Aliases
            if (dbName.includes('south eastern kenya') && key.includes('south eastern')) { matchedUrl = url; break; }
            if (dbName.includes('seku')) { matchedUrl = "https://www.seku.ac.ke"; break; } // Explicit alias

            if (dbName.includes('kenyatta university') && key === 'kenyatta university') { matchedUrl = url; break; }
            if ((dbName.includes('jomo kenyatta') || dbName.includes('jkuat')) && key.includes('jomo')) { matchedUrl = url; break; }

            // 3. Fallback Contains (Safe: Ensure mapName is distinct)
            // Skip "Kenyatta" overlap if Jomo is involved
            if (mapName.includes(dbName) || dbName.includes(mapName)) {
                if (mapName.includes('jomo') && !dbName.includes('jomo')) continue; // Don't match KU to JKUAT
                if (dbName.includes('jomo') && !mapName.includes('jomo')) continue;

                matchedUrl = url;
                break;
            }
        }

        if (matchedUrl) {
            updates.push({ id: inst.id, name: inst.name, url: matchedUrl });
        }
    });

    const outPath = path.join('scripts', 'data', 'proposed_url_updates.json');
    fs.writeFileSync(outPath, JSON.stringify(updates, null, 2));
    console.log(`Generated Proposal: ${updates.length} matches.`);
}

main();
