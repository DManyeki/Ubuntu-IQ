
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// data dir is sibling to this script? no, this script is in scripts/
// so data is scripts/data
const MAIN_PAGE_PATH = path.join(__dirname, 'data', 'tvet_main_page.html');

console.log("START DEBUG JS");
if (!fs.existsSync(MAIN_PAGE_PATH)) {
    console.error("File not found:", MAIN_PAGE_PATH);
} else {
    // console.log("File exists, size:", fs.statSync(MAIN_PAGE_PATH).size);
    try {
        const html = fs.readFileSync(MAIN_PAGE_PATH, 'utf-8');
        console.log("File read, length:", html.length);
        const $ = cheerio.load(html);
        const rows = $('#registered-table tbody tr');
        console.log("Rows found:", rows.length);
    } catch (e) {
        console.error("Error:", e);
    }
}
console.log("END DEBUG JS");
