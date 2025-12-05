import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { title, author, description, chapterTitle, chapterDescription, style } = await req.json();

        if (!process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });
        }

        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const systemPrompt = `You are an expert novelist. Your task is to write ONE complete chapter for a book.
        
Book Title: ${title}
Author: ${author}
Book Description: ${description}
Style/Tone: ${style || 'Engaging and professional'}

Current Chapter: ${chapterTitle}
Chapter Context: ${chapterDescription}

WRITING RULES:
1. Write ONLY the content of the chapter. Do not include the title or any intro text.
2. The chapter must be SUBSTANTIAL and LONG (aim for 1500-2000 words).
3. Flesh out scenes, dialogue, and descriptions. Do not rush.
4. End the chapter naturally.
5. Maintain the requested style and tone.`;

        const response = await anthropic.messages.create({
            model: "claude-3-5-haiku-latest",
            max_tokens: 4096,
            messages: [
                { role: "user", content: "Write this chapter now." }
            ],
            system: systemPrompt
        });

        // @ts-ignore
        const textContent = response.content[0]?.text || "";

        return NextResponse.json({
            content: textContent
        });

    } catch (error: any) {
        console.error('Generate Chapter API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
