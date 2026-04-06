import cheerio from 'cheerio';

function normalizeText(text = '') {
    return text
        .replace(/\[edit\]/gi, ' ')
        .replace(/▶️/g, ' ')
        .replace(/Link(?=▶️)/g, ' ')
        .replace(/&#160;/g, ' ')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function cleanUnknownMarkers(text = '') {
    return normalizeText(text)
        .replace(/^\?\s*/g, '')
        .replace(/\s+\?/g, '')
        .trim();
}

function sanitizeNarrativeText(text = '') {
    return cleanUnknownMarkers(text)
        .replace(/\bLink\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function appendSection(lines, label, values) {
    const entries = Array.isArray(values) ? values : [values];
    const cleaned = entries
        .map(value => cleanUnknownMarkers(String(value || '')))
        .filter(Boolean);

    if (cleaned.length === 0) {
        return;
    }

    lines.push(`${label}:`);
    for (const value of cleaned) {
        lines.push(`- ${value}`);
    }
    lines.push('');
}

function getTitle($) {
    const heading = normalizeText($('#firstHeading').text() || $('h1').first().text());
    if (heading) {
        return heading;
    }

    const pageTitle = normalizeText($('title').text());
    return pageTitle.replace(/\s*-\s*Liquipedia.*$/, '').trim();
}

function getContentRoot($) {
    return $('#mw-content-text').length ? $('#mw-content-text') : $('body');
}

function findFirstParagraph($) {
    const paragraphs = getContentRoot($).find('p');

    for (let i = 0; i < paragraphs.length; i++) {
        const text = normalizeText($(paragraphs[i]).text());
        if (text && !/^Retrieved from\b/i.test(text) && text.length > 20) {
            return text;
        }
    }

    return '';
}

function extractTier(text) {
    const match = text.match(/\bTier\s+(\d+)\b/i);
    return match ? match[1] : '';
}

function findTableRowByHeader($, headerText = '') {
    let target = null;

    getContentRoot($).find('tr').each((_, row) => {
        const header = normalizeText($(row).find('th').first().text());
        if (header && headerText && header.toLowerCase() === headerText.toLowerCase()) {
            target = $(row);
            return false;
        }
    });

    return target;
}

function collectTableFields($, matcher) {
    const tables = getContentRoot($).find('table');
    let target = null;

    tables.each((_, table) => {
        const text = normalizeText($(table).text());
        if (matcher(text)) {
            target = $(table);
            return false;
        }
    });

    if (!target) {
        return [];
    }

    const fields = [];
    target.find('tr').each((_, row) => {
        const cells = $(row).find('th, td');
        if (cells.length < 2) {
            return;
        }

        const label = cleanUnknownMarkers($(cells[0]).text());
        const value = cleanUnknownMarkers(
            cells
                .slice(1)
                .map((__, cell) => $(cell).text())
                .get()
                .join(' ')
        );

        if (
            label &&
            value &&
            label.length <= 40 &&
            label.split(' ').length <= 5 &&
            !/[.!?]/.test(label) &&
            !/^(usage alert|shareable|disassemble|recipe)$/i.test(label)
        ) {
            fields.push(`${label}: ${value}`);
        }
    });

    return fields;
}

function normalizeRecipeTitle(title = '') {
    return normalizeText(title).replace(/\s*\(\d+(?:\.\d+)?\)\s*$/, '').trim();
}

function getRecipeTableTitles($, scope) {
    if (!scope || scope.length === 0) {
        return [];
    }

    return uniqueTexts(
        scope
            .find('a[title]')
            .map((_, el) => normalizeRecipeTitle($(el).attr('title') || ''))
            .get()
            .filter(Boolean)
    );
}

function getItemRecipeTreeTables($) {
    const recipeRow = findTableRowByHeader($, 'Recipe');
    if (!recipeRow || recipeRow.length === 0) {
        return [];
    }

    const componentRow = recipeRow.next();
    if (!componentRow.length) {
        return [];
    }

    return componentRow
        .children('th, td')
        .first()
        .children('div')
        .filter((_, el) => /display:\s*table/i.test($(el).attr('style') || ''))
        .toArray()
        .map(el => $(el));
}

function getItemRecipeTreeData($, itemName = '') {
    const itemNameLower = itemName.toLowerCase();
    const tables = getItemRecipeTreeTables($);

    if (tables.length === 0) {
        return { currentIndex: -1, titleGroups: [] };
    }

    const titleGroups = tables.map(table => getRecipeTableTitles($, table));
    const currentIndex = titleGroups.findIndex(group => group.some(name => name.toLowerCase() === itemNameLower));

    return { currentIndex, titleGroups };
}

function extractItemRecipeCost($) {
    const recipeCost = normalizeText(getContentRoot($).find('abbr[title="Recipe Cost"]').first().text());
    return recipeCost && /^\d+(?:\.\d+)?$/.test(recipeCost) ? recipeCost : '';
}

function extractItemRecipeComponents($, itemName = '') {
    const { currentIndex, titleGroups } = getItemRecipeTreeData($, itemName);
    if (currentIndex === -1) {
        return [];
    }

    const itemNameLower = itemName.toLowerCase();
    const names = titleGroups
        .slice(currentIndex + 1)
        .flat()
        .filter(name => {
            if (!name) {
                return false;
            }

            if (/^Recipe$/i.test(name)) {
                return false;
            }

            if (itemName && name.toLowerCase() === itemNameLower) {
            return false;
        }

        if (/components required from the/i.test(name)) {
            return false;
        }

        return true;
    });

    return uniqueTexts(names);
}

function extractItemBuildsInto($, itemName = '') {
    const { currentIndex, titleGroups } = getItemRecipeTreeData($, itemName);
    if (currentIndex <= 0) {
        return [];
    }

    const itemNameLower = itemName.toLowerCase();
    const names = titleGroups
        .slice(0, currentIndex)
        .flat()
        .filter(name => {
            if (!name) {
                return false;
            }

            if (/^Recipe$/i.test(name)) {
                return false;
            }

            if (itemName && name.toLowerCase() === itemNameLower) {
                return false;
            }

            if (/components required from the/i.test(name)) {
                return false;
            }

            return true;
        });

    return uniqueTexts(names);
}

function collectHeaderSections($, headerSelector, stopSelector, maxSections = 8) {
    const sections = [];
    const headers = getContentRoot($).find(headerSelector);

    headers.each((_, header) => {
        if (sections.length >= maxSections) {
            return false;
        }

        const name = normalizeText($(header).text());
        if (!name) {
            return;
        }

        let current = $(header).next();
        const parts = [];

        while (current.length > 0 && !current.is(stopSelector)) {
            const text = normalizeText(current.text());
            if (text && text !== name) {
                parts.push(text);
            }
            current = current.next();
        }

        const description = normalizeText(parts.join(' '));
        if (description) {
            sections.push(`${name}: ${description}`);
        }
    });

    return sections;
}

function getDescriptiveLeafTexts($, scope, minLength = 25) {
    return scope
        .find('div')
        .filter((_, el) => $(el).children().length === 0)
        .map((_, el) => normalizeText($(el).text()))
        .get()
        .filter(text => {
            if (!text || text.length < minLength) {
                return false;
            }

            if (/^(Unit|Self|No|Passive|Ability|Hidden Modifier|Voice:|Released|Competitive Span)$/i.test(text)) {
                return false;
            }

            if (!/[A-Za-z]/.test(text)) {
                return false;
            }

            if (/^[\d\s./+%-]+$/.test(text)) {
                return false;
            }

            if (text.includes(' / ') && !text.includes('.')) {
                return false;
            }

            return true;
        });
}

function getOwnTexts($, scope, minLength = 1) {
    if (!scope || scope.length === 0) {
        return [];
    }

    const nodes = [scope.get(0), ...scope.find('div').get()];
    const seen = new Set();
    const texts = [];

    for (const node of nodes) {
        const text = cleanUnknownMarkers(
            $(node)
                .clone()
                .children()
                .remove()
                .end()
                .text()
        );

        if (!text || text.length < minLength) {
            continue;
        }

        if (seen.has(text)) {
            continue;
        }

        seen.add(text);
        texts.push(text);
    }

    return texts;
}

function getAbilityContentScope($, header) {
    const parts = [];
    let current = $(header).parent().next();

    while (current.length > 0) {
        const tagName = current[0]?.tagName?.toLowerCase();
        const text = cleanUnknownMarkers(current.text());
        const containsNextHeader = current.find('h2, h3, h4').length > 0;

        if (containsNextHeader && text) {
            break;
        }

        if (text && ['div', 'p', 'table'].includes(tagName)) {
            parts.push($.html(current));
        }

        if (parts.length >= 3) {
            break;
        }

        current = current.next();
    }

    return cheerio.load(`<div>${parts.join('')}</div>`)('div').first();
}

function uniqueTexts(values = []) {
    return [...new Set(values.filter(Boolean))];
}

function getHeadingBlock($, header) {
    const parent = $(header).parent();
    if (parent.length > 0 && /\bmw-heading\b/.test(parent.attr('class') || '')) {
        return parent;
    }

    return $(header);
}

function getSpellcardWrapper($, header) {
    let current = getHeadingBlock($, header).next();

    while (current.length > 0) {
        if (current.is('.spellcard-wrapper')) {
            return current;
        }

        const nested = current.find('.spellcard-wrapper').first();
        if (nested.length > 0) {
            return nested;
        }

        if (current.is('.mw-heading, h2, h3, h4, h5, h6')) {
            break;
        }

        current = current.next();
    }

    return cheerio.load('<div></div>')('div').first();
}

function normalizeSpellcardAbilityType(rawType = '', $, card) {
    const lower = String(rawType || '').toLowerCase();

    if (card?.find('.target_passive, .target_no').length > 0) {
        return 'passive';
    }

    if (card?.find('.target_unit, .target_point, .target_area, .target_vector, .target_toggle, .target_channeled').length > 0) {
        return 'active';
    }

    if (/\b(passive|no)\b/.test(lower)) {
        return 'passive';
    }

    if (/\b(unit|point|area|vector|toggle|channeled)\b/.test(lower)) {
        return 'active';
    }

    return '';
}

function scoreSpellcardNarrativeText(text, abilityName = '') {
    let score = 0;

    if (!text || text.length < 20) {
        return -100;
    }

    if (/\b(deals?|grants?|increases?|reduces?|restores?|pulls?|pushes?|stuns?|slows?|roots?|silences?|breaks?|launches?|latches?|heals?|summons?|applies?|takes?|triggers?|reflects?|dispels?)\b/i.test(text)) {
        score += 6;
    }

    if (/\d/.test(text)) {
        score += 3;
    }

    if (text.includes('.') || text.includes('%')) {
        score += 2;
    }

    if (abilityName && text.toLowerCase() === abilityName.toLowerCase()) {
        score -= 10;
    }

    if (/^(hidden modifier|details|status effects|show all)$/i.test(text)) {
        score -= 20;
    }

    if (/^modifier_/i.test(text)) {
        score -= 20;
    }

    if (/(cooldown sharing|ability draft|version \d|\bcreated\b)/i.test(text)) {
        score -= 12;
    }

    if (/^[A-Za-z' -]+:\s*$/.test(text)) {
        score -= 10;
    }

    return score;
}

function getSpellcardNarrativeTexts($, card, abilityName = '') {
    const texts = card
        .find('div')
        .filter((_, el) => {
            const scope = $(el);
            if (scope.children().length > 0) {
                return false;
            }

            if (scope.closest('.spelltad, .spelltad_value, .spelltrait_value, .spellcost_icon, .spellcost_value').length > 0) {
                return false;
            }

            return true;
        })
        .map((_, el) => sanitizeNarrativeText($(el).text()))
        .get()
        .filter(text => {
            if (!text || text.length < 20) {
                return false;
            }

            if (!/[A-Za-z]/.test(text)) {
                return false;
            }

            if (/^(hidden modifier|details|status effects|show all)$/i.test(text)) {
                return false;
            }

            if (/^modifier_/i.test(text)) {
                return false;
            }

            if (abilityName && text.toLowerCase() === abilityName.toLowerCase()) {
                return false;
            }

            return true;
        });

    return uniqueTexts(texts);
}

function isImportantSpellcardTrait(label = '') {
    if (!label) {
        return false;
    }

    if (/^(cast animation|downtime)$/i.test(label)) {
        return false;
    }

    return /(damage|duration|cooldown|mana|range|radius|chance|speed|slow|stun|root|silence|break|distance|pull|push|heal|health|regen|armor|amp|threshold|timer|count|number|bonus|search|projectile)/i.test(label);
}

function normalizeSpellcardTrait(label = '', value = '') {
    const cleanedLabel = sanitizeNarrativeText(label);
    const cleanedValue = sanitizeNarrativeText(value);

    if (!cleanedLabel || !cleanedValue) {
        return '';
    }

    return `${cleanedLabel}: ${cleanedValue}`;
}

function getSpellcardTraits($, card) {
    const traits = [];

    card.find('.spellcost_icon').each((_, icon) => {
        const label = cleanUnknownMarkers(
            $(icon).find('[title]').first().attr('title') ||
            $(icon).find('img[alt]').first().attr('alt') ||
            $(icon).text()
        );
        const value = cleanUnknownMarkers($(icon).next('.spellcost_value').first().text());
        const trait = normalizeSpellcardTrait(label, value);

        if (trait && isImportantSpellcardTrait(label)) {
            traits.push(trait);
        }
    });

    card.find('.spelltrait_value').each((_, el) => {
        const text = cleanUnknownMarkers($(el).text()).replace(/\s+/g, ' ');
        const match = text.match(/^(.{1,50}?):\s*(.+)$/);

        if (!match) {
            return;
        }

        const label = match[1].trim();
        const value = match[2].trim();
        const trait = normalizeSpellcardTrait(label, value);

        if (trait && isImportantSpellcardTrait(label)) {
            traits.push(trait);
        }
    });

    return uniqueTexts(traits);
}

function buildSpellcardDescription($, card, abilityName = '') {
    const narratives = getSpellcardNarrativeTexts($, card, abilityName);
    const mainText = narratives.find(text => scoreSpellcardNarrativeText(text, abilityName) >= 0) || '';
    const extraTexts = narratives
        .filter(text => text !== mainText && scoreSpellcardNarrativeText(text, abilityName) >= 4)
        .slice(0, 2);
    const traits = getSpellcardTraits($, card).slice(0, 6);
    const parts = [];

    if (mainText) {
        parts.push(mainText);
    }

    if (traits.length > 0) {
        parts.push(`${traits.join('. ')}.`);
    }

    if (extraTexts.length > 0) {
        parts.push(extraTexts.join(' '));
    }

    return sanitizeNarrativeText(parts.join(' ').replace(/\.\s*\./g, '.'));
}

function getSpellcardEntries($) {
    const entries = [];

    getContentRoot($).find('h3').each((_, header) => {
        const name = normalizeText($(header).text());
        if (!name) {
            return;
        }

        const wrapper = getSpellcardWrapper($, header);
        if (!wrapper.length) {
            return;
        }

        const card = wrapper.find('.spellcard').first();
        if (!card.length) {
            return;
        }

        const rawType = normalizeText(card.find('.spelltad_value').first().text());
        const type = normalizeSpellcardAbilityType(rawType, $, card);
        const description = buildSpellcardDescription($, card, name);

        if (description) {
            entries.push({
                name,
                type,
                description
            });
        }
    });

    return entries;
}

function formatSpellcardEntry(entry) {
    if (!entry || !entry.name || !entry.description) {
        return '';
    }

    return entry.type ? `${entry.name} [${entry.type}]: ${entry.description}` : `${entry.name}: ${entry.description}`;
}

function scoreAbilityText(text, abilityName = '') {
    let score = 0;

    if (!text || text.length < 20) {
        return -100;
    }

    if (/[A-Za-z]/.test(text)) {
        score += 1;
    }

    if (/\b(damages?|heals?|grants?|applies?|pulls?|pushes?|throws?|summons?|launches?|feeds?|creates?|switches?|channels?|teleports?|stuns?|roots?|slows?|silences?|reduces?|increases?|restores?|drags?|expels?|unloads?|dives?|slashes?|reappl(?:y|ies)|deals?|gobbles?|spits?|hops?|tosses?|shares?)\b/i.test(text)) {
        score += 7;
    }

    if (text.includes('.') || text.includes('!')) {
        score += 2;
    }

    if (abilityName && text.toLowerCase().includes(abilityName.toLowerCase())) {
        score -= 2;
    }

    if (/^(after generations|most bard monks|largo loves|the very first|little did|as former followers|a favorite from|with the help of|sylla studies|failure is just another|beadie and mortimer|the exiled|raised among)\b/i.test(text)) {
        score -= 8;
    }

    if (/^(hidden modifier|stunned|undispellable|on hidden entity)$/i.test(text)) {
        score -= 10;
    }

    if (/^[A-Za-z' -]+:\s/.test(text) || /\bx%|\bx\b/i.test(text)) {
        score -= 5;
    }

    if (/(hidden modifier|levels up|aghanim|cast animation|radius|duration|mana cost reduced|cooldown reductions)/i.test(text)) {
        score -= 4;
    }

    if (/^(passive|self|unit|units|area|enemy units|enemy heroes|spell \/ magical|target unit|no \/ toggle|no \/ channeled)$/i.test(text)) {
        score -= 12;
    }

    return score;
}

function getAbilityDescription($, header) {
    const name = cleanUnknownMarkers($(header).text());
    const block = getAbilityContentScope($, header);
    const candidates = getOwnTexts($, block, 20)
        .map((text, index) => ({ text, index, score: scoreAbilityText(text, name) }))
        .filter(candidate => candidate.score > -2)
        .sort((a, b) => b.score - a.score || b.text.length - a.text.length);

    const selected = candidates
        .filter((candidate, index) => index === 0 || (candidate.score >= 6 && candidate.score >= candidates[0].score - 2))
        .slice(0, 2)
        .sort((a, b) => a.index - b.index)
        .map(candidate => candidate.text);

    return sanitizeNarrativeText(selected.join(' '));
}

function getHeroAbilityType($, header) {
    const block = getAbilityContentScope($, header);
    const rawText = block.text().replace(/\s+/g, '');

    if (/AbilityPassive/i.test(rawText)) {
        return 'passive';
    }

    if (/Ability(No\/Toggle|No\/Channeled|NoAffects|UnitAffects|PointAffects|AreaAffects|TargetUnitAffects)/i.test(rawText)) {
        return 'active';
    }

    return '';
}

function scoreHeroDescriptionText(text, title = '') {
    let score = 0;

    if (!text || text.length < 30) {
        return -100;
    }

    if (title && new RegExp(`\\b${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) {
        score += 6;
    }

    if (/\bis a\b|\bunit\b|\bhero\b|\bcreep-hero\b/i.test(text)) {
        score += 4;
    }

    if (/\b(universal creep-hero|cannot gain experience|most spells and units interact)\b/i.test(text)) {
        score += 4;
    }

    if (/^(grabs|throws|deals|summons|applies|allows|grants|channels|unloads|expels|launches|swings|slashes|feeds|pulls|dives|releases|restores|whenever)\b/i.test(text)) {
        score -= 8;
    }

    if (/[A-Za-z' -]+:\s/.test(text) || /\bx%|\bx\b/i.test(text)) {
        score -= 6;
    }

    if (/(hidden modifier|hero model has the following hidden abilities|cooldown|cast animation|radius|damage per second|landing radius|mana cost)/i.test(text)) {
        score -= 4;
    }

    return score;
}

function isLikelyBioText(text = '', title = '') {
    if (!text) {
        return false;
    }

    if (title && new RegExp(`\\b${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text) && /\b(the|now|raised|discovered|survived|roams|throughout|exiled|ancient)\b/i.test(text)) {
        return true;
    }

    return /\b(raised|discovered|survived|roams|throughout|exiled|ancient|house|child|among|littered|wandered)\b/i.test(text);
}

function getHeroStatTable($) {
    let target = null;

    getContentRoot($).find('table').each((_, table) => {
        const text = normalizeText($(table).text());
        const directRows = $(table).children('tbody').children('tr');

        if (
            directRows.length >= 12 &&
            /Armor/i.test(text) &&
            /Magic Resist/i.test(text) &&
            /Move Speed/i.test(text) &&
            /Vision Range/i.test(text)
        ) {
            target = $(table);
            return false;
        }
    });

    return target;
}

function getHeroLevelBonusTable($) {
    let target = null;

    getContentRoot($).find('table').each((_, table) => {
        const text = normalizeText($(table).text());
        const directRows = $(table).children('tbody').children('tr');

        if (
            directRows.length >= 4 &&
            /Grants the following bonuses per level/i.test(text) &&
            /attack speed/i.test(text)
        ) {
            target = $(table);
            return false;
        }
    });

    return target;
}

function getHeroCard(row, $) {
    const clonedRow = $(row).clone();
    clonedRow.find('table').remove();
    return clonedRow.children('td').children('div').first();
}

function getHeroCardPrimaryText(row, $) {
    const card = getHeroCard(row, $);
    if (!card.length) {
        return '';
    }

    return normalizeText(
        card
            .clone()
            .children('div')
            .remove()
            .end()
            .text()
    );
}

function getHeroCardLabelText(row, $) {
    const card = getHeroCard(row, $);
    if (!card.length) {
        return '';
    }

    return normalizeText(card.children('div').first().text());
}

function getHeroCardSecondaryText(row, $) {
    const card = getHeroCard(row, $);
    if (!card.length) {
        return '';
    }

    return normalizeText(card.children('div').eq(1).text());
}

function extractFirstNumber(text = '') {
    const match = String(text || '').match(/-?\d+(?:\.\d+)?/);
    return match ? match[0] : '';
}

function extractRangeNumbers(text = '') {
    const match = String(text || '').match(/(-?\d+(?:\.\d+)?)\s*[‒–-]\s*(-?\d+(?:\.\d+)?)/);
    return match ? { min: match[1], max: match[2] } : null;
}

function extractHeroLevelBonuses($) {
    const table = getHeroLevelBonusTable($);
    if (!table || table.length === 0) {
        return [];
    }

    const rows = table.children('tbody').children('tr');
    const bonuses = [];

    rows.each((_, row) => {
        const text = normalizeText($(row).text());
        if (!text || /Grants the following bonuses per level/i.test(text)) {
            return;
        }

        const healthGain = text.match(/\+?(\d+(?:\.\d+)?)\s*HP\b/i);
        const healthRegenGain = text.match(/\+?(\d+(?:\.\d+)?)\s*HP\s*regeneration\b/i);
        const armorGain = text.match(/\+?(\d+(?:\.\d+)?)\s*armor\b/i);
        const attackSpeedGain = text.match(/\+?(\d+(?:\.\d+)?)\s*attack speed\b/i);
        const manaGain = text.match(/\+?(\d+(?:\.\d+)?)\s*MP\b/i);
        const manaRegenGain = text.match(/\+?(\d+(?:\.\d+)?)\s*MP\s*regeneration\b/i);
        const magicResistanceGain = text.match(/\+?(\d+(?:\.\d+)?)%?\s*base magic resistance\b/i);
        const attackDamageGain = text.match(/\+?(\d+(?:\.\d+)?)\s*Main Attack Damage\b/i);

        if (healthGain) bonuses.push(`Health: ${healthGain[1]}`);
        if (healthRegenGain) bonuses.push(`Health Regen: ${healthRegenGain[1]}`);
        if (armorGain) bonuses.push(`Armor: ${armorGain[1]}`);
        if (attackSpeedGain) bonuses.push(`Attack Speed: ${attackSpeedGain[1]}`);
        if (manaGain) bonuses.push(`Mana: ${manaGain[1]}`);
        if (manaRegenGain) bonuses.push(`Mana Regen: ${manaRegenGain[1]}`);
        if (magicResistanceGain) bonuses.push(`Magic Resistance: ${magicResistanceGain[1]}`);
        if (attackDamageGain) bonuses.push(`Main Attack Damage: ${attackDamageGain[1]}`);
    });

    return uniqueTexts(bonuses);
}

function extractHeroDetailedStats($) {
    const table = getHeroStatTable($);
    if (!table || table.length === 0) {
        return [];
    }

    const rows = table.children('tbody').children('tr');
    const stats = [];
    const healthRow = rows.eq(1);
    const manaRow = rows.eq(2);
    const armorRow = rows.eq(3);
    const magicResistanceRow = rows.eq(4);
    const damageRow = rows.eq(5);
    const projectileSpeedRow = rows.eq(6);
    const attackRangeRow = rows.eq(7);
    const attackSpeedRow = rows.eq(8);
    const animationRow = rows.eq(9);
    const moveSpeedRow = rows.eq(10);
    const turnRateRow = rows.eq(11);
    const collisionSizeRow = rows.eq(12);
    const visionRangeRow = rows.eq(14);

    const healthValue = extractFirstNumber(getHeroCardPrimaryText(healthRow, $));
    const healthRegen = extractFirstNumber(getHeroCardLabelText(healthRow, $));
    if (healthValue) {
        stats.push(`Health: ${healthValue}`);
    }
    if (healthRegen) {
        stats.push(`Health Regen: ${healthRegen}`);
    }

    const manaValue = extractFirstNumber(getHeroCardPrimaryText(manaRow, $));
    const manaRegen = extractFirstNumber(getHeroCardLabelText(manaRow, $));
    if (manaValue) {
        stats.push(`Mana: ${manaValue}`);
    }
    if (manaRegen) {
        stats.push(`Mana Regen: ${manaRegen}`);
    }

    const armorValue = extractFirstNumber(getHeroCardPrimaryText(armorRow, $));
    if (armorValue) {
        stats.push(`Armor: ${armorValue}`);
    }

    const magicResistanceValue = extractFirstNumber(getHeroCardPrimaryText(magicResistanceRow, $).replace(/%/g, ''));
    if (magicResistanceValue) {
        stats.push(`Magic Resistance: ${magicResistanceValue}`);
    }

    const damageRange = extractRangeNumbers(getHeroCardPrimaryText(damageRow, $));
    if (damageRange) {
        stats.push(`Damage Min: ${damageRange.min}`);
        stats.push(`Damage Max: ${damageRange.max}`);
    }
    const damageAverage = getHeroCardSecondaryText(damageRow, $).match(/(\d+(?:\.\d+)?)\s*Avg/i);
    if (damageAverage) {
        stats.push(`Damage Average: ${damageAverage[1]}`);
    }

    const projectileSpeed = getHeroCardPrimaryText(projectileSpeedRow, $);
    if (projectileSpeed) {
        stats.push(`Projectile Speed: ${projectileSpeed}`);
    }

    const attackRange = extractFirstNumber(getHeroCardPrimaryText(attackRangeRow, $));
    if (attackRange) {
        stats.push(`Attack Range: ${attackRange}`);
    }
    const attackAcquisitionRange = extractFirstNumber(getHeroCardSecondaryText(attackRangeRow, $));
    if (attackAcquisitionRange) {
        stats.push(`Attack Acquisition Range: ${attackAcquisitionRange}`);
    }

    const attackSpeedPrimary = getHeroCardPrimaryText(attackSpeedRow, $);
    const attackSpeedMatch = attackSpeedPrimary.match(/^(\d+(?:\.\d+)?)\s*\((\d+(?:\.\d+)?)\)$/);
    if (attackSpeedMatch) {
        stats.push(`Attack Speed: ${attackSpeedMatch[1]}`);
        stats.push(`Total Attack Speed: ${attackSpeedMatch[2]}`);
    } else {
        const attackSpeedValue = extractFirstNumber(attackSpeedPrimary);
        if (attackSpeedValue) {
            stats.push(`Attack Speed: ${attackSpeedValue}`);
        }
    }
    const baseAttackTime = getHeroCardSecondaryText(attackSpeedRow, $).match(/(\d+(?:\.\d+)?)\s*BAT/i);
    if (baseAttackTime) {
        stats.push(`Base Attack Time: ${baseAttackTime[1]}`);
    }

    const animationMatch = getHeroCardPrimaryText(animationRow, $).match(/(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)/);
    if (animationMatch) {
        stats.push(`Animation Point: ${animationMatch[1]}`);
        stats.push(`Animation Backswing: ${animationMatch[2]}`);
    }

    const moveSpeed = extractFirstNumber(getHeroCardPrimaryText(moveSpeedRow, $));
    if (moveSpeed) {
        stats.push(`Move Speed: ${moveSpeed}`);
    }

    const turnRate = extractFirstNumber(getHeroCardPrimaryText(turnRateRow, $));
    if (turnRate) {
        stats.push(`Turn Rate: ${turnRate}`);
    }

    const collisionSize = extractFirstNumber(getHeroCardPrimaryText(collisionSizeRow, $));
    if (collisionSize) {
        stats.push(`Collision Size: ${collisionSize}`);
    }

    const visionMatch = getHeroCardPrimaryText(visionRangeRow, $).match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
    if (visionMatch) {
        stats.push(`Vision Range Day: ${visionMatch[1]}`);
        stats.push(`Vision Range Night: ${visionMatch[2]}`);
    }

    return uniqueTexts(stats);
}

function extractHeroData(html) {
    const $ = cheerio.load(html);
    const lines = [];
    const title = getTitle($);
    const contentText = normalizeText(getContentRoot($).text());

    appendSection(lines, 'HERO NAME', title);

    const categories = $('#catlinks li a')
        .map((_, el) => normalizeText($(el).text()))
        .get();
    const heroTags = categories.filter(tag => /heroes$/i.test(tag) || /hero$/i.test(tag));
    if (heroTags.length) {
        appendSection(lines, 'CATEGORY TAGS', heroTags);
    }

    const attackTypeMatch = categories.find(tag => /^(Melee|Ranged)\s+heroes?$/i.test(tag))?.match(/^(Melee|Ranged)\s+heroes?$/i);
    if (attackTypeMatch) {
        appendSection(lines, 'ATTACK TYPE', attackTypeMatch[1].charAt(0).toUpperCase() + attackTypeMatch[1].slice(1).toLowerCase());
    }

    const roles = [...new Set((contentText.match(/\bCarry\b|\bSupport\b|\bNuker\b|\bInitiator\b|\bDurable\b|\bDisabler\b|\bEscape\b|\bPusher\b|\bJungler\b/gi) || []).map(role => role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()))];
    appendSection(lines, 'ROLES', roles);

    const statMatches = [];
    getContentRoot($).find('*').each((_, el) => {
        const text = normalizeText($(el).clone().children().remove().end().text());
        if (/^\d+\s*\+\s*\d+(?:\.\d+)?$/.test(text)) {
            statMatches.push(text);
        }
    });

    if (statMatches.length >= 3) {
        const parsedStats = statMatches.slice(0, 3).map(stat => {
            const match = stat.match(/^(\d+)\s*\+\s*(\d+(?:\.\d+)?)$/);
            if (!match) {
                return { base: stat, gain: '' };
            }

            return {
                base: match[1],
                gain: match[2]
            };
        });

        appendSection(lines, 'ATTRIBUTES', [
            `Strength: ${parsedStats[0].base}`,
            `Agility: ${parsedStats[1].base}`,
            `Intelligence: ${parsedStats[2].base}`
        ]);
        appendSection(lines, 'ATTRIBUTE GAINS', [
            `Strength Gain: ${parsedStats[0].gain}`,
            `Agility Gain: ${parsedStats[1].gain}`,
            `Intelligence Gain: ${parsedStats[2].gain}`
        ]);
    }

    appendSection(lines, 'STAT GAINS', extractHeroLevelBonuses($));
    appendSection(lines, 'HERO STATS', extractHeroDetailedStats($));

    const quoteText = sanitizeNarrativeText(getContentRoot($).find('blockquote').first().text());
    const descriptionCandidates = [...new Set([
        ...getOwnTexts($, getContentRoot($), 40),
        ...getDescriptiveLeafTexts($, getContentRoot($), 40)
    ])]
        .map(text => ({ text, score: scoreHeroDescriptionText(text, title) }))
        .filter(candidate => candidate.score > -2)
        .sort((a, b) => b.score - a.score || b.text.length - a.text.length);
    const fallbackDescription = descriptionCandidates[0]?.text || '';
    const descriptionParts = [quoteText];
    if (!quoteText) {
        descriptionParts.push(fallbackDescription);
    } else if ((descriptionCandidates[0]?.score ?? -100) >= 6 && isLikelyBioText(fallbackDescription, title)) {
        descriptionParts.push(fallbackDescription);
    }
    appendSection(lines, 'DESCRIPTION', sanitizeNarrativeText(descriptionParts.filter(Boolean).join(' ')));

    const abilities = [];
    getContentRoot($).find('h3').each((_, header) => {
        const name = normalizeText($(header).text());
        if (!name || /^(Aghanim's|Talents|Hero Model|The International)$/i.test(name)) {
            return;
        }

        const description = getAbilityDescription($, header);
        const type = getHeroAbilityType($, header);
        if (description) {
            abilities.push(type ? `${name} [${type}]: ${description}` : `${name}: ${description}`);
        }
    });
    appendSection(lines, 'ABILITIES', abilities);

    return lines.join('\n').trim();
}

function extractItemData(html) {
    const $ = cheerio.load(html);
    const lines = [];
    const title = getTitle($);
    const spellcards = getSpellcardEntries($);

    appendSection(lines, 'ITEM NAME', title);

    const description = normalizeText($('td[style*="font-style:italic"]').text()) || findFirstParagraph($);
    appendSection(lines, 'DESCRIPTION', description);

    const stats = collectTableFields($, text => /Cost|Sell Value|Bonus/i.test(text))
        .map(field => field.replace(/^(Cost:\s*\d+(?:\.\d+)?)\s*\(\d+(?:\.\d+)?\)\s*$/i, '$1'));
    appendSection(lines, 'ITEM STATS', stats);

    appendSection(lines, 'RECIPE COST', extractItemRecipeCost($));
    appendSection(lines, 'RECIPE COMPONENTS', extractItemRecipeComponents($, title));
    appendSection(lines, 'BUILDS INTO', extractItemBuildsInto($, title));

    appendSection(lines, 'ABILITIES', spellcards.map(formatSpellcardEntry).filter(Boolean));

    const notes = collectHeaderSections($, 'h2, h3', 'h2, h3', 6).filter(section => /additional information|notes|mechanics/i.test(section));
    appendSection(lines, 'NOTES', notes);

    return lines.join('\n').trim();
}

function extractNeutralData(html) {
    const $ = cheerio.load(html);
    const lines = [];
    const title = getTitle($);
    const intro = findFirstParagraph($);
    const spellcards = getSpellcardEntries($);
    const firstEffectDescription = spellcards[0]?.description || '';
    const genericIntro = /^.+ is a Tier \d+ (neutral item )?artifact\.?$/i.test(intro);

    appendSection(lines, 'NEUTRAL ITEM NAME', title);
    appendSection(lines, 'DESCRIPTION', genericIntro ? firstEffectDescription : intro || firstEffectDescription);

    const tier = extractTier(intro);
    appendSection(lines, 'TIER', tier);

    const fields = collectTableFields($, text => /Shareable|Usage Alert|Recipe|Bonus/i.test(text));
    appendSection(lines, 'PROPERTIES', fields);

    appendSection(lines, 'EFFECTS', spellcards.map(formatSpellcardEntry).filter(Boolean));

    return lines.join('\n').trim();
}

function extractEnchantmentData(html) {
    const $ = cheerio.load(html);
    const lines = [];
    const title = getTitle($);
    const intro = findFirstParagraph($);

    appendSection(lines, 'ENCHANTMENT NAME', title);
    appendSection(lines, 'DESCRIPTION', intro);

    const tier = extractTier(intro);
    appendSection(lines, 'TIER', tier);

    const fields = collectTableFields($, text => /Shareable|Usage Alert|Recipe|Bonus/i.test(text));
    appendSection(lines, 'BONUSES', fields);

    const additionalInfo = [];
    getContentRoot($).find('h2').each((_, header) => {
        const name = normalizeText($(header).text());
        if (!/additional information|notes|mechanics/i.test(name)) {
            return;
        }

        let current = $(header).next();
        while (current.length > 0 && !current.is('h2')) {
            const text = normalizeText(current.text());
            if (text) {
                additionalInfo.push(text);
            }
            current = current.next();
        }
    });
    appendSection(lines, 'NOTES', additionalInfo);

    return lines.join('\n').trim();
}

function genericCleanup(html) {
    const $ = cheerio.load(html);
    $('script, style, nav, footer, audio, source, img, button, noscript, svg').remove();

    const title = getTitle($);
    const content = normalizeText(getContentRoot($).text());
    return [title, content].filter(Boolean).join('\n\n').trim();
}

function detectCategory(html) {
    const lower = html.toLowerCase();
    if (lower.includes('neutral item') && lower.includes('enchantment')) {
        return 'enchantment';
    }
    if (lower.includes('neutral item') || lower.includes('neutral artifact')) {
        return 'neutral';
    }
    if (lower.includes('heroes') || lower.includes('hero model') || lower.includes('aghanim')) {
        return 'hero';
    }
    return 'item';
}

function optimizeHtmlForOllama(html, category = 'auto') {
    try {
        const resolvedCategory = category === 'auto' ? detectCategory(html) : category;

        let extracted = '';
        switch (resolvedCategory) {
            case 'hero':
                extracted = extractHeroData(html);
                break;
            case 'neutral':
                extracted = extractNeutralData(html);
                break;
            case 'enchantment':
                extracted = extractEnchantmentData(html);
                break;
            case 'item':
            default:
                extracted = extractItemData(html);
                break;
        }

        if (extracted && extracted.length > 80) {
            return extracted;
        }

        return genericCleanup(html);
    } catch (error) {
        console.error('Error optimizing HTML for Ollama:', error);
        return genericCleanup(html);
    }
}

export { optimizeHtmlForOllama };
