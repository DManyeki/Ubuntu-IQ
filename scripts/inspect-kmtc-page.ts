
import fs from 'fs';
import path from 'path';

// Ignore SSL errors
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const URL = 'https://students.kuccps.net/programmes/kmtcdetail/5538/';
const OUTPUT_FILE = path.join(process.cwd(), 'scripts/data/kmtc_detail_page.html');

async function main() {
    console.log(`Fetching ${URL}...`);
    try {
        const response = await fetch(URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        console.log(`Fetched ${html.length} bytes.`);

        if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
            fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
        }

        fs.writeFileSync(OUTPUT_FILE, html);
        console.log(`Saved HTML to ${OUTPUT_FILE}`);

        // Peek at content
        if (html.includes('table') || html.includes('card') || html.includes('program')) {
            console.log('Found potential content keywords (table/card/program).');
        } else {
            console.log('Referenced content keywords NOT found. Might be dynamic.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
