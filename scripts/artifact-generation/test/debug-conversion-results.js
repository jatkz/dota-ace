import fs from 'fs';

function parseJsonFromMarkdown() {
    // Get the converted string
    const content = fs.readFileSync('./scripts/outputs/converted-test.json', 'utf8');
    const data = JSON.parse(content);
    const convertedString = data.converted;

    console.log(data)
    console.log(convertedString)
    
    // Remove the markdown code block markers (```json and ```)
    const jsonString = convertedString
        .replace(/^```json\n/, '')  // Remove opening ```json
        .replace(/\n```$/, '');     // Remove closing ```
    
    // Parse the JSON string into an object
    try {
        const parsedObject = JSON.parse(jsonString);
        return parsedObject;
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return null;
    }
}


const parsedJson = parseJsonFromMarkdown()
console.log('``````````````` RESULTS `````````````````')
console.log(parsedJson)