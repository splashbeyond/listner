"use client";

import React from "react";
import { Settings, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const VOICES = [
    { id: "en-US-AriaNeural", name: "Aria (US Female)" },
    { id: "en-US-GuyNeural", name: "Guy (US Male)" },
    { id: "en-US-JennyNeural", name: "Jenny (US Female)" },
    { id: "en-GB-SoniaNeural", name: "Sonia (UK Female)" },
    { id: "en-GB-RyanNeural", name: "Ryan (UK Male)" },
];

interface TTSControlsProps {
    voice: string;
    setVoice: (voice: string) => void;
    rate: number;
    setRate: (rate: number) => void;
    volume: number;
    setVolume: (volume: number) => void;
    isOpen: boolean;
    onClose: () => void;
}

export default function TTSControls({
    voice,
    setVoice,
    rate,
    setRate,
    volume,
    setVolume,
    isOpen,
    onClose
}: TTSControlsProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-16 right-6 bg-white shadow-xl rounded-xl p-4 border border-black/5 w-64 z-30"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Audio Settings</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-black">
                            <span className="sr-only">Close</span>
                            &times;
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold mb-2 text-gray-700">Voice</label>
                            <select
                                value={voice}
                                onChange={(e) => setVoice(e.target.value)}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                            >
                                {VOICES.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <div>
                                <label className="block text-xs font-semibold mb-2 text-gray-700 flex justify-between">
                                    <span>Speed</span>
                                    <span>{rate}x</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.1"
                                    value={rate}
                                    onChange={(e) => setRate(parseFloat(e.target.value))}
                                    className="w-full accent-black h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                    <span>0.5x</span>
                                    <span>1.0x</span>
                                    <span>2.0x</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold mb-2 text-gray-700 flex justify-between">
                                    <span>Volume</span>
                                    <span>{Math.round(volume * 100)}%</span>
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={volume}
                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                    className="w-full accent-black h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
