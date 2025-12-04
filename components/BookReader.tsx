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

    // TTS State
    const [voice, setVoice] = useState(VOICES[0].id);
    const [rate, setRate] = useState(1.0);
    const [volume, setVolume] = useState(1.0);
    const [showSettings, setShowSettings] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isPlayingRef = useRef(false);

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

    // Audio Player Setup
    useEffect(() => {
        const audio = new Audio();
        audioRef.current = audio;
        audio.volume = volume;

        audio.onended = () => {
            // Play next sentence
            setActiveSentenceIndex(prev => {
                if (prev === null) return 0;

                let next = prev + 1;
                // Skip empty or whitespace-only sentences
                while (next < sentences.length && !sentences[next].trim()) {
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

        return () => {
            audio.pause();
            audio.src = "";
        };
    }, [sentences, voice, rate]);

    // Update volume when it changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    const playSentence = async (index: number) => {
        if (!sentences[index] || !audioRef.current) return;

        try {
            // Format rate for API (e.g. 1.0 -> "+0%", 1.5 -> "+50%")
            const ratePercent = Math.round((rate - 1) * 100);
            const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

            const response = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: sentences[index],
                    voice: voice,
                    rate: rateStr
                })
            });

            if (!response.ok) throw new Error("TTS Failed");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            if (audioRef.current) {
                audioRef.current.src = url;
                audioRef.current.play();
                setActiveSentenceIndex(index);
            }
        } catch (error) {
            console.error("Playback error", error);
            setIsPlaying(false);
            isPlayingRef.current = false;
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
            // Start from current index or 0
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
