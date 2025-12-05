"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, BookOpen, Loader2 } from "lucide-react";
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
            content: "Hello! I'm here to help you create a custom book. What kind of book would you like to create today? Tell me about the topic, genre, style, or any specific ideas you have in mind.",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
        try {
            const response = await fetch('/api/generate-book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages })
            });

            if (!response.ok) throw new Error('Failed to generate book');

            const data = await response.json();
            const bookData = JSON.parse(data.content);

            // Convert chapters to pages/content format
            const fullContent = bookData.chapters.map((c: any) => `## ${c.title}\n\n${c.content}`).join('\n\n');
            const pages = bookData.chapters.map((c: any) => c.content); // Or split by chapter

            const newBook = {
                id: `gen-${Date.now()}`,
                title: bookData.title,
                author: bookData.author || "AI & You",
                content: fullContent,
                pages: pages,
                coverColor: "bg-purple-900", // Default dark cover
                createdAt: new Date()
            };

            await saveBookToDB(newBook);
            router.push(`/reader/${newBook.id}`);

        } catch (error) {
            console.error('Generation error:', error);
            alert('Failed to generate book. Please try again.');
        } finally {
            setIsGenerating(false);
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
            <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-[#2d1810]/95 to-transparent backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
                    <Link href="/" className="text-white text-xl font-bold tracking-wider uppercase">
                        Listener
                    </Link>

                    <div className="hidden md:flex items-center gap-8 text-sm text-white/80">
                        <Link href="/library" className="hover:text-white transition-colors">Library</Link>
                        <Link href="/create" className="text-white font-medium">Create</Link>
                        <a href="#about" className="hover:text-white transition-colors">About</a>
                        <a href="#contact" className="hover:text-white transition-colors">Contact</a>
                    </div>
                </div>
            </nav>

            {/* Main Chat Container */}
            <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-6 pt-32 pb-8">
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

                {/* Generate Book Button (shows after some conversation) */}
                {messages.length > 2 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex justify-center"
                    >
                        <button
                            onClick={handleGenerateBook}
                            disabled={isGenerating || isLoading}
                            className="bg-white text-black px-8 py-4 rounded-full font-medium hover:bg-gray-100 transition-all flex items-center gap-3 shadow-lg disabled:opacity-70 disabled:cursor-wait"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Writing your book...</span>
                                </>
                            ) : (
                                <>
                                    <BookOpen className="w-5 h-5" />
                                    <span>Generate Book</span>
                                </>
                            )}
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
