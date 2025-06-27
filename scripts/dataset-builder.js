import fs from 'fs';
import path from 'path';

// Main execution
async function main() {
    console.log('🤖 Claude API Starter Examples\n');

    try {

        const dataset = { heroes: {}, items: {}, neutrals: {}, enchantments: {} }

        const heroDir = './scripts/outputs/hero/conversion';

        let dir = heroDir
        let files = fs.readdirSync(dir);
        for (const file of files) {
            console.log('file', file);
            const filePath = path.join(dir, file);

            let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if ('converted' in data) {
                data = data['converted'];
            }

            const name = data['hero_name'];
            const content = data['sections'];

            const { recent_changes, ...cleanedData } = content;

            dataset['heroes'][name] = cleanedData;
        }


        const itemDir = './scripts/outputs/item/conversion';

        dir = itemDir
        files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);

            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            const name = data['name'];
            const content = data;

            dataset['items'][name] = content;
        }

        const neutralDir = './scripts/outputs/neutral/conversion';

        dir = neutralDir
        files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            console.log('file', file);

            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            const name = data['name'];
            const content = data;

            dataset['neutrals'][name] = content;
        }

        const enchantmentDir = './scripts/outputs/enchantment/conversion';

        dir = enchantmentDir
        files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);

            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            const name = data['name'];
            const content = data;

            dataset['enchantments'][name] = content;
        }

        fs.writeFileSync('./scripts/outputs/dataset.json', JSON.stringify(dataset, null, 4));

    } catch (error) {
        console.error('❌ Error running examples:', error.message);
        console.error(error);
    }
}


main();