// Upload merged KUCCPS data to Supabase (v2 - using dedicated columns)
// Usage: npx tsx scripts/upload-merged-data.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = 'https://ahzalqvkkztgosocbcoz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoemFscXZra3p0Z29zb2NiY296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODUzNzkyOCwiZXhwIjoyMDg0MTEzOTI4fQ.bpkMGHZQgazporGGqN0rhoMlrOkOrydCScCr7U57Jjw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface MergedProgram {
    program_code: string;
    institution: string;
    program: string;
    cutoff_2018?: string;
    cutoff_2019?: string;
    cutoff_2020?: string;
    cutoff_2021?: string;
    cutoff_2022?: string;
    cutoff_2023?: string;
    cutoff_2024?: string;
    subject_1?: string;
    subject_2?: string;
    subject_3?: string;
    subject_4?: string;
}

function inferLevel(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('phd') || n.includes('doctor')) return 'phd';
    if (n.includes('master')) return 'masters';
    if (n.includes('diploma')) return 'diploma';
    if (n.includes('certificate')) return 'certificate';
    return 'bachelors';
}

function parseNum(val: string | undefined): number | null {
    if (!val || val === '-' || !val.trim()) return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
}

async function main() {
    console.log('MERGED KUCCPS DATA UPLOADER v2');
    console.log('(Using dedicated columns)');
    console.log('='.repeat(50));

    const data = JSON.parse(fs.readFileSync('scripts/data/merged_kuccps_data.json', 'utf-8'));
    console.log(`\nLoaded ${data.total_programs} programs`);

    // Step 1: Get institution mappings
    console.log('\n[Step 1] Getting institution IDs...');
    const institutionMap = new Map<string, string>();

    const { data: institutions } = await supabase.from('universities').select('id, name');
    if (institutions) {
        for (const inst of institutions) {
            institutionMap.set(inst.name, inst.id);
        }
    }
    console.log(`   Found ${institutionMap.size} institutions in database`);

    // Step 2: Batch update programs
    console.log('\n[Step 2] Updating programs with cutoff data...');
    let success = 0, errors = 0, notFound = 0;

    for (const prog of data.programs as MergedProgram[]) {
        const instId = institutionMap.get(prog.institution);
        if (!instId) {
            notFound++;
            continue;
        }

        const updateData = {
            cutoff_2018: parseNum(prog.cutoff_2018),
            cutoff_2019: parseNum(prog.cutoff_2019),
            cutoff_2020: parseNum(prog.cutoff_2020),
            cutoff_2021: parseNum(prog.cutoff_2021),
            cutoff_2022: parseNum(prog.cutoff_2022),
            cutoff_2023: parseNum(prog.cutoff_2023),
            cutoff_2024: parseNum(prog.cutoff_2024),
            subject_req_1: prog.subject_1 || null,
            subject_req_2: prog.subject_2 || null,
            subject_req_3: prog.subject_3 || null,
            subject_req_4: prog.subject_4 || null,
            level: inferLevel(prog.program),
            min_kcse_grade: prog.cutoff_2024 || prog.cutoff_2023 || null
        };

        const { error } = await supabase
            .from('programs')
            .update(updateData)
            .eq('kuccps_code', prog.program_code);

        if (error) {
            errors++;
        } else {
            success++;
        }

        if ((success + errors) % 200 === 0) {
            console.log(`   Progress: ${success} updated, ${errors} errors...`);
        }
    }

    console.log(`\n   Done: ${success} updated, ${errors} errors, ${notFound} not found`);

    console.log('\n' + '='.repeat(50));
    console.log('UPLOAD COMPLETE');
    console.log('='.repeat(50));
}

main().catch(console.error);
