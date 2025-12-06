"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Menu, X, Book, Plus, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
    const { isLoaded, isSignedIn, user } = useUser();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Lock body scroll when menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen]);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
            {/* Gradient Background for Navbar (only visible when menu closed) */}
            <div className={`absolute inset-0 bg-gradient-to-b from-[#2d1810]/95 to-transparent backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`} />

            <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-50">
                <Link href="/" className="text-white text-xl font-bold tracking-wider uppercase" onClick={() => setIsMobileMenuOpen(false)}>
                    Listener
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-8 text-sm text-white/80">
                    <Link href="/library" className="hover:text-white transition-colors">Library</Link>
                    {isSignedIn ? (
                        <Link href="/create" className="hover:text-white transition-colors">Create</Link>
                    ) : (
                        <SignInButton mode="modal">
                            <button className="hover:text-white transition-colors">Create</button>
                        </SignInButton>
                    )}

                    {!isLoaded ? (
                        <div className="w-20 h-8 bg-white/5 rounded animate-pulse"></div>
                    ) : isSignedIn ? (
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                                <span className="text-xs font-medium text-white/90">Active</span>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/20 hover:border-white/40 transition-colors shadow-lg shadow-black/20">
                                <UserButton afterSignOutUrl="/" />
                            </div>
                        </div>
                    ) : (
                        <SignInButton mode="modal">
                            <button className="hover:text-white transition-colors">Sign In</button>
                        </SignInButton>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-[#0f1419] z-40 flex flex-col md:hidden pt-24 px-6 pb-8"
                    >
                        {/* Navigation Links */}
                        <div className="flex flex-col space-y-6 mt-8">
                            <Link
                                href="/library"
                                className="flex items-center gap-4 text-2xl font-serif text-white/90 hover:text-white p-4 rounded-2xl hover:bg-white/5 transition-all"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <Book className="w-6 h-6 text-purple-400" />
                                <span>Library</span>
                            </Link>

                            {isSignedIn ? (
                                <Link
                                    href="/create"
                                    className="flex items-center gap-4 text-2xl font-serif text-white/90 hover:text-white p-4 rounded-2xl hover:bg-white/5 transition-all"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <Plus className="w-6 h-6 text-green-400" />
                                    <span>Create Story</span>
                                </Link>
                            ) : (
                                <SignInButton mode="modal">
                                    <button
                                        className="w-full flex items-center gap-4 text-2xl font-serif text-white/90 hover:text-white p-4 rounded-2xl hover:bg-white/5 transition-all text-left"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <Plus className="w-6 h-6 text-green-400" />
                                        <span>Create Story</span>
                                    </button>
                                </SignInButton>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-white/10 my-8" />

                        {/* User Section */}
                        <div className="mt-auto">
                            {!isLoaded ? (
                                <div className="w-full h-16 bg-white/5 rounded-2xl animate-pulse"></div>
                            ) : isSignedIn ? (
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 flex items-center justify-center bg-white/10">
                                            <UserButton afterSignOutUrl="/" />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{user?.fullName || user?.username || "User"}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                                                <span className="text-xs text-white/60">Active Now</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <SignInButton mode="modal">
                                    <button className="w-full bg-white text-black font-medium py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors">
                                        <LogIn className="w-5 h-5" />
                                        Sign In
                                    </button>
                                </SignInButton>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
