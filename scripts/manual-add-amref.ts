import * as fs from 'fs';
import * as path from 'path';

async function main() {
    const proposalPath = path.join('scripts', 'data', 'proposed_url_updates.json');
    const profilesPath = path.join('scripts', 'data', 'scraped_profiles.json');

    const proposal = JSON.parse(fs.readFileSync(proposalPath, 'utf-8'));
    const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));

    // Find Amref ID
    const amref = proposal.find((p: any) => p.name.includes("AMREF") || p.name.includes("Amref"));

    if (!amref) {
        console.error("Amref not found in proposal!");
        return;
    }

    // Check if duplicate
    if (profiles.find((p: any) => p.id === amref.id)) {
        console.log("Amref already in profiles.");
        return;
    }

    // Add Manual Data
    profiles.push({
        id: amref.id,
        name: amref.name,
        url: amref.url, // https://www.amref.ac.ke
        description: "Amref International University (AMIU) focuses on health sciences training.", // Placeholder/inferred
        logo: null,
        email: "enquiry@amref.ac.ke", // User provided
        phone: "+254 794377 643"      // User provided
    });

    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
    console.log(`Added Amref to profiles. Total: ${profiles.length}`);
}

main();
