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
        const systemPrompt = `You are an expert novelist. Your task is to take the conversation history and generate a detailed BLUEPRINT for a novel in JSON format.
        
The output MUST be valid JSON with the following structure:
{
    "title": "The Title",
    "author": "The Author",
    "description": "A short summary",
    "style": "The agreed upon style/tone",
    "genre": "fiction | non-fiction | hybrid",
    "chapters": [
        {
            "title": "Chapter 1: The Beginning",
            "plot_summary": "Detailed instructions on what happens in this chapter, characters involved, and key plot points. This will be used to generate the full text later."
        },
        ...
    ]
}

IMPORTANT:
1. Analyze the user's request to determine the "genre":
   - "fiction": Invented stories, novels.
   - "non-fiction": Factual books, history, science, biographies.
   - "hybrid": A mix, e.g., historical fiction, or a story that teaches real facts.
2. Create a comprehensive list of chapters (at least 5-10 unless specified otherwise).
3. The "plot_summary" for each chapter must be detailed enough to guide the writing of a full chapter (2-3 sentences minimum).
4. Do NOT write the full chapter content yet.
5. Ensure the structure matches the user's request (genre, length, etc.).`;

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
        let textContent = response.content[0]?.text || "";

        // Clean up markdown code blocks if present
        textContent = textContent.replace(/```json\n?|\n?```/g, '').trim();

        // Find the first '{' and last '}' to ensure we only get the JSON object
        const firstBrace = textContent.indexOf('{');
        const lastBrace = textContent.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1) {
            textContent = textContent.substring(firstBrace, lastBrace + 1);
        }

        return NextResponse.json({
            content: textContent
        });

    } catch (error: any) {
        console.error('Generate Book API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
