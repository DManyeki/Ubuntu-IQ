/**
 * Generate Retry Approval Report
 * 
 * Creates a markdown report sorted by validity categories for user approval
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, 'data', 'retry_classification_report.json');
const OUTPUT_FILE = path.join(__dirname, 'data', 'retry_approval_list.md');

interface ClassificationResult {
    id: string;
    db_name: string;
    retry_scraped_name: string;
    original_scraped_name: string;
    similarity: number;
    status: string;
    has_phone: boolean;
    has_address: boolean;
    has_website: boolean;
    maps_link?: string;
    notes: string;
}

function main() {
    console.log("📝 Generating Retry Approval Report...\n");

    const data: ClassificationResult[] = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));

    // Group by status
    const groups: { [key: string]: ClassificationResult[] } = {
        'RETRY_VALID_HIGH': [],
        'RETRY_VALID_MEDIUM': [],
        'RETRY_POTENTIAL_AFFILIATION': [],
        'RETRY_LOW_CONFIDENCE': [],
        'RETRY_STILL_GENERIC': [],
        'RETRY_NO_DATA': []
    };

    for (const item of data) {
        if (groups[item.status]) {
            groups[item.status].push(item);
        }
    }

    // Statistics
    const stats = Object.entries(groups).map(([status, items]) => ({ status, count: items.length }));

    let md = `# 🔄 Google Maps Retry - Approval List

> **Generated:** ${new Date().toISOString().split('T')[0]}  
> **Total Items:** ${data.length}

## 📊 Summary

| Category | Count | Description |
| :--- | :---: | :--- |
| ✅ **RETRY_VALID_HIGH** | ${groups['RETRY_VALID_HIGH'].length} | Exact or near-exact name match (≥70% similarity) |
| ✓ **RETRY_VALID_MEDIUM** | ${groups['RETRY_VALID_MEDIUM'].length} | Moderate similarity (40-70%) - review recommended |
| 🏢 **RETRY_POTENTIAL_AFFILIATION** | ${groups['RETRY_POTENTIAL_AFFILIATION'].length} | Possible business/location affiliation |
| ⚠️ **RETRY_LOW_CONFIDENCE** | ${groups['RETRY_LOW_CONFIDENCE'].length} | Low similarity (<40%) - likely different institution |
| 🔄 **RETRY_STILL_GENERIC** | ${groups['RETRY_STILL_GENERIC'].length} | Still returning "Results" or similar |
| ❌ **RETRY_NO_DATA** | ${groups['RETRY_NO_DATA'].length} | No data captured |

---

## ✅ RETRY_VALID_HIGH (${groups['RETRY_VALID_HIGH'].length})

**Status:** READY FOR APPROVAL. These are high-confidence matches.

| # | Database Name | Found on Maps | 📞 | 📍 | 🌐 |
| :---: | :--- | :--- | :---: | :---: | :---: |
`;

    groups['RETRY_VALID_HIGH'].forEach((item, i) => {
        const phone = item.has_phone ? '✓' : '';
        const address = item.has_address ? '✓' : '';
        const website = item.has_website ? '✓' : '';
        md += `| ${i + 1} | ${item.db_name} | ${item.retry_scraped_name} | ${phone} | ${address} | ${website} |\n`;
    });

    md += `
---

## ✓ RETRY_VALID_MEDIUM (${groups['RETRY_VALID_MEDIUM'].length})

**Status:** REVIEW NEEDED. Moderate matches - verify before approval.

| # | Database Name | Found on Maps | Similarity | 📞 | 📍 | 🌐 |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
`;

    groups['RETRY_VALID_MEDIUM'].forEach((item, i) => {
        const phone = item.has_phone ? '✓' : '';
        const address = item.has_address ? '✓' : '';
        const website = item.has_website ? '✓' : '';
        const sim = `${(item.similarity * 100).toFixed(0)}%`;
        md += `| ${i + 1} | ${item.db_name} | ${item.retry_scraped_name} | ${sim} | ${phone} | ${address} | ${website} |\n`;
    });

    md += `
---

## 🏢 RETRY_POTENTIAL_AFFILIATION (${groups['RETRY_POTENTIAL_AFFILIATION'].length})

**Status:** POSSIBLE AFFILIATION. Different name but may be related/parent organization.

| # | Database Name | Found on Maps | Similarity | 📞 | 📍 | Notes |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |
`;

    groups['RETRY_POTENTIAL_AFFILIATION'].forEach((item, i) => {
        const phone = item.has_phone ? '✓' : '';
        const address = item.has_address ? '✓' : '';
        const sim = `${(item.similarity * 100).toFixed(0)}%`;
        md += `| ${i + 1} | ${item.db_name} | ${item.retry_scraped_name} | ${sim} | ${phone} | ${address} | ${item.notes} |\n`;
    });

    md += `
---

## ⚠️ RETRY_LOW_CONFIDENCE (${groups['RETRY_LOW_CONFIDENCE'].length})

**Status:** LIKELY MISMATCH. Different institution found - do not approve without verification.

| # | Database Name | Found on Maps | Similarity | 📞 | 📍 |
| :---: | :--- | :--- | :---: | :---: | :---: |
`;

    groups['RETRY_LOW_CONFIDENCE'].forEach((item, i) => {
        const phone = item.has_phone ? '✓' : '';
        const address = item.has_address ? '✓' : '';
        const sim = `${(item.similarity * 100).toFixed(0)}%`;
        md += `| ${i + 1} | ${item.db_name} | ${item.retry_scraped_name} | ${sim} | ${phone} | ${address} |\n`;
    });

    md += `
---

## 🔄 RETRY_STILL_GENERIC (${groups['RETRY_STILL_GENERIC'].length})

**Status:** NO SPECIFIC RESULT. Google Maps returned list view without specific place.

| # | Database Name | Has Phone | Has Address | Has Website |
| :---: | :--- | :---: | :---: | :---: |
`;

    groups['RETRY_STILL_GENERIC'].forEach((item, i) => {
        const phone = item.has_phone ? '✓' : '';
        const address = item.has_address ? '✓' : '';
        const website = item.has_website ? '✓' : '';
        md += `| ${i + 1} | ${item.db_name} | ${phone} | ${address} | ${website} |\n`;
    });

    md += `
---

## ❌ RETRY_NO_DATA (${groups['RETRY_NO_DATA'].length})

**Status:** NO DATA CAPTURED. These need manual lookup.

| # | Database Name |
| :---: | :--- |
`;

    groups['RETRY_NO_DATA'].forEach((item, i) => {
        md += `| ${i + 1} | ${item.db_name} |\n`;
    });

    fs.writeFileSync(OUTPUT_FILE, md);
    console.log(`✅ Report generated: ${OUTPUT_FILE}`);
    console.log(`\n📊 Summary:`);
    stats.forEach(s => console.log(`   ${s.status}: ${s.count}`));
}

main();
