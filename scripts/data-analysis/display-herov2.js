function displayQueenOfPain(heroData) {
    const hero = heroData.hero;
    const general = hero.general;
    
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                              QUEEN OF PAIN                                   ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    
    // Movement Stats
    console.log('║ MOVEMENT STATS                                                               ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    console.log(`║ Movement Speed: ${general.move_speed.toString().padEnd(10)} │ Turn Rate: ${general.turn_rate.toString().padEnd(25)} ║`);
    console.log('║                                                                              ║');
    
    // Upgrades Section
    console.log('║ UPGRADES                                                                     ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    
    // Aghanim's Scepter
    console.log('║ 🌟 AGHANIM\'S SCEPTER                                                         ║');
    hero.upgrades.aghanim_scepter.effects.forEach((effect, index) => {
        const lines = wrapText(effect, 70);
        lines.forEach((line, lineIndex) => {
            const prefix = (index === 0 && lineIndex === 0) ? '║   • ' : '║     ';
            console.log(`${prefix}${line.padEnd(70 - (prefix.length - 2))} ║`);
        });
    });
    console.log('║                                                                              ║');
    
    // Aghanim's Shard
    console.log('║ 💎 AGHANIM\'S SHARD                                                           ║');
    hero.upgrades.aghanim_shard.effects.forEach((effect, index) => {
        const lines = wrapText(effect, 70);
        lines.forEach((line, lineIndex) => {
            const prefix = (index === 0 && lineIndex === 0) ? '║   • ' : '║     ';
            console.log(`${prefix}${line.padEnd(70 - (prefix.length - 2))} ║`);
        });
    });
    console.log('║                                                                              ║');
    
    // Talents
    console.log('║ 🎯 TALENTS                                                                   ║');
    const talents = hero.upgrades.talents;
    Object.keys(talents).reverse().forEach(level => {
        const levelNum = level.replace('level_', '');
        console.log(`║   Level ${levelNum}:                                                           ║`);
        talents[level].forEach(talent => {
            console.log(`║     • ${talent.padEnd(64)} ║`);
        });
    });
    console.log('║                                                                              ║');
    
    // Innate Abilities
    console.log('║ INNATE ABILITIES                                                             ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    
    hero.innate.abilities.forEach((ability, index) => {
        console.log(`║ 🔮 ${ability.name.toUpperCase()} (${ability.type.toUpperCase()})${' '.repeat(Math.max(0, 50 - ability.name.length - ability.type.length))} ║`);
        
        // Description
        const descLines = wrapText(ability.description, 70);
        descLines.forEach(line => {
            console.log(`║   ${line.padEnd(73)} ║`);
        });
        
        // Values
        if (ability.values) {
            console.log('║   Values:                                                                    ║');
            Object.entries(ability.values).forEach(([key, value]) => {
                const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const valueStr = typeof value === 'string' ? value : value.toString();
                console.log(`║     ${formattedKey}: ${valueStr.padEnd(Math.max(0, 60 - formattedKey.length))} ║`);
            });
        }
        
        // Details
        if (ability.details) {
            console.log('║   Details:                                                                   ║');
            const detailLines = wrapText(ability.details, 68);
            detailLines.forEach(line => {
                console.log(`║     ${line.padEnd(71)} ║`);
            });
        }
        
        if (index < hero.innate.abilities.length - 1) {
            console.log('║                                                                              ║');
        }
    });
    console.log('║                                                                              ║');
    
    // Regular Abilities (2-column layout)
    console.log('║ ABILITIES                                                                    ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    
    const abilities = Object.entries(hero.abilities);
    
    // Display abilities in pairs (2 columns)
    for (let i = 0; i < abilities.length; i += 2) {
        const leftAbility = abilities[i][1];
        const rightAbility = abilities[i + 1] ? abilities[i + 1][1] : null;
        
        displayAbilitiesTwoColumn(leftAbility, rightAbility);
        
        if (i + 2 < abilities.length) {
            console.log('║                                                                              ║');
            console.log('╠──────────────────────────────────────────────────────────────────────────╣');
            console.log('║                                                                              ║');
        }
    }
    
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
}

// Helper function to display abilities in two columns
function displayAbilitiesTwoColumn(leftAbility, rightAbility) {
    const colWidth = 65; // Width for each column
    
    // Function to format ability data for column display
    function formatAbilityColumn(ability) {
        if (!ability) return Array(20).fill(''); // Return empty lines if no ability
        
        const lines = [];
        const keyDisplay = ability.key ? `[${ability.key}]` : '';
        
        // Title
        lines.push(`⚡ ${ability.name.toUpperCase()} ${keyDisplay}`.substring(0, colWidth));
        
        // Basic info - split into multiple lines for column width
        lines.push(`Type: ${ability.type}`.substring(0, colWidth));
        lines.push(`Affects: ${ability.affects}`.substring(0, colWidth));
        lines.push(`Damage: ${ability.damage || 'None'}`.substring(0, colWidth));
        lines.push(`CD: ${ability.cooldown}`.substring(0, colWidth));
        lines.push(`Mana: ${ability.mana_cost}`.substring(0, colWidth));
        lines.push(`Range: ${ability.cast_range}`.substring(0, colWidth));
        lines.push(`Animation: ${ability.cast_animation}`.substring(0, colWidth));
        lines.push(`Radius: ${ability.cast_radius}`.substring(0, colWidth));

        lines.push(`Pierce Spell Immunity: ${ability.pierces_spell_immunity}`.substring(0, colWidth));
        lines.push(`Blocked Root: ${ability.blocked_by_root}`.substring(0, colWidth));
        lines.push(`Dispellable: ${ability.dispellable}`.substring(0, colWidth));

        lines.push('');
                
        // Details
        const detailLines = wrapText(ability.details, colWidth - 2);
        detailLines.forEach(line => {
            lines.push(line);
        });
        lines.push('');
        
        // Facet Effects
        if (ability.facet_effects) {
            lines.push('Effects:');
            Object.entries(ability.facet_effects).forEach(([key, value]) => {
                const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const valueStr = typeof value === 'string' ? value : value.toString();
                const effectLine = `  ${formattedKey}: ${valueStr}`;
                const effectLines = wrapText(effectLine, colWidth - 2);
                effectLines.forEach(line => lines.push(line));
            });
            lines.push('');
        }

        if (ability.technical_details) {
            lines.push('Details:');
            ability.technical_details.forEach((value) => {
                const effectLines = wrapText(value, colWidth - 2);
                effectLines.forEach(line => lines.push(line));
            });
            lines.push('');
        }

        if (ability.interaction_notes) {
            lines.push('Notes:');
            Object.entries(ability.interaction_notes).forEach(([key, value]) => {
                const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const valueStr = typeof value === 'string' ? value : value.toString();
                const effectLine = `  ${formattedKey}: ${valueStr}`;
                const effectLines = wrapText(effectLine, colWidth - 2);
                effectLines.forEach(line => lines.push(line));
            });
            lines.push('');
        }
        
        // Upgrade info
        const upgrades = [];
        if (ability.scepter_upgradable) upgrades.push('Scepter');
        if (ability.shard_upgradable) upgrades.push('Shard');
        if (upgrades.length > 0) {
            lines.push(`Upgradable: ${upgrades.join(', ')}`);
        }
        
        return lines;
    }
    
    const leftLines = formatAbilityColumn(leftAbility);
    const rightLines = formatAbilityColumn(rightAbility);
    
    // Determine max lines needed
    const maxLines = Math.max(leftLines.length, rightLines.length);
    
    // Display both columns side by side
    for (let i = 0; i < maxLines; i++) {
        const leftLine = (leftLines[i] || '').padEnd(colWidth);
        const rightLine = (rightLines[i] || '').padEnd(colWidth);
        console.log(`║ ${leftLine} │ ${rightLine} ║`);
    }
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

import fs from 'fs';
let heroData = JSON.parse(fs.readFileSync('./scripts/outputs/finalHeroState.json', 'utf-8'));

// Call the function
displayQueenOfPain(heroData.heroState);