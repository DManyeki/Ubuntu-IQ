// AI-enhanced cluster extraction with chunked processing
// Processes one page at a time with delays to avoid rate limiting
// Usage: npx tsx scripts/ai-extract-clusters-v2.ts

import * as fs from 'fs';

const OPENROUTER_API_KEY = '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';

interface ClusterData {
    cluster_id: string;
    parent_cluster?: string;
    subjects: {
        subject_1: string;
        grade_1: string;
        subject_2: string;
        grade_2: string;
        subject_3: string;
        grade_3: string;
        subject_4: string;
        grade_4: string;
    };
    programs: string[];
}

async function callAI(text: string, pageNum: number): Promise<ClusterData[]> {
    console.log(`   Processing page ${pageNum}...`);

    const prompt = `You are a data extraction expert. Parse this KUCCPS cluster document text.

TEXT FROM PAGE ${pageNum}:
"""
${text}
"""

TASK: Extract ALL clusters/sub-clusters from this page.

For each cluster found, extract:
1. cluster_id (e.g., "2A", "5B", "13A")
2. Subject requirements with MINIMUM GRADE for each:
   - subject_1, grade_1 (e.g., "MAT ALTERNATIVE A", "C+")
   - subject_2, grade_2 (e.g., "PHY", "C (PLAIN)")
   - subject_3, grade_3
   - subject_4, grade_4
3. All Bachelor programs listed under this cluster

IMPORTANT: 
- "C (PLAIN)" means grade C, Plain Pass
- "C+" means grade C Plus
- "B (PLAIN)" means grade B
- If no grade specified for a subject, use empty string ""
- Programs are listed after the subject requirements

Return ONLY a JSON array. Example:
[
  {
    "cluster_id": "5A",
    "subjects": {
      "subject_1": "MAT ALTERNATIVE A",
      "grade_1": "C+",
      "subject_2": "PHY",
      "grade_2": "C+",
      "subject_3": "CHE",
      "grade_3": "C+",
      "subject_4": "ENG/KIS",
      "grade_4": "C+"
    },
    "programs": [
      "Bachelor of Engineering (Civil Engineering)",
      "Bachelor of Science (Mechanical Engineering)"
    ]
  }
]

If no clusters on this page, return []`;

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
                max_tokens: 3000,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            if (response.status === 429) {
                console.log(`   Rate limited, waiting 30s...`);
                await new Promise(r => setTimeout(r, 30000));
                return callAI(text, pageNum); // Retry
            }
            console.log(`   Error: ${response.status}`);
            return [];
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        // Extract JSON from response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const clusters = JSON.parse(jsonMatch[0]);
            console.log(`   Found ${clusters.length} clusters`);
            return clusters;
        }

        return [];
    } catch (error: any) {
        console.log(`   Error: ${error.message}`);
        return [];
    }
}

async function main() {
    console.log('AI CLUSTER EXTRACTION v2');
    console.log('(Chunked processing with rate limit handling)');
    console.log('='.repeat(50));

    // Load raw text
    const rawText = fs.readFileSync('scripts/data/cluster_raw_text.txt', 'utf-8');

    // Split by pages
    const pages = rawText.split(/=== PAGE \d+ ===/g).filter(p => p.trim());
    console.log(`\nFound ${pages.length} pages to process`);

    const allClusters: ClusterData[] = [];

    // Process each page with delay
    for (let i = 0; i < pages.length; i++) {
        const pageText = pages[i].trim();
        if (pageText.length < 100) continue; // Skip nearly empty pages

        const clusters = await callAI(pageText, i + 1);
        allClusters.push(...clusters);

        // Delay between requests to avoid rate limiting
        if (i < pages.length - 1) {
            console.log('   Waiting 5s before next page...');
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    // Save results
    const outputPath = 'scripts/data/ai_clusters_v2.json';
    fs.writeFileSync(outputPath, JSON.stringify({
        total_clusters: allClusters.length,
        clusters: allClusters
    }, null, 2), 'utf-8');

    console.log('\n' + '='.repeat(50));
    console.log(`Extracted ${allClusters.length} clusters`);
    console.log(`Saved to: ${outputPath}`);

    // Show sample
    if (allClusters.length > 0) {
        console.log('\nSample cluster:');
        console.log(JSON.stringify(allClusters[0], null, 2));
    }
}

main().catch(console.error);
