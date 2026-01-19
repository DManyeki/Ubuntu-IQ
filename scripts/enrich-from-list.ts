import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const rawList = `
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

async function main() {
    console.log("Parsing User List...");
    const lines = rawList.split('\n');
    console.log(`Found ${lines.length} lines.`);

    // Fetch existing
    const { data: dbUnis } = await supabase.from('universities').select('id, name');
    if (!dbUnis) return;

    let updatedCount = 0;

    for (const line of lines) {
        // Parse tab separated? Or assume fixed structure?
        // User pasted likely tab or space.
        // Format: ID Key Name Category Institution Type Parent Ministry Location
        // Problem: "BOMET UNIVERSITY COLLEGE" has spaces.
        // Parsing strategy: 
        // 1. Remove Number at start.
        // 2. Locate "University" (Category). Everything before is Name (+ Key).
        // 3. Locate "Public".
        // 4. End is Location.

        // Split by tab if possible
        const parts = line.split('\t');
        let name = '';
        let location = '';

        if (parts.length >= 6) {
            // 0: #, 1: Key, 2: Name, 3: Category, 4: Type, 5: Ministry, 6: Location
            name = parts[2];
            location = parts.pop()?.trim() || ''; // Last item
        } else {
            // Fallback: Split by string logic
            // Assuming the name matches exactly what we have in DB or close.
            // Let's iterate our DB names and find match in line
            const matched = dbUnis.find(u => line.toUpperCase().includes(u.name.toUpperCase()));
            if (matched) {
                name = matched.name;
                // Location is at end
                const lastTab = line.lastIndexOf('\t');
                if (lastTab > -1) location = line.substring(lastTab).trim();
                else location = line.split(' ').slice(-2).join(' '); // Rough guess
            } else {
                console.log("Could not parse/match line:", line);
                continue;
            }
        }

        if (!name) continue;

        // Clean Name
        // Find ID
        const dbU = dbUnis.find(u => u.name.trim().toUpperCase() === name.trim().toUpperCase());
        if (dbU) {
            await supabase.from('universities').update({
                ownership: 'Public',
                location: location
            }).eq('id', dbU.id);
            updatedCount++;
            console.log(`Updated ${name} -> Public, ${location}`);
        } else {
            // Try fuzzy
            console.log(`Exact match failed for ${name}. Checking fuzzy...`);
            const dbFuzzy = dbUnis.find(u => name.includes(u.name.toUpperCase()));
            if (dbFuzzy) {
                await supabase.from('universities').update({
                    ownership: 'Public',
                    location: location
                }).eq('id', dbFuzzy.id);
                updatedCount++;
                console.log(`Updated (Fuzzy) ${dbFuzzy.name} -> Public, ${location}`);
            } else {
                console.log(`Failed to find ${name} in DB.`);
            }
        }
    }
    console.log(`Successfully Enriched ${updatedCount} Public Universities.`);
}

main();
