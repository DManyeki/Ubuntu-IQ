
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INPUT_FILE = path.join(__dirname, 'data', 'tvet_google_maps.json');

// Levenshtein distance for string similarity
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

function analyzeData() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error("File not found");
        return;
    }

    const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    const total = data.length;
    let found = 0;
    let notFound = 0;

    // Pattern Tracking
    const websiteCounts: Record<string, number> = {};
    const phoneCounts: Record<string, number> = {};
    const nameCounts: Record<string, number> = {};

    // Quality Buckets
    const highConfidence: any[] = [];
    const lowConfidence: any[] = [];
    const suspicious: any[] = []; // Duplicates, generics

    data.forEach((item: any) => {
        if (!item.google_maps || !item.google_maps.found) {
            notFound++;
            return;
        }
        found++;

        const gName = item.google_maps.name || "";
        const dbName = item.name || "";
        const website = item.google_maps.website;
        const phone = item.google_maps.phone;

        // Track Frequencies
        if (gName) nameCounts[gName] = (nameCounts[gName] || 0) + 1;
        if (website) websiteCounts[website] = (websiteCounts[website] || 0) + 1;
        if (phone) phoneCounts[phone] = (phoneCounts[phone] || 0) + 1;

        // Similarity Check
        const similarity = calculateSimilarity(dbName.toLowerCase(), gName.toLowerCase());

        // Categorize
        if (gName.toLowerCase() === 'results' || gName.toLowerCase() === 'kenya') {
            suspicious.push({ ...item, reason: "Generic Name" });
        } else if (similarity < 0.4) {
            lowConfidence.push({ ...item, similarity: similarity.toFixed(2), scraped: gName });
        } else {
            highConfidence.push(item);
        }
    });

    // Post-Process Stale Data (High Frequency)
    const duplicateWebsites = Object.entries(websiteCounts).filter(([_, count]) => count > 3);
    const duplicatePhones = Object.entries(phoneCounts).filter(([_, count]) => count > 3);
    const duplicateNames = Object.entries(nameCounts).filter(([_, count]) => count > 3);

    console.log(`📊 Analysis Results (${total} records)`);
    console.log(`----------------------------------------`);
    console.log(`✅ Found: ${found} (${((found / total) * 100).toFixed(1)}%)`);
    console.log(`❌ Not Found: ${notFound}`);
    console.log(`\n🔍 Quality Check:`);
    console.log(`   - High Confidence Matches: ${highConfidence.length}`);
    console.log(`   - Low Confidence / Mismatch: ${lowConfidence.length}`);
    console.log(`   - Suspicious (Generic): ${suspicious.length}`);

    console.log(`\n🚩 Potential Patterns (Stale Data / Aggregators):`);

    console.log(`\n   Most Frequent Scraped Names (Indicating "List View" capture or generic result):`);
    duplicateNames.sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([name, count]) => {
        console.log(`     - "${name}": ${count} times`);
    });

    console.log(`\n   Most Frequent Websites (Indicating directory usage or wrong match):`);
    duplicateWebsites.sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([site, count]) => {
        console.log(`     - ${site}: ${count} times`);
    });

    console.log(`\n   Most Frequent Phones:`);
    duplicatePhones.sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([ph, count]) => {
        console.log(`     - ${ph}: ${count} times`);
    });

    // Print samples
    console.log(`\nrandom Low Confidence Sample:`);
    lowConfidence.slice(0, 3).forEach(i => console.log(`   DB: "${i.name}" vs Scraped: "${i.scraped}" (Sim: ${i.similarity})`));

}

analyzeData();
