import fs from 'fs';
import fetch from 'node-fetch';
import { optimizeHtmlForOllama } from './ollama-html-cleaner.js';

class OllamaClient {
    constructor({ model, baseUrl, temperature, maxTokens } = {}, templatePath = '') {
        this.model = model || process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b';
        this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.temperature = temperature ?? parseFloat(process.env.OLLAMA_TEMPERATURE || '0.4');
        this.maxTokens = maxTokens ?? 5000;
        this.stream = false;

        if (templatePath && fs.existsSync(templatePath)) {
            this.system = fs.readFileSync(templatePath, 'utf8');
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

    async batchAnalyzeFile(batchConfig) {
        const results = [];

        for (let idx = 0; idx < batchConfig.length; idx++) {
            const item = batchConfig[idx];
            console.log(`  [${idx + 1}/${batchConfig.length}] Processing ${item.custom_id}...`);
            
            try {
                const rawHtml = fs.readFileSync(item.filePath, 'utf8');
                // Clean the HTML for better Ollama processing
                const cleanedContent = optimizeHtmlForOllama(rawHtml);
                
                const prompt = `Parse this item data into JSON:\n${cleanedContent}\n\nIMPORTANT: Return ONLY valid JSON, no extra text.`;
                
                console.log(`    → Sending to Ollama (${cleanedContent.length} chars)...`);
                const text = await this.generate(prompt, this.system);
                console.log(`    → Received response (${text.length} chars)`);
                
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