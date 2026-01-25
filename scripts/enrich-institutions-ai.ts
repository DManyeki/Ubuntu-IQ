import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
// Use a capable model
const MODEL = 'google/gemini-2.0-flash-exp:free';

async function main() {
    console.log("Fetching institutions from DB...");
    const { data: institutions, error } = await supabase
        .from('universities')
        .select('id, name')
        .order('name');

    if (error || !institutions) {
        console.error("DB Error:", error?.message);
        return;
    }

    console.log(`Found ${institutions.length} institutions.`);

    // Chunking if necessary (but 71 fits)
    const names = institutions.map(i => i.name).join('\n');

    const prompt = `
I have a list of Kenyan Universities/Colleges. Please find their Official Website URL.
Return distinct JSON array of objects: { "name": "Exact Name From List", "url": "https://..." }.
If you cannot find a URL, set it to null.
Do not guess. Use standard domains (usually .ac.ke).

List:
${names}
    `;

    console.log("Asking AI...");

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": MODEL,
                "messages": [{ "role": "user", "content": prompt }],
                "temperature": 0.0,
                "response_format": { type: "json_object" }
            })
        });

        if (!response.ok) {
            console.error("AI Error:", response.status, await response.text());
            return;
        }

        const json = await response.json();
        const content = json.choices[0].message.content;

        // Parse JSON from content (handle markdown blocks)
        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanContent);

        let updates = parsed.items || parsed.universities || parsed; // Handle various root keys
        if (!Array.isArray(updates)) {
            // Try to find array in object
            const key = Object.keys(updates).find(k => Array.isArray(updates[k]));
            if (key) updates = updates[key];
        }

        // Merge IDs
        const finalUpdates = institutions.map(inst => {
            const match = updates.find((u: any) => u.name && u.name.toLowerCase() === inst.name.toLowerCase());
            return {
                id: inst.id,
                name: inst.name,
                url: match ? match.url : null
            };
        });

        // Save review file
        const outPath = path.join('scripts', 'data', 'proposed_url_updates.json');
        fs.writeFileSync(outPath, JSON.stringify(finalUpdates, null, 2));
        console.log(`Saved ${finalUpdates.length} proposed updates to ${outPath}`);

    } catch (e: any) {
        console.error("Crash:", e.message);
    }
}

main();
