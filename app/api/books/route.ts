import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { book, userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const savedBook = await prisma.book.create({
            data: {
                userId,
                title: book.title,
                author: book.author,
                description: book.description || "",
                content: book.content,
                coverImage: book.coverImage,
                coverColor: book.coverColor || "bg-blue-500",
            }
        });

        return NextResponse.json(savedBook);
    } catch (error: any) {
        console.error('Save Book API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        const books = await prisma.book.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(books);
    } catch (error: any) {
        console.error('Get Books API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
