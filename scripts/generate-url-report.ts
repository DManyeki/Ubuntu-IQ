/**
 * Generate a Markdown report from the URL analysis
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'proposed_url_updates.json'), 'utf-8'));

let md = `# 🌐 TVET URL Analysis Report\n\n`;
md += `> **Generated:** ${new Date().toISOString().split('T')[0]}\n`;
md += `> **Total Proposed Updates:** ${data.updates.length + data.corrections.length}\n\n`;

md += `## 🛠️ Proposed Corrections (${data.corrections.length})\n\n`;
md += `These entries have an existing website in the DB that appears incorrect or generic, and we found a better match.\n\n`;
md += `| Institution | Current DB URL | Proposed URL | Reason |\n`;
md += `|-------------|----------------|--------------|--------|\n`;

data.corrections.forEach((item: any) => {
    md += `| ${item.institution} | ${item.db_url} | ${item.found_url} | ${item.reason} |\n`;
});

md += `\n## 🚀 New Website Discoveries (${data.updates.length})\n\n`;
md += `These institutions presumably have no website in the DB, but we found a likely candidate.\n\n`;
md += `| Institution | Found URL | Confidence |\n`;
md += `|-------------|-----------|------------|\n`;

// Limit to top 100 for readability in report, full list in JSON
data.updates.slice(0, 100).forEach((item: any) => {
    md += `| ${item.institution} | ${item.found_url} | ${item.confidence} |\n`;
});

if (data.updates.length > 100) {
    md += `| ... and ${data.updates.length - 100} more | | |\n`;
}

fs.writeFileSync(path.join(__dirname, 'data', 'url_analysis_report.md'), md);
console.log('Report saved to: scripts/data/url_analysis_report.md');
