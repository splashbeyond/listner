'use client';

import { motion } from "framer-motion";
import Link from "next/link";
import { BookOpen, Headphones, Sparkles, ArrowRight } from "lucide-react";
import { useUser, SignInButton } from "@clerk/nextjs";

export default function HeroSection() {
    const { isSignedIn, isLoaded } = useUser();
    return (
        <div className="relative w-full min-h-screen flex flex-col">
            {/* Hero Section */}
            <section className="relative w-full min-h-screen flex flex-col items-center justify-center px-8 py-32">
                <motion.div
                    className="max-w-5xl mx-auto text-center relative z-10"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                >
                    {/* Main headline */}
                    <motion.h1
                        className="text-5xl md:text-6xl lg:text-7xl font-serif leading-[1.15] text-white mb-8 font-normal"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 1 }}
                    >
                        Read Any Story. Create Your Story. Listen to Every Word.
                    </motion.h1>

                    {/* Subheadline */}
                    <motion.p
                        className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto font-light leading-relaxed mb-12"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                    >
                        Transform the way you experience books with AI-powered text-to-speech technology and creative writing tools. Read classics, create originals, and listen to everything.
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                    >
                        <Link
                            href="/library"
                            className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full hover:bg-gray-100 transition-all duration-300 font-medium text-lg"
                        >
                            <span>Start Reading Free</span>
                            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </Link>
                        {isLoaded && !isSignedIn ? (
                            <SignInButton mode="modal">
                                <button className="group inline-flex items-center gap-3 px-8 py-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all duration-300 backdrop-blur-sm font-medium text-lg border border-white/20">
                                    <Sparkles className="w-5 h-5" />
                                    <span>Create Your First Book</span>
                                </button>
                            </SignInButton>
                        ) : (
                            <Link
                                href="/create"
                                className="group inline-flex items-center gap-3 px-8 py-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all duration-300 backdrop-blur-sm font-medium text-lg border border-white/20"
                            >
                                <Sparkles className="w-5 h-5" />
                                <span>Create Your First Book</span>
                            </Link>
                        )}
                    </motion.div>
                </motion.div>

                {/* Scroll indicator */}
                <motion.div
                    className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white/40 text-xs uppercase tracking-widest"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.8 }}
                >
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                        Scroll
                    </motion.div>
                </motion.div>
            </section>

            {/* Value Proposition Section */}
            <section className="relative w-full py-32 px-8">
                <div className="max-w-6xl mx-auto">
                    <motion.h2
                        className="text-4xl md:text-5xl font-serif text-white text-center mb-20"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        Your Complete Reading & Writing Companion
                    </motion.h2>

                    <div className="grid md:grid-cols-3 gap-12">
                        {/* Feature 1 */}
                        <motion.div
                            className="text-center"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1, duration: 0.6 }}
                        >
                            <div className="w-16 h-16 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Headphones className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-serif text-white mb-4">Text-to-Speech Excellence</h3>
                            <p className="text-white/60 leading-relaxed">
                                High-quality, natural-sounding AI voices bring every book to life. Adjust speed, choose voices, and enjoy hands-free reading anywhere.
                            </p>
                        </motion.div>

                        {/* Feature 2 */}
                        <motion.div
                            className="text-center"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                        >
                            <div className="w-16 h-16 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-serif text-white mb-4">AI-Powered Story Creation</h3>
                            <p className="text-white/60 leading-relaxed">
                                Write novels about anything you're passionate about. Choose your genre, style, and let AI help you craft the perfect story.
                            </p>
                        </motion.div>

                        {/* Feature 3 */}
                        <motion.div
                            className="text-center"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3, duration: 0.6 }}
                        >
                            <div className="w-16 h-16 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <BookOpen className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-serif text-white mb-4">Thousands of Classics, Free Forever</h3>
                            <p className="text-white/60 leading-relaxed">
                                Access timeless masterpieces from the public domain. Listen to Shakespeare, Austen, Dickens, and countless other literary treasures at no cost.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="relative w-full py-32 px-8">
                <div className="max-w-5xl mx-auto">
                    <motion.h2
                        className="text-4xl md:text-5xl font-serif text-white text-center mb-20"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        Three Steps to Your Perfect Reading Experience
                    </motion.h2>

                    <div className="space-y-16">
                        {/* Step 1 */}
                        <motion.div
                            className="flex flex-col md:flex-row items-center gap-8"
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="flex-shrink-0 w-16 h-16 bg-white text-black rounded-full flex items-center justify-center text-2xl font-bold">
                                1
                            </div>
                            <div>
                                <h3 className="text-2xl font-serif text-white mb-3">Choose Your Adventure</h3>
                                <p className="text-white/60 leading-relaxed">
                                    Browse our extensive library of public domain classics or start creating your own book from scratch. Filter by genre, era, or author.
                                </p>
                            </div>
                        </motion.div>

                        {/* Step 2 */}
                        <motion.div
                            className="flex flex-col md:flex-row items-center gap-8"
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1, duration: 0.6 }}
                        >
                            <div className="flex-shrink-0 w-16 h-16 bg-white text-black rounded-full flex items-center justify-center text-2xl font-bold">
                                2
                            </div>
                            <div>
                                <h3 className="text-2xl font-serif text-white mb-3">Create or Customize</h3>
                                <p className="text-white/60 leading-relaxed">
                                    Creating a book? Tell our AI what you want to write about—pick your style, genre, and themes. Our AI helps you craft compelling narratives that match your vision perfectly.
                                </p>
                            </div>
                        </motion.div>

                        {/* Step 3 */}
                        <motion.div
                            className="flex flex-col md:flex-row items-center gap-8"
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                        >
                            <div className="flex-shrink-0 w-16 h-16 bg-white text-black rounded-full flex items-center justify-center text-2xl font-bold">
                                3
                            </div>
                            <div>
                                <h3 className="text-2xl font-serif text-white mb-3">Listen & Enjoy</h3>
                                <p className="text-white/60 leading-relaxed">
                                    Every book you read or create is added to your personal library. Press play and enjoy high-quality TTS on any device, anytime. Your stories, your way.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="relative w-full py-32 px-8">
                <motion.div
                    className="max-w-4xl mx-auto text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className="text-4xl md:text-5xl font-serif text-white mb-6">
                        Ready to Discover Your Next Great Story?
                    </h2>
                    <p className="text-xl text-white/70 mb-12 max-w-2xl mx-auto">
                        Whether you want to listen to timeless classics or create the next bestseller, your adventure starts here.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/library"
                            className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full hover:bg-gray-100 transition-all duration-300 font-medium text-lg"
                        >
                            <span>Get Started Free</span>
                            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </Link>
                        <Link
                            href="/library"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all duration-300 backdrop-blur-sm font-medium text-lg border border-white/20"
                        >
                            Browse Public Domain Library
                        </Link>
                    </div>
                </motion.div>
            </section>
        </div>
    );
}
