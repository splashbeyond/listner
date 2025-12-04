"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Star, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { renderPDFCover } from "@/lib/pdf-utils";
import HeroSection from "./HeroSection";
import { saveBookToDB, getAllBooksFromDB } from "@/lib/db";

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
    const [uploadProgress, setUploadProgress] = useState(0);
    const [useOCR, setUseOCR] = useState(false);

    // ... useEffect

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(0); // Indeterminate state for now

        try {
            // Get cover image locally (still fast and good for UI)
            const coverImage = await renderPDFCover(file).catch(() => null);

            // Send file to server for Python processing
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/parse-pdf", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const err = await response.json();
                console.error("Server Error:", err);
                throw new Error(err.error || "Failed to parse PDF");
            }

            const data = await response.json();
            const { pages, fullText, metadata } = data;

            if (!fullText || fullText.trim().length === 0) {
                throw new Error("No text found in PDF. It might be a scanned image.");
            }

            const newBook = {
                id: `custom-${Date.now()}`,
                title: metadata?.Title || file.name.replace(".pdf", ""),
                author: metadata?.Author || "Unknown Author",
                coverColor: "bg-gray-200",
                coverImage: coverImage, // Store data URL
                content: fullText,
                pages: pages,
                isCustom: true
            };

            // Save full book to IndexedDB
            await saveBookToDB(newBook);

            // Update local state (lightweight version)
            const bookForList = { ...newBook, content: undefined, pages: undefined };
            setBooks(prev => [...prev, bookForList]);
        } catch (error) {
            console.error("Failed to parse PDF", error);
            alert("Failed to read PDF. Please try another file.");
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="min-h-screen w-full relative flex flex-col items-center overflow-hidden bg-[#fdfbf7]">

            {/* Warm Gradient Background (Fixed) */}
            <div
                className="fixed inset-0 z-0 opacity-80 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 0%, rgba(241, 189, 122, 0.2) 40%, rgba(228, 108, 68, 0.4) 70%, rgba(84, 37, 18, 0.6) 100%)',
                    filter: 'blur(60px)'
                }}
            />

            {/* Subtle Texture/Noise Overlay */}
            <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

            <div className="relative z-10 w-full flex flex-col items-center">
                <HeroSection />

                {/* Upload Button Section */}
                <div className="w-full max-w-6xl px-6 py-12 flex flex-col items-center gap-4" id="library">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="flex flex-col items-center gap-4"
                    >
                        <label className="cursor-pointer bg-[#1a1a1a] text-[#fdfbf7] px-8 py-4 rounded-full font-medium hover:bg-black transition-colors flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                            {isUploading ? (
                                <span className="animate-pulse">
                                    Processing PDF...
                                </span>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5" />
                                    <span className="font-sans">Upload PDF</span>
                                </>
                            )}
                            <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                        </label>
                    </motion.div>
                </div>

                {/* Books Grid */}
                <div className="w-full max-w-6xl px-6 pb-24 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                    {books.map((book: any, index: number) => (
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
            </div>
        </div>
    );
}
