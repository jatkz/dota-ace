import fs from 'fs';
import { OllamaClient } from '../OllamaClient.js';
import { extractHeroCoreData } from '../ollama-html-cleaner.js';
import { normalizeFile, normalizeFiles, processDirectory } from './normalize-conversion-outputs.js';

const DOTA2_HEROES = JSON.parse(fs.readFileSync('./scripts/outputs/heroes-list.json', 'utf8'));
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
    let heroes = allHeroes;

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
        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
        content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return content.trim();
}

function saveResults(results, conversionDir) {
    let successCount = 0;
    let errorCount = 0;

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
            fs.writeFileSync(outputPath, `${content}\n`);
            if (!SKIP_NORMALIZATION) {
                normalizeFile('hero', outputPath);
            }
            successCount++;
            console.log(`    ✅ Saved`);
        } catch (saveError) {
            console.error(`    ❌ Failed to save ${result.custom_id}:`, saveError.message);
            errorCount++;
        }
    }

    return { successCount, errorCount };
}

async function analyzeHeroCore(client, hero) {
    const filePath = `./scripts/outputs/hero/clean/${hero.urlName}.html`;
    const rawHtml = fs.readFileSync(filePath, 'utf8');
    const cleanedContent = extractHeroCoreData(rawHtml);
    const prompt = `Parse this hero core data into JSON:\n${cleanedContent}\n\nIMPORTANT: Return ONLY valid JSON, no extra text.`;

    console.log(`    → Sending hero core to Ollama (${cleanedContent.length} chars)...`);
    const text = await client.generate(prompt, client.system);
    console.log(`    → Received response (${text.length} chars)`);

    return text;
}

async function main() {
    try {
        const backend = (process.env.PARSER_BACKEND || 'claude').toLowerCase();
        const conversionDir = './scripts/outputs/hero/conversion-core';

        if (backend !== 'ollama') {
            throw new Error('heroes-convert-core-batch.js currently supports PARSER_BACKEND=ollama only');
        }

        console.log(`\n🎮 Dota 2 Hero Core Conversion`);
        console.log(`📊 Total heroes: ${DOTA2_HEROES.length}`);
        console.log(`🔧 Backend: ${backend}`);
        console.log(`🧪 Mode: ${NORMALIZE_ONLY ? 'normalize-only' : SKIP_NORMALIZATION ? 'convert-only (skip normalization)' : 'convert + normalize'}`);

        if (!fs.existsSync(conversionDir)) {
            fs.mkdirSync(conversionDir, { recursive: true });
        }

        const heroes = selectHeroes(DOTA2_HEROES);
        if (heroes.length === 0) {
            console.log('  No heroes matched the current selection.\n');
            return;
        }

        if (NORMALIZE_ONLY) {
            console.log(`⏳ Running normalization only...\n`);
            const selectedFiles = heroes
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

        const client = new OllamaClient({ temperature: 0.4 }, './claude-templates/parse-hero-core-ollama.txt');
        const chunkSize = Math.max(1, Math.min(HERO_CHUNK_SIZE || 10, heroes.length));
        const chunks = chunkArray(heroes, chunkSize);

        console.log(`⏳ Starting hero core conversion...\n`);
        console.log(`  Processing ${heroes.length} heroes...`);
        console.log(`  Offset: ${HERO_OFFSET}`);
        console.log(`  Limit: ${HERO_LIMIT ?? 'all remaining'}`);
        console.log(`  Chunk size: ${chunkSize}`);
        if (HERO_NAMES.length > 0) {
            console.log(`  Hero filter: ${HERO_NAMES.join(', ')}`);
        }
        console.log('');

        let totalSuccessCount = 0;
        let totalErrorCount = 0;

        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
            const chunk = chunks[chunkIndex];
            console.log(`  Chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} heroes)\n`);

            const results = [];

            for (let index = 0; index < chunk.length; index++) {
                const hero = chunk[index];
                const customId = getCustomId(hero);
                console.log(`  [${index + 1}/${chunk.length}] Processing ${customId}...`);

                try {
                    const output = await analyzeHeroCore(client, hero);
                    results.push({ custom_id: customId, output });
                } catch (error) {
                    console.error(`    ✗ Error processing ${customId}:`, error.message);
                    results.push({ custom_id: customId, output: '', error: error.message });
                }
            }

            const summary = saveResults(results, conversionDir);
            totalSuccessCount += summary.successCount;
            totalErrorCount += summary.errorCount;
            console.log('');
        }

        console.log(`✨ Hero core conversion complete!`);
        console.log(`   ✅ Successful: ${totalSuccessCount}`);
        console.log(`   ❌ Errors: ${totalErrorCount}\n`);
    } catch (error) {
        console.error('❌ Error during hero core conversion:', error.message);
        console.error(error);
    }
}

main();
