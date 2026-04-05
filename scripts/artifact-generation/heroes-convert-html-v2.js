import { createParserClient } from '../ParserClient.js';
import fs from 'fs';

const DOTA2_HEROES = JSON.parse(fs.readFileSync('./scripts/outputs/heroes-list.json', 'utf8'));

// Main execution
async function main() {
    console.log('🤖 Claude API Starter Examples\n');
    
    try {
        const parser = createParserClient('./claude-templates/parse-hero-page.txt');

        const heroes = DOTA2_HEROES.filter(x => x.runConversion).slice(0,12);
        console.log('heroes to handle....', heroes);
        const batchConfig = heroes.map(x => {
            return {
                custom_id: x.urlName.replace("'", ""),
                filePath: `./scripts/outputs/hero/clean/${x.urlName}.html`
            }
        })

        const response = await parser.batchAnalyzeFile(batchConfig);

        console.log('~~~~');
        console.log(response);
        console.log('~~~~');

        // Save results for Ollama backend
        if (process.env.PARSER_BACKEND === 'ollama' && response.success && response.content) {
            const conversionDir = './scripts/outputs/hero/conversion';
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

        for (const hero of heroes) {
            console.log('modifying... ', hero);

            const index = DOTA2_HEROES.findIndex(x => x.displayName == hero.displayName);
            DOTA2_HEROES[index].runConversion = false;
        }

        fs.writeFileSync('./scripts/outputs/heroes-list.json', JSON.stringify(DOTA2_HEROES, null, 4));
        
    } catch (error) {
        console.error('❌ Error running examples:', error.message);
        console.error(error);
    }
}

main();