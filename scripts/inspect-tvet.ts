
import fs from 'fs';
import path from 'path';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const MAIN_URL = "https://www.tveta.go.ke/accredited-tvet-institutions/";
const DETAIL_URL = "https://www.tveta.go.ke/institution-details/?details=TVETA/PUBLIC/NP/0008/2025";

const DATA_DIR = path.join(process.cwd(), 'scripts/data');

async function main() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    console.log("Fetching Main Page...");
    try {
        const resMain = await fetch(MAIN_URL);
        const textMain = await resMain.text();
        fs.writeFileSync(path.join(DATA_DIR, 'tvet_main_page.html'), textMain);
        console.log("Saved tvet_main_page.html");
    } catch (e) {
        console.error("Main Page Fetch Error:", e);
    }

    console.log("Fetching Detail Page...");
    try {
        const resDetail = await fetch(DETAIL_URL);
        const textDetail = await resDetail.text();
        fs.writeFileSync(path.join(DATA_DIR, 'tvet_detail_page.html'), textDetail);
        console.log("Saved tvet_detail_page.html");
    } catch (e) {
        console.error("Detail Page Fetch Error:", e);
    }
}

main();
