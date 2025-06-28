import fs from 'fs';

import { optimizeHtmlForParsing, optimizeNeutralSingleHtmlForParsingV2 } from './html-parser.js';

// Wrap everything in an async function
async function main() {
    try {
        // 1. Download HTML
        console.log('Fetching HTML from Liquipedia...');
        const response = await fetch('https://liquipedia.net/dota2/Kaya_and_Sange');
        
        // Check if the request was successful
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get the HTML text from the response
        const html = await response.text();
        console.log(`Downloaded ${html.length} characters`);
        fs.writeFileSync("./scripts/outputs/single_raw.html", html, 'utf8');
        
        // 2. Clean the HTML
        const cleanHtml = optimizeNeutralSingleHtmlForParsingV2(html);
        console.log(`Cleaned HTML: ${cleanHtml.length} characters (${Math.round((1 - cleanHtml.length/html.length) * 100)}% reduction)`);
        
        // 3. Save to file
        const outputPath = "./scripts/outputs/single_test.html";
        fs.writeFileSync(outputPath, cleanHtml, 'utf8');
        
        console.log(`Successfully saved cleaned HTML to ${outputPath}`);
        
    } catch (error) {
        console.error('Error processing HTML:', error.message);
    }
}

// Run the main function
main();