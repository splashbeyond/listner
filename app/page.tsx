import HeroSection from "@/components/HeroSection";
import Link from "next/link";

export default function Home() {
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
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </nav>

      <HeroSection />
    </main>
  );
}
