import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const DOTA2_HEROES = JSON.parse(fs.readFileSync('./scripts/heroes-list.json', 'utf8'));

const API_KEY = process.env.CLAUDE_API_KEY;

// Basic Claude API Client
class ClaudeClient {
    constructor(apiKey = API_KEY, templatePath = './claude-templates/parse-hero-page.txt') {
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
        const claude = new ClaudeClient(API_KEY, './claude-templates/parse-hero-page.txt');

        const heroes = DOTA2_HEROES.filter(x => x.runConversion).slice(0,3);
        console.log('heroes to handle....', heroes);
        const batchConfig = heroes.map(x => {
            return {
                custom_id: x.urlName,
                filePath: `./scripts/outputs/hero/clean/${hero.urlName}.html`
            }
        })

        const response = await claude.batchAnalyzeFile(batchConfig);

        for (const hero of heroes) {
            console.log('starting... ', hero);
                
            console.log('\n✅ All examples completed successfully!');
            console.log('\n📝 Next steps:');
            console.log('1. Set up your .env file with ANTHROPIC_API_KEY');
            console.log('2. Install dependencies: npm install @anthropic-ai/sdk dotenv node-fetch');
            console.log('3. Customize the system prompts for your use case');
            console.log('4. Add error handling and logging for production');

            const index = DOTA2_HEROES.findIndex(x => x.displayName == hero.displayName);
            DOTA2_HEROES[index].runConversion = false;

        }

        fs.writeFileSync('./scripts/heroes-list.json', JSON.stringify(DOTA2_HEROES, null, 4));
        
    } catch (error) {
        console.error('❌ Error running examples:', error.message);
        console.error(error);
    }
}

main();