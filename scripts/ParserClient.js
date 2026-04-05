import { ClaudeMessageBatchClient } from './ClaudeBatchClient.js';
import { OllamaClient } from './OllamaClient.js';

function createParserClient(templatePath = '') {
    const backend = (process.env.PARSER_BACKEND || 'claude').toLowerCase();

    switch (backend) {
        case 'ollama':
            // Use simplified template for Ollama based on the type
            let ollamaTemplate = templatePath;
            if (templatePath.includes('parse-item-page')) {
                ollamaTemplate = templatePath.replace('parse-item-page.txt', 'parse-item-page-ollama.txt');
            } else if (templatePath.includes('parse-hero-page')) {
                ollamaTemplate = templatePath.replace('parse-hero-page.txt', 'parse-hero-page-ollama.txt');
            } else if (templatePath.includes('parse-enchantment-page')) {
                ollamaTemplate = templatePath.replace('parse-enchantment-page.txt', 'parse-enchantment-page-ollama.txt');
            } else if (templatePath.includes('parse-neutral-page')) {
                ollamaTemplate = templatePath.replace('parse-neutral-page.txt', 'parse-neutral-page-ollama.txt');
            }
            return new OllamaClient({ temperature: 0.4 }, ollamaTemplate);
        case 'claude':
            return new ClaudeMessageBatchClient(process.env.CLAUDE_API_KEY, templatePath);
        default:
            throw new Error(`Unsupported parser backend: ${backend}`);
    }
}

export { createParserClient };