
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const MAIN_PAGE_PATH = path.join(DATA_DIR, 'tvet_main_page.html');
const OUTPUT_FILE = path.join(DATA_DIR, 'tvet_data.json');
const BASE_URL = 'https://www.tveta.go.ke';

interface Course {
    name: string;
    level: string;
    exam_body: string;
}

interface TVETInstitution {
    name: string;
    registration_number: string;
    category: string;
    ownership: string; // Mapped from 'Type'
    county: string;
    courses: Course[];
    detail_url: string;
}

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchDetailPage(url: string): Promise<string | null> {
    try {
        console.log(`Fetching: ${url}`);
        // Disable SSL verification for this request as per plan
        const response = await fetch(url, {
            // @ts-ignore
            agent: new (require('https').Agent)({ rejectUnauthorized: false })
        });

        if (!response.ok) {
            console.error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
            return null;
        }
        return await response.text();
    } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        return null;
    }
}

async function main() {
    if (!fs.existsSync(MAIN_PAGE_PATH)) {
        console.error(`Main page HTML not found at ${MAIN_PAGE_PATH}. Please run inspect-tvet.ts first or save the HTML manually.`);
        return;
    }

    console.log("Parsing main page...");
    const html = fs.readFileSync(MAIN_PAGE_PATH, 'utf-8');
    const $ = cheerio.load(html);

    const institutions: TVETInstitution[] = [];
    const rows = $('#registered-table tbody tr');

    console.log(`Found ${rows.length} institutions in the table.`);

    // Iterate through rows
    // Note: The structure in the HTML file is:
    // <td>Index</td>
    // <td>Name</td>
    // <td>Reg No</td>
    // <td>Category</td>
    // <td>Type</td> (Ownership)
    // <td>County</td>
    // <td>Expiry</td>
    // <td>Status</td>
    // <td>Action (Link)</td>

    // Process a limited number for testing if needed, or all.
    // For this implementation, we'll try to process all but handle failures gracefully.

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = $(row).find('td');

        if (cells.length < 9) continue;

        const name = $(cells[1]).text().trim();
        const regNo = $(cells[2]).text().trim();
        const category = $(cells[3]).text().trim();
        const ownership = $(cells[4]).text().trim();
        const county = $(cells[5]).text().trim();
        const detailLink = $(cells[8]).find('a').attr('href');

        if (name && detailLink) {
            institutions.push({
                name,
                registration_number: regNo,
                category,
                ownership,
                county,
                courses: [],
                detail_url: detailLink // Already absolute URL in the source? Likely.
            });
        }
    }

    console.log(`Extracted list of ${institutions.length} institutions.`);

    // Now fetch details for each
    for (let i = 0; i < institutions.length; i++) {
        const inst = institutions[i];

        // Rate limiting
        await sleep(1000);

        console.log(`Processing ${i + 1}/${institutions.length}: ${inst.name}`);

        // Check if we need to fetch live or if we have it cached (not implementing caching yet, just live fetch)
        // Note: fetchDetailPage handles errors and returns null on failure
        const detailHtml = await fetchDetailPage(inst.detail_url);

        if (detailHtml) {
            const $detail = cheerio.load(detailHtml);
            const courseRows = $detail('#coursesTable tbody tr');

            const courses: Course[] = [];
            courseRows.each((_, row) => {
                const cols = $(row).find('td');
                // #, Name, Level, Exam Body
                if (cols.length >= 4) {
                    courses.push({
                        name: $(cols[1]).text().trim(),
                        level: $(cols[2]).text().trim(),
                        exam_body: $(cols[3]).text().trim()
                    });
                }
            });

            inst.courses = courses;
            console.log(`  Found ${courses.length} courses.`);
        } else {
            console.warn(`  Skipping details for ${inst.name} due to fetch error.`);
        }

        // Save progress periodically
        if ((i + 1) % 10 === 0) {
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(institutions, null, 2));
            console.log(`  Saved progress.`);
        }
    }

    // Final save
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(institutions, null, 2));
    console.log(`Scraping complete. Data saved to ${OUTPUT_FILE}`);
}

// Handle fetch in Node < 18 or if global fetch is missing (though User has Node 20+ likely based on previous context, but ensuring compatibility)
// It seems `tsx` runs in an environment where fetch is available.

main().catch(console.error);
