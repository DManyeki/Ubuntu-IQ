// AI Verification of Extracted KUCCPS Data
// Uses OpenRouter (free Xiaomi MiMo model) to review data quality
// Usage: npx tsx scripts/ai-verify-data.ts

import * as fs from 'fs';

// OpenRouter configuration
const OPENROUTER_API_KEY = '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';
const OPENROUTER_MODEL = 'meta-llama/llama-3.2-3b-instruct:free';

interface ExtractedProgram {
    row_number: string;
    program_code: string;
    institution: string;
    program: string;
}

interface VerificationResult {
    issues: DataIssue[];
    summary: string;
    institutionNormalization: Record<string, string>;
    programNormalization: Record<string, string>;
}

interface DataIssue {
    type: 'typo' | 'inconsistent' | 'formatting' | 'duplicate' | 'missing';
    field: string;
    value: string;
    suggestion?: string;
    confidence: number;
}

async function callOpenRouter(prompt: string): Promise<string> {
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
                { role: 'user', content: prompt }
            ],
            max_tokens: 2000,
            temperature: 0.3
        })
    });

    if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
}

function findLocalIssues(programs: ExtractedProgram[]): DataIssue[] {
    const issues: DataIssue[] = [];

    // Track institution name variations
    const institutionVariations = new Map<string, string[]>();

    for (const prog of programs) {
        // Check for newlines in data
        if (prog.institution.includes('\n')) {
            issues.push({
                type: 'formatting',
                field: 'institution',
                value: prog.institution,
                suggestion: prog.institution.replace(/\n/g, ' '),
                confidence: 1.0
            });
        }

        if (prog.program.includes('\n')) {
            issues.push({
                type: 'formatting',
                field: 'program',
                value: prog.program,
                suggestion: prog.program.replace(/\n/g, ' '),
                confidence: 1.0
            });
        }

        // Check for extremely short program names
        if (prog.program.length < 10) {
            issues.push({
                type: 'missing',
                field: 'program',
                value: prog.program,
                suggestion: 'Program name may be incomplete',
                confidence: 0.7
            });
        }

        // Track institution names for similarity check
        const normalized = prog.institution.toUpperCase().replace(/[^A-Z]/g, '');
        if (!institutionVariations.has(normalized)) {
            institutionVariations.set(normalized, []);
        }
        institutionVariations.get(normalized)!.push(prog.institution);
    }

    // Find similar institution names (potential inconsistencies)
    const uniqueInstitutions = [...new Set(programs.map(p => p.institution))];
    for (let i = 0; i < uniqueInstitutions.length; i++) {
        for (let j = i + 1; j < uniqueInstitutions.length; j++) {
            const a = uniqueInstitutions[i];
            const b = uniqueInstitutions[j];

            // Simple similarity check
            const aWords = a.toUpperCase().split(/\s+/);
            const bWords = b.toUpperCase().split(/\s+/);
            const commonWords = aWords.filter(w => bWords.includes(w));

            if (commonWords.length >= 2 && a !== b) {
                issues.push({
                    type: 'inconsistent',
                    field: 'institution',
                    value: `"${a}" vs "${b}"`,
                    suggestion: 'These may be the same institution with different spellings',
                    confidence: 0.6
                });
            }
        }
    }

    return issues;
}

async function verifyWithAI(programs: ExtractedProgram[], sampleSize: number = 20): Promise<string> {
    console.log(`\n[AI] Sending ${sampleSize} samples to OpenRouter for review...`);

    // Take a diverse sample
    const sample = programs.filter((_, i) => i % Math.floor(programs.length / sampleSize) === 0).slice(0, sampleSize);

    const prompt = `You are a data quality reviewer. Review this sample of Kenyan university program data extracted from a KUCCPS PDF.

Check for:
1. Spelling errors in institution or program names
2. Inconsistent naming (same institution with different spellings)
3. Formatting issues (extra spaces, incomplete names)
4. Any obvious errors

Data sample:
${JSON.stringify(sample, null, 2)}

Provide a brief summary of data quality issues found. Be concise.`;

    try {
        const response = await callOpenRouter(prompt);
        return response;
    } catch (error: any) {
        return `AI review failed: ${error.message}`;
    }
}

async function main() {
    console.log('='.repeat(50));
    console.log('  AI DATA VERIFICATION');
    console.log('='.repeat(50));

    // Load data
    const jsonPath = 'scripts/data/extracted_DEGREE_PROGRAMMES_2025.json';
    if (!fs.existsSync(jsonPath)) {
        console.error('Error: Data file not found');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const programs: ExtractedProgram[] = data.programs;

    console.log(`\nLoaded ${programs.length} programs from ${data.source_file}\n`);

    // Step 1: Local pattern-based checks
    console.log('[Step 1] Running local pattern checks...');
    const localIssues = findLocalIssues(programs);

    console.log(`  Found ${localIssues.length} potential issues locally`);

    // Group by type
    const byType: Record<string, number> = {};
    for (const issue of localIssues) {
        byType[issue.type] = (byType[issue.type] || 0) + 1;
    }
    console.log('  Issues by type:', byType);

    // Step 2: AI review (sample)
    console.log('\n[Step 2] AI-powered review (sample)...');
    const aiReview = await verifyWithAI(programs, 20);

    console.log('\n' + '-'.repeat(50));
    console.log('AI REVIEW RESULTS:');
    console.log('-'.repeat(50));
    console.log(aiReview);
    console.log('-'.repeat(50));

    // Step 3: Summary
    console.log('\n[Step 3] Summary');
    console.log(`  Total programs: ${programs.length}`);
    console.log(`  Unique institutions: ${new Set(programs.map(p => p.institution)).size}`);
    console.log(`  Local issues found: ${localIssues.length}`);

    // Show sample of issues
    if (localIssues.length > 0) {
        console.log('\n  Sample issues (first 5):');
        for (const issue of localIssues.slice(0, 5)) {
            console.log(`    - [${issue.type}] ${issue.field}: ${issue.value.substring(0, 50)}...`);
        }
    }

    // Save report
    const report = {
        timestamp: new Date().toISOString(),
        source: data.source_file,
        totalPrograms: programs.length,
        uniqueInstitutions: new Set(programs.map(p => p.institution)).size,
        localIssues: localIssues,
        aiReview: aiReview
    };

    const reportPath = 'scripts/data/verification_report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to: ${reportPath}`);

    console.log('\n' + '='.repeat(50));
    console.log('  VERIFICATION COMPLETE');
    console.log('='.repeat(50));
}

main().catch(console.error);
