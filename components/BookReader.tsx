"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, ArrowLeft, Sparkles, X, MessageSquare, Settings, Maximize2, Minimize2 } from "lucide-react";
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

interface WordMark {
    offset: number;
    duration: number;
    text: string;
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
    const [isImmersive, setIsImmersive] = useState(false);
    const [currentWordIndex, setCurrentWordIndex] = useState(-1);
    const [wordMarks, setWordMarks] = useState<WordMark[]>([]);

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

    const sentencesRef = useRef(sentences);
    const wordMarksRef = useRef(wordMarks);

    useEffect(() => {
        sentencesRef.current = sentences;
    }, [sentences]);

    useEffect(() => {
        wordMarksRef.current = wordMarks;
    }, [wordMarks]);

    const playSentenceRef = useRef<((index: number) => Promise<void>) | null>(null);

    // Initialize Audio once
    useEffect(() => {
        const audio = new Audio();
        audioRef.current = audio;

        // Handle audio ending
        const handleEnded = () => {
            setActiveSentenceIndex(prev => {
                if (prev === null) return 0;

                let next = prev + 1;
                const currentSentences = sentencesRef.current;

                // Skip empty or whitespace-only sentences
                while (next < currentSentences.length && !currentSentences[next]?.text?.trim()) {
                    next++;
                }

                if (next < currentSentences.length && isPlayingRef.current) {
                    if (playSentenceRef.current) {
                        playSentenceRef.current(next);
                    }
                    return next;
                } else {
                    setIsPlaying(false);
                    isPlayingRef.current = false;
                    return null;
                }
            });
        };

        const handleTimeUpdate = () => {
            if (!audioRef.current) return;

            const currentMarks = wordMarksRef.current;
            if (currentMarks.length === 0) return;

            // Convert currentTime to 100ns units (ticks) used by edge-tts
            // 1 second = 10,000,000 ticks
            const currentTicks = audioRef.current.currentTime * 10000000;

            // Find the current word based on offset
            // Marks are sorted by offset
            let activeIndex = -1;
            for (let i = 0; i < currentMarks.length; i++) {
                if (currentTicks >= currentMarks[i].offset) {
                    activeIndex = i;
                } else {
                    break;
                }
            }

            setCurrentWordIndex(prev => {
                if (prev !== activeIndex) return activeIndex;
                return prev;
            });
        };

        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('timeupdate', handleTimeUpdate);

        return () => {
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.pause();
            audio.src = "";
        };
    }, []);

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

            const data = await response.json();
            console.log("TTS Response received. Audio length:", data.audio?.length, "Marks:", data.marks?.length);

            // Decode base64 audio
            const audioBytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
            const blob = new Blob([audioBytes], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);

            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = url;

                // Set word marks for highlighting
                let marks = data.marks || [];

                // Fallback: Generate estimated marks if none provided
                if (marks.length === 0 && sentences[index].text) {
                    // We need audio duration to estimate, but we don't have it yet.
                    // We'll generate them on 'loadedmetadata' event or just-in-time.
                    // For now, let's attach a listener to generate them once duration is known.
                    const generateFallbackMarks = () => {
                        if (!audioRef.current || !audioRef.current.duration) return;
                        const duration = audioRef.current.duration * 10000000; // to ticks
                        const text = sentences[index].text;
                        const words = text.split(/\s+/);
                        const totalChars = text.length;
                        const ticksPerChar = duration / totalChars;

                        let currentOffset = 0;
                        const estimatedMarks: WordMark[] = [];

                        let charIndex = 0;
                        words.forEach(word => {
                            // Find word in text to get exact length including punctuation if needed
                            // But simple split is okay for estimation
                            const wordLen = word.length;
                            const wordDuration = wordLen * ticksPerChar;

                            estimatedMarks.push({
                                text: word,
                                offset: currentOffset,
                                duration: wordDuration
                            });

                            currentOffset += wordDuration + (1 * ticksPerChar); // +1 for space
                            charIndex += wordLen + 1;
                        });

                        setWordMarks(estimatedMarks);
                    };

                    audioRef.current.onloadedmetadata = generateFallbackMarks;
                } else {
                    setWordMarks(marks);
                    audioRef.current.onloadedmetadata = null;
                }

                setCurrentWordIndex(-1);

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

    // Update ref whenever playSentence changes
    useEffect(() => {
        playSentenceRef.current = playSentence;
    }, [playSentence]);

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

    // Immersive Mode Renderer
    const renderImmersiveView = () => {
        if (!activeSentenceIndex || !sentences[activeSentenceIndex]) return null;

        // Use wordMarks if available, otherwise fallback to simple split (though marks should be there if playing)
        // If not playing or no marks yet, show full text
        const wordsToRender = wordMarks.length > 0 ? wordMarks : sentences[activeSentenceIndex].text.split(" ").map(t => ({ text: t }));

        return (
            <div className="fixed inset-0 bg-[#fdfbf7] z-40 flex flex-col items-center justify-center p-8 text-center">
                <div className="max-w-4xl leading-relaxed flex flex-wrap justify-center gap-x-3 gap-y-2">
                    {wordsToRender.map((mark: any, i) => (
                        <motion.span
                            key={i}
                            className={`text-4xl md:text-5xl font-serif transition-all duration-150 ${i === currentWordIndex
                                ? "opacity-100 text-black scale-105 font-medium"
                                : i < currentWordIndex
                                    ? "opacity-40 text-gray-800"
                                    : "opacity-20 text-gray-400"
                                }`}
                            initial={{ opacity: 0.2, y: 10 }}
                            animate={{
                                opacity: i === currentWordIndex ? 1 : (i < currentWordIndex ? 0.4 : 0.2),
                                y: 0,
                                scale: i === currentWordIndex ? 1.05 : 1,
                                color: i === currentWordIndex ? "#1a1a1a" : (i < currentWordIndex ? "#4b5563" : "#9ca3af")
                            }}
                        >
                            {mark.text}
                        </motion.span>
                    ))}
                </div>

                {/* Immersive Controls */}
                <div className="absolute bottom-12 flex items-center gap-6">
                    <button
                        onClick={togglePlay}
                        className="p-4 bg-black text-white rounded-full hover:scale-105 transition-transform"
                    >
                        {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                    </button>
                    <button
                        onClick={() => setIsImmersive(false)}
                        className="p-4 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                    >
                        <Minimize2 className="w-6 h-6 opacity-60" />
                    </button>
                </div>
            </div>
        );
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
            {/* Immersive View Overlay */}
            <AnimatePresence>
                {isImmersive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50"
                    >
                        {renderImmersiveView()}
                    </motion.div>
                )}
            </AnimatePresence>

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
                        onClick={() => setIsImmersive(true)}
                        className="p-2 hover:bg-black/5 rounded-full transition-colors"
                        title="Immersive Mode"
                    >
                        <Maximize2 className="w-5 h-5 opacity-60" />
                    </button>

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
