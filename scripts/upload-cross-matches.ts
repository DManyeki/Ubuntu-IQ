/**
 * Upload cross-matched data from mistaken finds to their matching missing institutions.
 * 
 * This script takes scraped data that was found for Institution A (but didn't match it),
 * and applies it to Institution B (which actually matches the scraped data).
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

// Disclaimers
const CROSS_MATCH_NOTE = "Cross-matched: Scraped data from related search applied to this institution";
const AFFILIATION_DISCLAIMER = "User flagged: Affiliated Institute / Business / Location";

// Exact matches to upload (target institution receives data from source scrape)
const EXACT_MATCHES = [
    {
        target_id: "e84957c2-8491-4eb2-88d7-470884749b70",  // NKABUNE TECHNICAL TRAINING INSTITUTE
        target_name: "NKABUNE TECHNICAL TRAINING INSTITUTE",
        source_searched: "KATHUNGURI VOCATIONAL TRAINING CENTRE",
        found_name: "Nkabune Technical Training Institute"
    },
    {
        target_id: "e971ee06-df1e-48cb-8577-4f4283a37136",  // ATLAS COLLEGE
        target_name: "ATLAS COLLEGE",
        source_searched: "ATLAS COLLEGE",
        found_name: "ATLAS COLLEGE"
    },
    {
        target_id: "82a4f6a8-d453-453a-a613-fcba740d6653",  // Tabor Training Institute
        target_name: "Tabor Training Institute",
        source_searched: "Barton Training Institute",
        found_name: "Tabor Training Institute"
    },
    {
        target_id: "e33a5b0f-d5dc-4864-887a-212aef036f13",  // NAIROBI PENTECOSTAL BIBLE COLLEGE
        target_name: "NAIROBI PENTECOSTAL BIBLE COLLEGE",
        source_searched: "Full Gospel Theology Training Institute",
        found_name: "Nairobi Pentecostal Bible College"
    },
    {
        target_id: "e75c2f03-70a9-4ffd-bd4e-9bd393524af6",  // NAIROBI TECHNICAL TRAINING INSTITUTE
        target_name: "NAIROBI TECHNICAL TRAINING INSTITUTE",
        source_searched: "Mohi Technical Training Institute",
        found_name: "Nairobi technical training institute"
    },
    {
        target_id: "4f7cb497-b872-420f-8d8c-0786463d7323",  // NAROK VOCATIONAL TRAINING CENTER
        target_name: "NAROK VOCATIONAL TRAINING CENTER",
        source_searched: "Ilkarian Vocational Training Centre",
        found_name: "Narok Vocational Training Center"
    },
    {
        target_id: "4eda1d66-0b5e-4489-93eb-35b5bb601a49",  // MWAGAFWA VOCATIONAL TRAINING CENTER
        target_name: "MWAGAFWA VOCATIONAL TRAINING CENTER",
        source_searched: "MLAMBENYI VOCATIONAL TRAINING CENTRES",
        found_name: "Mwagafwa Vocational Training Center"
    },
    {
        target_id: "004fe995-6c29-4d93-935d-99fafa5fe00f",  // KITUTU MASABA TVC
        target_name: "KITUTU MASABA TECHNICAL AND VOCATIONAL COLLEGE",
        source_searched: "Masaba Vocational Training Centre",
        found_name: "Kitutu Masaba Technical and Vocational College"
    }
];

// Affiliation match
const AFFILIATION_MATCH = {
    target_id: "ee146608-692d-4f50-ab82-024f17919ecc",  // AIRDS KERICHO
    target_name: "AFRICAN INSTITUTE OF RESEARCH AND DEVELOPMENT STUDIES - KERICHO",
    source_searched: "KENYA INSTITUTE OF DEVELOPMENT STUDIES",
    found_name: "African Institute Of Research And Development Studies-Nakuru campus"
};

async function getScrapedData(sourceName: string): Promise<any> {
    // Load verified data
    const verifiedFile = path.join(__dirname, 'data', 'tvet_verified_enrichment.json');
    const retryFile = path.join(__dirname, 'data', 'retry_classification_report.json');
    const gmapsFile = path.join(__dirname, 'data', 'tvet_google_maps.json');

    const verifiedData = fs.existsSync(verifiedFile) ? JSON.parse(fs.readFileSync(verifiedFile, 'utf-8')) : [];
    const retryData = fs.existsSync(retryFile) ? JSON.parse(fs.readFileSync(retryFile, 'utf-8')) : [];
    const gmapsData = fs.existsSync(gmapsFile) ? JSON.parse(fs.readFileSync(gmapsFile, 'utf-8')) : [];

    // Find by source name
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const sourceNorm = normalize(sourceName);

    // Check retry data first
    for (const r of retryData) {
        if (normalize(r.db_name) === sourceNorm) {
            return {
                phone: r.retry_phone || null,
                address: r.retry_address || null,
                website: r.retry_website || null,
                link: r.retry_maps_link || null,
                name: r.retry_scraped_name || null
            };
        }
    }

    // Check verified data
    for (const v of verifiedData) {
        if (normalize(v.db_name) === sourceNorm) {
            return {
                phone: v.scraped_phone || null,
                address: v.scraped_address || null,
                website: v.scraped_website || null,
                link: v.google_maps_link || null,
                name: v.scraped_name || null
            };
        }
    }

    // Check original gmaps data
    for (const g of gmapsData) {
        if (normalize(g.name) === sourceNorm) {
            return {
                phone: g.phone || null,
                address: g.address || null,
                website: g.website || null,
                link: g.google_maps_link || null,
                name: g.name || null
            };
        }
    }

    return null;
}

async function uploadMatch(match: any, isAffiliation: boolean = false) {
    const scrapedData = await getScrapedData(match.source_searched);

    const updates: any = {
        verified_at: new Date().toISOString(),
        source_type: isAffiliation ? 'google_maps_manual_affiliation' : 'google_maps_cross_match',
        google_maps_data: {
            name: match.found_name,
            phone: scrapedData?.phone || null,
            address: scrapedData?.address || null,
            website: scrapedData?.website || null,
            link: scrapedData?.link || null,
            verification_note: isAffiliation ? AFFILIATION_DISCLAIMER : CROSS_MATCH_NOTE,
            needs_verification: isAffiliation,
            cross_matched_from: match.source_searched,
            scraped_at: new Date().toISOString()
        }
    };

    // Add top-level fields
    if (scrapedData?.phone) updates.phone = scrapedData.phone;
    if (scrapedData?.address) updates.town = scrapedData.address;
    if (scrapedData?.website) updates.website = scrapedData.website;
    if (scrapedData?.link) updates.source_url = scrapedData.link;

    const { error } = await supabase
        .from('tvet_institutions')
        .update(updates)
        .eq('id', match.target_id);

    return { error, match, scrapedData };
}

async function main() {
    console.log("📋 Uploading Cross-Match Data...\n");

    // Upload exact matches
    console.log("🔄 Uploading 8 exact matches...");
    let success = 0;
    let failed = 0;

    for (const match of EXACT_MATCHES) {
        const result = await uploadMatch(match, false);
        if (result.error) {
            console.error(`   ❌ Failed: ${match.target_name} - ${result.error.message}`);
            failed++;
        } else {
            const hasData = result.scrapedData ?
                [result.scrapedData.phone ? '📞' : '', result.scrapedData.address ? '📍' : '', result.scrapedData.website ? '🌐' : ''].filter(Boolean).join(' ') || '—'
                : '—';
            console.log(`   ✅ ${match.target_name} (${hasData})`);
            success++;
        }
    }

    // Upload affiliation match
    console.log("\n🏢 Uploading affiliation match...");
    const affResult = await uploadMatch(AFFILIATION_MATCH, true);
    if (affResult.error) {
        console.error(`   ❌ Failed: ${AFFILIATION_MATCH.target_name} - ${affResult.error.message}`);
        failed++;
    } else {
        const hasData = affResult.scrapedData ?
            [affResult.scrapedData.phone ? '📞' : '', affResult.scrapedData.address ? '📍' : '', affResult.scrapedData.website ? '🌐' : ''].filter(Boolean).join(' ') || '—'
            : '—';
        console.log(`   ✅ ${AFFILIATION_MATCH.target_name} (${hasData})`);
        success++;
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 UPLOAD SUMMARY");
    console.log("=".repeat(50));
    console.log(`   Success: ${success}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total: ${success + failed}`);
}

main().catch(console.error);
