import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export async function POST(req: NextRequest) {
    try {
        const { text, voice, rate } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const tempFile = path.join(os.tmpdir(), `tts - ${Date.now()} -${Math.random()}.mp3`);
        const rateArg = rate || '+0%';
        const voiceArg = voice || 'en-US-AriaNeural';

        // Run python3 -m edge_tts --text "..." --write-media "..." --voice "..." --rate "..."
        const pythonProcess = spawn('python3', [
            '-m', 'edge_tts',
            '--text', text,
            '--write-media', tempFile,
            '--voice', voiceArg,
            '--rate', rateArg
        ]);

        await new Promise<void>((resolve, reject) => {
            let stderr = '';
            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`Process exited with code ${code}: ${stderr} `));
            });
            pythonProcess.on('error', reject);
        });

        const audioBuffer = fs.readFileSync(tempFile);
        fs.unlinkSync(tempFile);

        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.length.toString(),
            },
        });

    } catch (error: any) {
        console.error('TTS Error:', error);
        return NextResponse.json({
            error: 'Failed to generate speech',
            details: error.message
        }, { status: 500 });
    }
}
