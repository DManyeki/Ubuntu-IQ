/**
 * Analyze campus relationships from mistaken finds data
 * Looking for institutions that appear in multiple counties (indicating campuses)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Match {
    mistaken_find: {
        found_instead: string;
        county: string;
        searched_for: string;
    };
    db_institution: {
        name: string;
        county: string;
        id: string;
    };
    similarity: number;
}

async function main() {
    console.log("📊 Analyzing Campus Relationships from Mistaken Finds...\n");

    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'mistaken_relationships.json'), 'utf-8'));

    const allMatches: Match[] = [
        ...(data.likely_same || []),
        ...(data.possible_campus || []),
        ...(data.possible_affiliation || [])
    ];

    console.log(`Total matches: ${allMatches.length}\n`);

    // 1. Find 100% matches that are cross-county
    console.log("=".repeat(60));
    console.log("🔍 100% SIMILARITY CROSS-COUNTY MATCHES");
    console.log("These indicate the SAME institution in different locations");
    console.log("=".repeat(60) + "\n");

    const crossCounty100 = allMatches.filter(m =>
        m.similarity >= 0.99 &&
        m.mistaken_find.county &&
        m.db_institution.county &&
        m.mistaken_find.county.toLowerCase() !== m.db_institution.county.toLowerCase()
    );

    console.log(`Found: ${crossCounty100.length}\n`);
    crossCounty100.forEach((m, i) => {
        console.log(`${i + 1}. ${m.mistaken_find.found_instead}`);
        console.log(`   Found in: ${m.mistaken_find.county}`);
        console.log(`   Matches DB: ${m.db_institution.name} (${m.db_institution.county})`);
        console.log();
    });

    // 2. Find same found_instead matching multiple DB institutions
    console.log("=".repeat(60));
    console.log("🏢 SAME GOOGLE RESULT → MULTIPLE DB INSTITUTIONS");
    console.log("=".repeat(60) + "\n");

    const byFound = new Map<string, Match[]>();
    for (const m of allMatches) {
        const found = m.mistaken_find.found_instead.toLowerCase();
        if (!byFound.has(found)) byFound.set(found, []);
        byFound.get(found)!.push(m);
    }

    const multiMatch = [...byFound.entries()].filter(([_, matches]) => matches.length > 1);
    console.log(`Found: ${multiMatch.length} results matching multiple institutions\n`);

    for (const [found, matches] of multiMatch.slice(0, 25)) {
        console.log(`"${matches[0].mistaken_find.found_instead}"`);
        matches.forEach(m => {
            console.log(`   → ${m.db_institution.name} (${m.db_institution.county})`);
        });
        console.log();
    }

    // 3. For affiliations - look for patterns
    console.log("=".repeat(60));
    console.log("🤝 CLEAR CAMPUS/BRANCH PATTERNS IN AFFILIATIONS");
    console.log("=".repeat(60) + "\n");

    const campusKeywords = ['campus', 'branch', 'thika', 'mombasa', 'kisumu', 'nakuru', 'eldoret', 'nairobi'];
    const campusAffiliations = data.possible_affiliation.filter((m: Match) => {
        const found = m.mistaken_find.found_instead.toLowerCase();
        const db = m.db_institution.name.toLowerCase();
        return campusKeywords.some(k => found.includes(k) || db.includes(k)) && m.similarity >= 0.5;
    });

    console.log(`Found: ${campusAffiliations.length}\n`);
    campusAffiliations.forEach((m: Match, i: number) => {
        if (i < 30) {
            console.log(`${i + 1}. "${m.mistaken_find.found_instead}" (${m.mistaken_find.county})`);
            console.log(`   → ${m.db_institution.name} (${m.db_institution.county}) [${Math.round(m.similarity * 100)}%]`);
        }
    });

    // Generate summary
    console.log("\n" + "=".repeat(60));
    console.log("📋 SUMMARY - POTENTIAL MULTI-CAMPUS INSTITUTIONS");
    console.log("=".repeat(60) + "\n");

    // Group by similar institution base names
    const instPatterns = [
        { name: 'EAICS / East Africa Institute of Certified Studies', pattern: /east africa institute of certified/i },
        { name: 'KIM / Kenya Institute of Management', pattern: /kenya institute of management/i },
        { name: 'AIRDS', pattern: /african institute of research/i },
        { name: 'KMTC', pattern: /kenya medical training college|kmtc/i },
        { name: 'Dykaan College', pattern: /dykaan/i },
        { name: 'Vera Beauty', pattern: /vera beauty/i },
        { name: 'Marianist', pattern: /marianist/i },
        { name: 'Macmillan', pattern: /macmillan/i },
        { name: 'Medprime', pattern: /medprime/i },
        { name: 'Thika School of Medical', pattern: /thika school of medical/i },
        { name: 'KCA University', pattern: /kca/i },
        { name: 'Amani Counselling', pattern: /amani counsel/i },
        { name: 'RIAT', pattern: /ramogi institute/i },
        { name: 'Kericho Township', pattern: /kericho township/i },
        { name: 'Nyamira Institute', pattern: /nyamira institute/i },
    ];

    for (const { name, pattern } of instPatterns) {
        const matches = allMatches.filter(m =>
            pattern.test(m.mistaken_find.found_instead) || pattern.test(m.db_institution.name)
        );
        if (matches.length > 0) {
            const counties = new Set([
                ...matches.map(m => m.mistaken_find.county),
                ...matches.map(m => m.db_institution.county)
            ].filter(Boolean));
            console.log(`${name}: ${matches.length} matches across ${counties.size} counties`);
            console.log(`   Counties: ${[...counties].join(', ')}`);
        }
    }
}

main().catch(console.error);
