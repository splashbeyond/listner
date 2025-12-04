"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, ArrowLeft, Sparkles, X, MessageSquare, Settings } from "lucide-react";
import Link from "next/link";
import ReviewPanel from "./ReviewPanel";
import TTSControls, { VOICES } from "./TTSControls";

interface BookData {
    title: string;
    author: string;
    content: string;
    pages?: string[];
}

interface BookReaderProps {
    bookId: string;
    initialBook: BookData | null;
}

interface Sentence {
    text: string;
    pageIndex: number;
}

export default function BookReader({ bookId, initialBook }: BookReaderProps) {
    const [book, setBook] = useState<BookData | null>(initialBook);
    const [sentences, setSentences] = useState<Sentence[]>([]);
    const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const [explanation, setExplanation] = useState("");
    const [isExplaining, setIsExplaining] = useState(false);
    const [showReviews, setShowReviews] = useState(false);
    const [isLoading, setIsLoading] = useState(!initialBook);
    const [currentPage, setCurrentPage] = useState(0);

    // TTS State
    const [voice, setVoice] = useState(VOICES[0].id);
    const [rate, setRate] = useState(1.0);
    const [volume, setVolume] = useState(1.0);
    const [showSettings, setShowSettings] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isPlayingRef = useRef(false);
    const currentRequestRef = useRef<AbortController | null>(null);

    // Load from local storage if not provided initially
    useEffect(() => {
        console.log("BookReader mounted with ID:", bookId);
        if (!initialBook) {
            setIsLoading(true);
            const storedBook = localStorage.getItem(`book-${bookId}`);

            if (storedBook) {
                try {
                    const parsedBook = JSON.parse(storedBook);
                    setBook(parsedBook);
                    processBookContent(parsedBook);
                } catch (e) {
                    console.error("Failed to parse book from localStorage", e);
                }
            }
            setIsLoading(false);
        } else {
            processBookContent(initialBook);
            setIsLoading(false);
        }
    }, [bookId, initialBook]);

    const processBookContent = (bookData: BookData) => {
        const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
        const allSentences: Sentence[] = [];

        if (bookData.pages && bookData.pages.length > 0) {
            bookData.pages.forEach((page, pageIndex) => {
                const segments = Array.from(segmenter.segment(page)).map(s => ({
                    text: s.segment,
                    pageIndex
                }));
                allSentences.push(...segments);
            });
        } else if (bookData.content) {
            const segments = Array.from(segmenter.segment(bookData.content)).map(s => ({
                text: s.segment,
                pageIndex: 0
            }));
            allSentences.push(...segments);
        }
        setSentences(allSentences);
    };

    // Initialize Audio once
    useEffect(() => {
        const audio = new Audio();
        audioRef.current = audio;

        // Handle audio ending
        const handleEnded = () => {
            setActiveSentenceIndex(prev => {
                if (prev === null) return 0;

                let next = prev + 1;
                // Skip empty or whitespace-only sentences
                while (next < sentences.length && !sentences[next]?.text?.trim()) {
                    next++;
                }

                if (next < sentences.length && isPlayingRef.current) {
                    playSentence(next);
                    return next;
                } else {
                    setIsPlaying(false);
                    isPlayingRef.current = false;
                    return null;
                }
            });
        };

        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('ended', handleEnded);
            audio.pause();
            audio.src = "";
        };
    }, [sentences]);

    // Update volume when it changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    // Auto-turn page if playback moves to next page
    useEffect(() => {
        if (activeSentenceIndex !== null && sentences[activeSentenceIndex]) {
            const sentencePage = sentences[activeSentenceIndex].pageIndex;
            if (sentencePage !== currentPage) {
                setCurrentPage(sentencePage);
            }
        }
    }, [activeSentenceIndex, sentences]);

    const playSentence = async (index: number) => {
        if (!sentences[index] || !audioRef.current) return;

        // Cancel any pending TTS request
        if (currentRequestRef.current) {
            currentRequestRef.current.abort();
        }

        // Create new AbortController for this request
        const controller = new AbortController();
        currentRequestRef.current = controller;

        try {
            const ratePercent = Math.round((rate - 1) * 100);
            const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

            const response = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: sentences[index].text,
                    voice: voice,
                    rate: rateStr
                }),
                signal: controller.signal
            });

            if (!response.ok) throw new Error("TTS Failed");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = url;

                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        if (error.name !== 'AbortError') {
                            console.error('Playback failed:', error);
                        }
                    });
                }

                setActiveSentenceIndex(index);
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error("Playback error", error);
                setIsPlaying(false);
                isPlayingRef.current = false;
            }
        } finally {
            if (currentRequestRef.current === controller) {
                currentRequestRef.current = null;
            }
        }
    };

    const togglePlay = () => {
        if (isPlaying) {
            audioRef.current?.pause();
            setIsPlaying(false);
            isPlayingRef.current = false;
        } else {
            setIsPlaying(true);
            isPlayingRef.current = true;
            const startIndex = activeSentenceIndex !== null ? activeSentenceIndex : 0;
            playSentence(startIndex);
        }
    };

    const handleSentenceClick = (index: number, text: string) => {
        if (isPlaying) {
            playSentence(index);
        } else {
            setActiveSentenceIndex(index);
            setShowOverlay(true);
            setIsExplaining(true);

            setTimeout(() => {
                setExplanation(`Here is an explanation for: "${text.substring(0, 30)}..." \n\nThis sentence sets the tone for the narrative, establishing a reflective mood. The author uses this to foreshadow the themes of judgment and class that permeate the novel.`);
                setIsExplaining(false);
            }, 1500);
        }
    };

    const getCurrentPageSentences = () => {
        if (!book?.pages) return sentences;
        return sentences.filter(s => s.pageIndex === currentPage);
    };

    const handleNextPage = () => {
        if (book?.pages && currentPage < book.pages.length - 1) {
            setCurrentPage(prev => prev + 1);
            setIsPlaying(false);
            isPlayingRef.current = false;
            audioRef.current?.pause();
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(prev => prev - 1);
            setIsPlaying(false);
            isPlayingRef.current = false;
            audioRef.current?.pause();
        }
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
                <div className="flex items-center gap-2 relative">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 hover:bg-black/5 rounded-full transition-colors ${showSettings ? "bg-black/5" : ""}`}
                    >
                        <Settings className="w-5 h-5 opacity-60" />
                    </button>

                    <TTSControls
                        isOpen={showSettings}
                        onClose={() => setShowSettings(false)}
                        voice={voice}
                        setVoice={setVoice}
                        rate={rate}
                        setRate={setRate}
                        volume={volume}
                        setVolume={setVolume}
                    />

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
                {getCurrentPageSentences().map((sentence, localIndex) => {
                    const globalIndex = sentences.indexOf(sentence);
                    return (
                        <span
                            key={globalIndex}
                            onClick={() => handleSentenceClick(globalIndex, sentence.text)}
                            className={`
                                cursor-pointer transition-colors duration-200 rounded px-1
                                ${activeSentenceIndex === globalIndex ? "bg-yellow-200/50" : "hover:bg-black/5"}
                            `}
                        >
                            {sentence.text}
                        </span>
                    );
                })}
            </div>

            {/* Page Navigation */}
            {book?.pages && (
                <div className="fixed bottom-8 left-0 right-0 flex justify-center items-center gap-8 z-20">
                    <button
                        onClick={handlePrevPage}
                        disabled={currentPage === 0}
                        className="p-3 rounded-full bg-white shadow-lg disabled:opacity-30 hover:bg-gray-50 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="font-sans text-sm font-medium opacity-60">
                        Page {currentPage + 1} of {book.pages.length}
                    </span>
                    <button
                        onClick={handleNextPage}
                        disabled={currentPage === (book.pages.length - 1)}
                        className="p-3 rounded-full bg-white shadow-lg disabled:opacity-30 hover:bg-gray-50 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 rotate-180" />
                    </button>
                </div>
            )}

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
