"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, ArrowLeft, Sparkles, X, MessageSquare } from "lucide-react";
import Link from "next/link";
import ReviewPanel from "./ReviewPanel";

interface BookData {
    title: string;
    author: string;
    content: string;
}

interface BookReaderProps {
    bookId: string;
    initialBook: BookData | null;
}

export default function BookReader({ bookId, initialBook }: BookReaderProps) {
    const [book, setBook] = useState<BookData | null>(initialBook);
    const [sentences, setSentences] = useState<string[]>([]);
    const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const [explanation, setExplanation] = useState("");
    const [isExplaining, setIsExplaining] = useState(false);
    const [showReviews, setShowReviews] = useState(false);
    const [isLoading, setIsLoading] = useState(!initialBook);

    const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Load from local storage if not provided initially
    useEffect(() => {
        console.log("BookReader mounted with ID:", bookId);
        if (!initialBook) {
            setIsLoading(true);
            const storedBook = localStorage.getItem(`book-${bookId}`);
            console.log("Found in localStorage:", storedBook ? "Yes" : "No");

            if (storedBook) {
                try {
                    const parsedBook = JSON.parse(storedBook);
                    setBook(parsedBook);
                    if (parsedBook?.content) {
                        const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
                        const segments = Array.from(segmenter.segment(parsedBook.content)).map(s => s.segment);
                        setSentences(segments);
                    }
                } catch (e) {
                    console.error("Failed to parse book from localStorage", e);
                }
            }
            setIsLoading(false);
        } else if (initialBook?.content) {
            const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
            const segments = Array.from(segmenter.segment(initialBook.content)).map(s => s.segment);
            setSentences(segments);
            setIsLoading(false);
        }
    }, [bookId, initialBook]);

    // Handle TTS
    useEffect(() => {
        if (typeof window !== "undefined" && book?.content) {
            window.speechSynthesis.cancel(); // Cancel any previous speech
            const utterance = new SpeechSynthesisUtterance(book.content);
            utterance.rate = 0.9;

            utterance.onboundary = (event) => {
                if (event.name === "sentence") {
                    // Placeholder for karaoke sync
                }
            };

            utterance.onend = () => setIsPlaying(false);
            speechRef.current = utterance;
        }

        return () => {
            if (typeof window !== "undefined") window.speechSynthesis.cancel();
        };
    }, [book]);

    const togglePlay = () => {
        if (isPlaying) {
            window.speechSynthesis.pause();
            setIsPlaying(false);
        } else {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            } else {
                if (speechRef.current) {
                    window.speechSynthesis.speak(speechRef.current);
                }
            }
            setIsPlaying(true);
        }
    };

    const handleSentenceClick = (index: number, text: string) => {
        setActiveSentenceIndex(index);
        setShowOverlay(true);
        setIsExplaining(true);

        // Mock AI Explanation
        setTimeout(() => {
            setExplanation(`Here is an explanation for: "${text.substring(0, 30)}..." \n\nThis sentence sets the tone for the narrative, establishing a reflective mood. The author uses this to foreshadow the themes of judgment and class that permeate the novel.`);
            setIsExplaining(false);
        }, 1500);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
                <div className="text-center animate-pulse">
                    <h2 className="text-xl font-serif mb-2">Loading Book...</h2>
                    <p className="text-sm text-gray-400">Fetching content from your library.</p>
                </div>
            </div>
        );
    }

    if (!book) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
                <div className="text-center">
                    <h2 className="text-xl font-serif mb-2">Book Not Found</h2>
                    <p className="text-sm text-gray-400">Could not load book content.</p>
                    <Link href="/" className="mt-4 inline-block bg-black text-white px-4 py-2 rounded-full text-sm font-sans">
                        Back to Bookshelf
                    </Link>
                </div>
            </div>
        );
    }

    if (!book.content || book.content.trim().length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
                <div className="text-center">
                    <h2 className="text-xl font-serif mb-2">No Content Found</h2>
                    <p className="text-sm text-gray-400">This book appears to be empty.</p>
                    <Link href="/" className="mt-4 inline-block bg-black text-white px-4 py-2 rounded-full text-sm font-sans">
                        Back to Bookshelf
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fdfbf7] text-[#1a1a1a] font-serif relative">
            {/* Navigation Bar */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-[#fdfbf7]/90 backdrop-blur-sm border-b border-black/5 z-20 flex items-center justify-between px-6">
                <Link href="/" className="p-2 hover:bg-black/5 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 opacity-60" />
                </Link>
                <div className="text-center">
                    <h1 className="text-sm font-bold tracking-wide uppercase opacity-80 truncate max-w-xs">{book.title}</h1>
                    <p className="text-xs opacity-50 truncate max-w-xs">{book.author}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowReviews(true)}
                        className="p-2 hover:bg-black/5 rounded-full transition-colors"
                    >
                        <MessageSquare className="w-5 h-5 opacity-60" />
                    </button>
                    <button
                        onClick={togglePlay}
                        className="p-2 hover:bg-black/5 rounded-full transition-colors"
                    >
                        {isPlaying ? <Pause className="w-6 h-6 opacity-60" /> : <Play className="w-6 h-6 opacity-60" />}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-2xl mx-auto pt-32 pb-32 px-8 leading-loose text-lg md:text-xl">
                {sentences.map((sentence, index) => (
                    <span
                        key={index}
                        onClick={() => handleSentenceClick(index, sentence)}
                        className={`
              cursor-pointer transition-colors duration-200 rounded px-1
              ${activeSentenceIndex === index ? "bg-yellow-200/50" : "hover:bg-black/5"}
            `}
                    >
                        {sentence}
                    </span>
                ))}
            </div>

            {/* Reviews Panel */}
            <ReviewPanel isOpen={showReviews} onClose={() => setShowReviews(false)} />

            {/* AI Explanation Overlay */}
            <AnimatePresence>
                {showOverlay && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-3xl z-30 p-8 border-t border-black/5 max-h-[50vh] overflow-y-auto"
                    >
                        <div className="max-w-2xl mx-auto relative">
                            <button
                                onClick={() => setShowOverlay(false)}
                                className="absolute -top-2 -right-2 p-2 hover:bg-black/5 rounded-full"
                            >
                                <X className="w-5 h-5 opacity-40" />
                            </button>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <h3 className="font-sans font-semibold text-lg">AI Insight</h3>
                            </div>

                            {isExplaining ? (
                                <div className="space-y-3 animate-pulse">
                                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                                </div>
                            ) : (
                                <p className="font-sans text-gray-700 leading-relaxed whitespace-pre-line">
                                    {explanation}
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
