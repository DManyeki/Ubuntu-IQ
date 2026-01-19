// Upload TVET Programs to Supabase
// Usage: npx tsx scripts/upload-tvet-data.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadTVETData() {
    const dataPath = path.join(process.cwd(), 'scripts/data/tvet_final_extracted.json');

    if (!fs.existsSync(dataPath)) {
        console.error(`Data file not found: ${dataPath}`);
        return;
    }

    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(fileContent);
    const programs = data.programs;

    console.log(`Loaded ${programs.length} programs from ${data.source}`);

    // Clear existing data?
    console.log('Clearing existing TVET data...');
    const { error: deleteError } = await supabase
        .from('tvet_programs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
        console.error('Error clearing table:', deleteError);
        // Proceed anyway as table might be empty
    }

    // Batch insert
    const batchSize = 50;
    let insertedCount = 0;

    console.log('Starting upload...');

    for (let i = 0; i < programs.length; i += batchSize) {
        const batch = programs.slice(i, i + batchSize).map((p: any) => ({
            category: p.category,
            level: p.level,
            min_mean_grade: p.min_mean_grade,
            requirements: p.requirements,
            exam_type: determineExamType(p.category) // Helper to infer exam type if missing or default
        }));

        const { error } = await supabase
            .from('tvet_programs')
            .insert(batch);

        if (error) {
            console.error(`Error inserting batch ${i}:`, error);
        } else {
            insertedCount += batch.length;
            console.log(`Uploaded ${insertedCount}/${programs.length} programs`);
        }
    }

    console.log('Upload complete!');
}

function determineExamType(category: string): string {
    // Manual mapping based on document structure since parsed data lacks this
    const cat = category.toLowerCase();

    if (cat.includes('business') ||
        cat.includes('humanities') ||
        cat.includes('computing') ||
        cat.includes('tourism') ||
        cat.includes('clothing') ||
        cat.includes('applied biology') ||
        cat.includes('applied chemistry') ||
        cat.includes('analytical chemistry') ||
        cat.includes('agricultural courses') ||
        cat.includes('natural resources') ||
        cat.includes('aeronautical engineering (airframes')) {
        return 'KNEC';
    }

    if (cat.includes('aeronautical engineering (avionics)') ||
        cat.includes('photogrammetry') ||
        cat.includes('cartography') ||
        cat.includes('map reproduction') ||
        cat.includes('forestry') ||
        cat.includes('tax administration') ||
        cat.includes('custom administration') ||
        cat.includes('agricultural irrigation')) {
        return 'INTERNAL';
    }

    return 'KUCCPS';
}

uploadTVETData().catch(console.error);
