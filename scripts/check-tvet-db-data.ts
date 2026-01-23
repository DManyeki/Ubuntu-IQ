
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("🔍 Verifying TVET Data in Database...");

    // Get count
    const { count, error: countError } = await supabase
        .from('tvet_institutions')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error("Error getting count:", countError);
        return;
    }
    console.log(`\n📊 Total Institutions: ${count}`);

    // Get sample with courses AND google_maps_data
    const { data, error } = await supabase
        .from('tvet_institutions')
        .select('id, name, town, phone, website, google_maps_data')
        .not('google_maps_data', 'is', null) // Only show updated ones
        .limit(5);

    if (error) {
        console.error("Error fetching sample:", error);
        return;
    }

    console.log(`\n📋 Sample Data (First 5):`);
    data.forEach((inst, index) => {
        console.log(`\n${index + 1}. ${inst.name}`);
        console.log(`   📍 Town: ${inst.town || 'N/A'}`);
        console.log(`   📞 Phone: ${inst.phone || 'N/A'}`);
        console.log(`   🌐 Website: ${inst.website || 'N/A'}`);

        const gMaps = inst.google_maps_data as any;
        if (gMaps) {
            console.log(`   🗺️ Google Data:`);
            console.log(`      Name: ${gMaps.place_name}`);
            console.log(`      Rating: ${gMaps.rating} (${gMaps.reviews} reviews)`);
            console.log(`      Link: ${gMaps.link}`);
            console.log(`      Coords: ${JSON.stringify(gMaps.coordinates)}`);
        }
    });
}

checkData();
