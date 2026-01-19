import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Comprehensive Map of Keyan Universities (.ac.ke)
// Best effort based on standard abbreviations
const urlMap: Record<string, string> = {
    "KISII UNIVERSITY": "https://kisii.ac.ke",
    "CHUKA UNIVERSITY": "https://chuka.ac.ke",
    "PWANI UNIVERSITY": "https://pu.ac.ke",
    "MACHAKOS UNIVERSITY": "https://mksu.ac.ke",
    "MOI UNIVERSITY": "https://mu.ac.ke",
    "UNIVERSITY OF NAIROBI": "https://uonbi.ac.ke",
    "THARAKA UNIVERSITY": "https://tharaka.ac.ke",
    "BOMET UNIVERSITY COLLEGE": "https://buc.ac.ke",
    "KOITALEEL SAMOEI UNIVERSITY COLLEGE": "https://ksu.ac.ke",
    "TOM MBOYA UNIVERSITY": "https://tmu.ac.ke", // Checked: tmu.ac.ke
    "TECHNICAL UNIVERSITY OF KENYA": "https://tukenya.ac.ke",
    "CATHOLIC UNIVERSITY OF EASTERN AFRICA": "https://cuea.ac.ke", // Often .edu but check .ac.ke
    "KCA UNIVERSITY": "https://kca.ac.ke",
    "JARAMOGI OGINGA ODINGA UNIVERSITY OF SCIENCE AND TECHNOLOGY": "https://jooust.ac.ke",
    "GARISSA UNIVERSITY": "https://gau.ac.ke",
    "UNIVERSITY OF KABIANGA": "https://kabianga.ac.ke",
    "MERU UNIVERSITY OF SCIENCE AND TECHNOLOGY": "https://must.ac.ke",
    "KABARAK UNIVERSITY": "https://kabarak.ac.ke",
    "KIRINYAGA UNIVERSITY": "https://kyu.ac.ke",
    "UNIVERSITY OF ELDORET": "https://uoeld.ac.ke",
    "DEDAN KIMATHI UNIVERSITY OF TECHNOLOGY": "https://dkut.ac.ke",
    "KARATINA UNIVERSITY": "https://karu.ac.ke",
    "MURANG'A UNIVERSITY OF TECHNOLOGY": "https://mut.ac.ke",
    "MOUNT KENYA UNIVERSITY": "https://mku.ac.ke",
    "ZETECH UNIVERSITY": "https://zetech.ac.ke",
    "MASINDE MULIRO UNIVERSITY OF SCIENCE & TECHNOLOGY": "https://mmust.ac.ke",
    "KIBABII UNIVERSITY": "https://kibu.ac.ke",
    "KIRIRI WOMENS UNIVERSITY OF SCIENCE AND TECHNOLOGY": "https://kwust.ac.ke",
    "KAIMOSI FRIENDS UNIVERSITY": "https://kafu.ac.ke",
    "LAIKIPIA UNIVERSITY": "https://laikipia.ac.ke",
    "KENYA METHODIST UNIVERSITY": "https://kemu.ac.ke",
    "KENYA HIGHLANDS EVANGELICAL UNIVERSITY": "https://khu.ac.ke",
    "THE EAST AFRICAN UNIVERSITY": "https://teau.ac.ke",
    "ALUPE UNIVERSITY": "https://alupe.ac.ke",
    "OPEN UNIVERSITY OF KENYA": "https://ouk.ac.ke",
    "RIARA UNIVERSITY": "https://riara.ac.ke", // riarauniversity.ac.ke? usually riara.ac.ke
    "GRETSA UNIVERSITY": "https://gretsauniversity.ac.ke",
    "ST PAULS UNIVERSITY": "https://spu.ac.ke",
    "PRESBYTERIAN UNIVERSITY OF EAST AFRICA": "https://puea.ac.ke",
    "TURKANA UNIVERSITY COLLEGE": "https://tuc.ac.ke",
    "MANAGEMENT UNIVERSITY OF AFRICA": "https://mua.ac.ke",
    "LUKENYA UNIVERSITY": "https://lukenyauniversity.ac.ke",
    "AFRICA INTERNATIONAL UNIVERSITY": "https://aiu.ac.ke",
    "TANGAZA UNIVERSITY": "https://tangaza.ac.ke",
    "KENYA ASSEMBLIES OF GOD EAST UNIVERSITY": "https://kag.ac.ke", // east.ac.ke? kag.ac.ke
    "ISLAMIC UNIVERSITY OF KENYA": "https://iuk.ac.ke",
    "INTERNATIONAL LEADERSHIP UNIVERSITY": "https://ilu.ac.ke",
    "KABARNET UNIVERSITY COLLEGE": "https://kabarnet.ac.ke", // Less sure
    "NYANDARUA UNIVERSITY COLLEGE": "https://nyandarua.ac.ke" // Less sure
};

async function main() {
    console.log("Fetching missing URLs...");
    const { data: dbInsts } = await supabase
        .from('universities')
        .select('id, name')
        .is('website', null);

    if (!dbInsts) return;

    const updates: any[] = [];
    const stillMissing: any[] = [];

    dbInsts.forEach(inst => {
        const dbName = inst.name.trim().toUpperCase(); // Map keys are UPPER
        let matchedUrl = urlMap[dbName];

        // Try Fuzzy
        if (!matchedUrl) {
            const fuzzyKey = Object.keys(urlMap).find(k => k.includes(dbName) || dbName.includes(k));
            if (fuzzyKey) matchedUrl = urlMap[fuzzyKey];
        }

        if (matchedUrl && matchedUrl.includes('.ac.ke')) {
            updates.push({ id: inst.id, name: inst.name, url: matchedUrl });
        } else {
            stillMissing.push({ id: inst.id, name: inst.name });
        }
    });

    const outPath = path.join('scripts', 'data', 'additional_urls.json');
    fs.writeFileSync(outPath, JSON.stringify(updates, null, 2));

    const missPath = path.join('scripts', 'data', 'remaining_missing.json');
    fs.writeFileSync(missPath, JSON.stringify(stillMissing, null, 2));

    console.log(`Generated Additional Proposal: ${updates.length} matches. ${stillMissing.length} still missing.`);
    console.log(`File: ${outPath}`);
}

main();
