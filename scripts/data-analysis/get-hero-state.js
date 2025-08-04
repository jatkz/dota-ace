import fs from 'fs';

function getHeroState(input) {
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

    return output;

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

        const output = getHeroState(input);

        fs.writeFileSync('./scripts/outputs/hero-state.json', JSON.stringify(output, null , 4));

    } catch (error) {
        console.error('❌ Error running examples:', error.message);
        console.error(error);
    }
}


// main();

export {
    getHeroState
}