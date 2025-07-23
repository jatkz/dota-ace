const vosk = require('vosk');
const { spawn } = require('child_process');
const fs = require('fs');

// Set logging level (0 = no logs, 3 = debug)
vosk.setLogLevel(0);

// Initialize the model (update this path to your downloaded model)
const MODEL_PATH = './vosk-model-en-us-0.22';  // or whatever you named the extracted folder

if (!fs.existsSync(MODEL_PATH)) {
    console.error(`Model not found at ${MODEL_PATH}`);
    console.error('Please extract the downloaded vosk model zip file and update the MODEL_PATH');
    process.exit(1);
}

const model = new vosk.Model(MODEL_PATH);
const rec = new vosk.KaldiRecognizer(model, 16000);

console.log('Speech recognition initialized. Starting microphone...');

// Record audio using sox (you might need to install it: sudo apt install sox)
// Alternative: use arecord on Linux, or rec on systems with sox
const recording = spawn('rec', [
    '-t', 'wav',           // output format
    '-c', '1',             // mono
    '-r', '16000',         // sample rate
    '-',                   // output to stdout
], { stdio: ['ignore', 'pipe', 'ignore'] });

// Alternative for systems without sox - use arecord:
// const recording = spawn('arecord', [
//     '-D', 'default',       // device
//     '-f', 'S16_LE',        // format
//     '-c', '1',             // channels (mono)
//     '-r', '16000',         // sample rate
//     '-t', 'raw'            // raw output
// ], { stdio: ['ignore', 'pipe', 'ignore'] });

console.log('Listening... Speak into your microphone!');
console.log('Press Ctrl+C to stop');

recording.stdout.on('data', (data) => {
    // Send audio data to Vosk
    if (rec.AcceptWaveform(data)) {
        // Final result
        const result = JSON.parse(rec.Result());
        if (result.text) {
            console.log('Final:', result.text);
            processCommand(result.text);
        }
    } else {
        // Partial result (ongoing speech)
        const partial = JSON.parse(rec.PartialResult());
        if (partial.partial) {
            process.stdout.write(`\rPartial: ${partial.partial}`);
        }
    }
});

recording.on('error', (error) => {
    console.error('Recording error:', error);
    console.error('\nIf you get permission errors, try:');
    console.error('sudo apt install sox alsa-utils');
    console.error('Or check your microphone permissions');
});

recording.on('close', (code) => {
    console.log(`\nRecording process exited with code ${code}`);
    // Get final results
    const finalResult = JSON.parse(rec.FinalResult());
    if (finalResult.text) {
        console.log('Final result:', finalResult.text);
    }
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\nStopping speech recognition...');
    recording.kill('SIGTERM');
    process.exit(0);
});

// Function to process recognized commands
function processCommand(text) {
    const command = text.toLowerCase().trim();
    
    console.log(`\n🎤 Recognized: "${text}"`);
    
    // Example command processing for a game like Dota
    if (command.includes('ward')) {
        console.log('🔮 Ward command detected!');
    } else if (command.includes('gank')) {
        console.log('⚔️  Gank command detected!');
    } else if (command.includes('back') || command.includes('retreat')) {
        console.log('🏃 Retreat command detected!');
    } else if (command.includes('push')) {
        console.log('⚡ Push command detected!');
    } else if (command.includes('hello') || command.includes('hi')) {
        console.log('👋 Greeting detected!');
    } else {
        console.log('💬 General speech:', text);
    }
    
    // You can add your own logic here
    // For example, trigger game actions, send API calls, etc.
}