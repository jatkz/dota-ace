import fs from 'fs';
import cheerio from 'cheerio';

/**
 * Extract clean, structured text from Dota 2 item HTML
 * @param {string} html - The HTML content
 * @returns {string} - Clean text with just the essential item information
 */
function extractItemData(html) {
    const $ = cheerio.load(html);
    let extracted = '';

    // Get item name
    const title = $('h1.firstHeading').text().trim();
    if (title) {
        extracted += `ITEM NAME: ${title}\n\n`;
    }

    // Get item description/flavor text
    const description = $('td[style*="font-style:italic"]').text().trim();
    if (description) {
        extracted += `DESCRIPTION: ${description}\n\n`;
    }

    // Extract item stats table (look for table with cost/sell value)
    const allTables = $('table');
    let statsTable = null;

    allTables.each((i, table) => {
        const tableText = $(table).text();
        if (tableText.includes('Cost') || tableText.includes('Sell Value') || tableText.includes('2500')) {
            statsTable = $(table);
            return false; // break
        }
    });

    if (statsTable) {
        extracted += 'ITEM STATS:\n';

        statsTable.find('tr').each((i, row) => {
            const cells = $(row).find('td, th');
            if (cells.length >= 2) {
                const label = $(cells[0]).text().trim();
                const value = $(cells[1]).text().trim();
                if (label && value && label !== '' && value !== '') {
                    extracted += `${label}: ${value}\n`;
                }
            }
        });
        extracted += '\n';
    }

    // Extract abilities (look for sections with ability-like content)
    const abilitiesSection = $('h2:contains("Abilities"), h3:contains("Abilities")').first();
    if (abilitiesSection.length > 0) {
        extracted += 'ABILITIES:\n';

        // Get content after the abilities header
        let current = abilitiesSection.next();
        let abilityCount = 0;

        while (current.length > 0 && abilityCount < 10) {
            const tagName = current.prop('tagName')?.toLowerCase();

            if (tagName === 'h2' || tagName === 'h3') {
                break; // Stop at next section
            }

            if (tagName === 'div' || tagName === 'table') {
                const text = current.text().trim();
                if (text && text.length > 20 && !text.includes('[edit]')) {
                    extracted += `${text}\n\n`;
                    abilityCount++;
                }
            }

            current = current.next();
        }
    }

    // Extract any additional info sections
    const infoSections = $('h2, h3').filter((i, el) => {
        const text = $(el).text().toLowerCase();
        return text.includes('additional') || text.includes('notes') || text.includes('mechanics');
    });

    if (infoSections.length > 0) {
        extracted += 'ADDITIONAL INFO:\n';
        infoSections.each((i, header) => {
            let content = $(header).nextUntil('h2, h3');
            content.each((j, el) => {
                const text = $(el).text().trim();
                if (text) {
                    extracted += `${text}\n`;
                }
            });
        });
    }

    return extracted;
}

/**
 * Enhanced HTML cleaning that extracts structured data for Ollama
 * Works for items, heroes, neutral items, and enchantments
 * @param {string} html - The HTML content
 * @returns {string} - Clean structured text
 */
function optimizeHtmlForOllama(html) {
    try {
        const extracted = extractItemData(html);

        // If extraction worked, return it
        if (extracted && extracted.length > 100) {
            return extracted;
        }

        // Fallback to basic cleaning
        return html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/g, '')
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/g, '')
            .replace(/style="[^"]*"/g, '')
            .replace(/class="[^"]*"/g, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    } catch (error) {
        console.error('Error extracting item data:', error);
        return html; // Return original if extraction fails
    }
}

export { optimizeHtmlForOllama };