// Process edited Excel file with OpenRouter AI
// Headers flow from previous sheets if missing in current sheet
// Usage: npx tsx scripts/ai-process-edited-excel.ts

import * as fs from 'fs';

// Dynamic import for openpyxl-style reading
const OPENROUTER_API_KEY = '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';

async function readExcelAsText(): Promise<string> {
    // Use Python to extract Excel as structured text
    const pythonScript = `
import openpyxl
import json

excel_path = "Kuccps Files/DEGREE_CLUSTER_DOCUMENT_2025_03 (1) edited.xlsx"
wb = openpyxl.load_workbook(excel_path)

all_data = []
last_headers = None

for sheet_name in wb.sheetnames:
    sheet = wb[sheet_name]
    rows = []
    
    for row in sheet.iter_rows(values_only=True):
        if row and any(c is not None for c in row):
            rows.append([str(c or "") for c in row])
    
    # Check if first row looks like headers (contains "Subject")
    has_headers = False
    if rows and any("Subject" in str(c) for c in rows[0] if c):
        has_headers = True
        last_headers = rows[0]
    
    all_data.append({
        "sheet": sheet_name,
        "has_headers": has_headers,
        "inherited_headers": None if has_headers else (last_headers if last_headers else None),
        "rows": rows
    })

print(json.dumps(all_data, ensure_ascii=False))
`;

    fs.writeFileSync('scripts/temp_read_excel.py', pythonScript);

    const { execSync } = await import('child_process');
    try {
        const output = execSync('python scripts/temp_read_excel.py', {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024
        });
        fs.unlinkSync('scripts/temp_read_excel.py');
        return output;
    } catch (e: any) {
        console.error('Error reading Excel:', e.message);
        return '[]';
    }
}

async function callAI(sheetData: string): Promise<string> {
    console.log('   Sending to AI...');

    const prompt = `You are an expert data extractor for KUCCPS university admission documents.

CONTEXT:
- This is an Excel export of KUCCPS cluster document
- Each sheet represents a page from the PDF
- IMPORTANT: If a sheet does NOT have header row (containing "Subject 1", "Subject 2", etc.), it INHERITS headers from the previous sheet
- Main clusters are numbered 1-20
- Sub-clusters have letters (4A, 4B, 5A, 5B, etc.) with SPECIFIC grade requirements like "C+", "C (PLAIN)", "B (PLAIN)"
- Programs are listed under each sub-cluster

DATA FROM EXCEL:
${sheetData.substring(0, 12000)}

TASK: Extract ALL clusters and sub-clusters into this JSON format:
[
  {
    "cluster_id": "5A",
    "subject_1": "MAT ALTERNATIVE A",
    "grade_1": "C+",
    "subject_2": "PHY",
    "grade_2": "C+",
    "subject_3": "CHE", 
    "grade_3": "C+",
    "subject_4": "ENG/KIS",
    "grade_4": "C+",
    "programs": ["Bachelor of Engineering (Civil)", "Bachelor of Science (Mechanical)"]
  }
]

RULES:
1. Each sub-cluster (4A, 4B, 5A, etc.) has SPECIFIC grade requirements - extract them!
2. "C (PLAIN)" or "C (Plain)" means grade C
3. Main clusters (1, 2, 3...) may not have grades - use empty string ""
4. Programs MUST be complete names starting with "Bachelor"
5. Return ONLY valid JSON array

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
                model: 'meta-llama/llama-3.2-3b-instruct:free',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 4000,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            if (response.status === 429) {
                console.log('   Rate limited, waiting 30s...');
                await new Promise(r => setTimeout(r, 30000));
                return callAI(sheetData);
            }
            console.log(`   Error: ${response.status}`);
            return '[]';
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '[]';
    } catch (error: any) {
        console.log(`   Error: ${error.message}`);
        return '[]';
    }
}

async function main() {
    console.log('AI EXCEL PROCESSOR (Edited File)');
    console.log('='.repeat(50));

    // Step 1: Read Excel data
    console.log('\n[Step 1] Reading edited Excel file...');
    const excelData = await readExcelAsText();

    if (!excelData || excelData === '[]') {
        console.log('Failed to read Excel or file not found');
        console.log('\nMake sure the file exists:');
        console.log('  Kuccps Files/DEGREE_CLUSTER_DOCUMENT_2025_03 (1) edited.xlsx');
        return;
    }

    const sheets = JSON.parse(excelData);
    console.log(`   Found ${sheets.length} sheets`);

    // Build context with header inheritance
    let contextText = '';
    for (const sheet of sheets) {
        contextText += `\n\n=== ${sheet.sheet} ===\n`;
        if (sheet.inherited_headers) {
            contextText += `[INHERITED HEADERS: ${sheet.inherited_headers.join(' | ')}]\n`;
        }
        for (const row of sheet.rows) {
            contextText += row.join(' | ') + '\n';
        }
    }

    console.log(`   Total context: ${contextText.length} characters`);

    // Save context for debugging
    fs.writeFileSync('scripts/data/excel_context.txt', contextText, 'utf-8');
    console.log('   Saved context to: scripts/data/excel_context.txt');

    // Step 2: Send to AI
    console.log('\n[Step 2] Processing with AI...');
    const result = await callAI(contextText);

    console.log('\n   AI Response preview:');
    console.log(result.substring(0, 500));

    // Step 3: Parse and save
    console.log('\n[Step 3] Parsing results...');
    try {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const clusters = JSON.parse(jsonMatch[0]);

            const outputPath = 'scripts/data/ai_edited_excel_clusters.json';
            fs.writeFileSync(outputPath, JSON.stringify({
                source: 'DEGREE_CLUSTER_DOCUMENT_2025_03 (1) edited.xlsx',
                total_clusters: clusters.length,
                clusters
            }, null, 2), 'utf-8');

            console.log(`   Saved ${clusters.length} clusters to: ${outputPath}`);

            // Show sample
            if (clusters.length > 0) {
                console.log('\n   Sample cluster:');
                console.log(JSON.stringify(clusters[0], null, 2));
            }
        } else {
            console.log('   Could not parse JSON from response');
        }
    } catch (e: any) {
        console.log(`   Parse error: ${e.message}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('DONE');
}

main().catch(console.error);
