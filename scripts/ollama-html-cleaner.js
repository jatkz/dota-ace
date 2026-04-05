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

    appendSection(lines, 'ITEM NAME', title);

    const description = normalizeText($('td[style*="font-style:italic"]').text()) || findFirstParagraph($);
    appendSection(lines, 'DESCRIPTION', description);

    const stats = collectTableFields($, text => /Cost|Sell Value|Bonus|Active|Passive/i.test(text));
    appendSection(lines, 'ITEM STATS', stats);

    const abilitiesHeader = getContentRoot($).find('h2, h3').filter((_, el) => /Abilities?/i.test(normalizeText($(el).text()))).first();
    if (abilitiesHeader.length) {
        const abilities = [];
        let current = abilitiesHeader.next();

        while (current.length > 0 && !current.is('h2, h3')) {
            const text = normalizeText(current.text());
            if (text && text.length > 20) {
                abilities.push(text);
            }
            current = current.next();
        }

        appendSection(lines, 'ABILITIES', abilities);
    }

    const notes = collectHeaderSections($, 'h2, h3', 'h2, h3', 6).filter(section => /additional information|notes|mechanics/i.test(section));
    appendSection(lines, 'NOTES', notes);

    return lines.join('\n').trim();
}

function extractNeutralData(html) {
    const $ = cheerio.load(html);
    const lines = [];
    const title = getTitle($);
    const intro = findFirstParagraph($);

    appendSection(lines, 'NEUTRAL ITEM NAME', title);
    appendSection(lines, 'DESCRIPTION', intro);

    const tier = extractTier(intro);
    appendSection(lines, 'TIER', tier);

    const fields = collectTableFields($, text => /Shareable|Usage Alert|Recipe|Bonus|Active|Passive/i.test(text));
    appendSection(lines, 'PROPERTIES', fields);

    const abilities = [];
    const headers = getContentRoot($).find('h3');
    headers.each((_, header) => {
        const name = normalizeText($(header).text());
        if (!name) {
            return;
        }

        const block = $(header).next();
        const description = getDescriptiveLeafTexts($, block).slice(0, 2).join(' ');
        if (description) {
            abilities.push(`${name}: ${description}`);
        }
    });
    appendSection(lines, 'EFFECTS', abilities);

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
