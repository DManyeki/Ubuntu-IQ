/**
 * Create other_tvets table via Supabase API
 * Run this to create the table, then populate-other-tvets.ts to fill it
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
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
    console.log("🔧 Creating other_tvets table...\n");

    // Check if table already exists by trying to query it
    const { error: checkError } = await supabase
        .from('other_tvets')
        .select('id')
        .limit(1);

    if (!checkError) {
        console.log("✅ Table 'other_tvets' already exists!");

        // Count existing records
        const { count } = await supabase
            .from('other_tvets')
            .select('*', { count: 'exact', head: true });

        console.log(`📊 Current records: ${count || 0}`);
        return;
    }

    if (checkError.code === '42P01') {
        console.log("❌ Table doesn't exist. Please create it via Supabase Dashboard SQL Editor:");
        console.log("\n1. Go to your Supabase Dashboard");
        console.log("2. Navigate to SQL Editor");
        console.log("3. Run the SQL from: supabase/migrations/20260124_create_other_tvets.sql");
        console.log("\nOr use the Supabase CLI: npx supabase link && npx supabase db push");
    } else {
        console.log("Error checking table:", checkError);
    }
}

main().catch(console.error);
