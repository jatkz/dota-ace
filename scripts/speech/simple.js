import vosk from 'vosk';
import fs from 'fs';
import { spawn } from 'child_process';

// Initialize Vosk
vosk.setLogLevel(0);
const MODEL_PATH = './vosk-model-en-us-0.22';  // Update this path

if (!fs.existsSync(MODEL_PATH)) {
    console.error(`Model not found at ${MODEL_PATH}`);
    console.error('Extract the model zip file first!');
    process.exit(1);
}

const model = new vosk.Model(MODEL_PATH);
const rec = new vosk.KaldiRecognizer(model, 16000);

console.log('Ready for speech recognition!');

// Simple version using arecord (more compatible)
function startListening() {
    console.log('Starting microphone... Speak now!');
    
    const arecord = spawn('arecord', [
        '-f', 'S16_LE',    // 16-bit signed little endian
        '-r', '16000',     // 16kHz sample rate
        '-c', '1',         // Mono
        '-t', 'raw',       // Raw format
        '-D', 'default'    // Default audio device
    ]);

    arecord.stdout.on('data', (chunk) => {
        if (rec.AcceptWaveform(chunk)) {
            const result = JSON.parse(rec.Result());
            if (result.text) {
                console.log('\n🎤 You said:', result.text);
                handleSpeech(result.text);
            }
        } else {
            // Show partial results
            const partial = JSON.parse(rec.PartialResult());
            if (partial.partial) {
                process.stdout.write(`\r👂 Listening: ${partial.partial}`);
            }
        }
    });

    arecord.stderr.on('data', (data) => {
        // Ignore arecord status messages
    });

    arecord.on('error', (err) => {
        console.error('Audio error:', err.message);
        console.log('\nTroubleshooting:');
        console.log('1. Check if microphone is connected');
        console.log('2. Install audio tools: sudo apt install alsa-utils');
        console.log('3. Test mic: arecord -d 3 test.wav && aplay test.wav');
    });

    // Handle Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n\nStopping...');
        arecord.kill();
        process.exit(0);
    });
}

function handleSpeech(text) {
    const words = text.toLowerCase();
    
    // Basic command detection
    if (words.includes('stop')) {
        console.log('\n🛑 Stop command detected');
    } else if (words.includes('start')) {
        console.log('\n▶️  Start command detected');
    } else if (words.includes('help')) {
        console.log('\n❓ Help command detected');
    } else {
        console.log('\n💭 General speech recognized');
    }
    
    // Add your command logic here
    // For example:
    // - Call game APIs
    // - Trigger keyboard shortcuts
    // - Send notifications
    // - etc.
}

// Start the speech recognition
startListening();