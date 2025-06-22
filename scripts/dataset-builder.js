import fs from 'fs';
import path from 'path';

// Main execution
async function main() {
    console.log('🤖 Claude API Starter Examples\n');
    
    try {

        const dataset = {heroes: {}, items: {}}

        const heroDir = './scripts/outputs/hero/conversion';

        let dir = heroDir
        let files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);

            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            const name = data['converted']['hero_name'];
            const content = data['converted']['sections'];

            dataset['heroes'][name] = content;
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

        fs.writeFileSync('./scripts/outputs/dataset.json', JSON.stringify(dataset, null, 4));

    } catch (error) {
        console.error('❌ Error running examples:', error.message);
        console.error(error);
    }
}


main();