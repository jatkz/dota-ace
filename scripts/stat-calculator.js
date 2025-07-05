import fs, { stat } from 'fs';
import path from 'path';
import {
    getHeroState
} from './output-hero-state.js'


function calculateHeroStats(heroState, level) {
    // Validate level input (1-30)
    if (level < 1 || level > 30) {
        throw new Error('Hero level must be between 1 and 30');
    }
    const hero = heroState.hero;
    const general = hero.general;

    const items = heroState.items;
    const neutral = heroState.neutral;
    const enchantment = heroState.enchantment;

    // console.log(enchantment)
    
    // Calculate base attributes at given level
    const stats = {strength:0, agility:0, intelligence:0, attack_speed: 0,
        attack_damage: 0,
    };
    stats['strength'] = general.strength + (general.strength_gain * (level - 1));
    stats['agility'] = general.agility + (general.agility_gain * (level - 1));
    stats['intelligence'] = general.intelligence + (general.intelligence_gain * (level - 1));
    stats['attack_speed'] = general.attack_speed;
    stats['attack_damage'] = general.damage_avg;

    for (const i of items) {
        stats['strength'] = stats['strength'] + (i?.bonus?.strength || 0);
        stats['agility'] = stats['agility'] + (i?.bonus?.agility || 0);
        stats['intelligence'] = stats['intelligence'] + (i?.bonus?.intelligence || 0);
        stats['attack_speed'] = stats['attack_speed'] + (i?.bonus?.attackSpeed || 0);
        stats['attack_damage'] = stats['attack_damage'] + (i?.bonus?.attackDamage || 0);
    }

    stats['strength'] += (enchantment?.stats?.strength || 0);
    stats['agility'] += (enchantment?.stats?.agility || 0);
    stats['intelligence'] += (enchantment?.stats?.intelligence || 0);
    stats['attack_speed'] += (enchantment?.stats?.attack_speed || 0);
    stats['attack_damage'] += (enchantment?.stats?.attack_damage || 0);
    if (general.primary_attribute == 'universal') {
        stats.attack_damage += (stats.strength + stats.agility + stats.intelligence) * .45;
    } else {
        stats.attack_damage += stats[general.primary_attribute];
    }

    const attackSpeedSum = (stats.attack_speed + stats.agility)
    stats['attack_speed'] = attackSpeedSum;
    const attackRate = (attackSpeedSum) / (general.attack_speed * general.bat);
    const attacksPS = 1/attackRate;
    const dps = attackRate * stats.attack_damage;
    // Calculate other derived stats
    // const health = general.health + (strength * 22); // Each strength point gives 22 HP
    // const mana = general.mana + (intelligence * 12); // Each intelligence point gives 12 mana
    // const armor = general.armor + (agility / 6); // Each 6 agility points give 1 armor
    
    return {
        level: level,
        stats: stats,
        attackRate,
        attacksPS,
        dps
    };
}

function calculateAutoAtkDps(input, levelStart, levelEnd) {

    const heroState = getHeroState(input);

    const levelRange = 1 + levelEnd - levelStart;

    const arr = Array.from({length: levelRange}, (_, i) => levelStart + i);

    const dataArr = [];
    for (const l of arr) {
        const data = calculateHeroStats(heroState, l);
        dataArr.push(data);
    }

    return {
        heroState,
        autoDps: dataArr
    }
}

// Main execution
async function main() {
    console.log('🤖 Hero Output');

    const input = {
        hero: "Queen of Pain",
        items: [
            "Magic Wand",
            "Null Talisman",
            "Power Treads",
            "Blade Mail",
            "Shiva's Guard",
            "Kaya and Sange"
        ],
        neutral: "Book of the Dead",
        enchantment: "Audacious Enchantment"
    }

    try {

        const state = calculateAutoAtkDps(input, 1, 30);
        const dataArr = state.autoDps;
        fs.writeFileSync('./scripts/outputs/dps-sheet.json', JSON.stringify(dataArr, null , 4));

    } catch (error) {
        console.error('❌ Error running examples:', error.message);
        console.error(error);
    }
}


// main();

export {
    calculateHeroStats,
    calculateAutoAtkDps
}