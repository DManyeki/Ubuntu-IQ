
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INPUT_FILE = path.join(__dirname, 'data', 'tvet_verified_enrichment.json');
const OUTPUT_FILE = path.join('c:', 'Users', 'Manyeki', 'Desktop', 'Ubuntu-IQ', 'verification_report.md');

// 1. Validated List (17 items) - User provided these exact names/substrings earlier
const MANUAL_VERIFIED_TERMS = [
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
    "West Wick College"
];

function isAffiliated(dbName: string, scrapedName: string): boolean {
    const db = dbName.toLowerCase();
    const scraped = scrapedName.toLowerCase();

    // Hospital / Medical Link
    if (db.includes('hospital') && scraped.includes('hospital')) return true;
    if (db.includes('medical') && scraped.includes('hospital')) return true;

    // University / Campus Link
    if (db.includes('university') && scraped.includes('university')) return true;
    if (db.includes('campus') && scraped.includes('campus')) return true;

    // Substring match (e.g. "Siloam Hospital" in "Siloam Hospital College")
    if (db.includes(scraped) || scraped.includes(db)) return true;

    return false;
}

function generateReport() {
    console.log("📝 Generating Final Categorized Report...");

    if (!fs.existsSync(INPUT_FILE)) {
        console.error("Input file missing");
        return;
    }

    const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));

    // Get ALL Low Confidence items (ignoring previous status changes for the sake of the report structure)
    // We want to show the original "93" the user refers to.
    // In our data, they might have been marked MANUAL_APPROVAL or POTENTIAL_AFFILIATION in previous steps.
    // So we assume anything that WAS low confidence or is currently flagged as such.

    // Actually, to be safe, let's grab everything that isn't a VALID MATCH or CROSS MATCH.
    // Or better, let's look for the IDs that were originally low confidence.
    // Since we don't have the history, we'll filter by the status flags we likely set OR 'INVALID_LOW_CONFIDENCE'.

    let lowConfItems = data.filter((i: any) =>
        i.status === 'INVALID_LOW_CONFIDENCE' ||
        i.status === 'MANUAL_APPROVAL' ||
        i.status === 'POTENTIAL_AFFILIATION'
    );

    // --- CATEGORIZATION --
    const verifiedValues: any[] = [];
    const affiliations: any[] = [];
    const remaining: any[] = [];

    // Prioritize Manual List
    lowConfItems.forEach((item: any) => {
        const dbName = item.db_name;
        const isManual = MANUAL_VERIFIED_TERMS.some(term => dbName.toLowerCase().includes(term.toLowerCase()));

        if (isManual) {
            verifiedValues.push(item);
        } else if (isAffiliated(item.db_name, item.scraped_name)) {
            affiliations.push(item);
        } else {
            remaining.push(item);
        }
    });

    // --- MARKDOWN GENERATION ---
    let md = `# TVET Data Verification Report

## 📊 Summary
| Category | Count | Status |
| :--- | :--- | :--- |
| **✅ Verified Manually** | ${verifiedValues.length} | Approved (Data Updated) |
| **🤝 Likely Affiliations** | ${affiliations.length} | Needs Review |
| **⚠️ Remaining Low Confidence** | ${remaining.length} | Needs Review |

---

## 1. ✅ Verified Manually (${verifiedValues.length})
**Status:** You have already approved these. They are updated in the database.

| ID | Database Name | Found on Maps |
| :--- | :--- | :--- |
`;
    verifiedValues.forEach(i => {
        md += `| \`${i.id.substring(0, 8)}\` | ${i.db_name} | ${i.scraped_name} |\n`;
    });

    md += `\n## 2. 🤝 Likely Affiliations (${affiliations.length})
**Status:** These appear to be related (e.g. Hospital vs College).
**Action:** Check the box ` + "`[x]`" + ` to **APPROVE**.

| [ ] | ID | Database Name | Found on Maps | Similarity |
| :---: | :--- | :--- | :--- | :--- |
`;
    affiliations.forEach(i => {
        md += `| [ ] | \`${i.id.substring(0, 8)}\` | ${i.db_name} | ${i.scraped_name} | **${(i.similarity * 100).toFixed(0)}%** |\n`;
    });

    md += `\n## 3. ⚠️ Remaining Low Confidence (${remaining.length})
**Status:** Mismatched names.
**Action:** Check the box ` + "`[x]`" + ` to **APPROVE** if valid.

| [ ] | ID | Database Name | Found on Maps | Similarity |
| :---: | :--- | :--- | :--- | :--- |
`;
    remaining.forEach(i => {
        md += `| [ ] | \`${i.id.substring(0, 8)}\` | ${i.db_name} | ${i.scraped_name} | **${(i.similarity * 100).toFixed(0)}%** |\n`;
    });

    fs.writeFileSync(OUTPUT_FILE, md);
    console.log(`✅ Report Re-Generated at: ${OUTPUT_FILE}`);
}

generateReport();
