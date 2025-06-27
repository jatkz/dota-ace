
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const API_KEY = process.env.CLAUDE_API_KEY;

class ClaudeMessageBatchClient {
    constructor(apiKey = API_KEY, templatePath = '') {
        if (!apiKey) {
            throw new Error('API key is required. Set ANTHROPIC_API_KEY in your .env file');
        }

        // Pass fetch to the Anthropic client
        this.anthropic = new Anthropic({
            apiKey,
        });

        this.defaultModel = 'claude-sonnet-4-20250514';
        this.max_tokens = 5000;
        this.temperature = 0;
        if (fs.existsSync(templatePath)) {
            const systemPrompt = fs.readFileSync(templatePath, 'utf8');
            this.system = systemPrompt
        }
    }

    async listBatches() {
        try {

            const response = await this.anthropic.messages.batches.list({
                limit: 20
            });

            return {
                success: true,
                content: response
            };
        } catch (error) {
            console.log(error);
            return {
                success: false,
                error: error.message,
                content: null
            };
        }
    }

    async retrieveBatch(messageBatchId) {
        try {

            const response = await this.anthropic.messages.batches.retrieve(messageBatchId);

            return response
        } catch (error) {
            console.log(error);
            return {
                success: false,
                error: error.message,
                content: null
            };
        }
    }

    async retrieveBatchResult(messageBatchId, batchType) {
        try {
            const batchTypes = ['hero', 'item', 'neutral', 'enchantment'];
            let path;
            switch (batchType) {
                case 'hero':
                    path = `./scripts/outputs/${batchTypes[0]}/conversion`
                    break;
                case 'item':
                    path = `./scripts/outputs/${batchTypes[1]}/conversion`
                    break;
                case 'neutral':
                    path = `./scripts/outputs/${batchTypes[2]}/conversion`
                    break;
                case 'enchantment':
                    path = `./scripts/outputs/${batchTypes[3]}/conversion`
                    break;
                default:
                    path = `./scripts/outputs`
            }
            const saveContentFilePath = path;

            // Stream results file in memory-efficient chunks, processing one at a time
            for await (const result of await this.anthropic.messages.batches.results(
                messageBatchId
            )) {
                switch (result.result.type) {
                    case 'succeeded':
                        console.log(result.result.message.content[0]);
                        if (result.result.message.content[0].type == 'text') {
                            const content = result.result.message.content[0].text;
                            const customId = result.custom_id;
                            this.claudeCleanupAndSave(content, `${saveContentFilePath}/${customId}.json`);
                        } else {
                            console.error(result.result.message.content)
                            throw "unexpected type!"
                        }
                        console.log(`Success! ${result.custom_id}`);
                        break;
                    case 'errored':
                        if (result.result.error.type == "invalid_request") {
                            // Request body must be fixed before re-sending request
                            console.log(`Validation error: ${result.custom_id}`);
                        } else {
                            // Request can be retried directly
                            console.log(`Server error: ${result.custom_id}`);
                        }
                        break;
                    case 'expired':
                        console.log(`Request expired: ${result.custom_id}`);
                        break;
                }
            }

            return messageBatchId
        } catch (error) {
            console.log(error);
            return {
                success: false,
                error: error.message,
                content: null
            };
        }
    }

    async deleteBatch(messageBatchId) {
        try {

            const response = await this.anthropic.messages.batches.delete(messageBatchId);

            return response
        } catch (error) {
            console.log(error);
            return {
                success: false,
                error: error.message,
                content: null
            };
        }
    }

    async cancelBatch(messageBatchId) {
        try {

            const response = await this.anthropic.messages.batches.cancel(messageBatchId);

            return response
        } catch (error) {
            console.log(error);
            return {
                success: false,
                error: error.message,
                content: null
            };
        }
    }

    claudeCleanupAndSave(text, outputPath) {
        const jsonString = text
            .replace(/^```json\n/, '')  // Remove opening ```json
            .replace(/\n```$/, '');     // Remove closing ```

        fs.writeFileSync(outputPath, jsonString);
    }


    // Basic text completion
    async createBatch(messages) {
        try {

            const response = await this.anthropic.messages.batches.create({
                requests: messages.map(x => {
                    return {
                        custom_id: x.custom_id,
                        params: {
                            model: this.defaultModel,
                            max_tokens: this.max_tokens,
                            temperature: this.temperature,
                            system: this.system,
                            messages: [
                                {
                                    role: 'user',
                                    content: x.message
                                }
                            ]
                        }
                    }
                })
            });

            return {
                success: true,
                content: response
            };
        } catch (error) {
            console.log(error);
            return {
                success: false,
                error: error.message,
                content: null
            };
        }
    }

    // Helper: Send file content to Claude
    async batchAnalyzeFile(batchConfig) {
        const prompt = "Analyze this file:"
        try {
            const messages = batchConfig.map(x => {
                const content = fs.readFileSync(x.filePath, 'utf8');
                const message = `${prompt}\n\n${content}`;
                return {
                    message: message,
                    custom_id: x.custom_id
                }
            })

            return await this.createBatch(messages);
        } catch (error) {
            console.log(error);
            return {
                success: false,
                error: `File analysis failed: ${error.message}`,
                content: null
            };
        }
    }
}

export {
    ClaudeMessageBatchClient
};