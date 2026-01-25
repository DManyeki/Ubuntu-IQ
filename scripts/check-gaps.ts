import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Checking for gaps...");
    const { data: institutions } = await supabase.from('universities').select('*');

    if (!institutions) return;

    const retryList: any[] = [];

    institutions.forEach(inst => {
        let issues = [];
        const phone = inst.phone ? inst.phone.trim() : null;
        const url = inst.website;

        // Phone Check
        if (!phone) {
            issues.push("Phone Missing");
        } else {
            if (!phone.startsWith('+254') && !phone.startsWith('02')) {
                issues.push(`Invalid Phone: ${phone}`);
            }
        }

        // URL Check (Simple subdomain check? e.g. starts with something other than www or http://name?)
        // User said "begins with sub-domain".
        // valid: https://ku.ac.ke, https://www.ku.ac.ke
        // invalid: https://portal.ku.ac.ke ?
        if (url && (url.includes('portal.') || url.includes('student.') || url.includes('elearning.'))) {
            issues.push(`Suspicious URL: ${url}`);
        }

        if (issues.length > 0) {
            retryList.push({
                id: inst.id,
                name: inst.name,
                url: url,
                phone: phone,
                issues: issues
            });
        }
    });

    const outPath = path.join('scripts', 'data', 'retry_list.json');
    fs.writeFileSync(outPath, JSON.stringify(retryList, null, 2));
    console.log(`Found ${retryList.length} institutions needing retry.`);
    console.log("Examples:", retryList.slice(0, 3).map(i => i.name));
}

main();
