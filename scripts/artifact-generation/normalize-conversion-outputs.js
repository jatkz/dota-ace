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

function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function splitSentences(text) {
    if (typeof text !== 'string') {
        return [];
    }

    return normalizeText(text)
        .split(/(?<=[.!?])\s+/)
        .map(part => normalizeText(part))
        .filter(Boolean);
}

function firstSentence(text) {
    return splitSentences(text)[0] || normalizeText(text);
}

function parseMetricSeries(value = '') {
    const cleaned = normalizeText(value)
        .replace(/[%°]/g, '')
        .replace(/\s+/g, '')
        .trim();

    if (!cleaned || !/^[-\d./]+$/.test(cleaned)) {
        return null;
    }

    const parts = cleaned.split('/').map(part => Number(part));
    if (parts.length === 0 || parts.some(part => !Number.isFinite(part))) {
        return null;
    }

    return parts;
}

function hasBogusNegativeSeries(label = '', altText = '') {
    if (!/cooldown|mana cost|cast range|duration|radius|distance|range/i.test(label)) {
        return false;
    }

    const series = parseMetricSeries(altText);
    return Array.isArray(series) && series.some(value => value < 0);
}

function shouldDropAltSeries(baseText = '', altText = '', label = '') {
    if (hasBogusNegativeSeries(label, altText)) {
        return true;
    }

    const baseSeries = parseMetricSeries(baseText);
    const altSeries = parseMetricSeries(altText);

    if (!baseSeries || !altSeries || baseSeries.length !== altSeries.length) {
        return false;
    }

    if (altSeries.some(value => Math.abs(value) >= 10000)) {
        return true;
    }

    const ratios = altSeries.map((value, index) => {
        const baseValue = baseSeries[index];
        if (baseValue === 0) {
            return value === 0 ? 1 : Number.POSITIVE_INFINITY;
        }

        return value / baseValue;
    });

    const identical = ratios.every(ratio => Math.abs(ratio - 1) < 0.0001);
    const absurd = ratios.every(ratio => ratio >= 10);

    return identical || absurd;
}

function simplifyMetricParentheticals(text = '') {
    if (typeof text !== 'string') {
        return text;
    }

    return normalizeText(text).replace(/([A-Za-z][A-Za-z' /-]+:\s*[^.()]+?)\s*\(([^()]+)\)/g, (match, prefix, altText) => {
        const labelMatch = prefix.match(/^([A-Za-z][A-Za-z' /-]+):\s*(.+)$/);
        if (!labelMatch) {
            return match;
        }

        const label = normalizeText(labelMatch[1]);
        const baseText = normalizeText(labelMatch[2]);
        const alt = normalizeText(altText);

        if (!alt) {
            return `${prefix}`;
        }

        if (shouldDropAltSeries(baseText, alt, label)) {
            return `${label}: ${baseText}`;
        }

        return `${label}: ${baseText} (${alt})`;
    });
}

function repairDottedMetricLabels(text = '') {
    if (typeof text !== 'string') {
        return text;
    }

    return normalizeText(text).replace(
        /\b((?:(?:[A-Z][A-Za-z'/-]*|of|per|to|as)(?:\.\s+|\s+)){1,6}(?:[A-Z][A-Za-z'/-]*|of|per|to|as):)/g,
        match => match.replace(/\.\s+/g, ' ').replace(/\s+/g, ' ')
    );
}

function repairBrokenMetricBoundaries(text = '') {
    if (typeof text !== 'string') {
        return text;
    }

    return normalizeText(text)
        .replace(/\b(Global)\s+(Damage:)/g, '$1. $2')
        .replace(/\b(does|itself|himself|herself|them|themselves|Meepo)\s+(Number of [A-Z][A-Za-z' /-]*:)/g, '$1. $2')
        .replace(/(\([^)]+\)|\d+(?:\.\d+)?%?)\s+(?=Spawn Interval:)/g, '$1. ');
}

function repairHeroAbilityText(text = '', hero = {}) {
    if (typeof text !== 'string') {
        return text;
    }

    let normalized = normalizeText(text);

    if (hero?.name === 'Arc Warden') {
        normalized = normalized
            .replace(/\bThe Self\b/g, 'Arc Warden')
            .replace(/\bThe Double\b/g, 'the Double')
            .replace(
                /\bGrants permanent,, and per Power Rune activated by Arc Warden and the Double\./gi,
                'Grants permanent bonuses per Power Rune activated by Arc Warden and the Double.'
            );
    }

    return normalized
        .replace(/\bSneakly\b/g, 'Sneakily')
        .replace(/\bhas a chance to applies\b/gi, 'has a chance to apply')
        .replace(/\bhave a chance to applies\b/gi, 'have a chance to apply')
        .replace(/\babilities has\b/gi, 'abilities have')
        .replace(/\battacks has\b/gi, 'attacks have')
        .replace(/\bThe Clones recognizes and copy\b/gi, 'The Clones recognize and copy')
        .replace(/\bThe movement speed alternating component fully apply\./gi, 'The movement speed component applies fully.')
        .replace(/\bwhich can gain gold and experience as he does\b/gi, 'which can gain gold and experience like Meepo')
        .replace(/like Meepo Number of Clones:/g, 'like Meepo. Number of Clones:')
        .replace(/\blike Meepo\s+(?=Number of [A-Z][A-Za-z' /-]*:)/g, 'like Meepo. ')
        .replace(/\blike Meepo\s+(Number of [A-Z][A-Za-z' /-]*:)/g, 'like Meepo. $1')
        .replace(/\bper,\s+with a cap\./gi, ', up to a cap.')
        .replace(/\bBoth and the cannot be lifted\.\s*/gi, '')
        .replace(/\bBoth and the are immune to the max health as damage component\.\s*/gi, '')
        .replace(/(^|[.!?]\s+)grants Underlord's\b/g, "$1Grants Underlord's")
        .replace(/(^|[.!?]\s+)the Double\b/g, '$1The Double');
}

function isBrokenHeroSentence(text = '') {
    if (typeof text !== 'string') {
        return false;
    }

    const normalized = normalizeText(text);
    if (!normalized) {
        return true;
    }

    return /^Both and the\b/i.test(normalized) ||
        /^[A-Z][A-Za-z' /-]+:\s*[A-Z][A-Za-z' /-]+:\s*/.test(normalized);
}

function dedupeSentences(text = '') {
    const sentences = splitSentences(text);
    const seen = new Set();
    const deduped = [];

    for (const sentence of sentences) {
        if (isBrokenHeroSentence(sentence)) {
            continue;
        }

        const key = sentence.toLowerCase();
        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        deduped.push(sentence);
    }

    return deduped.join(' ').trim();
}

function cleanupHeroAbilityDescription(text = '', hero = {}) {
    if (typeof text !== 'string') {
        return text;
    }

    let normalized = normalizeText(text)
        .replace(/:\./g, ':')
        .replace(/\.\.(?=\s+[A-Z]|$)/g, '.')
        .replace(/\b([A-Za-z][A-Za-z' /-]+):\s*\.\s*/g, '$1: ')
        .replace(/\s{2,}/g, ' ')
        .trim();

    normalized = repairHeroAbilityText(normalized, hero);
    normalized = repairDottedMetricLabels(normalized);
    normalized = repairBrokenMetricBoundaries(normalized);
    normalized = simplifyMetricParentheticals(normalized);
    normalized = repairDottedMetricLabels(normalized);
    normalized = dedupeSentences(normalized);

    const zeroManaHero = hero?.stats?.mana === 0 || /does not have mana/i.test(normalizeText(hero?.description || ''));
    if (zeroManaHero) {
        normalized = normalized
            .replace(/\s*Mana Cost:\s*0(?:\.0+)?\.\s*/gi, ' ')
            .replace(/\s*Mana Cost:\s*0(?:\.0+)?$/gi, '')
            .trim();
    }

    normalized = normalized.replace(/like Meepo Number of Clones:/g, 'like Meepo. Number of Clones:');

    return ensureSentence(normalized);
}

function normalizeHeroDescription(description, heroName = '') {
    if (typeof description !== 'string') {
        return description;
    }

    let normalized = dedupeLeadingRepeatedName(normalizeText(description));
    if (!normalized) {
        return normalized;
    }

    const first = firstSentence(normalized);
    const remaining = normalizeText(normalized.slice(first.length));
    const heroNamePattern = heroName ? new RegExp(`^${escapeRegExp(heroName)}(?:,|\\b)`, 'i') : null;

    if (normalized.length > 220) {
        return ensureSentence(first);
    }

    if (remaining && (
        /^(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}),\s+the\b/.test(remaining) ||
        /(?:Cast Range|Cooldown|Mana Cost|Damage|Duration|Radius):/i.test(remaining) ||
        (heroNamePattern && heroNamePattern.test(remaining))
    )) {
        return ensureSentence(first);
    }

    return ensureSentence(normalized);
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

function normalizeHeroTalents(talents) {
    if (!talents || typeof talents !== 'object' || Array.isArray(talents)) {
        return talents;
    }

    const normalized = {};

    for (const level of ['25', '20', '15', '10']) {
        const entry = talents[level];
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            continue;
        }

        const left = typeof entry.left === 'string'
            ? normalizeText(entry.left).replace(/\s*\/\s*/g, '/')
            : entry.left;
        const right = typeof entry.right === 'string'
            ? normalizeText(entry.right).replace(/\s*\/\s*/g, '/')
            : entry.right;

        if (left || right) {
            normalized[level] = {};

            if (left) {
                normalized[level].left = left;
            }

            if (right) {
                normalized[level].right = right;
            }
        }
    }

    return Object.keys(normalized).length > 0 ? normalized : talents;
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
    normalized.description = normalizeHeroDescription(normalized.description, normalized.name);
    normalized.attackType = normalizeHeroAttackType(normalized.attackType);
    normalized.roles = normalizeHeroRoles(normalized.roles);

    normalized.attributes = normalizeNumericObject(normalized.attributes);
    normalized.attributeGains = normalizeNumericObject(normalized.attributeGains);
    normalized.statGains = normalizeNumericObject(normalized.statGains);
    normalized.stats = normalizeNumericObject(normalized.stats);
    normalized.talents = normalizeHeroTalents(normalized.talents);

    if (Array.isArray(normalized.abilities)) {
        normalized.abilities = normalized.abilities.map(ability => ({
            ...ability,
            name: normalizeText(ability.name),
            type: normalizeAbilityType(ability.type),
            description: cleanupHeroAbilityDescription(ability.description, normalized)
        }));
    }

    return normalized;
}

function normalizeHeroCore(data) {
    const normalized = { ...data };

    normalized.name = normalizeText(normalized.name);
    normalized.description = normalizeHeroDescription(normalized.description, normalized.name);
    normalized.attackType = normalizeHeroAttackType(normalized.attackType);
    normalized.roles = normalizeHeroRoles(normalized.roles);

    normalized.attributes = normalizeNumericObject(normalized.attributes);
    normalized.attributeGains = normalizeNumericObject(normalized.attributeGains);
    normalized.statGains = normalizeNumericObject(normalized.statGains);
    normalized.stats = normalizeNumericObject(normalized.stats);
    normalized.talents = normalizeHeroTalents(normalized.talents);

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

function shouldNormalizeAsHeroCore(data) {
    return !('converted' in data) &&
        typeof data.name === 'string' &&
        Array.isArray(data.roles) &&
        data.attributes &&
        !Array.isArray(data.abilities);
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

            if (shouldNormalizeAsHeroCore(normalized)) {
                return normalizeHeroCore(normalized);
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
