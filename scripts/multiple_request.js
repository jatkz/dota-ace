
const DOTA2_HEROES_WITH_DISPLAY_NAMES = [
  { urlName: "Abaddon", displayName: "Abaddon" },
  { urlName: "Alchemist", displayName: "Alchemist" },
  { urlName: "Ancient_Apparition", displayName: "Ancient Apparition" },
  { urlName: "Anti-Mage", displayName: "Anti-Mage" },
  { urlName: "Arc_Warden", displayName: "Arc Warden" },
  { urlName: "Axe", displayName: "Axe" },
  { urlName: "Bane", displayName: "Bane" },
  { urlName: "Batrider", displayName: "Batrider" },
  { urlName: "Beastmaster", displayName: "Beastmaster" },
  { urlName: "Bloodseeker", displayName: "Bloodseeker" },
  { urlName: "Bounty_Hunter", displayName: "Bounty Hunter" },
  { urlName: "Brewmaster", displayName: "Brewmaster" },
  { urlName: "Bristleback", displayName: "Bristleback" },
  { urlName: "Broodmother", displayName: "Broodmother", attribute: "universal" },
  { urlName: "Centaur_Warrunner", displayName: "Centaur Warrunner" },
  { urlName: "Chaos_Knight", displayName: "Chaos Knight" },
  { urlName: "Chen", displayName: "Chen" },
  { urlName: "Clinkz", displayName: "Clinkz" },
  { urlName: "Clockwerk", displayName: "Clockwerk" },
  { urlName: "Crystal_Maiden", displayName: "Crystal Maiden" },
  { urlName: "Dark_Seer", displayName: "Dark Seer" },
  { urlName: "Dark_Willow", displayName: "Dark Willow" },
  { urlName: "Dawnbreaker", displayName: "Dawnbreaker" },
  { urlName: "Dazzle", displayName: "Dazzle" },
  { urlName: "Death_Prophet", displayName: "Death Prophet" },
  { urlName: "Disruptor", displayName: "Disruptor" },
  { urlName: "Doom", displayName: "Doom" },
  { urlName: "Dragon_Knight", displayName: "Dragon Knight" },
  { urlName: "Drow_Ranger", displayName: "Drow Ranger" },
  { urlName: "Earth_Spirit", displayName: "Earth Spirit" },
  { urlName: "Earthshaker", displayName: "Earthshaker" },
  { urlName: "Elder_Titan", displayName: "Elder Titan" },
  { urlName: "Ember_Spirit", displayName: "Ember Spirit" },
  { urlName: "Enchantress", displayName: "Enchantress" },
  { urlName: "Enigma", displayName: "Enigma" },
  { urlName: "Faceless_Void", displayName: "Faceless Void" },
  { urlName: "Grimstroke", displayName: "Grimstroke" },
  { urlName: "Gyrocopter", displayName: "Gyrocopter" },
  { urlName: "Hoodwink", displayName: "Hoodwink" },
  { urlName: "Huskar", displayName: "Huskar" },
  { urlName: "Invoker", displayName: "Invoker" },
  { urlName: "Io", displayName: "Io" },
  { urlName: "Jakiro", displayName: "Jakiro" },
  { urlName: "Juggernaut", displayName: "Juggernaut" },
  { urlName: "Keeper_of_the_Light", displayName: "Keeper of the Light" },
  { urlName: "Kunkka", displayName: "Kunkka" },
  { urlName: "Legion_Commander", displayName: "Legion Commander" },
  { urlName: "Leshrac", displayName: "Leshrac" },
  { urlName: "Lich", displayName: "Lich" },
  { urlName: "Lifestealer", displayName: "Lifestealer" },
  { urlName: "Lina", displayName: "Lina" },
  { urlName: "Lion", displayName: "Lion" },
  { urlName: "Lone_Druid", displayName: "Lone Druid" },
  { urlName: "Luna", displayName: "Luna" },
  { urlName: "Magnus", displayName: "Magnus" },
  { urlName: "Marci", displayName: "Marci" },
  { urlName: "Mars", displayName: "Mars" },
  { urlName: "Medusa", displayName: "Medusa" },
  { urlName: "Meepo", displayName: "Meepo" },
  { urlName: "Mirana", displayName: "Mirana" },
  { urlName: "Monkey_King", displayName: "Monkey King" },
  { urlName: "Morphling", displayName: "Morphling" },
  { urlName: "Muerta", displayName: "Muerta", attribute: "universal" },
  { urlName: "Naga_Siren", displayName: "Naga Siren" },
  { urlName: "Nature's_Prophet", displayName: "Nature's Prophet" },
  { urlName: "Necrophos", displayName: "Necrophos" },
  { urlName: "Night_Stalker", displayName: "Night Stalker" },
  { urlName: "Nyx_Assassin", displayName: "Nyx Assassin" },
  { urlName: "Ogre_Magi", displayName: "Ogre Magi" },
  { urlName: "Omniknight", displayName: "Omniknight" },
  { urlName: "Oracle", displayName: "Oracle" },
  { urlName: "Outworld_Destroyer", displayName: "Outworld Destroyer" },
  { urlName: "Pangolier", displayName: "Pangolier" },
  { urlName: "Phantom_Assassin", displayName: "Phantom Assassin" },
  { urlName: "Phantom_Lancer", displayName: "Phantom Lancer" },
  { urlName: "Primal_Beast", displayName: "Primal Beast", attribute: "universal" },
  { urlName: "Puck", displayName: "Puck" },
  { urlName: "Pudge", displayName: "Pudge" },
  { urlName: "Pugna", displayName: "Pugna" },
  { urlName: "Queen_of_Pain", displayName: "Queen of Pain" },
  { urlName: "Razor", displayName: "Razor" },
  { urlName: "Riki", displayName: "Riki" },
  { urlName: "Ringmaster", displayName: "Ringmaster", attribute: "universal" },
  { urlName: "Rubick", displayName: "Rubick" },
  { urlName: "Sand_King", displayName: "Sand King" },
  { urlName: "Shadow_Demon", displayName: "Shadow Demon" },
  { urlName: "Shadow_Fiend", displayName: "Shadow Fiend" },
  { urlName: "Shadow_Shaman", displayName: "Shadow Shaman" },
  { urlName: "Silencer", displayName: "Silencer" },
  { urlName: "Skywrath_Mage", displayName: "Skywrath Mage" },
  { urlName: "Slardar", displayName: "Slardar" },
  { urlName: "Slark", displayName: "Slark" },
  { urlName: "Sniper", displayName: "Sniper" },
  { urlName: "Spectre", displayName: "Spectre" },
  { urlName: "Spirit_Breaker", displayName: "Spirit Breaker" },
  { urlName: "Storm_Spirit", displayName: "Storm Spirit" },
  { urlName: "Sven", displayName: "Sven" },
  { urlName: "Techies", displayName: "Techies" },
  { urlName: "Templar_Assassin", displayName: "Templar Assassin" },
  { urlName: "Terrorblade", displayName: "Terrorblade" },
  { urlName: "Tidehunter", displayName: "Tidehunter" },
  { urlName: "Timbersaw", displayName: "Timbersaw" },
  { urlName: "Tinker", displayName: "Tinker" },
  { urlName: "Tiny", displayName: "Tiny" },
  { urlName: "Treant_Protector", displayName: "Treant Protector" },
  { urlName: "Troll_Warlord", displayName: "Troll Warlord" },
  { urlName: "Tusk", displayName: "Tusk" },
  { urlName: "Underlord", displayName: "Underlord" },
  { urlName: "Undying", displayName: "Undying" },
  { urlName: "Ursa", displayName: "Ursa" },
  { urlName: "Vengeful_Spirit", displayName: "Vengeful Spirit" },
  { urlName: "Venomancer", displayName: "Venomancer" },
  { urlName: "Viper", displayName: "Viper" },
  { urlName: "Visage", displayName: "Visage" },
  { urlName: "Void_Spirit", displayName: "Void Spirit" },
  { urlName: "Warlock", displayName: "Warlock" },
  { urlName: "Weaver", displayName: "Weaver" },
  { urlName: "Windranger", displayName: "Windranger" },
  { urlName: "Winter_Wyvern", displayName: "Winter Wyvern" },
  { urlName: "Witch_Doctor", displayName: "Witch Doctor" },
  { urlName: "Wraith_King", displayName: "Wraith King" },
  { urlName: "Zeus", displayName: "Zeus" }
];

// Simple array for URL generation
const DOTA2_HERO_URL_NAMES = DOTA2_HEROES_WITH_DISPLAY_NAMES.map(hero => hero.urlName);

const fs = require('fs');
// Import the functions from the module
const { optimizeHtmlForParsing } = require('./html-parser');

// Wrap everything in an async function
async function main() {
    try {
        for (const heroName of DOTA2_HERO_URL_NAMES) {
            // 1. Download HTML
            console.log('Fetching HTML from Liquipedia...');
            const response = await fetch(`https://liquipedia.net/dota2/${heroName}`);
            
            // Check if the request was successful
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Get the HTML text from the response
            const html = await response.text();
            console.log(`Downloaded ${html.length} characters`);
            
            // 2. Clean the HTML
            const cleanHtml = optimizeHtmlForParsing(html);
            console.log(`Cleaned HTML: ${cleanHtml.length} characters (${Math.round((1 - cleanHtml.length/html.length) * 100)}% reduction)`);
            
            // 3. Save to file
            const outputPath = `./scripts/outputs/multiple_${heroName}_test.html`;
            fs.writeFileSync(outputPath, cleanHtml, 'utf8');
            
            console.log(`Successfully saved cleaned HTML to ${outputPath}`);
        }
        
    } catch (error) {
        console.error('Error processing HTML:', error.message);
    }
}

// Run the main function
main();