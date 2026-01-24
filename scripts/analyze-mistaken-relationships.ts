/**
 * Check if cleaned mistaken finds have relationships to DB institutions
 * by comparing name similarity AND location (county)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

interface MistakenFind {
    id: string;
    searched_for: string;
    found_instead: string;
    county: string;
    has_phone: boolean;
    has_address: boolean;
    has_website: boolean;
}

interface DBInstitution {
    id: string;
    name: string;
    county: string;
}

interface RelationshipMatch {
    mistaken_find: MistakenFind;
    db_institution: DBInstitution;
    similarity: number;
    match_type: 'same_county' | 'different_county';
    relationship_type: 'likely_same' | 'possible_campus' | 'possible_affiliation' | 'weak_match';
}

function normalize(s: string): string {
    return s.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function getSignificantWords(s: string): string[] {
    const stopWords = ['the', 'of', 'and', 'for', 'in', 'at', 'to', 'a', 'an'];
    const typeWords = ['college', 'institute', 'polytechnic', 'university', 'school', 'center', 'centre',
        'vocational', 'technical', 'training', 'national', 'county', 'vtc', 'tvc', 'tti'];
    return normalize(s).split(' ')
        .filter(w => w.length > 2 && !stopWords.includes(w) && !typeWords.includes(w));
}

function calculateSimilarity(a: string, b: string): number {
    const wordsA = getSignificantWords(a);
    const wordsB = getSignificantWords(b);

    if (wordsA.length === 0 || wordsB.length === 0) return 0;

    let matches = 0;
    for (const wa of wordsA) {
        for (const wb of wordsB) {
            if (wa === wb) {
                matches += 1;
                break;
            } else if (wa.length >= 4 && wb.length >= 4) {
                // Check substring match for longer words
                if (wa.includes(wb) || wb.includes(wa)) {
                    matches += 0.8;
                    break;
                }
                // Check first 4 chars match
                if (wa.substring(0, 4) === wb.substring(0, 4)) {
                    matches += 0.6;
                    break;
                }
            }
        }
    }

    return matches / Math.max(wordsA.length, wordsB.length);
}

function determineRelationshipType(similarity: number, sameCounty: boolean): string {
    if (similarity >= 0.8 && sameCounty) return 'likely_same';
    if (similarity >= 0.6 && sameCounty) return 'possible_campus';
    if (similarity >= 0.5) return 'possible_affiliation';
    return 'weak_match';
}

async function main() {
    console.log("🔍 Analyzing Relationships Between Mistaken Finds and DB Institutions...\n");

    // Load cleaned mistaken finds
    const mistakenFile = path.join(__dirname, 'data', 'mistaken_finds_cleaned.json');
    const mistakenFinds: MistakenFind[] = JSON.parse(fs.readFileSync(mistakenFile, 'utf-8'));
    console.log(`   Loaded ${mistakenFinds.length} cleaned mistaken finds`);

    // Fetch all institutions from DB (with pagination)
    console.log("   Fetching all TVET institutions from database...");
    const allInstitutions: DBInstitution[] = [];
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('tvet_institutions')
            .select('id, name, county')
            .range(offset, offset + pageSize - 1);

        if (error) {
            console.error("Error fetching institutions:", error.message);
            return;
        }

        if (data && data.length > 0) {
            allInstitutions.push(...data);
            offset += pageSize;
            hasMore = data.length === pageSize;
        } else {
            hasMore = false;
        }
    }
    console.log(`   Loaded ${allInstitutions.length} institutions from DB\n`);

    // Create county-based lookup
    const byCounty = new Map<string, DBInstitution[]>();
    for (const inst of allInstitutions) {
        const county = (inst.county || 'Unknown').toLowerCase();
        if (!byCounty.has(county)) byCounty.set(county, []);
        byCounty.get(county)!.push(inst);
    }

    // Find relationships
    const matches: RelationshipMatch[] = [];
    const likelySame: RelationshipMatch[] = [];
    const possibleCampus: RelationshipMatch[] = [];
    const possibleAffiliation: RelationshipMatch[] = [];

    for (const mf of mistakenFinds) {
        const mfCounty = (mf.county || '').toLowerCase();

        // Check same county first
        const sameCountyInsts = byCounty.get(mfCounty) || [];
        let bestMatch: RelationshipMatch | null = null;

        for (const inst of sameCountyInsts) {
            const similarity = calculateSimilarity(mf.found_instead, inst.name);
            if (similarity >= 0.4) {
                const relType = determineRelationshipType(similarity, true);
                const match: RelationshipMatch = {
                    mistaken_find: mf,
                    db_institution: inst,
                    similarity,
                    match_type: 'same_county',
                    relationship_type: relType as any
                };

                if (!bestMatch || similarity > bestMatch.similarity) {
                    bestMatch = match;
                }
            }
        }

        // If no good same-county match, check all institutions
        if (!bestMatch || bestMatch.similarity < 0.6) {
            for (const inst of allInstitutions) {
                const instCounty = (inst.county || '').toLowerCase();
                if (instCounty === mfCounty) continue; // Already checked

                const similarity = calculateSimilarity(mf.found_instead, inst.name);
                if (similarity >= 0.5) {
                    const relType = determineRelationshipType(similarity, false);
                    const match: RelationshipMatch = {
                        mistaken_find: mf,
                        db_institution: inst,
                        similarity,
                        match_type: 'different_county',
                        relationship_type: relType as any
                    };

                    if (!bestMatch || similarity > bestMatch.similarity) {
                        bestMatch = match;
                    }
                }
            }
        }

        if (bestMatch) {
            matches.push(bestMatch);
            if (bestMatch.relationship_type === 'likely_same') {
                likelySame.push(bestMatch);
            } else if (bestMatch.relationship_type === 'possible_campus') {
                possibleCampus.push(bestMatch);
            } else if (bestMatch.relationship_type === 'possible_affiliation') {
                possibleAffiliation.push(bestMatch);
            }
        }
    }

    // Generate report
    console.log("=".repeat(60));
    console.log("📊 RELATIONSHIP ANALYSIS RESULTS");
    console.log("=".repeat(60));
    console.log(`   Total mistaken finds analyzed: ${mistakenFinds.length}`);
    console.log(`   Found potential relationships: ${matches.length}`);
    console.log(`   - Likely same institution: ${likelySame.length}`);
    console.log(`   - Possible campus/branch: ${possibleCampus.length}`);
    console.log(`   - Possible affiliation: ${possibleAffiliation.length}`);
    console.log(`   No relationship found: ${mistakenFinds.length - matches.length}`);

    // Generate markdown report
    let md = `# 🔗 Mistaken Finds - Relationship Analysis

> **Generated:** ${new Date().toISOString().split('T')[0]}  
> **Analyzed:** ${mistakenFinds.length} items with phone data

## Summary

| Category | Count |
|----------|-------|
| Likely Same Institution | ${likelySame.length} |
| Possible Campus/Branch | ${possibleCampus.length} |
| Possible Affiliation | ${possibleAffiliation.length} |
| No Relationship Found | ${mistakenFinds.length - matches.length} |

---

## 🎯 Likely Same Institution (${likelySame.length})

These appear to be the same institution with slightly different names.

| # | Found on Google Maps | Matches DB Institution | County | Sim |
|---|---------------------|----------------------|--------|-----|
`;

    likelySame.forEach((m, i) => {
        md += `| ${i + 1} | ${m.mistaken_find.found_instead} | ${m.db_institution.name} | ${m.db_institution.county || '—'} | ${Math.round(m.similarity * 100)}% |\n`;
    });

    md += `\n---\n\n## 🏢 Possible Campus/Branch (${possibleCampus.length})\n\nMay be a campus or branch of an existing institution.\n\n`;
    md += `| # | Found on Google Maps | Possibly Related To | County | Sim |\n`;
    md += `|---|---------------------|-------------------|--------|-----|\n`;

    possibleCampus.forEach((m, i) => {
        const sameCounty = m.match_type === 'same_county' ? '✓' : '✗';
        md += `| ${i + 1} | ${m.mistaken_find.found_instead} | ${m.db_institution.name} | ${m.db_institution.county || '—'} ${sameCounty} | ${Math.round(m.similarity * 100)}% |\n`;
    });

    md += `\n---\n\n## 🤝 Possible Affiliation (${possibleAffiliation.length})\n\nWeaker relationship - may be affiliated or have similar naming.\n\n`;
    md += `| # | Found on Google Maps | Possibly Related To | Found County | DB County | Sim |\n`;
    md += `|---|---------------------|-------------------|--------------|-----------|-----|\n`;

    possibleAffiliation.slice(0, 50).forEach((m, i) => {
        md += `| ${i + 1} | ${m.mistaken_find.found_instead} | ${m.db_institution.name} | ${m.mistaken_find.county || '—'} | ${m.db_institution.county || '—'} | ${Math.round(m.similarity * 100)}% |\n`;
    });

    if (possibleAffiliation.length > 50) {
        md += `\n*... and ${possibleAffiliation.length - 50} more*\n`;
    }

    // Save reports
    const outputMd = path.join(__dirname, 'data', 'mistaken_relationships.md');
    const outputJson = path.join(__dirname, 'data', 'mistaken_relationships.json');

    fs.writeFileSync(outputMd, md);
    fs.writeFileSync(outputJson, JSON.stringify({
        summary: {
            total_analyzed: mistakenFinds.length,
            likely_same: likelySame.length,
            possible_campus: possibleCampus.length,
            possible_affiliation: possibleAffiliation.length,
            no_match: mistakenFinds.length - matches.length
        },
        likely_same: likelySame,
        possible_campus: possibleCampus,
        possible_affiliation: possibleAffiliation
    }, null, 2));

    console.log(`\n✅ Reports generated:`);
    console.log(`   ${outputMd}`);
    console.log(`   ${outputJson}`);
}

main().catch(console.error);
