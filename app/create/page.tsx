"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, BookOpen, Loader2 } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";
import { saveBookToDB } from "@/lib/db";

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function CreatePage() {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hello! I'm here to help you create a custom book. To get started, what type of book would you like to create - fiction or non-fiction?",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedBook, setGeneratedBook] = useState<any>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generationStatus, setGenerationStatus] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { user, isLoaded, isSignedIn } = useUser();

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push("/");
        }
    }, [isLoaded, isSignedIn, router]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [...messages, userMessage] })
            });

            if (!response.ok) throw new Error('Failed to send message');

            const data = await response.json();

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.content,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            // Show error message
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateBook = async () => {
        setIsGenerating(true);
        setGenerationProgress(0);
        setGenerationStatus("Creating book blueprint...");

        try {
            // Step 1: Generate Structure
            const response = await fetch('/api/generate-book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages })
            });

            if (!response.ok) throw new Error('Failed to generate book structure');

            const data = await response.json();
            const structure = JSON.parse(data.content);

            // Step 2: Generate Chapters
            const fullChapters = [];
            const totalChapters = structure.chapters.length;

            for (let i = 0; i < totalChapters; i++) {
                const chapter = structure.chapters[i];
                setGenerationStatus(`Writing Chapter ${i + 1} of ${totalChapters}: ${chapter.title}...`);

                const chapterResponse = await fetch('/api/generate-chapter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: structure.title,
                        author: structure.author,
                        description: structure.description,
                        style: structure.style,
                        chapterTitle: chapter.title,
                        chapterDescription: chapter.plot_summary
                    })
                });

                if (!chapterResponse.ok) throw new Error(`Failed to generate chapter ${i + 1}`);

                const chapterData = await chapterResponse.json();
                fullChapters.push({
                    title: chapter.title,
                    content: chapterData.content
                });

                setGenerationProgress(((i + 1) / totalChapters) * 100);
            }

            setGeneratedBook({
                ...structure,
                chapters: fullChapters
            });
            setShowPreview(true);

        } catch (error: any) {
            console.error('Generation error:', error);
            alert(`Failed to generate book: ${error.message}`);
        } finally {
            setIsGenerating(false);
            setGenerationStatus("");
            setGenerationProgress(0);
        }
    };



    // ... existing code ...

    const handleSaveBook = async () => {
        if (!generatedBook) return;

        try {
            // Convert chapters to pages/content format
            const fullContent = generatedBook.chapters.map((c: any) => `## ${c.title}\n\n${c.content}`).join('\n\n');
            const pages = generatedBook.chapters.map((c: any) => c.content);

            const newBook = {
                id: `gen-${Date.now()}`,
                title: generatedBook.title,
                author: generatedBook.author || "AI & You",
                content: fullContent,
                pages: pages,
                coverColor: "bg-purple-900",
                createdAt: new Date(),
                userId: user?.id // Associate with user
            };

            await saveBookToDB(newBook);
            router.push(`/reader/${newBook.id}`);
        } catch (error: any) {
            console.error('Save error:', error);
            alert(`Failed to save book: ${error.message}`);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="min-h-screen w-full relative flex flex-col bg-gradient-to-b from-[#2d1810] via-[#1a2332] to-[#0f1419]">
            {/* Fixed Navigation Bar */}
            <Navbar />

            {/* Main Chat Container */}
            <div className={`flex-1 flex flex-col max-w-4xl w-full mx-auto px-6 pt-32 pb-8 transition-opacity duration-300 ${showPreview ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 text-center"
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Sparkles className="w-8 h-8 text-white" />
                        <h1 className="text-4xl font-serif text-white">Create Your Book</h1>
                    </div>
                    <p className="text-white/60 text-lg">Chat with AI to bring your book idea to life</p>
                </motion.div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto mb-6 space-y-4 pr-2 custom-scrollbar">
                    <AnimatePresence>
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-6 py-4 ${message.role === 'user'
                                        ? 'bg-white text-black'
                                        : 'bg-white/10 text-white backdrop-blur-sm'
                                        }`}
                                >
                                    <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Typing Indicator */}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4">
                                <div className="flex gap-2">
                                    <motion.div
                                        animate={{ opacity: [0.4, 1, 0.4] }}
                                        transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                                        className="w-2 h-2 bg-white rounded-full"
                                    />
                                    <motion.div
                                        animate={{ opacity: [0.4, 1, 0.4] }}
                                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                                        className="w-2 h-2 bg-white rounded-full"
                                    />
                                    <motion.div
                                        animate={{ opacity: [0.4, 1, 0.4] }}
                                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                                        className="w-2 h-2 bg-white rounded-full"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                    <div className="flex gap-3 items-end">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Describe your book idea..."
                            className="flex-1 bg-transparent text-white placeholder-white/40 resize-none outline-none min-h-[60px] max-h-[200px] py-2"
                            rows={1}
                            disabled={isGenerating}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading || isGenerating}
                            className="bg-white text-black p-3 rounded-xl hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Generate Book Button or Progress Bar */}
                {isGenerating ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 w-full max-w-md mx-auto"
                    >
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-xl">
                            <div className="flex justify-between text-white mb-3 text-sm font-medium">
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {generationStatus}
                                </span>
                                <span>{Math.round(generationProgress)}%</span>
                            </div>
                            <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden">
                                <motion.div
                                    className="bg-white h-full rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${generationProgress}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    messages.length > 2 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 flex justify-center"
                        >
                            <button
                                onClick={handleGenerateBook}
                                className="bg-white text-black px-8 py-4 rounded-full font-medium hover:bg-gray-100 transition-all flex items-center gap-3 shadow-lg hover:scale-105 active:scale-95"
                            >
                                <BookOpen className="w-5 h-5" />
                                <span>Generate Book</span>
                            </button>
                        </motion.div>
                    )
                )}
            </div>

            {/* Preview Modal */}
            <AnimatePresence>
                {showPreview && generatedBook && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    >
                        <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                                <h2 className="text-2xl font-serif font-bold text-gray-900">Preview & Edit</h2>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    Close
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                        <input
                                            type="text"
                                            value={generatedBook.title}
                                            onChange={(e) => setGeneratedBook({ ...generatedBook, title: e.target.value })}
                                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-black"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
                                        <input
                                            type="text"
                                            value={generatedBook.author}
                                            onChange={(e) => setGeneratedBook({ ...generatedBook, author: e.target.value })}
                                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-black"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                    <textarea
                                        value={generatedBook.description}
                                        onChange={(e) => setGeneratedBook({ ...generatedBook, description: e.target.value })}
                                        className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none min-h-[100px] text-black"
                                    />
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-xl font-bold text-gray-900 border-b pb-2">Chapters</h3>
                                    {generatedBook.chapters.map((chapter: any, index: number) => (
                                        <div key={index} className="bg-gray-50 p-6 rounded-2xl border">
                                            <input
                                                type="text"
                                                value={chapter.title}
                                                onChange={(e) => {
                                                    const newChapters = [...generatedBook.chapters];
                                                    newChapters[index].title = e.target.value;
                                                    setGeneratedBook({ ...generatedBook, chapters: newChapters });
                                                }}
                                                className="w-full p-2 mb-4 bg-transparent font-bold text-lg border-b border-transparent focus:border-purple-500 outline-none text-black"
                                            />
                                            <textarea
                                                value={chapter.content}
                                                onChange={(e) => {
                                                    const newChapters = [...generatedBook.chapters];
                                                    newChapters[index].content = e.target.value;
                                                    setGeneratedBook({ ...generatedBook, chapters: newChapters });
                                                }}
                                                className="w-full p-3 bg-white border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none min-h-[300px] font-serif leading-relaxed text-gray-800"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 border-t bg-gray-50 flex justify-end gap-4">
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="px-6 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                                >
                                    Keep Editing Chat
                                </button>
                                <button
                                    onClick={handleSaveBook}
                                    className="px-8 py-3 rounded-xl font-medium bg-black text-white hover:bg-gray-800 transition-colors shadow-lg flex items-center gap-2"
                                >
                                    <BookOpen className="w-5 h-5" />
                                    Save to Library
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
