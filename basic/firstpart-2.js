// Let's extract more specific data that matches our Dota 2 schema

// Extract health, mana, armor info
const healthMatch = htmlContent.match(/626/); // Found in the stats section
const manaMatch = htmlContent.match(/303/);
const armorMatch = htmlContent.match(/>\s*2\s*</); // Looking for armor value

console.log("Basic Stats:");
console.log("- Health: 626");
console.log("- Mana: 303");
console.log("- Armor: ~2");

// Extract movement speed
const moveSpeedMatch = htmlContent.match(/285.*?Move Speed/);
console.log("- Movement Speed: 285");

// Let's extract attack damage
const attackDamageMatch = htmlContent.match(/33 ‒ 42/);
console.log("- Attack Damage: 33-42");

// Look for attack range
const attackRangeMatch = htmlContent.match(/350.*?Attack Range/);
console.log("- Attack Range: 350 (Ranged)");

// Extract primary attribute - looking for the highlighted attribute
const primaryAttrMatch = htmlContent.match(/primaryAttribute.*?Agility/);
console.log("- Primary Attribute: Agility");

// Let's find ability details
console.log("\n=== ABILITIES ===");

// Waveform details
const waveformSection = htmlContent.substring(
    htmlContent.indexOf('id="Waveform"'),
    htmlContent.indexOf('id="Adaptive_Strike"')
);

if (waveformSection.length > 0) {
    console.log("\nWAVEFORM:");
    
    // Extract damage values
    const waveformDamage = waveformSection.match(/Damage.*?75\/150\/225\/300/);
    if (waveformDamage) {
        console.log("- Damage: 75/150/225/300");
    }
    
    // Extract cooldown
    const waveformCooldown = waveformSection.match(/21\/18\/15\/12/);
    if (waveformCooldown) {
        console.log("- Cooldown: 21/18/15/12");
    }
    
    // Extract mana cost
    const waveformMana = waveformSection.match(/115/);
    if (waveformMana) {
        console.log("- Mana Cost: 115");
    }
    
    // Extract cast range
    const waveformRange = waveformSection.match(/700\/800\/900\/1000/);
    if (waveformRange) {
        console.log("- Cast Range: 700/800/900/1000");
    }
}
