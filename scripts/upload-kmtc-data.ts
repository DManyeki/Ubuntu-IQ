
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

// --- Configuration ---
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Use CLEANED data file
const INPUT_FILE = path.join(process.cwd(), 'scripts/data/kmtc_final_cleaned.json');

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Types ---
interface Program {
    id: string;
    name: string;
    url: string;
    category_group: string;
    min_mean_grade?: string;
    requirements: { subject: string; grade: string }[];
    campuses: { name: string; code: string; county: string }[];
}

async function main() {
    console.log('🚀 Starting KMTC Upload to kmtc_programs table...');

    if (!fs.existsSync(INPUT_FILE)) {
        console.error('Input file missing:', INPUT_FILE);
        return;
    }

    const programs = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8')) as Program[];

    // We are uploading to 'kmtc_programs' table.
    // Schema: id (uuid), program_id (text unique), name, url, category_group, min_mean_grade, requirements (jsonb), campuses (jsonb)

    let count = 0;
    for (const p of programs) {
        const { error } = await supabase
            .from('kmtc_programs')
            .upsert({
                program_id: p.id,
                name: p.name,
                url: p.url,
                category_group: p.category_group,
                min_mean_grade: p.min_mean_grade,
                requirements: p.requirements, // JSONB
                campuses: p.campuses // JSONB
            }, { onConflict: 'program_id' });

        if (error) {
            console.error(`Failed to upload ${p.name}:`, error.message);
        } else {
            process.stdout.write('.');
            count++;
        }
    }

    console.log(`\n✅ Uploaded/Updated ${count} programs to kmtc_programs.`);
}

main().catch(console.error); 
