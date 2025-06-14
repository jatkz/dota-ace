import fs from 'fs';
import { optimizeHtmlForParsing } from './html-parser.js';

const DOTA2_HEROES = JSON.parse(fs.readFileSync('heroes-list.json', 'utf8'));

// Simple array for URL generation
const DOTA2_HERO_URL_NAMES = DOTA2_HEROES.map(hero => hero.urlName);

// Wrap everything in an async function
async function main() {
    try {
        for (const heroName of DOTA2_HERO_URL_NAMES) {
            // 1. Download HTML
            console.log('Fetching HTML from Liquipedia...');
            const response = await fetch(`https://liquipedia.net/dota2/${heroName}`);
            
            // Check if the request was successful
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Get the HTML text from the response
            const html = await response.text();
            console.log(`Downloaded ${html.length} characters`);
            
            // 2. Clean the HTML
            const cleanHtml = optimizeHtmlForParsing(html);
            console.log(`Cleaned HTML: ${cleanHtml.length} characters (${Math.round((1 - cleanHtml.length/html.length) * 100)}% reduction)`);
            
            const dir = './scripts/outputs/hero/clean';
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            // 3. Save to file
            const outputPath = `./scripts/outputs/hero/clean/${heroName}.html`;
            fs.writeFileSync(outputPath, cleanHtml, 'utf8');
            
            console.log(`Successfully saved cleaned HTML to ${outputPath}`);
        }
        
    } catch (error) {
        console.error('Error processing HTML:', error.message);
    }
}

// Run the main function
main();