/**
 * Cross-match mistaken finds with missing Google Maps institutions
 * 
 * This script checks if the "found_instead" name from mistaken finds
 * matches any institution that is currently missing Google Maps data.
 * If so, we could potentially use that scraped data for the matching institution.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MistakenFind {
    id: string;
    searched_for: string;
    found_instead: string;
    county: string;
    status: string;
    has_phone: boolean;
    has_address: boolean;
    has_website: boolean;
}

interface MissingInstitution {
    id: string;
    name: string;
    county: string;
    status: string;
}

interface CrossMatch {
    mistaken_row: number;
    searched_for: string;
    searched_for_id: string;
    found_instead: string;
    matches_institution: string;
    matches_id: string;
    county: string;
    has_phone: boolean;
    has_address: boolean;
    has_website: boolean;
}

function normalize(s: string): string {
    return s.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenize(s: string): string[] {
    return normalize(s).split(' ').filter(t => t.length > 2);
}

function calculateSimilarity(a: string, b: string): number {
    const tokensA = tokenize(a);
    const tokensB = tokenize(b);

    if (tokensA.length === 0 || tokensB.length === 0) return 0;

    let matches = 0;
    for (const ta of tokensA) {
        for (const tb of tokensB) {
            if (ta === tb || ta.includes(tb) || tb.includes(ta)) {
                matches++;
                break;
            }
        }
    }

    return matches / Math.max(tokensA.length, tokensB.length);
}

async function main() {
    console.log("🔍 Cross-Matching Mistaken Finds with Missing Institutions...\n");

    // Load data
    const mistakenFile = path.join(__dirname, 'data', 'mistaken_finds.json');
    const missingFile = path.join(__dirname, 'data', 'missing_google_maps.json');

    const mistakenFinds: MistakenFind[] = JSON.parse(fs.readFileSync(mistakenFile, 'utf-8'));
    const missingInstitutions: MissingInstitution[] = JSON.parse(fs.readFileSync(missingFile, 'utf-8'));

    console.log(`   Loaded ${mistakenFinds.length} mistaken finds`);
    console.log(`   Loaded ${missingInstitutions.length} missing institutions\n`);

    // Create lookup maps for missing institutions
    const exactMap = new Map<string, MissingInstitution>();
    const missingList: { normalized: string; inst: MissingInstitution }[] = [];

    for (const inst of missingInstitutions) {
        const norm = normalize(inst.name);
        exactMap.set(norm, inst);
        missingList.push({ normalized: norm, inst });
    }

    // Find cross-matches
    const exactMatches: CrossMatch[] = [];
    const fuzzyMatches: { match: CrossMatch; similarity: number }[] = [];

    for (let i = 0; i < mistakenFinds.length; i++) {
        const mf = mistakenFinds[i];
        const foundNorm = normalize(mf.found_instead);

        // Check exact match
        if (exactMap.has(foundNorm)) {
            const missing = exactMap.get(foundNorm)!;
            exactMatches.push({
                mistaken_row: i + 1,
                searched_for: mf.searched_for,
                searched_for_id: mf.id,
                found_instead: mf.found_instead,
                matches_institution: missing.name,
                matches_id: missing.id,
                county: missing.county || mf.county,
                has_phone: mf.has_phone,
                has_address: mf.has_address,
                has_website: mf.has_website
            });
        } else {
            // Check fuzzy matches (similarity >= 0.7)
            for (const { normalized, inst } of missingList) {
                const similarity = calculateSimilarity(mf.found_instead, inst.name);
                if (similarity >= 0.7) {
                    fuzzyMatches.push({
                        match: {
                            mistaken_row: i + 1,
                            searched_for: mf.searched_for,
                            searched_for_id: mf.id,
                            found_instead: mf.found_instead,
                            matches_institution: inst.name,
                            matches_id: inst.id,
                            county: inst.county || mf.county,
                            has_phone: mf.has_phone,
                            has_address: mf.has_address,
                            has_website: mf.has_website
                        },
                        similarity
                    });
                    break; // Take first good match
                }
            }
        }
    }

    // Sort fuzzy matches by similarity
    fuzzyMatches.sort((a, b) => b.similarity - a.similarity);

    // Output results
    console.log("=".repeat(60));
    console.log(`📊 RESULTS`);
    console.log("=".repeat(60));
    console.log(`   Exact matches: ${exactMatches.length}`);
    console.log(`   Fuzzy matches (>=70%): ${fuzzyMatches.length}`);
    console.log(`   Total potential cross-matches: ${exactMatches.length + fuzzyMatches.length}\n`);

    if (exactMatches.length > 0) {
        console.log("\n🎯 EXACT MATCHES:");
        console.log("-".repeat(60));
        exactMatches.forEach((m, i) => {
            const data = [m.has_phone ? '📞' : '', m.has_address ? '📍' : '', m.has_website ? '🌐' : ''].filter(Boolean).join(' ') || '—';
            console.log(`${i + 1}. Row ${m.mistaken_row}: "${m.found_instead}"`);
            console.log(`   → Matches: "${m.matches_institution}" (${m.county})`);
            console.log(`   Data available: ${data}\n`);
        });
    }

    if (fuzzyMatches.length > 0) {
        console.log("\n🔄 FUZZY MATCHES (70%+ similarity):");
        console.log("-".repeat(60));
        fuzzyMatches.slice(0, 20).forEach((fm, i) => {
            const m = fm.match;
            const data = [m.has_phone ? '📞' : '', m.has_address ? '📍' : '', m.has_website ? '🌐' : ''].filter(Boolean).join(' ') || '—';
            console.log(`${i + 1}. Row ${m.mistaken_row} (${Math.round(fm.similarity * 100)}%): "${m.found_instead}"`);
            console.log(`   → Matches: "${m.matches_institution}" (${m.county})`);
            console.log(`   Data available: ${data}\n`);
        });
        if (fuzzyMatches.length > 20) {
            console.log(`   ... and ${fuzzyMatches.length - 20} more fuzzy matches`);
        }
    }

    // Save results
    const allMatches = {
        exact: exactMatches,
        fuzzy: fuzzyMatches.map(f => ({ ...f.match, similarity: f.similarity })),
        summary: {
            total_mistaken: mistakenFinds.length,
            total_missing: missingInstitutions.length,
            exact_matches: exactMatches.length,
            fuzzy_matches: fuzzyMatches.length
        }
    };

    const outputFile = path.join(__dirname, 'data', 'cross_match_opportunities.json');
    fs.writeFileSync(outputFile, JSON.stringify(allMatches, null, 2));
    console.log(`\n✅ Results saved to: ${outputFile}`);
}

main().catch(console.error);
