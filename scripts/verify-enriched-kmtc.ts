
import fs from 'fs';
import path from 'path';

const ENRICHED_FILE = path.join(process.cwd(), 'scripts/data/kmtc_profiles_enriched.json');

interface Profile {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
}

function verify() {
    if (!fs.existsSync(ENRICHED_FILE)) {
        console.error("Enriched file not found!");
        return;
    }

    const profiles = JSON.parse(fs.readFileSync(ENRICHED_FILE, 'utf-8')) as Profile[];
    console.log(`Total Enriched Profiles: ${profiles.length}`);

    // Check duplicates
    const nameMap = new Map<string, number>();
    const dupes: string[] = [];
    profiles.forEach(p => {
        const n = p.name.trim().toUpperCase();
        if (nameMap.has(n)) {
            dupes.push(p.name);
            nameMap.set(n, nameMap.get(n)! + 1);
        } else {
            nameMap.set(n, 1);
        }
    });

    if (dupes.length > 0) {
        console.log(`DUCLICATES FOUND (${dupes.length}):`, dupes);
    } else {
        console.log("No duplicates found.");
    }

    // Check completeness
    const stillMissing = profiles.filter(p => !p.phone && !p.email && !p.address);
    // Note: AI might return nulls if not found.
    const partiallyMissing = profiles.filter(p => !p.phone || !p.email || !p.address);

    console.log(`Still completely empty contact info: ${stillMissing.length}`);
    console.log(`Partially missing contact info: ${partiallyMissing.length}`);

    // Sample
    console.log("Sample Enriched:", JSON.stringify(profiles.find(p => p.name.includes("Kitale")), null, 2));
}

verify();
