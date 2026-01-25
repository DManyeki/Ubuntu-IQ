// Insert missing programs that failed to update
// These are new programs from the cutoffs file not in the original programs file
// Usage: npx tsx scripts/insert-missing-programs.ts

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

function inferType(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('university')) return 'university';
    if (n.includes('polytechnic')) return 'polytechnic';
    if (n.includes('college')) return 'college';
    return 'university';
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
    console.log('INSERT MISSING PROGRAMS');
    console.log('='.repeat(50));

    const data = JSON.parse(fs.readFileSync('scripts/data/merged_kuccps_data.json', 'utf-8'));
    console.log(`\nLoaded ${data.total_programs} programs from merged file`);

    // Step 1: Get existing program codes from database
    console.log('\n[Step 1] Getting existing programs from database...');
    const existingCodes = new Set<string>();

    const { data: existingPrograms } = await supabase
        .from('programs')
        .select('kuccps_code');

    if (existingPrograms) {
        for (const p of existingPrograms) {
            if (p.kuccps_code) existingCodes.add(p.kuccps_code);
        }
    }
    console.log(`   Found ${existingCodes.size} programs in database`);

    // Step 2: Find missing programs
    console.log('\n[Step 2] Finding missing programs...');
    const missingPrograms: MergedProgram[] = [];

    for (const prog of data.programs as MergedProgram[]) {
        if (!existingCodes.has(prog.program_code)) {
            missingPrograms.push(prog);
        }
    }
    console.log(`   Found ${missingPrograms.length} missing programs`);

    if (missingPrograms.length === 0) {
        console.log('\n   All programs already exist in database!');
        return;
    }

    // Step 3: Get/create institution mappings
    console.log('\n[Step 3] Getting institution IDs...');
    const institutionMap = new Map<string, string>();

    const { data: institutions } = await supabase.from('universities').select('id, name');
    if (institutions) {
        for (const inst of institutions) {
            institutionMap.set(inst.name, inst.id);
        }
    }

    // Check for missing institutions and create them
    const missingInstitutions = new Set<string>();
    for (const prog of missingPrograms) {
        if (!institutionMap.has(prog.institution)) {
            missingInstitutions.add(prog.institution);
        }
    }

    if (missingInstitutions.size > 0) {
        console.log(`   Creating ${missingInstitutions.size} new institutions...`);
        for (const name of missingInstitutions) {
            const { data: inserted } = await supabase
                .from('universities')
                .insert({ name, type: inferType(name), status: 'active', data_source: 'kuccps_pdf' })
                .select('id')
                .single();

            if (inserted) {
                institutionMap.set(name, inserted.id);
                console.log(`     Created: ${name}`);
            }
        }
    }

    // Step 4: Insert missing programs
    console.log('\n[Step 4] Inserting missing programs...');
    let inserted = 0, errors = 0;

    for (const prog of missingPrograms) {
        const instId = institutionMap.get(prog.institution);
        if (!instId) {
            console.log(`   Skipping (no institution): ${prog.program_code}`);
            errors++;
            continue;
        }

        const insertData = {
            kuccps_code: prog.program_code,
            institution_id: instId,
            name: prog.program,
            level: inferLevel(prog.program),
            status: 'active',
            data_source: 'kuccps_pdf',
            min_kcse_grade: prog.cutoff_2024 || prog.cutoff_2023 || null,
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
            subject_req_4: prog.subject_4 || null
        };

        const { error } = await supabase.from('programs').insert(insertData);

        if (error) {
            console.log(`   Error: ${prog.program_code} - ${error.message}`);
            errors++;
        } else {
            inserted++;
        }
    }

    console.log(`\n   Done: ${inserted} inserted, ${errors} errors`);

    // Final count
    const { count } = await supabase.from('programs').select('*', { count: 'exact', head: true });

    console.log('\n' + '='.repeat(50));
    console.log('COMPLETE');
    console.log('='.repeat(50));
    console.log(`Total programs in database: ${count}`);
}

main().catch(console.error);
