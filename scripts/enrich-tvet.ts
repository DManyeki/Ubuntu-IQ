
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// --- Configuration ---
const BATCH_SIZE = 10;
const OUTPUT_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'tvet_enriched_sample.json');
const OPENROUTER_MODEL = "xiaomi/mimo-v2-flash:free";
const MAX_TOKENS = 500;

// --- Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// OpenRouter
const openRouterApiKey = process.env.OPENROUTER_API_KEY;
if (!openRouterApiKey) {
    console.error("Missing OPENROUTER_API_KEY.");
    process.exit(1);
}

// --- Verification Functions ---

function verifyPhoneFormat(phone: string | null): string | null {
    if (!phone) return null;
    // Must match Kenyan phone format
    const cleaned = phone.replace(/[\s\-]/g, '');
    if (/^(\+254|0)[71]\d{8}$/.test(cleaned)) {
        return cleaned;
    }
    return null; // Invalid format
}

function verifyEmailDomain(email: string | null, institutionName: string): { email: string | null, suspicious: boolean } {
    if (!email) return { email: null, suspicious: false };

    // Check for generic/suspicious domains that indicate hallucination
    const suspiciousDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const domain = email.split('@')[1]?.toLowerCase();

    // Also suspicious if domain doesn't relate to institution
    const nameLower = institutionName.toLowerCase();
    const domainLower = domain?.toLowerCase() || '';

    // If it's a known university domain but institution is different, flag it
    const knownUniversityDomains = ['uonbi.ac.ke', 'ku.ac.ke', 'mku.ac.ke', 'jkuat.ac.ke', 'kisii.ac.ke', 'egerton.ac.ke'];
    if (knownUniversityDomains.some(d => domainLower.includes(d))) {
        // Check if institution name contains the university name
        if (!nameLower.includes(domainLower.split('.')[0])) {
            return { email, suspicious: true };
        }
    }

    return { email, suspicious: false };
}

function verifyWebsiteDomain(website: string | null, institutionName: string): { website: string | null, suspicious: boolean } {
    if (!website) return { website: null, suspicious: false };

    try {
        const url = new URL(website);
        const domain = url.hostname.toLowerCase();

        // Known university domains that shouldn't appear for other institutions
        const knownUniversityDomains = ['uonbi.ac.ke', 'ku.ac.ke', 'mku.ac.ke', 'jkuat.ac.ke', 'kisii.ac.ke', 'egerton.ac.ke', 'kenyatta.ac.ke'];
        if (knownUniversityDomains.some(d => domain.includes(d))) {
            const nameLower = institutionName.toLowerCase();
            if (!nameLower.includes(domain.split('.')[0])) {
                return { website, suspicious: true };
            }
        }

        return { website, suspicious: false };
    } catch {
        return { website: null, suspicious: false };
    }
}

// --- AI Enrichment ---

async function enrichWithAI(institutionName: string, county: string): Promise<any> {
    // Improved prompt with anti-hallucination instructions
    const prompt = `You are a data verification assistant. I need accurate contact information for a specific TVET (Technical and Vocational Education and Training) institution in Kenya.

Institution Name: "${institutionName}"
County: ${county}

CRITICAL INSTRUCTIONS:
1. ONLY provide information you are CERTAIN about
2. If you are not 100% sure about any field, return null for that field
3. Do NOT guess or make up information
4. Do NOT confuse this institution with universities or other institutions
5. The institution is a TVET/vocational training center, NOT a university

Return a JSON object with ONLY these fields:
{
  "website": "official website URL or null if unknown",
  "email": "official email or null if unknown",
  "phone": "phone number in format +254... or null if unknown",
  "town": "specific town/location within ${county} or null if unknown",
  "confidence": "high/medium/low - your confidence in this data"
}

Remember: It is MUCH better to return null than to provide incorrect information.`;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openRouterApiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://mindcare.co.ke",
                "X-Title": "MindCare TVET Enrichment"
            },
            body: JSON.stringify({
                "model": OPENROUTER_MODEL,
                "max_tokens": MAX_TOKENS,
                "temperature": 0.1, // Low temperature for more deterministic output
                "messages": [
                    { "role": "user", "content": prompt }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            return null;
        }

        const text = data.choices[0].message.content;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return null;
        }

        return JSON.parse(jsonMatch[0]);
    } catch (e: any) {
        console.error(`  API Error: ${e.message}`);
        return null;
    }
}

// --- Main ---

async function main() {
    console.log(`🚀 Starting TVET Enrichment with Verification Layer...`);
    console.log(`   Model: ${OPENROUTER_MODEL}`);
    console.log(`   Processing ${BATCH_SIZE} institutions\n`);

    const { data: institutions, error } = await supabase
        .from('tvet_institutions')
        .select('id, name, county')
        .order('name', { ascending: true })
        .limit(BATCH_SIZE);

    if (error) {
        console.error("Supabase Error:", error);
        return;
    }

    if (!institutions || institutions.length === 0) {
        console.log("No institutions found.");
        return;
    }

    console.log(`Found ${institutions.length} institutions.\n`);

    const results = [];
    let verifiedCount = 0;
    let suspiciousCount = 0;

    for (let i = 0; i < institutions.length; i++) {
        const inst = institutions[i];
        console.log(`[${i + 1}/${institutions.length}] ${inst.name} (${inst.county})`);

        const enriched = await enrichWithAI(inst.name, inst.county || 'Kenya');

        if (enriched) {
            // Apply verification layer
            const phoneVerified = verifyPhoneFormat(enriched.phone);
            const { email: emailVerified, suspicious: emailSuspicious } = verifyEmailDomain(enriched.email, inst.name);
            const { website: websiteVerified, suspicious: websiteSuspicious } = verifyWebsiteDomain(enriched.website, inst.name);

            // Only flag as suspicious if we HAVE data that looks wrong
            const hasData = enriched.website || enriched.email || enriched.phone;
            const isSuspicious = hasData && (emailSuspicious || websiteSuspicious || enriched.confidence === 'low');

            if (isSuspicious) {
                suspiciousCount++;
                console.log(`   ⚠️ SUSPICIOUS: Data provided but flagged for review`);
            } else if (websiteVerified || emailVerified || phoneVerified) {
                verifiedCount++;
                console.log(`   ✅ Verified: ${websiteVerified || '-'} | ${emailVerified || '-'} | ${phoneVerified || '-'}`);
            } else if (enriched.town) {
                console.log(`   📍 Town only: ${enriched.town}`);
            } else {
                console.log(`   ❓ No data found (model returned nulls - this is OK)`);
            }

            results.push({
                id: inst.id,
                name: inst.name,
                county: inst.county,
                website: isSuspicious ? null : websiteVerified,
                email: isSuspicious ? null : emailVerified,
                phone: phoneVerified,
                town: enriched.town,
                confidence: enriched.confidence || 'unknown',
                suspicious: isSuspicious,
                raw_response: isSuspicious ? enriched : undefined
            });
        } else {
            console.log(`   ❌ No data returned`);
            results.push({
                id: inst.id,
                name: inst.name,
                county: inst.county,
                website: null,
                email: null,
                phone: null,
                town: null,
                confidence: 'none',
                suspicious: false
            });
        }

        // Save incrementally
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

        await new Promise(r => setTimeout(r, 1500));
    }

    console.log(`\n🎉 Enrichment complete!`);
    console.log(`   Total: ${results.length}`);
    console.log(`   Verified: ${verifiedCount}`);
    console.log(`   Suspicious (flagged): ${suspiciousCount}`);
    console.log(`   Saved to: ${OUTPUT_FILE}`);
}

main().catch(console.error);
