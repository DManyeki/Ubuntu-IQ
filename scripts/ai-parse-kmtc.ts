
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// --- Configuration ---
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Use OpenRouter Key
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SITE_NAME = 'MindCare Kenya';

const INPUT_FILE = path.join(process.cwd(), 'scripts/data/kmtc_scraped_data.json');
const OUTPUT_FILE = path.join(process.cwd(), 'scripts/data/kmtc_parsed_complete.json');

// --- Types ---
interface Program {
    id: string;
    name: string;
    url: string;
    category_group: string;
    min_mean_grade?: string;
    subject_requirements: { subject: string; grade: string }[];
    campuses: { name: string; code: string; county: string }[];
    raw_requirements_text?: string;
}

// --- AI Parser (via OpenRouter) ---
async function callGemini(programs: Program[]): Promise<Program[]> {
    console.log('Calling Gemini (via OpenRouter) to parse requirements...');

    const rawItems = programs.map(p => ({
        id: String(p.id).trim(),
        name: p.name,
        raw: p.raw_requirements_text || ''
    }));

    const prompt = `You are an expert data parser. I have a list of KMTC programs with unstructured Requirement texts.
  
TASK:
Parse the "raw" text into a structured "subject_requirements" array for each program.
Input format is like: "Subject 1: ENG / KIS (C)\\nSubject 2: BIO / BSC (C)..."
Output format should be JSON array of objects with "id" and "requirements".

Each requirement object: { "subject": "Subject Code", "grade": "Grade" }

Rules:
1. "subject": Keep the alternatives (e.g. "ENG / KIS").
2. "grade": Extract the grade in parentheses (e.g. "C").
3. If specific subject alternatives have different grades in the text (rare), split them or take the lowest. Usually it's one grade for the group.
4. "MAT A" -> "MATH" is acceptable if you want to normalize, but keeping "MAT A" is fine too.
5. "BIO / BSC" -> "Biology / Biological Sciences".

INPUT DATA:
${JSON.stringify(rawItems, null, 2)}

OUTPUT JSON:
[
  {
    "id": "5538",
    "requirements": [
      { "subject": "ENG/KIS", "grade": "C" },
      { "subject": "BIO/BSC", "grade": "C" }
      ...
    ]
  },
  ...
]
`;

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
                    { "role": "system", "content": "You are a data extraction assistant. Output ONLY valid JSON." },
                    { "role": "user", "content": prompt }
                ],
                "temperature": 0.1,
                "max_tokens": 8192
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        let text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error('No content in response');

        // Clean markdown
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        console.log("DEBUG: Raw AI Response (First 200 chars):", text.substring(0, 200));

        const parsedResults = JSON.parse(text) as any[]; // Use any to allow flexible access
        console.log(`DEBUG: Successfully parsed JSON with ${parsedResults.length} items.`);

        // Merge back
        // Handle 'requirements' OR 'subject_requirements' key from AI
        const resultMap = new Map(parsedResults.map(p => {
            const reqs = p.subject_requirements || p.requirements || [];
            return [String(p.id).trim(), reqs];
        }));

        console.log(`DEBUG: First extracted ID in result map: '${Array.from(resultMap.keys())[0]}'`);

        let stats = 0;
        programs.forEach(p => {
            const pid = String(p.id).trim();
            if (resultMap.has(pid)) {
                p.subject_requirements = resultMap.get(pid) || [];
                if (p.subject_requirements.length > 0) stats++;
            }
        });

        console.log(`DEBUG: Enriched ${stats} programs with requirements.`);

        return programs;

    } catch (e) {
        console.error('Gemini error:', e);
        return programs;
    }
}

// --- Main ---
async function main() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error('Input file not found:', INPUT_FILE);
        return;
    }

    const programs = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8')) as Program[];
    console.log(`Loaded ${programs.length} programs.`);

    const enriched = await callGemini(programs);

    if (enriched.length > 0) {
        console.log("DEBUG: Sample Item before save (req check):", enriched[0].subject_requirements.length);
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2));
    console.log(`Saved enriched data to ${OUTPUT_FILE}`);
}

main().catch(console.error);
