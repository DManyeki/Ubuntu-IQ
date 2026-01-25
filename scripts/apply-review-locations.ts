import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Applying Locations to DB...");

    // Read CSV
    const csvPath = path.join('scripts', 'data', 'location_review.csv');
    const content = fs.readFileSync(csvPath, 'utf-8');

    const records = parse(content, {
        columns: true,
        skip_empty_lines: true
    });

    console.log(`Found ${records.length} records.`);

    // Fetch DB IDs
    const { data: dbUnis } = await supabase.from('universities').select('id, name');
    if (!dbUnis) return;

    let updated = 0;

    for (const record of records) {
        // Record: { Name, Ownership, Location }
        // Location format: "Town, County"

        let town = record.Location;
        let county = '';

        if (record.Location.includes(',')) {
            const parts = record.Location.split(',');
            town = parts[0].trim();
            county = parts[1].trim();
        } else {
            // Handle case where no comma (e.g. just "Nairobi" -> Town=Nairobi, County=Nairobi)
            // or check dictionary logic
            // But my Previous script generated "Town, County" strictly?
            // Maybe for "Kenya"?
            if (record.Location !== "Kenya") {
                county = record.Location; // Fallback
            }
        }

        // Find match
        let u = dbUnis.find(d => d.name === record.Name);
        if (!u) {
            // fuzzy
            u = dbUnis.find(d => record.Name.includes(d.name) || d.name.includes(record.Name));
        }

        if (u) {
            const updatePayload = {
                ownership: record.Ownership,
                location: record.Location,
                town: town,
                county: county
            };

            const { error } = await supabase.from('universities').update(updatePayload).eq('id', u.id);
            if (error) console.error(`Error updating ${record.Name}:`, error);
            else {
                // console.log(`Updated ${record.Name}`);
                updated++;
            }
        } else {
            console.warn(`Skipping ${record.Name} (Not in DB)`);
        }
    }

    console.log(`Successfully Updated ${updated} Universities.`);
}

main();
