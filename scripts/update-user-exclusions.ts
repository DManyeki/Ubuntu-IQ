/**
 * Reclassify VALID_MEDIUM items based on user review
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORT_FILE = path.join(__dirname, 'data', 'retry_classification_report.json');

// Items to move from VALID_MEDIUM to VALID_HIGH
const MOVE_TO_HIGH = [
    "APOKOR VOCATIONAL TRAINING CENTER", // #3
    "KAITHERI VOCATIONAL TRAINING CENTER", // #7
    "KAKAMEGA VOCATIONAL TRAINING CENTER", // #8
    "KAKUYUNI VOCATIONAL TRAINING CENTER", // #9
    "KODICH VOCATIONAL TRAINING CENTRE", // #14
    "LINGUA VOCATIONAL & TRAINING CENTER", // #15
    "LIO COLLEGE", // #16
    "MAKUENI AGRICULTURE TRAINING CENTRE", // #17
    "MBALE VOCATIONAL TRAINING CENTER", // #18
    "Riara Business Training Institute", // #19
    "SIGOWET TECHNICAL TRAINING INSTITUTE", // #21
    "STRATHMORE INSTITUTE OF MANAGEMENT AND TECHNOLOGY", // #23
    "THE BARINGO NATIONAL POLYTECHNIC", // #24
    "Ujuzi Fursa Africa Training Institute - Mombasa", // #25
];

// Items to move from VALID_MEDIUM to POTENTIAL_AFFILIATION
const MOVE_TO_AFFILIATION = [
    "Almers Training College", // #1
    "AMREF VIRTUAL TRAINING SCHOOL", // #2
    "Bungoma Triune Technical Institute", // #4
    "Golden View Technical Training Institute", // #5
    "Heroes Institute of Technical Studies", // #6
    "KIAMBU INSTITUTE OF HOTELS AND CATERING", // #10
    "Kipsimbol Vocational Training Center", // #11
    "Kirinyaga Agricultural Technical and Vocational Education Training Centre", // #12
    "KISUMU COMMUNITY COLLEGE OF SCIENCE AND TECHNOLOGY", // #13
    "ROKA VOCATIONAL TRAINING CENTRE", // #20
    "ST. KIZITO", // #22
    "Upperhill College of Professional Studies", // #26
    "Wia Beauty Training College", // #27
];

function main() {
    console.log("🔧 Reclassifying VALID_MEDIUM items based on user review...\n");

    const data = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8'));

    let movedToHigh = 0;
    let movedToAffiliation = 0;

    for (const item of data) {
        if (MOVE_TO_HIGH.includes(item.db_name) && item.status === 'RETRY_VALID_MEDIUM') {
            console.log(`✅ → VALID_HIGH: ${item.db_name}`);
            item.status = 'RETRY_VALID_HIGH';
            item.notes = 'User approved: moved from VALID_MEDIUM';
            movedToHigh++;
        }

        if (MOVE_TO_AFFILIATION.includes(item.db_name) && item.status === 'RETRY_VALID_MEDIUM') {
            console.log(`🏢 → AFFILIATION: ${item.db_name}`);
            item.status = 'RETRY_POTENTIAL_AFFILIATION';
            item.notes = 'User flagged: possibly affiliated institution';
            movedToAffiliation++;
        }
    }

    // Save updated data
    fs.writeFileSync(REPORT_FILE, JSON.stringify(data, null, 2));

    console.log(`\n✅ Moved ${movedToHigh} items to VALID_HIGH`);
    console.log(`🏢 Moved ${movedToAffiliation} items to POTENTIAL_AFFILIATION`);
    console.log(`   Report saved to: ${REPORT_FILE}`);

    // Re-count categories
    const stats: { [key: string]: number } = {};
    for (const item of data) {
        stats[item.status] = (stats[item.status] || 0) + 1;
    }

    console.log("\n📊 Updated Summary:");
    for (const [status, count] of Object.entries(stats).sort()) {
        console.log(`   ${status}: ${count}`);
    }
}

main();
