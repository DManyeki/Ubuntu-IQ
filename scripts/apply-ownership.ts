import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Applying Ownership & Aliases Data...");
    const ownerPath = path.join('scripts', 'data', 'ownership_mapped.json');
    const aliasPath = path.join('scripts', 'data', 'aliases_grouped.json');

    if (!fs.existsSync(ownerPath)) {
        console.error("Ownership map missing");
        return;
    }

    // Load Data
    const ownerships = JSON.parse(fs.readFileSync(ownerPath, 'utf-8'));
    const aliases = fs.existsSync(aliasPath) ? JSON.parse(fs.readFileSync(aliasPath, 'utf-8')) : [];

    // Create Map for fast alias lookup
    const aliasMap = new Map();
    aliases.forEach((a: any) => aliasMap.set(a.id, a.aliases));

    let count = 0;

    for (const d of ownerships) {
        const aliasList = aliasMap.get(d.id) || null; // null if no aliases

        const updatePayload: any = { ownership: d.ownership };
        if (aliasList && aliasList.length > 0) {
            updatePayload.aliases = aliasList;
        }

        const { error } = await supabase
            .from('universities')
            .update(updatePayload)
            .eq('id', d.id);

        if (error) {
            console.error(`Error updating ${d.name}:`, error.message);
        } else {
            count++;
        }
    }

    console.log(`Updated ${count} institutions with Ownership & Aliases.`);
}

main();
