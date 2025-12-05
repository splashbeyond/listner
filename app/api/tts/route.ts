import { NextRequest, NextResponse } from 'next/server';
import { EdgeTTS } from '@travisvn/edge-tts';

// Force dynamic to avoid static generation issues with API routes
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text, voice, rate } = body;

        console.log(`[TTS API] Request received. Text length: ${text?.length}, Voice: ${voice}, Rate: ${rate}`);

        if (!text) {
            console.error("[TTS API] Error: Text is required");
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const rateArg = rate || '+0%';
        const voiceArg = voice || 'en-US-AriaNeural';

        console.log(`[TTS API] Generating audio with word marks using Node.js EdgeTTS...`);

        // Initialize EdgeTTS
        const tts = new EdgeTTS(text, voiceArg, {
            rate: rateArg,
            volume: "+0%"
        });

        // Generate audio and subtitles
        const { audio, subtitle } = await tts.synthesize();

        // Convert Blob to Base64
        const arrayBuffer = await audio.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString('base64');

        console.log(`[TTS API] Generated audio size: ${buffer.length} bytes`);
        console.log(`[TTS API] Extracted ${subtitle.length} word marks`);

        return NextResponse.json({
            audio: base64Audio,
            marks: subtitle
        });

    } catch (error: any) {
        console.error('TTS Error:', error);
        return NextResponse.json({
            error: 'Failed to generate speech',
            details: error.message
        }, { status: 500 });
    }
}
