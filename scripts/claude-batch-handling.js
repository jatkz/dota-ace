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

            const response = await this.anthropic.messages.batches.results(messageBatchId);

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

        claude.listBatches();
        // claude.retrieveBatch();
        // claude.retrieveBatchResult();
        // claude.deleteBatch();
        // claude.cancelBatch();
        
    } catch (error) {
        console.error('❌ Error running examples:', error.message);
        console.error(error);
    }
}

main();