/**
 * Categorize URL findings into actionable groups
 * Filters out directory listings and prioritizes name-matching domains
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Common directory/aggregator domains to assume are "Weak"
const DIRECTORY_DOMAINS = new Set([
    'education.co.ke',
    'educationnewshub.co.ke',
    'angazetu.com',
    'schoolandcollegelistings.com',
    'kenyayote.com',
    'victormatara.com',
    'tuko.co.ke',
    'kenyacolleges.co.ke',
    'kuccps.net',
    'tveta.go.ke', // Official DB, but not the institute's site
    'yellowpageskenya.com',
    'businesslist.co.ke'
]);

function isDirectory(domain: string): boolean {
    return DIRECTORY_DOMAINS.has(domain) || domain.includes('wordpress.com') || domain.includes('blogspot.com');
}

// Simple name matcher
function nameMatchesDomain(name: string, domain: string): boolean {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanDomain = domain.replace(/\.(co\.ke|ac\.ke|org|com|net|edu)$/, '').replace(/[^a-z0-9]/g, '');

    // Check if significant part of name is in domain
    if (cleanDomain.length < 4) return false;
    return cleanName.includes(cleanDomain) || cleanDomain.includes(cleanName.substring(0, 10)); // Heuristic
}

async function main() {
    console.log("📊 Categorizing URL Findings...\n");

    const newPath = path.join(__dirname, 'data', 'url_new_data.json');
    const mismatchPath = path.join(__dirname, 'data', 'url_mismatches.json');

    const newData = JSON.parse(fs.readFileSync(newPath, 'utf-8'));
    const mismatches = JSON.parse(fs.readFileSync(mismatchPath, 'utf-8'));

    const proposedUpdates = [];
    const proposedCorrections = [];
    const ignored = [];

    // Analyze New Data
    for (const item of newData) {
        if (isDirectory(item.found_domain)) {
            ignored.push({ ...item, reason: 'Directory Listing' });
        } else {
            proposedUpdates.push({ ...item, confidence: 'High' });
        }
    }

    // Analyze Mismatches
    for (const item of mismatches) {
        if (isDirectory(item.found_domain)) {
            ignored.push({ ...item, reason: 'Found URL is Directory' });
            continue;
        }

        const dbIsDirectory = isDirectory(item.db_domain);
        const nameMatch = nameMatchesDomain(item.institution, item.found_domain);

        if (dbIsDirectory && !isDirectory(item.found_domain)) {
            proposedCorrections.push({ ...item, reason: 'Replaces Directory with Site' });
        } else if (item.db_domain.includes('facebook') && !item.found_domain.includes('facebook')) {
            proposedCorrections.push({ ...item, reason: 'Replaces FB with Website' });
        } else if (nameMatch) {
            proposedCorrections.push({ ...item, reason: 'Domain Matches Name' });
        } else {
            ignored.push({ ...item, reason: 'Ambiguous Mismatch' });
        }
    }

    // Output Report
    console.log("=".repeat(60));
    console.log(`🚀 PROPOSED UPDATES (New Data): ${proposedUpdates.length}`);
    console.log("=".repeat(60));
    console.log("(Institutions missing websites where we found a valid candidate)\n");
    proposedUpdates.slice(0, 10).forEach((item, i) => {
        console.log(`${i + 1}. ${item.institution}`);
        console.log(`   + ${item.found_url}`);
    });

    console.log("\n" + "=".repeat(60));
    console.log(`🛠️ PROPOSED CORRECTIONS: ${proposedCorrections.length}`);
    console.log("=".repeat(60));
    console.log("(Replacing generic/directory links with likely official sites)\n");
    proposedCorrections.slice(0, 15).forEach((item, i) => {
        console.log(`${i + 1}. ${item.institution}`);
        console.log(`   ❌ ${item.db_url}`);
        console.log(`   ✅ ${item.found_url} [${item.reason}]`);
        console.log("");
    });

    // Save for Review
    const report = {
        updates: proposedUpdates,
        corrections: proposedCorrections
    };
    fs.writeFileSync(path.join(__dirname, 'data', 'proposed_url_updates.json'), JSON.stringify(report, null, 2));
    console.log(`\nSaved ${proposedUpdates.length} updates and ${proposedCorrections.length} corrections to: scripts/data/proposed_url_updates.json`);
}

main().catch(console.error);
