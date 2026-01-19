// AI-powered cluster extraction using OpenRouter vision model
// Uses xiaomi/mimo-v2-flash:free to extract cluster data from PDF
// Usage: npx tsx scripts/ai-extract-clusters.ts

import * as fs from 'fs';
import * as path from 'path';

const OPENROUTER_API_KEY = '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';
const OPENROUTER_MODEL = 'xiaomi/mimo-v2-flash:free';

interface ClusterData {
    cluster_id: string;
    subject_1: string;
    subject_1_grade?: string;
    subject_2: string;
    subject_2_grade?: string;
    subject_3: string;
    subject_3_grade?: string;
    subject_4: string;
    subject_4_grade?: string;
    programs: string[];
}

async function extractWithAI(imageBase64: string, pageNum: number): Promise<string> {
    console.log(`   Sending page ${pageNum} to AI...`);

    const prompt = `Analyze this KUCCPS cluster document page and extract the cluster data in JSON format.

For each cluster/sub-cluster found, extract:
- cluster_id (e.g., "4", "4A", "4B", "5B")
- subject_1, subject_1_grade (e.g., "MAT ALTERNATIVE A", "C+")
- subject_2, subject_2_grade
- subject_3, subject_3_grade
- subject_4, subject_4_grade
- programs: list of program names (Bachelor of..., B.Sc..., etc.)

Return ONLY valid JSON array like:
[
  {
    "cluster_id": "4A",
    "subject_1": "MAT ALTERNATIVE A",
    "subject_1_grade": "C+",
    "subject_2": "PHY",
    "subject_2_grade": "C+",
    "subject_3": "GEO",
    "subject_3_grade": "C",
    "subject_4": "",
    "subject_4_grade": "",
    "programs": ["Bachelor of Science (Geomatics)", "Bachelor of Technology (Geospatial)"]
  }
]

If no clusters found on this page, return: []`;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://mindcare-kenya.vercel.app',
                'X-Title': 'MindCare Kenya'
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }
                        ]
                    }
                ],
                max_tokens: 4000,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.log(`   Error: ${response.status} - ${error}`);
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
    console.log('AI CLUSTER EXTRACTION');
    console.log('Using: xiaomi/mimo-v2-flash:free');
    console.log('='.repeat(50));

    // For now, use the uploaded screenshots as test
    const artifactDir = 'C:/Users/Manyeki/.gemini/antigravity/brain/99c0bb1f-210c-4d59-a1a2-b3b937dff9f0';

    // Find uploaded cluster images
    const images = fs.readdirSync(artifactDir)
        .filter(f => f.includes('uploaded_image') && f.endsWith('.png'))
        .sort()
        .slice(-2); // Get last 2 uploaded images (cluster screenshots)

    console.log(`\nFound ${images.length} images to process`);

    const allClusters: ClusterData[] = [];

    for (let i = 0; i < images.length; i++) {
        const imagePath = path.join(artifactDir, images[i]);
        console.log(`\n[${i + 1}/${images.length}] Processing: ${images[i]}`);

        try {
            const imageBuffer = fs.readFileSync(imagePath);
            const base64 = imageBuffer.toString('base64');

            const result = await extractWithAI(base64, i + 1);

            // Try to parse JSON from response
            let clusters: ClusterData[] = [];
            try {
                // Extract JSON from response (it might have markdown code blocks)
                const jsonMatch = result.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    clusters = JSON.parse(jsonMatch[0]);
                }
            } catch (e) {
                console.log(`   Could not parse response as JSON`);
                console.log(`   Response: ${result.substring(0, 200)}...`);
            }

            if (clusters.length > 0) {
                console.log(`   Extracted ${clusters.length} clusters`);
                allClusters.push(...clusters);
            }

            // Rate limit delay
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error: any) {
            console.log(`   Error processing: ${error.message}`);
        }
    }

    // Save results
    const outputPath = 'scripts/data/ai_extracted_clusters.json';
    fs.writeFileSync(outputPath, JSON.stringify({
        total_clusters: allClusters.length,
        clusters: allClusters
    }, null, 2));

    console.log('\n' + '='.repeat(50));
    console.log(`Extracted ${allClusters.length} clusters total`);
    console.log(`Saved to: ${outputPath}`);

    // Show sample
    if (allClusters.length > 0) {
        console.log('\nSample extracted cluster:');
        console.log(JSON.stringify(allClusters[0], null, 2));
    }
}

main().catch(console.error);
