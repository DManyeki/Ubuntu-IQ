
import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'scripts/data/kmtc_profiles.json');

interface Profile {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
}

function analyze() {
    const profiles = JSON.parse(fs.readFileSync(FILE, 'utf-8')) as Profile[];

    console.log(`Total profiles: ${profiles.length}`);

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
        console.log(`Found ${dupes.length} duplicates:`, dupes);
    } else {
        console.log("No exact name duplicates found.");
    }

    // Check missing data
    const missing = profiles.filter(p => !p.phone || !p.email || !p.address);
    console.log(`Profiles with missing data: ${missing.length}`);

    missing.forEach(p => {
        const missingFields = [];
        if (!p.phone) missingFields.push('phone');
        if (!p.email) missingFields.push('email');
        if (!p.address) missingFields.push('address');
        // console.log(`- ${p.name}: Missing [${missingFields.join(', ')}]`);
    });
}

analyze();
