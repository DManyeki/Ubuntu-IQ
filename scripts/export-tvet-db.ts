/**
 * Export the entire tvet_institutions table from Supabase
 * for analysis and verification
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("📥 Exporting TVET Institutions from Supabase...\n");

    const PAGE_SIZE = 1000;
    let allRecords: any[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
        console.log(`Fetching page ${page + 1}...`);

        const { data, error } = await supabase
            .from('tvet_institutions')
            .select('*')
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) {
            console.error('Error fetching data:', error);
            process.exit(1);
        }

        if (data && data.length > 0) {
            allRecords = [...allRecords, ...data];
            console.log(`  Received ${data.length} records. Total so far: ${allRecords.length}`);

            if (data.length < PAGE_SIZE) {
                hasMore = false;
            } else {
                page++;
            }
        } else {
            hasMore = false;
        }
    }

    console.log(`\n✅ Download complete! Total records: ${allRecords.length}`);

    // Save as JSON
    const jsonPath = path.join(__dirname, 'data', 'tvet_db_export.json');
    fs.writeFileSync(jsonPath, JSON.stringify(allRecords, null, 2));
    console.log(`\nSaved JSON to: ${jsonPath}`);

    // Create a simplified CSV-like structure for easy reading (headers + common fields)
    const csvPath = path.join(__dirname, 'data', 'tvet_db_export_summary.md');

    let md = '# 📂 TVET Database Export (Summary)\n\n';
    md += `> **Generated:** ${new Date().toISOString()}\n`;
    md += `> **Total Records:** ${allRecords.length}\n\n`;
    md += '## Dictionary of Columns\n';
    if (allRecords.length > 0) {
        md += Object.keys(allRecords[0]).map(k => `- \`${k}\``).join('\n') + '\n\n';
    }

    md += '## First 50 Records (Sample)\n\n';
    md += '| ID | Name | County | Website (Top) | Website (JSON) | Phone | Source |\n';
    md += '|----|------|--------|---------------|----------------|-------|--------|\n';

    allRecords.slice(0, 50).forEach(r => {
        const topWeb = r.website || '-';
        const jsonWeb = r.google_maps_data?.website || r.google_maps_data?.maps_link || '-';
        const phone = r.phone || r.google_maps_data?.phone || '-';

        md += `| ${r.id.substring(0, 8)}... | ${r.name.substring(0, 40)} | ${r.county} | ${topWeb} | ${jsonWeb.substring(0, 30)}... | ${phone} | ${r.source_type || '-'} |\n`;
    });

    fs.writeFileSync(csvPath, md);
    console.log(`Saved Summary to: ${csvPath}`);
}

main().catch(console.error);
