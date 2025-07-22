import {
    calculateStatsByLevel
} from './stat-calculator.js'
import fs from 'fs';

function main() {
    try {
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
        
        const state = calculateStatsByLevel(input, 1, 30);
        fs.writeFileSync('./scripts/outputs/finalHeroState.json', JSON.stringify(state, null , 4));
        
    } catch (error) {
        console.error('❌ Error running examples:', error.message);
        console.error(error);
    }
}

main()