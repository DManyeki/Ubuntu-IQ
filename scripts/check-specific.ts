import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Checking specific universities...");
    const { data: unis, error } = await supabase.from('universities')
        .select('id, name, ownership, location')
        .or('name.ilike.%KABARNET%,name.ilike.%NYANDARUA%,name.ilike.%JARAMOGI%');

    if (error) console.error(error);
    console.table(unis);

    // Attempt explicit update debug
    if (unis && unis.length > 0) {
        const u = unis[0];
        console.log(`Attempting to force update ${u.name} (ID: ${u.id}) to Public...`);
        const { error: updateError } = await supabase.from('universities')
            .update({ ownership: 'Public' })
            .eq('id', u.id);

        if (updateError) console.error("Update Error:", updateError);
        else console.log("Update call successful.");

        // Read back
        const { data: check } = await supabase.from('universities').select('ownership').eq('id', u.id).single();
        console.log("New Ownership:", check?.ownership);
    }
}
main();
