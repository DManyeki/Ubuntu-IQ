// TVET Excel - Gemini 3 Pro Extraction via Google AI Studio
// Usage: npx tsx scripts/ai-extract-tvet-gemini.ts

import * as fs from 'fs';
import { execSync } from 'child_process';

const GEMINI_API_KEY = 'AIzaSyCddAccV5IzmxufwnQllaWsKI93yLOmZ3I';
const EXCEL_PATH = 'Kuccps Files/TVET_CLUSTER_DOCUMENT_2025 - updated.xlsx';
const OUTPUT_PATH = 'scripts/data/tvet_gemini_extracted.json';

interface TVETProgram {
    category: string;
    level: string;
    min_mean_grade: string;
    requirements: { subject: string; grade: string }[];
    exam_type: string;
}

function extractExcelContent(): string {
    console.log('Extracting Excel content...');

    const pythonScript = `
import openpyxl

wb = openpyxl.load_workbook("${EXCEL_PATH}", data_only=True)
ws = wb.active

output = []
output.append("TVET CLUSTER REQUIREMENTS TABLE")
output.append("=" * 60)
output.append("")
output.append("Format: Number | Category | Level | Mean Grade | Subject Requirements")
output.append("")

for row_idx in range(1, ws.max_row + 1):
    row_data = []
    for col_idx in range(1, ws.max_column + 1):
        cell = ws.cell(row=row_idx, column=col_idx)
        val = str(cell.value).replace('\\n', ' ').strip() if cell.value else ""
        row_data.append(val)
    if any(row_data):
        output.append(" | ".join(row_data))

print("\\n".join(output))
`;

    fs.writeFileSync('scripts/temp_extract.py', pythonScript);
    const content = execSync('python scripts/temp_extract.py', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    fs.unlinkSync('scripts/temp_extract.py');

    // Save for reference
    fs.writeFileSync('scripts/data/tvet_excel_content.txt', content, 'utf-8');
    console.log(`Extracted ${content.length} characters`);
    return content;
}

async function callGemini(content: string): Promise<TVETProgram[]> {
    console.log('\nCalling Gemini 3 Pro...');

    const prompt = `You are an expert data extraction assistant. Parse this KUCCPS TVET programmes table and extract ALL programs into a clean JSON format.

TABLE DATA:
${content}

TASK:
Extract each program entry with these fields:
1. "category": The programme category name (e.g., "Law", "Education", "Architecture")
2. "level": "Diploma", "Certificate", or "Artisan"
3. "min_mean_grade": Minimum KCSE mean grade required. Clean format:
   - "C plain" or "C (plain)" → "C"
   - "C- (minus)" → "C-"
   - "D (plain)" → "D"
   - "D+" stays "D+"
4. "requirements": Array of subject-grade pairs. Each entry has:
   - "subject": Subject code (e.g., "ENG/KIS", "MATH Alternative A", "BIO", "PHY")
   - "grade": Minimum grade for that subject (e.g., "C+", "C", "C-", "D+")
5. "exam_type": Determine from context:
   - "KUCCPS" for programmes on pages 1-3 (before KNEC marker)
   - "KNEC" for programmes after "KNEC EXAMINATION" header
   - "INTERNAL" for programmes after "INTERNAL EXAMINERS" header

IMPORTANT RULES:
- If requirements column says "None", use empty array []
- Parse multi-line requirements (e.g., "ENG - C MATH - C" has 2 requirements)
- Clean category names (remove newlines, trailing numbers)
- Business, Computing, Tourism, Clothing courses typically have "None" requirements

Return ONLY a valid JSON array like this:
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
    "exam_type": "KUCCPS"
  }
]

Return the complete JSON array with ALL programs:`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 8192
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.log(`API Error: ${response.status} - ${errorText}`);
            return [];
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

        // Save raw response
        fs.writeFileSync('scripts/data/tvet_gemini_response.txt', content, 'utf-8');

        // Extract JSON from response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            try {
                const programs = JSON.parse(jsonMatch[0]);
                console.log(`Gemini extracted ${programs.length} programs`);
                return programs;
            } catch (e: any) {
                console.log(`JSON parse error: ${e.message}`);
                return [];
            }
        }

        console.log('No JSON array found in response');
        return [];
    } catch (error: any) {
        console.log(`Error: ${error.message}`);
        return [];
    }
}

async function main() {
    console.log('TVET EXTRACTION WITH GEMINI 3 PRO');
    console.log('='.repeat(50));

    // Step 1: Extract Excel content
    const content = extractExcelContent();

    // Step 2: Call Gemini
    const programs = await callGemini(content);

    if (programs.length === 0) {
        console.log('\nNo programs extracted. Check scripts/data/tvet_gemini_response.txt');
        return;
    }

    // Deduplicate
    const unique = new Map<string, TVETProgram>();
    for (const p of programs) {
        if (p.category) {
            const key = `${p.category}|${p.level}|${p.exam_type}`;
            if (!unique.has(key) || (p.requirements?.length > (unique.get(key)?.requirements?.length || 0))) {
                unique.set(key, p);
            }
        }
    }

    const finalPrograms = Array.from(unique.values());

    // Save
    const output = {
        source: EXCEL_PATH,
        extraction_method: 'gemini_3_pro',
        total_programs: finalPrograms.length,
        programs: finalPrograms
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`\nSaved ${finalPrograms.length} programs to: ${OUTPUT_PATH}`);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY BY EXAM TYPE:');
    for (const type of ['KUCCPS', 'KNEC', 'INTERNAL']) {
        const count = finalPrograms.filter(p => p.exam_type === type).length;
        console.log(`  ${type}: ${count}`);
    }

    console.log('\nSAMPLE PROGRAMS:');
    for (const p of finalPrograms.slice(0, 8)) {
        console.log(`  ${p.category} (${p.level}): ${p.min_mean_grade} [${p.exam_type}]`);
        for (const r of (p.requirements || []).slice(0, 2)) {
            console.log(`    - ${r.subject}: ${r.grade}`);
        }
    }
}

main().catch(console.error);
