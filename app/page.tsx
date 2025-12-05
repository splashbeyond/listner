"use client";

import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import HeroSection from "@/components/HeroSection";
import Link from "next/link";

export default function Home() {
  const { isLoaded, isSignedIn, user } = useUser();

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2d1810] via-[#1a2332] to-[#0f1419] relative">
      {/* Fixed Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-[#2d1810]/95 to-transparent backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link href="/" className="text-white text-xl font-bold tracking-wider uppercase">
            Listener
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-white/80">
            <Link href="/library" className="hover:text-white transition-colors">Library</Link>
            <Link href="/create" className="hover:text-white transition-colors">Create</Link>

            {!isLoaded ? (
              // Loading state
              <div className="w-20 h-8 bg-white/5 rounded animate-pulse"></div>
            ) : isSignedIn ? (
              // Signed In State
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
              // Signed Out State
              <SignInButton mode="modal">
                <button className="hover:text-white transition-colors">Sign In</button>
              </SignInButton>
            )}
          </div>
        </div>
      </nav>

      <HeroSection />
    </main>
  );
}
