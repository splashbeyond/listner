import { prisma } from './prisma';

export async function saveBookToCloud(book: any, userId: string) {
    if (!userId) throw new Error("User ID is required");

    return await prisma.book.create({
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
}

export async function getBooksFromCloud(userId: string) {
    if (!userId) return [];

    return await prisma.book.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });
}

export async function getBookFromCloud(bookId: string, userId: string) {
    if (!userId) return null;

    return await prisma.book.findFirst({
        where: {
            id: bookId,
            userId
        }
    });
}
