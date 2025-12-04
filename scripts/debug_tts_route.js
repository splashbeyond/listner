const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const text = "Hello world. This is a test.";
const voiceArg = "en-US-AriaNeural";
const rateArg = "+0%";
const tempFile = path.join(os.tmpdir(), `test-tts-${Date.now()}.mp3`);

const pythonScript = `
import asyncio
import edge_tts
import json
import sys

async def main():
    # Try SSML to force word boundaries?
    # communicate = edge_tts.Communicate("${text}", "${voiceArg}", rate="${rateArg}")
    
    # Try without rate first
    print("Testing without rate...", file=sys.stderr)
    communicate = edge_tts.Communicate("${text}", "${voiceArg}")
    
    audio_data = b""
    marks = []

    async for chunk in communicate.stream():
        if chunk["type"] != "audio":
            print(f"Chunk type: {chunk['type']}", file=sys.stderr)
            
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
        elif chunk["type"] == "WordBoundary":
            marks.append({
                "offset": chunk["offset"],
                "duration": chunk["duration"],
                "text": chunk["text"]
            })

    # Write audio to file
    with open("${tempFile}", "wb") as f:
        f.write(audio_data)
        
    # Print marks to stdout
    print(json.dumps(marks))

if __name__ == "__main__":
    asyncio.run(main())
`;

const scriptFile = path.join(os.tmpdir(), `debug-script-${Date.now()}.py`);
fs.writeFileSync(scriptFile, pythonScript);

console.log("Running python script:", scriptFile);

const pythonProcess = spawn('python3', [scriptFile]);

let stdout = '';
let stderr = '';

pythonProcess.stdout.on('data', (data) => {
    stdout += data.toString();
});

pythonProcess.stderr.on('data', (data) => {
    stderr += data.toString();
});

pythonProcess.on('close', (code) => {
    console.log(`Process exited with code ${code}`);
    console.log("STDOUT:", stdout);
    console.log("STDERR:", stderr);

    if (fs.existsSync(tempFile)) {
        const stats = fs.statSync(tempFile);
        console.log(`Audio file created: ${stats.size} bytes`);
        fs.unlinkSync(tempFile);
    } else {
        console.log("Audio file NOT created");
    }
    fs.unlinkSync(scriptFile);
});
