"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Star, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { extractTextFromPDF, getPDFMetadata, renderPDFCover } from "@/lib/pdf-utils";

// Mock Data for Books
const INITIAL_BOOKS = [
    { id: "1", title: "The Great Gatsby", author: "F. Scott Fitzgerald", coverColor: "bg-blue-200" },
    { id: "2", title: "1984", author: "George Orwell", coverColor: "bg-red-200" },
    { id: "3", title: "To Kill a Mockingbird", author: "Harper Lee", coverColor: "bg-green-200" },
    { id: "4", title: "Pride and Prejudice", author: "Jane Austen", coverColor: "bg-pink-200" },
    { id: "5", title: "The Catcher in the Rye", author: "J.D. Salinger", coverColor: "bg-yellow-200" },
    { id: "6", title: "Moby Dick", author: "Herman Melville", coverColor: "bg-indigo-200" },
];

export default function Bookshelf() {
    const [books, setBooks] = useState(INITIAL_BOOKS);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        // Load custom books from localStorage
        const savedBooks = JSON.parse(localStorage.getItem("customBooks") || "[]");
        if (savedBooks.length > 0) {
            setBooks([...INITIAL_BOOKS, ...savedBooks]);
        }
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // Parallelize operations for speed
            const [pdfContent, metadata, coverImage] = await Promise.all([
                extractTextFromPDF(file),
                getPDFMetadata(file),
                renderPDFCover(file).catch(() => null) // Fail gracefully on cover
            ]);

            const { pages, fullText } = pdfContent;

            if (!fullText || fullText.trim().length === 0) {
                throw new Error("No text found in PDF. It might be a scanned image.");
            }

            const newBook = {
                id: `custom-${Date.now()}`,
                title: metadata.title || file.name.replace(".pdf", ""),
                author: metadata.author || "Unknown Author",
                coverColor: "bg-gray-200",
                coverImage: coverImage, // Store data URL
                content: fullText,
                pages: pages,
                isCustom: true
            };

            const existingCustom = JSON.parse(localStorage.getItem("customBooks") || "[]");
            // Save metadata to list (exclude heavy content)
            localStorage.setItem("customBooks", JSON.stringify([...existingCustom, { ...newBook, content: undefined, pages: undefined }]));
            // Save full book data
            localStorage.setItem(`book-${newBook.id}`, JSON.stringify(newBook));

            // Update local state
            const bookForList = { ...newBook, content: undefined, pages: undefined };
            setBooks(prev => [...prev, bookForList]);
        } catch (error) {
            console.error("Failed to parse PDF", error);
            alert("Failed to read PDF. Please try another file.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div
            className="min-h-screen w-full relative flex flex-col items-center overflow-hidden bg-white"
            style={{
                backgroundImage: 'linear-gradient(rgba(247, 243, 240, 0) 0%, rgba(241, 189, 122, 0.97) 17.3899%, rgb(252, 190, 109) 32.9462%, rgb(228, 108, 68) 51.4622%, rgb(84, 37, 18) 78.2939%, rgb(30, 19, 16) 100%)'
            }}
        >
            {/* Header Section */}
            <div className="w-full max-w-6xl px-6 pt-24 pb-12 flex flex-col items-center text-center z-10">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-[#0c1018] text-5xl md:text-7xl font-light tracking-tight mb-6"
                    style={{ fontFamily: 'serif' }}
                >
                    All your books, <br />
                    <span className="italic">under one mind.</span>
                </motion.h1>

                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-[#0c1018]/60 text-xl md:text-3xl max-w-3xl font-light leading-relaxed mb-8"
                >
                    Explore your library and gain instant understanding through AI-powered insights.
                </motion.h2>

                {/* Upload Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                >
                    <label className="cursor-pointer bg-black text-white px-8 py-4 rounded-full font-medium hover:bg-black/80 transition-colors flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                        {isUploading ? (
                            <span className="animate-pulse">Reading PDF...</span>
                        ) : (
                            <>
                                <Upload className="w-5 h-5" />
                                <span>Upload PDF</span>
                            </>
                        )}
                        <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                    </label>
                </motion.div>
            </div>

            {/* Books Grid */}
            <div className="w-full max-w-6xl px-6 pb-24 z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                {books.map((book: any, index) => (
                    <motion.div
                        key={book.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                        <Link href={`/reader/${book.id}`} className="group block">
                            <div className={`aspect-[2/3] w-full rounded-lg shadow-lg ${book.coverColor} relative overflow-hidden transition-transform duration-300 group-hover:-translate-y-2 group-hover:shadow-xl`}>

                                {/* Cover Image if available */}
                                {book.coverImage ? (
                                    <img src={book.coverImage} alt={book.title} className="absolute inset-0 w-full h-full object-cover" />
                                ) : (
                                    <>
                                        {/* Book Spine/Detail for default covers */}
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

                                {/* Glassmorphism Overlay */}
                                <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                                    <span className="bg-white/90 text-black px-4 py-2 rounded-full text-sm font-medium">Read Now</span>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* Decorative Elements from original design */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white to-transparent pointer-events-none"></div>
        </div>
    );
}
