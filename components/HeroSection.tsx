'use client';

import { motion } from "framer-motion";
import Link from "next/link";

export default function HeroSection() {
    return (
        <div className="relative w-full min-h-screen flex flex-col items-center justify-center px-8 overflow-hidden bg-gradient-to-b from-[#2d1810] via-[#1a2332] to-[#0f1419]">
            {/* Main content */}
            <motion.div
                className="max-w-5xl mx-auto text-center relative z-10 pt-32 pb-40"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
            >
                {/* Main headline - Large serif */}
                <motion.h1
                    className="text-5xl md:text-6xl lg:text-7xl font-serif leading-[1.15] text-white mb-16 font-normal"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 1 }}
                >
                    From first spark to lasting legacy, we guide you through every stage of creation, transformation, and regeneration.
                </motion.h1>
            </motion.div>

            {/* Bottom scroll indicator */}
            <motion.div
                className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white/60 text-xs uppercase tracking-[0.2em]"
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
        </div>
    );
}
