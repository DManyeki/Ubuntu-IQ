// Upload TVET Data V3 (Comprehensive)
// Usage: npx tsx scripts/upload-tvet-v3.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: '.env.local' });

// Use VITE_SUPABASE_URL as primary, fallback to NEXT_PUBLIC
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadTVETDataV3() {
    const dataPath = path.join(process.cwd(), 'Kuccps Files/Minimum Subject Requirements for TVET Programmes.txt');

    if (!fs.existsSync(dataPath)) {
        console.error(`Data file not found: ${dataPath}`);
        return;
    }

    console.log(`Reading data from: ${dataPath}`);
    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    let data;
    try {
        data = JSON.parse(fileContent);
    } catch (e) {
        console.error("Failed to parse JSON:", e);
        return;
    }

    const items = data.data;
    console.log(`Loaded ${items.length} clusters.`);

    // Clear existing data
    console.log('Clearing existing TVET data...');
    const { error: deleteError } = await supabase
        .from('tvet_programs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
        console.error('Error clearing table:', deleteError);
    }

    const flattenedPrograms = [];
    let currentExamType = 'KUCCPS';

    for (const item of items) {
        // Check for section change
        if (item.section) {
            if (item.section.includes('KNEC')) currentExamType = 'KNEC';
            if (item.section.includes('INTERNAL')) currentExamType = 'INTERNAL';
            console.log(`Switched Exam Type to: ${currentExamType}`);
        }

        const categoryName = item.category;
        // Data uses 'programs' OR 'levels'
        const programsList = item.programs || item.levels || [];

        for (const prog of programsList) {
            // Construct the requirements object dynamically
            const requirementsObj: any = {};
            if (prog.subject_rules && prog.subject_rules.length > 0) requirementsObj.subject_rules = prog.subject_rules;
            if (prog.tracks) requirementsObj.tracks = prog.tracks;
            if (prog.alternative_sets) requirementsObj.alternative_sets = prog.alternative_sets;
            if (prog.selection_logic) requirementsObj.selection_logic = prog.selection_logic;
            if (prog.is_open_ended_below) requirementsObj.is_open_ended_below = true;

            flattenedPrograms.push({
                category: categoryName,
                level: prog.level,
                profile: prog.profile || 'Standard',
                min_mean_grade: prog.min_mean_grade,
                min_mean_rank: prog.min_mean_rank,
                requirements: requirementsObj,
                exam_type: currentExamType
            });
        }
    }

    console.log(`Prepared ${flattenedPrograms.length} programs for upload.`);

    // Batch insert
    const batchSize = 50;
    for (let i = 0; i < flattenedPrograms.length; i += batchSize) {
        const batch = flattenedPrograms.slice(i, i + batchSize);
        const { error } = await supabase.from('tvet_programs').insert(batch);

        if (error) {
            console.error(`Error inserting batch ${i}:`, error);
        } else {
            console.log(`Uploaded batch ${Math.floor(i / batchSize) + 1} (${batch.length} items)`);
        }
    }

    console.log('Upload complete!');
}

uploadTVETDataV3().catch(console.error);
