// TVET Document - AI Extraction with MiMo model (Page by Page)
// Usage: npx tsx scripts/ai-extract-tvet-v3.ts

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

async function callAI(pageText: string, pageNum: number): Promise<TVETProgram[]> {
    console.log(`   [Page ${pageNum}] Calling AI...`);

    // Simple, direct prompt like the degree cluster script
    const prompt = `Extract ALL TVET programs from this KUCCPS document page.

PAGE DATA:
${pageText}

RULES:
1. Extract each program row with: category, level (Diploma/Certificate/Artisan), min_mean_grade, requirements
2. For grades: "C plain" = "C", "C- (minus)" = "C-", "D (plain)" = "D"
3. Requirements are subject-grade pairs like "ENG/KIS - C+", "MATH - C"
4. If requirements say "None", use empty array []
5. exam_type: "KUCCPS" for pages 1-3, "KNEC" if KNEC EXAMINATION header, "INTERNAL" if INTERNAL EXAMINERS

Return ONLY a JSON array like:
[{"category":"Architecture","level":"Diploma","min_mean_grade":"C","requirements":[{"subject":"MATH Alternative A","grade":"C"},{"subject":"PHY","grade":"C"}],"notes":"","exam_type":"KUCCPS"}]

If no programs found, return []`;

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
                model: 'mistralai/mistral-small-3.1-24b-instruct:free',
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
        const jsonMatch = content.match(/\[[\s\S]*?\](?=\s*$|\s*```)/);
        if (jsonMatch) {
            try {
                const programs = JSON.parse(jsonMatch[0]);
                console.log(`   [Page ${pageNum}] Found ${programs.length} programs`);
                return programs;
            } catch {
                console.log(`   [Page ${pageNum}] JSON parse error`);
                fs.writeFileSync(`scripts/data/tvet_page${pageNum}_raw.txt`, content, 'utf-8');
                return [];
            }
        }
        console.log(`   [Page ${pageNum}] No JSON found`);
        fs.writeFileSync(`scripts/data/tvet_page${pageNum}_raw.txt`, content, 'utf-8');
        return [];
    } catch (error: any) {
        console.log(`   Error: ${error.message}`);
        return [];
    }
}

async function main() {
    console.log('TVET AI EXTRACTION (MiMo Model)');
    console.log('='.repeat(50));

    // Read raw text
    const content = fs.readFileSync(RAW_TEXT_PATH, 'utf-8');
    console.log(`\nRaw text: ${content.length} characters`);

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

    console.log(`Found ${pages.length} pages\n`);

    const allPrograms: TVETProgram[] = [];

    for (const page of pages) {
        console.log(`\nProcessing Page ${page.num}...`);
        console.log(`   Content: ${page.text.length} chars`);

        if (page.text.length < 100) {
            console.log(`   Skipping (too short)`);
            continue;
        }

        const programs = await callAI(page.text, page.num);
        allPrograms.push(...programs);

        // Delay between pages
        if (page.num < pages.length) {
            console.log(`   Waiting 5s...`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    // Deduplicate
    const uniquePrograms = new Map<string, TVETProgram>();
    for (const p of allPrograms) {
        if (p.category) {
            const key = `${p.category}|${p.level}|${p.min_mean_grade}`;
            if (uniquePrograms.has(key)) {
                // Merge requirements if same program found
                const existing = uniquePrograms.get(key)!;
                if (p.requirements?.length > (existing.requirements?.length || 0)) {
                    uniquePrograms.set(key, p);
                }
            } else {
                uniquePrograms.set(key, p);
            }
        }
    }

    const finalPrograms = Array.from(uniquePrograms.values());

    // Save results
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify({
        source: 'TVET_CLUSTER_DOCUMENT_2025.pdf',
        extraction_method: 'ai_mimo',
        total_programs: finalPrograms.length,
        programs: finalPrograms
    }, null, 2), 'utf-8');

    console.log('\n' + '='.repeat(50));
    console.log(`Extracted ${finalPrograms.length} unique programs`);
    console.log(`Saved to: ${OUTPUT_PATH}`);

    // Summary
    console.log('\nPrograms by exam type:');
    const byType = new Map<string, number>();
    for (const p of finalPrograms) {
        const type = p.exam_type || 'KUCCPS';
        byType.set(type, (byType.get(type) || 0) + 1);
    }
    for (const [type, count] of byType) {
        console.log(`   ${type}: ${count}`);
    }

    // Show samples
    console.log('\nSample programs:');
    for (const p of finalPrograms.slice(0, 5)) {
        console.log(`   ${p.category} (${p.level}): ${p.min_mean_grade}`);
    }
}

main().catch(console.error);
