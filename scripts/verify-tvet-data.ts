
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INPUT_FILE = path.join(__dirname, 'data', 'tvet_google_maps.json'); // Contains both DB info and Google Maps info
const OUTPUT_FILE = path.join(__dirname, 'data', 'tvet_verified_enrichment.json');

// --- Types ---
interface VerificationResult {
    id: string; // DB ID
    db_name: string;
    scraped_name: string;
    similarity: number;
    status: 'VALID_HIGH' | 'VALID_MEDIUM' | 'VALID_CAMPUS' | 'MISMATCH_CROSS_MATCH' | 'INVALID_GENERIC' | 'INVALID_LOW_CONFIDENCE' | 'NOT_FOUND';
    notes?: string;
    cross_match_id?: string; // If found to belong to another institution
}

// --- Logic ---

function levenshtein(a: string, b: string): number {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function calculateSimilarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    if (longer.length === 0) return 1.0;
    return (longer.length - levenshtein(s1, s2)) / longer.length;
}

function cleanName(name: string): string {
    return name.toLowerCase()
        .replace(/technical/g, '')
        .replace(/vocational/g, '')
        .replace(/training/g, '')
        .replace(/center/g, '')
        .replace(/centre/g, '')
        .replace(/institute/g, '')
        .replace(/college/g, '')
        .replace(/technology/g, '')
        .replace(/polytechnic/g, '')
        .replace(/[.,\-()]/g, '')
        .trim();
}

function main() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error("Input file not found.");
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    console.log(`Loaded ${rawData.length} records.`);

    // 1. Build Reference Database (ID -> Name) for Cross-Referencing
    const dbReference = new Map<string, string>(); // ID -> Name
    const nameToId = new Map<string, string>(); // NormalizedName -> ID (for quick lookup)

    rawData.forEach((item: any) => {
        dbReference.set(item.id, item.name);
        const norm = cleanName(item.name);
        if (norm.length > 3) nameToId.set(norm, item.id);
    });

    const results: VerificationResult[] = [];

    // 2. Process Records
    rawData.forEach((item: any) => {
        const dbName = item.name;
        const mapsData = item.google_maps;

        // Skip "Not Found"
        if (!mapsData || !mapsData.found || !mapsData.name) {
            results.push({
                id: item.id,
                db_name: dbName,
                scraped_name: "N/A",
                similarity: 0,
                status: 'NOT_FOUND'
            });
            return;
        }

        const scrapedName = mapsData.name;
        const sim = calculateSimilarity(dbName.toLowerCase(), scrapedName.toLowerCase());

        let status: VerificationResult['status'] = 'INVALID_LOW_CONFIDENCE';
        let notes = '';
        let crossMatchId: string | undefined = undefined;

        // 2a. Generic Check
        if (['results', 'kenya', 'search'].includes(scrapedName.toLowerCase())) {
            status = 'INVALID_GENERIC';
        }
        // 2b. High Confidence
        else if (sim > 0.6) {
            status = 'VALID_HIGH';
        }
        // 2c. Medium Confidence vs Campus Logic
        else if (sim > 0.4) {
            status = 'VALID_MEDIUM';
        }
        else {
            // 2d. Advanced Checks for Low Confidence

            // Check Campus Logic: Scraped has "Campus" and DB Name is inside Scraped Name (or vice versa)
            // e.g. DB="Nairobi TTI", Scraped="Nairobi TTI - West Campus"
            if (scrapedName.toLowerCase().includes('campus')) {
                const baseSim = calculateSimilarity(cleanName(dbName), cleanName(scrapedName));
                if (baseSim > 0.5) {
                    status = 'VALID_CAMPUS';
                    notes = 'Campus Variation Detected';
                }
            }

            // Cross-Reference Check: Does Scraped Name match ANOTHER institution better?
            if (status === 'INVALID_LOW_CONFIDENCE') {
                const scrapedNorm = cleanName(scrapedName);
                let bestMatchId: string | undefined;
                let bestMatchSim = 0;

                // Quick lookup first
                if (nameToId.has(scrapedNorm)) {
                    bestMatchId = nameToId.get(scrapedNorm);
                    bestMatchSim = 1.0;
                } else {
                    // Full scan (expensive but necessary for 2000 items it's fine)
                    for (const [refId, refName] of dbReference.entries()) {
                        if (refId === item.id) continue; // Skip self
                        const refSim = calculateSimilarity(refName.toLowerCase(), scrapedName.toLowerCase());
                        if (refSim > bestMatchSim) {
                            bestMatchSim = refSim;
                            bestMatchId = refId;
                        }
                    }
                }

                if (bestMatchSim > 0.7 && bestMatchId) {
                    status = 'MISMATCH_CROSS_MATCH';
                    crossMatchId = bestMatchId;
                    notes = `Matches ${dbReference.get(bestMatchId)} (${(bestMatchSim * 100).toFixed(0)}%)`;
                }
            }
        }

        results.push({
            id: item.id,
            db_name: dbName,
            scraped_name: scrapedName,
            similarity: sim,
            status,
            notes,
            cross_match_id: crossMatchId
        });
    });

    // 3. Output
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

    // Stats
    const stats = results.reduce((acc: any, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
    }, {});

    console.log("✅ Verification Complete");
    console.log(JSON.stringify(stats, null, 2));

    // Examples of Cross Matches
    console.log("\n🚩 Cross-Reference Examples:");
    results.filter(r => r.status === 'MISMATCH_CROSS_MATCH').slice(0, 5).forEach(r => {
        console.log(`   DB: "${r.db_name}" -> Scraped: "${r.scraped_name}"`);
        console.log(`      ↳ Matches: "${r.notes}"`);
    });

    // Examples of Campus Matches
    console.log("\n🏫 Campus Logic Examples:");
    results.filter(r => r.status === 'VALID_CAMPUS').slice(0, 5).forEach(r => {
        console.log(`   DB: "${r.db_name}" -> Scraped: "${r.scraped_name}"`);
    });
}

main();
