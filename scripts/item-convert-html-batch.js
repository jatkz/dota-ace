import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const itemsListPath = './scripts/outputs/itemGridLinks.json';

const DOTA2_ITEMS = JSON.parse(fs.readFileSync(itemsListPath, 'utf8'));

const API_KEY = process.env.CLAUDE_API_KEY;

// Basic Claude API Client
class ClaudeClient {
    constructor(apiKey = API_KEY, templatePath = './claude-templates/parse-item-page.txt') {
        if (!apiKey) {
            throw new Error('API key is required. Set ANTHROPIC_API_KEY in your .env file');
        }
        
        // Pass fetch to the Anthropic client
        this.anthropic = new Anthropic({ 
            apiKey,
            // fetch: fetch 
        });
        this.defaultModel = 'claude-sonnet-4-20250514';
        this.max_tokens = 4000;
        this.temperature = 0;
        const systemPrompt = fs.readFileSync(templatePath, 'utf8');
        this.system = systemPrompt
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

// Main execution
async function main() {
    console.log('🤖 Claude API Starter Examples\n');
    
    try {
        const claude = new ClaudeClient(API_KEY, './claude-templates/parse-item-page.txt');

        console.log('Total items ', DOTA2_ITEMS.length);

        const items = DOTA2_ITEMS.slice(79, 119);
        console.log('items to handle....', items);
        const batchConfig = items.map(x => {
            const fileName = x.split('/').pop();
            const itemName = fileName.replace(/%27/g, '');

            return {
                custom_id: itemName,
                filePath: `./scripts/outputs/item/clean/${fileName}.html`
            }
        })

        const response = await claude.batchAnalyzeFile(batchConfig);
        
        console.log(response);
    } catch (error) {
        console.error('❌ Error running examples:', error.message);
        console.error(error);
    }
}

main();