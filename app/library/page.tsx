"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Star, Upload, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { renderPDFCover } from "@/lib/pdf-utils";
import { saveBookToDB, getAllBooksFromDB, clearAllBooksFromDB } from "@/lib/db";
import { fetchPopularBooks, POPULAR_CLASSICS, fetchBookById, convertToAppBook, fetchBookText } from "@/lib/gutenberg";

export default function LibraryPage() {
    const [books, setBooks] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoadingGutenberg, setIsLoadingGutenberg] = useState(true);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        loadLibrary();
    }, []);

    const loadLibrary = async () => {
        setIsLoadingGutenberg(true);

        // Check if we have Gutenberg books already
        const storedBooks = await getAllBooksFromDB();
        const hasGutenbergBooks = storedBooks.some(book => book.id?.startsWith('gutenberg-'));

        if (hasGutenbergBooks) {
            // Show existing Gutenberg books
            setBooks(storedBooks);
            setIsLoadingGutenberg(false);
        } else {
            // Clear old books and fetch Gutenberg
            console.log('No Gutenberg books found, fetching fresh...');
            await loadGutenbergBooks();
        }
    };

    const loadGutenbergBooks = async () => {
        try {
            console.log('Fetching popular Gutenberg books...');

            // Clear any existing books first
            await clearAllBooksFromDB();

            // Fetch a curated selection of popular classics
            const bookPromises = POPULAR_CLASSICS.slice(0, 12).map(id => fetchBookById(id));
            const gutenbergBooks = await Promise.all(bookPromises);

            // Convert to app format (without content initially for faster loading)
            const appBooks = gutenbergBooks
                .filter(book => book !== null)
                .map(book => convertToAppBook(book!));

            // Save to IndexedDB
            for (const book of appBooks) {
                await saveBookToDB(book);
            }

            setBooks(appBooks);
            console.log(`Loaded ${appBooks.length} Gutenberg books`);
        } catch (error) {
            console.error('Failed to load Gutenberg books:', error);
        } finally {
            setIsLoadingGutenberg(false);
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
            <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-[#2d1810]/95 to-transparent backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
                    <Link href="/" className="text-white text-xl font-bold tracking-wider uppercase">
                        Listener
                    </Link>

                    <div className="hidden md:flex items-center gap-8 text-sm text-white/80">
                        <Link href="/library" className="text-white font-medium">Library</Link>
                        <Link href="/create" className="hover:text-white transition-colors">Create</Link>
                        <a href="#about" className="hover:text-white transition-colors">About</a>
                        <a href="#contact" className="hover:text-white transition-colors">Contact</a>
                    </div>
                </div>
            </nav>

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
                {isLoadingGutenberg && books.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
                        <p className="text-white/60 text-lg">Loading classic books from Project Gutenberg...</p>
                    </div>
                )}

                {/* Empty State */}
                {!isLoadingGutenberg && books.length === 0 && (
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

                                        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                                            <span className="bg-white/90 text-black px-4 py-2 rounded-full text-sm font-medium">Read Now</span>
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
