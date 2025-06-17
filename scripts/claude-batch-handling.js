import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const API_KEY = process.env.CLAUDE_API_KEY;

class ClaudeMessageBatchClient {
    constructor(apiKey = API_KEY) {
        if (!apiKey) {
            throw new Error('API key is required. Set ANTHROPIC_API_KEY in your .env file');
        }
        
        // Pass fetch to the Anthropic client
        this.anthropic = new Anthropic({ 
            apiKey,
        });
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

    async retrieveBatchResult(messageBatchId) {
        try {

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
                            claudeCleanupAndSave(content, `./scripts/outputs/item/conversion/${customId}.json`);
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

}

// Main execution
async function main() {
    console.log('🤖 Claude API Starter Examples\n');
    
    try {
        const claude = new ClaudeMessageBatchClient(API_KEY);

        const listed = await claude.listBatches();
        console.log('List Batches', listed);
        console.log('data ', listed.content.data);

        if (false) {
            const res = await claude.retrieveBatch('msgbatch_01Dbdy5iLUSm7eiHCdVXVk1j');
            console.log('Retrieve Batch ', res);
        }

        if (false) {
            const res = await claude.retrieveBatchResult('msgbatch_01HkHmFwJaqnBaLBghvvMxBR');
            console.log('Retrieve Batch Result ', res);
        }

        if (false) {
            const res = await claude.deleteBatch('msgbatch_01HkHmFwJaqnBaLBghvvMxBR');
            console.log('Delete Result ', res);

        }
        // claude.cancelBatch();
        
    } catch (error) {
        console.error('❌ Error running examples:', error.message);
        console.error(error);
    }
}

function claudeCleanupAndSave(text, outputPath) {
    const jsonString = text
        .replace(/^```json\n/, '')  // Remove opening ```json
        .replace(/\n```$/, '');     // Remove closing ```
    
    fs.writeFileSync(outputPath, jsonString);
}

main();