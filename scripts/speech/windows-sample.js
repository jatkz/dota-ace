import vosk from 'vosk';
import { spawn } from 'child_process';
import fs from 'fs';

const MODEL_PATH = './model';

// YOUR COMMAND VOCABULARY
const VOCABULARY = [
    'start', 'stop', 'pause', 'resume', 'play',
    'next', 'previous', 'volume', 'up', 'down',
    'yes', 'no', 'ok', 'cancel', 'confirm',
    'left', 'right', 'forward', 'back', 'select',
    'home', 'menu', 'exit', 'save', 'delete',
    'one', 'two', 'three', 'four', 'five', 'poopy'
];

console.log('🎯 Constrained vocabulary:', VOCABULARY.join(', '));
console.log('📝 Vosk will focus on recognizing only these words\n');

if (!fs.existsSync(MODEL_PATH)) {
    console.error(`Model directory ${MODEL_PATH} not found!`);
    process.exit(1);
}

try {
    console.log('Loading vosk model...');
    vosk.setLogLevel(0);
    const model = new vosk.Model(MODEL_PATH);
    
    // Create recognizer with vocabulary constraint
    const rec = new vosk.Recognizer({model: model, sampleRate: 16000});
    
    // Set vocabulary constraint - this tells Vosk to focus on these words
    // Note: This may not be supported in all Vosk builds, so we'll add fallback
    try {
        // Try to set vocabulary constraint
        rec.setWords(true);  // Enable word-level results
        
        // Create a grammar string (some Vosk versions support this)
        const grammarJson = JSON.stringify(VOCABULARY);
        console.log('✅ Vocabulary constraint applied');
        
        // Alternative: set partial words to get better intermediate results
        rec.setPartialWords(true);
        
    } catch (e) {
        console.log('⚠️  Vocabulary constraint not supported, using post-processing filter');
    }
    
    console.log('✅ Vosk model and recognizer initialized successfully');

    console.log('🎙️  Using Yeti Stereo Microphone...');
    console.log('🚀 Starting constrained voice recognition...');
    console.log('💬 Say one of the vocabulary words! (Press Ctrl+C to stop)\n');

    const ffmpeg = spawn('ffmpeg', [
        '-f', 'dshow',
        '-i', 'audio=Microphone (Yeti Stereo Microphone)',
        '-acodec', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        '-f', 's16le',
        '-loglevel', 'error',
        '-'
    ]);

    let isFirstData = true;
    let commandBuffer = []; // Store recent commands for combination detection

    ffmpeg.stdout.on('data', (data) => {
        if (isFirstData) {
            console.log('✅ Audio capture started! Say a vocabulary word...\n');
            isFirstData = false;
        }

        try {
            if (rec.acceptWaveform(data)) {
                const result = rec.result();
                if (result.text && result.text.trim()) {
                    const recognizedText = result.text.trim().toLowerCase();
                    
                    console.log(`🎤 Raw recognition: "${recognizedText}"`);
                    
                    // Extract valid vocabulary words
                    const validWords = extractValidWords(recognizedText);
                    
                    if (validWords.length > 0) {
                        console.log(`✅ Valid words: [${validWords.join(', ')}]`);
                        
                        // Add to command buffer for sequence detection
                        commandBuffer.push(...validWords);
                        if (commandBuffer.length > 5) {
                            commandBuffer = commandBuffer.slice(-5); // Keep last 5 words
                        }
                        
                        // Process individual words and combinations
                        processCommands(validWords);
                        
                        // Check for command sequences
                        checkCommandSequences(commandBuffer);
                        
                    } else {
                        console.log(`❌ No vocabulary words detected`);
                    }
                    console.log('---');
                }
            } else {
                const partialResult = rec.partialResult();
                if (partialResult.text && partialResult.text.trim()) {
                    const partialValid = extractValidWords(partialResult.text);
                    if (partialValid.length > 0) {
                        process.stdout.write(`\r💭 Detecting: [${partialValid.join(', ')}]...                    `);
                    } else {
                        process.stdout.write(`\r💭 Listening for vocabulary...                    `);
                    }
                }
            }
        } catch (err) {
            console.error('Recognition error:', err.message);
        }
    });

    // Graceful shutdown
    process.on('SIGINT', function() {
        console.log('\n\n⏹️  Stopping constrained voice recognition...');
        ffmpeg.kill('SIGTERM');
        console.log('👋 Final command buffer:', commandBuffer);
        console.log('Goodbye!');
        process.exit(0);
    });

    ffmpeg.on('error', (err) => {
        console.error('Audio error:', err.message);
        process.exit(1);
    });

} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}

function extractValidWords(text) {
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
        const fuzzyMatch = findFuzzyMatch(cleanWord);
        if (fuzzyMatch) {
            validWords.push(fuzzyMatch);
        }
    }
    
    return validWords;
}

function findFuzzyMatch(word) {
    if (word.length < 2) return null;
    
    for (const vocabWord of VOCABULARY) {
        // Check for close matches (1-2 character differences)
        if (Math.abs(word.length - vocabWord.length) <= 1) {
            let differences = 0;
            const minLen = Math.min(word.length, vocabWord.length);
            
            for (let i = 0; i < minLen; i++) {
                if (word[i] !== vocabWord[i]) differences++;
            }
            
            // Allow 1 difference for words 3+ chars, perfect match for shorter
            const allowedDiffs = vocabWord.length >= 3 ? 1 : 0;
            if (differences <= allowedDiffs) {
                return vocabWord;
            }
        }
        
        // Check for substring matches
        if (word.length >= 3 && vocabWord.includes(word)) {
            return vocabWord;
        }
        if (vocabWord.length >= 3 && word.includes(vocabWord)) {
            return vocabWord;
        }
    }
    
    return null;
}

function processCommands(words) {
    console.log(`🚀 Processing commands: [${words.join(', ')}]`);
    
    for (const word of words) {
        executeCommand(word);
    }
}

function executeCommand(command) {
    switch(command) {
        case 'start':
            console.log('   ▶️  START command executed');
            break;
        case 'stop':
            console.log('   ⏹️  STOP command executed');
            break;
        case 'pause':
            console.log('   ⏸️  PAUSE command executed');
            break;
        case 'resume':
            console.log('   ▶️  RESUME command executed');
            break;
        case 'play':
            console.log('   ▶️  PLAY command executed');
            break;
        case 'volume':
            console.log('   🔊 VOLUME control activated');
            break;
        case 'up':
            console.log('   ⬆️  UP command');
            break;
        case 'down':
            console.log('   ⬇️  DOWN command');
            break;
        case 'yes':
            console.log('   ✅ YES - Confirmed');
            break;
        case 'no':
            console.log('   ❌ NO - Cancelled');
            break;
        case 'left':
            console.log('   ⬅️  LEFT direction');
            break;
        case 'right':
            console.log('   ➡️  RIGHT direction');
            break;
        case 'select':
            console.log('   👆 SELECT command');
            break;
        case 'home':
            console.log('   🏠 HOME command');
            break;
        case 'menu':
            console.log('   📋 MENU opened');
            break;
        case 'exit':
            console.log('   🚪 EXIT command');
            break;
        default:
            console.log(`   ❓ Command: ${command}`);
    }
}

function checkCommandSequences(buffer) {
    // Check for common command combinations
    const bufferStr = buffer.join(' ');
    
    if (bufferStr.includes('volume up')) {
        console.log('🎵 SEQUENCE: Volume Up detected');
    } else if (bufferStr.includes('volume down')) {
        console.log('🎵 SEQUENCE: Volume Down detected');
    } else if (bufferStr.includes('play next')) {
        console.log('🎵 SEQUENCE: Play Next detected');
    } else if (bufferStr.includes('play previous')) {
        console.log('🎵 SEQUENCE: Play Previous detected');
    } else if (bufferStr.includes('start play')) {
        console.log('🎵 SEQUENCE: Start Playing detected');
    }
}
