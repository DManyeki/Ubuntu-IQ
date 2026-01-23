
import { load } from 'cheerio';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/genai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// --- Configuration ---
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Ignore SSL errors
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''; // Or correct env var name
const OUT_FILE = path.join(process.cwd(), 'scripts/data/kmtc_scraped_data.json');
const BASE_URL = 'https://students.kuccps.net';
const START_URL = 'https://students.kuccps.net/programmes/search-kmtc/';

// --- Types ---
interface Program {
    id: string;
    name: string;
    url: string;
    category_group: string;
    min_mean_grade?: string;
    subject_requirements: string[]; // Raw text or parsed
    campuses: {
        name: string;
        code: string;
        county: string;
    }[];
    raw_requirements_text?: string;
}

// --- Helpers ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPage(url: string, retries = 3): Promise<string> {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            return await res.text();
        } catch (e) {
            console.warn(`Attempt ${i + 1} failed for ${url}:`, e);
            await delay(2000);
        }
    }
    throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

// --- Main Scraper ---
async function main() {
    console.log('🚀 Starting KMTC Scraper...');

    // 1. Fetch Main List
    console.log(`fetching list from ${START_URL}...`);
    const listHtml = await fetchPage(START_URL);
    const $ = load(listHtml);

    const programs: Program[] = [];

    // Identify rows in the table
    $('table tbody tr').each((_, el) => {
        const $row = $(el);
        const link = $row.attr('data-href');
        if (!link) return;

        const name = $row.find('td').eq(1).text().trim();
        const group = $row.find('td').eq(2).text().trim();

        // Extract ID from link e.g. /programmes/kmtcdetail/5538/ -> 5538
        const id = link.split('/').filter(s => s).pop() || '';

        programs.push({
            id,
            name,
            url: BASE_URL + link,
            category_group: group,
            subject_requirements: [],
            campuses: []
        });
    });

    console.log(`Found ${programs.length} programs. Starting detail extraction...`);

    // 2. Fetch Details for each program
    for (let i = 0; i < programs.length; i++) {
        const p = programs[i];
        console.log(`[${i + 1}/${programs.length}] Processing ${p.name}...`);

        try {
            const html = await fetchPage(p.url);
            const $p = load(html);

            // -- Extract Minimum Mean Grade --
            // It's in a table under "Minimum Entry Requirements"
            // Selector based on inspection: h3:contains('Minimum Entry Requirements') -> next table -> tr -> th:contains('Minimum Mean Grade') -> next td
            let minMeanGrade = '';
            $p('th:contains("Minimum Mean Grade")').each((_, el) => {
                minMeanGrade = $p(el).next('td').text().trim();
            });
            p.min_mean_grade = minMeanGrade;

            // -- Extract Subject Requirements Raw Text --
            // The section "Minimum Subject Requirements" has a table rows like "Subject 1 | ENG / KIS | C"
            // We'll capture them as strings "Subject 1: ENG / KIS (C)"
            const reqLines: string[] = [];
            $p('h3:contains("Minimum Subject Requirements")').next('table').find('tr').each((_, tr) => {
                const cols = $p(tr).find('td, th');
                if (cols.length >= 3) {
                    const label = $(cols[0]).text().trim();
                    const subject = $(cols[1]).text().trim();
                    const grade = $(cols[2]).text().trim();
                    if (label && subject) {
                        reqLines.push(`${label}: ${subject} (${grade})`);
                    }
                }
            });
            p.raw_requirements_text = reqLines.join('\n');

            // -- Extract Campuses --
            // Table under "Available Programmes"
            // Columns: Institution | Institution type | Programme Code ...
            $p('h4:contains("Available Programmes")').next('.table-responsive').find('table tbody tr').each((_, tr) => {
                const $tr = $p(tr);
                const instText = $tr.find('td').eq(0).text().trim(); // "KENYA MEDICAL TRAINING COLLEGE - MOSORIOT CAMPUS\nNANDI COUNTY"
                const cleanInstName = instText.split('\n')[0].trim();
                const county = $tr.find('td').eq(0).find('.label-inverse').text().trim();

                const progCode = $tr.find('td').eq(2).text().trim().split('\n')[0].trim(); // "4980K01\nApplication" -> "4980K01"

                if (cleanInstName) {
                    p.campuses.push({
                        name: cleanInstName,
                        code: progCode,
                        county: county
                    });
                }
            });

            // Simple rate limit
            await delay(100);

        } catch (err) {
            console.error(`Failed to process ${p.name}:`, err);
        }
    }

    // 3. Save Data
    if (!fs.existsSync(path.dirname(OUT_FILE))) fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(programs, null, 2));
    console.log(`\n✅ Saved ${programs.length} programs to ${OUT_FILE}`);
}

main().catch(console.error);
