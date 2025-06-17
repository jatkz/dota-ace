import fs from 'fs';
import path from 'path';

function main() {

    const filePath = './scripts/outputs/item/conversion';

    const files = fs.readdirSync(filePath);
    files.forEach(file => {
        console.log(file);

        if (path.extname(file) === '.html') {
            const oldPath = path.join(filePath, file);
            const newPath = path.join(filePath, file.replace('.html', '.json'));
            
            fs.rename(oldPath, newPath, (err) => {
                if (err) throw err;
                console.log(`Renamed: ${file} -> ${file.replace('.html', '.json')}`);
            });
        }
    });
}

main()