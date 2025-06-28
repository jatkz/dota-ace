import fs, { stat } from 'fs';
import path from 'path';


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

        const dataset = JSON.parse(fs.readFileSync('./scripts/outputs/dataset.json', 'utf8'));

        const output = {items:[]}

        output['hero'] = dataset['heroes'][input['hero']]
        output['hero']['name'] = input['hero']

        output['items'][0] = dataset['items'][input['items'][0]]
        output['items'][1] = dataset['items'][input['items'][1]]
        output['items'][2] = dataset['items'][input['items'][2]]
        output['items'][3] = dataset['items'][input['items'][3]]
        output['items'][4] = dataset['items'][input['items'][4]]
        output['items'][5] = dataset['items'][input['items'][5]]

        output['neutral'] = dataset['neutrals'][input['neutral']]
        output['enchantment'] = dataset['enchantments'][input['enchantment']]

        const heroStat = output;

        const arr = Array.from({length: 30}, (_, i) => i + 1);

        const dataArr = [];
        for (const l of arr) {
            const data = calculateHeroStats(heroStat, l);
            dataArr.push(data);
        }

        fs.writeFileSync('./scripts/outputs/dps-sheet.json', JSON.stringify(dataArr, null , 4));

    } catch (error) {
        console.error('❌ Error running examples:', error.message);
        console.error(error);
    }
}


main();