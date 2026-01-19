// Upload refined cluster data to Supabase clusters and cluster_requirements tables
// Usage: npx tsx scripts/upload-refined-clusters.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = 'https://ahzalqvkkztgosocbcoz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoemFscXZra3p0Z29zb2NiY296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODUzNzkyOCwiZXhwIjoyMDg0MTEzOTI4fQ.bpkMGHZQgazporGGqN0rhoMlrOkOrydCScCr7U57Jjw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface RefinedSubject {
    code: string;
    alternatives: string[];
    min_grade: string;
    is_required: boolean;
}

interface RefinedCluster {
    cluster_id: string;
    parent_cluster: string;
    requirements: RefinedSubject[];
    programs: string[];
}

async function main() {
    console.log('UPLOADING REFINED CLUSTER DATA TO SUPABASE');
    console.log('='.repeat(50));

    // Load refined data
    const data = JSON.parse(fs.readFileSync('scripts/data/refined_clusters.json', 'utf-8'));
    const clusters: RefinedCluster[] = data.clusters;

    console.log(`Loaded ${clusters.length} clusters to upload`);

    // Step 1: Insert clusters
    console.log('\n[Step 1] Inserting clusters...');

    const clusterRows = clusters.map(c => ({
        id: c.cluster_id,
        parent_cluster: c.parent_cluster
    }));

    const { error: clusterError } = await supabase
        .from('clusters')
        .upsert(clusterRows, { onConflict: 'id' });

    if (clusterError) {
        console.error('Error inserting clusters:', clusterError.message);
        return;
    }
    console.log(`   Inserted/updated ${clusterRows.length} clusters`);

    // Step 2: Delete existing requirements and insert new ones
    console.log('\n[Step 2] Inserting cluster requirements...');

    // Delete all existing requirements first
    await supabase.from('cluster_requirements').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const requirementRows: any[] = [];
    for (const cluster of clusters) {
        for (let i = 0; i < cluster.requirements.length; i++) {
            const req = cluster.requirements[i];
            requirementRows.push({
                cluster_id: cluster.cluster_id,
                position: i + 1,
                subject_code: req.code,
                alternatives: req.alternatives,
                min_grade: req.min_grade || null,
                is_required: req.is_required
            });
        }
    }

    console.log(`   Preparing ${requirementRows.length} requirements...`);

    // Insert in batches of 50
    const batchSize = 50;
    let inserted = 0;

    for (let i = 0; i < requirementRows.length; i += batchSize) {
        const batch = requirementRows.slice(i, i + batchSize);
        const { error } = await supabase
            .from('cluster_requirements')
            .insert(batch);

        if (error) {
            console.error(`   Error batch ${i}:`, error.message);
        } else {
            inserted += batch.length;
            process.stdout.write(`\r   Inserted ${inserted}/${requirementRows.length} requirements`);
        }
    }
    console.log('');

    // Step 3: Link programs to clusters based on program name matching
    console.log('\n[Step 3] Linking programs to clusters...');

    let linkedPrograms = 0;
    let notFound = 0;

    for (const cluster of clusters) {
        for (const programName of cluster.programs) {
            // Clean the program name for matching
            const searchName = programName
                .replace(/[()]/g, '')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 40);

            // Try to find matching program
            const { data: matchedPrograms } = await supabase
                .from('programs')
                .select('id, name')
                .ilike('name', `%${searchName}%`)
                .limit(1);

            if (matchedPrograms && matchedPrograms.length > 0) {
                const { error: updateError } = await supabase
                    .from('programs')
                    .update({ cluster_id: cluster.cluster_id })
                    .eq('id', matchedPrograms[0].id);

                if (!updateError) linkedPrograms++;
            } else {
                notFound++;
            }
        }
        process.stdout.write(`\r   Processing cluster ${cluster.cluster_id}...`);
    }
    console.log('');

    console.log(`   Linked ${linkedPrograms} programs to clusters`);
    console.log(`   ${notFound} program names not matched in database`);

    // Verify upload
    console.log('\n[Step 4] Verification...');

    const { count: clusterCount } = await supabase
        .from('clusters')
        .select('*', { count: 'exact', head: true });

    const { count: reqCount } = await supabase
        .from('cluster_requirements')
        .select('*', { count: 'exact', head: true });

    const { data: linkedCount } = await supabase
        .from('programs')
        .select('cluster_id')
        .not('cluster_id', 'is', null);

    console.log(`   Clusters in DB: ${clusterCount}`);
    console.log(`   Requirements in DB: ${reqCount}`);
    console.log(`   Programs with cluster_id: ${linkedCount?.length || 0}`);

    console.log('\n' + '='.repeat(50));
    console.log('UPLOAD COMPLETE');
}

main().catch(console.error);
