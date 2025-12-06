"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Star, Upload, Loader2, Bookmark } from "lucide-react";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";
import { renderPDFCover } from "@/lib/pdf-utils";
import { saveBookToDB, getAllBooksFromDB, clearAllBooksFromDB } from "@/lib/db";
import { EPUB_BOOKS, parseEpubFile, extractEpubCover } from "@/lib/epub-utils";

export default function LibraryPage() {
    const [books, setBooks] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoadingEpub, setIsLoadingEpub] = useState(true);
    const [uploadProgress, setUploadProgress] = useState(0);

    const { user } = useUser();

    useEffect(() => {
        loadLibrary();
    }, [user]);

    const loadLibrary = async () => {
        setIsLoadingEpub(true);

        // Check if we have EPUB books already
        const storedBooks = await getAllBooksFromDB(user?.id);
        const storedEpubBooks = storedBooks.filter(book => book.id?.startsWith('epub-'));

        // If we have fewer stored books than static config, we need to reload/add the new ones
        const hasAllEpubBooks = storedEpubBooks.length >= EPUB_BOOKS.length;

        if (hasAllEpubBooks) {
            // Merge stored books with static data to ensure we get the new static covers
            const mergedBooks = storedBooks.map(storedBook => {
                const staticBook = EPUB_BOOKS.find(b => b.id === storedBook.id);
                if (staticBook && staticBook.coverImage) {
                    // Force update the cover image from static config
                    return { ...storedBook, coverImage: staticBook.coverImage };
                }
                return storedBook;
            });

            setBooks(mergedBooks);
            setIsLoadingEpub(false);
            checkAndLoadCovers(mergedBooks);
        } else {
            // Reload/Add missing books
            console.log('New EPUB books detected, reloading...');
            await loadEpubBooks();
        }
    };

    const checkAndLoadCovers = async (currentBooks: any[]) => {
        console.log('Checking for missing covers...');
        let updated = false;
        const updatedBooks = [...currentBooks];

        for (let i = 0; i < updatedBooks.length; i++) {
            const book = updatedBooks[i];
            // Find the original file path from the static list if missing
            const staticData = EPUB_BOOKS.find(b => b.id === book.id);
            const filePath = book.filePath || staticData?.filePath;

            if (!book.coverImage && filePath) {
                try {
                    console.log(`Extracting cover for ${book.title}...`);
                    const coverUrl = await extractEpubCover(filePath);

                    if (coverUrl) {
                        book.coverImage = coverUrl;
                        book.filePath = filePath; // Ensure path is saved
                        await saveBookToDB(book);
                        updated = true;
                        // Update state incrementally to show progress
                        setBooks([...updatedBooks]);
                    }
                } catch (err) {
                    console.error(`Failed to extract cover for ${book.title}`, err);
                }
            }
        }

        if (updated) {
            console.log('Finished updating covers');
        }
    };

    const loadEpubBooks = async () => {
        try {
            console.log('Loading EPUB books from public/books directory...');

            // Get existing books to preserve custom ones and existing covers
            const existingBooks = await getAllBooksFromDB(user?.id);
            const existingBookMap = new Map(existingBooks.map(b => [b.id, b]));

            // Filter out old EPUB books from existing list to avoid duplicates/stale data
            // But KEEP custom books (those not starting with 'epub-')
            const customBooks = existingBooks.filter(b => !b.id.startsWith('epub-'));

            // Load all EPUB books from static config
            const appBooks = EPUB_BOOKS.map(book => {
                const existing = existingBookMap.get(book.id);
                return {
                    id: book.id,
                    title: book.title,
                    author: book.author,
                    coverColor: book.coverColor,
                    // FORCE use of static cover if available, otherwise fall back to existing
                    coverImage: book.coverImage || existing?.coverImage,
                    filePath: book.filePath,
                    content: existing?.content || '', // Preserve existing content if already parsed
                    pages: existing?.pages || [], // Preserve existing pages
                    userId: user?.id // Ensure associated with user
                };
            });

            // Combine new EPUBs with preserved custom books
            const finalBookList = [...appBooks, ...customBooks];

            // Save ONLY the EPUB books to DB (custom ones are already there)
            // We iterate appBooks to update/insert them
            for (const book of appBooks) {
                await saveBookToDB(book);
            }

            setBooks(finalBookList);
            setIsLoadingEpub(false); // Show books immediately

            // Lazily load covers
            await checkAndLoadCovers(appBooks);

        } catch (error) {
            console.error('Failed to load EPUB books:', error);
            setIsLoadingEpub(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const coverImage = await renderPDFCover(file).catch(() => null);

            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/parse-pdf", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Failed to parse PDF");
            }

            const data = await response.json();

            const newBook = {
                id: `custom-${Date.now()}`,
                title: file.name.replace(".pdf", ""),
                author: "Unknown Author",
                coverColor: "bg-purple-200",
                content: data.fullText,
                coverImage: coverImage || undefined,
            };

            await saveBookToDB(newBook);
            setBooks((prev) => [...prev, newBook]);
        } catch (error) {
            console.error("Failed to parse PDF", error);
            alert("Failed to read PDF. Please try another file.");
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="min-h-screen w-full relative flex flex-col items-center bg-gradient-to-b from-[#2d1810] via-[#1a2332] to-[#0f1419]">
            {/* Fixed Navigation Bar */}
            <Navbar />

            {/* Main Content */}
            <div className="w-full max-w-7xl px-6 pt-32 pb-24">
                {/* Upload Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col items-center gap-6 mb-16"
                >
                    <label className="cursor-pointer bg-white text-black px-8 py-4 rounded-full font-medium hover:bg-gray-100 transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                        {isUploading ? (
                            <span className="animate-pulse">Processing PDF...</span>
                        ) : (
                            <>
                                <Upload className="w-5 h-5" />
                                <span>Upload PDF</span>
                            </>
                        )}
                        <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                    </label>
                </motion.div>

                {/* Loading State */}
                {isLoadingEpub && books.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
                        <p className="text-white/60 text-lg">Loading classic books...</p>
                    </div>
                )}

                {/* Empty State */}
                {!isLoadingEpub && books.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-white/60 text-lg">No books in your library yet. Upload a PDF to get started!</p>
                    </div>
                )}

                {/* Books Grid */}
                {books.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {books.map((book: any, index: number) => (
                            <motion.div
                                key={book.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: index * 0.05 }}
                            >
                                <Link href={`/reader/${book.id}`} className="group block">
                                    <div className={`aspect-[2/3] w-full rounded-lg shadow-lg ${book.coverColor} relative overflow-hidden transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl`}>
                                        {book.coverImage ? (
                                            <img src={book.coverImage} alt={book.title} className="absolute inset-0 w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <div className="absolute left-0 top-0 bottom-0 w-4 bg-black/10"></div>
                                                <div className="p-6 flex flex-col h-full justify-between relative z-10">
                                                    <div className="text-right">
                                                        <Star className="w-5 h-5 text-black/20 inline-block" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-serif text-black/80 leading-tight mb-1 line-clamp-3">{book.title}</h3>
                                                        <p className="text-sm text-black/50 uppercase tracking-widest line-clamp-1">{book.author}</p>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* Bookmark Overlay if progress exists */}
                                        {((book.currentPage && book.currentPage > 0) || (book.lastSentenceIndex && book.lastSentenceIndex > 0)) && (
                                            <div className="absolute top-0 right-4 z-20">
                                                <div className="relative">
                                                    <Bookmark className="w-8 h-8 text-red-600 fill-red-600 drop-shadow-md" />
                                                </div>
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                                            <span className="bg-white/90 text-black px-4 py-2 rounded-full text-sm font-medium">
                                                {((book.currentPage && book.currentPage > 0) || (book.lastSentenceIndex && book.lastSentenceIndex > 0)) ? "Continue Reading" : "Read Now"}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
