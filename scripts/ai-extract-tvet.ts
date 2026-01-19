// TVET Cluster Document - AI Extraction
// Uses OpenRouter AI to intelligently parse TVET requirements
// Usage: npx tsx scripts/ai-extract-tvet.ts

import * as fs from 'fs';
import * as path from 'path';

const OPENROUTER_API_KEY = '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';
const PDF_PATH = 'Kuccps Files/TVET_CLUSTER_DOCUMENT_2025.pdf';
const OUTPUT_PATH = 'scripts/data/tvet_ai_extracted.json';

interface TVETProgram {
    category: string;
    level: string;
    min_mean_grade: string;
    requirements: { subject: string; grade: string }[];
    notes: string;
}

async function extractPdfText(): Promise<string> {
    // Use Python to extract text from PDF
    const pythonScript = `
import pdfplumber
import sys

pdf_path = "${PDF_PATH.replace(/\\/g, '/')}"
with pdfplumber.open(pdf_path) as pdf:
    for i, page in enumerate(pdf.pages, 1):
        text = page.extract_text()
        if text:
            print(f"=== PAGE {i} ===")
            print(text)
            print("")
`;

    fs.writeFileSync('scripts/temp_extract_tvet.py', pythonScript);

    const { execSync } = await import('child_process');
    try {
        const output = execSync('python scripts/temp_extract_tvet.py', {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024
        });
        fs.unlinkSync('scripts/temp_extract_tvet.py');
        return output;
    } catch (e: any) {
        console.error('Error extracting PDF:', e.message);
        return '';
    }
}

async function callAI(pageText: string, pageNum: number): Promise<TVETProgram[]> {
    console.log(`   [Page ${pageNum}] Calling AI...`);

    const prompt = `You are a data extraction expert. Parse this KUCCPS TVET document page.

TEXT FROM PAGE ${pageNum}:
"""
${pageText}
"""

TASK: Extract ALL TVET programs (Diploma and Certificate) from this page.

For each program, extract:
1. category: The programme category (e.g., "Law", "Education", "Architecture")
2. level: "Diploma" or "Certificate"
3. min_mean_grade: Minimum mean KCSE grade (e.g., "C", "C-", "C+", "D+")
4. requirements: Array of subject requirements, each with:
   - subject: Subject name (e.g., "ENG/KIS", "MATH Alternative A", "PHY")
   - grade: Minimum grade for that subject (e.g., "C+", "C", "C-")
5. notes: Any special notes (e.g., "Science Based Courses", "Non-Science Based Courses")

IMPORTANT:
- "C (plain)" or "C plain" means grade "C"
- "C- (minus)" means grade "C-"
- If a row has multiple requirement sets (Science vs Non-Science), create separate entries
- Return ONLY valid JSON array

Example output:
[
  {
    "category": "Architecture",
    "level": "Diploma",
    "min_mean_grade": "C",
    "requirements": [
      {"subject": "MATH Alternative A", "grade": "C"},
      {"subject": "PHY", "grade": "C"},
      {"subject": "ENG/KIS", "grade": "C"}
    ],
    "notes": ""
  }
]

Return the JSON array:`;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://ubuntu-iq.vercel.app',
                'X-Title': 'Ubuntu IQ'
            },
            body: JSON.stringify({
                model: 'qwen/qwen3-14b:free',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 4000,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            if (response.status === 429) {
                console.log(`   Rate limited, waiting 30s...`);
                await new Promise(r => setTimeout(r, 30000));
                return callAI(pageText, pageNum);
            }
            console.log(`   Error: ${response.status}`);
            return [];
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '[]';

        // Extract JSON from response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            try {
                const programs = JSON.parse(jsonMatch[0]);
                console.log(`   [Page ${pageNum}] Found ${programs.length} programs`);
                return programs;
            } catch {
                console.log(`   [Page ${pageNum}] JSON parse error`);
                return [];
            }
        }
        return [];
    } catch (error: any) {
        console.log(`   Error: ${error.message}`);
        return [];
    }
}

async function main() {
    console.log('TVET AI EXTRACTION');
    console.log('='.repeat(50));

    // Step 1: Extract text from PDF
    console.log('\n[Step 1] Extracting text from PDF...');
    const pdfText = await extractPdfText();

    if (!pdfText) {
        console.log('Failed to extract PDF text');
        return;
    }

    // Save raw text for debugging
    fs.writeFileSync('scripts/data/tvet_raw_text.txt', pdfText, 'utf-8');
    console.log(`   Extracted ${pdfText.length} characters`);

    // Step 2: Split into pages and process each
    console.log('\n[Step 2] Processing with AI...');

    const pagePattern = /=== PAGE (\d+) ===/g;
    const pages: { num: number; text: string }[] = [];

    let lastIndex = 0;
    let match;
    while ((match = pagePattern.exec(pdfText)) !== null) {
        if (pages.length > 0) {
            pages[pages.length - 1].text = pdfText.substring(lastIndex, match.index).trim();
        }
        pages.push({ num: parseInt(match[1]), text: '' });
        lastIndex = match.index + match[0].length;
    }
    if (pages.length > 0) {
        pages[pages.length - 1].text = pdfText.substring(lastIndex).trim();
    }

    console.log(`   Found ${pages.length} pages`);

    const allPrograms: TVETProgram[] = [];

    for (const page of pages) {
        if (page.text.length < 100) continue;

        const programs = await callAI(page.text, page.num);
        allPrograms.push(...programs);

        // Delay between pages
        if (page.num < pages.length) {
            await new Promise(r => setTimeout(r, 3000));
        }
    }

    // Deduplicate
    const uniquePrograms: TVETProgram[] = [];
    const seen = new Set<string>();

    for (const p of allPrograms) {
        const key = `${p.category}|${p.level}|${p.min_mean_grade}|${p.notes}`;
        if (!seen.has(key) && p.category) {
            seen.add(key);
            uniquePrograms.push(p);
        }
    }

    console.log(`\nExtracted ${uniquePrograms.length} unique programs`);

    // Save results
    const output = {
        source: PDF_PATH,
        extraction_method: 'ai_openrouter',
        total_programs: uniquePrograms.length,
        programs: uniquePrograms
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`Saved to: ${OUTPUT_PATH}`);

    // Show samples
    console.log('\nSample programs:');
    for (const p of uniquePrograms.slice(0, 5)) {
        console.log(`  ${p.category} (${p.level}): ${p.min_mean_grade}`);
        for (const r of (p.requirements || []).slice(0, 3)) {
            console.log(`    - ${r.subject}: ${r.grade}`);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('DONE');
}

main().catch(console.error);
