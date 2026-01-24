
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Common directory/aggregator domains (reused for consistency)
const DIRECTORY_DOMAINS = new Set([
    'education.co.ke', 'educationnewshub.co.ke', 'angazetu.com', 'schoolandcollegelistings.com',
    'kenyayote.com', 'victormatara.com', 'tuko.co.ke', 'kenyacolleges.co.ke', 'kuccps.net',
    'tveta.go.ke', 'yellowpageskenya.com', 'businesslist.co.ke', 'kenyaplex.com', 'colleges.co.ke',
    'courses.co.ke', 'glunis.com', 'africabizinfo.com', 'teacher.co.ke'
]);

function getDomain(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        let clean = url.toLowerCase().trim();
        if (clean.includes(' ')) clean = clean.split(' ')[0];
        if (!clean.startsWith('http')) clean = 'http://' + clean;
        const hostname = new URL(clean).hostname;
        return hostname.replace(/^www\./, '');
    } catch (e) {
        return null;
    }
}

function getRootDomain(domain: string): string {
    if (!domain) return '';
    const parts = domain.split('.');
    if (parts.length < 2) return domain;
    return parts[0];
}

async function checkUrl(url: string): Promise<{ status: number | string, finalUrl?: string }> {
    return new Promise((resolve) => {
        if (!url) return resolve({ status: 'Missing' });

        const lib = url.startsWith('https') ? https : http;
        const request = lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // Follow redirect (simple 1-level)
                resolve({ status: res.statusCode, finalUrl: res.headers.location });
            } else {
                resolve({ status: res.statusCode || 'Unknown' });
            }
            res.resume(); // Consume response to free memory
        });

        request.on('error', (err) => {
            resolve({ status: 'Error' });
        });

        request.on('timeout', () => {
            request.destroy();
            resolve({ status: 'Timeout' });
        });
    });
}

async function main() {
    console.log("🕵️ Validating Soft Matches...\n");

    const dbPath = path.join(__dirname, 'data', 'tvet_db_export.json');
    const urlsPath = path.join(__dirname, 'data', 'tvet_urls_found.json');

    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const foundData = JSON.parse(fs.readFileSync(urlsPath, 'utf-8'));

    const foundMap = new Map();
    foundData.forEach((item: any) => {
        if (item.website) {
            foundMap.set(item.id, { url: item.website, domain: getDomain(item.website) });
        }
    });

    const softMatches = [];

    for (const item of dbData) {
        let dbUrl = item.website;
        if (!dbUrl && item.google_maps_data && item.google_maps_data.website) {
            dbUrl = item.google_maps_data.website;
        }
        if (!dbUrl) continue;

        const found = foundMap.get(item.id);
        if (!found) continue;

        const dbDomain = getDomain(dbUrl) || '';
        const foundDomain = found.domain || '';

        if (dbDomain === foundDomain) continue; // Exact match

        const dbRoot = getRootDomain(dbDomain);
        const foundRoot = getRootDomain(foundDomain);
        const isFB = foundDomain.includes('facebook.com');
        const isDir = DIRECTORY_DOMAINS.has(foundDomain) || foundDomain.includes('wordpress') || foundDomain.includes('blogspot');

        if (dbRoot === foundRoot && dbRoot.length > 3 && !isFB && !isDir) {
            softMatches.push({
                name: item.name,
                dbUrl: dbUrl,
                foundUrl: found.url
            });
        }
    }

    console.log(`Found ${softMatches.length} soft matches to validate.`);
    console.log(`| # | Institution | DB Status | Found Status | Recommendation |\n|---|---|---|---|---|`);

    let count = 0;
    for (const match of softMatches) {
        count++;
        const dbCheck = await checkUrl(match.dbUrl);
        const foundCheck = await checkUrl(match.foundUrl);

        let rec = "";
        const dbOk = dbCheck.status === 200;
        const foundOk = foundCheck.status === 200;

        if (dbOk && !foundOk) rec = "Keep DB";
        else if (!dbOk && foundOk) rec = "Use Found";
        else if (dbOk && foundOk) {
            // Both work. Prefer .ac.ke or https
            if (match.foundUrl.includes('.ac.ke') && !match.dbUrl.includes('.ac.ke')) rec = "Use Found (ac.ke)";
            else if (match.foundUrl.startsWith('https') && !match.dbUrl.startsWith('https')) rec = "Use Found (HTTPS)";
            else rec = "Keep DB (Both Valid)";
        } else {
            rec = "Both Fail";
        }

        console.log(`| ${count} | ${match.name} | ${dbCheck.status} | ${foundCheck.status} | **${rec}** |`);
    }
}

main().catch(console.error);
