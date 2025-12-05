import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json();

        if (!process.env.ANTHROPIC_API_KEY) {
            console.error("ANTHROPIC_API_KEY is missing");
            return NextResponse.json({ error: 'Server configuration error: Missing API Key' }, { status: 500 });
        }

        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        // Filter valid roles (user/assistant) and ensure content is string
        const validMessages = messages.filter((m: any) =>
            (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
        ).map((m: any) => ({
            role: m.role,
            content: m.content
        }));

        const response = await anthropic.messages.create({
            model: "claude-3-5-haiku-latest",
            max_tokens: 1024,
            messages: validMessages,
            system: "You are a creative writing assistant helping the user write a novel. Be encouraging, creative, and helpful. Ask guiding questions to help develop the plot and characters. Keep your responses concise and focused on moving the story forward."
        });

        // @ts-ignore - Content block type handling
        const textContent = response.content[0]?.text || "";

        return NextResponse.json({
            role: 'assistant',
            content: textContent
        });

    } catch (error: any) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate response' }, { status: 500 });
    }
}
