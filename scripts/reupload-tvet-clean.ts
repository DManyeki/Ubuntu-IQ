// Re-upload TVET Data Cleanly
// Usage: npx tsx scripts/reupload-tvet-clean.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const DATA_PATH = 'Kuccps Files/Minimum Subject Requirements for TVET Programmes.txt';

async function main() {
    console.log('RE-UPLOAD TVET DATA CLEANLY');

    // 1. Fetch IDs to delete
    const { data: rows, error: fetchError } = await supabase.from('tvet_programs').select('id');
    if (fetchError) { console.error(fetchError); return; }

    console.log(`Found ${rows.length} existing rows to delete.`);

    // 2. Delete in batches
    const BATCH_SIZE = 20;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batchIds = rows.slice(i, i + BATCH_SIZE).map(r => r.id);
        const { error } = await supabase.from('tvet_programs').delete().in('id', batchIds);
        if (error) console.error(`Error deleting batch ${i}:`, error);
        else console.log(`Deleted batch ${i}-${i + BATCH_SIZE}`);
    }

    // 3. Load Data
    const filePath = path.join(process.cwd(), DATA_PATH);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    const items = data.data;

    // 4. Prepare flattened data
    const flattenedPrograms = [];
    let currentExamType = 'KUCCPS';

    for (const item of items) {
        if (item.section) {
            if (item.section.includes('KNEC')) currentExamType = 'KNEC';
            if (item.section.includes('INTERNAL')) currentExamType = 'INTERNAL';
        }

        const categoryName = item.category;
        const programsList = item.programs || item.levels || [];

        for (const prog of programsList) {
            const requirementsObj: any = {};
            if (prog.subject_rules?.length) requirementsObj.subject_rules = prog.subject_rules;
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

    // 5. Upload in batches
    for (let i = 0; i < flattenedPrograms.length; i += BATCH_SIZE) {
        const batch = flattenedPrograms.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('tvet_programs').insert(batch);
        if (error) console.error(`Error inserting batch ${i}:`, error);
        else console.log(`Uploaded batch ${i / BATCH_SIZE + 1} (${batch.length} items)`);
    }

    console.log('Done.');
}

main().catch(console.error);
