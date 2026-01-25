
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Configuration ---
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const INPUT_FILE = path.join(process.cwd(), 'scripts/data/kmtc_profiles.json');

interface Profile {
    id: string;
    name: string;
    website: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    description: string | null;
    logo_url: string | null;
    county: string | null;
}

async function uploadProfiles() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error("Input file missing:", INPUT_FILE);
        return;
    }

    const profiles = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8')) as Profile[];
    console.log(`Read ${profiles.length} profiles from JSON.`);

    // Prepare data for insertion
    // The table columns: name, website, phone, email, address, county, description, logo_url
    // We can use the 'id' from JSON if we want to preserve it, or let Supabase generate new UUIDs.
    // Since we generated UUIDs in the script, let's try to use them if the table allows setting ID (it usually does if it is UUID primary key).

    // Check if we should upsert based on name or ID. 
    // Since this is a fresh table, we can just insert. Upsert on 'name' is safer to avoid duplicates if re-run.

    // We need to verify if 'kmtc_campuses' table has 'name' as unique constraint? 
    // The migration didn't explicitly set 'name' as UNIQUE, just created an index.
    // But let's assume we want to upsert to update fields if it exists.
    // For now, let's just insert/upsert. We might need a unique constraint on 'name' for upsert to work cleanly without ID, or we use the ID from the file.

    const validProfiles = profiles.map(p => ({
        // id: p.id, // Let's use the ID we generated so we can link consistent data
        // Actually, if we use the ID from JSON, we need to ensure no conflict.
        // Let's rely on name for deduplication if we run this multiple times? 
        // Or just map cleanly.
        name: p.name,
        website: p.website,
        phone: p.phone,
        email: p.email,
        address: p.address,
        county: p.county,
        description: p.description,
        logo_url: p.logo_url
    }));

    console.log(`Uploading ${validProfiles.length} profiles to 'kmtc_campuses'...`);

    // We will do upsert based on 'name' if we can, but 'name' isn't unique in schema yet.
    // Let's try to insert. If 'name' is not unique, we might get duplicates. 
    // BUT user asked to "upload".
    // Best practice: Check if exists or clear table first? 
    // Or just insert.
    // Actually, let's try to upsert on NO constraint (which only works on PK).
    // Modification: If I want to be safe, I should maybe DELETE all first? Or just INSERT.
    // I'll just INSERT for now. If user runs twice, they get duplicates unless I handle it.

    // Let's modify the data to include the generated ID, so if we upsert on ID it works.
    const profilesWithId = profiles.map(p => ({
        id: p.id,
        name: p.name,
        website: p.website,
        phone: p.phone,
        email: p.email,
        address: p.address,
        county: p.county,
        description: p.description,
        logo_url: p.logo_url
    }));

    const { data, error } = await supabase
        .from('kmtc_campuses')
        .upsert(profilesWithId, { onConflict: 'id' })
        .select();

    if (error) {
        console.error('Upload Error:', error);
    } else {
        console.log(`Successfully uploaded/upserted ${data?.length} profiles.`);
    }
}

uploadProfiles().catch(console.error);
