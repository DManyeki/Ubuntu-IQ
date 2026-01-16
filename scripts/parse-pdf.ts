// PDF Parser for KUCCPS Admission Data
// Usage: npx tsx scripts/parse-pdf.ts <path-to-pdf>

import * as pdfjsLib from 'pdfjs-dist';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Supabase configuration (hardcoded for local dev)
const SUPABASE_URL = 'https://ahzalqvkkztgosocbcoz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoemFscXZra3p0Z29zb2NiY296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODUzNzkyOCwiZXhwIjoyMDg0MTEzOTI4fQ.bpkMGHZQgazporGGqN0rhoMlrOkOrydCScCr7U57Jjw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ParsedProgram {
    institution: string;
    program: string;
    kuccpsCode: string;
    minGrade: string;
    clusterSubjects?: string[];
}

/**
 * Parse PDF and extract text from all pages
 */
async function extractTextFromPDF(pdfPath: string): Promise<string> {
    console.log(`📄 Reading PDF: ${pdfPath}`);

    const dataBuffer = fs.readFileSync(pdfPath);
    const data = new Uint8Array(dataBuffer);

    const pdf = await pdfjsLib.getDocument(data).promise;
    console.log(`📖 Total pages: ${pdf.numPages}`);

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
        fullText += pageText + '\n';

        if (i % 10 === 0) {
            console.log(`   Processed ${i}/${pdf.numPages} pages...`);
        }
    }

    console.log(`✓ Extracted ${fullText.length} characters`);
    return fullText;
}

/**
 * Parse KUCCPS format data
 * Expected format examples:
 * - "University of Nairobi - Bachelor of Science (Computer Science) - C001-100 - B+"
 * - "Kenyatta University - Diploma in Business - D002-050 - C+"
 */
function parseKUCCPSData(text: string): ParsedProgram[] {
    console.log('\n🔍 Parsing KUCCPS data...');

    const programs: ParsedProgram[] = [];
    const lines = text.split('\n');

    // Pattern 1: Standard format with dashes
    const pattern1 = /^(.+?)\s+-\s+(.+?)\s+-\s+([A-Z]\d{3}-\d{3})\s+-\s+([A-D][+-]?)$/i;

    // Pattern 2: Alternative format (adjust based on actual PDF format)
    const pattern2 = /^(.+?)\s+([A-Z]\d{3}-\d{3})\s+([A-D][+-]?)\s+(.+)$/i;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.length < 20) continue;

        let match = trimmed.match(pattern1);
        if (!match) {
            match = trimmed.match(pattern2);
            if (match) {
                // Rearrange to standard format
                programs.push({
                    institution: match[1].trim(),
                    program: match[4].trim(),
                    kuccpsCode: match[2].trim(),
                    minGrade: match[3].trim()
                });
                continue;
            }
        } else {
            programs.push({
                institution: match[1].trim(),
                program: match[2].trim(),
                kuccpsCode: match[3].trim(),
                minGrade: match[4].trim()
            });
        }
    }

    console.log(`✓ Found ${programs.length} programs`);
    return programs;
}

/**
 * Clean and deduplicate data
 */
function cleanData(programs: ParsedProgram[]): ParsedProgram[] {
    console.log('\n🧹 Cleaning data...');

    const seen = new Set<string>();
    const cleaned: ParsedProgram[] = [];

    for (const prog of programs) {
        // Create unique key
        const key = `${prog.institution}|${prog.kuccpsCode}`;

        if (seen.has(key)) {
            console.log(`   Duplicate: ${prog.kuccpsCode}`);
            continue;
        }

        seen.add(key);
        cleaned.push(prog);
    }

    console.log(`✓ Removed ${programs.length - cleaned.length} duplicates`);
    return cleaned;
}

/**
 * Save to Supabase
 */
async function saveToDatabase(programs: ParsedProgram[], pdfFilename: string) {
    console.log('\n💾 Saving to Supabase...');

    try {
        // 1. Create ingest job
        const { data: job, error: jobError } = await supabase
            .from('ingest_jobs')
            .insert({
                type: 'pdf_parse',
                status: 'completed',
                extracted_data: programs,
                pages_processed: programs.length,
                completed_at: new Date().toISOString()
            })
            .select()
            .single();

        if (jobError) {
            throw new Error(`Failed to create job: ${jobError.message}`);
        }

        console.log(`✓ Created ingest job: ${job.id}`);

        // 2. Export to JSON file
        const outputPath = path.join('scripts', 'data', `parsed-${Date.now()}.json`);
        const exportData = {
            job_id: job.id,
            parsed_at: new Date().toISOString(),
            source_file: pdfFilename,
            total_programs: programs.length,
            programs
        };

        fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
        console.log(`✓ Exported to: ${outputPath}`);

        // 3. Show summary
        console.log('\n📊 Summary:');
        console.log(`   Total programs: ${programs.length}`);

        // Count by institution
        const institutionCounts = new Map<string, number>();
        for (const prog of programs) {
            institutionCounts.set(
                prog.institution,
                (institutionCounts.get(prog.institution) || 0) + 1
            );
        }

        console.log(`   Unique institutions: ${institutionCounts.size}`);
        console.log('\n   Top 5 institutions:');
        const sorted = Array.from(institutionCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        for (const [inst, count] of sorted) {
            console.log(`     ${inst}: ${count} programs`);
        }

        return job.id;

    } catch (error: any) {
        console.error('❌ Database error:', error.message);
        throw error;
    }
}

/**
 * Main function
 */
async function main() {
    console.log('🚀 KUCCPS PDF Parser\n');

    // Get PDF path from command line
    const pdfPath = process.argv[2];

    if (!pdfPath) {
        console.error('❌ Usage: npx tsx scripts/parse-pdf.ts <path-to-pdf>');
        console.error('\nExample:');
        console.error('  npx tsx scripts/parse-pdf.ts scripts/pdfs/kuccps-2024.pdf');
        process.exit(1);
    }

    if (!fs.existsSync(pdfPath)) {
        console.error(`❌ File not found: ${pdfPath}`);
        process.exit(1);
    }

    const pdfFilename = path.basename(pdfPath);

    try {
        // Step 1: Extract text
        const text = await extractTextFromPDF(pdfPath);

        // Step 2: Parse data
        const programs = parseKUCCPSData(text);

        if (programs.length === 0) {
            console.error('\n❌ No programs found. Check PDF format.');
            console.log('\nExpected format:');
            console.log('  Institution Name - Program Name - CODE - Grade');
            console.log('  Example: University of Nairobi - BSc Computer Science - C001-100 - B+');
            process.exit(1);
        }

        // Step 3: Clean data
        const cleaned = cleanData(programs);

        // Step 4: Save to database
        const jobId = await saveToDatabase(cleaned, pdfFilename);

        console.log('\n✅ Parsing complete!');
        console.log(`\n📋 Next steps:`);
        console.log(`   1. Review data: scripts/data/parsed-*.json`);
        console.log(`   2. Check job in Supabase: ${jobId}`);
        console.log(`   3. Run AI review: npx tsx scripts/ai-review.ts ${jobId}`);

    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Run
main();
