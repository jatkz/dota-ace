import fs from 'fs';
import {
    getHeroState
} from './get-hero-state.js'


function calculateHeroStats(heroState, level, misc_buffs = []) {
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
    const stats = {strength:0, agility:0, intelligence:0, attackSpeed: 0,
        attackDamage: 0, health: 0, healthRegeneration: 0, manaRegeneration: 0, mana: 0,
        healthRestoreAmp: 0, maxHPHealthRegen: 0
    };
    const str_gain = (general.strength_gain * (level - 1))
    stats['strength'] = general.strength + str_gain;
    stats['agility'] = general.agility + (general.agility_gain * (level - 1));
    stats['intelligence'] = general.intelligence + (general.intelligence_gain * (level - 1));
    stats['attackSpeed'] = general.attack_speed;
    stats['attackDamage'] = general.damage_avg;
    stats['health'] = 120; // base hp pool of all heroes https://liquipedia.net/dota2/Health
    stats['mana'] = 75; // base mana pool of all heroes https://liquipedia.net/dota2/Mana

    for (const i of items) {
        const item_stats = i?.bonus;
        stats['strength'] = stats['strength'] + (item_stats?.strength || 0);
        stats['agility'] = stats['agility'] + (item_stats?.agility || 0);
        stats['intelligence'] = stats['intelligence'] + (item_stats?.intelligence || 0);
        stats['attackSpeed'] = stats['attackSpeed'] + (item_stats?.attackSpeed || 0);
        stats['attackDamage'] = stats['attackDamage'] + (item_stats?.attackDamage || 0);
        stats['health'] = stats['health'] + (item_stats?.health || 0);
        stats['healthRegeneration'] = stats['healthRegeneration'] + (item_stats?.healthRegeneration || 0);
        if (item_stats?.healthRestoreAmp) {
            const percentString = item_stats?.healthRestoreAmp;
            stats['healthRestoreAmp'] = stats['healthRestoreAmp'] + parseFloat(percentString.replace('%', '')) / 100;
        }
        if (item_stats?.maxHPHealthRegen) {
            const percentString = item_stats?.maxHPHealthRegen;
            stats['maxHPHealthRegen'] = stats['maxHPHealthRegen'] + parseFloat(percentString.replace('%', '')) / 100;
        }
        stats['mana'] = stats['mana'] + (item_stats?.mana || 0);
        stats['manaRegeneration'] = stats['manaRegeneration'] + (item_stats?.manaRegeneration || 0);
    }

    stats['strength'] += (enchantment?.stats?.strength || 0);
    stats['agility'] += (enchantment?.stats?.agility || 0);
    stats['intelligence'] += (enchantment?.stats?.intelligence || 0);
    stats['attackSpeed'] += (enchantment?.stats?.attack_speed || 0);
    stats['attackDamage'] += (enchantment?.stats?.attack_damage || 0);
    if (general.primary_attribute == 'universal') {
        stats.attackDamage += (stats.strength + stats.agility + stats.intelligence) * .45;
    } else {
        stats.attackDamage += stats[general.primary_attribute];
    }

    for (const buff of misc_buffs) {
        const fieldName = buff['key'];
        const value = buff['value'];
        const description = buff['description'];
        stats[fieldName] += value;
    }
    stats['misc_buffs'] = misc_buffs;


    // FINAL BEFORE END CALCS

    const attackSpeedSum = (stats.attackSpeed + stats.agility)
    stats['attackSpeed'] = attackSpeedSum;
    const attackRate = (attackSpeedSum) / (general.attackSpeed * general.bat);
    const attacksPS = 1/attackRate;
    const dps = attackRate * stats.attackDamage;
    // Calculate other derived stats
    stats['health'] = stats['health'] + (stats['strength'] * 22);
    stats['healthRegeneration'] = stats['healthRegeneration'] + (0.1 * general.strength) + (stats['health'] * stats['maxHPHealthRegen']) * (1 + stats['healthRestoreAmp']);
    stats['mana'] = stats['mana'] + (stats['mana'] * 12);
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

function calculateStatsByLevel(input, levelStart, levelEnd) {

    const heroState = getHeroState(input);

    const levelRange = 1 + levelEnd - levelStart;

    const arr = Array.from({length: levelRange}, (_, i) => levelStart + i);

    const dataArr = [];
    for (const l of arr) {
        const data = calculateHeroStats(heroState, l, input.misc_buffs);
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

        const state = calculateStatsByLevel(input, 1, 30);
        const dataArr = state.autoDps;
        fs.writeFileSync('./scripts/outputs/dps-sheet.json', JSON.stringify(dataArr, null , 4));
        console.log('Hero State Saved');

    } catch (error) {
        console.error('❌ Error running examples:', error.message);
        console.error(error);
    }
}


// main();

export {
    calculateHeroStats,
    calculateStatsByLevel
}