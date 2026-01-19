import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const locationMap: Record<string, string> = {
    "UNIVERSITY OF NAIROBI": "Nairobi",
    "KENYATTA UNIVERSITY": "Nairobi",
    "MOI UNIVERSITY": "Eldoret",
    "EGERTON UNIVERSITY": "Njoro",
    "JOMO KENYATTA UNIVERSITY OF AGRICULTURE AND TECHNOLOGY": "Juja",
    "MASENO UNIVERSITY": "Kisumu",
    "MASINDE MULIRO UNIVERSITY OF SCIENCE & TECHNOLOGY": "Kakamega",
    "TECHNICAL UNIVERSITY OF KENYA": "Nairobi",
    "TECHNICAL UNIVERSITY OF MOMBASA": "Mombasa",
    "PWANI UNIVERSITY": "Kilifi",
    "DEDAN KIMATHI UNIVERSITY OF TECHNOLOGY": "Nyeri",
    "CHUKA UNIVERSITY": "Chuka",
    "KISII UNIVERSITY": "Kisii",
    "MERU UNIVERSITY OF SCIENCE AND TECHNOLOGY": "Meru",
    "SOUTH EASTERN KENYA UNIVERSITY": "Kitui",
    "LAIKIPIA UNIVERSITY": "Nyahururu",
    "KIBABII UNIVERSITY": "Bungoma",
    "KARATINA UNIVERSITY": "Karatina",
    "TAITA TAVETA UNIVERSITY": "Voi",
    "UNIVERSITY OF ELDORET": "Eldoret",
    "UNIVERSITY OF EMBU": "Embu",
    "KIRINYAGA UNIVERSITY": "Kerugoya",
    "MURANG'A UNIVERSITY OF TECHNOLOGY": "Murang'a",
    "RONGO UNIVERSITY": "Rongo",
    "MACHAKOS UNIVERSITY": "Machakos",
    "THE CO-OPERATIVE UNIVERSITY OF KENYA": "Nairobi",
    "GARISSA UNIVERSITY": "Garissa",
    "KAIMOSI FRIENDS UNIVERSITY": "Kaimosi",
    "ALUPE UNIVERSITY": "Busia",
    "TOM MBOYA UNIVERSITY": "Homa Bay",
    "THARAKA UNIVERSITY": "Tharaka",
    "TURKANA UNIVERSITY COLLEGE": "Lodwar",
    "BOMET UNIVERSITY COLLEGE": "Bomet",
    "KOITALEEL SAMOEI UNIVERSITY COLLEGE": "Nandi Hills",
    "KENYATTA UNIVERSITY - MAMA NGINA UNIVERSITY COLLEGE": "Gatundu",
    "OPEN UNIVERSITY OF KENYA": "Konza",
    "KABARNET UNIVERSITY COLLEGE": "Kabarnet",
    "NYANDARUA UNIVERSITY COLLEGE": "Nyandarua",
    "STRATHMORE UNIVERSITY": "Nairobi",
    "UNITED STATES INTERNATIONAL UNIVERSITY": "Nairobi",
    "DAYSTAR UNIVERSITY": "Nairobi",
    "CATHOLIC UNIVERSITY OF EASTERN AFRICA": "Nairobi",
    "MOUNT KENYA UNIVERSITY": "Thika",
    "KCA UNIVERSITY": "Nairobi",
    "ZETECH UNIVERSITY": "Ruiru",
    "AFRICA NAZARENE UNIVERSITY": "Nairobi",
    "RIARA UNIVERSITY": "Nairobi",
    "KABARAK UNIVERSITY": "Nakuru",
    "UEAB": "Eldoret",
    "UNIVERSITY OF EASTERN AFRICA, BARATON": "Eldoret",
    "ST PAULS UNIVERSITY": "Limuru",
    "MULTIMEDIA UNIVERSITY OF KENYA": "Nairobi"
};

const ownershipOverrides: Record<string, string> = {
    "KABARNET UNIVERSITY COLLEGE": "Public",
    "NYANDARUA UNIVERSITY COLLEGE": "Public",
    "KENYATTA UNIVERSITY - MAMA NGINA UNIVERSITY COLLEGE": "Public",
    "TURKANA UNIVERSITY COLLEGE": "Public",
    "BOMET UNIVERSITY COLLEGE": "Public",
    "KOITALEEL SAMOEI UNIVERSITY COLLEGE": "Public"
};

async function main() {
    console.log("Applying Manual Location & Ownership Validation...");
    const { data: unis } = await supabase.from('universities').select('id, name, ownership');

    if (!unis) return;

    let publicCount = 0;

    for (const u of unis) {
        let loc = "Kenya";
        // Simple fuzzy match
        const key = Object.keys(locationMap).find(k => u.name.includes(k) || k.includes(u.name));
        if (key) loc = locationMap[key];
        else if (u.name.includes("NAIROBI")) loc = "Nairobi";
        else if (u.name.includes("MOMBASA")) loc = "Mombasa";
        else if (u.name.includes("KISUMU")) loc = "Kisumu";
        else if (u.name.includes("NAKURU")) loc = "Nakuru";

        let owner = u.ownership;
        if (ownershipOverrides[u.name.trim().toUpperCase()]) {
            owner = ownershipOverrides[u.name.trim().toUpperCase()];
        }
        // General Rule: "University College" implies Public unless strictly Private?
        // Actually, listing checking is safer.

        await supabase.from('universities').update({ location: loc, ownership: owner }).eq('id', u.id);

        if (owner === 'Public') publicCount++;
    }

    console.log(`Updated Locations. Public Universities Count: ${publicCount}`);

    // Check for "National Defence"
    const ndu = unis.find(u => u.name.toUpperCase().includes("DEFENCE"));
    if (!ndu) {
        console.log("MISSING: National Defence University - Kenya");
    }
}

main();
