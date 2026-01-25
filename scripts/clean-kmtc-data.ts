
import fs from 'fs';
import path from 'path';

const INPUT_FILE = path.join(process.cwd(), 'scripts/data/kmtc_parsed_complete.json');
const OUTPUT_FILE = path.join(process.cwd(), 'scripts/data/kmtc_final_cleaned.json');

interface Requirement {
    subject: string;
    grade: string;
}

interface ParsedProgram {
    id: string;
    name: string;
    url: string;
    category_group: string;
    min_mean_grade?: string;
    subject_requirements?: Requirement[];
    requirements?: Requirement[];
    campuses: any[];
    raw_requirements_text?: string;
}

interface CleanedProgram {
    id: string;
    name: string;
    url: string;
    category_group: string;
    min_mean_grade: string;
    requirements: Requirement[];
    campuses: any[];
}

function refineSubject(raw: string): string {
    let s = raw.trim();
    // Fix spacing around slashes
    s = s.replace(/\s*\/\s*/g, '/');

    const parts = s.split('/');
    if (parts.length > 1) {
        // Join with " OR "
        return parts.join(' OR ');
    } else {
        return s;
    }
}

function main() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error("Input file not found");
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8')) as ParsedProgram[];

    const cleanedData: CleanedProgram[] = rawData.map(p => {
        const reqs = (p.subject_requirements || p.requirements || []).map(r => ({
            subject: refineSubject(r.subject),
            grade: r.grade.trim()
        }));

        return {
            id: p.id,
            name: p.name.trim(),
            url: p.url,
            category_group: p.category_group,
            min_mean_grade: (p.min_mean_grade || '').replace(/\(.*\)/, '').trim(),
            requirements: reqs,
            campuses: p.campuses
        };
    });

    console.log(`Cleaned ${cleanedData.length} programs.`);

    const noReqs = cleanedData.filter(p => p.requirements.length === 0);
    if (noReqs.length > 0) {
        console.warn(`Warning: ${noReqs.length} programs have no requirements.`);
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cleanedData, null, 2));
    console.log(`Saved to ${OUTPUT_FILE}`);
}

main();
