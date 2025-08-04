// 2 somethings fight each other
import fs from 'fs';
import {
    calculateDamageReduction
} from './stat-calculator.js'

// Tower level 1
const tower1 = {
    name:"Tower1", 
    health: 1800,
    attackDamage: 90,
    damageWindow: [88, 92],
    attackSpeed: 110,
    attacksPS: .82,
    armor: 12,
    magicResistance: 0,
    attackRange: 700,
    customModifiers: [
        {
            damageBonus: "150%"
        }
    ]
}

const tower2 = {
    name:"Tower2", 
    health: 2500,
    attackDamage: 172,
    damageWindow: [170, 174],
    attackSpeed: 110,
    attacksPS: .82,
    armor: 16,
    magicResistance: 0,
    attackRange: 700,
    customModifiers: [
        {
            damageBonus: "150%"
        }
    ]
}

const meleeCreep = {
    name:"Melee Creep",
    health: 550,
    damage: 21,
    armor: 2,
    attackPS: 1,
    attackSpeed: 100,
    goldBounty: 37,
    expierence: 57,
    healthRegen: 0.5
};

function levelMeleeCreep(creep) {
    creep.damage += 1;
    creep.health += 12;
    creep.goldBounty += 1
    creep.experience += 0
}

function spawnCreep(creep, levels = 0) {
    creep.currentHealth = creep.health;
    creep.isAlive = true;
    while (levels > 1) {
        if (creep.name.toLowerCase.contains("melee")) {
            levelMeleeCreep(creep)
        } else if (creep.name.toLowerCase.contains("ranged")) {
            levelRangedCreep(creep);
        }
        levels = levels - 1;
    }
    creep.damageReduction = calculateDamageReduction(creep.armor);
    return creep;
}
const rangedCreep = {
    name:"Ranged Creep", 
    health: 300,
    damage: 24,
    armor: 0,
    attackPS: 1,
    attackSpeed: 100,
    goldBounty: 48,
    experience: 69,
    healthRegen: 2,
};

function levelRangedCreep(creep) {
    creep.damage += 2;
    creep.health += 12;
    creep.goldBounty += 6
    creep.experience += 8
}

const siegeCreep = {
    name: "Siege Creep",
    armor: 0,
    magicResistance: 80,
    health: 935,
    attackDamage: 41,
    attackPS: .33,
    attackSpeed: 100,
    bat: 3,
    goldBounty: 66,
    experience: 88,
    healthRegen: 0,
}

// return false if dead
function attack(attacker, target) {
    let damageMultiplier = attacker.name?.toLowerCase().includes("tower") && target.name.toLowerCase().includes("siege") ? 2.5 : 1;
    damageMultiplier = attacker.unitType == 'hero' && target.name.toLowerCase().includes("siege") ? .5 : damageMultiplier;
    const totalDamage = attacker.attackDamage * damageMultiplier;
    const dmgAfterReduction = totalDamage * (1 - target.damageReduction);
    target.currentHealth = target.currentHealth - dmgAfterReduction;
    target.isAlive = target.currentHealth > 0;
    if (target.isAlive) {
        console.log(`Current ${target.name} Health: `, target.currentHealth);
    }
    if (!target.isAlive && attacker.unitType == 'hero') {
            console.log('$$$ Success Last hit $$$');
            attacker.totalExperience = attacker.totalExperience + target.experience;
            attacker.totalGold = attacker.totalGold + target.goldBounty;
    }
    return target.isAlive;
}

function towerHitCreep(tower, creep, hero, heroHitAfter = false) {
    if (creep.currentHealth < 0) {
        console.log('Creep already dead');
        return;
    }
    if(attack(tower, creep) == false) {
        console.log('Creep dead');
        return;
    }
    creep.currentHealth = creep.currentHealth + creep.healthRegen; // regen per second tower happens to hit 1ps
    if (heroHitAfter && !attack(hero, creep)) {
        return;
    }
    if (tower.attackDamage > creep.currentHealth) {
        console.log("Hero Damage: ", hero.attackDamage);
        const damageMultiplier = creep.name.toLowerCase().includes("siege") ? .5 : damageMultiplier;
        const heroDmg = hero.attackDamage * .5
        if (heroDmg < creep.currentHealth && hero.attackPS < 2) {
            console.log('Going to miss! Delta: ', creep.currentHealth - heroDmg);
        } else {
            console.log('$$$ Success Last hit $$$');
            creep.currentHealth = creep.currentHealth - hero.attackDamage;
        }
    }

}

class Unit {
    constructor(stats) {
        this.stats = stats;
        this.stats.currentHealth = creep.health;
        this.stats.isAlive = true;
        this.stats.damageReduction = calculateDamageReduction(creep.armor);
    }

    receiveDamage(attacker) {

    }

    attack(target) {

    }
}

function main() {

    console.log('Tower 1')
    let rangedCreep1 = spawnCreep(rangedCreep);

    towerHitCreep(tower1, rangedCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});

    towerHitCreep(tower1, rangedCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});

    towerHitCreep(tower1, rangedCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'}, true);

    console.log('Tower 2')
    rangedCreep1 = spawnCreep(rangedCreep);

    towerHitCreep(tower2, rangedCreep1, {attackDamage: 66, attackPS: .8, unitType: 'hero'});

    towerHitCreep(tower2, rangedCreep1, {attackDamage: 66, attackPS: .8, unitType: 'hero'});

    console.log('Tower 2 hit 1 additional time')
    rangedCreep1 = spawnCreep(rangedCreep);

    towerHitCreep(tower2, rangedCreep1, {attackDamage: 66, attackPS: .8, unitType: 'hero'}, true);

    towerHitCreep(tower2, rangedCreep1, {attackDamage: 66, attackPS: .8, unitType: 'hero'});

    console.log('Tower 1 Melee Creep')
    let meleeCreep1 = spawnCreep(meleeCreep);
    towerHitCreep(tower1, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});

    towerHitCreep(tower1, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});
    
    towerHitCreep(tower1, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});

    towerHitCreep(tower1, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});

    towerHitCreep(tower1, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});

    towerHitCreep(tower1, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});

    towerHitCreep(tower1, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});

    console.log('Tower 1 Melee Creep Hit 1 additional')
    meleeCreep1 = spawnCreep(meleeCreep);
    towerHitCreep(tower1, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});

    towerHitCreep(tower1, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});
    
    towerHitCreep(tower1, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});

    towerHitCreep(tower1, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});

    towerHitCreep(tower1, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});

    towerHitCreep(tower1, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'}, true);

    towerHitCreep(tower1, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});

    console.log('Tower 2 Melee Creep')
    meleeCreep1 = spawnCreep(meleeCreep);
    towerHitCreep(tower2, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});

    towerHitCreep(tower2, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});
    
    towerHitCreep(tower2, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});

    towerHitCreep(tower2, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});

    console.log('Tower 2 Melee Creep Hit 1 additional time')
    meleeCreep1 = spawnCreep(meleeCreep);
    towerHitCreep(tower2, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});

    towerHitCreep(tower2, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});
    
    towerHitCreep(tower2, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'}, true);

    towerHitCreep(tower2, meleeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});

    console.log('Tower 1 Siege Creep Hit')
    let siegeCreep1 = spawnCreep(siegeCreep);
    towerHitCreep(tower1, siegeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});
    towerHitCreep(tower1, siegeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});
    towerHitCreep(tower1, siegeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});
    towerHitCreep(tower1, siegeCreep1, {attackDamage: 54, attackPS: .8, unitType: 'hero'});
}

main();