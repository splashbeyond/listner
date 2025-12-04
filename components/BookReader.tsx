"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, ArrowLeft, Sparkles, X, MessageSquare, Settings, Maximize2, Minimize2 } from "lucide-react";
import Link from "next/link";
import ReviewPanel from "./ReviewPanel";
import TTSControls, { VOICES } from "./TTSControls";
import { getBookFromDB } from "@/lib/db";

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

    // Load from IndexedDB if not provided initially
    useEffect(() => {
        console.log("BookReader mounted with ID:", bookId);
        if (!initialBook) {
            setIsLoading(true);

            const loadBook = async () => {
                try {
                    // Try loading from IndexedDB first (new way)
                    let storedBook = await getBookFromDB(bookId);

                    // Fallback to localStorage for migration (optional, but good for safety)
                    if (!storedBook) {
                        const localData = localStorage.getItem(`book-${bookId}`);
                        if (localData) {
                            storedBook = JSON.parse(localData);
                            // Optionally migrate to DB here?
                        }
                    }

                    if (storedBook) {
                        setBook(storedBook);
                        processBookContent(storedBook);
                    } else {
                        console.error("Book not found in DB or localStorage");
                    }
                } catch (e) {
                    console.error("Failed to load book", e);
                } finally {
                    setIsLoading(false);
                }
            };
            loadBook();
        } else {
            processBookContent(initialBook);
            setIsLoading(false);
        }
    }, [bookId, initialBook]);

    const processBookContent = (bookData: BookData) => {
        const allSentences: Sentence[] = [];
        const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });

        const processText = (text: string, pageIndex: number) => {
            // Clean text first
            const cleanText = text.replace(/\s+/g, " ").trim();
            if (!cleanText) return;

            // Use Intl.Segmenter which is generally good at handling abbreviations like "Mr."
            const segments = segmenter.segment(cleanText);

            for (const seg of segments) {
                const s = seg.segment.trim();
                if (s.length > 0) {
                    allSentences.push({
                        text: s,
                        pageIndex
                    });
                }
            }
        };

        if (bookData.pages && bookData.pages.length > 0) {
            bookData.pages.forEach((page, index) => processText(page, index));
        } else if (bookData.content) {
            processText(bookData.content, 0);
        }

        setSentences(allSentences);
    };

    const sentencesRef = useRef(sentences);
    const wordMarksRef = useRef(wordMarks);
    // Keep track of the actual audio element's current sentence index to avoid state desync
    const playbackIndexRef = useRef<number>(-1);
    const playSentenceRef = useRef<((index: number) => Promise<void>) | null>(null);

    useEffect(() => {
        sentencesRef.current = sentences;
    }, [sentences]);

    useEffect(() => {
        wordMarksRef.current = wordMarks;
    }, [wordMarks]);

    // Initialize Audio once
    useEffect(() => {
        const audio = new Audio();
        audioRef.current = audio;

        // Handle audio ending
        const handleEnded = async () => {
            const currentIndex = playbackIndexRef.current;
            const nextIndex = currentIndex + 1;
            const currentSentences = sentencesRef.current;

            if (nextIndex < currentSentences.length && isPlayingRef.current) {
                // Seamless transition: Check cache first
                const cachedUrl = audioCacheRef.current.get(nextIndex);
                const cachedMarks = marksCacheRef.current.get(nextIndex);

                if (cachedUrl) {
                    // Play immediately
                    audio.src = cachedUrl;

                    // Synchronously update marks ref BEFORE playing
                    const marksToUse = cachedMarks || [];
                    currentMarksRef.current = marksToUse;

                    // Update State (eventually consistent)
                    if (cachedMarks) {
                        setWordMarks(cachedMarks);
                    } else {
                        setWordMarks([]);
                        // Fallback generation for seamless path
                        audio.onloadedmetadata = () => {
                            if (!audio.duration) return;
                            const duration = audio.duration * 10000000;
                            const text = currentSentences[nextIndex].text;
                            const words = text.split(/\s+/);
                            const totalChars = text.length;
                            const ticksPerChar = duration / totalChars;
                            let currentOffset = 0;
                            const estimatedMarks: WordMark[] = [];
                            words.forEach(word => {
                                const wordDuration = word.length * ticksPerChar;
                                estimatedMarks.push({ text: word, offset: currentOffset, duration: wordDuration });
                                currentOffset += wordDuration + (1 * ticksPerChar);
                            });
                            currentMarksRef.current = estimatedMarks;
                            setWordMarks(estimatedMarks);
                            audio.onloadedmetadata = null;
                        };
                    }

                    audio.play().catch(e => console.error("Seamless play failed", e));

                    playbackIndexRef.current = nextIndex;
                    setActiveSentenceIndex(nextIndex);
                    setCurrentWordIndex(-1);
                } else {
                    // Not in cache? Fallback to standard play (will incur delay)
                    // Use ref to avoid stale closure
                    if (playSentenceRef.current) {
                        playSentenceRef.current(nextIndex);
                    }
                }
            } else {
                setIsPlaying(false);
                isPlayingRef.current = false;
                playbackIndexRef.current = -1;
            }
        };

        const handleTimeUpdate = () => {
            if (!audioRef.current) return;

            // Use the synchronous ref for marks to avoid desync
            const currentMarks = currentMarksRef.current;
            if (!currentMarks || currentMarks.length === 0) return;

            // Convert currentTime to 100ns units (ticks)
            const currentTicks = audioRef.current.currentTime * 10000000;

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

    // Cache for audio URLs AND Marks
    const audioCacheRef = useRef<Map<number, string>>(new Map());
    const marksCacheRef = useRef<Map<number, any[]>>(new Map());
    // Ref to hold the current marks synchronously for the audio loop
    const currentMarksRef = useRef<WordMark[]>([]);

    // Manage Buffer: Ensure next 3 sentences are cached
    const manageBuffer = async (currentIndex: number) => {
        const BUFFER_SIZE = 3;

        for (let i = 1; i <= BUFFER_SIZE; i++) {
            const targetIndex = currentIndex + i;
            if (targetIndex >= sentences.length) break;

            // If already cached or currently fetching (we could track promises, but simple check is ok)
            if (audioCacheRef.current.has(targetIndex)) continue;

            const text = sentences[targetIndex].text;
            if (!text.trim()) continue;

            // Fire and forget (don't await in loop to do them in parallel-ish)
            fetchTTS(targetIndex, text).catch(e => console.error("Buffer failed for", targetIndex, e));
        }
    };

    const fetchTTS = async (index: number, text: string) => {
        if (audioCacheRef.current.has(index)) return;

        try {
            const ratePercent = Math.round((rate - 1) * 100);
            const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

            const response = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: text,
                    voice: voice,
                    rate: rateStr
                })
            });

            if (response.ok) {
                const data = await response.json();
                const audioBytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
                const blob = new Blob([audioBytes], { type: 'audio/mpeg' });
                const url = URL.createObjectURL(blob);

                audioCacheRef.current.set(index, url);
                if (data.marks) {
                    marksCacheRef.current.set(index, data.marks);
                }
            }
        } catch (e) {
            console.error("Fetch TTS failed", e);
        }
    };

    // Watch active index to maintain buffer
    useEffect(() => {
        if (activeSentenceIndex !== null) {
            manageBuffer(activeSentenceIndex);
        }
    }, [activeSentenceIndex, sentences]);

    const playSentence = async (index: number) => {
        if (!sentences[index] || !audioRef.current) return;

        // Cancel any pending TTS request (for the *current* play attempt, not background fetches)
        if (currentRequestRef.current) {
            currentRequestRef.current.abort();
        }

        const controller = new AbortController();
        currentRequestRef.current = controller;

        try {
            let url = audioCacheRef.current.get(index);
            let marks = marksCacheRef.current.get(index) || [];

            if (!url) {
                // Not in cache? Fetch immediately with signal
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
                const audioBytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
                const blob = new Blob([audioBytes], { type: 'audio/mpeg' });
                url = URL.createObjectURL(blob);
                marks = data.marks || [];

                // Cache it
                audioCacheRef.current.set(index, url);
                marksCacheRef.current.set(index, marks);
            }

            if (audioRef.current) {
                // If we are already playing this URL, don't restart (unless forced?)
                // But usually playSentence is called to START.
                audioRef.current.pause(); // Pause current playback if any
                audioRef.current.src = url!;

                // Synchronously update marks ref for the audio loop
                currentMarksRef.current = marks;
                setWordMarks(marks);

                console.log(`[BookReader] Set ${marks.length} word marks for sentence ${index}`);
                if (marks.length > 0) {
                    console.log('[BookReader] First mark:', marks[0]);
                }

                // Fallback logic for marks (if missing)
                if (marks.length === 0 && sentences[index].text) {
                    audioRef.current.onloadedmetadata = () => {
                        if (!audioRef.current || !audioRef.current.duration) return;
                        const duration = audioRef.current.duration * 10000000;
                        const text = sentences[index].text;
                        const words = text.split(/\s+/);
                        const totalChars = text.length;
                        const ticksPerChar = duration / totalChars;
                        let currentOffset = 0;
                        const estimatedMarks: WordMark[] = [];
                        words.forEach(word => {
                            const wordDuration = word.length * ticksPerChar;
                            estimatedMarks.push({ text: word, offset: currentOffset, duration: wordDuration });
                            currentOffset += wordDuration + (1 * ticksPerChar);
                        });

                        // Update both ref and state
                        currentMarksRef.current = estimatedMarks;
                        setWordMarks(estimatedMarks);
                    };
                } else {
                    audioRef.current.onloadedmetadata = null;
                }

                setCurrentWordIndex(-1);

                // Update refs
                playbackIndexRef.current = index;
                setActiveSentenceIndex(index);

                await audioRef.current.play();
                // Buffer management is handled by useEffect now
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
        // Use playbackIndexRef for the source of truth during playback to ensure sync
        // Fallback to activeSentenceIndex if not playing or paused
        const indexToShow = isPlayingRef.current && playbackIndexRef.current !== -1
            ? playbackIndexRef.current
            : activeSentenceIndex;

        if (indexToShow === null || !sentences[indexToShow]) return null;

        const targetText = sentences[indexToShow].text;

        // Safety Check: Ensure wordMarks actually belong to the sentence we are trying to show.
        // If wordMarks are stale (from previous sentence), we shouldn't use them.
        // We do a rough check by comparing the first few characters or length.
        let wordsToRender = wordMarks;

        // Reconstruct text from marks to compare (simplified check)
        const marksText = wordMarks.map(m => m.text).join("").replace(/\s/g, "");
        const sentenceTextClean = targetText.replace(/\s/g, "");

        // If mismatch (or empty), fallback to simple split of the CURRENT sentence
        // This ensures we NEVER show the wrong text, even if highlighting is missing/loading
        if (wordMarks.length === 0 || Math.abs(marksText.length - sentenceTextClean.length) > 5) {
            wordsToRender = targetText.split(/\s+/).filter(t => t).map(t => ({
                text: t,
                offset: 0,
                duration: 0
            }));
        }

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
