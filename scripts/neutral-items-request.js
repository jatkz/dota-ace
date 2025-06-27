import fs from 'fs';
import * as cheerio from 'cheerio';

import { optimizeItemGridHtmlForParsing, optimizeItemSingleHtmlForParsing } from './html-parser.js';

// Wrap everything in an async function
async function main() {
    try {
        // 1. Download HTML
        console.log('Fetching HTML from Liquipedia...');
        const response = await fetch('https://liquipedia.net/dota2/Neutral_Items');

        // Check if the request was successful
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Get the HTML text from the response
        const html = await response.text();
        console.log(`Downloaded ${html.length} characters`);
        fs.writeFileSync("./scripts/outputs/neutral-item-grid_raw.html", html, 'utf8');

        // 2. Clean the HTML
        const cleanHtml = optimizeItemGridHtmlForParsing(html);
        console.log(`Cleaned HTML: ${cleanHtml.length} characters (${Math.round((1 - cleanHtml.length / html.length) * 100)}% reduction)`);

        // 3. Save to file
        const outputPath = "./scripts/outputs/neutral-item-grid_test.html";
        fs.writeFileSync(outputPath, cleanHtml, 'utf8');

        console.log(`Successfully saved cleaned HTML to ${outputPath}`);

        // 4 extract the item links
        const itemLinks = extractActiveLinks(cleanHtml);
        console.log('item links successfully extracted', itemLinks)

        fs.writeFileSync("./scripts/outputs/neutral-item-gridLinks.json", JSON.stringify(itemLinks, null, 4));

        for (const i of itemLinks.activeArtifacts) {
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
                const dir = './scripts/outputs/neutrals/raw';
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                fs.writeFileSync(`./scripts/outputs/neutrals/raw/${itemName}.html`, html, 'utf8');
            }

            // 2. Clean the HTML
            const cleanItemHtml = optimizeNeutralSingleHtmlForParsing(html);

            // 3. Save to file
            const outputPath = `./scripts/outputs/neutrals/clean/${itemName}.html`;
            fs.writeFileSync(outputPath, cleanItemHtml, 'utf8');
        }

        for (const i of itemLinks.activeEnchantments) {
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
                const dir = './scripts/outputs/enchantments/raw';
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                fs.writeFileSync(`./scripts/outputs/enchantments/raw/${itemName}.html`, html, 'utf8');
            }

            // 2. Clean the HTML
            const cleanItemHtml = optimizeNeutralSingleHtmlForParsing(html);

            // 3. Save to file
            const outputPath = `./scripts/outputs/enchantments/clean/${itemName}.html`;
            fs.writeFileSync(outputPath, cleanItemHtml, 'utf8');
        }

    } catch (error) {
        console.error('Error processing HTML:', error.message);
    }
}

function extractActiveLinks(html) {
    const $ = cheerio.load(html);
    const results = {
        activeArtifacts: [],
        activeEnchantments: []
    };

    // Find Active_Artifacts section
    const activeArtifactsHeader = $('#Active_Artifacts');
    if (activeArtifactsHeader.length) {
        // Get all content between Active_Artifacts and Active_Enchantments
        let currentElement = activeArtifactsHeader.parent();

        while (currentElement.length && !currentElement.find('#Active_Enchantments').length) {
            currentElement = currentElement.next();

            // Stop if we hit Active_Enchantments
            if (currentElement.find('#Active_Enchantments').length) {
                break;
            }

            // Extract hrefs from this section
            currentElement.find('a[href]').each((i, el) => {
                const href = $(el).attr('href');
                if (href && href.startsWith('/dota2/') && !href.includes('action=edit')) {
                    results.activeArtifacts.push(href);
                }
            });
        }
    }

    // Find Active_Enchantments section
    const activeEnchantsHeader = $('#Active_Enchantments');
    if (activeEnchantsHeader.length) {
        // Get all content between Active_Enchantments and the next major section (Madstone)
        let currentElement = activeEnchantsHeader.parent();

        while (currentElement.length && !currentElement.find('#Madstone').length) {
            currentElement = currentElement.next();

            // Stop if we hit Madstone section
            if (currentElement.find('#Madstone').length) {
                break;
            }

            // Extract hrefs from this section
            currentElement.find('a[href]').each((i, el) => {
                const href = $(el).attr('href');
                if (href && href.startsWith('/dota2/') && !href.includes('action=edit')) {
                    results.activeEnchantments.push(href);
                }
            });
        }
    }

    return {
        activeArtifacts: [...new Set(results.activeArtifacts)],
        activeEnchantments: [...new Set(results.activeEnchantments)]
    };
}

function optimizeNeutralSingleHtmlForParsing(html) {
    const $ = cheerio.load(html);

    // Remove unwanted elements more aggressively
    $('script').remove();
    $('noscript').remove();
    $('footer').remove();
    $('style').remove();
    $('nav').remove();
    $('link').remove();
    $('meta').remove();

    // Remove attributes
    $('*').each(function () {
        $(this).removeAttr('style class src href srcset width height decoding alt title rel type');
    });

    // Find the Recent Changes heading first (since it comes before potential Trivia)
    const recentChangesHeading = $('h2').filter((i, el) => {
        const text = $(el).text().toLowerCase();
        return text.includes('recent changes');
    });

    if (recentChangesHeading.length > 0) {
        // Remove everything after Recent Changes
        let current = recentChangesHeading;
        while (current.length > 0) {
            const next = current.next();
            current.remove();
            current = next;
        }
    }

    // Find the Trivia heading (in case it comes before Recent Changes)
    const triviaHeading = $('h2').filter((i, el) => {
        const text = $(el).text().toLowerCase();
        return text.includes('trivia');
    });

    if (triviaHeading.length > 0) {
        let current = triviaHeading;
        while (current.length > 0) {
            const next = current.next();
            current.remove();
            current = next;
        }
    }

    return $.html();
}

// Run the main function
main();