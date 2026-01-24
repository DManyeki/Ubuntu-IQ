/**
 * Generate two lists:
 * 1. TVET institutions that we have NOT found Google Maps data for
 * 2. "Mistaken" finds - institutions found by Google Maps that don't match what we searched for
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

const VERIFIED_FILE = path.join(__dirname, 'data', 'tvet_verified_enrichment.json');
const RETRY_FILE = path.join(__dirname, 'data', 'retry_classification_report.json');
const OUTPUT_DIR = path.join(__dirname, 'data');

interface MissingInstitution {
    id: string;
    name: string;
    county: string;
    status: string;
}

interface MistakenFind {
    id: string;
    searched_for: string;
    found_instead: string;
    county: string;
    status: string;
    has_phone: boolean;
    has_address: boolean;
    has_website: boolean;
}

async function main() {
    console.log("📋 Generating Institution Lists...\n");

    // Load all data sources
    const verifiedData = fs.existsSync(VERIFIED_FILE)
        ? JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf-8'))
        : [];
    const retryData = fs.existsSync(RETRY_FILE)
        ? JSON.parse(fs.readFileSync(RETRY_FILE, 'utf-8'))
        : [];

    // Get all institutions from database (paginate to get all 2000+)
    console.log("📥 Fetching all TVET institutions from database...");
    const allInstitutions: any[] = [];
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('tvet_institutions')
            .select('id, name, county, google_maps_data, phone, website, town')
            .range(offset, offset + pageSize - 1);

        if (error) {
            console.error("Error fetching institutions:", error.message);
            return;
        }

        if (data && data.length > 0) {
            allInstitutions.push(...data);
            offset += pageSize;
            hasMore = data.length === pageSize;
        } else {
            hasMore = false;
        }
    }

    console.log(`   Total institutions in DB: ${allInstitutions.length}`);

    // Create lookup maps
    const verifiedMap = new Map(verifiedData.map((v: any) => [v.id, v]));
    const retryMap = new Map(retryData.map((r: any) => [r.id, r]));

    // ============================================
    // LIST 1: Institutions WITHOUT Google Maps data
    // ============================================
    const missingGoogleMaps: MissingInstitution[] = [];

    for (const inst of allInstitutions || []) {
        const verified = verifiedMap.get(inst.id);
        const retry = retryMap.get(inst.id);

        // Check if we have any Google Maps data
        const hasGoogleMapsData = !!inst.google_maps_data;
        const hasBasicContact = !!(inst.phone || inst.website || inst.town);

        // Check verification status
        const verifiedStatus = verified?.status || 'NOT_SCRAPED';
        const retryStatus = retry?.status || '';

        // Institution is "missing" if:
        // - No google_maps_data in DB AND
        // - (Not verified OR verified but still generic/no data)
        const stillMissing =
            !hasGoogleMapsData &&
            (verifiedStatus === 'INVALID_GENERIC' ||
                verifiedStatus === 'NOT_SCRAPED' ||
                retryStatus === 'RETRY_STILL_GENERIC' ||
                retryStatus === 'RETRY_NO_DATA');

        if (stillMissing || (!hasGoogleMapsData && !hasBasicContact)) {
            missingGoogleMaps.push({
                id: inst.id,
                name: inst.name,
                county: inst.county || 'Unknown',
                status: retryStatus || verifiedStatus
            });
        }
    }

    // ============================================
    // LIST 2: "Mistaken" finds - wrong institution returned
    // ============================================
    const mistakenFinds: MistakenFind[] = [];

    for (const retry of retryData) {
        // A "mistaken" find is when:
        // - Status is LOW_CONFIDENCE (first words don't match)
        // - Status is USER_REJECTED (user said it's wrong)
        // - We got a result but it's for a different institution
        if (['RETRY_LOW_CONFIDENCE', 'RETRY_USER_REJECTED'].includes(retry.status)) {
            if (retry.retry_scraped_name && retry.retry_scraped_name !== 'Results') {
                mistakenFinds.push({
                    id: retry.id,
                    searched_for: retry.db_name,
                    found_instead: retry.retry_scraped_name,
                    county: '', // Will fetch from DB
                    status: retry.status,
                    has_phone: retry.has_phone,
                    has_address: retry.has_address,
                    has_website: retry.has_website
                });
            }
        }
    }

    // Also get original verification mismatches
    for (const v of verifiedData) {
        if (['MISMATCH_CROSS_MATCH', 'INVALID_LOW_CONFIDENCE'].includes(v.status)) {
            // Check if not already in retry or approved
            const retry = retryMap.get(v.id);
            if (!retry || !['RETRY_VALID_HIGH', 'RETRY_POTENTIAL_AFFILIATION'].includes(retry.status)) {
                if (v.scraped_name && v.scraped_name !== 'Results') {
                    // Only add if not already in mistakenFinds
                    if (!mistakenFinds.find(m => m.id === v.id)) {
                        mistakenFinds.push({
                            id: v.id,
                            searched_for: v.db_name,
                            found_instead: v.scraped_name,
                            county: '',
                            status: v.status,
                            has_phone: false,
                            has_address: false,
                            has_website: false
                        });
                    }
                }
            }
        }
    }

    // Enrich with county data
    const instMap = new Map((allInstitutions || []).map((i: any) => [i.id, i]));
    for (const mf of mistakenFinds) {
        const inst = instMap.get(mf.id);
        if (inst) mf.county = inst.county || 'Unknown';
    }

    // ============================================
    // Generate reports
    // ============================================
    console.log(`\n📊 Results:`);
    console.log(`   Missing Google Maps data: ${missingGoogleMaps.length}`);
    console.log(`   Mistaken finds: ${mistakenFinds.length}`);

    // Sort by county
    missingGoogleMaps.sort((a, b) => a.county.localeCompare(b.county) || a.name.localeCompare(b.name));
    mistakenFinds.sort((a, b) => a.county.localeCompare(b.county) || a.searched_for.localeCompare(b.searched_for));

    // Generate Missing List Markdown
    let missingMd = `# 🔍 TVET Institutions Missing Google Maps Data

> **Generated:** ${new Date().toISOString().split('T')[0]}  
> **Total Missing:** ${missingGoogleMaps.length}

These institutions need manual Google Maps lookup or web scraping.

## By County

`;

    // Group by county
    const byCounty = new Map<string, MissingInstitution[]>();
    for (const m of missingGoogleMaps) {
        const county = m.county || 'Unknown';
        if (!byCounty.has(county)) byCounty.set(county, []);
        byCounty.get(county)!.push(m);
    }

    for (const [county, items] of [...byCounty.entries()].sort()) {
        missingMd += `### ${county} (${items.length})\n\n`;
        for (const item of items) {
            missingMd += `- ${item.name}\n`;
        }
        missingMd += `\n`;
    }

    // Generate Mistaken Finds Markdown
    let mistakenMd = `# 🔄 Mistaken Finds - Wrong Institutions Retrieved

> **Generated:** ${new Date().toISOString().split('T')[0]}  
> **Total:** ${mistakenFinds.length}

These are institutions that Google Maps returned instead of what we searched for.
They might be:
- Completely different institutions at the search location
- Businesses/places with similar names
- Related institutions (parent/child organizations)

## Full List

| # | Searched For | Found Instead | County | Has Data |
| :---: | :--- | :--- | :--- | :---: |
`;

    mistakenFinds.forEach((m, i) => {
        const data = [
            m.has_phone ? '📞' : '',
            m.has_address ? '📍' : '',
            m.has_website ? '🌐' : ''
        ].filter(Boolean).join(' ') || '—';
        mistakenMd += `| ${i + 1} | ${m.searched_for} | ${m.found_instead} | ${m.county} | ${data} |\n`;
    });

    // Save files
    const missingFile = path.join(OUTPUT_DIR, 'missing_google_maps.md');
    const mistakenFile = path.join(OUTPUT_DIR, 'mistaken_finds.md');

    fs.writeFileSync(missingFile, missingMd);
    fs.writeFileSync(mistakenFile, mistakenMd);

    // Also save as JSON for programmatic use
    fs.writeFileSync(path.join(OUTPUT_DIR, 'missing_google_maps.json'), JSON.stringify(missingGoogleMaps, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'mistaken_finds.json'), JSON.stringify(mistakenFinds, null, 2));

    console.log(`\n✅ Reports generated:`);
    console.log(`   ${missingFile}`);
    console.log(`   ${mistakenFile}`);
}

main().catch(console.error);
