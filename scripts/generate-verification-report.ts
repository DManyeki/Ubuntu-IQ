
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INPUT_FILE = path.join(__dirname, 'data', 'tvet_verified_enrichment.json');
// Determine the correct artifacts directory path: C:\Users\Manyeki\.gemini\antigravity\brain\68468854-3f41-4d77-b9fe-cebe2cd0de0a
const OUTPUT_FILE = path.join('C:', 'Users', 'Manyeki', '.gemini', 'antigravity', 'brain', '68468854-3f41-4d77-b9fe-cebe2cd0de0a', 'verification_report.md');

function generateReport() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error("Input file not found.");
        return;
    }

    const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));

    // Filter Lists
    const crossMatches = data.filter((i: any) => i.status === 'MISMATCH_CROSS_MATCH');
    const affiliations = data.filter((i: any) => i.status === 'POTENTIAL_AFFILIATION');
    const lowConfidence = data.filter((i: any) => i.status === 'INVALID_LOW_CONFIDENCE');
    const generic = data.filter((i: any) => i.status === 'INVALID_GENERIC');

    let md = `# TVET Data Verification Report

## 📊 Summary
| Category | Count | Action Taken |
| :--- | :--- | :--- |
| **✅ Valid Matches** | ${data.filter((i: any) => i.status.includes('VALID')).length} | Updated Database |
| **🤝 Likely Affiliations** | ${affiliations.length} | **New!** Review Needed |
| **🚩 Cross-Matches** | ${crossMatches.length} | Blocked Update |
| **⚠️ Low Confidence** | ${lowConfidence.length} | Blocked Update |
| **🗑️ Generic/Invalid** | ${generic.length} | Discarded |

---

## 🤝 Likely Affiliations (${affiliations.length})
**Status:** BLOCKED. These appear to be related entities (e.g. Hospital vs College).
**Action:** Check the box ` + "`[x]`" + ` to **APPROVE** (confirm they are the same or affiliated).

| [ ] | ID | Database Name | Found on Maps | Detected Match |
| :---: | :--- | :--- | :--- | :--- |
`;

    affiliations.forEach((item: any) => {
        md += `| [ ] | \`${item.id.substring(0, 8)}\` | ${item.db_name} | ${item.scraped_name} | ${item.notes} |\n`;
    });

    md += `\n## 🚩 Cross-Matches (${crossMatches.length})
**Status:** BLOCKED. Name mismatches or collisions.
**Action:** Check the box ` + "`[x]`" + ` to **APPROVE** (if valid).

| [ ] | ID | Database Name | Found on Maps | Detected Match |
| :---: | :--- | :--- | :--- | :--- |
`;

    crossMatches.forEach((item: any) => {
        md += `| [ ] | \`${item.id.substring(0, 8)}\` | ${item.db_name} | **${item.scraped_name}** | ${item.notes} |\n`;
    });

    md += `\n## ⚠️ Low Confidence Matches (${lowConfidence.length})
**Status:** BLOCKED (Not in DB).
**Action:** Check the box ` + "`[x]`" + ` to **APPROVE** the match for update.

| [ ] | ID | Database Name | Found on Maps | Similarity |
| :---: | :--- | :--- | :--- | :--- |
`;

    lowConfidence.forEach((item: any) => {
        md += `| [ ] | \`${item.id.substring(0, 8)}\` | ${item.db_name} | ${item.scraped_name} | **${(item.similarity * 100).toFixed(0)}%** |\n`;
    });

    md += `\n## 🗑️ Generic / Invalid Results (${generic.length})
**Status:** DISCARDED (Not in DB).
**Action:** Check the box ` + "`[x]`" + ` to **RESTORE** (if it is actually valid).

| [ ] | ID | Institution Name (DB) | Scraped Result |
| :---: | :--- | :--- | :--- |
`;

    // FULL LIST (No Folding)
    generic.forEach((item: any) => {
        md += `| [ ] | \`${item.id.substring(0, 8)}\` | ${item.db_name} | ${item.scraped_name} |\n`;
    });

    fs.writeFileSync(OUTPUT_FILE, md);
    console.log(`Report generated: ${OUTPUT_FILE}`);
}

generateReport();
