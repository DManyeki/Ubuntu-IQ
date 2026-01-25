// Upload TVET Data (V2 Logical Format)
// Usage: npx tsx scripts/upload-tvet-v2.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadTVETDataV2() {
    const dataPath = path.join(process.cwd(), 'Kuccps Files/ai_studio_code (2).txt');

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

    const clusters = data.data; // Array of categories
    console.log(`Loaded ${clusters.length} categories.`);

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

    // Flatten the hierarchical structure
    for (const cluster of clusters) {
        const categoryName = cluster.category;

        for (const prog of cluster.programs) {
            // Construct the requirements object dynamically
            // It might have subject_rules, tracks, or alternative_sets
            const requirementsObj: any = {};
            if (prog.subject_rules) requirementsObj.subject_rules = prog.subject_rules;
            if (prog.tracks) requirementsObj.tracks = prog.tracks;
            if (prog.alternative_sets) requirementsObj.alternative_sets = prog.alternative_sets;
            if (prog.selection_logic) requirementsObj.selection_logic = prog.selection_logic;

            flattenedPrograms.push({
                category: categoryName,
                level: prog.level,
                profile: prog.profile || 'Standard',
                min_mean_grade: prog.min_mean_grade,
                min_mean_rank: prog.min_mean_rank,
                requirements: requirementsObj,
                exam_type: determineExamType(categoryName)
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
            console.log(`Uploaded batch ${i / batchSize + 1} (${batch.length} items)`);
        }
    }

    console.log('Upload complete!');
}

function determineExamType(category: string): string {
    const cat = category.toLowerCase();

    // Known KNEC categories
    if (cat.includes('business') ||
        cat.includes('humanities') ||
        cat.includes('computing') ||
        cat.includes('tourism') ||
        cat.includes('clothing') ||
        cat.includes('applied biology') ||
        cat.includes('applied chemistry') ||
        cat.includes('analytical chemistry') ||
        cat.includes('agricultural courses') ||
        cat.includes('natural resources')) {
        return 'KNEC';
    }

    // Known INTERNAL categories
    if (cat.includes('photogrammetry') ||
        cat.includes('cartography') ||
        cat.includes('map reproduction') ||
        cat.includes('forestry') ||
        cat.includes('tax administration') ||
        cat.includes('custom administration') ||
        cat.includes('irrigation')) {
        return 'INTERNAL';
    }

    return 'KUCCPS';
}

uploadTVETDataV2().catch(console.error);
