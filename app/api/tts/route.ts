import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text, voice, rate } = body;

        console.log(`[TTS API] Request received. Text length: ${text?.length}, Voice: ${voice}, Rate: ${rate}`);

        if (!text) {
            console.error("[TTS API] Error: Text is required");
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const tempFile = path.join(os.tmpdir(), `tts-${Date.now()}-${Math.random()}.mp3`);
        const rateArg = rate || '+0%';
        const voiceArg = voice || 'en-US-AriaNeural';

        console.log(`[TTS API] Spawning edge-tts with tempFile: ${tempFile}`);

        // Fallback to simple spawn if complex script fails or for reliability
        // We will just generate audio and return empty marks for now to restore playback

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
                if (code === 0) {
                    console.log(`[TTS API] Process finished successfully.`);
                    resolve();
                } else {
                    console.error(`[TTS API] Process failed with code ${code}. Stderr: ${stderr}`);
                    reject(new Error(`Edge TTS process exited with code ${code}: ${stderr}`));
                }
            });
            pythonProcess.on('error', (err) => {
                console.error(`[TTS API] Process spawn error:`, err);
                reject(err);
            });
        });

        if (!fs.existsSync(tempFile)) {
            throw new Error("Output file was not created");
        }

        const stats = fs.statSync(tempFile);
        console.log(`[TTS API] Audio file created. Size: ${stats.size} bytes`);

        const audioBuffer = fs.readFileSync(tempFile);
        fs.unlinkSync(tempFile);

        return NextResponse.json({
            audio: audioBuffer.toString('base64'),
            marks: [] // Empty marks for now to ensure audio works
        });

    } catch (error: any) {
        console.error('TTS Error:', error);
        return NextResponse.json({
            error: 'Failed to generate speech',
            details: error.message
        }, { status: 500 });
    }
}
