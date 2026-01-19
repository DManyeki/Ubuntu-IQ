// TVET Excel - AI Extraction
// Sends Excel table content to AI for structured extraction
// Usage: npx tsx scripts/ai-extract-tvet-excel.ts

import * as fs from 'fs';
import { execSync } from 'child_process';

const OPENROUTER_API_KEY = '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';
const CONTEXT_PATH = 'scripts/data/tvet_excel_context.txt';
const OUTPUT_PATH = 'scripts/data/tvet_excel_ai.json';

interface TVETProgram {
    category: string;
    level: string;
    min_mean_grade: string;
    requirements: { subject: string; grade: string }[];
    exam_type: string;
}

// Extract Excel content using Python
function extractExcelContent(): string {
    const pythonScript = `
import openpyxl

wb = openpyxl.load_workbook("Kuccps Files/TVET_CLUSTER_DOCUMENT_2025.xlsx", data_only=True)
output = []

for sheet_name in wb.sheetnames:
    ws = wb[sheet_name]
    output.append(f"=== {sheet_name} ===")
    for row_idx in range(1, ws.max_row + 1):
        row_data = []
        for col_idx in range(1, ws.max_column + 1):
            cell = ws.cell(row=row_idx, column=col_idx)
            val = str(cell.value).replace('\\n', ' ') if cell.value else ""
            row_data.append(val)
        output.append(" | ".join(row_data))
    output.append("")

print("\\n".join(output))
`;

    fs.writeFileSync('scripts/temp_extract_excel.py', pythonScript);
    const content = execSync('python scripts/temp_extract_excel.py', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    fs.unlinkSync('scripts/temp_extract_excel.py');
    fs.writeFileSync(CONTEXT_PATH, content, 'utf-8');
    return content;
}

async function callAI(tableContent: string, tableName: string): Promise<TVETProgram[]> {
    console.log(`   [${tableName}] Calling AI...`);

    const prompt = `Extract ALL TVET programs from this Excel table.

TABLE DATA:
${tableContent}

RULES:
1. Column B = Programme Category
2. Column C = Level (Diploma/Certificate/Artisan)  
3. Column D = Minimum Mean Grade
4. Column E = Subject Requirements
5. Convert grades: "C plain" = "C", "C- (minus)" = "C-", "D (plain)" = "D"
6. Detect exam_type from headers: "KNEC EXAMINATION" = KNEC, "INTERNAL EXAMINERS" = INTERNAL, else KUCCPS
7. If requirements = "None" or empty, use []

Return JSON array:
[{"category":"Law","level":"Diploma","min_mean_grade":"C","requirements":[{"subject":"ENG/KIS","grade":"C+"}],"exam_type":"KUCCPS"}]

Return ONLY JSON array:`;

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
                console.log(`   Rate limited, waiting 60s...`);
                await new Promise(r => setTimeout(r, 60000));
                return callAI(tableContent, tableName);
            }
            console.log(`   Error: ${response.status}`);
            return [];
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '[]';

        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            try {
                const programs = JSON.parse(jsonMatch[0]);
                console.log(`   [${tableName}] Found ${programs.length} programs`);
                return programs;
            } catch {
                console.log(`   [${tableName}] JSON parse error`);
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
    console.log('TVET EXCEL AI EXTRACTION');
    console.log('='.repeat(50));

    // Extract Excel content
    console.log('\n[Step 1] Extracting Excel content...');
    const content = extractExcelContent();
    console.log(`   Extracted ${content.length} characters`);

    // Split by tables
    const tablePattern = /=== (Table \d+) ===/g;
    const tables: { name: string; content: string }[] = [];

    let lastIndex = 0;
    let match;
    while ((match = tablePattern.exec(content)) !== null) {
        if (tables.length > 0) {
            tables[tables.length - 1].content = content.substring(lastIndex, match.index).trim();
        }
        tables.push({ name: match[1], content: '' });
        lastIndex = match.index + match[0].length;
    }
    if (tables.length > 0) {
        tables[tables.length - 1].content = content.substring(lastIndex).trim();
    }

    console.log(`   Found ${tables.length} tables`);

    // Process each table
    console.log('\n[Step 2] Processing tables with AI...');
    const allPrograms: TVETProgram[] = [];

    for (const table of tables) {
        if (table.content.length < 50) continue;

        const programs = await callAI(table.content, table.name);
        allPrograms.push(...programs);

        // Delay between tables
        if (tables.indexOf(table) < tables.length - 1) {
            console.log(`   Waiting 5s...`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    // Deduplicate
    const unique = new Map<string, TVETProgram>();
    for (const p of allPrograms) {
        if (p.category) {
            const key = `${p.category}|${p.level}|${p.exam_type}`;
            if (!unique.has(key) || (p.requirements?.length > (unique.get(key)?.requirements?.length || 0))) {
                unique.set(key, p);
            }
        }
    }

    const finalPrograms = Array.from(unique.values());

    console.log(`\n[Step 3] Results`);
    console.log(`   Total: ${allPrograms.length}, Unique: ${finalPrograms.length}`);

    // Save
    const output = {
        source: 'TVET_CLUSTER_DOCUMENT_2025.xlsx',
        extraction_method: 'ai_excel',
        total_programs: finalPrograms.length,
        programs: finalPrograms
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`   Saved to: ${OUTPUT_PATH}`);

    // Summary
    console.log('\nBy exam type:');
    for (const type of ['KUCCPS', 'KNEC', 'INTERNAL']) {
        const count = finalPrograms.filter(p => p.exam_type === type).length;
        console.log(`   ${type}: ${count}`);
    }
}

main().catch(console.error);
