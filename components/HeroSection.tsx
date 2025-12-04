import React, { useRef } from "react";
import { Icon1 } from "./Icon1";
import { Cinzel } from "next/font/google";
import { motion, useScroll, useTransform } from "framer-motion";

const cinzel = Cinzel({ subsets: ["latin"] });

export default function HeroSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollY } = useScroll();

    // Parallax effects
    const yText = useTransform(scrollY, [0, 500], [0, 200]);
    const opacityText = useTransform(scrollY, [0, 300], [1, 0]);

    return (
        <div ref={containerRef} className="w-full relative h-[80vh] min-h-[600px] flex flex-col items-center justify-center overflow-hidden">

            {/* Content */}
            <motion.div
                style={{ y: yText, opacity: opacityText }}
                className="relative z-10 w-full max-w-[1440px] px-6 flex flex-col items-center text-center"
            >
                <div className="w-full max-w-[1100px] flex flex-col items-center gap-6">

                    {/* Main Title */}
                    <h1 className={`${cinzel.className} text-[#1a1a1a] text-7xl md:text-9xl font-normal tracking-tighter leading-tight drop-shadow-sm`}>
                        <span className="inline-block bg-clip-text text-transparent bg-gradient-to-b from-[#1a1a1a] to-[#4a3b32]">
                            Listener
                        </span>
                    </h1>

                    {/* Subtitle / Description */}
                    <p className="text-[#1a1a1a]/70 text-xl md:text-2xl max-w-2xl font-serif italic leading-relaxed">
                        "All your books, under one mind."
                    </p>

                    {/* CTA Button */}
                    <div className="pt-10">
                        <a href="#library" className="bg-[#1a1a1a] text-[#fdfbf7] px-10 py-5 rounded-full flex items-center gap-4 hover:bg-black hover:scale-105 transition-all duration-300 group shadow-xl">
                            <span className="text-base font-medium tracking-widest uppercase font-sans">Start Reading</span>
                            <div className="w-5 h-5 text-[#fdfbf7] group-hover:translate-x-1 transition-transform">
                                <Icon1 />
                            </div>
                        </a>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}
