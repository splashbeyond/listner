import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json();

        if (!process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });
        }

        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        // Construct the prompt to force JSON output
        const systemPrompt = `You are an expert novelist. Your task is to take the conversation history and generate a complete, structured novel in JSON format.
        
The output MUST be valid JSON with the following structure:
{
    "title": "The Title",
    "author": "The Author",
    "description": "A short summary",
    "chapters": [
        {
            "title": "Chapter 1: The Beginning",
            "content": "The full text of chapter 1..."
        },
        ...
    ]
}

Ensure the content is high-quality, engaging, and matches the user's requests. Do not include any text outside the JSON object.`;

        const response = await anthropic.messages.create({
            model: "claude-3-5-haiku-latest",
            max_tokens: 4096, // Large output for a full book
            messages: [
                ...messages.filter((m: any) => m.role === 'user' || m.role === 'assistant').map((m: any) => ({ role: m.role, content: m.content })),
                { role: "user", content: "Please generate the full book now based on our discussion." }
            ],
            system: systemPrompt
        });

        // @ts-ignore
        const textContent = response.content[0]?.text || "";

        return NextResponse.json({
            content: textContent
        });

    } catch (error: any) {
        console.error('Generate Book API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
