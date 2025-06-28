import { ClaudeMessageBatchClient } from './ClaudeBatchClient.js';

const API_KEY = process.env.CLAUDE_API_KEY;

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

        const batchTypes = ['hero', 'item']
        if (true) {
            const res = await claude.retrieveBatchResult('msgbatch_01WuVZs6hkZnqkmczQLTMBHo', 'item');
            console.log('Retrieve Batch Result ', res);
        }

        if (false) {
            const res = await claude.deleteBatch('msgbatch_01KP3gBuGYvuyZBKsPRtst5Q');
            console.log('Delete Result ', res);

        }
        // claude.cancelBatch();
        
    } catch (error) {
        console.error('❌ Error running examples:', error.message);
        console.error(error);
    }
}

main();