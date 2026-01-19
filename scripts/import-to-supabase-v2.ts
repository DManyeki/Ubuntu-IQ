// Import extracted KUCCPS data to Supabase (v2 - with cutoffs & subjects)
// Usage: npx tsx scripts/import-to-supabase.ts [json-file]

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Supabase configuration
const SUPABASE_URL = 'https://ahzalqvkkztgosocbcoz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoemFscXZra3p0Z29zb2NiY296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODUzNzkyOCwiZXhwIjoyMDg0MTEzOTI4fQ.bpkMGHZQgazporGGqN0rhoMlrOkOrydCScCr7U57Jjw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ExtractedProgram {
    row_number: string;
    program_code: string;
    institution: string;
    program: string;
    cutoff_2023?: string;
    cutoff_2022?: string;
    subject_1?: string;
    subject_2?: string;
    subject_3?: string;
    subject_4?: string;
}

interface ExtractedData {
    source_file: string;
    total_programs: number;
    programs: ExtractedProgram[];
}

function inferInstitutionType(name: string): 'university' | 'tveta' | 'college' | 'polytechnic' | 'institute' {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('university')) return 'university';
    if (nameLower.includes('polytechnic')) return 'polytechnic';
    if (nameLower.includes('technical') && nameLower.includes('training')) return 'tveta';
    if (nameLower.includes('institute')) return 'institute';
    if (nameLower.includes('college')) return 'college';
    return 'university';
}

function inferProgramLevel(name: string): 'certificate' | 'diploma' | 'bachelors' | 'masters' | 'phd' {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('phd') || nameLower.includes('doctor')) return 'phd';
    if (nameLower.includes('master')) return 'masters';
    if (nameLower.includes('bachelor') || nameLower.includes('b.sc') || nameLower.includes('b.a')) return 'bachelors';
    if (nameLower.includes('diploma')) return 'diploma';
    if (nameLower.includes('certificate')) return 'certificate';
    return 'bachelors';
}

function buildRequirements(prog: ExtractedProgram): object {
    const reqs: any = {};

    if (prog.cutoff_2023) reqs.cutoff_2023 = parseFloat(prog.cutoff_2023) || prog.cutoff_2023;
    if (prog.cutoff_2022) reqs.cutoff_2022 = parseFloat(prog.cutoff_2022) || prog.cutoff_2022;

    const subjects = [prog.subject_1, prog.subject_2, prog.subject_3, prog.subject_4].filter(s => s && s.trim());
    if (subjects.length > 0) {
        reqs.min_subjects = subjects;
    }

    return reqs;
}

async function main() {
    console.log('KUCCPS Data Importer v2');
    console.log('(with cutoffs & subject requirements)');
    console.log('='.repeat(45));

    const jsonPath = process.argv[2] || 'scripts/data/extracted_DEGREE_PROGRAMMES_2025.json';

    if (!fs.existsSync(jsonPath)) {
        console.error(`Error: File not found: ${jsonPath}`);
        process.exit(1);
    }

    console.log(`\nLoading: ${jsonPath}`);
    const data: ExtractedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log(`Source: ${data.source_file}`);
    console.log(`Programs: ${data.total_programs}`);

    // Step 1: Get institution IDs
    console.log('\n[Step 1] Getting institution IDs...');
    const institutionIdMap = new Map<string, string>();

    const uniqueInstitutions = [...new Set(data.programs.map(p => p.institution.trim()))];
    console.log(`Found ${uniqueInstitutions.length} unique institutions`);

    for (const name of uniqueInstitutions) {
        const { data: existing } = await supabase
            .from('universities')
            .select('id')
            .eq('name', name)
            .single();

        if (existing) {
            institutionIdMap.set(name, existing.id);
        }
    }

    console.log(`Mapped ${institutionIdMap.size} institutions`);

    // Step 2: Update programs with cutoffs and subjects
    console.log('\n[Step 2] Updating programs with cutoffs & subjects...');
    let updated = 0;
    let errors = 0;

    for (const prog of data.programs) {
        const institutionId = institutionIdMap.get(prog.institution.trim());
        if (!institutionId) {
            errors++;
            continue;
        }

        const requirements = buildRequirements(prog);
        const level = inferProgramLevel(prog.program);

        const { error } = await supabase
            .from('programs')
            .update({
                requirements,
                level,
                min_kcse_grade: prog.cutoff_2023 || null
            })
            .eq('kuccps_code', prog.program_code);

        if (error) {
            errors++;
        } else {
            updated++;
        }

        if (updated % 200 === 0 && updated > 0) {
            console.log(`Progress: ${updated} programs updated...`);
        }
    }

    console.log(`\nDone: ${updated} updated, ${errors} errors`);

    // Summary
    console.log('\n' + '='.repeat(45));
    console.log('IMPORT COMPLETE');
    console.log('='.repeat(45));
    console.log(`Programs updated: ${updated}`);
    console.log(`Errors: ${errors}`);
}

main().catch(console.error);
