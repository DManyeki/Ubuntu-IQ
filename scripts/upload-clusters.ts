// Clean and upload cluster data to Supabase
// Creates clusters table and updates programs with cluster_id
// Usage: npx tsx scripts/upload-clusters.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = 'https://ahzalqvkkztgosocbcoz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoemFscXZra3p0Z29zb2NiY296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODUzNzkyOCwiZXhwIjoyMDg0MTEzOTI4fQ.bpkMGHZQgazporGGqN0rhoMlrOkOrydCScCr7U57Jjw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface RawCluster {
    cluster_id: string;
    subject_1: string;
    subject_2: string;
    subject_3: string;
    subject_4: string;
    programs: string[];
}

function cleanSubjectRequirement(raw: string): string {
    // Remove "Subject X " prefix
    let clean = raw.replace(/^Subject \d+\s*/i, '').trim();
    return clean;
}

async function main() {
    console.log('CLUSTER DATA UPLOADER');
    console.log('='.repeat(50));

    // Load extracted clusters
    const data = JSON.parse(fs.readFileSync('scripts/data/extracted_clusters.json', 'utf-8'));
    console.log(`\nLoaded ${data.total_clusters} clusters`);

    // Clean cluster data
    console.log('\n[Step 1] Cleaning cluster data...');
    const cleanedClusters = data.clusters.map((c: RawCluster) => ({
        cluster_id: c.cluster_id,
        subject_1: cleanSubjectRequirement(c.subject_1),
        subject_2: cleanSubjectRequirement(c.subject_2),
        subject_3: cleanSubjectRequirement(c.subject_3),
        subject_4: cleanSubjectRequirement(c.subject_4)
    }));

    // Display cleaned clusters
    console.log('\nCleaned clusters:');
    for (const c of cleanedClusters) {
        console.log(`  ${c.cluster_id}: ${c.subject_1 || '(main)'} | ${c.subject_2} | ${c.subject_3}`);
    }

    // Save cleaned data locally
    const cleanedPath = 'scripts/data/cleaned_clusters.json';
    fs.writeFileSync(cleanedPath, JSON.stringify({
        total_clusters: cleanedClusters.length,
        clusters: cleanedClusters
    }, null, 2));
    console.log(`\nSaved cleaned data to: ${cleanedPath}`);

    // Step 2: Create mapping based on subject requirements in programs
    console.log('\n[Step 2] Mapping programs to clusters...');

    // Get programs with subject requirements
    const { data: programs } = await supabase
        .from('programs')
        .select('id, kuccps_code, name, subject_req_1, subject_req_2')
        .not('subject_req_1', 'is', null);

    if (!programs) {
        console.log('   No programs found with subject requirements');
        return;
    }

    console.log(`   Found ${programs.length} programs with subject requirements`);

    // Simple cluster assignment based on subject patterns
    let assigned = 0;

    for (const prog of programs) {
        const s1 = (prog.subject_req_1 || '').toUpperCase();
        const s2 = (prog.subject_req_2 || '').toUpperCase();

        let clusterId: string | null = null;

        // Determine cluster based on subject combination
        if (s1.includes('MAT') && s2.includes('PHY')) {
            if (prog.name?.toLowerCase().includes('electrical') || prog.name?.toLowerCase().includes('electronic')) {
                clusterId = '6';
            } else if (prog.name?.toLowerCase().includes('civil') || prog.name?.toLowerCase().includes('mechanical')) {
                clusterId = '5';
            } else {
                clusterId = '4'; // General engineering
            }
        } else if (s1.includes('BIO') && s2.includes('CHE')) {
            clusterId = '13'; // Biological sciences
        } else if (s1.includes('CHE') && s2.includes('MAT')) {
            clusterId = '11'; // Chemistry-based
        } else if (s1.includes('ENG') || s1.includes('KIS')) {
            clusterId = '1'; // Arts/Humanities
        } else if (s1.includes('GEO')) {
            clusterId = '16'; // Geography-based
        }

        if (clusterId) {
            const { error } = await supabase
                .from('programs')
                .update({ cluster_id: clusterId })
                .eq('id', prog.id);

            if (!error) assigned++;
        }
    }

    console.log(`   Assigned cluster IDs to ${assigned} programs`);

    console.log('\n' + '='.repeat(50));
    console.log('COMPLETE');
    console.log('='.repeat(50));
    console.log(`\nCluster definitions saved locally.`);
    console.log('To view cluster assignments, run in Supabase:');
    console.log('  SELECT cluster_id, COUNT(*) FROM programs GROUP BY cluster_id;');
}

main().catch(console.error);
