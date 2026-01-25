// Clean TVET parsed data using AI
// Sends pre-parsed JSON to AI for fixing errors
// Usage: npx tsx scripts/ai-clean-tvet.ts

import * as fs from 'fs';

const OPENROUTER_API_KEY = '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';
const INPUT_PATH = 'scripts/data/tvet_parsed.json';
const OUTPUT_PATH = 'scripts/data/tvet_cleaned.json';

interface TVETProgram {
    category: string;
    level: string;
    min_mean_grade: string;
    requirements: { subject: string; grade: string }[];
    notes?: string;
    exam_type?: string;
}

async function cleanWithAI(programs: TVETProgram[]): Promise<TVETProgram[]> {
    console.log('Sending to AI for cleanup...');

    const prompt = `You are a data cleaning expert. Fix this TVET programs JSON data.

CURRENT DATA (with errors):
${JSON.stringify(programs, null, 2)}

KNOWN ISSUES TO FIX:
1. "plain ENG/KIS" should be "ENG/KIS" 
2. Grades like "C--" should be "C-"
3. Grades like "N" or "b" are invalid - should be "D" or removed
4. "ENG/KIS" in min_mean_grade is wrong - that's a subject, not a grade
5. Categories like "Programme Level Minimum Subjects Requirements" are headers, remove them
6. Remove duplicate requirements in same program
7. Truncated categories like "Health Records and" should be "Health Records and Information Technology"
8. "Engineering, Engineering" should be "Engineering Technology"
9. "Photogrammetry & Remote" should be "Photogrammetry & Remote Sensing"
10. "Tourism and Hotel" should be "Tourism and Hotel Management"
11. "Natural Resources (Geology," should be "Natural Resources"
12. "Agricultural Irrigation and" should be "Agricultural Irrigation and Drainage Engineering"

RULES:
- Valid grades: A, A-, B+, B, B-, C+, C, C-, D+, D, D-
- Valid levels: Diploma, Certificate, Artisan
- Requirements "None" means empty array []
- Remove programs with invalid/empty categories

Return ONLY the cleaned JSON array:`;

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
                max_tokens: 8000,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            if (response.status === 429) {
                console.log('Rate limited, waiting 60s...');
                await new Promise(r => setTimeout(r, 60000));
                return cleanWithAI(programs);
            }
            console.log(`Error: ${response.status}`);
            return programs;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '[]';

        // Save raw response for debugging
        fs.writeFileSync('scripts/data/tvet_ai_response.txt', content, 'utf-8');

        // Extract JSON from response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            try {
                const cleaned = JSON.parse(jsonMatch[0]);
                console.log(`AI returned ${cleaned.length} cleaned programs`);
                return cleaned;
            } catch (e) {
                console.log('JSON parse error, using manual cleanup');
                return programs;
            }
        }
        return programs;
    } catch (error: any) {
        console.log(`Error: ${error.message}`);
        return programs;
    }
}

function manualCleanup(programs: TVETProgram[]): TVETProgram[] {
    console.log('Applying manual cleanup rules...');

    const cleaned: TVETProgram[] = [];

    for (const p of programs) {
        // Skip invalid entries
        if (!p.category || p.category.includes('Programme') || p.category.includes('Level')) {
            continue;
        }

        // Fix category names
        let category = p.category;
        const categoryFixes: Record<string, string> = {
            'Engineering, Engineering': 'Engineering Technology',
            'Health Records and': 'Health Records and Information Technology',
            'Photogrammetry & Remote': 'Photogrammetry & Remote Sensing',
            'Tourism and Hotel': 'Tourism and Hotel Management',
            'Natural Resources (Geology,': 'Natural Resources',
            'Agricultural Irrigation and': 'Agricultural Irrigation and Drainage Engineering',
            'Clinical Medicine and Surgery': 'Clinical Medicine and Surgery'
        };
        category = categoryFixes[category] || category;

        // Fix grades
        let grade = p.min_mean_grade;
        if (grade === 'C--') grade = 'C-';
        if (grade === 'N' || grade === 'b' || grade === 'None') grade = 'D';
        if (grade.includes('ENG') || grade.includes('MATH')) grade = 'C'; // Fix misplaced subjects

        // Fix requirements
        const reqs = (p.requirements || [])
            .filter((r, i, arr) => {
                // Remove duplicates and invalid entries
                const key = `${r.subject}|${r.grade}`;
                return arr.findIndex(x => `${x.subject}|${x.grade}` === key) === i;
            })
            .map(r => {
                let subj = r.subject;
                let gr = r.grade;

                // Fix subject names
                subj = subj.replace(/^plain\s+/i, '');

                // Fix grades
                if (gr === 'C--') gr = 'C-';
                if (gr.includes(' ')) gr = gr.split(' ')[0];

                return { subject: subj, grade: gr };
            })
            .filter(r => r.subject && r.grade && !r.grade.includes('Biological'));

        cleaned.push({
            category,
            level: p.level,
            min_mean_grade: grade,
            requirements: reqs,
            notes: p.notes || '',
            exam_type: p.exam_type || 'KUCCPS'
        });
    }

    // Deduplicate
    const unique = new Map<string, TVETProgram>();
    for (const p of cleaned) {
        const key = `${p.category}|${p.level}|${p.exam_type}`;
        if (!unique.has(key) || (p.requirements.length > (unique.get(key)?.requirements.length || 0))) {
            unique.set(key, p);
        }
    }

    return Array.from(unique.values());
}

async function main() {
    console.log('TVET DATA CLEANUP');
    console.log('='.repeat(50));

    // Load parsed data
    const data = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));
    console.log(`Loaded ${data.total_programs} programs from text parser`);

    // Try AI cleanup first
    let cleaned = await cleanWithAI(data.programs);

    // If AI failed or returned same data, use manual cleanup
    if (cleaned.length === 0 || cleaned.length === data.programs.length) {
        cleaned = manualCleanup(data.programs);
    }

    console.log(`\nCleaned to ${cleaned.length} programs`);

    // Save results
    const output = {
        source: 'TVET_CLUSTER_DOCUMENT_2025.pdf',
        extraction_method: 'text_parsing_cleaned',
        total_programs: cleaned.length,
        programs: cleaned
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`Saved to: ${OUTPUT_PATH}`);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY BY EXAM TYPE:');
    const byType = new Map<string, number>();
    for (const p of cleaned) {
        const type = p.exam_type || 'KUCCPS';
        byType.set(type, (byType.get(type) || 0) + 1);
    }
    for (const [type, count] of byType) {
        console.log(`  ${type}: ${count}`);
    }

    console.log('\nSAMPLE CLEANED PROGRAMS:');
    for (const p of cleaned.slice(0, 8)) {
        console.log(`  ${p.category} (${p.level}): ${p.min_mean_grade}`);
        for (const r of (p.requirements || []).slice(0, 2)) {
            console.log(`    - ${r.subject}: ${r.grade}`);
        }
    }
}

main().catch(console.error);
