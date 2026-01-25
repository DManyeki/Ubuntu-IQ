// Refine and normalize cluster data
// - Separate combined subjects (ENG/KIS → separate fields)
// - Expand abbreviations (ALTERNATIVE A/B → MAT ALTERNATIVE A/B)
// - Standardize grade formats
// Usage: npx tsx scripts/refine-clusters.ts

import * as fs from 'fs';

interface RawCluster {
    cluster_id: string;
    subjects?: {
        subject_1?: string;
        grade_1?: string;
        subject_2?: string;
        grade_2?: string;
        subject_3?: string;
        grade_3?: string;
        subject_4?: string;
        grade_4?: string;
    };
    subject_1?: string;
    grade_1?: string;
    subject_2?: string;
    grade_2?: string;
    subject_3?: string;
    grade_3?: string;
    subject_4?: string;
    grade_4?: string;
    programs: string[];
}

interface RefinedSubject {
    code: string;           // Subject code: MAT, PHY, CHE, BIO, etc.
    alternatives: string[]; // Alternative subjects: ["ENG", "KIS"] or ["MAT ALTERNATIVE A", "MAT ALTERNATIVE B"]
    min_grade: string;      // Minimum grade: "C+", "C", "B", "C-"
    is_required: boolean;   // Whether this subject is required
}

interface RefinedCluster {
    cluster_id: string;
    parent_cluster: string;
    requirements: RefinedSubject[];
    programs: string[];
}

// Subject code mappings
const SUBJECT_EXPANSIONS: Record<string, string[]> = {
    'ENG': ['English'],
    'KIS': ['Kiswahili'],
    'MAT': ['Mathematics'],
    'PHY': ['Physics'],
    'CHE': ['Chemistry'],
    'BIO': ['Biology'],
    'GEO': ['Geography'],
    'HSC': ['Home Science'],
    'AGR': ['Agriculture'],
    'AGRIC': ['Agriculture'],
    'BST': ['Business Studies'],
    'CRE': ['Christian Religious Education'],
    'IRE': ['Islamic Religious Education'],
    'HRE': ['Hindu Religious Education'],
    'HAG': ['History and Government'],
    'MUS': ['Music'],
    'FRE': ['French'],
    'GER': ['German'],
    'ARD': ['Art and Design'],
    'COMP': ['Computer Studies'],
    'GSC': ['General Science'],
};

// Standardize grade formats
function normalizeGrade(grade: string): string {
    if (!grade) return '';

    const g = grade.toUpperCase().trim();

    // Map various formats to standard
    if (g.includes('B (PLAIN)') || g === 'B') return 'B';
    if (g.includes('B-') || g.includes('B (MINUS)') || g.includes('B-MINUS')) return 'B-';
    if (g.includes('B+')) return 'B+';
    if (g.includes('C+')) return 'C+';
    if (g.includes('C (PLAIN)') || g === 'C' || g === 'PLAIN') return 'C';
    if (g.includes('C-') || g.includes('C (MINUS)') || g.includes('C-(MINUS)')) return 'C-';
    if (g.includes('A')) return 'A';

    return grade.trim();
}

// Parse subject string and expand alternatives
function parseSubject(subjectStr: string, gradeStr: string): RefinedSubject | null {
    if (!subjectStr || subjectStr.trim() === '') return null;

    let subject = subjectStr.trim().toUpperCase();
    let grade = normalizeGrade(gradeStr);

    // Skip if it looks like a program name (parsing error)
    if (subject.includes('BACHELOR')) return null;
    if (subject.includes('ANY GROUP')) {
        return {
            code: 'GROUP',
            alternatives: [subject],
            min_grade: grade || '',
            is_required: false
        };
    }

    // Expand "ALTERNATIVE A/B" to "MAT ALTERNATIVE A/B"
    if (subject.match(/^ALTERNATIVE\s+[A-Z]/)) {
        subject = 'MAT ' + subject;
    }

    // Handle "MAT ALTERNATIVE A - C+" format (subject and grade together)
    const gradeMatch = subject.match(/(.+?)\s*[-–]\s*([A-Z][+-]?(?:\s*\(PLAIN\))?)\s*$/i);
    if (gradeMatch) {
        subject = gradeMatch[1].trim();
        grade = normalizeGrade(gradeMatch[2]);
    }

    // Separate alternatives (e.g., "ENG/KIS" → ["ENG", "KIS"])
    const alternatives: string[] = [];

    if (subject.includes('/')) {
        const parts = subject.split('/').map(p => p.trim());
        for (const part of parts) {
            if (part && !part.includes('GROUP')) {
                alternatives.push(part);
            } else if (part.includes('GROUP')) {
                alternatives.push(part);
            }
        }
    } else {
        alternatives.push(subject);
    }

    // Determine primary code
    const primaryCode = alternatives[0].replace(/\s+ALTERNATIVE\s+[A-Z].*$/i, '').trim();

    return {
        code: primaryCode,
        alternatives: alternatives,
        min_grade: grade,
        is_required: alternatives.length === 1 && !alternatives[0].includes('GROUP')
    };
}

function refineCluster(raw: RawCluster): RefinedCluster {
    const requirements: RefinedSubject[] = [];

    // Get subject fields (handle both nested and flat structure)
    const subjects = raw.subjects || raw;

    // Parse each subject slot
    for (let i = 1; i <= 4; i++) {
        const subjKey = `subject_${i}` as keyof typeof subjects;
        const gradeKey = `grade_${i}` as keyof typeof subjects;

        const subjValue = (subjects as any)[subjKey] as string;
        const gradeValue = (subjects as any)[gradeKey] as string;

        if (subjValue) {
            const parsed = parseSubject(subjValue, gradeValue || '');
            if (parsed) {
                requirements.push(parsed);
            }
        }
    }

    // Extract parent cluster (e.g., "5A" → "5")
    const parentMatch = raw.cluster_id.match(/^(\d+)/);
    const parentCluster = parentMatch ? parentMatch[1] : raw.cluster_id;

    // Clean programs - remove any that are too short or malformed
    const cleanedPrograms = raw.programs
        .filter(p => p && p.length > 10 && p.startsWith('Bachelor'))
        .map(p => p.trim().replace(/\s+/g, ' '));

    return {
        cluster_id: raw.cluster_id,
        parent_cluster: parentCluster,
        requirements,
        programs: [...new Set(cleanedPrograms)] // Remove duplicates
    };
}

function main() {
    console.log('CLUSTER DATA REFINEMENT');
    console.log('='.repeat(50));

    // Load raw data
    const rawData = JSON.parse(fs.readFileSync('scripts/data/ai_clusters_v2.json', 'utf-8'));
    console.log(`Loaded ${rawData.total_clusters} raw clusters`);

    // Refine each cluster
    const refinedClusters: RefinedCluster[] = [];

    for (const raw of rawData.clusters) {
        const refined = refineCluster(raw);

        // Skip clusters with no valid requirements or programs
        if (refined.requirements.length > 0 || refined.programs.length > 0) {
            refinedClusters.push(refined);
        }
    }

    console.log(`Refined to ${refinedClusters.length} clusters`);

    // Deduplicate by cluster_id (keep the one with more programs)
    const clusterMap = new Map<string, RefinedCluster>();
    for (const c of refinedClusters) {
        const existing = clusterMap.get(c.cluster_id);
        if (!existing || c.programs.length > existing.programs.length) {
            clusterMap.set(c.cluster_id, c);
        } else {
            // Merge programs
            existing.programs = [...new Set([...existing.programs, ...c.programs])];
        }
    }

    const uniqueClusters = Array.from(clusterMap.values());
    console.log(`Deduplicated to ${uniqueClusters.length} unique clusters`);

    // Sort by cluster_id
    uniqueClusters.sort((a, b) => {
        const aNum = parseInt(a.cluster_id.match(/\d+/)?.[0] || '0');
        const bNum = parseInt(b.cluster_id.match(/\d+/)?.[0] || '0');
        if (aNum !== bNum) return aNum - bNum;
        return a.cluster_id.localeCompare(b.cluster_id);
    });

    // Save refined data
    const outputPath = 'scripts/data/refined_clusters.json';
    fs.writeFileSync(outputPath, JSON.stringify({
        total_clusters: uniqueClusters.length,
        last_updated: new Date().toISOString(),
        clusters: uniqueClusters
    }, null, 2), 'utf-8');

    console.log(`\nSaved to: ${outputPath}`);

    // Show samples
    console.log('\n' + '='.repeat(50));
    console.log('SAMPLE REFINED CLUSTERS:');

    for (const c of uniqueClusters.slice(0, 5)) {
        console.log(`\n[${c.cluster_id}] (Parent: ${c.parent_cluster})`);
        console.log('  Requirements:');
        for (const r of c.requirements) {
            console.log(`    - ${r.alternatives.join(' OR ')} : ${r.min_grade || 'N/A'} ${r.is_required ? '(required)' : ''}`);
        }
        console.log(`  Programs: ${c.programs.length}`);
    }

    // Statistics
    console.log('\n' + '='.repeat(50));
    console.log('STATISTICS:');
    const totalPrograms = uniqueClusters.reduce((sum, c) => sum + c.programs.length, 0);
    console.log(`  Total unique programs: ${totalPrograms}`);
    console.log(`  Clusters with grades: ${uniqueClusters.filter(c => c.requirements.some(r => r.min_grade)).length}`);
    console.log(`  Clusters by parent:`);

    const byParent = new Map<string, number>();
    for (const c of uniqueClusters) {
        byParent.set(c.parent_cluster, (byParent.get(c.parent_cluster) || 0) + 1);
    }
    for (const [parent, count] of Array.from(byParent.entries()).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
        console.log(`    Cluster ${parent}: ${count} sub-clusters`);
    }
}

main();
