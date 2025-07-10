import fs from 'fs';
import * as cheerio from 'cheerio';

import { optimizeItemGridHtmlForParsing, optimizeNeutralSingleHtmlForParsingV2 } from './html-parser.js';

/**
 * attempt to fetch all items using the item grid page
 */

// Wrap everything in an async function
async function main() {
    try {
        // 1. Download HTML
        console.log('Fetching HTML from Liquipedia...');
        const response = await fetch('https://liquipedia.net/dota2/Item_Grid');
        
        // Check if the request was successful
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get the HTML text from the response
        const html = await response.text();
        console.log(`Downloaded ${html.length} characters`);
        fs.writeFileSync("./scripts/outputs/itemGrid_raw.html", html, 'utf8');
        
        // 2. Clean the HTML
        const cleanHtml = optimizeItemGridHtmlForParsing(html);
        console.log(`Cleaned HTML: ${cleanHtml.length} characters (${Math.round((1 - cleanHtml.length/html.length) * 100)}% reduction)`);
        
        // 3. Save to file
        const outputPath = "./scripts/outputs/itemGrid_test.html";
        fs.writeFileSync(outputPath, cleanHtml, 'utf8');
        
        console.log(`Successfully saved cleaned HTML to ${outputPath}`);

        // 4 extract the item links
        const itemLinks = extractListItemsWithLinks(cleanHtml);
        console.log('item links successfully extracted', itemLinks)
        
        fs.writeFileSync("./scripts/outputs/itemGridLinks.json", JSON.stringify(itemLinks, null, 4));

        for (const i of itemLinks) {
            const url = 'https://liquipedia.net' + i;
            const itemResponse = await fetch(url);
            const itemName = i.split('/').pop(); // 'dagon'

            if (!itemResponse.ok) {
                throw new Error(`HTTP error! status: ${itemResponse.status}`);
            }
            
            // Get the HTML text from the response
            const html = await itemResponse.text();
            console.log(`Downloaded ${html.length} characters - ${itemName}`);
            if (true) {
                const dir = './scripts/outputs/item/raw';
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                fs.writeFileSync(`./scripts/outputs/item/raw/${itemName}.html`, html, 'utf8');
            }
            
            // 2. Clean the HTML
            const cleanItemHtml = optimizeNeutralSingleHtmlForParsingV2(html);

            
            // 3. Save to file
            const outputPath = `./scripts/outputs/item/clean/${itemName}.html`;
            fs.writeFileSync(outputPath, cleanItemHtml, 'utf8');
        }
        
    } catch (error) {
        console.error('Error processing HTML:', error.message);
    }
}

function extractListItemsWithLinks(htmlString) {
  const $ = cheerio.load(htmlString);
  
  const hrefs = $('li a').map((index, element) => {
    return $(element).attr('href');
  }).get().filter(href => href != null);
  
  // Filter out undefined/null hrefs
  const itemGridStartingIndex = hrefs.findIndex(href => href === "/dota2/Town_Portal_Scroll");
  if (itemGridStartingIndex == -1) throw "messed up";

  return hrefs.slice(itemGridStartingIndex);
}

// Run the main function
main();