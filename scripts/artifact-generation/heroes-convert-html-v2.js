import { createParserClient } from '../ParserClient.js';
import { normalizeFile, processDirectory } from './normalize-conversion-outputs.js';
import fs from 'fs';

const DOTA2_HEROES = JSON.parse(fs.readFileSync('./scripts/outputs/heroes-list.json', 'utf8'));
const FORCE_ALL_HEROES = process.env.FORCE_ALL_HEROES === '1';
const NORMALIZE_ONLY = process.env.NORMALIZE_ONLY === '1';
const SKIP_NORMALIZATION = process.env.SKIP_NORMALIZATION === '1';

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

            console.log(`⏳ Running normalization only...\n`);
            const summary = processDirectory('hero', conversionDir);
            console.log(`\n✨ Normalization complete!`);
            console.log(`   ✅ Total: ${summary.total}`);
            console.log(`   ✏️ Changed: ${summary.changed}\n`);
            return;
        }

        console.log(`⏳ Starting conversion...\n`);

        const parser = createParserClient('./claude-templates/parse-hero-page.txt');

        const heroes = FORCE_ALL_HEROES
            ? DOTA2_HEROES
            : DOTA2_HEROES.filter(x => x.runConversion);
        console.log(`  Processing ${heroes.length} heroes${FORCE_ALL_HEROES ? ' (forced full rerun)' : ' marked for conversion'}...\n`);
        
        const batchConfig = heroes.map(x => {
            return {
                custom_id: x.urlName.replace("'", ""),
                filePath: `./scripts/outputs/hero/clean/${x.urlName}.html`
            }
        })

        const response = await parser.batchAnalyzeFile(batchConfig);

        // Save results
        if (response.success && response.content) {
            if (!fs.existsSync(conversionDir)) {
                fs.mkdirSync(conversionDir, { recursive: true });
            }

            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < response.content.length; i++) {
                const result = response.content[i];
                const outputPath = `${conversionDir}/${result.custom_id}.json`;
                
                console.log(`  [${i + 1}/${response.content.length}] Saving ${result.custom_id}...`);
                try {
                    // Clean up markdown code blocks if present
                    let content = result.output;
                    if (content.startsWith('```json')) {
                        content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
                    } else if (content.startsWith('```')) {
                        content = content.replace(/^```\n/, '').replace(/\n```$/, '');
                    }
                    
                    fs.writeFileSync(outputPath, content);
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

            console.log(`\n✨ Conversion complete!`);
            console.log(`   ✅ Successful: ${successCount}`);
            console.log(`   ❌ Errors: ${errorCount}\n`);

            if (!FORCE_ALL_HEROES) {
                // Mark heroes as converted
                for (const hero of heroes) {
                    const index = DOTA2_HEROES.findIndex(x => x.displayName == hero.displayName);
                    DOTA2_HEROES[index].runConversion = false;
                }

                fs.writeFileSync('./scripts/outputs/heroes-list.json', JSON.stringify(DOTA2_HEROES, null, 4));
            }
        }
        
    } catch (error) {
        console.error('❌ Error during conversion:', error.message);
        console.error(error);
    }
}

main();
