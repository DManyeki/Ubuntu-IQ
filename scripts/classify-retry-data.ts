/**
 * Classify Google Maps Retry Data
 * 
 * This script processes the retry data (source: 'google_maps_retry') from tvet_google_maps.json
 * and classifies each item using the same categories as the original verification:
 * - VALID_HIGH: High similarity (>=70%)
 * - VALID_MEDIUM: Medium similarity (40-70%)
 * - RETRY_LOW_CONFIDENCE: Low similarity (<40%) but name found
 * - RETRY_STILL_GENERIC: Still shows "Results" or similar generic header
 * - RETRY_CROSS_MATCH: Found name matches a different institution
 * - RETRY_POTENTIAL_AFFILIATION: Possible business/location affiliation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAPS_FILE = path.join(__dirname, 'data', 'tvet_google_maps.json');
const VERIFIED_FILE = path.join(__dirname, 'data', 'tvet_verified_enrichment.json');
const OUTPUT_REPORT = path.join(__dirname, 'data', 'retry_classification_report.json');

// Words to skip when finding the first significant word
const SKIP_PREFIXES = ['the', 'st', 'st.', 'saint', 'aic', 'ack', 'pcea', 'nys', 'kmtc', 'kca', 'ku', 'seku'];
const COMMON_SUFFIXES = ['vocational', 'training', 'center', 'centre', 'institute', 'college',
    'technical', 'polytechnic', 'school', 'academy', 'university', 'tvet', 'vtc', 'campus',
    'professional', 'studies', 'technology', 'management', 'sciences', 'development'];

// Extract the first significant word (the institution's actual name)
function getFirstSignificantWord(name: string): string {
    const words = name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 1);

    for (const word of words) {
        // Skip common prefixes and suffixes
        if (!SKIP_PREFIXES.includes(word) && !COMMON_SUFFIXES.includes(word)) {
            return word;
        }
    }
    return words[0] || '';
}

// Check if first significant words match (or are very similar)
function firstWordMatches(db: string, scraped: string): boolean {
    const dbFirst = getFirstSignificantWord(db);
    const scrapedFirst = getFirstSignificantWord(scraped);

    if (!dbFirst || !scrapedFirst) return false;

    // Exact match
    if (dbFirst === scrapedFirst) return true;

    // One contains the other (handles abbreviations like "Cheptarit" vs "Chep")
    if (dbFirst.length >= 4 && scrapedFirst.length >= 4) {
        if (dbFirst.includes(scrapedFirst) || scrapedFirst.includes(dbFirst)) return true;
    }

    // First 4 chars match (handles minor spelling variations)
    if (dbFirst.length >= 4 && scrapedFirst.length >= 4) {
        if (dbFirst.substring(0, 4) === scrapedFirst.substring(0, 4)) return true;
    }

    return false;
}

// More accurate similarity using token matching
function tokenSimilarity(db: string, scraped: string): number {
    const dbTokens = db.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(t => t.length > 2);
    const scrapedTokens = scraped.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(t => t.length > 2);

    if (dbTokens.length === 0 || scrapedTokens.length === 0) return 0;

    let matchCount = 0;
    for (const token of dbTokens) {
        if (scrapedTokens.some(st => st.includes(token) || token.includes(st))) {
            matchCount++;
        }
    }

    return matchCount / Math.max(dbTokens.length, scrapedTokens.length);
}

// Combined similarity score with first-word priority
function calculateSimilarity(db: string, scraped: string): { score: number; firstWordMatch: boolean; tokenScore: number } {
    const firstMatch = firstWordMatches(db, scraped);
    const tokenScore = tokenSimilarity(db, scraped);

    // If first words match, boost the score significantly
    // If first words don't match, cap the score at 0.5 max
    let score: number;
    if (firstMatch) {
        score = 0.5 + (tokenScore * 0.5); // Range: 0.5 to 1.0
    } else {
        score = tokenScore * 0.5; // Range: 0 to 0.5
    }

    return { score, firstWordMatch: firstMatch, tokenScore };
}

// Check if still generic
function isGenericResult(name: string): boolean {
    const genericPatterns = ['Results', 'Google Maps', 'Kenya', 'Search', 'Maelezo', 'Matokeo', 'Sponsored'];
    return genericPatterns.includes(name.trim());
}

// Check for affiliation patterns
function isLikelyAffiliation(db: string, scraped: string): boolean {
    const dbLower = db.toLowerCase();
    const scrapedLower = scraped.toLowerCase();

    // Business keywords
    const businessKeywords = ['ltd', 'limited', 'motors', 'salon', 'hotel', 'hospital', 'clinic', 'supermarket', 'shop', 'youth polytechnic'];
    const hasBusinessKeyword = businessKeywords.some(k => scrapedLower.includes(k) && !dbLower.includes(k));

    // Substring match (one contains the other)
    const dbContainsScraped = dbLower.includes(scrapedLower);
    const scrapedContainsDb = scrapedLower.includes(dbLower);

    // Core name match - extract significant parts
    const dbCore = dbLower.replace(/(vocational|training|center|centre|institute|college|technical|polytechnic|school|academy|and|of|the)/g, '').trim();
    const scrapedCore = scrapedLower.replace(/(vocational|training|center|centre|institute|college|technical|polytechnic|school|academy|and|of|the)/g, '').trim();

    return hasBusinessKeyword || dbContainsScraped || scrapedContainsDb ||
        (dbCore.length > 4 && scrapedCore.includes(dbCore)) ||
        (scrapedCore.length > 4 && dbCore.includes(scrapedCore));
}

interface ClassificationResult {
    id: string;
    db_name: string;
    retry_scraped_name: string;
    original_scraped_name: string;
    similarity: number;
    first_word_match: boolean;
    status: string;
    has_phone: boolean;
    has_address: boolean;
    has_website: boolean;
    maps_link?: string;
    notes: string;
}

async function main() {
    console.log("📊 Classifying Google Maps Retry Data...\n");

    // Load data
    const mapsData = JSON.parse(fs.readFileSync(MAPS_FILE, 'utf-8'));
    const verifiedData = JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf-8'));

    // Get retry items
    const retryItems = mapsData.filter((m: any) => m.source === 'google_maps_retry');
    console.log(`Found ${retryItems.length} retry items to classify.\n`);

    // Create lookup for original verification
    const verifiedMap = new Map(verifiedData.map((v: any) => [v.id, v]));

    // Classification counters
    const stats = {
        RETRY_VALID_HIGH: 0,
        RETRY_VALID_MEDIUM: 0,
        RETRY_LOW_CONFIDENCE: 0,
        RETRY_STILL_GENERIC: 0,
        RETRY_POTENTIAL_AFFILIATION: 0,
        RETRY_NO_DATA: 0,
    };

    const results: ClassificationResult[] = [];

    for (const item of retryItems) {
        const original = verifiedMap.get(item.id) as any;
        if (!original) continue;

        const dbName = item.name || original.db_name;
        const scrapedName = item.google_maps?.name || '';
        const hasPhone = !!item.google_maps?.phone;
        const hasAddress = !!item.google_maps?.address;
        const hasWebsite = !!item.google_maps?.website;
        const mapsLink = item.google_maps?.maps_link;

        let status = 'RETRY_NO_DATA';
        let notes = '';

        if (!scrapedName || scrapedName.length === 0) {
            status = 'RETRY_NO_DATA';
            stats.RETRY_NO_DATA++;
        } else if (isGenericResult(scrapedName)) {
            // Still generic but may have useful data (phone/address)
            status = 'RETRY_STILL_GENERIC';
            stats.RETRY_STILL_GENERIC++;
            if (hasPhone || hasAddress) {
                notes = `Has contact data: ${hasPhone ? 'Phone' : ''} ${hasAddress ? 'Address' : ''}`.trim();
            }
        } else {
            // Calculate similarity with first-word priority
            const simResult = calculateSimilarity(dbName, scrapedName);
            const { score, firstWordMatch, tokenScore } = simResult;

            // Classification based on combined score
            // VALID_HIGH requires first word match AND decent token similarity
            if (firstWordMatch && score >= 0.65) {
                status = 'RETRY_VALID_HIGH';
                stats.RETRY_VALID_HIGH++;
            } else if (firstWordMatch && score >= 0.5) {
                status = 'RETRY_VALID_MEDIUM';
                stats.RETRY_VALID_MEDIUM++;
                notes = `First word matches: "${getFirstSignificantWord(dbName)}"`;
            } else if (!firstWordMatch && isLikelyAffiliation(dbName, scrapedName)) {
                status = 'RETRY_POTENTIAL_AFFILIATION';
                stats.RETRY_POTENTIAL_AFFILIATION++;
                notes = `Possible affiliation (different first name: "${getFirstSignificantWord(dbName)}" vs "${getFirstSignificantWord(scrapedName)}")`;
            } else if (firstWordMatch) {
                // First word matches but low token similarity - still medium
                status = 'RETRY_VALID_MEDIUM';
                stats.RETRY_VALID_MEDIUM++;
                notes = `First word matches but low overall similarity`;
            } else {
                status = 'RETRY_LOW_CONFIDENCE';
                stats.RETRY_LOW_CONFIDENCE++;
                notes = `First words don't match: "${getFirstSignificantWord(dbName)}" vs "${getFirstSignificantWord(scrapedName)}"`;
            }
        }

        results.push({
            id: item.id,
            db_name: dbName,
            retry_scraped_name: scrapedName,
            original_scraped_name: original.scraped_name,
            similarity: scrapedName ? calculateSimilarity(dbName, scrapedName).score : 0,
            first_word_match: scrapedName ? firstWordMatches(dbName, scrapedName) : false,
            status,
            has_phone: hasPhone,
            has_address: hasAddress,
            has_website: hasWebsite,
            maps_link: mapsLink,
            notes
        });
    }

    // Generate report
    console.log("📊 Classification Summary:");
    console.log("=".repeat(50));
    console.log(`  ✅ RETRY_VALID_HIGH:          ${stats.RETRY_VALID_HIGH}`);
    console.log(`  ✓  RETRY_VALID_MEDIUM:        ${stats.RETRY_VALID_MEDIUM}`);
    console.log(`  ⚠️  RETRY_LOW_CONFIDENCE:      ${stats.RETRY_LOW_CONFIDENCE}`);
    console.log(`  🏢 RETRY_POTENTIAL_AFFILIATION: ${stats.RETRY_POTENTIAL_AFFILIATION}`);
    console.log(`  🔄 RETRY_STILL_GENERIC:        ${stats.RETRY_STILL_GENERIC}`);
    console.log(`  ❌ RETRY_NO_DATA:              ${stats.RETRY_NO_DATA}`);
    console.log("=".repeat(50));
    console.log(`  Total: ${results.length}`);

    // Save detailed report
    fs.writeFileSync(OUTPUT_REPORT, JSON.stringify(results, null, 2));
    console.log(`\n📝 Detailed report saved to: ${OUTPUT_REPORT}`);

    // Print sample of each category
    console.log("\n📋 Samples by Category:\n");

    for (const statusType of Object.keys(stats)) {
        const samples = results.filter(r => r.status === statusType).slice(0, 3);
        if (samples.length > 0) {
            console.log(`--- ${statusType} ---`);
            for (const s of samples) {
                console.log(`  DB: ${s.db_name}`);
                console.log(`  Found: ${s.retry_scraped_name || '(none)'}`);
                console.log(`  Similarity: ${(s.similarity * 100).toFixed(1)}% | Phone: ${s.has_phone} | Address: ${s.has_address}`);
                if (s.notes) console.log(`  Notes: ${s.notes}`);
                console.log();
            }
        }
    }
}

main().catch(console.error);
