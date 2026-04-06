import { createParserClient } from '../ParserClient.js';
import { normalizeFile, normalizeFiles, processDirectory } from './normalize-conversion-outputs.js';
import fs from 'fs';

const DOTA2_HEROES = JSON.parse(fs.readFileSync('./scripts/outputs/heroes-list.json', 'utf8'));
const FORCE_ALL_HEROES = process.env.FORCE_ALL_HEROES === '1';
const NORMALIZE_ONLY = process.env.NORMALIZE_ONLY === '1';
const SKIP_NORMALIZATION = process.env.SKIP_NORMALIZATION === '1';
const HERO_OFFSET = parseOptionalPositiveInt(process.env.HERO_OFFSET) ?? 0;
const HERO_LIMIT = parseOptionalPositiveInt(process.env.HERO_LIMIT);
const HERO_CHUNK_SIZE = parseOptionalPositiveInt(process.env.HERO_CHUNK_SIZE);
const HERO_NAMES = String(process.env.HERO_NAMES || '')
    .split(',')
    .map(name => name.trim())
    .filter(Boolean);

function parseOptionalPositiveInt(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeHeroSelector(value = '') {
    return String(value || '')
        .toLowerCase()
        .replace(/[\s_'()-]+/g, '');
}

function getCustomId(hero) {
    return hero.urlName.replace(/'/g, '');
}

function selectHeroes(allHeroes) {
    let heroes = FORCE_ALL_HEROES
        ? allHeroes
        : allHeroes.filter(hero => hero.runConversion);

    if (HERO_NAMES.length > 0) {
        const requested = new Set(HERO_NAMES.map(normalizeHeroSelector));
        heroes = heroes.filter(hero => (
            requested.has(normalizeHeroSelector(hero.urlName)) ||
            requested.has(normalizeHeroSelector(hero.displayName))
        ));
    }

    const start = Math.min(HERO_OFFSET, heroes.length);
    const end = HERO_LIMIT !== null ? Math.min(start + HERO_LIMIT, heroes.length) : heroes.length;
    return heroes.slice(start, end);
}

function chunkArray(values, chunkSize) {
    if (chunkSize <= 0 || values.length <= chunkSize) {
        return [values];
    }

    const chunks = [];
    for (let index = 0; index < values.length; index += chunkSize) {
        chunks.push(values.slice(index, index + chunkSize));
    }
    return chunks;
}

function cleanParserOutput(output = '') {
    let content = String(output || '');

    if (content.startsWith('```json')) {
        content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (content.startsWith('```')) {
        content = content.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    return content.trim();
}

function saveResults(results, conversionDir) {
    let successCount = 0;
    let errorCount = 0;
    const savedIds = [];

    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const outputPath = `${conversionDir}/${result.custom_id}.json`;

        console.log(`  [${i + 1}/${results.length}] Saving ${result.custom_id}...`);

        if (result.error) {
            console.error(`    ❌ Parser error: ${result.error}`);
            errorCount++;
            continue;
        }

        const content = cleanParserOutput(result.output);
        if (!content) {
            console.error(`    ❌ Empty output, skipped`);
            errorCount++;
            continue;
        }

        try {
            fs.writeFileSync(outputPath, content);
            if (!SKIP_NORMALIZATION) {
                normalizeFile('hero', outputPath);
            }
            successCount++;
            savedIds.push(result.custom_id);
            console.log(`    ✅ Saved`);
        } catch (saveError) {
            console.error(`    ❌ Failed to save ${result.custom_id}:`, saveError.message);
            errorCount++;
        }
    }

    return { successCount, errorCount, savedIds };
}

// Main execution
async function main() {
    try {
        const backend = process.env.PARSER_BACKEND || 'claude';
        const conversionDir = './scripts/outputs/hero/conversion';
        console.log(`\n🎮 Dota 2 Heroes Conversion`);
        console.log(`📊 Total heroes: ${DOTA2_HEROES.length}`);
        console.log(`🔧 Backend: ${backend}`);
        console.log(`🧪 Mode: ${NORMALIZE_ONLY ? 'normalize-only' : SKIP_NORMALIZATION ? 'convert-only (skip normalization)' : 'convert + normalize'}`);

        if (NORMALIZE_ONLY) {
            if (!fs.existsSync(conversionDir)) {
                throw new Error(`Conversion directory not found: ${conversionDir}`);
            }

            const selectedHeroes = HERO_NAMES.length > 0 || HERO_LIMIT !== null || HERO_OFFSET > 0
                ? selectHeroes(DOTA2_HEROES.map(hero => ({ ...hero, runConversion: true })))
                : DOTA2_HEROES;

            console.log(`⏳ Running normalization only...\n`);
            const selectedFiles = selectedHeroes
                .map(hero => `${conversionDir}/${getCustomId(hero)}.json`)
                .filter(filePath => fs.existsSync(filePath));

            const summary = selectedFiles.length > 0 && selectedFiles.length !== DOTA2_HEROES.length
                ? normalizeFiles('hero', selectedFiles)
                : processDirectory('hero', conversionDir);

            console.log(`\n✨ Normalization complete!`);
            console.log(`   ✅ Total: ${summary.total}`);
            console.log(`   ✏️ Changed: ${summary.changed}\n`);
            return;
        }

        console.log(`⏳ Starting conversion...\n`);

        const parser = createParserClient('./claude-templates/parse-hero-page.txt');
        const heroes = selectHeroes(DOTA2_HEROES);
        if (heroes.length === 0) {
            console.log('  No heroes matched the current selection.\n');
            return;
        }

        const defaultChunkSize = backend.toLowerCase() === 'ollama' ? 10 : heroes.length;
        const chunkSize = Math.max(1, Math.min(HERO_CHUNK_SIZE || defaultChunkSize, heroes.length));
        const chunks = chunkArray(heroes, chunkSize);
        const heroLabel = FORCE_ALL_HEROES ? 'forced selection' : 'selected heroes';

        console.log(`  Processing ${heroes.length} heroes (${heroLabel})...`);
        console.log(`  Offset: ${HERO_OFFSET}`);
        console.log(`  Limit: ${HERO_LIMIT ?? 'all remaining'}`);
        console.log(`  Chunk size: ${chunkSize}`);
        if (HERO_NAMES.length > 0) {
            console.log(`  Hero filter: ${HERO_NAMES.join(', ')}`);
        }
        console.log('');

        if (!fs.existsSync(conversionDir)) {
            fs.mkdirSync(conversionDir, { recursive: true });
        }

        let totalSuccessCount = 0;
        let totalErrorCount = 0;
        const savedIds = new Set();

        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
            const chunk = chunks[chunkIndex];
            console.log(`  Chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} heroes)\n`);

            const batchConfig = chunk.map(hero => ({
                custom_id: getCustomId(hero),
                filePath: `./scripts/outputs/hero/clean/${hero.urlName}.html`
            }));

            const response = await parser.batchAnalyzeFile(batchConfig);
            if (!response.success || !response.content) {
                console.error(`    ❌ Chunk failed to return content`);
                totalErrorCount += chunk.length;
                continue;
            }

            const summary = saveResults(response.content, conversionDir);
            totalSuccessCount += summary.successCount;
            totalErrorCount += summary.errorCount;
            for (const savedId of summary.savedIds) {
                savedIds.add(savedId);
            }
            console.log('');
        }

        console.log(`✨ Conversion complete!`);
        console.log(`   ✅ Successful: ${totalSuccessCount}`);
        console.log(`   ❌ Errors: ${totalErrorCount}\n`);

        if (!FORCE_ALL_HEROES && savedIds.size > 0) {
            for (const hero of heroes) {
                if (!savedIds.has(getCustomId(hero))) {
                    continue;
                }

                const index = DOTA2_HEROES.findIndex(x => x.displayName === hero.displayName);
                if (index >= 0) {
                    DOTA2_HEROES[index].runConversion = false;
                }
            }

            fs.writeFileSync('./scripts/outputs/heroes-list.json', JSON.stringify(DOTA2_HEROES, null, 4));
        }
        
    } catch (error) {
        console.error('❌ Error during conversion:', error.message);
        console.error(error);
    }
}

main();
