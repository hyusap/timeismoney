"use client";

import { useState, useEffect } from "react";
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { queryTimeSlotsByOwner, TimeSlotInfo, mistToDollars, placeBidTx } from "@/lib/sui/time-auction";

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
  const [isBidding, setIsBidding] = useState(false);

  const fetchTimeSlots = async () => {
    try {
      const slots = await queryTimeSlotsByOwner(client, streamerAddress);

      // Sort by start time
      slots.sort((a, b) => Number(a.startTime - b.startTime));

      const now = Date.now();

      // Filter: Keep only upcoming/active slots + last 5 completed
      const upcoming = slots.filter(slot => {
        const endTime = Number(slot.startTime) + Number(slot.durationMs);
        return endTime > now;
      });

      const completed = slots.filter(slot => {
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


  const formatTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp));
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col max-h-screen">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-xl font-bold text-red-500 mb-1">TIME AUCTIONS</h2>
        <p className="text-gray-400 text-xs">Bid on {streamerAddress.slice(0, 8)}...'s time</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {timeSlots.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No time slots available
          </div>
        ) : (
          timeSlots.map((slot) => {
            const status = getSlotStatus(slot);
            const statusColor = getStatusColor(status);
            const winner = isWinner(slot);

            return (
              <div
                key={slot.objectId}
                className={`bg-gray-800 rounded-lg p-4 border-2 ${
                  winner ? "border-green-500" : "border-gray-700"
                } hover:border-red-500 transition-colors`}
              >
                {/* Time and Status */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-white text-sm font-semibold">
                      {formatTime(slot.startTime)}
                    </div>
                    <div className="text-gray-400 text-xs">15 minutes</div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${statusColor}`}>
                    {status}
                  </span>
                </div>

                {/* WINNER ADDRESS - PROMINENT */}
                {slot.currentBidder ? (
                  <div className="bg-gradient-to-r from-yellow-900/50 to-yellow-800/50 border-2 border-yellow-500 rounded-lg p-4 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-yellow-400 font-bold text-sm">🏆 HIGHEST BIDDER</div>
                      {winner && (
                        <span className="text-xs font-bold px-2 py-1 rounded bg-green-600 text-white">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-white font-mono text-base font-bold bg-black/40 px-3 py-2 rounded border border-yellow-600/50">
                      {slot.currentBidder.slice(0, 12)}...{slot.currentBidder.slice(-8)}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 mb-3">
                    <div className="text-gray-500 text-sm font-semibold">No bids yet</div>
                  </div>
                )}

                {/* Current Bid - Secondary */}
                <div className="bg-gray-900 rounded p-2 mb-3">
                  <div className="text-gray-400 text-xs">Current Bid</div>
                  <div className="text-green-400 font-bold">
                    {slot.currentBid > 0n
                      ? `$${mistToDollars(slot.currentBid).toFixed(2)}`
                      : `Min: $${mistToDollars(slot.minBid).toFixed(2)}`}
                  </div>
                </div>

                {/* Action Buttons */}
                {status === "BIDDING OPEN" && account && (
                  <button
                    onClick={() => setSelectedSlot(slot)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 rounded transition duration-200"
                  >
                    PLACE BID
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bidding Modal */}
      {selectedSlot && getSlotStatus(selectedSlot) === "BIDDING OPEN" && (
        <div className="border-t border-gray-800 p-4 bg-gray-950">
          <h3 className="text-white font-bold mb-2">Place Bid</h3>
          <div className="text-gray-400 text-xs mb-3">
            Slot: {formatTime(selectedSlot.startTime)}
          </div>
          <input
            type="number"
            step="0.01"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder="Amount in $ (e.g. 1.00)"
            className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 mb-3 text-sm focus:outline-none focus:border-red-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handlePlaceBid(selectedSlot)}
              disabled={isBidding}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white text-sm font-bold py-2 rounded transition duration-200"
            >
              {isBidding ? "Bidding..." : "Confirm Bid"}
            </button>
            <button
              onClick={() => setSelectedSlot(null)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold py-2 rounded transition duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
