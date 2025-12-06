import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { title, author, description, chapterTitle, chapterDescription, style, genre } = await req.json();

        if (!process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json({ error: 'Missing Anthropic API Key' }, { status: 500 });
        }

        let content = "";

        if (genre === 'non-fiction') {
            console.log(`Generating Non-Fiction chapter: ${chapterTitle} using Perplexity`);
            content = await generateWithPerplexity(title, chapterTitle, chapterDescription, style);
        } else if (genre === 'hybrid') {
            console.log(`Generating Hybrid chapter: ${chapterTitle} using Perplexity + Claude`);
            // 1. Research with Perplexity
            const research = await researchWithPerplexity(title, chapterTitle, chapterDescription);
            // 2. Write with Claude using the research
            content = await generateWithClaude(title, author, description, chapterTitle, chapterDescription, style, research);
        } else {
            // Default to Fiction (Claude)
            console.log(`Generating Fiction chapter: ${chapterTitle} using Claude`);
            content = await generateWithClaude(title, author, description, chapterTitle, chapterDescription, style);
        }

        return NextResponse.json({ content });

    } catch (error: any) {
        console.error('Generate Chapter API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function generateWithPerplexity(bookTitle: string, chapterTitle: string, chapterDesc: string, style: string) {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("Missing OpenRouter API Key for Perplexity");
    }

    const prompt = `You are an expert non-fiction author. Write a complete, detailed, and accurate chapter for a book.

Book Title: ${bookTitle}
Chapter Title: ${chapterTitle}
Chapter Context: ${chapterDesc}
Style/Tone: ${style || 'Informative and engaging'}

REQUIREMENTS:
1. Write ONLY the content of the chapter. No title or intro text.
2. Ensure all information is accurate and factual.
3. Include citations or references where appropriate if this is a research-heavy topic.
4. The chapter should be substantial (aim for 1000+ words).
5. Use clear headings and structure if helpful for the topic.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://listener.app", // Optional, for OpenRouter rankings
            "X-Title": "Listener App"
        },
        body: JSON.stringify({
            model: "perplexity/llama-3.1-sonar-huge-128k-online",
            messages: [
                { role: "user", content: prompt }
            ]
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenRouter/Perplexity Error: ${err}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
}

async function researchWithPerplexity(bookTitle: string, chapterTitle: string, chapterDesc: string) {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("Missing OpenRouter API Key for Perplexity");
    }

    const prompt = `Research the following topic for a book chapter and provide a detailed list of key facts, dates, real-world context, and interesting details that should be included.

Book Title: ${bookTitle}
Chapter Title: ${chapterTitle}
Context: ${chapterDesc}

Provide a bulleted list of factual information found online.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://listener.app",
            "X-Title": "Listener App"
        },
        body: JSON.stringify({
            model: "perplexity/llama-3.1-sonar-huge-128k-online",
            messages: [
                { role: "user", content: prompt }
            ]
        })
    });

    if (!response.ok) {
        // Fallback: If research fails, return empty string so Claude can still try to write
        console.error("Perplexity research failed, continuing without it.");
        return "";
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
}

async function generateWithClaude(
    title: string,
    author: string,
    description: string,
    chapterTitle: string,
    chapterDescription: string,
    style: string,
    researchContext?: string
) {
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    let systemPrompt = `You are an expert novelist. Your task is to write ONE complete chapter for a book.
    
Book Title: ${title}
Author: ${author}
Book Description: ${description}
Style/Tone: ${style || 'Engaging and professional'}

Current Chapter: ${chapterTitle}
Chapter Context: ${chapterDescription}`;

    if (researchContext) {
        systemPrompt += `\n\nREAL-WORLD RESEARCH/FACTS TO INCORPORATE:\n${researchContext}\n\nINSTRUCTIONS FOR HYBRID MODE:\n- Weave these real facts into the narrative naturally.\n- Ensure the story feels grounded in reality using these details.\n- Maintain the narrative flow while being factually informed.`;
    }

    systemPrompt += `\n\nWRITING RULES:
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
    return response.content[0]?.text || "";
}
