
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data', 'tvet_db_export.json');
const reportPath = path.join(__dirname, 'data', 'existing_url_review.md');

if (!fs.existsSync(dbPath) || !fs.existsSync(reportPath)) {
    console.error("❌ Required files not found.");
    process.exit(1);
}

const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
const reportContent = fs.readFileSync(reportPath, 'utf-8');

const lines = reportContent.split('\n');
const newLines: string[] = [];

// Regex to parse a markdown table row
// Captures: | Index | Name | DB URL (raw) | Found URL | ...
const rowRegex = /^\|\s*\d+\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|/;

let removedCount = 0;
let keptCount = 0;

// Variables to buffer lines for each section
let currentSectionHeader: string | null = null;
let currentSectionIntro: string[] = []; // Store non-table lines (annotations/actions)
let currentSectionTableHeaders: string[] = []; // Stores lines like "| # | Name |..." and "|---|---|..."
let currentSectionKeptRows: string[] = []; // Stores only the data rows that are kept for the current section

// Helper function to process and append a section to newLines
const processAndAppendSection = () => {
    if (currentSectionHeader !== null) {
        newLines.push(currentSectionHeader);

        // Append intro lines (preserving Action/Notes)
        if (currentSectionIntro.length > 0) {
            newLines.push(...currentSectionIntro);
        }

        // Check if this is Section 1 or 2 (Verified/Done)
        const isVerifiedSection = currentSectionHeader.startsWith('## 1.') || currentSectionHeader.startsWith('## 2.');

        if (isVerifiedSection) {
            // For Verified sections, we hide the rows to reduce noise, but the Intro (Action) remains.
            // We add a small placeholder to indicate rows are hidden.
            newLines.push("_Rows hidden (Verified/Updated). See Manual Changes report for details._");
            newLines.push("");
        } else {
            // For Sections 3, 4, 5 (Mismatches), we show the kept rows
            if (currentSectionKeptRows.length === 0) {
                newLines.push("_All items in this section have been verified or updated._");
                newLines.push("");
            } else {
                newLines.push(...currentSectionTableHeaders);
                newLines.push(...currentSectionKeptRows);
            }
        }
        newLines.push(""); // Ensure a blank line after each section
    }
    // Reset for the next section
    currentSectionHeader = null;
    currentSectionIntro = [];
    currentSectionTableHeaders = [];
    currentSectionKeptRows = [];
};


for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Header Lines (Section Titles)
    if (line.match(/^## \d+\./)) {
        // If we've collected lines for a previous section, process it now
        processAndAppendSection();

        // Start a new section
        currentSectionHeader = line;
        continue;
    }

    const match = line.match(rowRegex);
    if (match) {
        const name = match[1].trim();
        let dbUrlRaw = match[2].trim();
        const foundUrl = match[3].trim();

        // Robust URL extraction: Find the part that starts with http/https
        const urlMatch = dbUrlRaw.match(/(https?:\/\/[^\s]+)/);
        let dbUrlStart = urlMatch ? urlMatch[1] : dbUrlRaw.replace(/^[🔴🟢]\s*/, '').trim();

        // Normalize: Remove trailing slashes for comparison
        const normalize = (u: string) => u.replace(/\/$/, '');
        dbUrlStart = normalize(dbUrlStart);

        const dbItem = dbData.find((d: any) => d.name === name);

        if (dbItem) {
            let currentDbUrl = dbItem.website || '';
            currentDbUrl = normalize(currentDbUrl);

            // Check if DB URL matches what was in the report (Unchanged)
            const isUnchanged = (currentDbUrl === dbUrlStart);

            if (!isUnchanged) {
                // The DB URL has changed since the report (e.g. Swapped Dead->Found or Manual Update).
                // Remove it.
                if (removedCount < 5) {
                    console.log(`[DEBUG] Removing Resolved Item: ${name}`);
                    console.log(`   Report DB: "${dbUrlStart}"`);
                    console.log(`   Current DB: "${currentDbUrl}"`);
                }
                removedCount++;
                continue;
            }

            // Item is unchanged (still corresponds to the issue in the report). KEEP IT.


            // If it is unchanged, but it IS an exact match (Section 1), do we keep it?
            // The file is "Existing URL Review".
            // If I keep them, the user sees 100s of "Verified" lines.
            // If I remove them, the user sees only Problematic lines?
            // User said: "update... to exclude institutions that have already been updated"
            // "Updated" usually means changed. 100% matches were not changed.
            // However, previous context implies we want a "todo" list.
            // Let's stick to removing CHANGES. If Section 1 remains, it is a list of "Good" links.

            keptCount++;
            currentSectionKeptRows.push(line);
        } else {
            // Item not found in DB? Keep just in case.
            currentSectionKeptRows.push(line);
        }
    } else {
        // Not a row (headers, spacers, text)
        if (currentSectionHeader !== null) {
            if (line.trim().startsWith('|')) {
                // This is a table header line (e.g., "| # | Name | ...") or separator "|---|---|..."
                currentSectionTableHeaders.push(line);
            } else {
                // Capture intro/action text within the current section
                currentSectionIntro.push(line);
            }
        } else {
            // Outside section (e.g. title of doc, initial blank lines)
            newLines.push(line);
        }
    }
}

// Process the last section after the loop finishes
processAndAppendSection();

fs.writeFileSync(reportPath, newLines.join('\n'));
console.log(`✅ Cleaned report. Removed ${removedCount} resolved items. Kept ${keptCount} pending items.`);
