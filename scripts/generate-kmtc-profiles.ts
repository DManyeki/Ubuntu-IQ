
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const INPUT_FILE = path.join(process.cwd(), 'scripts/data/kmtc_final_cleaned.json');
const OUTPUT_FILE = path.join(process.cwd(), 'scripts/data/kmtc_profiles.json');

interface Campus {
    name: string;
    code: string;
    county: string;
}

interface Program {
    campuses: Campus[];
}

interface Profile {
    id: string;
    name: string;
    website: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    logo_url: string | null;
    description: string | null;
    county: string | null;
    // Extra metadata if useful later, but strictly following template for now
    // county: string | null; 
}

function toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

const CONTACT_DATA_RAW = `
1. BOMET P. O. BOX 76 – 20402, LONGISA bomet@kmtc.ac.ke 020-2008531/020-2008532
2. BONDO P. O. BOX 473-40601, BONDO bondo@kmtc.ac.ke 0202584683/0707207841
3. BUNGOMA P. O. BOX 54 – 50200, BUNGOMA bungoma@kmtc.ac.ke 0768188210/0768188209
4. BUSIA P. O. BOX 970 – 50400, BUSIA (K) busia@kmtc.ac.ke 0746538142
5. CHEMOLINGOT P. O. BOX 109-30404, NGINYANG chemolingot@kmtc.ac.ke 0115051181
6. CHUKA P. O. BOX 641 – 60400, CHUKA chuka@kmtc.ac.ke 0790286488
7. CHWELE P. O. Box 112 – 50202, CHWELE chwele@kmtc.ac.ke 0722325882
8. ELDORET P. O. BOX 520 30100, ELDORET eldoret@kmtc.ac.ke 0700108164
9. EMBU P. O. BOX 923 -60100, EMBU embu@kmtc.ac.ke 0791573515
10. GARISSA P. O. BOX 167- 70100, GARISSA garissa@kmtc.ac.ke 0715623150
11. GATUNDU P. O. BOX 770-01030, GATUNDU gatundu@kmtc.ac.ke 0797645717
12. HOMABAY P. O. BOX 512 – 40300, HOMABAY homabay@kmtc.ac.ke 0202416914/0732502032
13. IMENTI P. O. BOX 111 – 60206, IMENTI imenti@kmtc.ac.ke 0794673189
14. ISIOLO P. O. BOX 844 – 60300, ISIOLO isiolo@kmtc.ac.ke 0792307336
15. ITEN P. O. BOX 103- 30700, ITEN iten@kmtc.ac.ke 0797527676/0202103103
16. KABARNET P. O. BOX 401 – 30400, KABARNET kabarnet@kmtc.ac.ke 0700706092
17. KAKAMEGA P. O. BOX 535-50100, KAKAMEGA kakamega@kmtc.ac.ke 0202400242/0796062986
18. KANGUNDO PO BOX 1121-90115, KANGUNDO kangundo@kmtc.ac.ke 0110068647
19. KAPKATET P. O. BOX 35-20214, KAPKATET kapkatet@kmtc.ac.ke 0772383228/0774383228
20 KAPENGURIA P. O. BOX 576 – 30600, KAPENGURIA kapenguria@kmtc.ac.ke 0207855985
21. KAPTUMO P. O. BOX 149 – 30304, KAPCHENO kaptumo@kmtc.ac.ke 0700887843
22. KAREN P. O. BOX 24921, NAIROBI karen@kmtc.ac.ke 020-2055687
23. KARURI P. O. BOX 765-00219, KARURI karuri@kmtc.ac.ke 0795542643
24. KILIFI P. O. BOX 95-80108, KILIFI kilifi@kmtc.ac.ke 0773117665
25. KISII P. O. BOX 1165-40200, KISII kisii@kmtc.ac.ke 0797129320
26. KISUMU P. O. BOX 1594-40100, KISUMU kisumu@kmtc.ac.ke 020-7855002/0708668923
27. KITALE P. 0. B0X 3187-30200, KITALE kitale@kmtc.ac.ke 0758848201
28. KITUI P. O. BOX 711, KITUI -Fax 22030 kitui@kmtc.ac.ke 0777360229/0791360229
29. KOMBEWA P. O. BOX 11 – 40102, KOMBEWA kombewa@kmtc.ac.ke 0784820887
30. KURIA P.O. BOX 41-40413 kuria@kmtc.ac.ke 0740694237
31. KWALE P. O. BOX 324 – 80403, KWALE kwale@kmtc.ac.ke 0110097319
32. L. VICTORIA P. O. Box 2268-40100, KISUMU lakevictoria@kmtc.ac.ke 0738307446
33. LAMU P. O. BOX 28 – 80502, MOKOWE - LAMU lamu@kmtc.ac.ke 0769912286
34. LODWAR P. O. BOX 126-30500, LODWAR lodwar@kmtc.ac.ke 0727261773
35. LOITOKITOK P. O. BOX 101-00209, LOITOKITOK loitokitok@kmtc.ac.ke 0735427438
36. LUGARI P. O. BOX 156 – 30106, TURBO lugari@kmtc.ac.ke 0705429240
37. MANZA P. O. BOX 837-9100, MACHAKOS manza@kmtc.ac.ke 0798 -931792
38. MANDERA P. O. BOX, 239 MANDERA mandera@kmtc.ac.ke 0711872244
39. MAKINDU P. O. BOX 127-90138, MAKINDU makindu@kmtc.ac.ke 0110003423/0110003414/0789891399
40. MAKUENI P. O. BOX 198-90300, MAKUENI makueni@kmtc.ac.ke 0706037168
41. MACHAKOS P. O. BOX 1155-9100, MACHAKOS machakos@kmtc.ac.ke 044-2221305
42. MATHARI P. O. BOX 46028-00100, NAIROBI mathari@kmtc.ac.ke 020-2391315
43. MBOONI PO BOX 153-90133, TAWA MAKUENI mbooni@kmtc.ac.ke 0714297888
44. MERU P. O. BOX 1484-60200, MERU meru@kmtc.ac.ke 064-3132537/0796538902
45. MIGORI P. O. BOX 58-40400, MIGORI migori@kmtc.ac.ke 0725792981/0712172811
46. MOLO P. O. BOX 426-20106, MOLO molo@kmtc.ac.ke 0706239456
47. MOSORIOT P. O. BOX 31-30300, MOSORIOT mosoriot@kmtc.ac.ke 0700817357
48. MOMBASA P. O. BOX 87946-80100, MOMBASA mombasa@kmtc.ac.ke 0775369543
49. MSAMBWENI P. O. BOX 16-80408, MSAMBWENI msambweni@kmtc.ac.ke 0736562129
50. MURANGA P. O. BOX 888-10200, MURANGA muranga@kmtc.ac.ke 0110048773
51. MWINGI BOX 232-90400, MWINGI mwingi@kmtc.ac.ke 0740942253
52. NAIROBI P. O. BOX 30195 NAIROBI nairobi@kmtc.ac.ke 020-2081823/0737352543
53. NAKURU P. O. BOX 110-20100, NAKURU nakuru@kmtc.ac.ke 0715905209
54. NYAHURURU P. O. BOX 1037-20300, NYAHURURU nyahururu@kmtc.ac.ke 0740345739
55. NYAMACHE P. O. BOX 52 – 40203, NYAMACHE nyamache@kmtc.ac.ke 0799197793
56. NYAMIRA P. O. BOX 574-40500, NYAMIRA nyamira@kmtc.ac.ke 0114876191
57. NYANDARUA P. O. BOX 751-20303 nyandarua@kmtc.ac.ke 0110007157
58. NYERI P. O. BOX 466-10100, NYERI nyeri@kmtc.ac.ke 0111630214
59. OTHAYA P. O. BOX 411-10106, OTHAYA othaya@kmtc.ac.ke 0110002434
60. PORT REITZ P. O. BOX 90219-80100, MOMBASA portreitz@kmtc.ac.ke 020-2023763
61. RACHUONYO P. O. BOX148 – 40222, OYUGIS rachuonyo@kmtc.ac.ke 0748034396
62. RERA P. O. BOX 126 - 40139, AKALA rera@kmtc.ac.ke 0759941257
63. SIAYA P. O. BOX 465-40600, SIAYA siaya@kmtc.ac.ke 0718888757
64. SIGOWET P. O. Box 46 – 20200, SISIOT sigowet@kmtc.ac.ke 0716268536
65. TAVETA P. O. BOX 300 – 80302, TAVETA taveta@kmtc.ac.ke 0798617458
66. TANA RIVER P. O. BOX 22-70101, HOLA tanariver@kmtc.ac.ke 0110096924
67. TESO P. O. BOX 79-50244, AMAGORO teso@kmtc.ac.ke 0115051181
68. THIKA P. O. BOX 729-01000, THIKA thika@kmtcac.ke 0778191304/0701446218
69. TRANSMARA P. O. BOX 188-20401, CHEBUNYO transmara@kmtcac.ke 0737000188/0780000188
70. UGENYA P. O. BOX 13-40614, SEGA ugenya@kmtc.ac.ke 0759987153/0754134413
71. VIHIGA P. O. BOX 1111-50300, MARAGOLI vihiga@kmtc.ac.ke 0768432606
72. VOI P.O. BOX 30 - 80300, V0I voi@kmtc.ac.kew 0719778823
73. WAJIR P. O. BOX 670 – 70200, WAJIR wajir@kmtc.ac.ke 0768335767
74. WEBUYE P. O. BOX 734-50205, WEBUYE webuye@kmtc.ac.ke 020-2574902
`;

function parseContactData() {
    const lines = CONTACT_DATA_RAW.trim().split('\n');
    const store: Record<string, { address: string, email: string, phone: string }> = {};

    lines.forEach(line => {
        // Line format roughly: "1. BOMET P. O. BOX 76 – 20402, LONGISA bomet@kmtc.ac.ke 020-2008531/020-2008532"
        // Regex approach: 
        // 1. Remove numbering: ^\d+\.\s+
        // 2. Extract Campus Name: Everything until "P. O." or "PO BOX"
        // 3. Extract Email: \b[\w.-]+@[\w.-]+\.\w+\b
        // 4. Extract Phone: Digits/Dashes at end? 
        // 5. Address: The stuff in between.

        // simpler split by " P. O." or " PO BOX"
        const noNum = line.replace(/^\d+\.\s*/, '');

        let name = '';
        let rest = '';

        if (noNum.includes(' P. O. ')) {
            [name, rest] = noNum.split(' P. O. ');
            rest = 'P. O. ' + rest;
        } else if (noNum.includes(' PO BOX ')) {
            [name, rest] = noNum.split(' PO BOX ');
            rest = 'PO BOX ' + rest;
        } else if (noNum.includes(' P.O. ')) {
            [name, rest] = noNum.split(' P.O. ');
            rest = 'P.O. ' + rest;
        } else {
            // Fallback
            return;
        }

        name = name.trim();

        // Extract Email
        const emailMatch = rest.match(/[\w.-]+@[\w.-]+\.\w+/);
        const email = emailMatch ? emailMatch[0] : '';

        // Remove email from rest
        rest = rest.replace(email, '').trim();

        // Extract Phone (whatever is at the end, usually digits/slashes)
        // A bit tricky because address also has digits. Phones usually start with 0 or +
        // Let's look for known phone patterns at the end of string
        const phoneMatch = rest.match(/[\d\/\-\s]+$/);
        let phone = phoneMatch ? phoneMatch[0].trim() : '';

        // Address is what remains
        let address = rest.replace(phone, '').trim();

        // Cleanup
        if (email.endsWith('.')) email = email.slice(0, -1);

        store[name.toUpperCase()] = { address, email, phone };

        // Also map "L. VICTORIA" -> "LAKE VICTORIA", "PORT REITZ" -> "PORT REITZ"
        if (name === 'L. VICTORIA') store['LAKE VICTORIA'] = { address, email, phone };
        if (name === 'KAREN') store['KAREN'] = { address, email, phone };

    });
    return store;
}

function main() {
    console.log("Generating KMTC Profiles with Enriched Data...");
    if (!fs.existsSync(INPUT_FILE)) {
        console.error("Input file missing");
        return;
    }

    const contacts = parseContactData();
    const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8')) as Program[];
    const uniqueCampuses = new Map<string, Campus>();

    data.forEach(p => {
        p.campuses.forEach(c => {
            const normalizedName = c.name.trim();
            if (!uniqueCampuses.has(normalizedName)) {
                uniqueCampuses.set(normalizedName, c);
            }
        });
    });

    console.log(`Found ${uniqueCampuses.size} unique campuses.`);

    const profiles: Profile[] = [];

    uniqueCampuses.forEach((campus) => {
        // Name cleanup: "KENYA MEDICAL TRAINING COLLEGE - MOSORIOT CAMPUS" -> "KMTC Mosoriot Campus" ?
        // Or keep full name? User said "retrieve the names". 
        // Let's Convert to Title Case to look better.
        let prettyName = toTitleCase(campus.name);

        // Optional: Shorten "Kenya Medical Training College" to "KMTC" if preferred.
        // But "Universities profiles" usually have full names.

        // Attempt to find matching contact info
        // Campus Name in JSON: "KENYA MEDICAL TRAINING COLLEGE - MOSORIOT CAMPUS"
        // Target Key: "MOSORIOT"

        // Extract the specific campus name part
        // Remove "KENYA MEDICAL TRAINING COLLEGE - "
        // Remove " CAMPUS" at the end? 
        // "MOSORIOT" -> "MOSORIOT"
        // "NAIROBI" -> "NAIROBI"

        const shortName = campus.name
            .replace(/KENYA MEDICAL TRAINING COLLEGE - /i, '')
            .replace(/ CAMPUS/i, '')
            .replace(/ SATELLITE/i, '')
            .trim();

        // Handle composite names like "KAKAMEGA - IKOLOMANI" -> check "IKOLOMANI" or "KAKAMEGA"? 
        // User list has "KAKAMEGA" (17) and "KAKAMEGA - IKOLOMANI" (75?? No, user list only has KAKAMEGA and maybe distinct ones)
        // User list: 40. MAKUENI, 43. MBOONI (TAWA MAKUENI), 37. MANZA (MACHAKOS)
        // JSON has "Makueni - Mbuvo Campus".

        // Strategy: Try exact match, then split by " - " and try parts.

        let contact = contacts[shortName.toUpperCase()];

        if (!contact) {
            // Try splitting "KAKAMEGA - IKOLOMANI" -> ["KAKAMEGA", "IKOLOMANI"]
            const parts = shortName.split(/\s*-\s*/);
            for (const p of parts) {
                if (contacts[p.toUpperCase()]) {
                    contact = contacts[p.toUpperCase()];
                    break;
                }
            }
        }

        if (!contact) {
            // Try removing spaces from shortName: "Homa Bay" -> "HOMABAY"
            const compacted = shortName.replace(/\s+/g, '').toUpperCase();
            if (contacts[compacted]) {
                contact = contacts[compacted];
            }
        }

        // Special manual fixups based on observation
        if (!contact) {
            // Maybe it's "KABARNET" vs "Kenya Medical Training College - Kabarnet Campus" (works)
            // "Trans Mara" -> "TRANSMARA" (handled by compaction above)
            // "Lake Victoria" -> "L. VICTORIA" (Manual map needed or regex)

            if (shortName.toUpperCase().includes('KAREN')) contact = contacts['KAREN'];
            if (shortName.toUpperCase().includes('MATHARE')) contact = contacts['MATHARI']; // Spelling diff
            if (shortName.toUpperCase().includes('PORT REITZ')) contact = contacts['PORT REITZ'];
            if (shortName.toUpperCase().includes('LAKE VICTORIA')) contact = contacts['L. VICTORIA'] || contacts['LAKE VICTORIA'];
        }

        profiles.push({
            id: uuidv4(),
            name: prettyName,
            website: "https://kmtc.ac.ke",
            phone: contact?.phone || null,
            email: contact?.email || null,
            address: contact?.address || null, // Adding address field
            logo_url: null,
            description: `Campus located in ${toTitleCase(campus.county)}.`,
            county: toTitleCase(campus.county)
        });
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(profiles, null, 2));
    console.log(`Saved ${profiles.length} enriched profiles to ${OUTPUT_FILE}`);
}

main();
