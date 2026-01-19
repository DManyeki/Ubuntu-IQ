import * as fs from 'fs';
import * as path from 'path';

// List of Known Public Universities (Keywords and Names)
const PUBLIC_KEYWORDS = [
    "University of Nairobi",
    "Moi University",
    "Kenyatta University",
    "Egerton",
    "Jomo Kenyatta",
    "Maseno",
    "Masinde Muliro",
    "Technical University of Kenya",
    "Technical University of Mombasa",
    "Pwani",
    "Kisii",
    "University of Eldoret",
    "Maasai Mara",
    "Dedan Kimathi",
    "Chuka",
    "Laikipia",
    "Karatina",
    "South Eastern Kenya",
    "Meru",
    "Multimedia",
    "Kibabii",
    "Kirinyaga",
    "Co-operative",
    "Murang'a",
    "Rongo",
    "Taita Taveta",
    "University of Embu",
    "Machakos",
    "Garissa",
    "University of Kabianga",
    "Alupe",
    "Kaimosi",
    "Tharaka",
    "Tom Mboya",
    "Turkana",
    "Bomet",
    "Koitaleel",
    "Mama Ngina",
    "Open University of Kenya"
];

// If not public, assume Private (Safe default for this set, but we verify)
// Privates: Strathmore, USIU, Daystar, CUEA, MKU, KeMU, KCA, Zetech, Kabarak, St Pauls, ANU, Scott, Riara, etc.

async function main() {
    const listPath = path.join('scripts', 'data', 'complete_profiles.json');
    const outPath = path.join('scripts', 'data', 'ownership_mapped.json');

    const profiles = JSON.parse(fs.readFileSync(listPath, 'utf-8'));

    const mapped = profiles.map((p: any) => {
        const name = p.name;
        // Check if Public
        const isPublic = PUBLIC_KEYWORDS.some(k => name.toLowerCase().includes(k.toLowerCase()));

        // Manual Overrides or Edge cases?
        // "Kenyatta University - Mama Ngina" -> Public (Matches Kenyatta)
        // "Multimedia" -> Public (Matches Multimedia)

        return {
            id: p.id,
            name: name,
            ownership: isPublic ? 'Public' : 'Private'
        };
    });

    fs.writeFileSync(outPath, JSON.stringify(mapped, null, 2));

    // Stats
    const publicCount = mapped.filter((m: any) => m.ownership === 'Public').length;
    const privateCount = mapped.filter((m: any) => m.ownership === 'Private').length;

    console.log(`Mapped ${mapped.length}: ${publicCount} Public, ${privateCount} Private.`);
    console.log("Sample Privates:", mapped.filter((m: any) => m.ownership === 'Private').slice(0, 5).map((m: any) => m.name));
}

main();
