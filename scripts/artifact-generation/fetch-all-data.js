import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Orchestrator script to run all data fetching operations in sequence
 */

async function runScript(scriptName) {
    return new Promise((resolve, reject) => {
        console.log(`\n🚀 Starting ${scriptName}...`);

        const scriptPath = path.join(__dirname, scriptName);
        const nodeProcess = spawn('node', [scriptPath], {
            stdio: 'inherit',
            cwd: process.cwd()
        });

        nodeProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${scriptName} completed successfully`);
                resolve();
            } else {
                console.error(`❌ ${scriptName} failed with exit code ${code}`);
                reject(new Error(`${scriptName} failed`));
            }
        });

        nodeProcess.on('error', (error) => {
            console.error(`❌ Error running ${scriptName}:`, error);
            reject(error);
        });
    });
}

async function main() {
    console.log('🌐 Starting comprehensive data fetch operation...\n');

    try {
        // 1. Fetch heroes data
        await runScript('heroes-request.js');

        // 2. Fetch items data
        await runScript('items-request.js');

        // 3. Fetch neutral items data
        await runScript('neutral-items-request.js');

        console.log('\n🎉 All data fetching operations completed successfully!');
        console.log('📁 Check the scripts/outputs/ directory for the fetched data.');

    } catch (error) {
        console.error('\n💥 Data fetching operation failed:', error.message);
        process.exit(1);
    }
}

main();