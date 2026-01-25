
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase
        .from('tvet_institutions')
        .select('name')
        .order('name', { ascending: true }); // Alphabetical order is usually better for full lists

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("No institutions found.");
        return;
    }

    // Save to file
    const fs = await import('fs');
    const path = await import('path');
    const outputDir = path.join(__dirname, 'data');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    const outputPath = path.join(outputDir, 'tvet_list_all.txt');

    // Join with newline, no numbering
    const listContent = data.map(inst => inst.name).join('\n');
    fs.writeFileSync(outputPath, listContent);

    console.log(`Full list saved to: ${outputPath} (${data.length} institutions)`);
}

main();
