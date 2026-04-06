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

const ITEM_STAT_METADATA_KEYS = new Set(['Cost', 'Sell Value', 'Recipe Cost', 'Active', 'Passive', 'Bonus']);

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

function ensureSentence(value) {
    if (typeof value !== 'string') {
        return value;
    }

    const text = normalizeText(value);
    if (!text) {
        return text;
    }

    if (/[.!?]$/.test(text)) {
        return text;
    }

    return `${text}.`;
}

function toTitleCase(value) {
    return normalizeText(value)
        .split(' ')
        .filter(Boolean)
        .map(part => {
            if (part === part.toUpperCase()) {
                return part;
            }

            return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join(' ');
}

function normalizeSchemaKey(key) {
    if (typeof key !== 'string') {
        return key;
    }

    return toTitleCase(
        key
            .replace(/_/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
    );
}

function parseNumberish(value) {
    if (typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
        return Number(value.trim());
    }

    return value;
}

function dedupeLeadingRepeatedName(text) {
    if (typeof text !== 'string') {
        return text;
    }

    return text.replace(/^((?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}))\s+\1\b/, '$1');
}

function stripEffectLabelPrefix(text) {
    if (typeof text !== 'string') {
        return text;
    }

    return normalizeText(text)
        .replace(/^[A-Za-z' -]+\s*\[(?:active|passive)\]:\s*/i, '')
        .replace(/^(?:Active|Passive)\s*[-:]\s*/i, '')
        .trim();
}

function splitBonusStats(text) {
    if (typeof text !== 'string') {
        return {};
    }

    const matches = [...normalizeText(text).matchAll(/([+-]\d+(?:\.\d+)?%?(?:\/[+-]?\d+(?:\.\d+)?%?)*)\s*([A-Za-z][A-Za-z' -]+?)(?=[+-]\d|$)/g)];
    const stats = {};

    for (const [, rawValue, rawLabel] of matches) {
        const label = normalizeSchemaKey(rawLabel);
        const value = normalizeText(rawValue);

        if (label && value && !(label in stats)) {
            stats[label] = value;
        }
    }

    return stats;
}

function normalizeItemAbilities(abilities) {
    if (!Array.isArray(abilities)) {
        return abilities;
    }

    return abilities.map(ability => ({
        ...ability,
        name: normalizeText(ability.name),
        type: normalizeAbilityType(ability.type),
        description: ensureSentence(normalizeText(ability.description))
    }));
}

function normalizeItemRecipe(recipe) {
    if (!Array.isArray(recipe)) {
        return recipe;
    }

    return unique(
        recipe
            .map(entry => normalizeText(entry))
            .filter(entry => entry && !/^Recipe$/i.test(entry))
    );
}

function normalizeItemBuildsInto(buildsInto) {
    if (!Array.isArray(buildsInto)) {
        return buildsInto;
    }

    return unique(
        buildsInto
            .map(entry => normalizeText(entry))
            .filter(entry => entry && !/^Recipe$/i.test(entry))
    );
}

function normalizeItemStats(stats = {}) {
    if (!stats || typeof stats !== 'object' || Array.isArray(stats)) {
        return {};
    }

    const normalizedStats = {};
    const bonusStats = splitBonusStats(stats.Bonus);

    for (const [rawKey, rawValue] of Object.entries(stats)) {
        const key = normalizeSchemaKey(rawKey);

        if (ITEM_STAT_METADATA_KEYS.has(key)) {
            continue;
        }

        normalizedStats[key] = typeof rawValue === 'string' ? normalizeText(rawValue) : rawValue;
    }

    for (const [key, value] of Object.entries(bonusStats)) {
        if (!(key in normalizedStats)) {
            normalizedStats[key] = value;
        }
    }

    return normalizedStats;
}

function normalizeItem(data) {
    const normalized = { ...data };
    const rawStats = normalized.stats && typeof normalized.stats === 'object' ? { ...normalized.stats } : {};

    normalized.name = normalizeText(normalized.name);
    normalized.description = normalizeText(normalized.description);
    normalized.abilities = normalizeItemAbilities(normalized.abilities);
    normalized.recipe = normalizeItemRecipe(normalized.recipe);
    normalized.buildsInto = normalizeItemBuildsInto(normalized.buildsInto);

    if ((normalized.cost === undefined || normalized.cost === null || normalized.cost === '') && rawStats.Cost !== undefined) {
        normalized.cost = parseNumberish(rawStats.Cost);
    }

    if ((normalized.recipeCost === undefined || normalized.recipeCost === null || normalized.recipeCost === '') && rawStats['Recipe Cost'] !== undefined) {
        normalized.recipeCost = parseNumberish(rawStats['Recipe Cost']);
    }

    if ((normalized.sellValue === undefined || normalized.sellValue === null || normalized.sellValue === '') && rawStats['Sell Value'] !== undefined) {
        normalized.sellValue = parseNumberish(rawStats['Sell Value']);
    }

    if (normalized.recipeCost !== undefined && normalized.recipeCost !== null && normalized.recipeCost !== '') {
        normalized.recipeCost = parseNumberish(normalized.recipeCost);
    }

    const itemStats = normalizeItemStats(rawStats);
    if (Object.keys(itemStats).length > 0) {
        normalized.stats = itemStats;
    } else {
        delete normalized.stats;
    }

    if (Array.isArray(normalized.recipe) && normalized.recipe.length === 0) {
        delete normalized.recipe;
    }

    if (Array.isArray(normalized.buildsInto) && normalized.buildsInto.length === 0) {
        delete normalized.buildsInto;
    }

    return normalized;
}

function isGenericNeutralDescription(text) {
    if (typeof text !== 'string') {
        return false;
    }

    return /^A Tier \d+ (?:neutral item(?: artifact)?|artifact)(?:\b| )/i.test(normalizeText(text));
}

function stripNeutralLeadIn(text) {
    if (typeof text !== 'string') {
        return text;
    }

    return normalizeText(text)
        .replace(/^A Tier \d+ (?:neutral item(?: artifact)?|artifact)(?: that| which| with)?\s*/i, '')
        .trim();
}

function looksWeakNeutralSummary(text) {
    if (typeof text !== 'string') {
        return true;
    }

    const normalized = normalizeText(text).toLowerCase();
    return !normalized ||
        /^(a|an)\s+(active ability|passive effect)\b/.test(normalized) ||
        /^(provides|grants)\s+a\s+powerful\b/.test(normalized) ||
        /^(cooldown|cast range|mana cost|duration)\b/.test(normalized);
}

function buildNeutralDescription(description, primaryEffect) {
    const stripped = stripNeutralLeadIn(description);

    if (stripped && stripped !== normalizeText(description) && !looksWeakNeutralSummary(stripped)) {
        return ensureSentence(stripped.charAt(0).toUpperCase() + stripped.slice(1));
    }

    if (!description || isGenericNeutralDescription(description)) {
        const derived = stripEffectLabelPrefix(primaryEffect);
        if (derived) {
            return ensureSentence(derived.charAt(0).toUpperCase() + derived.slice(1));
        }
    }

    return ensureSentence(description);
}

function normalizeNotes(notes) {
    if (Array.isArray(notes)) {
        return unique(notes.map(note => ensureSentence(note)).filter(Boolean));
    }

    return notes;
}

function normalizeNeutral(data) {
    const normalized = { ...data };
    const primary = normalizeText(normalized.effects?.primary);

    normalized.name = normalizeText(normalized.name);
    normalized.tier = normalized.tier !== undefined && normalized.tier !== null ? String(normalized.tier).trim() : normalized.tier;
    normalized.description = buildNeutralDescription(normalized.description, primary);
    normalized.notes = normalizeNotes(normalized.notes);

    if (normalized.effects && typeof normalized.effects === 'object' && !Array.isArray(normalized.effects)) {
        normalized.effects = { ...normalized.effects };

        if (normalized.effects.primary !== undefined) {
            normalized.effects.primary = ensureSentence(stripEffectLabelPrefix(normalized.effects.primary));
        }
    }

    return normalized;
}

function normalizeEnchantment(data) {
    const normalized = { ...data };

    normalized.name = normalizeText(normalized.name);
    normalized.description = ensureSentence(normalized.description);
    normalized.tier = normalized.tier !== undefined && normalized.tier !== null ? String(normalized.tier).trim() : normalized.tier;
    normalized.notes = normalizeNotes(normalized.notes);

    if (normalized.effects && typeof normalized.effects === 'object' && !Array.isArray(normalized.effects)) {
        normalized.effects = { ...normalized.effects };

        if (normalized.effects.primary_effect !== undefined && normalized.effects.primary === undefined) {
            normalized.effects.primary = normalized.effects.primary_effect;
        }

        if (normalized.effects.primary !== undefined) {
            normalized.effects.primary = ensureSentence(stripEffectLabelPrefix(normalized.effects.primary));
        }

        delete normalized.effects.primary_effect;
    }

    return normalized;
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

function normalizeHeroAttackType(attackType) {
    if (typeof attackType !== 'string') {
        return attackType;
    }

    const normalized = normalizeText(attackType).toLowerCase();
    if (normalized === 'melee') {
        return 'Melee';
    }
    if (normalized === 'ranged') {
        return 'Ranged';
    }

    return normalizeText(attackType);
}

function normalizeNumericObject(objectValue) {
    if (!objectValue || typeof objectValue !== 'object' || Array.isArray(objectValue)) {
        return objectValue;
    }

    const normalized = { ...objectValue };

    for (const [key, value] of Object.entries(normalized)) {
        if (typeof value !== 'string') {
            continue;
        }

        const cleaned = normalizeText(value).replace(/%$/, '');
        normalized[key] = /^-?\d+(\.\d+)?$/.test(cleaned) ? Number(cleaned) : normalizeText(value);
    }

    return normalized;
}

function normalizeSimpleHero(data) {
    const normalized = { ...data };

    normalized.name = normalizeText(normalized.name);
    normalized.description = ensureSentence(dedupeLeadingRepeatedName(normalizeText(normalized.description)));
    normalized.attackType = normalizeHeroAttackType(normalized.attackType);
    normalized.roles = normalizeHeroRoles(normalized.roles);

    normalized.attributes = normalizeNumericObject(normalized.attributes);
    normalized.attributeGains = normalizeNumericObject(normalized.attributeGains);
    normalized.statGains = normalizeNumericObject(normalized.statGains);
    normalized.stats = normalizeNumericObject(normalized.stats);

    if (Array.isArray(normalized.abilities)) {
        normalized.abilities = normalized.abilities.map(ability => ({
            ...ability,
            name: normalizeText(ability.name),
            type: normalizeAbilityType(ability.type),
            description: ensureSentence(normalizeText(ability.description))
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

    switch (category) {
        case 'item':
            return normalizeItem(normalized);
        case 'neutral':
            return normalizeNeutral(normalized);
        case 'enchantment':
            return normalizeEnchantment(normalized);
        case 'hero':
            if (shouldNormalizeAsSimpleHero(normalized)) {
                return normalizeSimpleHero(normalized);
            }

            if (normalized.converted?.sections?.general?.roles) {
                normalized.converted.sections.general.roles = normalizeHeroRoles(normalized.converted.sections.general.roles);
            }
            break;
        default:
            break;
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
