import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
// import fetch from 'node-fetch';
import dotenv from 'dotenv/config';

// const Anthropic = require('@anthropic-ai/sdk').default;
// const fs = require('fs');
// const fetch = require('node-fetch'); // Add this import
// require('dotenv').config();

const API_KEY = process.env.CLAUDE_API_KEY;

// Basic Claude API Client
class ClaudeClient {
    constructor(apiKey = API_KEY) {
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
        const systemPrompt = fs.readFileSync('./claude-templates/parse-hero-page.txt', 'utf8');
        this.system = systemPrompt
    }

    // Basic text completion
    async chat(message, options = {}) {
        try {
            const response = await this.anthropic.messages.create({
                model: this.defaultModel,
                max_tokens: this.max_tokens,
                temperature: this.temperature,
                system: this.system,
                messages: [
                    {
                        role: 'user',
                        content: message
                    }
                ]
            });

            return {
                success: true,
                content: response.content[0].text,
                usage: response.usage,
                stopReason: response.stop_reason
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

    // Multi-turn conversation
    async conversation(messages, options = {}) {
        try {
            const response = await this.anthropic.messages.create({
                model: options.model || this.defaultModel,
                max_tokens: options.maxTokens || 2000,
                temperature: options.temperature || 0.7,
                system: options.systemPrompt,
                messages: messages
            });

            return {
                success: true,
                content: response.content[0].text,
                usage: response.usage,
                stopReason: response.stop_reason
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                content: null
            };
        }
    }

    // Stream responses (for long outputs)
    async *streamChat(message, options = {}) {
        try {
            const stream = await this.anthropic.messages.create({
                model: options.model || this.defaultModel,
                max_tokens: options.maxTokens || 2000,
                temperature: options.temperature || 0.7,
                system: options.systemPrompt,
                messages: [{ role: 'user', content: message }],
                stream: true
            });

            for await (const chunk of stream) {
                if (chunk.type === 'content_block_delta') {
                    yield chunk.delta.text;
                }
            }
        } catch (error) {
            throw new Error(`Streaming failed: ${error.message}`);
        }
    }

    // Helper: Send file content to Claude
    async analyzeFile(filePath, prompt = "Analyze this file:", options = {}) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const message = `${prompt}\n\n${content}`;
            
            return await this.chat(message, {
                ...options,
            });
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

// Usage Examples
async function basicUsage() {
    const claude = new ClaudeClient();

    // Simple chat
    console.log('=== Basic Chat ===');
    const response = await claude.chat("Explain quantum computing in simple terms");
    if (response.success) {
        console.log(response.content);
        console.log(`Tokens used: ${response.usage.input_tokens + response.usage.output_tokens}`);
    } else {
        console.error('Error:', response.error);
    }
}

async function conversationExample() {
    const claude = new ClaudeClient();

    console.log('\n=== Multi-turn Conversation ===');
    const messages = [
        { role: 'user', content: 'What is the capital of France?' },
        { role: 'assistant', content: 'The capital of France is Paris.' },
        { role: 'user', content: 'What is its population?' }
    ];

    const response = await claude.conversation(messages);
    if (response.success) {
        console.log(response.content);
    }
}

async function streamingExample() {
    const claude = new ClaudeClient();

    console.log('\n=== Streaming Response ===');
    const prompt = "Write a short story about a robot learning to paint";
    
    process.stdout.write('Claude: ');
    try {
        for await (const chunk of claude.streamChat(prompt)) {
            process.stdout.write(chunk);
        }
        console.log('\n');
    } catch (error) {
        console.error('Streaming error:', error.message);
    }
}

async function fileAnalysisExample() {
    const claude = new ClaudeClient();

    console.log('\n=== File Analysis ===');
    // Create a sample file
    const sampleData = `{
        "heroes": ["Pudge", "Invoker", "Crystal Maiden"],
        "patch": "7.39",
        "changes": ["Pudge hook range increased", "Invoker mana costs reduced"]
    }`;
    
    fs.writeFileSync('sample_data.json', sampleData);
    
    const result = await claude.analyzeFile(
        'sample_data.json', 
        "Summarize this Dota 2 patch data and suggest what these changes mean for gameplay:"
    );
    
    if (result.success) {
        console.log(result.content);
    }
    
    // Clean up
    fs.unlinkSync('sample_data.json');
}

// REAL
async function fileAnalysis(filePath) {
    const claude = new ClaudeClient();
        
    const result = await claude.analyzeFile(
        filePath
    );
    
    if (result.success) {
        console.log(result.content);
    } else {
        console.log(result)
    }

    // Fix: JSON.stringify the content object
    const jsonString = result.content
        .replace(/^```json\n/, '')  // Remove opening ```json
        .replace(/\n```$/, '');     // Remove closing ```
    
    const content = {converted: JSON.parse(jsonString)};
    fs.writeFileSync("./scripts/outputs/converted-test.json", JSON.stringify(content, null, 4));
 }

// Main execution
async function main() {
    console.log('🤖 Claude API Starter Examples\n');
    
    try {
        // await basicUsage();
        // await conversationExample();
        // await streamingExample();
        // await fileAnalysisExample();
        // await dota2ParserExample();

        await fileAnalysis("./scripts/outputs/single_test.html");
        
        console.log('\n✅ All examples completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Set up your .env file with ANTHROPIC_API_KEY');
        console.log('2. Install dependencies: npm install @anthropic-ai/sdk dotenv node-fetch');
        console.log('3. Customize the system prompts for your use case');
        console.log('4. Add error handling and logging for production');
        
    } catch (error) {
        console.error('❌ Error running examples:', error.message);
        console.error(error);
    }
}

// Run examples if this file is executed directly
// if (require.main === module) {
//     main();
// }
main();