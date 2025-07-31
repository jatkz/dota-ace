import vosk from 'vosk';
import { spawn } from 'child_process';
import fs from 'fs';

const MODEL_PATH = './model';

const VOCABULARY = [
    'start', 'stop', 'pause', 'resume', 'play',
    'next', 'previous', 'volume', 'up', 'down',
    'yes', 'no', 'ok', 'cancel', 'confirm',
    'left', 'right', 'forward', 'back', 'select',
    'home', 'menu', 'exit', 'save', 'delete',
    'one', 'two', 'three', 'four', 'five', 'poopy'
];

console.log('🐧 WSL Voice Recognition with Vosk');
console.log('🎯 Vocabulary:', VOCABULARY.join(', '));
console.log('🔗 Using WSLg audio bridge to Windows');
console.log('=' * 60);

if (!fs.existsSync(MODEL_PATH)) {
    console.error(`❌ Model directory ${MODEL_PATH} not found!`);
    process.exit(1);
}

async function detectWSLAudio() {
    console.log('🔍 Detecting WSL audio setup...\n');
    
    // Check if we're in WSL
    try {
        const wslCheck = spawn('uname', ['-r']);
        let unameOutput = '';
        
        wslCheck.stdout.on('data', (data) => {
            unameOutput += data.toString();
        });
        
        await new Promise((resolve) => {
            wslCheck.on('close', () => {
                if (unameOutput.includes('WSL') || unameOutput.includes('microsoft')) {
                    console.log('✅ WSL environment detected');
                    console.log('🔗 Kernel:', unameOutput.trim());
                } else {
                    console.log('❓ Not sure if this is WSL');
                }
                resolve();
            });
        });
    } catch (e) {
        console.log('Could not detect WSL');
    }
    
    // Check PulseAudio connection
    try {
        const paInfo = spawn('pactl', ['info']);
        let paOutput = '';
        
        paInfo.stdout.on('data', (data) => {
            paOutput += data.toString();
        });
        
        await new Promise((resolve) => {
            paInfo.on('close', () => {
                if (paOutput.includes('RDPSink') && paOutput.includes('RDPSource')) {
                    console.log('✅ WSLg PulseAudio bridge active');
                    console.log('🎤 Audio source: RDPSource (Windows microphone)');
                    console.log('🔊 Audio sink: RDPSink (Windows speakers)');
                } else {
                    console.log('❓ Unusual PulseAudio setup');
                }
                resolve();
            });
        });
    } catch (e) {
        console.log('Could not check PulseAudio');
    }
}

function startWSLVoiceRecognition() {
    try {
        console.log('\n🚀 Initializing Vosk...');
        vosk.setLogLevel(-1); // Reduce log noise
        const model = new vosk.Model(MODEL_PATH);
        const rec = new vosk.Recognizer({model: model, sampleRate: 16000});
        
        console.log('✅ Vosk model loaded');
        console.log('🎙️  Starting WSL audio capture...');
        console.log('💬 Speak into your Windows microphone! (Ctrl+C to stop)\n');
        
        // Use PulseAudio with the RDPSource specifically
        const ffmpeg = spawn('ffmpeg', [
            '-f', 'pulse',
            '-i', 'RDPSource',          // Use the WSL audio source directly
            '-acodec', 'pcm_s16le',
            '-ar', '16000',             // Vosk needs 16kHz
            '-ac', '1',                 // Convert to mono
            '-f', 's16le',              // Raw 16-bit output
            '-loglevel', 'warning',     // Show warnings but not info
            '-'                         // Output to stdout
        ]);
        
        let audioStarted = false;
        let wordCount = 0;
        
        ffmpeg.stdout.on('data', (data) => {
            if (!audioStarted) {
                console.log('✅ WSL audio bridge connected!');
                console.log('🎤 Listening for vocabulary words...\n');
                audioStarted = true;
            }
            
            try {
                if (rec.acceptWaveform(data)) {
                    const result = rec.result();
                    if (result.text && result.text.trim()) {
                        const originalText = result.text.trim();
                        console.log(`🎤 Raw recognition: "${originalText}"`);
                        
                        const validWords = extractValidWords(originalText);
                        if (validWords.length > 0) {
                            wordCount++;
                            console.log(`✅ Valid words [${wordCount}]: [${validWords.join(', ')}]`);
                            executeCommands(validWords);
                        } else {
                            console.log(`❌ No vocabulary words found`);
                        }
                        console.log('---');
                    }
                } else {
                    const partialResult = rec.partialResult();
                    if (partialResult.text && partialResult.text.trim()) {
                        const partialWords = extractValidWords(partialResult.text);
                        if (partialWords.length > 0) {
                            process.stdout.write(`\r💭 Detecting: [${partialWords.join(', ')}]...                    `);
                        } else {
                            process.stdout.write(`\r💭 Listening...                    `);
                        }
                    }
                }
            } catch (err) {
                console.error('\nRecognition error:', err.message);
            }
        });
        
        ffmpeg.stderr.on('data', (data) => {
            const errorStr = data.toString();
            // Only show actual errors, not FFmpeg info
            if (errorStr.includes('Error') || errorStr.includes('failed')) {
                console.error('Audio error:', errorStr);
            }
        });
        
        ffmpeg.on('error', (err) => {
            console.error('FFmpeg spawn error:', err.message);
            console.log('\n🔧 WSL Audio Troubleshooting:');
            console.log('1. Make sure Windows microphone is working');
            console.log('2. Check Windows audio permissions');
            console.log('3. Try: pulseaudio --kill && pulseaudio --start');
            console.log('4. Alternative: Use Windows-based speech recognition');
            tryFallbackMethod();
        });
        
        ffmpeg.on('close', (code) => {
            if (code !== 0) {
                console.log(`\nAudio process ended with code: ${code}`);
                tryFallbackMethod();
            }
        });
        
        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n\n⏹️  Stopping WSL voice recognition...');
            console.log(`📊 Total valid commands recognized: ${wordCount}`);
            ffmpeg.kill('SIGTERM');
            console.log('👋 Goodbye!');
            process.exit(0);
        });
        
        // Auto-stop after 5 minutes for demo
        setTimeout(() => {
            console.log('\n⏰ Demo timeout (5 minutes)');
            console.log(`📊 Total commands recognized: ${wordCount}`);
            ffmpeg.kill('SIGTERM');
            process.exit(0);
        }, 300000);
        
    } catch (error) {
        console.error('Initialization error:', error.message);
        tryFallbackMethod();
    }
}

function tryFallbackMethod() {
    console.log('\n🔄 Trying fallback: default PulseAudio source...');
    
    try {
        const model = new vosk.Model(MODEL_PATH);
        const rec = new vosk.Recognizer({model: model, sampleRate: 16000});
        
        const ffmpeg = spawn('ffmpeg', [
            '-f', 'pulse',
            '-i', 'default',            // Try default instead of RDPSource
            '-acodec', 'pcm_s16le',
            '-ar', '16000',
            '-ac', '1',
            '-f', 's16le',
            '-loglevel', 'error',
            '-'
        ]);
        
        ffmpeg.stdout.on('data', (data) => {
            try {
                if (rec.acceptWaveform(data)) {
                    const result = rec.result();
                    if (result.text && result.text.trim()) {
                        console.log(`🎤 [Fallback] "${result.text}"`);
                        const validWords = extractValidWords(result.text);
                        if (validWords.length > 0) {
                            console.log(`✅ Commands: [${validWords.join(', ')}]`);
                        }
                    }
                }
            } catch (err) {
                console.error('Fallback recognition error:', err.message);
            }
        });
        
        console.log('✅ Fallback method started');
        
    } catch (e) {
        console.log('❌ Fallback also failed');
        console.log('\n💡 ALTERNATIVE SOLUTIONS:');
        console.log('1. 🌐 Use browser speech recognition in Windows');
        console.log('2. 🪟 Run the Node.js script directly in Windows (not WSL)');
        console.log('3. 📁 Test with pre-recorded audio files');
        console.log('4. 🔧 Use Windows Speech Recognition API from WSL');
    }
}

function extractValidWords(text) {
    if (!text) return [];
    
    const words = text.toLowerCase().split(/\s+/);
    const validWords = [];
    
    for (const word of words) {
        const cleanWord = word.replace(/[^\w]/g, '');
        
        // Exact match
        if (VOCABULARY.includes(cleanWord)) {
            validWords.push(cleanWord);
            continue;
        }
        
        // Fuzzy match for pronunciation variations
        const fuzzyMatch = findBestMatch(cleanWord);
        if (fuzzyMatch) {
            validWords.push(fuzzyMatch);
        }
    }
    
    return validWords;
}

function findBestMatch(word) {
    if (word.length < 2) return null;
    
    for (const vocabWord of VOCABULARY) {
        // Check similarity
        if (Math.abs(word.length - vocabWord.length) <= 1) {
            let differences = 0;
            const maxLen = Math.max(word.length, vocabWord.length);
            
            for (let i = 0; i < maxLen; i++) {
                if (word[i] !== vocabWord[i]) differences++;
            }
            
            // Allow 1 difference for words 3+ chars
            if (differences <= (vocabWord.length >= 3 ? 1 : 0)) {
                return vocabWord;
            }
        }
        
        // Substring matches
        if (word.includes(vocabWord) || vocabWord.includes(word)) {
            return vocabWord;
        }
    }
    
    return null;
}

function executeCommands(words) {
    console.log(`🚀 Executing commands: [${words.join(', ')}]`);
    
    words.forEach(word => {
        switch(word) {
            case 'start':
                console.log('   ▶️  START command - System starting...');
                break;
            case 'stop':
                console.log('   ⏹️  STOP command - System stopping...');
                break;
            case 'pause':
                console.log('   ⏸️  PAUSE command - System paused...');
                break;
            case 'volume':
                console.log('   🔊 VOLUME command - Audio control activated');
                break;
            case 'up':
                console.log('   ⬆️  UP command - Moving up');
                break;
            case 'down':
                console.log('   ⬇️  DOWN command - Moving down');
                break;
            case 'yes':
                console.log('   ✅ YES command - Confirmed!');
                break;
            case 'no':
                console.log('   ❌ NO command - Cancelled');
                break;
            case 'poopy':
                console.log('   💩 POOPY command - Silly mode activated!');
                break;
            case 'left':
                console.log('   ⬅️  LEFT command - Moving left');
                break;
            case 'right':
                console.log('   ➡️  RIGHT command - Moving right');
                break;
            case 'select':
                console.log('   👆 SELECT command - Item selected');
                break;
            case 'home':
                console.log('   🏠 HOME command - Going home');
                break;
            case 'menu':
                console.log('   📋 MENU command - Menu opened');
                break;
            default:
                console.log(`   ❓ ${word.toUpperCase()} command executed`);
        }
    });
}

// Start the WSL voice recognition
async function main() {
    await detectWSLAudio();
    startWSLVoiceRecognition();
}

main();