"use client";

import { useUser } from "@clerk/nextjs";
import HeroSection from "@/components/HeroSection";
import Navbar from "@/components/Navbar";

export default function Home() {
  const { isLoaded, isSignedIn, user } = useUser();

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2d1810] via-[#1a2332] to-[#0f1419] relative">
      {/* Fixed Navigation Bar */}
      <Navbar />

      <HeroSection />
    </main>
  );
}
