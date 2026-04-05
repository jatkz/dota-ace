import { createParserClient } from '../ParserClient.js';
import fs from 'fs';

const itemsListPath = './scripts/outputs/itemGridLinks.json';

const DOTA2_ITEMS = JSON.parse(fs.readFileSync(itemsListPath, 'utf8'));

const API_KEY = process.env.CLAUDE_API_KEY;

// Main execution
async function main() {
    console.log('🤖 Claude API Starter Examples\n');
    
    try {
        const parser = createParserClient('./claude-templates/parse-item-page.txt');

        console.log('Total items ', DOTA2_ITEMS.length);

        const items = DOTA2_ITEMS.slice(70, 71);
        // const items = DOTA2_ITEMS.filter(x => x.includes('Kaya_and_Sange'));
        console.log('items to handle....', items);
        const batchConfig = items.map(x => {
            const fileName = x.split('/').pop();
            const itemName = fileName.replace(/%27/g, '');

            return {
                custom_id: itemName,
                filePath: `./scripts/outputs/item/clean/${fileName}.html`
            }
        })

        const response = await parser.batchAnalyzeFile(batchConfig);
        
        console.log(response);

        // Save results for Ollama backend
        if (process.env.PARSER_BACKEND === 'ollama' && response.success && response.content) {
            const conversionDir = './scripts/outputs/item/conversion';
            if (!fs.existsSync(conversionDir)) {
                fs.mkdirSync(conversionDir, { recursive: true });
            }

            for (const result of response.content) {
                const outputPath = `${conversionDir}/${result.custom_id}.json`;
                try {
                    // The Ollama response should already be clean JSON
                    fs.writeFileSync(outputPath, result.output);
                    console.log(`✅ Saved ${result.custom_id} to ${outputPath}`);
                } catch (saveError) {
                    console.error(`❌ Failed to save ${result.custom_id}:`, saveError.message);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error running examples:', error.message);
        console.error(error);
    }
}

main();