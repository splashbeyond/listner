"use client";

import React, { useState } from "react";
import { Star, X, Send } from "lucide-react";
import { motion } from "framer-motion";

interface Review {
    id: string;
    user: string;
    rating: number;
    text: string;
    date: string;
}

const MOCK_REVIEWS: Review[] = [
    { id: "1", user: "Alice M.", rating: 5, text: "Absolutely stunning prose. The AI insights helped me understand the deeper metaphors.", date: "2 days ago" },
    { id: "2", user: "Bob D.", rating: 4, text: "Great read, but the middle section drags a bit.", date: "1 week ago" },
];

interface ReviewPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ReviewPanel({ isOpen, onClose }: ReviewPanelProps) {
    const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS);
    const [newReview, setNewReview] = useState("");
    const [rating, setRating] = useState(0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReview.trim() || rating === 0) return;

        const review: Review = {
            id: Date.now().toString(),
            user: "You",
            rating,
            text: newReview,
            date: "Just now",
        };

        setReviews([review, ...reviews]);
        setNewReview("");
        setRating(0);
    };

    return (
        <motion.div
            initial={{ x: "100%" }}
            animate={{ x: isOpen ? "0%" : "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl z-40 flex flex-col border-l border-black/5"
        >
            <div className="p-6 border-b border-black/5 flex items-center justify-between bg-[#fdfbf7]">
                <h2 className="text-xl font-serif font-medium">Reviews</h2>
                <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full">
                    <X className="w-5 h-5 opacity-50" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fdfbf7]">
                {/* Review Form */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-black/5">
                    <h3 className="text-sm font-semibold mb-3">Write a review</h3>
                    <div className="flex gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                className={`transition-colors ${rating >= star ? "text-yellow-400" : "text-gray-200"}`}
                            >
                                <Star className="w-5 h-5 fill-current" />
                            </button>
                        ))}
                    </div>
                    <form onSubmit={handleSubmit}>
                        <textarea
                            value={newReview}
                            onChange={(e) => setNewReview(e.target.value)}
                            placeholder="Share your thoughts..."
                            className="w-full text-sm p-3 rounded-lg bg-gray-50 border-none focus:ring-1 focus:ring-black/10 resize-none h-24 mb-2"
                        />
                        <button
                            type="submit"
                            disabled={!newReview.trim() || rating === 0}
                            className="w-full bg-black text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-black/80 transition-colors flex items-center justify-center gap-2"
                        >
                            <Send className="w-3 h-3" /> Post Review
                        </button>
                    </form>
                </div>

                {/* Reviews List */}
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <div key={review.id} className="border-b border-black/5 pb-4 last:border-0">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{review.user}</span>
                                <span className="text-xs text-gray-400">{review.date}</span>
                            </div>
                            <div className="flex gap-0.5 mb-2">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        className={`w-3 h-3 ${i < review.rating ? "text-yellow-400 fill-current" : "text-gray-200 fill-current"}`}
                                    />
                                ))}
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
