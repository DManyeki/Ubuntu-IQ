import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { count: instCount, error: err1 } = await supabase.from('universities').select('*', { count: 'exact', head: true });
    const { count: progCount, error: err2 } = await supabase.from('programs').select('*', { count: 'exact', head: true });

    console.log(`Institutions: ${instCount} (Error: ${err1?.message})`);
    console.log(`Programs: ${progCount} (Error: ${err2?.message})`);
}

check();
