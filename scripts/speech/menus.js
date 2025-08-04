import fs from 'fs';

function getHeroMenu() {
    const heroesList = JSON.parse(fs.readFileSync('./scripts/outputs/heroes-list.json', 'utf8'));
    const heroesMenu = heroesList.map(x => x.displayName);
    return heroesMenu;
}