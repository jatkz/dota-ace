import fs from 'fs';
import fetch from 'node-fetch';
import { optimizeHtmlForOllama, extractHeroCoreData, extractHeroAbilityPayloads } from './ollama-html-cleaner.js';

class OllamaClient {
    constructor({ model, baseUrl, temperature, maxTokens } = {}, templatePath = '') {
        this.model = model || process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b';
        this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.temperature = temperature ?? parseFloat(process.env.OLLAMA_TEMPERATURE || '0.4');
        this.maxTokens = maxTokens ?? 5000;
        this.stream = false;
        this.category = this.inferCategory(templatePath);
        this.promptLabel = this.getPromptLabel(this.category);
        this.enableHeroSplitPass = this.category === 'hero' && process.env.OLLAMA_HERO_SPLIT_PASS !== '0';

        if (templatePath && fs.existsSync(templatePath)) {
            this.system = fs.readFileSync(templatePath, 'utf8');
        }

        if (this.enableHeroSplitPass && templatePath.includes('parse-hero-page-ollama.txt')) {
            const heroCoreTemplatePath = templatePath.replace('parse-hero-page-ollama.txt', 'parse-hero-core-ollama.txt');
            const heroAbilityTemplatePath = templatePath.replace('parse-hero-page-ollama.txt', 'parse-hero-ability-ollama.txt');

            if (fs.existsSync(heroCoreTemplatePath)) {
                this.heroCoreSystem = fs.readFileSync(heroCoreTemplatePath, 'utf8');
            }

            if (fs.existsSync(heroAbilityTemplatePath)) {
                this.heroAbilitySystem = fs.readFileSync(heroAbilityTemplatePath, 'utf8');
            }
        }
    }

    inferCategory(templatePath = '') {
        if (templatePath.includes('parse-hero-page')) {
            return 'hero';
        }
        if (templatePath.includes('parse-neutral-page')) {
            return 'neutral';
        }
        if (templatePath.includes('parse-enchantment-page')) {
            return 'enchantment';
        }
        return 'item';
    }

    getPromptLabel(category) {
        switch (category) {
            case 'hero':
                return 'hero';
            case 'neutral':
                return 'neutral item';
            case 'enchantment':
                return 'enchantment';
            case 'item':
            default:
                return 'item';
        }
    }

    async generate(prompt, systemPrompt = null) {
        // Use chat API for system prompts
        if (systemPrompt) {
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ];

            const body = {
                model: this.model,
                messages,
                stream: this.stream,
                temperature: this.temperature,
                max_tokens: this.maxTokens
            };

            try {
                const response = await fetch(`${this.baseUrl}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`Ollama chat failed: ${response.status} ${response.statusText} - ${text}`);
                }

                const data = await response.json();
                return this.extractTextFromChatResponse(data);
            } catch (error) {
                console.error('      [generate] Error:', error.message);
                throw error;
            }
        } else {
            // Fallback to generate API
            const body = {
                model: this.model,
                prompt,
                stream: this.stream,
                temperature: this.temperature,
                max_tokens: this.maxTokens
            };

            try {
                const response = await fetch(`${this.baseUrl}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`Ollama generate failed: ${response.status} ${response.statusText} - ${text}`);
                }

                const data = await response.json();
                return this.extractTextFromResponse(data);
            } catch (error) {
                console.error('      [generate] Error:', error.message);
                throw error;
            }
        }
    }

    extractTextFromChatResponse(data) {
        if (!data) {
            throw new Error('Ollama chat response was empty');
        }

        // Ollama chat response has a 'message' field
        if (data.message && data.message.content) {
            return data.message.content;
        }

        throw new Error('Unable to extract text from Ollama chat response');
    }

    extractTextFromResponse(data) {
        if (!data) {
            throw new Error('Ollama response was empty');
        }

        // Ollama response has a 'response' field
        if (data.response) {
            return data.response;
        }

        // Fallback for other formats
        if (data.choices && data.choices.length > 0) {
            const choice = data.choices[0];
            if (choice.message && choice.message.content && choice.message.content.length > 0) {
                const contentItem = choice.message.content[0];
                if (contentItem.text) return contentItem.text;
            }
            if (choice.text) return choice.text;
        }

        if (data.output && data.output.length > 0) {
            const content = data.output[0].content;
            if (content && content.length > 0 && content[0].text) {
                return content[0].text;
            }
        }

        if (typeof data === 'string') {
            return data;
        }

        throw new Error('Unable to extract text from Ollama response');
    }

    cleanupAndSave(text, outputPath) {
        const jsonString = text
            .replace(/^```json\n/, '')
            .replace(/\n```$/, '');

        fs.writeFileSync(outputPath, jsonString);
    }

    cleanJsonText(text = '') {
        let content = String(text || '').trim();

        if (content.startsWith('```json')) {
            content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (content.startsWith('```')) {
            content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const firstBrace = content.indexOf('{');
        const lastBrace = content.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            content = content.slice(firstBrace, lastBrace + 1);
        }

        return content.trim();
    }

    parseJsonResponse(text = '', label = 'response') {
        const cleaned = this.cleanJsonText(text);

        try {
            return JSON.parse(cleaned);
        } catch (error) {
            throw new Error(`Invalid JSON from ${label}: ${error.message}`);
        }
    }

    normalizeHeroAbilityResult(parsedAbility = {}, fallback = {}) {
        const name = String(parsedAbility?.name || fallback.name || '').trim();
        const rawType = String(parsedAbility?.type || fallback.typeHint || '').trim().toLowerCase();
        const type = rawType.includes('passive') && !rawType.includes('active')
            ? 'passive'
            : rawType
                ? 'active'
                : (fallback.typeHint || '');
        const description = String(parsedAbility?.description || fallback.description || '').trim();

        return {
            name,
            type,
            description
        };
    }

    async analyzeHeroWithSplit(rawHtml, item) {
        const heroCoreContent = extractHeroCoreData(rawHtml);
        const heroAbilityPayloads = extractHeroAbilityPayloads(rawHtml);

        console.log(`    → Sending hero core to Ollama (${heroCoreContent.length} chars)...`);
        const coreText = await this.generate(
            `Parse this hero core data into JSON:\n${heroCoreContent}\n\nIMPORTANT: Return ONLY valid JSON, no extra text.`,
            this.heroCoreSystem || this.system
        );
        console.log(`    → Received hero core (${coreText.length} chars)`);
        const coreData = this.parseJsonResponse(coreText, `${item.custom_id} core`);

        const abilities = [];
        for (let abilityIndex = 0; abilityIndex < heroAbilityPayloads.length; abilityIndex++) {
            const abilityPayload = heroAbilityPayloads[abilityIndex];
            console.log(`      → Ability ${abilityIndex + 1}/${heroAbilityPayloads.length}: ${abilityPayload.name} (${abilityPayload.prompt.length} chars)...`);

            try {
                const abilityText = await this.generate(
                    `Parse this single hero ability into JSON:\n${abilityPayload.prompt}\n\nIMPORTANT: Return ONLY valid JSON, no extra text.`,
                    this.heroAbilitySystem || this.system
                );
                const parsedAbility = this.parseJsonResponse(abilityText, `${item.custom_id} ability ${abilityPayload.name}`);
                abilities.push(this.normalizeHeroAbilityResult(parsedAbility, abilityPayload));
            } catch (error) {
                console.error(`      ✗ Ability fallback for ${abilityPayload.name}:`, error.message);
                abilities.push(this.normalizeHeroAbilityResult({}, abilityPayload));
            }
        }

        return JSON.stringify({
            ...coreData,
            abilities
        }, null, 2);
    }

    async batchAnalyzeFile(batchConfig) {
        const results = [];

        for (let idx = 0; idx < batchConfig.length; idx++) {
            const item = batchConfig[idx];
            console.log(`  [${idx + 1}/${batchConfig.length}] Processing ${item.custom_id}...`);
            
            try {
                const rawHtml = fs.readFileSync(item.filePath, 'utf8');
                let text = '';

                if (this.enableHeroSplitPass && this.heroCoreSystem && this.heroAbilitySystem) {
                    try {
                        text = await this.analyzeHeroWithSplit(rawHtml, item);
                    } catch (heroSplitError) {
                        console.error(`      [hero split] Falling back to single pass:`, heroSplitError.message);
                    }
                }

                if (!text) {
                    const cleanedContent = optimizeHtmlForOllama(rawHtml, this.category);
                    const prompt = `Parse this ${this.promptLabel} data into JSON:\n${cleanedContent}\n\nIMPORTANT: Return ONLY valid JSON, no extra text.`;

                    console.log(`    → Sending to Ollama (${cleanedContent.length} chars)...`);
                    text = await this.generate(prompt, this.system);
                    console.log(`    → Received response (${text.length} chars)`);
                }
                
                results.push({ custom_id: item.custom_id, output: text });
            } catch (error) {
                console.error(`    ✗ Error processing ${item.custom_id}:`, error.message);
                results.push({ custom_id: item.custom_id, output: '', error: error.message });
            }
        }

        return {
            success: true,
            content: results
        };
    }
}

export { OllamaClient };
