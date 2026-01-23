
import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'scripts/data/kmtc_profiles.json');

interface Profile {
    id: string;
    name: string;
    description: string | null;
    county?: string;
    [key: string]: any;
}

function main() {
    if (!fs.existsSync(FILE)) {
        console.error("File not found:", FILE);
        return;
    }

    const profiles = JSON.parse(fs.readFileSync(FILE, 'utf-8')) as Profile[];
    console.log(`Processing ${profiles.length} profiles...`);

    let updatedCount = 0;

    const updatedProfiles = profiles.map(p => {
        let county = null;
        if (p.description) {
            // Description format: "Campus located in [County]."
            const match = p.description.match(/Campus located in (.*)\.$/);
            if (match && match[1]) {
                county = match[1].trim();
            }
        }

        if (county) {
            updatedCount++;
            // Remove " County" if you want just the name, but usually "Nairoby County" is fine.
            // User request: "explicit county field". 
            // Existing data had "NANDI COUNTY".
            // Let's keep "Nandi County" as extracted.
        } else {
            console.warn(`Could not extract county for: ${p.name}`);
        }

        return {
            ...p,
            county: county
        };
    });

    fs.writeFileSync(FILE, JSON.stringify(updatedProfiles, null, 2));
    console.log(`✅ Added county to ${updatedCount} profiles.`);
}

main();
