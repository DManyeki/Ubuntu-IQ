// TVET Document - Structured AI Extraction (Page by Page)
// Sends each page to AI with context, similar to degree cluster extraction
// Usage: npx tsx scripts/ai-extract-tvet-v2.ts

import * as fs from 'fs';

const OPENROUTER_API_KEY = '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';
const RAW_TEXT_PATH = 'scripts/data/tvet_raw_text.txt';
const OUTPUT_PATH = 'scripts/data/tvet_ai_extracted.json';

interface TVETProgram {
    category: string;
    level: string;
    min_mean_grade: string;
    requirements: { subject: string; grade: string }[];
    notes: string;
    exam_type: string;
}

async function callAI(pageText: string, pageNum: number, context: string): Promise<TVETProgram[]> {
    console.log(`   [Page ${pageNum}] Calling AI...`);

    const prompt = `You are a KUCCPS TVET document parser. Extract ALL programs from this page.

CONTEXT:
${context}

PAGE ${pageNum} TEXT:
"""
${pageText}
"""

TASK: Extract every TVET program entry into this JSON format:
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
    "notes": "",
    "exam_type": "KUCCPS"
  }
]

PARSING RULES:
1. category: The programme name (Law, Education, Architecture, Nursing, etc.)
2. level: "Diploma", "Certificate", or "Artisan"
3. min_mean_grade: Minimum KCSE grade required. Convert:
   - "C plain" or "C (plain)" → "C"
   - "C- (minus)" → "C-"
   - "D (plain)" → "D"
   - "D+ (plus)" → "D+"
4. requirements: Array of subject requirements. Each has:
   - subject: The subject code (ENG, MATH, PHY, BIO, CHE, MATH Alternative A, etc.)
   - grade: The minimum grade for that subject (C+, C, C-, D+, D)
5. notes: Any special notes (e.g., "Science Based Courses", "Visually and Hearing Impaired")
6. exam_type: "KUCCPS", "KNEC", or "INTERNAL" based on the section header

IMPORTANT:
- If a program has "None" for requirements, set requirements to empty array []
- If there are Science/Non-Science tracks, create separate entries with appropriate notes
- Keep subject codes as they appear (don't expand abbreviations)
- Return ONLY valid JSON array, no other text

/no_think

Return JSON array:`;

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
                model: 'xiaomi/mimo-vl-flash:free',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 4000,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            if (response.status === 429) {
                console.log(`   Rate limited, waiting 30s...`);
                await new Promise(r => setTimeout(r, 30000));
                return callAI(pageText, pageNum, context);
            }
            console.log(`   Error: ${response.status}`);
            return [];
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '[]';

        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = content;
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1];
        }

        const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            try {
                const programs = JSON.parse(jsonMatch[0]);
                console.log(`   [Page ${pageNum}] Found ${programs.length} programs`);
                return programs;
            } catch (e) {
                console.log(`   [Page ${pageNum}] JSON parse error`);
                // Save raw response for debugging
                fs.writeFileSync(`scripts/data/tvet_page${pageNum}_raw.txt`, content, 'utf-8');
                return [];
            }
        }
        console.log(`   [Page ${pageNum}] No JSON found in response`);
        fs.writeFileSync(`scripts/data/tvet_page${pageNum}_raw.txt`, content, 'utf-8');
        return [];
    } catch (error: any) {
        console.log(`   Error: ${error.message}`);
        return [];
    }
}

async function main() {
    console.log('TVET STRUCTURED AI EXTRACTION');
    console.log('='.repeat(50));

    // Check if raw text exists, if not extract from PDF
    if (!fs.existsSync(RAW_TEXT_PATH)) {
        console.log('[Step 0] Extracting text from PDF...');
        const pythonScript = `
import pdfplumber
pdf_path = "Kuccps Files/TVET_CLUSTER_DOCUMENT_2025.pdf"
with pdfplumber.open(pdf_path) as pdf:
    for i, page in enumerate(pdf.pages, 1):
        text = page.extract_text()
        if text:
            print(f"=== PAGE {i} ===")
            print(text)
            print("")
`;
        fs.writeFileSync('scripts/temp_extract.py', pythonScript);
        const { execSync } = await import('child_process');
        const output = execSync('python scripts/temp_extract.py', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
        fs.writeFileSync(RAW_TEXT_PATH, output, 'utf-8');
        fs.unlinkSync('scripts/temp_extract.py');
    }

    // Read raw text
    const content = fs.readFileSync(RAW_TEXT_PATH, 'utf-8');
    console.log(`\n[Step 1] Raw text: ${content.length} characters`);

    // Split into pages
    const pagePattern = /=== PAGE (\d+) ===/g;
    const pages: { num: number; text: string }[] = [];

    let lastIndex = 0;
    let match;
    while ((match = pagePattern.exec(content)) !== null) {
        if (pages.length > 0) {
            pages[pages.length - 1].text = content.substring(lastIndex, match.index).trim();
        }
        pages.push({ num: parseInt(match[1]), text: '' });
        lastIndex = match.index + match[0].length;
    }
    if (pages.length > 0) {
        pages[pages.length - 1].text = content.substring(lastIndex).trim();
    }

    console.log(`   Found ${pages.length} pages\n`);

    // Context for AI
    const context = `
This is a KUCCPS TVET (Technical and Vocational Education Training) document.
Document sections:
- Pages 1-3: KUCCPS programs (require specific subject grades)
- Page 4: KNEC EXAMINATION programs (often have "None" for requirements)
- Pages 5-6: INTERNAL EXAMINERS programs

Structure per entry:
- Number (1, 2, 3...) = category number
- Category name (Law, Education, Architecture...)
- Level (Diploma, Certificate, Artisan)
- Minimum Mean Grade (C, C-, D+, etc.)
- Subject Requirements (subject - grade pairs)
`;

    console.log('[Step 2] Processing pages with AI...');

    const allPrograms: TVETProgram[] = [];

    for (const page of pages) {
        if (page.text.length < 100) {
            console.log(`   [Page ${page.num}] Skipping (too short)`);
            continue;
        }

        const programs = await callAI(page.text, page.num, context);
        allPrograms.push(...programs);

        // Delay between pages to avoid rate limits
        if (page.num < pages.length) {
            console.log(`   Waiting 5s...`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    // Deduplicate
    const uniquePrograms: TVETProgram[] = [];
    const seen = new Set<string>();

    for (const p of allPrograms) {
        if (!p.category) continue;
        const key = `${p.category}|${p.level}|${p.min_mean_grade}|${p.notes || ''}|${p.exam_type || ''}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniquePrograms.push(p);
        }
    }

    console.log(`\n[Step 3] Results`);
    console.log(`   Total extracted: ${allPrograms.length}`);
    console.log(`   Unique programs: ${uniquePrograms.length}`);

    // Save results
    const output = {
        source: 'TVET_CLUSTER_DOCUMENT_2025.pdf',
        extraction_method: 'ai_structured',
        model: 'qwen/qwen3-14b:free',
        total_programs: uniquePrograms.length,
        programs: uniquePrograms
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`   Saved to: ${OUTPUT_PATH}`);

    // Show samples
    console.log('\n[Step 4] Sample programs:');
    for (const p of uniquePrograms.slice(0, 8)) {
        console.log(`   ${p.category} (${p.level}): ${p.min_mean_grade} [${p.exam_type || 'KUCCPS'}]`);
        for (const r of (p.requirements || []).slice(0, 2)) {
            console.log(`     - ${r.subject}: ${r.grade}`);
        }
    }

    // Summary by exam type
    console.log('\n[Step 5] Summary by exam type:');
    const byType = new Map<string, number>();
    for (const p of uniquePrograms) {
        const type = p.exam_type || 'KUCCPS';
        byType.set(type, (byType.get(type) || 0) + 1);
    }
    for (const [type, count] of byType) {
        console.log(`   ${type}: ${count} programs`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('EXTRACTION COMPLETE');
}

main().catch(console.error);
