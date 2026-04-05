import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERO_ROLE_MAP = new Map([
    ['carry', 'Carry'],
    ['support', 'Support'],
    ['nuker', 'Nuker'],
    ['disabler', 'Disabler'],
    ['initiator', 'Initiator'],
    ['durable', 'Durable'],
    ['escape', 'Escape'],
    ['pusher', 'Pusher'],
    ['jungler', 'Jungler']
]);

function normalizeText(value) {
    if (typeof value !== 'string') {
        return value;
    }

    return value
        .replace(/\bLink(?=▶️)/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\s+([,.;:!?])/g, '$1')
        .replace(/([.!?])([A-Z])/g, '$1 $2')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([)])([A-Z])/g, '$1 $2')
        .replace(/([:])([A-Z])/g, '$1 $2')
        .trim();
}

function unique(values) {
    return [...new Set(values)];
}

function normalizeAbilityType(type) {
    if (typeof type !== 'string') {
        return type;
    }

    const lower = type.trim().toLowerCase();
    if (lower.includes('passive') && !lower.includes('active')) {
        return 'passive';
    }
    if (lower.includes('active') && !lower.includes('passive')) {
        return 'active';
    }
    if (lower === 'active/passive' || lower === 'passive/active') {
        return 'active';
    }

    return normalizeText(type);
}

function normalizeHeroRoles(roles) {
    if (Array.isArray(roles)) {
        return unique(
            roles
                .map(role => normalizeText(role))
                .map(role => HERO_ROLE_MAP.get(role.toLowerCase()) || role)
                .filter(Boolean)
        );
    }

    if (typeof roles === 'string') {
        const parts = roles
            .split(',')
            .map(role => normalizeText(role))
            .filter(Boolean)
            .map(role => HERO_ROLE_MAP.get(role.toLowerCase()) || role);
        return unique(parts).join(', ');
    }

    return roles;
}

function normalizeSimpleHero(data) {
    const normalized = { ...data };

    normalized.name = normalizeText(normalized.name);
    normalized.description = normalizeText(normalized.description);
    normalized.roles = normalizeHeroRoles(normalized.roles);

    if (normalized.attributes && typeof normalized.attributes === 'object') {
        normalized.attributes = { ...normalized.attributes };
        for (const [key, value] of Object.entries(normalized.attributes)) {
            if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
                normalized.attributes[key] = Number(value);
            }
        }
    }

    if (Array.isArray(normalized.abilities)) {
        normalized.abilities = normalized.abilities.map(ability => ({
            ...ability,
            name: normalizeText(ability.name),
            type: normalizeAbilityType(ability.type),
            description: normalizeText(ability.description)
        }));
    }

    return normalized;
}

function normalizeRecursive(value, context = {}) {
    if (Array.isArray(value)) {
        return value.map(item => normalizeRecursive(item, context));
    }

    if (!value || typeof value !== 'object') {
        if (typeof value === 'string') {
            return normalizeText(value);
        }
        return value;
    }

    const normalized = {};
    for (const [key, child] of Object.entries(value)) {
        let next = normalizeRecursive(child, { ...context, key });

        if (key === 'roles') {
            next = normalizeHeroRoles(next);
        }

        if (key === 'type') {
            next = normalizeAbilityType(next);
        }

        normalized[key] = next;
    }

    return normalized;
}

function shouldNormalizeAsSimpleHero(data) {
    return !('converted' in data) &&
        typeof data.name === 'string' &&
        Array.isArray(data.roles) &&
        data.attributes &&
        Array.isArray(data.abilities);
}

function normalizeData(category, data) {
    const normalized = normalizeRecursive(data);

    if (category === 'hero') {
        if (shouldNormalizeAsSimpleHero(normalized)) {
            return normalizeSimpleHero(normalized);
        }

        if (normalized.converted?.sections?.general?.roles) {
            normalized.converted.sections.general.roles = normalizeHeroRoles(normalized.converted.sections.general.roles);
        }
    }

    return normalized;
}

function normalizeFile(category, filePath) {
    const originalText = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(originalText);
    const normalized = normalizeData(category, parsed);
    const nextText = `${JSON.stringify(normalized, null, 2)}\n`;

    if (nextText !== originalText) {
        fs.writeFileSync(filePath, nextText);
        return true;
    }

    return false;
}

function normalizeFiles(category, filePaths) {
    let changed = 0;

    for (const filePath of filePaths) {
        if (normalizeFile(category, filePath)) {
            changed++;
        }
    }

    return { total: filePaths.length, changed };
}

function processDirectory(category, dir) {
    const files = fs.readdirSync(dir).filter(file => file.endsWith('.json'));
    const filePaths = files.map(file => path.join(dir, file));
    return normalizeFiles(category, filePaths);
}

async function main() {
    const targets = [
        { category: 'item', dir: './scripts/outputs/item/conversion' },
        { category: 'hero', dir: './scripts/outputs/hero/conversion' },
        { category: 'neutral', dir: './scripts/outputs/neutral/conversion' },
        { category: 'enchantment', dir: './scripts/outputs/enchantment/conversion' }
    ];

    const summary = {};

    for (const target of targets) {
        summary[target.category] = processDirectory(target.category, target.dir);
    }

    console.log(JSON.stringify(summary, null, 2));
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const modulePath = fileURLToPath(import.meta.url);

if (entryPath === modulePath) {
    main().catch(error => {
        console.error('❌ Normalization failed:', error.message);
        console.error(error);
        process.exitCode = 1;
    });
}

export {
    normalizeData,
    normalizeFile,
    normalizeFiles,
    processDirectory
};
