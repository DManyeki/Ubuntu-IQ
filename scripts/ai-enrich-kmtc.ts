
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Configure Environment
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const INPUT_FILE = path.join(process.cwd(), 'scripts/data/kmtc_profiles.json');
const OUTPUT_FILE = path.join(process.cwd(), 'scripts/data/kmtc_profiles_enriched.json');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
    console.error("Missing OPENROUTER_API_KEY");
    process.exit(1);
}

interface Profile {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    description: string | null;
    website: string | null;
    logo_url: string | null;
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SITE_NAME = 'MindCare Kenya';

async function callGemini(prompt: string): Promise<string> {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": SITE_URL,
                "X-Title": SITE_NAME,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "google/gemini-2.0-flash-001",
                "messages": [
                    { "role": "user", "content": prompt }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    } catch (e) {
        console.error("Gemini Parse Error:", e);
        return "";
    }
}

async function enrichProfile(profile: Profile): Promise<Profile> {
    // Only enrich if missing crucial data
    if (profile.phone && profile.email && profile.address) {
        return profile;
    }

    console.log(`Enriching: ${profile.name}...`);

    const prompt = `
    Find the official contact information for "${profile.name}".
    
    Provide the output strictly in JSON format with these exact keys:
    {
      "phone": "string or null",
      "email": "string or null",
      "address": "string or null"
    }
    
    If specific data is not available, return null for that field. 
    Focus on finding the specific campus details.
    DO NOT return markdown code blocks, just raw JSON.
    `;

    const aiResponse = await callGemini(prompt);
    const cleanedJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const enrichment = JSON.parse(cleanedJson);
        return {
            ...profile,
            phone: profile.phone || enrichment.phone || null,
            email: profile.email || enrichment.email || null,
            address: profile.address || enrichment.address || null
        };
    } catch (e) {
        console.error(`Failed to parse AI response for ${profile.name}`, aiResponse);
        return profile;
    }
}

async function main() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error("Input file missing");
        return;
    }

    const profiles = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8')) as Profile[];
    const enrichedProfiles: Profile[] = [];

    // Process in chunks to avoid rate limits? Or just sequence.
    // Let's do sequence for safety and logging.

    for (const p of profiles) {
        const enriched = await enrichProfile(p);
        enrichedProfiles.push(enriched);
        // Small delay
        await new Promise(r => setTimeout(r, 1000));
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enrichedProfiles, null, 2));
    console.log(`Saved ${enrichedProfiles.length} enriched profiles to ${OUTPUT_FILE}`);
}

main().catch(console.error);
