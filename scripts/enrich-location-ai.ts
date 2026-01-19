import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.VITE_SITE_URL || 'http://localhost:3000';
const SITE_NAME = 'Ubuntu-IQ';

if (!OPENROUTER_API_KEY) {
    console.error("Missing OPENROUTER_API_KEY");
    process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching Private universities...");
    const { data: unis, error } = await supabase.from('universities').select('id, name').eq('ownership', 'Private');

    if (error || !unis) {
        console.error("DB Error:", error);
        return;
    }

    console.log(`Enriching ${unis.length} Private universities...`);
    const batchSize = 10;

    for (let i = 0; i < unis.length; i += batchSize) {
        const chunk = unis.slice(i, i + batchSize);
        const names = chunk.map(u => u.name).join('\n');

        const prompt = `You are a Kenyan University Expert.
        Provide the main Campus Location (City/Town, County) for these Private Universities.
        Input List:
        ${names}

        Return strictly a JSON array of objects:
        [ { "name": "...", "location": "City, County" } ]
        Do not include markdown.`;

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
                    "model": "google/gemini-2.0-flash-exp:free",
                    "messages": [{ "role": "user", "content": prompt }]
                })
            });

            const json = await response.json();
            if (!json.choices) {
                console.error("API Response Error:", JSON.stringify(json, null, 2));
                // Fallback to Llama? Or just skip
                continue;
            }

            const content = json.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch (e) {
                console.error("JSON Parse Error:", e, content);
                continue;
            }

            // Map back to IDs
            for (const p of parsed) {
                const original = chunk.find(u => u.name.trim().toLowerCase() === p.name.trim().toLowerCase() || u.name.includes(p.name));
                if (original) {
                    console.log(`Updating ${original.name} -> ${p.location}`);
                    await supabase.from('universities').update({ location: p.location }).eq('id', original.id);
                }
            }
            console.log(`Processed batch ${i / batchSize + 1}`);
            // Wait a bit to avoid rate limit
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (e) {
            console.error("AI Error:", e);
        }
    }

    console.log("Private University Locations Updated.");
}

main();
