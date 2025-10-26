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
}

export function NFTAuctionSidebar({ streamerAddress }: NFTAuctionSidebarProps) {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [timeSlots, setTimeSlots] = useState<TimeSlotInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotInfo | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isBidding, setIsBidding] = useState(false);
  const [isSettingInstructions, setIsSettingInstructions] = useState(false);
  const [isFinalizingAuction, setIsFinalizingAuction] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchTimeSlots = async () => {
    try {
      const slots = await queryTimeSlotsByOwner(client, streamerAddress);
      // Sort by start time
      slots.sort((a, b) => Number(a.startTime - b.startTime));

      const now = Date.now();

      // Filter: Keep only upcoming/active slots + last 5 completed
      const upcoming = slots.filter((slot) => {
        const endTime = Number(slot.startTime) + Number(slot.durationMs);
        return endTime > now;
      });

      const completed = slots.filter((slot) => {
        const endTime = Number(slot.startTime) + Number(slot.durationMs);
        return endTime <= now;
      });

      const recentCompleted = completed.slice(-5);
      const filtered = [...recentCompleted, ...upcoming];

      setTimeSlots(filtered);
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

  const handleSetInstructions = async (slot: TimeSlotInfo) => {
    if (!account) {
      alert("Please connect your wallet");
      return;
    }

    if (!instructions.trim()) {
      alert("Please enter instructions");
      return;
    }

    setIsSettingInstructions(true);

    try {
      const tx = setInstructionsTx(slot.objectId, instructions);

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: () => {
            alert("Instructions set successfully!");
            setInstructions("");
            setSelectedSlot(null);
            fetchTimeSlots();
          },
          onError: (error) => {
            console.error("Failed to set instructions:", error);
            alert(`Failed to set instructions: ${error.message}`);
          },
        }
      );
    } catch (error) {
      console.error("Error setting instructions:", error);
      alert("Failed to set instructions");
    } finally {
      setIsSettingInstructions(false);
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

  const formatRelativeTime = (timestamp: bigint) => {
    const now = Date.now();
    const slotTime = Number(timestamp);
    const diffMs = slotTime - now;

    // If in the past, show "LIVE" or "ENDED"
    if (diffMs < 0) {
      const endTime = slotTime + Number(900000); // 15 min duration
      if (now < endTime) {
        return "LIVE NOW";
      }
      return "- ENDED";
    }

    const diffMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours === 0) {
      return `+${minutes}m`;
    } else if (minutes === 0) {
      return `+${hours}hr`;
    } else {
      return `+${hours}hr ${minutes}m`;
    }
  };

  const isWinner = (slot: TimeSlotInfo) => {
    return account && slot.currentBidder === account.address;
  };

  const canSetInstructions = (slot: TimeSlotInfo) => {
    const now = Date.now();
    const auctionEnd = Number(slot.auctionEnd);
    return isWinner(slot) && now >= auctionEnd;
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
            const biddingOpen = status === "BIDDING OPEN";

            return (
              <div
                key={slot.objectId}
                className={`bg-transparent rounded-lg p-3 border ${
                  winner ? "border-green-500" : "border-gray-700"
                } hover:border-red-500 transition-colors`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded ${statusColor}`}
                    >
                      {status}
                    </span>
                    {winner && (
                      <span className="text-xs font-bold px-2 py-1 rounded bg-green-600 text-white">
                        {biddingOpen ? "WINNING" : "YOU WON"}
                      </span>
                    )}
                  </div>
                  <div className="text-white text-lg font-mono font-semibold">
                    {formatRelativeTime(slot.startTime)}
                  </div>
                </div>

                <div className="bg-transparent rounded p-2 mb-2">
                  <div className="text-gray-400 text-xs mb-1">Current Bid</div>
                  <div className="text-green-400 font-mono text-3xl font-bold">
                    {slot.currentBid > 0
                      ? `$${mistToDollars(slot.currentBid).toFixed(2)}`
                      : `$${mistToDollars(slot.minBid).toFixed(2)}`}
                  </div>
                  {slot.currentBidder && (
                    <div className="text-gray-500 text-xs mt-1 font-mono">
                      {slot.currentBidder.slice(0, 8)}...
                    </div>
                  )}
                </div>

                {status === "BIDDING OPEN" && account && (
                  <button
                    onClick={() => setSelectedSlot(slot)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 rounded transition duration-200"
                  >
                    PLACE BID
                  </button>
                )}

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
                      className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 hover:text-white text-xs font-semibold py-2 rounded transition duration-200 border border-gray-600"
                    >
                      {isFinalizingAuction
                        ? "FINALIZING..."
                        : "⚡ FINALIZE AUCTION"}
                    </button>
                  ) : null;
                })()}

                {canSetInstructions(slot) && (
                  <button
                    onClick={() => setSelectedSlot(slot)}
                    className="w-full font-cormorant font-medium italic tracking-tight bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 rounded transition duration-200"
                  >
                    SET INSTRUCTIONS
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bidding Modal - Full Screen Overlay */}
      {selectedSlot && getSlotStatus(selectedSlot) === "BIDDING OPEN" && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-md w-full p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
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
                className="text-gray-400 hover:text-white transition"
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
                  step="0.01"
                  min="0.01"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg pl-8 pr-4 py-3 text-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="text-gray-500 text-xs mt-2">
                Minimum bid: ${mistToDollars(selectedSlot.minBid).toFixed(2)}
                {selectedSlot.currentBid > 0 && (
                  <span className="ml-2">
                    (or $
                    {(mistToDollars(selectedSlot.currentBid) + 0.01).toFixed(2)}{" "}
                    to outbid current bid)
                  </span>
                )}
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
      )}

      {/* Instructions Modal - Full Screen Overlay */}
      {selectedSlot && canSetInstructions(selectedSlot) && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-lg w-full p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Set Instructions
                </h2>
                <div className="text-gray-400 text-sm">
                  Tell the streamer what to do during your slot
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedSlot(null);
                  setInstructions("");
                }}
                className="text-gray-400 hover:text-white transition"
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

            <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded">
              <div className="text-blue-300 text-sm">
                You won this slot! Enter instructions that the streamer must
                follow during this time period.
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Your Instructions
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g., 'Do 20 pushups', 'Sing a song', 'Review this product'..."
                rows={6}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="text-gray-500 text-xs mt-2">
                Be creative! The streamer will see and must follow these
                instructions.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedSlot(null);
                  setInstructions("");
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSetInstructions(selectedSlot)}
                disabled={isSettingInstructions || !instructions.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                {isSettingInstructions ? "Setting..." : "Set Instructions"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
