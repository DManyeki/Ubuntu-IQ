import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const rawPublicList = `
1	AU	ALUPE UNIVERSITY	University	Public	Ministry of Education	BUSIA COUNTY
2	BUC	BOMET UNIVERSITY COLLEGE	University	Public	Ministry of Education	BOMET COUNTY
3	CU	CHUKA UNIVERSITY	University	Public	Ministry of Education	THARAKA NITHI COUNTY
4	COPUK	CO-OPERATIVE UNIVERSITY OF KENYA	University	Public	Ministry of Education	NAIROBI COUNTY
5	DKUT	DEDAN KIMATHI UNIVERSITY OF TECHNOLOGY	University	Public	Ministry of Education	NYERI COUNTY
6	EU	EGERTON UNIVERSITY	University	Public	Ministry of Education	NAKURU COUNTY
7	GU	GARISSA UNIVERSITY	University	Public	Ministry of Education	GARISSA COUNTY
8	JOOUST	JARAMOGI OGINGA ODINGA UNIVERSITY OF SCIENCE AND TECHNOLOGY	University	Public	Ministry of Education	SIAYA COUNTY
9	JKUAT	JOMO KENYATTA UNIVERSITY OF AGRICULTURE AND TECHNOLOGY	University	Public	Ministry of Education	KIAMBU COUNTY
10	KABARNET UNIVERSITY COLLEGE	KABARNET UNIVERSITY COLLEGE	University	Public	Ministry of Education	BARINGO COUNTY
11	KAFU	KAIMOSI FRIENDS UNIVERSITY	University	Public	Ministry of Education	VIHIGA COUNTY
12	KARU	KARATINA UNIVERSITY	University	Public	Ministry of Education	NYERI COUNTY
13	KU	KENYATTA UNIVERSITY	University	Public	Ministry of Education	NAIROBI COUNTY
14	MNUC	KENYATTA UNIVERSITY - MAMA NGINA UNIVERSITY COLLEGE	University	Public	Ministry of Education	KIAMBU COUNTY
15	KBBU	KIBABII UNIVERSITY	University	Public	Ministry of Education	BUNGOMA COUNTY
16	KYU	KIRINYAGA UNIVERSITY	University	Public	Ministry of Education	KIRINYAGA COUNTY
17	KSU	KISII UNIVERSITY	University	Public	Ministry of Education	KISII COUNTY
18	KSUC	KOITALEEL SAMOEI UNIVERSITY COLLEGE	University	Public	Ministry of Education	NANDI COUNTY
19	LU	LAIKIPIA UNIVERSITY	University	Public	Ministry of Education	LAIKIPIA COUNTY
20	MMARAU	MAASAI MARA UNIVERSITY	University	Public	Ministry of Education	NAROK COUNTY
21	MCKU	MACHAKOS UNIVERSITY	University	Public	Ministry of Education	MACHAKOS COUNTY
22	MSU	MASENO UNIVERSITY	University	Public	Ministry of Education	KISUMU COUNTY
23	MMUST	MASINDE MULIRO UNIVERSITY OF SCIENCE & TECHNOLOGY	University	Public	Ministry of Education	KAKAMEGA COUNTY
24	MUST	MERU UNIVERSITY OF SCIENCE AND TECHNOLOGY	University	Public	Ministry of Education	MERU COUNTY
25	MU	MOI UNIVERSITY	University	Public	Ministry of Education	UASIN GISHU COUNTY
26	MMU	MULTIMEDIA UNIVERSITY OF KENYA	University	Public	Ministry of Education	NAIROBI COUNTY
27	MUT	MURANG'A UNIVERSITY OF TECHNOLOGY	University	Public	Ministry of Education	MURANG'A COUNTY
28	NUC	NYANDARUA UNIVERSITY COLLEGE	University	Public	Ministry of Education	NYANDARUA COUNTY
29	OUK	OPEN UNIVERSITY OF KENYA	University	Public	Ministry of Education	MACHAKOS COUNTY
30	PU	PWANI UNIVERSITY	University	Public	Ministry of Education	KILIFI COUNTY
31	RNU	RONGO UNIVERSITY	University	Public	Ministry of Education	MIGORI COUNTY
32	SEKU	SOUTH EASTERN KENYA UNIVERSITY	University	Public	Ministry of Education	KITUI COUNTY
33	TTU	TAITA TAVETA UNIVERSITY	University	Public	Ministry of Education	TAITA TAVETA COUNTY
34	TUK	TECHNICAL UNIVERSITY OF KENYA	University	Public	Ministry of Education	NAIROBI COUNTY
35	TUM	TECHNICAL UNIVERSITY OF MOMBASA	University	Public	Ministry of Education	MOMBASA COUNTY
36	THRKU	THARAKA UNIVERSITY	University	Public	Ministry of Education	THARAKA NITHI COUNTY
37	TMU	TOM MBOYA UNIVERSITY	University	Public	Ministry of Education	HOMA BAY COUNTY
38	TRUC	TURKANA UNIVERSITY COLLEGE	University	Public	Ministry of Education	TURKANA COUNTY
39	UOE	UNIVERSITY OF ELDORET	University	Public	Ministry of Education	UASIN GISHU COUNTY
40	UOEM	UNIVERSITY OF EMBU	University	Public	Ministry of Education	EMBU COUNTY
41	UOK	UNIVERSITY OF KABIANGA	University	Public	Ministry of Education	KERICHO COUNTY
42	UON	UNIVERSITY OF NAIROBI	University	Public	Ministry of Education	NAIROBI COUNTY
`.trim();

const locationMapPrivate: Record<string, string> = {
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
    "UNIVERSITY OF EASTERN AFRICA, BARATON": "Eldoret",
    "ST PAULS UNIVERSITY": "Limuru",
    "AFRICA INTERNATIONAL UNIVERSITY": "Nairobi",
    "AMREF INTERNATIONAL UNIVERSITY": "Nairobi",
    "GREAT LAKES UNIVERSITY OF KISUMU": "Kisumu",
    "GRETSA UNIVERSITY": "Thika",
    "INTERNATIONAL LEADERSHIP UNIVERSITY": "Nairobi",
    "ISLAMIC UNIVERSITY OF KENYA": "Kisaju",
    "KENYA ASSEMBLIES OF GOD EAST UNIVERSITY": "Buruburu",
    "KENYA HIGHLANDS EVANGELICAL UNIVERSITY": "Kericho",
    "KENYA METHODIST UNIVERSITY": "Meru",
    "KIRIRI WOMENS UNIVERSITY OF SCIENCE AND TECHNOLOGY": "Nairobi",
    "LUKENYA UNIVERSITY": "Makueni",
    "MANAGEMENT UNIVERSITY OF AFRICA": "Nairobi",
    "MARIST INTERNATIONAL UNIVERSITY COLLEGE": "Nairobi",
    "PAN AFRICA CHRISTIAN UNIVERSITY": "Nairobi",
    "PRESBYTERIAN UNIVERSITY OF EAST AFRICA": "Kikuyu",
    "SCOTT CHRISTIAN UNIVERSITY": "Machakos",
    "TANGAZA UNIVERSITY": "Nairobi",
    "THE EAST AFRICAN UNIVERSITY": "Kajiado",
    "UZIMA UNIVERSITY": "Kisumu"
};

async function main() {
    console.log("Generating Review CSV...");

    // Get DB Names
    const { data: dbUnis } = await supabase.from('universities').select('id, name');
    if (!dbUnis) return;

    const output: any[] = [];

    // 1. Process Public List
    const lines = rawPublicList.split('\n');
    const publicNamesMatch: string[] = [];

    for (const line of lines) {
        const parts = line.split('\t');
        let name = '';
        let location = '';
        if (parts.length >= 6) {
            name = parts[2];
            location = parts.pop()?.trim() || '';
        }

        if (name) {
            // Match DB
            let dbU = dbUnis.find(u => u.name.trim().toUpperCase() === name.trim().toUpperCase());
            if (!dbU) {
                // Fuzzy
                dbU = dbUnis.find(u => name.includes(u.name.toUpperCase()));
            }

            if (dbU) {
                output.push({ name: dbU.name, ownership: 'Public', location: location });
                publicNamesMatch.push(dbU.name);
            } else {
                console.log(`Warning: Public Uni ${name} not found in DB`);
            }
        }
    }

    // 2. Process Private (Rest of DB)
    const privateUnis = dbUnis.filter(u => !publicNamesMatch.includes(u.name));

    for (const u of privateUnis) {
        let loc = "Kenya"; // Default
        // Check Map
        // Normalize name for map check?
        const mapKey = Object.keys(locationMapPrivate).find(k => u.name.toUpperCase().includes(k) || k.includes(u.name.toUpperCase()));
        if (mapKey) {
            loc = locationMapPrivate[mapKey];
        } else {
            // Heuristics
            if (u.name.includes("NAIROBI")) loc = "Nairobi";
            else if (u.name.includes("MOMBASA")) loc = "Mombasa";
            else if (u.name.includes("KISUMU")) loc = "Kisumu";
        }

        output.push({ name: u.name, ownership: 'Private', location: loc });
    }

    // Sort by name
    output.sort((a, b) => a.name.localeCompare(b.name));

    // CSV format
    const header = "Name,Ownership,Location\n";
    const body = output.map(o => `"${o.name}","${o.ownership}","${o.location}"`).join('\n');

    const filePath = path.join('scripts', 'data', 'location_review.csv');
    fs.writeFileSync(filePath, header + body);
    console.log(`Generated ${output.length} records to ${filePath}`);
}

main();
