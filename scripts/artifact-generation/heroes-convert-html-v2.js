import { ClaudeMessageBatchClient } from '../ClaudeBatchClient.js';
import fs from 'fs';

const DOTA2_HEROES = JSON.parse(fs.readFileSync('./scripts/outputs/heroes-list.json', 'utf8'));

const API_KEY = process.env.CLAUDE_API_KEY;

// Main execution
async function main() {
    console.log('🤖 Claude API Starter Examples\n');
    
    try {
        const claude = new ClaudeMessageBatchClient(API_KEY, './claude-templates/parse-hero-page.txt');

        const heroes = DOTA2_HEROES.filter(x => x.runConversion).slice(0,12);
        console.log('heroes to handle....', heroes);
        const batchConfig = heroes.map(x => {
            return {
                custom_id: x.urlName.replace("'", ""),
                filePath: `./scripts/outputs/hero/clean/${x.urlName}.html`
            }
        })

        const response = await claude.batchAnalyzeFile(batchConfig);

        console.log('~~~~');
        console.log(response);
        console.log('~~~~');

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