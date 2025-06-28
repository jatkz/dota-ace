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

        // SAVE
        const batchTypes = ['hero', 'item']
        if (false) {
            const res = await claude.retrieveBatchResult('msgbatch_01Hn9dJXmZUEr7eppcKMAvk5', 'item');
            console.log('Retrieve Batch Result ', res);
        }

        // DELETE
        if (false) {
            const res = await claude.deleteBatch('msgbatch_01Kh4PkMWsjN1UHvc2FSXWa5');
            console.log('Delete Result ', res);

        }
        //CANCEL
        if (false) {
            const res = claude.cancelBatch('msgbatch_01HtEhWsE6XWuzX9vZWwx6oU');
            console.log('Delete Result ', res);
        }
        

    } catch (error) {
        console.error('❌ Error running examples:', error.message);
        console.error(error);
    }
}

main();