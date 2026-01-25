
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VERIFIED_FILE = path.join(__dirname, 'data', 'tvet_verified_enrichment.json');

// List of manually approved items (Cumulative)
const MANUAL_APPROVALS = [
    // Batch 1
    "African Institute of Research and Development Studies",
    "AHITI Ndomba",
    "Butsotso Central County Polytechnic",
    "DELIGHT TECHNICAL COLLEGE",
    "Docawood College",
    "ICS Technical College",
    "Kenia College",
    "KIPKELION TECHNICAL TRAINING INSTITUTE",
    "KUTRRH Training Institute",
    "LAKE INSTITUTE OF TROPICAL MEDICINE",
    "Medstar Training Institute",
    "NYS Tumaini Agricultural College",
    "PERFECT INSTITUTE OF TECHNOLOGY",
    "Pretata Institute of Professional Studies",
    "SEKU Mtito Andei TVET Center",
    "St. Dominics Technical",
    "West Wick College",
    // Batch 2
    "Lusaka Institute of Science and Technology",
    "Kairo College of Leadership and Hospitality",
    "Sipet College of Professional Studies",
    "Headway College",
    "Frelearn Training College",
    "RAHMA LUMINOUS COLLEGE",
    "MIRERA VOCATIONAL TRAINING CENTER",
    "Igembe Central Technical",
    "MANNA COLLEGE",
    "Saku Technical and Vocational College",
    "Marere Technical and Vocational College",
    "Yatta Technical and Vocational College"
];

// Words to ignore when checking for core name identity
const IGNORE_WORDS = [
    "institute", "college", "centre", "center", "training", "vocational", "technical", "school",
    "academy", "professional", "studies", "campus", "polytechnic", "university", "of", "and", "&", "the", "for", "in", "at"
];

const BUSINESS_KEYWORDS = ["ltd", "limited", "motors", "salon", "parlour", "enterprises", "solutions", "cyber", "shop", "clinic", "hospital"];

function cleanName(name: string): string {
    return name.toLowerCase()
        .replace(/[^a-z0-9 ]/g, '') // Remove punctuation
        .split(' ')
        .filter(w => !IGNORE_WORDS.includes(w))
        .join(' ')
        .trim();
}

function refineData() {
    console.log("🔄 Refining Verification Data...");

    if (!fs.existsSync(VERIFIED_FILE)) {
        console.error("File not found:", VERIFIED_FILE);
        return;
    }

    const data = JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf-8'));
    let manualCount = 0;
    let affiliationCount = 0;

    const updatedData = data.map((item: any) => {
        // 1. Mark Manual Approvals
        const matchManual = MANUAL_APPROVALS.some(term => item.db_name.toLowerCase().includes(term.toLowerCase()));
        if (matchManual && (item.status === 'INVALID_LOW_CONFIDENCE' || item.status === 'MISMATCH_CROSS_MATCH' || item.status === 'INVALID_GENERIC' || item.status === 'POTENTIAL_AFFILIATION')) {
            item.status = 'MANUAL_APPROVAL';
            manualCount++;
            return item;
        }

        // 2. Detect Affiliations (Parent/Child relationships OR Business/Location)
        if (item.status === 'INVALID_LOW_CONFIDENCE' || item.status === 'MISMATCH_CROSS_MATCH') {
            const dbClean = item.db_name.toLowerCase();
            const scrapedClean = item.scraped_name.toLowerCase();

            // A. Strict Substring Check
            const dbContainsScraped = dbClean.includes(scrapedClean);
            const scrapedContainsDb = scrapedClean.includes(dbClean);

            // B. Core Name Match
            const dbCore = cleanName(item.db_name);
            const scrapedCore = cleanName(item.scraped_name);
            const coreMatch = dbCore === scrapedCore && dbCore.length > 3;

            // C. Keyword Affiliation (Hospital, University)
            const bothHospital = dbClean.includes('hospital') && scrapedClean.includes('hospital');

            // D. Business / Location Heuristics (User Requested)
            const hasBusinessKeyword = BUSINESS_KEYWORDS.some(k => scrapedClean.includes(k));

            // Location Check: If scraped name is very short (likely just a town name) and contained in DB name
            // e.g. Scraped: "Nakuru", DB: "Nakuru Training College"
            const isLocationOrShort = scrapedClean.split(' ').length <= 2 && dbClean.includes(scrapedClean) && scrapedClean.length > 3;

            if (dbContainsScraped || scrapedContainsDb || coreMatch || bothHospital || hasBusinessKeyword || isLocationOrShort) {
                item.status = 'POTENTIAL_AFFILIATION';
                if (hasBusinessKeyword) item.notes = '(Business Affiliation?)';
                else if (isLocationOrShort) item.notes = '(Location/Short Name Match)';
                else item.notes = '(Likely Affiliated)';

                affiliationCount++;
            }
        }

        return item;
    });

    fs.writeFileSync(VERIFIED_FILE, JSON.stringify(updatedData, null, 2));
    console.log(`✅ Refinement Complete.`);
    console.log(`   - Manual Approvals Marked: ${manualCount}`);
    console.log(`   - Potential Affiliations Identified: ${affiliationCount}`);
}

refineData();
