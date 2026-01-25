import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Comprehensive Map of Town, County
const masterLocationMap: Record<string, string> = {
    // Public (42)
    "ALUPE UNIVERSITY": "Alupe, Busia County",
    "BOMET UNIVERSITY COLLEGE": "Bomet, Bomet County",
    "CHUKA UNIVERSITY": "Chuka, Tharaka Nithi County",
    "CO-OPERATIVE UNIVERSITY OF KENYA": "Karen, Nairobi County",
    "DEDAN KIMATHI UNIVERSITY OF TECHNOLOGY": "Nyeri, Nyeri County",
    "EGERTON UNIVERSITY": "Njoro, Nakuru County",
    "GARISSA UNIVERSITY": "Garissa, Garissa County",
    "JARAMOGI OGINGA ODINGA UNIVERSITY OF SCIENCE AND TECHNOLOGY": "Bondo, Siaya County",
    "JOMO KENYATTA UNIVERSITY OF AGRICULTURE AND TECHNOLOGY": "Juja, Kiambu County",
    "KABARNET UNIVERSITY COLLEGE": "Kabarnet, Baringo County",
    "KAIMOSI FRIENDS UNIVERSITY": "Kaimosi, Vihiga County",
    "KARATINA UNIVERSITY": "Karatina, Nyeri County",
    "KENYATTA UNIVERSITY": "Nairobi, Nairobi County",
    "KENYATTA UNIVERSITY - MAMA NGINA UNIVERSITY COLLEGE": "Gatundu, Kiambu County",
    "KIBABII UNIVERSITY": "Bungoma, Bungoma County",
    "KIRINYAGA UNIVERSITY": "Kerugoya, Kirinyaga County",
    "KISII UNIVERSITY": "Kisii, Kisii County",
    "KOITALEEL SAMOEI UNIVERSITY COLLEGE": "Mosoriot, Nandi County",
    "LAIKIPIA UNIVERSITY": "Nyahururu, Laikipia County",
    "MAASAI MARA UNIVERSITY": "Narok, Narok County",
    "MACHAKOS UNIVERSITY": "Machakos, Machakos County",
    "MASENO UNIVERSITY": "Maseno, Kisumu County",
    "MASINDE MULIRO UNIVERSITY OF SCIENCE & TECHNOLOGY": "Kakamega, Kakamega County",
    "MERU UNIVERSITY OF SCIENCE AND TECHNOLOGY": "Meru, Meru County",
    "MOI UNIVERSITY": "Kesses, Uasin Gishu County",
    "MULTIMEDIA UNIVERSITY OF KENYA": "Rongai, Nairobi County",
    "MURANG'A UNIVERSITY OF TECHNOLOGY": "Murang'a, Murang'a County",
    "NYANDARUA UNIVERSITY COLLEGE": "Ol Kalou, Nyandarua County",
    "OPEN UNIVERSITY OF KENYA": "Konza, Machakos County",
    "PWANI UNIVERSITY": "Kilifi, Kilifi County",
    "RONGO UNIVERSITY": "Rongo, Migori County",
    "SOUTH EASTERN KENYA UNIVERSITY": "Kwa Vonza, Kitui County",
    "TAITA TAVETA UNIVERSITY": "Voi, Taita Taveta County",
    "TECHNICAL UNIVERSITY OF KENYA": "Nairobi, Nairobi County",
    "TECHNICAL UNIVERSITY OF MOMBASA": "Mombasa, Mombasa County",
    "THARAKA UNIVERSITY": "Marimanti, Tharaka Nithi County",
    "TOM MBOYA UNIVERSITY": "Homa Bay, Homa Bay County",
    "TURKANA UNIVERSITY COLLEGE": "Lodwar, Turkana County",
    "UNIVERSITY OF ELDORET": "Eldoret, Uasin Gishu County",
    "UNIVERSITY OF EMBU": "Embu, Embu County",
    "UNIVERSITY OF KABIANGA": "Kericho, Kericho County",
    "UNIVERSITY OF NAIROBI": "Nairobi, Nairobi County",

    // Private (29)
    "AFRICA INTERNATIONAL UNIVERSITY": "Karen, Nairobi County",
    "AFRICA NAZARENE UNIVERSITY": "Ongata Rongai, Kajiado County", // Often grouped with Nairobi, but physically Kajiado
    "AMREF INTERNATIONAL UNIVERSITY": "Nairobi, Nairobi County",
    "CATHOLIC UNIVERSITY OF EASTERN AFRICA": "Nairobi, Nairobi County",
    "DAYSTAR UNIVERSITY": "Athi River, Machakos County",
    "GREAT LAKES UNIVERSITY OF KISUMU": "Kisumu, Kisumu County",
    "GRETSA UNIVERSITY": "Thika, Kiambu County",
    "INTERNATIONAL LEADERSHIP UNIVERSITY": "Nairobi, Nairobi County",
    "ISLAMIC UNIVERSITY OF KENYA": "Kisaju, Kajiado County",
    "KABARAK UNIVERSITY": "Nakuru, Nakuru County",
    "KCA UNIVERSITY": "Nairobi, Nairobi County",
    "KENYA ASSEMBLIES OF GOD EAST UNIVERSITY": "Buruburu, Nairobi County",
    "KENYA HIGHLANDS EVANGELICAL UNIVERSITY": "Kericho, Kericho County",
    "KENYA METHODIST UNIVERSITY": "Meru, Meru County",
    "KIRIRI WOMENS UNIVERSITY OF SCIENCE AND TECHNOLOGY": "Nairobi, Nairobi County",
    "LUKENYA UNIVERSITY": "Kambu, Makueni County",
    "MANAGEMENT UNIVERSITY OF AFRICA": "Nairobi, Nairobi County",
    "MARIST INTERNATIONAL UNIVERSITY COLLEGE": "Nairobi, Nairobi County",
    "MOUNT KENYA UNIVERSITY": "Thika, Kiambu County",
    "PAN AFRICA CHRISTIAN UNIVERSITY": "Nairobi, Nairobi County",
    "PRESBYTERIAN UNIVERSITY OF EAST AFRICA": "Kikuyu, Kiambu County",
    "RIARA UNIVERSITY": "Nairobi, Nairobi County",
    "SCOTT CHRISTIAN UNIVERSITY": "Machakos, Machakos County",
    "SPU": "Limuru, Kiambu County",
    "ST PAULS UNIVERSITY": "Limuru, Kiambu County",
    "STRATHMORE UNIVERSITY": "Nairobi, Nairobi County",
    "TANGAZA UNIVERSITY": "Nairobi, Nairobi County",
    "THE EAST AFRICAN UNIVERSITY": "Kitengela, Kajiado County",
    "UEAB": "Baraton, Nandi County",
    "UNIVERSITY OF EASTERN AFRICA, BARATON": "Baraton, Nandi County",
    "UNITED STATES INTERNATIONAL UNIVERSITY": "Nairobi, Nairobi County",
    "UZIMA UNIVERSITY": "Kisumu, Kisumu County",
    "ZETECH UNIVERSITY": "Ruiru, Kiambu County"
};

async function main() {
    console.log("Generating Final Review CSV...");

    const { data: dbUnis } = await supabase.from('universities').select('id, name, ownership');
    if (!dbUnis) return;

    const output: any[] = [];

    for (const u of dbUnis) {
        let loc = "Kenya";

        // Match Name to Map
        let mapKey = Object.keys(masterLocationMap).find(k => u.name.trim().toUpperCase() === k.trim().toUpperCase());

        // Fuzzy
        if (!mapKey) {
            mapKey = Object.keys(masterLocationMap).find(k => u.name.trim().toUpperCase().includes(k) || k.includes(u.name.trim().toUpperCase()));
        }

        if (mapKey) {
            loc = masterLocationMap[mapKey];
        } else {
            console.log(`WARNING: No map found for ${u.name}`);
        }

        // Update Object
        output.push({ name: u.name, ownership: u.ownership, location: loc });
    }

    // Sort
    output.sort((a, b) => a.name.localeCompare(b.name));

    // CSV
    const header = "Name,Ownership,Location\n";
    const body = output.map(o => `"${o.name}","${o.ownership}","${o.location}"`).join('\n');

    const filePath = path.join('scripts', 'data', 'location_review.csv');
    fs.writeFileSync(filePath, header + body);
    console.log(`Generated ${output.length} records to ${filePath}`);
}

main();
