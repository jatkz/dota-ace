import fs from 'fs';
import path from 'path';

// TODO delete this later and put in the llm maybe
// Main execution
async function statCalculator(hero, items) {

    try {

        total_agility = base_agility + item_agility

    } catch (error) {
        console.error('❌ Error running examples:', error.message);
        console.error(error);
    }
}


statCalculator();



function calculateHeroStats(heroData, level) {
    // Validate level input (1-30)
    if (level < 1 || level > 30) {
        throw new Error('Hero level must be between 1 and 30');
    }
    
    const general = heroData.general;
    
    // Calculate base attributes at given level
    // Level 1 = base stats, each additional level adds the gain amount
    const strength = general.strength + (general.strength_gain * (level - 1));
    const agility = general.agility + (general.agility_gain * (level - 1));
    const intelligence = general.intelligence + (general.intelligence_gain * (level - 1));
    
    // Calculate attack damage
    // For intelligence heroes, intelligence contributes to attack damage
    // Base damage is the average of the damage range
    const baseDamage = general.damage_avg;
    const primaryAttributeBonus = intelligence; // QoP is intelligence hero
    const totalAttackDamage = baseDamage + primaryAttributeBonus;
    
    // Calculate attack speed
    // Base attack speed is 100, agility adds to it
    const baseAttackSpeed = general.attack_speed;
    const agilityAttackSpeedBonus = agility;
    const totalAttackSpeed = baseAttackSpeed + agilityAttackSpeedBonus;
    
    // Calculate other derived stats
    const health = general.health + (strength * 22); // Each strength point gives 22 HP
    const mana = general.mana + (intelligence * 12); // Each intelligence point gives 12 mana
    const armor = general.armor + (agility / 6); // Each 6 agility points give 1 armor
    
    return {
        level: level,
        attributes: {
            strength: Math.round(strength * 10) / 10, // Round to 1 decimal
            agility: Math.round(agility * 10) / 10,
            intelligence: Math.round(intelligence * 10) / 10
        },
        combat: {
            attackDamage: Math.round(totalAttackDamage),
            attackSpeed: Math.round(totalAttackSpeed),
            health: Math.round(health),
            mana: Math.round(mana),
            armor: Math.round(armor * 100) / 100 // Round to 2 decimals
        },
        other: {
            moveSpeed: general.move_speed,
            attackRange: general.attack_range,
            magicResist: general.magic_resist
        }
    };
}

// Example usage with your payload data
const payload = {
    // Your payload data here
    hero: {
        general: {
            primary_attribute: "intelligence",
            strength: 20,
            strength_gain: 2.4,
            agility: 22,
            agility_gain: 2.5,
            intelligence: 25,
            intelligence_gain: 3.4,
            health: 560,
            mana: 375,
            armor: 3.67,
            magic_resist: 27.5,
            damage: [51, 57],
            damage_avg: 54,
            attack_speed: 100,
            move_speed: 290,
            attack_range: 550
        }
    }
};

// Calculate stats for different levels
console.log("Queen of Pain Level 1:");
console.log(calculateHeroStats(payload.hero, 1));

console.log("\nQueen of Pain Level 15:");
console.log(calculateHeroStats(payload.hero, 15));

console.log("\nQueen of Pain Level 25:");
console.log(calculateHeroStats(payload.hero, 25));

console.log("\nQueen of Pain Level 30:");
console.log(calculateHeroStats(payload.hero, 30));