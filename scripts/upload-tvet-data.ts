
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'data', 'tvet_data.json');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadTVETData() {
    if (!fs.existsSync(DATA_FILE)) {
        console.error(`Data file not found: ${DATA_FILE}`);
        return;
    }

    const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
    const institutions = JSON.parse(rawData);

    console.log(`Loaded ${institutions.length} institutions.`);

    let successCount = 0;
    let failCount = 0;

    // Process in chunks of 50
    const CHUNK_SIZE = 50;

    for (let i = 0; i < institutions.length; i += CHUNK_SIZE) {
        const chunk = institutions.slice(i, i + CHUNK_SIZE);

        const records = chunk.map(inst => ({
            name: inst.name,
            registration_number: inst.registration_number,
            category: inst.category,
            ownership: inst.ownership,
            county: inst.county,
            courses: inst.courses
        }));

        const { error } = await supabase
            .from('tvet_institutions')
            .upsert(records, { onConflict: 'registration_number' });

        if (error) {
            console.error(`Error uploading chunk ${i}-${i + CHUNK_SIZE}:`, error.message);
            failCount += chunk.length;
        } else {
            console.log(`Uploaded chunk ${i}-${i + CHUNK_SIZE}`);
            successCount += chunk.length;
        }
    }

    console.log(`Upload complete. Success: ${successCount}, Failed: ${failCount}`);
}

uploadTVETData().catch(console.error);
