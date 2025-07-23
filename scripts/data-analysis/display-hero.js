import fs from 'fs';


function displayHero(heroData) {
    const hero = heroData.hero;
    const general = hero.general;
    
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log(`║                              ${hero.name}                                    `);
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    
    // Movement Stats
    console.log('║ MOVEMENT STATS                                                               ');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    console.log(`║ Movement Speed: ${general.move_speed.toString().padEnd(10)} │ Turn Rate: ${general.turn_rate.toString().padEnd(25)} `);
    console.log('║                                                                              ');
    
    // Upgrades Section
    console.log('║ UPGRADES                                                                     ');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    
    // Aghanim's Scepter
    console.log('║ 🌟 AGHANIM\'S SCEPTER                                                         ');
    hero.upgrades.aghanim_scepter.effects.forEach((effect, index) => {
        const lines = wrapText(effect, 70);
        lines.forEach((line, lineIndex) => {
            const prefix = (index === 0 && lineIndex === 0) ? '║   • ' : '║     ';
            console.log(`${prefix}${line.padEnd(70 - (prefix.length - 2))} `);
        });
    });
    console.log('║                                                                              ');
    
    // Aghanim's Shard
    console.log('║ 💎 AGHANIM\'S SHARD                                                           ');
    hero.upgrades.aghanim_shard.effects.forEach((effect, index) => {
        const lines = wrapText(effect, 70);
        lines.forEach((line, lineIndex) => {
            const prefix = (index === 0 && lineIndex === 0) ? '║   • ' : '║     ';
            console.log(`${prefix}${line.padEnd(70 - (prefix.length - 2))} `);
        });
    });
    console.log('║                                                                              ');
    
    // Talents
    console.log('║ 🎯 TALENTS                                                                   ');
    const talents = hero.upgrades.talents;
    Object.keys(talents).reverse().forEach(level => {
        const levelNum = level.replace('level_', '');
        console.log(`║   Level ${levelNum}:                                                           `);
        talents[level].forEach(talent => {
            console.log(`║     • ${talent.padEnd(64)} `);
        });
    });
    console.log('║                                                                              ║');
    
    // Innate Abilities
    console.log('║ INNATE ABILITIES                                                             ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    
    hero.innate.abilities.forEach((ability, index) => {
        console.log(`║ 🔮 ${ability.name.toUpperCase()} (${ability.type.toUpperCase()})${' '.repeat(Math.max(0, 50 - ability.name.length - ability.type.length))} `);
        
        // Description
        const descLines = wrapText(ability.description, 70);
        descLines.forEach(line => {
            console.log(`║   ${line.padEnd(73)} `);
        });
        
        // Values
        if (ability.values) {
            console.log('║   Values:                                                                    ');
            Object.entries(ability.values).forEach(([key, value]) => {
                const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const valueStr = typeof value === 'string' ? value : value.toString();
                console.log(`║     ${formattedKey}: ${valueStr.padEnd(Math.max(0, 60 - formattedKey.length))} `);
            });
        }
        
        // Details
        if (ability.details) {
            console.log('║   Details:                                                                   ');
            const detailLines = wrapText(ability.details, 68);
            detailLines.forEach(line => {
                console.log(`║     ${line.padEnd(71)} `);
            });
        }
        
        if (index < hero.innate.abilities.length - 1) {
            console.log('║                                                                              ');
        }
    });
    console.log('║                                                                              ║');
    
    // Regular Abilities
    console.log('║ ABILITIES                                                                    ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    
    Object.entries(hero.abilities).forEach(([abilityKey, ability], index) => {
        const keyDisplay = ability.key ? `[${ability.key}]` : '';
        console.log(`║ ⚡ ${ability.name.toUpperCase()} ${keyDisplay}${' '.repeat(Math.max(0, 60 - ability.name.length - keyDisplay.length))} `);
        
        // Basic info
        console.log(`║   Type: ${ability.type} | Affects: ${ability.affects} | Damage: ${ability.damage || 'None'}     `);
        console.log(`║   Cooldown: ${ability.cooldown} | Mana: ${ability.mana_cost} | Range: ${ability.cast_range}        `);
        console.log('║                                                                              ');
        
        // Description
        const descLines = wrapText(ability.description, 70);
        descLines.forEach(line => {
            console.log(`║   ${line.padEnd(73)} `);
        });
        console.log('║                                                                              ');
        
        // Details
        const detailLines = wrapText(ability.details, 70);
        detailLines.forEach(line => {
            console.log(`║   ${line.padEnd(73)} `);
        });
        
        // Facet Effects
        if (ability.facet_effects) {
            console.log('║   Effects:                                                                   ');
            Object.entries(ability.facet_effects).forEach(([key, value]) => {
                const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const valueStr = typeof value === 'string' ? value : value.toString();
                console.log(`║     ${formattedKey}: ${valueStr.padEnd(Math.max(0, 60 - formattedKey.length))} `);
            });
        }
        
        // Upgrade info
        const upgrades = [];
        if (ability.scepter_upgradable) upgrades.push('Scepter');
        if (ability.shard_upgradable) upgrades.push('Shard');
        if (upgrades.length > 0) {
            console.log(`║   Upgradable with: ${upgrades.join(', ').padEnd(54)} `);
        }
        
        if (index < Object.keys(hero.abilities).length - 1) {
            console.log('║                                                                              ║');
            console.log('╠──────────────────────────────────────────────────────────────────────────╣');
            console.log('║                                                                              ║');
        }
    });
    
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
}

// Helper function to wrap text to specified width
function wrapText(text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    words.forEach(word => {
        if ((currentLine + word).length > maxWidth) {
            if (currentLine) {
                lines.push(currentLine.trim());
                currentLine = word + ' ';
            } else {
                lines.push(word);
            }
        } else {
            currentLine += word + ' ';
        }
    });
    
    if (currentLine) {
        lines.push(currentLine.trim());
    }
    
    return lines;
}

let heroData = JSON.parse(fs.readFileSync('./scripts/outputs/finalHeroState.json', 'utf-8'));

// Call the function
displayHero(heroData.heroState);