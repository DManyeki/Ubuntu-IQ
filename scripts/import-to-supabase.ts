// Import extracted KUCCPS data to Supabase
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

    return 'university'; // Default for KUCCPS degree programs
}

function inferProgramLevel(name: string): 'certificate' | 'diploma' | 'bachelors' | 'masters' | 'phd' {
    const nameLower = name.toLowerCase();

    if (nameLower.includes('phd') || nameLower.includes('doctor')) return 'phd';
    if (nameLower.includes('master')) return 'masters';
    if (nameLower.includes('bachelor') || nameLower.includes('b.sc') || nameLower.includes('b.a')) return 'bachelors';
    if (nameLower.includes('diploma')) return 'diploma';
    if (nameLower.includes('certificate')) return 'certificate';

    return 'bachelors'; // Default for degree programs
}

async function main() {
    console.log('🚀 KUCCPS Data Importer\n');

    // Get JSON file path
    const jsonPath = process.argv[2] || 'scripts/data/extracted_DEGREE_PROGRAMMES_2025.json';

    if (!fs.existsSync(jsonPath)) {
        console.error(`❌ File not found: ${jsonPath}`);
        process.exit(1);
    }

    console.log(`📄 Loading: ${jsonPath}`);
    const data: ExtractedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log(`   Source: ${data.source_file}`);
    console.log(`   Programs: ${data.total_programs}`);

    // Step 1: Extract unique institutions
    console.log('\n📊 Step 1: Extracting unique institutions...');
    const uniqueInstitutions = new Map<string, { name: string; count: number }>();

    for (const prog of data.programs) {
        const name = prog.institution.trim();
        if (!uniqueInstitutions.has(name)) {
            uniqueInstitutions.set(name, { name, count: 1 });
        } else {
            uniqueInstitutions.get(name)!.count++;
        }
    }

    console.log(`   Found ${uniqueInstitutions.size} unique institutions`);

    // Step 2: Insert institutions
    console.log('\n🏛️ Step 2: Inserting institutions...');
    const institutionIdMap = new Map<string, string>();
    let insertedInst = 0;
    let skippedInst = 0;

    for (const [name, info] of uniqueInstitutions) {
        const type = inferInstitutionType(name);

        // Check if exists
        const { data: existing } = await supabase
            .from('universities')
            .select('id')
            .eq('name', name)
            .single();

        if (existing) {
            institutionIdMap.set(name, existing.id);
            skippedInst++;
            continue;
        }

        // Insert new
        const { data: inserted, error } = await supabase
            .from('universities')
            .insert({
                name,
                type,
                status: 'active',
                data_source: 'kuccps_pdf'
            })
            .select('id')
            .single();

        if (error) {
            console.error(`   ❌ Failed to insert ${name}: ${error.message}`);
            continue;
        }

        institutionIdMap.set(name, inserted.id);
        insertedInst++;
    }

    console.log(`   ✅ Inserted: ${insertedInst}, Skipped (existing): ${skippedInst}`);

    // Step 3: Insert programs
    console.log('\n📚 Step 3: Inserting programs...');
    let insertedProg = 0;
    let skippedProg = 0;
    let errorProg = 0;

    for (const prog of data.programs) {
        const institutionId = institutionIdMap.get(prog.institution.trim());

        if (!institutionId) {
            console.error(`   ⚠️ No institution ID for: ${prog.institution}`);
            errorProg++;
            continue;
        }

        // Check if exists
        const { data: existing } = await supabase
            .from('programs')
            .select('id')
            .eq('kuccps_code', prog.program_code)
            .single();

        if (existing) {
            skippedProg++;
            continue;
        }

        const level = inferProgramLevel(prog.program);

        const { error } = await supabase
            .from('programs')
            .insert({
                institution_id: institutionId,
                name: prog.program,
                kuccps_code: prog.program_code,
                level,
                status: 'active',
                data_source: 'kuccps_pdf'
            });

        if (error) {
            if (!error.message.includes('duplicate key')) {
                console.error(`   ❌ Failed: ${prog.program_code} - ${error.message}`);
            }
            errorProg++;
            continue;
        }

        insertedProg++;

        if (insertedProg % 100 === 0) {
            console.log(`   Progress: ${insertedProg} programs inserted...`);
        }
    }

    console.log(`   ✅ Inserted: ${insertedProg}, Skipped: ${skippedProg}, Errors: ${errorProg}`);

    // Summary
    console.log('\n─────────────────────────────────');
    console.log('📊 Import Summary:');
    console.log('─────────────────────────────────');
    console.log(`   Institutions: ${insertedInst} new, ${skippedInst} existing`);
    console.log(`   Programs: ${insertedProg} new, ${skippedProg} existing`);
    console.log('─────────────────────────────────');
    console.log('\n✅ Import complete!');
}

main().catch(console.error);
