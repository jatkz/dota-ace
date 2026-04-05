import { ClaudeMessageBatchClient } from './ClaudeBatchClient.js';
import { OllamaClient } from './OllamaClient.js';

function createParserClient(templatePath = '') {
    const backend = (process.env.PARSER_BACKEND || 'claude').toLowerCase();

    switch (backend) {
        case 'ollama':
            return new OllamaClient({}, templatePath);
        case 'claude':
            return new ClaudeMessageBatchClient(process.env.CLAUDE_API_KEY, templatePath);
        default:
            throw new Error(`Unsupported parser backend: ${backend}`);
    }
}

export { createParserClient };