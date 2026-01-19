import * as fs from 'fs';
import * as path from 'path';

async function main() {
    const aliasPath = path.join('scripts', 'data', 'institution_aliases.json');
    const profilePath = path.join('scripts', 'data', 'complete_profiles.json');
    const outPath = path.join('scripts', 'data', 'aliases_grouped.json');

    const rawAliases = JSON.parse(fs.readFileSync(aliasPath, 'utf-8'));
    const profiles = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));

    // Group Aliases by Name (Case Insensitive Map)
    const map: Record<string, string[]> = {};

    if (Array.isArray(rawAliases)) {
        rawAliases.forEach((item: any) => {
            const n = String(item.name).toLowerCase().trim();
            const alias = item.alias;
            if (!map[n]) map[n] = [];
            if (!map[n].includes(alias)) map[n].push(alias);
        });
    } else {
        // Fallback if object
        Object.entries(rawAliases).forEach(([alias, name]) => {
            const n = String(name).toLowerCase().trim();
            if (!map[n]) map[n] = [];
            if (!map[n].includes(alias)) map[n].push(alias);
        });
    }

    // Map to IDs
    const finalUpdate: any[] = [];

    profiles.forEach((p: any) => {
        const pName = p.name.toLowerCase().trim();
        const aliases = map[pName] || [];
        if (aliases.length > 0) {
            finalUpdate.push({
                id: p.id,
                name: p.name,
                aliases: aliases
            });
        }
    });

    fs.writeFileSync(outPath, JSON.stringify(finalUpdate, null, 2));
    console.log(`Grouped aliases for ${finalUpdate.length} institutions.`);
    if (finalUpdate.length > 0) console.log("Example:", finalUpdate[0]);
}

main();
