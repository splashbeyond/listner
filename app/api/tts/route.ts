import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text, voice, rate } = body;

        console.log(`[TTS API] Request received. Text length: ${text?.length}, Voice: ${voice}, Rate: ${rate}`);

        if (!text) {
            console.error("[TTS API] Error: Text is required");
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const timestamp = Date.now();
        const random = Math.random();
        const tempAudioFile = path.join(os.tmpdir(), `tts-${timestamp}-${random}.mp3`);

        const rateArg = rate || '+0%';
        const voiceArg = voice || 'en-US-AriaNeural';

        console.log(`[TTS API] Generating audio with word marks...`);

        // Use our custom Python script that extracts word-level marks
        const scriptPath = path.join(process.cwd(), 'scripts', 'tts_with_marks.py');
        const command = `/usr/bin/python3 "${scriptPath}" "${text.replace(/"/g, '\\"')}" "${voiceArg}" "${rateArg}" "${tempAudioFile}"`;

        const { stdout, stderr } = await execAsync(command, { maxBuffer: 1024 * 1024 * 10 });

        // Read audio file
        const audioBuffer = await fs.readFile(tempAudioFile);

        // Parse marks from stdout (JSON format)
        let marks: any[] = [];
        try {
            if (stdout.trim()) {
                marks = JSON.parse(stdout.trim());
                console.log(`[TTS API] Extracted ${marks.length} word marks`);
            }
        } catch (e) {
            console.warn('[TTS API] Could not parse marks from Python script:', e);
            console.warn('[TTS API] stdout:', stdout);
            console.warn('[TTS API] stderr:', stderr);
        }

        // Cleanup temp files
        await fs.unlink(tempAudioFile).catch(() => { });


        return NextResponse.json({
            audio: audioBuffer.toString('base64'),
            marks: marks
        });

    } catch (error: any) {
        console.error('TTS Error:', error);
        return NextResponse.json({
            error: 'Failed to generate speech',
            details: error.message
        }, { status: 500 });
    }
}
