"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ConnectButton, useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { queryTimeSlots, TimeSlotInfo, mistToDollars } from "@/lib/sui/time-auction";

export default function Home() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const [timeSlots, setTimeSlots] = useState<TimeSlotInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTimeSlots = async () => {
    try {
      const slots = await queryTimeSlots(client);
      // Filter to show only active auctions (not ended, not claimed)
      const activeSlots = slots.filter(slot => {
        const now = Date.now();
        return BigInt(now) < slot.auctionEnd && !slot.claimed;
      });
      setTimeSlots(activeSlots);
    } catch (error) {
      console.error("Failed to fetch time slots:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeSlots();
    const interval = setInterval(fetchTimeSlots, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp));
    return date.toLocaleString();
  };

  const getTimeUntilSlotStarts = (startTime: bigint) => {
    const now = Date.now();
    const diff = Number(startTime) - now;
    if (diff <= 0) return "Started";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-red-500 mb-2">
            TIME IS MONEY
          </h1>
          <p className="text-xl text-gray-400 italic mb-6">
            "Buy someone's life, 15 minutes at a time"
          </p>
          {account && (
            <div className="text-gray-300 text-sm mb-4">
              Connected: {account.address.slice(0, 8)}...{account.address.slice(-6)}
            </div>
          )}
          <div className="flex justify-center gap-4 mb-6">
            <ConnectButton />
            <Link
              href="/sell"
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md font-bold transition duration-200"
            >
              SELL YOUR TIME
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-white text-xl">Loading auctions...</div>
          </div>
        ) : timeSlots.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">⏰</div>
            <h2 className="text-2xl font-bold text-white mb-4">
              No Active Auctions
            </h2>
            <p className="text-gray-300 mb-8">
              Be the first to sell your time
            </p>
            <Link
              href="/sell"
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md font-bold transition duration-200"
            >
              SELL YOUR TIME
            </Link>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Active Time Auctions ({timeSlots.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {timeSlots.map((slot) => (
                <div
                  key={slot.objectId}
                  className="bg-gray-900 border border-gray-800 hover:border-red-600 rounded-lg p-6 transition-all duration-200"
                >
                  <div className="mb-4">
                    <div className="text-gray-500 text-sm mb-1">Slot starts at</div>
                    <div className="text-white font-bold">
                      {formatTime(slot.startTime)}
                    </div>
                    <div className="text-gray-400 text-sm">
                      15 minutes
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded p-4 mb-4">
                    <div className="text-gray-400 text-sm mb-1">Current Bid</div>
                    <div className="text-2xl font-bold text-green-400">
                      {slot.currentBid > 0n
                        ? `$${mistToDollars(slot.currentBid).toFixed(2)}`
                        : `Min: $${mistToDollars(slot.minBid).toFixed(2)}`}
                    </div>
                    {slot.currentBidder && (
                      <div className="text-gray-500 text-xs mt-1">
                        by {slot.currentBidder.slice(0, 8)}...
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-sm mb-4">
                    <div className="text-gray-400">Bidding closes in</div>
                    <div className="text-yellow-500 font-bold">
                      {getTimeUntilSlotStarts(slot.startTime)}
                    </div>
                  </div>

                  <Link
                    href={`/auction/${slot.objectId}`}
                    className="block w-full bg-red-600 hover:bg-red-700 text-white text-center font-bold py-3 rounded transition duration-200"
                  >
                    PLACE BID
                  </Link>

                  <div className="text-gray-600 text-xs mt-3">
                    Owner: {slot.timeOwner.slice(0, 8)}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
