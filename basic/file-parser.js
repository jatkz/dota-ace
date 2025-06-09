const fs = require('fs');
const path = require('path');

// Function to count characters in HTML file
function parse(filename, tagsToRemove = [], outputPath = null) {
    try {
        // Read the HTML file
        const filePath = path.join(__dirname, filename);
        const htmlContent = fs.readFileSync(filePath, 'utf8');
        
        // Remove specified tags if provided
        let modifiedContent = htmlContent;
        if (tagsToRemove.length > 0) {
            tagsToRemove.forEach(tag => {
                // Remove both self-closing and paired tags
                const pairedTagRegex = new RegExp(`<${tag}(\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`, 'gi');
                const selfClosingRegex = new RegExp(`<${tag}(\\s[^>]*)?\\s*\\/?>`, 'gi');
                
                modifiedContent = modifiedContent.replace(pairedTagRegex, '');
                modifiedContent = modifiedContent.replace(selfClosingRegex, '');
            });
            
            console.log(`\nRemoved tags: ${tagsToRemove.join(', ')}`);
            console.log(`Original size: ${htmlContent.length} chars`);
            console.log(`Modified size: ${modifiedContent.length} chars`);
            console.log(`Removed: ${htmlContent.length - modifiedContent.length} chars\n`);
        }
        
        // Count total characters (using modified content if tags were removed)
        const totalChars = htmlContent.length;
        
        // Count characters by common HTML tags
        const tagCounts = {};
        const commonTags = ['div', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'header', 'footer', 'nav', 'section', 'article', 'aside', 'main', 'script'];
        
        commonTags.forEach(tag => {
            // Match opening tags (with or without attributes)
            const regex = new RegExp(`<${tag}(\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`, 'gi');
            const matches = htmlContent.match(regex) || [];
            
            if (matches.length > 0) {
                // Count total characters within these tags (including the tags themselves)
                const totalTagChars = matches.reduce((sum, match) => sum + match.length, 0);
                tagCounts[tag] = {
                    count: matches.length,
                    totalChars: totalTagChars,
                    avgChars: Math.round(totalTagChars / matches.length)
                };
            }
        });
        
        // Count characters excluding whitespace
        const charsNoWhitespace = htmlContent.replace(/\s/g, '').length;
        
        // Count visible text characters (strip HTML tags and whitespace)
        const textOnly = htmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        const cleanHtml = optimizeHtmlForParsing(htmlContent)
        const visibleChars = textOnly.length;
        
        // Display results
        console.log(`File: ${filename}`);
        console.log(`Total characters: ${totalChars}`);
        console.log(`Characters (no whitespace): ${charsNoWhitespace}`);
        console.log(`Visible text characters: ${visibleChars}`);
        console.log(`Modified total: ${modifiedContent.length}`);
        console.log(`Clean HTML algo: ${cleanHtml.length}`);
        console.log('\nCharacter counts by tag:');
        
        Object.entries(tagCounts)
            .sort((a, b) => b[1].totalChars - a[1].totalChars)
            .forEach(([tag, stats]) => {
                console.log(`  ${tag}: ${stats.count} tags, ${stats.totalChars} chars total, ${stats.avgChars} avg chars per tag`);
            });

        fs.writeFileSync(outputPath, cleanHtml, 'utf8');
        
        return {
            total: totalChars,
            noWhitespace: charsNoWhitespace,
            visibleText: visibleChars,
            modifiedTotal: modifiedContent.length,
            tagCounts: tagCounts
        };
        
    } catch (error) {
        console.error(`Error reading file: ${error.message}`);
        return null;
    }
}

function optimizeHtmlForParsing(html) {
    return html
        // Remove styling (36% reduction)
        .replace(/style="[^"]*"/g, '')
        .replace(/class="[^"]*"/g, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/g, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
        
        // Remove presentation attributes (44% reduction)
        .replace(/src="[^"]*"/g, '')
        .replace(/href="[^"]*"/g, '')
        .replace(/srcset="[^"]*"/g, '')
        .replace(/width="[^"]*"/g, '')
        .replace(/height="[^"]*"/g, '')
        .replace(/decoding="[^"]*"/g, '')
        .replace(/alt="[^"]*"/g, '')
        .replace(/title="[^"]*"/g, '')
        .replace(/rel="[^"]*"/g, '')
        .replace(/type="[^"]*"/g, '')
        
        // Optional: Remove whitespace (0.3% additional)
        .replace(/>\s+</g, '><')
        .replace(/\s+/g, ' ')
        .trim();
}

// Run the function
parse('morphling.html', ['script'], 'morphling_clean.html');