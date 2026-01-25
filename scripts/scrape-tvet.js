
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const MAIN_PAGE_PATH = path.join(DATA_DIR, 'tvet_main_page.html');
const OUTPUT_FILE = path.join(DATA_DIR, 'tvet_data.json');

// DISABLE SSL VERIFICATION GLOBALLY FOR FETCH
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// CONFIG
const MAX_CONCURRENT = 10;
const LIMIT = -1; // Set to -1 for all
const DELAY_MS = 100;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchDetailPage(url) {
    try {
        // console.log(`Fetching: ${url}`);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            console.error(`HTTP Error: ${response.status} ${response.statusText}`);
            return null;
        }
        return await response.text();
    } catch (error) {
        console.error(`Fetch Error: ${error.message}`);
        return null;
    }
}

async function processInstitution(inst, index, total) {
    console.log(`[${index + 1}/${total}] Fetching details: ${inst.name}`);
    const detailHtml = await fetchDetailPage(inst.detail_url);

    if (detailHtml) {
        const $ = cheerio.load(detailHtml);
        const courseRows = $('#coursesTable tbody tr');

        const courses = [];
        courseRows.each((_, row) => {
            const cols = $(row).find('td');
            if (cols.length >= 4) {
                courses.push({
                    name: $(cols[1]).text().trim(),
                    level: $(cols[2]).text().trim(),
                    exam_body: $(cols[3]).text().trim()
                });
            }
        });

        inst.courses = courses;
        // console.log(`  -> ${courses.length} courses`);
    } else {
        console.warn(`  [${index + 1}] Failed to fetch details`);
    }
    return inst;
}


async function main() {
    if (!fs.existsSync(MAIN_PAGE_PATH)) {
        console.error(`Main page HTML not found at ${MAIN_PAGE_PATH}`);
        return;
    }

    console.log("Parsing main page...");
    const html = fs.readFileSync(MAIN_PAGE_PATH, 'utf-8');
    const $ = cheerio.load(html);

    const rows = $('#registered-table tbody tr');
    console.log(`Found ${rows.length} rows in table.`);

    let institutions = [];

    for (let i = 0; i < rows.length; i++) {
        if (LIMIT !== -1 && institutions.length >= LIMIT) break;

        const row = rows[i];
        const cells = $(row).find('td');

        if (cells.length < 9) continue;

        const name = $(cells[1]).text().trim();
        const regNo = $(cells[2]).text().trim();
        const category = $(cells[3]).text().trim();
        const ownership = $(cells[4]).text().trim(); // Type -> Ownership
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
                detail_url: detailLink
            });
        }
    }

    console.log(`Processing ${institutions.length} institutions in batches of ${MAX_CONCURRENT}...`);

    // Process in batches
    for (let i = 0; i < institutions.length; i += MAX_CONCURRENT) {
        const batch = institutions.slice(i, i + MAX_CONCURRENT);
        const promises = batch.map((inst, batchIdx) => processInstitution(inst, i + batchIdx, institutions.length));

        await Promise.all(promises);

        if (i + MAX_CONCURRENT < institutions.length) {
            await sleep(DELAY_MS);
        }

        // Save intermediate
        if ((i % 50) === 0) {
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(institutions, null, 2));
        }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(institutions, null, 2));
    console.log(`Done. Saved to ${OUTPUT_FILE}`);
}

main().catch(console.error);
