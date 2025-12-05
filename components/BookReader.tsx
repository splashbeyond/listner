"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, ArrowLeft, Sparkles, X, MessageSquare, Settings, Maximize2, Minimize2, Menu } from "lucide-react";
import Link from "next/link";
import ReviewPanel from "./ReviewPanel";
import TTSControls, { VOICES } from "./TTSControls";
import { getBookFromDB, saveBookToDB } from "@/lib/db";
import { parseEpubFile } from "@/lib/epub-utils";

interface BookData {
    id?: string;
    title: string;
    author: string;
    content: string;
    pages?: string[];
    currentPage?: number;
}

interface BookReaderProps {
    bookId: string;
    initialBook: BookData | null;
}

interface Sentence {
    text: string;
    pageIndex: number;
    isHeading?: boolean;
    verseNumber?: string;
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
    const [showChapters, setShowChapters] = useState(false);
    const [chapters, setChapters] = useState<{ title: string; pageIndex: number }[]>([]);

    // TTS State
    // TTS State
    const [voice, setVoice] = useState("en-GB-SoniaNeural"); // Default to Sonia (UK)
    const [rate, setRate] = useState(1.0);
    const [volume, setVolume] = useState(1.0);
    const [showSettings, setShowSettings] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isPlayingRef = useRef(false);
    const currentRequestRef = useRef<AbortController | null>(null);
    const rateRef = useRef(rate);
    useEffect(() => { rateRef.current = rate; }, [rate]);

    // Load saved voice preference
    useEffect(() => {
        const savedVoice = localStorage.getItem("listener_voice");
        if (savedVoice) {
            setVoice(savedVoice);
        }
    }, []);

    // Save voice preference when changed
    useEffect(() => {
        localStorage.setItem("listener_voice", voice);
    }, [voice]);

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
                        // Check if it's an EPUB book without content OR if it has the error message (retry)
                        const isErrorContent = storedBook.content && storedBook.content.startsWith("Unable to load this book");
                        if (bookId.startsWith('epub-') && (!storedBook.content || storedBook.content.length === 0 || isErrorContent)) {
                            try {
                                console.log('Parsing EPUB book content...');

                                // Get the file path from the stored book
                                const filePath = storedBook.filePath;

                                if (filePath) {
                                    // Parse the EPUB file
                                    const { fullText, pages } = await parseEpubFile(filePath);

                                    // Update the book with content and pages
                                    storedBook.content = fullText;
                                    storedBook.pages = pages;

                                    // Save back to DB for next time
                                    await saveBookToDB(storedBook);

                                    console.log(`Successfully loaded EPUB content with ${pages.length} pages`);
                                } else {
                                    throw new Error('No file path found for EPUB book');
                                }
                            } catch (contentError) {
                                console.error('Failed to parse EPUB content:', contentError);
                                // Set a placeholder message so the book still loads
                                storedBook.content = `Unable to load this book. The EPUB file "${storedBook.title}" may be corrupted or in an unsupported format. Please try another book.`;
                            }
                        }

                        setBook(storedBook);
                        // Restore saved page or start at 0
                        setCurrentPage(storedBook.currentPage || 0);
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

    // Save current page when it changes
    useEffect(() => {
        if (book && book.id) {
            const updatedBook = { ...book, currentPage };
            saveBookToDB(updatedBook).catch(err => console.error("Failed to save page progress:", err));
        }
    }, [currentPage, book?.id]); // Only trigger when page changes

    // Extract chapters when sentences change
    useEffect(() => {
        const extractedChapters = sentences
            .filter(s => s.isHeading)
            .map(s => ({ title: s.text, pageIndex: s.pageIndex }));

        // Deduplicate by page index (keep first heading of page)
        const uniqueChapters = extractedChapters.filter((c, index, self) =>
            index === self.findIndex(t => t.pageIndex === c.pageIndex)
        );

        setChapters(uniqueChapters);
    }, [sentences]);

    const processBookContent = (bookData: any) => {
        const allSentences: Sentence[] = [];
        const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });

        const processText = (text: string, pageIndex: number) => {
            // Runtime cleanup: Remove formatting numbers (footnotes) just in case
            // This catches things like "word123" or "end.99" that might be in the DB
            const cleanSourceText = text.replace(/([a-zA-Z.,;?!'"\])])\d+/g, '$1');

            // Split by double newlines to get paragraphs
            const paragraphs = cleanSourceText.split(/\n\n+/);

            for (const paragraph of paragraphs) {
                const trimmedPara = paragraph.trim();
                if (!trimmedPara) continue;

                if (trimmedPara.startsWith('#')) {
                    // It's a heading
                    // Remove all # characters and whitespace from start
                    const headingText = trimmedPara.replace(/^#+\s*/, '');
                    if (headingText) {
                        allSentences.push({
                            text: headingText,
                            pageIndex,
                            isHeading: true
                        });
                    }
                } else {
                    // Regular paragraph

                    // 1. Unwrap lines first to handle verses split across lines
                    const unwrappedText = trimmedPara.replace(/\n/g, ' ');

                    // 2. Clean up whitespace
                    const cleanText = unwrappedText.replace(/\s+/g, " ").trim();
                    if (!cleanText) continue;

                    // 3. Split by verse numbers (e.g. "1:1 " or " 1:2 ")
                    // We use a regex with capturing group to keep the verse numbers
                    // Pattern: optional space + digit + colon + digit + space
                    const verseSplitRegex = /(?:^|\s)(\d+:\d+)\s/;

                    // We need to process this carefully. The regex split might not be enough because we want to keep the verse number associated with the text following it.
                    // Let's iterate through the text finding matches.

                    let remainingText = cleanText;
                    const chunks: { text: string, verse?: string }[] = [];

                    // Check if the paragraph STARTS with a verse number
                    const startMatch = remainingText.match(/^\s*(\d+:\d+)\s/);
                    let currentVerse = startMatch ? startMatch[1] : undefined;

                    if (startMatch) {
                        // Remove the starting verse number from text
                        remainingText = remainingText.substring(startMatch[0].length);
                    }

                    while (remainingText.length > 0) {
                        // Find the NEXT verse number in the remaining text
                        const nextMatch = remainingText.match(/\s(\d+:\d+)\s/);

                        if (nextMatch && nextMatch.index !== undefined) {
                            // We found the start of the NEXT verse
                            // The text up to this point belongs to the CURRENT verse (or no verse)
                            const content = remainingText.substring(0, nextMatch.index).trim();

                            if (content) {
                                chunks.push({
                                    text: content,
                                    verse: currentVerse
                                });
                            }

                            // Update current verse for the next iteration
                            currentVerse = nextMatch[1];

                            // Advance past the content AND the new verse number
                            // match[0] includes the leading space, verse number, and trailing space
                            remainingText = remainingText.substring(nextMatch.index + nextMatch[0].length);
                        } else {
                            // No more verses found, the rest belongs to the current verse
                            if (remainingText.trim()) {
                                chunks.push({
                                    text: remainingText.trim(),
                                    verse: currentVerse
                                });
                            }
                            remainingText = "";
                        }
                    }

                    // Now process each chunk into sentences
                    for (const chunk of chunks) {
                        if (!chunk.text) continue;

                        const segments = Array.from(segmenter.segment(chunk.text));
                        const mergedSentences: string[] = [];
                        let currentSentence = "";

                        const ABBREVIATIONS = new Set([
                            "Mr.", "Mrs.", "Ms.", "Dr.", "Prof.", "Capt.", "Gen.", "Sen.", "Rep.", "Gov.", "St.", "Mt.", "Jr.", "Sr.", "Rev."
                        ]);

                        for (const seg of segments) {
                            const s = seg.segment.trim();
                            if (!s) continue;

                            if (currentSentence) {
                                currentSentence += " " + s;
                            } else {
                                currentSentence = s;
                            }

                            const words = currentSentence.split(' ');
                            const lastWord = words[words.length - 1];

                            if (ABBREVIATIONS.has(lastWord)) {
                                continue;
                            }

                            mergedSentences.push(currentSentence);
                            currentSentence = "";
                        }

                        if (currentSentence) {
                            mergedSentences.push(currentSentence);
                        }

                        // Attach verse number to the FIRST sentence of the chunk only
                        let isFirstSentenceOfChunk = true;
                        for (const s of mergedSentences) {
                            allSentences.push({
                                text: s,
                                pageIndex,
                                verseNumber: isFirstSentenceOfChunk ? chunk.verse : undefined
                            });
                            isFirstSentenceOfChunk = false;
                        }
                    }
                }
            }
        };

        if (bookData.pages && bookData.pages.length > 0) {
            bookData.pages.forEach((page: string, index: number) => processText(page, index));
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

        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('ended', handleEnded);
            audio.pause();
            audio.src = "";
        };
    }, []);

    // Audio Playback & Highlighting Loop
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateWordIndex = () => {
            if (!audio || audio.paused || audio.ended) return;

            const currentTime = audio.currentTime;

            // TIMING CORRECTION:
            // Increased to 85ms to ensure we don't jump the gun on pauses.
            const LATENCY_MS = 85;
            const adjustedTime = Math.max(0, currentTime - (LATENCY_MS / 1000));

            const currentTicks = adjustedTime * 10000000;
            const currentMarks = currentMarksRef.current;

            if (!currentMarks || currentMarks.length === 0) {
                requestAnimationFrame(updateWordIndex);
                return;
            }

            let activeIndex = -1;
            for (let i = 0; i < currentMarks.length; i++) {
                if (currentTicks >= currentMarks[i].offset) {
                    activeIndex = i;
                } else {
                    break;
                }
            }

            // Direct DOM manipulation for zero-latency updates
            if (activeIndex !== -1) {
                // Get the LIVE rate from the ref
                const currentRate = rateRef.current;

                // Calculate transition duration based on TTS rate.
                // If rate is 0.5x, we want SLOW transitions (e.g. 300ms).
                // If rate is 2.0x, we want FAST transitions (e.g. 75ms).
                // Base: 150ms at 1.0x.
                const transitionDuration = Math.max(50, Math.min(400, Math.round(150 / currentRate)));

                currentMarks.forEach((_, i) => {
                    const el = document.getElementById(`word-mark-${i}`);
                    if (!el) return;

                    // Apply dynamic transition duration based on USER SETTINGS
                    el.style.transitionDuration = `${transitionDuration}ms`;

                    if (i === activeIndex) {
                        // Active
                        el.style.opacity = "1";
                        el.style.color = "black";
                        el.style.transform = "scale(1.1)";
                        el.style.fontWeight = "500";
                    } else if (i < activeIndex) {
                        // Past
                        el.style.opacity = "0.4";
                        el.style.color = "#1f2937"; // gray-800
                        el.style.transform = "scale(1)";
                        el.style.fontWeight = "400";
                    } else {
                        // Future
                        el.style.opacity = "0.2";
                        el.style.color = "#9ca3af"; // gray-400
                        el.style.transform = "scale(1)";
                        el.style.fontWeight = "400";
                    }
                });
            }

            // Sync React state occasionally or just let it be? 
            // We'll update it so if we pause/resume it knows where we are, 
            // but maybe debounce it or just rely on the loop.
            // For now, let's NOT update React state in the hot loop to avoid re-renders.
            // We can update it on pause.

            requestAnimationFrame(updateWordIndex);
        };

        const handlePlay = () => {
            requestAnimationFrame(updateWordIndex);
        };

        const handleEnded = () => {
            setCurrentWordIndex(-1);
        };

        audio.addEventListener('play', handlePlay);
        audio.addEventListener('ended', handleEnded);

        // Start loop if already playing
        if (!audio.paused) {
            handlePlay();
        }

        return () => {
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('ended', handleEnded);
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

            let startIndex = activeSentenceIndex !== null ? activeSentenceIndex : 0;

            // Smart Start:
            // If the active sentence is NOT on the current page (e.g. we navigated away),
            // start from the top of the current page instead.
            if (sentences[startIndex] && sentences[startIndex].pageIndex !== currentPage) {
                const firstSentenceOnPage = sentences.findIndex(s => s.pageIndex === currentPage);
                if (firstSentenceOnPage !== -1) {
                    startIndex = firstSentenceOnPage;
                    setActiveSentenceIndex(startIndex);
                }
            }

            playSentence(startIndex);
        }
    };

    const handleSentenceClick = (index: number, text: string) => {
        // Always highlight the clicked sentence
        setActiveSentenceIndex(index);

        // If audio is playing, jump to this sentence
        if (isPlaying) {
            playSentence(index);
        }
    };

    const handleSentenceDoubleClick = (index: number, text: string) => {
        // Only show AI explanation on double-click
        setActiveSentenceIndex(index);
        setShowOverlay(true);
        setIsExplaining(true);

        setTimeout(() => {
            setExplanation(`Here is an explanation for: "${text.substring(0, 30)}..." \n\nThis sentence sets the tone for the narrative, establishing a reflective mood. The author uses this to foreshadow the themes of judgment and class that permeate the novel.`);
            setIsExplaining(false);
        }, 1500);
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

        // Always use wordMarks if available. They provide the exact timing and segmentation from the TTS engine.
        // Falling back to text.split() causes desync because the indices won't match the TTS timing events.
        if (wordMarks.length === 0) {
            wordsToRender = targetText.split(/\s+/).filter(t => t).map(t => ({
                text: t,
                offset: 0,
                duration: 0
            }));
        }

        // Calculate dynamic font size based on text length
        const textLength = targetText.length;
        let fontSizeClass = "text-4xl md:text-5xl"; // Default for short text

        if (textLength > 300) {
            fontSizeClass = "text-xl md:text-2xl";
        } else if (textLength > 200) {
            fontSizeClass = "text-2xl md:text-3xl";
        } else if (textLength > 100) {
            fontSizeClass = "text-3xl md:text-4xl";
        }

        return (
            <div className="fixed inset-0 bg-[#fdfbf7] z-40 flex flex-col items-center justify-center p-4 md:p-8 text-center">
                <motion.div
                    key={indexToShow}
                    initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className={`max-w-5xl leading-relaxed flex flex-wrap justify-center gap-x-2 gap-y-1 md:gap-x-3 md:gap-y-2 ${fontSizeClass}`}
                >
                    {wordsToRender.map((mark: any, i) => (
                        <span
                            key={i}
                            id={`word-mark-${i}`}
                            className={`font-serif transition-all duration-75 transform origin-center
                                ${i === currentWordIndex
                                    ? "opacity-100 text-black scale-110 font-medium"
                                    : i < currentWordIndex
                                        ? "opacity-40 text-gray-800 scale-100"
                                        : "opacity-20 text-gray-400 scale-100"
                                }`}
                        >
                            {mark.text}
                        </span>
                    ))}
                </motion.div>

                {/* Immersive Controls */}
                <div className="absolute bottom-8 md:bottom-12 flex items-center gap-6 z-50">
                    <button
                        onClick={togglePlay}
                        className="p-4 bg-black text-white rounded-full hover:scale-105 transition-transform shadow-lg"
                    >
                        {isPlaying ? <Pause className="w-6 h-6 md:w-8 md:h-8" /> : <Play className="w-6 h-6 md:w-8 md:h-8" />}
                    </button>
                </div>

                {/* Close Button */}
                <button
                    onClick={() => setIsImmersive(false)}
                    className="absolute top-4 right-4 md:top-6 md:right-6 p-3 bg-black/5 hover:bg-black/10 rounded-full transition-colors z-50"
                >
                    <Minimize2 className="w-5 h-5 md:w-6 md:h-6 opacity-60" />
                </button>
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

            {/* Chapters Modal */}
            <AnimatePresence>
                {showChapters && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowChapters(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-serif font-bold text-xl">Books & Chapters</h3>
                                <button onClick={() => setShowChapters(false)} className="p-2 hover:bg-gray-200 rounded-full">
                                    <X className="w-5 h-5 opacity-60" />
                                </button>
                            </div>
                            <div className="overflow-y-auto p-2">
                                {chapters.length > 0 ? (
                                    chapters.map((chapter, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setCurrentPage(chapter.pageIndex);
                                                setShowChapters(false);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            className={`w-full text-left px-6 py-4 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-50 last:border-0
                                                ${currentPage === chapter.pageIndex ? "bg-yellow-50 text-yellow-800 font-medium" : "text-gray-700"}
                                            `}
                                        >
                                            <span className="text-sm opacity-50 mr-4 w-8 inline-block">
                                                {chapter.pageIndex + 1}
                                            </span>
                                            {chapter.title}
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-gray-400">
                                        No chapters found.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navigation Bar */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-[#fdfbf7]/90 backdrop-blur-sm border-b border-black/5 z-20 flex items-center justify-between px-4 md:px-6">
                {/* Left: Back Button */}
                <Link href="/" className="p-2 hover:bg-black/5 rounded-full transition-colors z-30">
                    <ArrowLeft className="w-6 h-6 opacity-60" />
                </Link>

                {/* Center: Title (Absolute centered) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-2/3 md:w-auto pointer-events-none">
                    <h1 className="text-sm font-bold tracking-wide uppercase opacity-80 truncate">{book.title}</h1>
                    <p className="text-xs opacity-50 truncate">{book.author}</p>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 z-30">
                    {/* Desktop View */}
                    <div className="hidden md:flex items-center gap-2">
                        <button
                            onClick={() => setIsImmersive(true)}
                            className="p-2 hover:bg-black/5 rounded-full transition-colors"
                            title="Immersive Mode"
                        >
                            <Maximize2 className="w-5 h-5 opacity-60" />
                        </button>

                        <button
                            onClick={togglePlay}
                            className="p-2 hover:bg-black/5 rounded-full transition-colors"
                            title={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? <Pause className="w-5 h-5 opacity-60" /> : <Play className="w-5 h-5 opacity-60" />}
                        </button>

                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-2 hover:bg-black/5 rounded-full transition-colors ${showSettings ? "bg-black/5" : ""}`}
                        >
                            <Settings className="w-5 h-5 opacity-60" />
                        </button>
                    </div>

                    {/* Mobile View: Hamburger */}
                    <div className="md:hidden relative">
                        <button
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                            className={`p-2 hover:bg-black/5 rounded-full transition-colors ${showMobileMenu ? "bg-black/5" : ""}`}
                        >
                            <Menu className="w-6 h-6 opacity-60" />
                        </button>

                        {/* Mobile Menu Dropdown */}
                        <AnimatePresence>
                            {showMobileMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-xl border border-black/5 p-2 flex flex-col gap-1 z-50"
                                >
                                    <button
                                        onClick={() => { setIsImmersive(true); setShowMobileMenu(false); }}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 rounded-lg text-sm text-left w-full transition-colors"
                                    >
                                        <Maximize2 className="w-4 h-4 opacity-60" />
                                        <span className="font-medium text-gray-700">Immersive Mode</span>
                                    </button>

                                    <button
                                        onClick={() => { togglePlay(); setShowMobileMenu(false); }}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 rounded-lg text-sm text-left w-full transition-colors"
                                    >
                                        {isPlaying ? <Pause className="w-4 h-4 opacity-60" /> : <Play className="w-4 h-4 opacity-60" />}
                                        <span className="font-medium text-gray-700">{isPlaying ? "Pause" : "Play"}</span>
                                    </button>

                                    <button
                                        onClick={() => { setShowSettings(!showSettings); setShowMobileMenu(false); }}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 rounded-lg text-sm text-left w-full transition-colors"
                                    >
                                        <Settings className="w-4 h-4 opacity-60" />
                                        <span className="font-medium text-gray-700">Audio Settings</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

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
                </div>
            </div>
            {/* Content Area */}
            <div className="max-w-2xl mx-auto pt-24 md:pt-32 pb-24 md:pb-32 px-4 md:px-8 leading-loose text-lg md:text-xl min-h-[60vh]">
                {
                    getCurrentPageSentences().length > 0 ? (
                        getCurrentPageSentences().map((sentence, localIndex) => {
                            const globalIndex = sentences.indexOf(sentence);

                            if (sentence.isHeading) {
                                return (
                                    <div key={globalIndex} className="w-full my-12 first:mt-0 text-center">
                                        <h2
                                            onClick={() => handleSentenceClick(globalIndex, sentence.text)}
                                            className={`
                                            text-4xl font-serif font-bold text-black/90 cursor-pointer hover:text-black mb-8
                                            ${activeSentenceIndex === globalIndex ? "text-yellow-600" : ""}
                                        `}
                                        >
                                            {sentence.text}
                                        </h2>
                                        <div className="w-24 h-1 bg-black/10 mx-auto rounded-full"></div>
                                    </div>
                                );
                            }

                            return (
                                <span
                                    key={globalIndex}
                                    onClick={() => handleSentenceClick(globalIndex, sentence.text)}
                                    onDoubleClick={() => handleSentenceDoubleClick(globalIndex, sentence.text)}
                                    className={`
                                    cursor-pointer transition-colors duration-200 rounded px-1 inline-block
                                    ${activeSentenceIndex === globalIndex ? "bg-yellow-200/50" : "hover:bg-black/5"}
                                `}
                                >
                                    {sentence.verseNumber && (
                                        <span className="text-xs text-gray-400 font-sans mr-2 select-none align-text-top">
                                            {sentence.verseNumber}
                                        </span>
                                    )}
                                    {sentence.text}{" "}
                                </span>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <p>Empty Page</p>
                        </div>
                    )
                }
            </div >

            {/* Page Navigation */}
            {
                book?.pages && book.pages.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-black/5 p-4 flex justify-between items-center px-8 z-20">
                        <button
                            onClick={() => {
                                handlePrevPage();
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            disabled={currentPage === 0}
                            className="flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white disabled:opacity-30 disabled:bg-gray-200 disabled:text-gray-400 hover:bg-gray-800 transition-all font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Previous
                        </button>

                        <div className="flex flex-col items-center">
                            <button
                                onClick={() => setShowChapters(true)}
                                className="text-xs font-bold uppercase tracking-widest hover:text-yellow-600 transition-colors mb-1"
                            >
                                Books
                            </button>
                            <div className="flex flex-col items-center">
                                <span className="font-serif font-bold text-lg">
                                    Page {currentPage + 1}
                                </span>
                                <span className="text-xs text-gray-400 uppercase tracking-wider">
                                    of {book.pages.length}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                handleNextPage();
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            disabled={currentPage === (book.pages.length - 1)}
                            className="flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white disabled:opacity-30 disabled:bg-gray-200 disabled:text-gray-400 hover:bg-gray-800 transition-all font-medium"
                        >
                            Next
                            <ArrowLeft className="w-4 h-4 rotate-180" />
                        </button>
                    </div>
                )
            }

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
        </div >
    );
}
