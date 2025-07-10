import fs from 'fs';
import clipboardy from 'clipboardy';

// Wrap everything in an async function
async function main() {
    try {
        const heroState = JSON.parse(fs.readFileSync("./scripts/outputs/finalHeroState.json", 'utf8'));
        
        const output = heroState['heroState']['hero']
        
        console.log(`sections ${Object.keys(heroState)}`);
        console.log(`hero section:`);
        console.log(output);

        await clipboardy.write(JSON.stringify(output));

        console.log('copied to clipboard!');
        
    } catch (error) {
        console.error('Error processing HTML:', error.message);
    }
}

// Run the main function
main();