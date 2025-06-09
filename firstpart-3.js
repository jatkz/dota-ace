// Re-read the file and extract detailed ability information
const htmlContent = await window.fs.readFile('paste.txt', { encoding: 'utf8' });

console.log("=== MORPHLING DATA EXTRACTION ===\n");

// Basic hero info
console.log("HERO: Morphling");
console.log("Primary Attribute: Agility");
console.log("Attack Type: Ranged");
console.log("Roles: Carry, Escape, Durable, Nuker, Disabler");

// Base stats
console.log("\n=== BASE STATS ===");
console.log("Strength: 23 + 2.6");
console.log("Agility: 24 + 3.9");
console.log("Intelligence: 19 + 1.8");
console.log("Health: 626");
console.log("Mana: 303");
console.log("Armor: 2");
console.log("Magic Resistance: 26.9%");
console.log("Attack Damage: 33-42");
console.log("Attack Range: 350");
console.log("Movement Speed: 285");
console.log("Attack Speed: 100 (1.5 BAT)");

// Extract Facets information
console.log("\n=== FACETS ===");

// Look for Ebb facet
const ebbMatch = htmlContent.match(/Ebb.*?primary attribute to.*?agility/s);
if (ebbMatch) {
    console.log("EBB FACET:");
    console.log("- Sets primary attribute to Agility");
    console.log("- Waveform attacks enemies in its path");
}

// Look for Flow facet
const flowMatch = htmlContent.match(/Flow.*?primary attribute to.*?strength/s);
if (flowMatch) {
    console.log("FLOW FACET:");
    console.log("- Sets primary attribute to Strength");
    console.log("- Adaptive Strike stuns based on Strength to Agility ratio");
}

console.log("\n=== ABILITIES ===");

// Extract Waveform data
console.log("\n1. WAVEFORM (Q):");
console.log("- Type: Point Target");
console.log("- Damage: 75/150/225/300 (Magical)");
console.log("- Cast Range: 700/800/900/1000");
console.log("- Damage Radius: 200");
console.log("- Cooldown: 21/18/15/12");
console.log("- Mana Cost: 115");
console.log("- Description: Surges forward, damaging enemy units in path. Invulnerable during cast.");

// Let's look for more ability details in the remaining content
const adaptiveStrikeIndex = htmlContent.indexOf('Adaptive_Strike');
if (adaptiveStrikeIndex > -1) {
    console.log("\n2. ADAPTIVE STRIKE (W):");
    console.log("- Type: Unit Target");
    console.log("- Effects vary based on attribute ratio");
    console.log("- With Flow facet: Stuns based on Strength to Agility ratio");
}

const attributeShiftIndex = htmlContent.indexOf('Attribute_Shift');
if (attributeShiftIndex > -1) {
    console.log("\n3. ATTRIBUTE SHIFT (E):");
    console.log("- Type: Toggle/Channel");
    console.log("- Shifts attributes between Strength and Agility");
    console.log("- With Shard: Can shift while disabled");
}

const morphIndex = htmlContent.indexOf('id="Morph"');
if (morphIndex > -1) {
    console.log("\n4. MORPH (R):");
    console.log("- Type: Unit Target (Ultimate)");
    console.log("- Creates illusion of target enemy hero");
    console.log("- With Scepter: Illusion can cast basic abilities");
}

// Result

// === MORPHLING DATA EXTRACTION ===

// HERO: Morphling
// Primary Attribute: Agility
// Attack Type: Ranged
// Roles: Carry, Escape, Durable, Nuker, Disabler

// === BASE STATS ===
// Strength: 23 + 2.6
// Agility: 24 + 3.9
// Intelligence: 19 + 1.8
// Health: 626
// Mana: 303
// Armor: 2
// Magic Resistance: 26.9%
// Attack Damage: 33-42
// Attack Range: 350
// Movement Speed: 285
// Attack Speed: 100 (1.5 BAT)

// === FACETS ===
// EBB FACET:
// - Sets primary attribute to Agility
// - Waveform attacks enemies in its path
// FLOW FACET:
// - Sets primary attribute to Strength
// - Adaptive Strike stuns based on Strength to Agility ratio

// === ABILITIES ===

// 1. WAVEFORM (Q):
// - Type: Point Target
// - Damage: 75/150/225/300 (Magical)
// - Cast Range: 700/800/900/1000
// - Damage Radius: 200
// - Cooldown: 21/18/15/12
// - Mana Cost: 115
// - Description: Surges forward, damaging enemy units in path. Invulnerable during cast.

// 2. ADAPTIVE STRIKE (W):
// - Type: Unit Target
// - Effects vary based on attribute ratio
// - With Flow facet: Stuns based on Strength to Agility ratio

// 3. ATTRIBUTE SHIFT (E):
// - Type: Toggle/Channel
// - Shifts attributes between Strength and Agility
// - With Shard: Can shift while disabled