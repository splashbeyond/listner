import React from "react";
import BookReader from "@/components/BookReader";
import { BOOKS_CONTENT } from "@/lib/books";

export default async function ReaderPage(props: { params: Promise<{ bookId: string }> }) {
    const params = await props.params;
    const book = BOOKS_CONTENT[params.bookId as keyof typeof BOOKS_CONTENT];

    // If book is found statically, pass it. If not, pass just the ID and let the component try to load from storage.
    return (
        <BookReader
            bookId={params.bookId}
            initialBook={book || null}
        />
    );
}
