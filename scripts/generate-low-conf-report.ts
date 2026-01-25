
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INPUT_FILE = path.join(__dirname, 'data', 'tvet_verified_enrichment.json');
const OUTPUT_FILE = path.join('c:', 'Users', 'Manyeki', 'Desktop', 'Ubuntu-IQ', 'low_confidence_report.md');

// 1. Validated List (Exact terms user provided)
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
    console.log("📝 Generating Dedicated Low Confidence Report...");

    if (!fs.existsSync(INPUT_FILE)) {
        console.error("Input file missing");
        return;
    }

    const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));

    // Filter strictly for the items that fell into conflict categories
    // (Low Confidence, Manual Approval, Affiliation) - Ignoring Cross-Matches for this specific report
    let items = data.filter((i: any) =>
        i.status === 'INVALID_LOW_CONFIDENCE' ||
        i.status === 'MANUAL_APPROVAL' ||
        i.status === 'POTENTIAL_AFFILIATION'
    );

    const verified: any[] = [];
    const affiliations: any[] = [];
    const remaining: any[] = [];

    items.forEach((item: any) => {
        if (item.status === 'MANUAL_APPROVAL' || item.status === 'AFFILIATION_APPROVED') {
            verified.push(item);
        } else if (item.status === 'POTENTIAL_AFFILIATION') {
            affiliations.push(item);
        } else {
            remaining.push(item);
        }
    });

    // --- MARKDOWN GENERATION ---
    let md = `# ⚠️ Low Confidence Matches Report

This report isolates only the "Low Confidence" items and splits them into the requested categories.

## 📊 Summary
| Category | Count | Status |
| :--- | :--- | :--- |
| **✅ 1. Verified Manually** | ${verified.length} | **Done** (In Database) |
| **🤝 2. Likely Affiliations** | ${affiliations.length} | **Needs Review** |
| **❓ 3. Remaining Items** | ${remaining.length} | **Needs Review** |

---

## 1. ✅ Verified Manually
**Status:** These are already approved and likely updated in the database. No action needed.

| ID | Database Name | Found on Maps |
| :--- | :--- | :--- |
`;
    // Sort alphabetically for easier reading
    verified.sort((a, b) => a.db_name.localeCompare(b.db_name));
    verified.forEach(i => {
        md += `| \`${i.id.substring(0, 8)}\` | ${i.db_name} | ${i.scraped_name} |\n`;
    });

    md += `\n## 2. 🤝 Likely Affiliations
**Status:** High probability of being correct (Parent/Child institution).
**Action:** Check the box ` + "`[x]`" + ` to **APPROVE**.

| [ ] | ID | Database Name | Found on Maps | Similarity |
| :---: | :--- | :--- | :--- | :--- |
`;
    affiliations.sort((a, b) => b.similarity - a.similarity);
    affiliations.forEach(i => {
        md += `| [ ] | \`${i.id.substring(0, 8)}\` | ${i.db_name} | ${i.scraped_name} | **${(i.similarity * 100).toFixed(0)}%** |\n`;
    });

    md += `\n## 3. ❓ Remaining Low Confidence Matches
**Status:** Very low similarity (< 40%). Verify carefully.
**Action:** Check the box ` + "`[x]`" + ` to **APPROVE** if valid.

| [ ] | ID | Database Name | Found on Maps | Similarity |
| :---: | :--- | :--- | :--- | :--- |
`;
    remaining.sort((a, b) => b.similarity - a.similarity);
    remaining.forEach(i => {
        md += `| [ ] | \`${i.id.substring(0, 8)}\` | ${i.db_name} | ${i.scraped_name} | **${(i.similarity * 100).toFixed(0)}%** |\n`;
    });

    fs.writeFileSync(OUTPUT_FILE, md);
    console.log(`✅ Dedicated Report Generated: ${OUTPUT_FILE}`);
}

generateReport();
