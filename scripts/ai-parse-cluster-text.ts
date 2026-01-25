// Extract text from cluster PDF and use AI to parse it
// Usage: npx tsx scripts/ai-parse-cluster-text.ts

import * as fs from 'fs';
import { execSync } from 'child_process';

const OPENROUTER_API_KEY = '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';

async function callAI(prompt: string): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://mindcare-kenya.vercel.app',
            'X-Title': 'MindCare Kenya'
        },
        body: JSON.stringify({
            model: 'meta-llama/llama-3.2-3b-instruct:free',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 4000,
            temperature: 0.1
        })
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

async function main() {
    console.log('AI CLUSTER TEXT EXTRACTION');
    console.log('='.repeat(50));

    // First extract text from PDF using Python
    console.log('\n[Step 1] Extracting text from PDF...');

    const pythonScript = `
import pdfplumber
import json

pdf_path = "Kuccps Files/DEGREE_CLUSTER_DOCUMENT_2025_03 (1).pdf"
all_text = []

with pdfplumber.open(pdf_path) as pdf:
    for i, page in enumerate(pdf.pages, 1):
        text = page.extract_text() or ""
        if text.strip():
            all_text.append(f"=== PAGE {i} ===\\n{text}")

output = "\\n\\n".join(all_text)
print(output)
`;

    fs.writeFileSync('scripts/temp_extract.py', pythonScript);

    let pdfText = '';
    try {
        pdfText = execSync('python scripts/temp_extract.py', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
        fs.unlinkSync('scripts/temp_extract.py');
    } catch (e: any) {
        console.log('Error extracting PDF text:', e.message);
        return;
    }

    console.log(`   Extracted ${pdfText.length} characters`);

    // Save raw text for reference
    fs.writeFileSync('scripts/data/cluster_raw_text.txt', pdfText);
    console.log('   Saved to: scripts/data/cluster_raw_text.txt');

    // Split into pages and process with AI
    console.log('\n[Step 2] Parsing with AI...');

    const pages = pdfText.split(/=== PAGE \d+ ===/g).filter(p => p.trim());
    console.log(`   Processing ${pages.length} pages`);

    // Take first 3 pages as sample
    const sampleText = pages.slice(0, 3).join('\n\n').substring(0, 6000);

    const prompt = `Parse this KUCCPS cluster document text and extract structured data.

TEXT:
${sampleText}

Extract clusters with this JSON structure:
[
  {
    "cluster_id": "4A",
    "subject_1": "MAT ALTERNATIVE A",
    "grade_1": "C+",
    "subject_2": "PHY",
    "grade_2": "C+",
    "subject_3": "GEO",
    "grade_3": "C",
    "subject_4": "",
    "grade_4": "",
    "programs": ["Bachelor of Science (Geomatics)", "Bachelor of Science (Geospatial)"]
  }
]

Rules:
- Main clusters (1, 2, 3...) have no grade requirements
- Sub-clusters (4A, 4B, 5B...) have specific grade requirements like "C+", "C (PLAIN)"
- Programs are Bachelor degrees listed under each cluster

Return ONLY valid JSON array.`;

    try {
        console.log('   Sending to AI...');
        const result = await callAI(prompt);

        console.log('\n   AI Response:');
        console.log(result.substring(0, 1000));

        // Try to parse JSON
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const clusters = JSON.parse(jsonMatch[0]);

            fs.writeFileSync('scripts/data/ai_parsed_clusters.json', JSON.stringify({
                total: clusters.length,
                clusters
            }, null, 2));

            console.log(`\n   Parsed ${clusters.length} clusters`);
            console.log('   Saved to: scripts/data/ai_parsed_clusters.json');
        }

    } catch (e: any) {
        console.log('   Error:', e.message);
    }

    console.log('\n' + '='.repeat(50));
    console.log('DONE');
}

main().catch(console.error);
