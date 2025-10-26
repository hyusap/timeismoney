"use client";

import { useState, useEffect } from "react";
import {
  useCurrentAccount,
  useSuiClient,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import {
  queryTimeSlotsByOwner,
  TimeSlotInfo,
  mistToDollars,
  placeBidTx,
  setInstructionsTx,
  endAuctionTx,
} from "@/lib/sui/time-auction";

interface NFTAuctionSidebarProps {
  streamerAddress: string;
  viewerMode?: boolean; // If true, always enable bidding (for viewer pages)
}

export function NFTAuctionSidebar({
  streamerAddress,
  viewerMode = false,
}: NFTAuctionSidebarProps) {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  // Check if current user is the streamer (time slot owner)
  // If viewerMode is true, always treat as non-streamer (viewer)
  const isStreamer = viewerMode
    ? false
    : account?.address.toLowerCase() === streamerAddress.toLowerCase();

  const [timeSlots, setTimeSlots] = useState<TimeSlotInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotInfo | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [isBidding, setIsBidding] = useState(false);
  const [isFinalizingAuction, setIsFinalizingAuction] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchTimeSlots = async () => {
    try {
      const slots = await queryTimeSlotsByOwner(client, streamerAddress);

      const now = Date.now();

      // Filter: Keep only upcoming/active slots (no completed)
      const upcoming = slots.filter((slot) => {
        const endTime = Number(slot.startTime) + Number(slot.durationMs);
        return endTime > now;
      });

      // Sort upcoming by start time (newest first for upcoming)
      upcoming.sort((a, b) => Number(b.startTime - a.startTime));

      setTimeSlots(upcoming);
    } catch (error) {
      console.error("Failed to fetch time slots:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeSlots();
    const interval = setInterval(fetchTimeSlots, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [streamerAddress]);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getSlotStatus = (slot: TimeSlotInfo) => {
    const now = Date.now();
    const startTime = Number(slot.startTime);
    const endTime = startTime + Number(slot.durationMs);
    const auctionEnd = Number(slot.auctionEnd);

    // Debug logging
    const nowDate = new Date(now);
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (now >= startTime && now < endTime) {
      return "LIVE NOW";
    } else if (now < auctionEnd) {
      return "BIDDING OPEN";
    } else if (now >= auctionEnd && now < startTime) {
      return "BIDDING CLOSED";
    } else if (now >= endTime) {
      return "COMPLETED";
    }
    return "UNKNOWN";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "LIVE NOW":
        return "bg-red-600 text-white";
      case "BIDDING OPEN":
        return "bg-green-600 text-white";
      case "BIDDING CLOSED":
        return "bg-yellow-600 text-white";
      case "COMPLETED":
        return "bg-gray-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const handlePlaceBid = async (slot: TimeSlotInfo) => {
    if (!account) {
      alert("Please connect your wallet");
      return;
    }

    const bidDollars = parseFloat(bidAmount);
    if (isNaN(bidDollars) || bidDollars <= 0) {
      alert("Please enter a valid bid amount");
      return;
    }

    // Calculate minimum required bid
    const currentBidDollars = mistToDollars(slot.currentBid);
    const minBidDollars = mistToDollars(slot.minBid);
    const requiredBid =
      slot.currentBid > BigInt(0)
        ? currentBidDollars + 0.0001 // Must be at least 1 MIST higher (0.0001 dollars)
        : minBidDollars;

    if (bidDollars < requiredBid) {
      alert(`Bid too low! Must be at least $${requiredBid.toFixed(4)}`);
      return;
    }

    setIsBidding(true);

    try {
      const bidMist = BigInt(Math.floor(bidDollars * 10_000)); // Convert UI dollars to MIST
      const tx = placeBidTx(slot.objectId, bidMist);

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: () => {
            alert("Bid placed successfully!");
            setBidAmount("");
            setSelectedSlot(null);
            fetchTimeSlots();
          },
          onError: (error) => {
            console.error("Failed to place bid:", error);
            alert(`Failed to place bid: ${error.message}`);
          },
        }
      );
    } catch (error) {
      console.error("Error placing bid:", error);
      alert("Failed to place bid");
    } finally {
      setIsBidding(false);
    }
  };

  const handleFinalizeAuction = async (slot: TimeSlotInfo) => {
    if (!account) {
      alert("Please connect your wallet");
      return;
    }

    setIsFinalizingAuction(true);

    try {
      const tx = endAuctionTx(slot.objectId);

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: async () => {
            alert("Auction finalized successfully!");
            // Wait for blockchain to update before refetching
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await fetchTimeSlots();
            setIsFinalizingAuction(false);
          },
          onError: (error) => {
            console.error("Failed to finalize auction:", error);
            alert(`Failed to finalize auction: ${error.message}`);
            setIsFinalizingAuction(false);
          },
        }
      );
    } catch (error) {
      console.error("Error finalizing auction:", error);
      alert("Failed to finalize auction");
      setIsFinalizingAuction(false);
    }
  };

  const formatTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp));
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (slot: TimeSlotInfo) => {
    const now = Date.now();
    const startTime = Number(slot.startTime);
    const endTime = startTime + Number(slot.durationMs);
    const diffMs = startTime - now;

    // If in the past, check if slot is still active or completed
    if (diffMs < 0) {
      if (now < endTime) {
        return "LIVE NOW";
      }
      return "ENDED";
    }

    const diffMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours === 0) {
      return `in ${minutes}m`;
    } else if (minutes === 0) {
      return `in ${hours}hr`;
    } else {
      return `in ${hours}hr ${minutes}m`;
    }
  };

  const isWinner = (slot: TimeSlotInfo) => {
    return account && slot.currentBidder === account.address;
  };

  if (isLoading) {
    return (
      <div className="w-80 bg-gray-900 border-l border-gray-800 p-4">
        <div className="text-white text-center">Loading auctions...</div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-black  flex flex-col max-h-screen">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-4xl font-medium tracking-tight font-cormorant italic">
            Time Auctions
          </h2>
        </div>

        <div className="text-left">
          <div className="text-white text-sm font-mono font-light">
            {currentTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>
          <div className="text-gray-500 text-xs">
            {currentTime.toLocaleDateString([], {
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {timeSlots.length === 0 ? (
          <div className="text-lg text-center font-cormorant font-medium italic tracking-tight text-gray-500 py-8">
            No time slots created
          </div>
        ) : (
          timeSlots.map((slot) => {
            const status = getSlotStatus(slot);
            const statusColor = getStatusColor(status);
            const winner = isWinner(slot);

            return (
              <div
                key={slot.objectId}
                className={`bg-transparent rounded-lg p-4 border-[1px] ${
                  winner ? "border-green-500" : "border-white/20"
                } hover:border-red-500 transition-colors`}
              >
                {/* Time and Status */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-white text-sm font-semibold">
                      {formatRelativeTime(slot)}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {formatTime(slot.startTime)}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${statusColor}`}
                  >
                    {status}
                  </span>
                </div>

                {/* Current Bid */}
                <div className="mb-3">
                  <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                    Current Bid
                  </div>
                  <div className="text-green-400 font-cormorant italic text-3xl font-medium tracking-tight">
                    {slot.currentBid > BigInt(0)
                      ? `$${mistToDollars(slot.currentBid).toFixed(2)}`
                      : `$${mistToDollars(slot.minBid).toFixed(2)}`}
                  </div>
                </div>

                {/* Winner */}
                {slot.currentBidder && (
                  <div className="mb-3 pb-3 border-b border-white/10">
                    <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                      Leading
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-white font-mono text-sm tracking-tight">
                        {slot.currentBidder.slice(0, 6)}...
                        {slot.currentBidder.slice(-4)}
                      </div>
                      {winner && (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-600/20 text-green-400 border border-green-600/30">
                          YOU
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons - Only show for non-streamers */}
                {status === "BIDDING OPEN" && account && !isStreamer && (
                  <button
                    onClick={() => setSelectedSlot(slot)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-cormorant italic tracking-tight font-medium py-2 rounded transition duration-200 mb-2"
                  >
                    Place Bid
                  </button>
                )}

                {/* Finalize Auction Button */}
                {(() => {
                  const now = Date.now();
                  const auctionEnded = now >= Number(slot.auctionEnd);
                  const showButton =
                    auctionEnded &&
                    account &&
                    slot.currentBidder &&
                    !slot.finalized;

                  return showButton ? (
                    <button
                      onClick={() => handleFinalizeAuction(slot)}
                      disabled={isFinalizingAuction}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-800 text-white text-xs font-cormorant italic tracking-tight font-medium py-2 rounded transition duration-200 mb-2"
                    >
                      {isFinalizingAuction ? "Finalizing..." : "Finalize"}
                    </button>
                  ) : null;
                })()}
              </div>
            );
          })
        )}
      </div>

      {/* Bidding Modal - Full Screen Overlay - Only for non-streamers */}
      {selectedSlot &&
        getSlotStatus(selectedSlot) === "BIDDING OPEN" &&
        !isStreamer &&
        (() => {
          const currentBidDollars = mistToDollars(selectedSlot.currentBid);
          const minBidDollars = mistToDollars(selectedSlot.minBid);
          const requiredBid =
            selectedSlot.currentBid > BigInt(0)
              ? currentBidDollars + 0.0001
              : minBidDollars;

          return (
            <div className="fixed inset-0 bg-black/70 bg-opacity-95 z-50 flex items-center justify-center p-4">
              <div className="bg-black rounded-lg  max-w-md w-full p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="font-cormorant font-medium italic tracking-tight text-3xl  text-white mb-2">
                      Place Bid
                    </h2>
                    <div className="text-gray-400 text-sm">
                      Slot: {formatTime(selectedSlot.startTime)}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSlot(null);
                      setBidAmount("");
                    }}
                    className="text-white cursor-pointer hover:text-white transition"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
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

                {selectedSlot.currentBid > 0 && (
                  <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
                    <div className="text-gray-400 text-sm mb-1">
                      Current Highest Bid
                    </div>
                    <div className="text-2xl font-bold text-red-500">
                      ${mistToDollars(selectedSlot.currentBid).toFixed(2)}
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Your Bid Amount (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder="0.0000"
                      className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg pl-8 pr-4 py-3 text-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div className="text-gray-500 text-xs mt-2">
                    Minimum bid: ${requiredBid.toFixed(4)}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setSelectedSlot(null);
                      setBidAmount("");
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handlePlaceBid(selectedSlot)}
                    disabled={isBidding || !bidAmount}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition"
                  >
                    {isBidding ? "Processing..." : "Confirm Bid"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
