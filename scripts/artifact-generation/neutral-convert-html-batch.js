import { createParserClient } from '../ParserClient.js';
import fs from 'fs';

const itemsListPath = './scripts/outputs/neutral-item-gridLinks.json';

const DOTA2_ITEMS = JSON.parse(fs.readFileSync(itemsListPath, 'utf8'));

const API_KEY = process.env.CLAUDE_API_KEY;

// Main execution
async function main() {
    console.log('🤖 Claude API Starter Examples\n');
    
    try {
        const parser = createParserClient('./claude-templates/parse-neutral-page.txt');

        console.log('Total items ', DOTA2_ITEMS.length);

        const items = DOTA2_ITEMS.activeArtifacts.slice(0, 119);
        console.log('items to handle....', items);
        const batchConfig = items.map(x => {
            const fileName = x.split('/').pop();
            const itemName = fileName.replace(/%27/g, '');

            return {
                custom_id: itemName,
                filePath: `./scripts/outputs/neutral/clean/${fileName}.html`
            }
        })

        const response = await parser.batchAnalyzeFile(batchConfig);
        
        console.log(response);

        // Save results for Ollama backend
        if (process.env.PARSER_BACKEND === 'ollama' && response.success && response.content) {
            const conversionDir = './scripts/outputs/neutral/conversion';
            if (!fs.existsSync(conversionDir)) {
                fs.mkdirSync(conversionDir, { recursive: true });
            }

            for (const result of response.content) {
                const outputPath = `${conversionDir}/${result.custom_id}.json`;
                try {
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