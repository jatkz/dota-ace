import fs from 'fs';
import fetch from 'node-fetch';

class OllamaClient {
    constructor({ model, baseUrl, temperature, maxTokens } = {}, templatePath = '') {
        this.model = model || process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b';
        this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.temperature = temperature ?? 0;
        this.maxTokens = maxTokens ?? 5000;
        this.stream = false;

        if (templatePath && fs.existsSync(templatePath)) {
            this.system = fs.readFileSync(templatePath, 'utf8');
        }
    }

    async generate(prompt) {
        const body = {
            model: this.model,
            prompt,
            stream: this.stream,
            temperature: this.temperature,
            max_tokens: this.maxTokens
        };

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

        for (const item of batchConfig) {
            const content = fs.readFileSync(item.filePath, 'utf8');
            const prompt = `${this.system || ''}\n\nParse this HTML into JSON:\n${content}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include any other text, explanations, or markdown formatting.`;
            const text = await this.generate(prompt);
            results.push({ custom_id: item.custom_id, output: text });
        }

        return {
            success: true,
            content: results
        };
    }
}

export { OllamaClient };