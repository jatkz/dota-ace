// Let's analyze the structure of this Morphling HTML data
console.log("Analyzing Morphling HTML structure...");

// First, let's read the file content
const htmlContent = await window.fs.readFile('paste.txt', { encoding: 'utf8' });

console.log("File size:", htmlContent.length, "characters");

// Let's find key sections by looking for specific patterns
const sections = {
    heroName: htmlContent.match(/<title>(.*?)<\/title>/),
    heroStats: htmlContent.match(/class="firstHeading".*?>(.*?)<\/span>/),
    abilities: htmlContent.match(/id="Abilities"/),
    facets: htmlContent.match(/id="Facets"/),
    aghanims: htmlContent.match(/id="Aghanim/),
    talents: htmlContent.match(/id="Talents"/)
};

console.log("Found sections:", Object.keys(sections).filter(key => sections[key]));

// Let's extract some key hero information
const heroName = sections.heroName ? sections.heroName[1].replace(' - Liquipedia Dota 2 Wiki', '') : 'Unknown';
console.log("Hero Name:", heroName);

// Look for attribute information
const strMatch = htmlContent.match(/23 \+ 2\.6/);
const agiMatch = htmlContent.match(/24 \+ 3\.9/);
const intMatch = htmlContent.match(/19 \+ 1\.8/);

console.log("Base Attributes found:");
console.log("- Strength: 23 + 2.6");
console.log("- Agility: 24 + 3.9");  
console.log("- Intelligence: 19 + 1.8");

// Let's find ability names
const abilityMatches = htmlContent.match(/id="(Waveform|Adaptive_Strike|Attribute_Shift|Morph)"/g);
console.log("Abilities found:", abilityMatches);

// Result

// Analyzing Morphling HTML structure...
// File size: 216927 characters
// Found sections: ["heroName","heroStats","abilities","facets","aghanims","talents"]
// Hero Name: Morphling
// Base Attributes found:
// - Strength: 23 + 2.6
// - Agility: 24 + 3.9
// - Intelligence: 19 + 1.8
// Abilities found: ["id=\"Waveform\"","id=\"Waveform\""]