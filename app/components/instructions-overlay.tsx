"use client";

import { useEffect, useState } from "react";

interface InstructionsOverlayProps {
  instructions: string | null;
  winner: string | null;
  slotEndTime: number | null;
  currentTime: number;
}

export function InstructionsOverlay({
  instructions,
  winner,
  slotEndTime,
  currentTime,
}: InstructionsOverlayProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  // Calculate time remaining
  useEffect(() => {
    if (!slotEndTime) {
      setTimeRemaining(0);
      return;
    }

    const updateTimeRemaining = () => {
      const remaining = Math.max(0, slotEndTime - Date.now());
      setTimeRemaining(Math.floor(remaining / 1000)); // Convert to seconds
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [slotEndTime]);

  // Reset dismissed state when instructions change
  useEffect(() => {
    setIsDismissed(false);
  }, [instructions]);

  // Re-show overlay every minute if dismissed
  useEffect(() => {
    if (isDismissed && instructions) {
      const timeout = setTimeout(() => {
        setIsDismissed(false);
      }, 60000); // 60 seconds

      return () => clearTimeout(timeout);
    }
  }, [isDismissed, instructions]);

  // Don't show if no instructions or dismissed
  if (!instructions || isDismissed) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
      <div className="bg-gradient-to-r from-red-900 via-red-800 to-red-900 border-b-4 border-yellow-500 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            {/* Left: Instructions */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-yellow-500 text-black font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                  ⚠️ Active Command
                </div>
                <div className="text-yellow-300 text-sm font-mono">
                  Owner: {winner?.slice(0, 8)}...{winner?.slice(-6)}
                </div>
              </div>
              <div className="text-white text-lg font-bold leading-relaxed">
                {instructions}
              </div>
            </div>

            {/* Right: Timer & Controls */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-yellow-300 text-xs font-semibold mb-1 uppercase">
                  Time Left
                </div>
                <div className="bg-black/50 px-4 py-2 rounded-lg">
                  <div className="text-white text-2xl font-mono font-bold">
                    {formatTime(timeRemaining)}
                  </div>
                </div>
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => setIsDismissed(true)}
                className="text-white/70 hover:text-white transition-colors p-2"
                title="Dismiss for 1 minute"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pulsing border at bottom */}
      <div className="h-1 bg-yellow-500 animate-pulse" />
    </div>
  );
}
