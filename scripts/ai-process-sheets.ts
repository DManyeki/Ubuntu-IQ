// Process edited Excel file sheet by sheet with 5-second delays
// Usage: npx tsx scripts/ai-process-sheets.ts

import * as fs from 'fs';

const OPENROUTER_API_KEY = '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';

interface ClusterData {
    cluster_id: string;
    subject_1: string;
    grade_1: string;
    subject_2: string;
    grade_2: string;
    subject_3: string;
    grade_3: string;
    subject_4: string;
    grade_4: string;
    programs: string[];
}

async function callAI(sheetContent: string, sheetNum: number): Promise<ClusterData[]> {
    console.log(`   [Sheet ${sheetNum}] Calling AI...`);

    const prompt = `Extract ALL clusters from this KUCCPS Excel sheet data.

SHEET DATA:
${sheetContent}

RULES:
1. Extract each sub-cluster row (1A, 2A, 2B, 4A, 4B, 5A, 5B, etc.)
2. For grades: "C+" = "C+", "C (PLAIN)" = "C", "B (PLAIN)" = "B", "C-(MINUS)" = "C-"
3. Programs MUST start with "Bachelor"
4. If a row continues from previous content, include it

Return ONLY a JSON array like:
[{"cluster_id":"5A","subject_1":"MAT ALTERNATIVE A","grade_1":"C+","subject_2":"PHY","grade_2":"C+","subject_3":"CHE","grade_3":"C+","subject_4":"ENG/KIS","grade_4":"C+","programs":["Bachelor of..."]}]

If no clusters found, return []`;

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
                console.log(`   Rate limited, waiting 30s...`);
                await new Promise(r => setTimeout(r, 30000));
                return callAI(sheetContent, sheetNum);
            }
            console.log(`   Error: ${response.status}`);
            return [];
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '[]';

        const jsonMatch = content.match(/\[[\s\S]*?\](?=\s*$|\s*```)/);
        if (jsonMatch) {
            try {
                const clusters = JSON.parse(jsonMatch[0]);
                console.log(`   [Sheet ${sheetNum}] Found ${clusters.length} clusters`);
                return clusters;
            } catch {
                console.log(`   [Sheet ${sheetNum}] JSON parse error`);
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
    console.log('AI SHEET-BY-SHEET PROCESSOR');
    console.log('='.repeat(50));

    // Read the context file
    const context = fs.readFileSync('scripts/data/excel_context.txt', 'utf-8');

    // Split by sheets
    const sheetPattern = /=== Table (\d+) ===/g;
    const sheets: { num: number, content: string }[] = [];

    let lastIndex = 0;
    let match;
    while ((match = sheetPattern.exec(context)) !== null) {
        if (sheets.length > 0) {
            sheets[sheets.length - 1].content = context.substring(lastIndex, match.index).trim();
        }
        sheets.push({ num: parseInt(match[1]), content: '' });
        lastIndex = match.index + match[0].length;
    }
    if (sheets.length > 0) {
        sheets[sheets.length - 1].content = context.substring(lastIndex).trim();
    }

    console.log(`Found ${sheets.length} sheets\n`);

    const allClusters: ClusterData[] = [];

    for (const sheet of sheets) {
        console.log(`\nProcessing Sheet ${sheet.num}...`);
        console.log(`   Content: ${sheet.content.length} chars`);

        if (sheet.content.length < 50) {
            console.log(`   Skipping (too short)`);
            continue;
        }

        const clusters = await callAI(sheet.content, sheet.num);
        allClusters.push(...clusters);

        // Delay between sheets
        if (sheet.num < sheets.length) {
            console.log(`   Waiting 5s...`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    // Deduplicate by cluster_id
    const uniqueClusters = new Map<string, ClusterData>();
    for (const c of allClusters) {
        if (c.cluster_id) {
            // Merge programs if same cluster found again
            if (uniqueClusters.has(c.cluster_id)) {
                const existing = uniqueClusters.get(c.cluster_id)!;
                const allProgs = [...existing.programs, ...c.programs];
                existing.programs = [...new Set(allProgs)];
            } else {
                uniqueClusters.set(c.cluster_id, c);
            }
        }
    }

    const finalClusters = Array.from(uniqueClusters.values());

    // Save results
    const outputPath = 'scripts/data/ai_sheets_clusters.json';
    fs.writeFileSync(outputPath, JSON.stringify({
        source: 'DEGREE_CLUSTER_DOCUMENT_2025_03 (1) edited.xlsx',
        processed_sheets: sheets.length,
        total_clusters: finalClusters.length,
        clusters: finalClusters
    }, null, 2), 'utf-8');

    console.log('\n' + '='.repeat(50));
    console.log(`Extracted ${finalClusters.length} unique clusters`);
    console.log(`Saved to: ${outputPath}`);

    // Summary
    console.log('\nCluster IDs found:');
    console.log(finalClusters.map(c => c.cluster_id).join(', '));
}

main().catch(console.error);
