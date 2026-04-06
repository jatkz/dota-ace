import { createParserClient } from '../ParserClient.js';
import { normalizeFile, processDirectory } from './normalize-conversion-outputs.js';
import fs from 'fs';

const itemsListPath = './scripts/outputs/itemGridLinks.json';

const DOTA2_ITEMS = JSON.parse(fs.readFileSync(itemsListPath, 'utf8'));
const NORMALIZE_ONLY = process.env.NORMALIZE_ONLY === '1';
const SKIP_NORMALIZATION = process.env.SKIP_NORMALIZATION === '1';

const API_KEY = process.env.CLAUDE_API_KEY;

// Main execution
async function main() {
    try {
        const backend = process.env.PARSER_BACKEND || 'claude';
        const conversionDir = './scripts/outputs/item/conversion';

        console.log(`\n🎮 Dota 2 Item Conversion`);
        console.log(`📊 Total items: ${DOTA2_ITEMS.length}`);
        console.log(`🔧 Backend: ${backend}`);
        console.log(`🧪 Mode: ${NORMALIZE_ONLY ? 'normalize-only' : SKIP_NORMALIZATION ? 'convert-only (skip normalization)' : 'convert + normalize'}`);

        if (NORMALIZE_ONLY) {
            if (!fs.existsSync(conversionDir)) {
                throw new Error(`Conversion directory not found: ${conversionDir}`);
            }

            console.log(`⏳ Running normalization only...\n`);
            const summary = processDirectory('item', conversionDir);
            console.log(`\n✨ Normalization complete!`);
            console.log(`   ✅ Total: ${summary.total}`);
            console.log(`   ✏️ Changed: ${summary.changed}\n`);
            return;
        }

        console.log(`⏳ Starting conversion...\n`);

        const parser = createParserClient('./claude-templates/parse-item-page.txt');

        const items = DOTA2_ITEMS;
        const batchConfig = items.map(x => {
            const fileName = x.split('/').pop();
            const itemName = fileName.replace(/%27/g, '');

            return {
                custom_id: itemName,
                filePath: `./scripts/outputs/item/clean/${fileName}.html`
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
                        normalizeFile('item', outputPath);
                    }
                    successCount++;
                    
                    // Log progress every 10 items
                    if ((i + 1) % 10 === 0 || i === response.content.length - 1) {
                        console.log(`  ✅ ${i + 1}/${response.content.length} items converted`);
                    }
                } catch (saveError) {
                    console.error(`  ❌ Failed to save ${result.custom_id}:`, saveError.message);
                    errorCount++;
                }
            }

            console.log(`\n✨ Conversion complete!`);
            console.log(`   ✅ Successful: ${successCount}`);
            console.log(`   ❌ Errors: ${errorCount}\n`);
        }
    } catch (error) {
        console.error('❌ Error during conversion:', error.message);
        console.error(error);
    }
}

main();
