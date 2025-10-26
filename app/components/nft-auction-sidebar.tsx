"use client";

import { useState, useEffect } from "react";
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { queryTimeSlotsByOwner, TimeSlotInfo, mistToDollars, placeBidTx, setInstructionsTx, endAuctionTx } from "@/lib/sui/time-auction";

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

  const fetchTimeSlots = async () => {
    try {
      const slots = await queryTimeSlotsByOwner(client, streamerAddress);
      // Sort by start time
      slots.sort((a, b) => Number(a.startTime - b.startTime));
      setTimeSlots(slots);
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
            await new Promise(resolve => setTimeout(resolve, 2000));
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
            const biddingOpen = status === "BIDDING OPEN";

            return (
              <div
                key={slot.objectId}
                className={`bg-gray-800 rounded-lg p-3 border ${
                  winner ? "border-green-500" : "border-gray-700"
                } hover:border-red-500 transition-colors`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${statusColor}`}>
                    {status}
                  </span>
                  {winner && (
                    <span className="text-xs font-bold px-2 py-1 rounded bg-green-600 text-white">
                      {biddingOpen ? "WINNING" : "YOU WON"}
                    </span>
                  )}
                </div>

                <div className="text-white text-sm font-semibold mb-1">
                  {formatTime(slot.startTime)}
                </div>
                <div className="text-gray-400 text-xs mb-2">15 minutes</div>

                <div className="bg-gray-900 rounded p-2 mb-2">
                  <div className="text-gray-400 text-xs">Current Bid</div>
                  <div className="text-green-400 font-bold">
                    {slot.currentBid > 0n
                      ? `$${mistToDollars(slot.currentBid).toFixed(2)}`
                      : `Min: $${mistToDollars(slot.minBid).toFixed(2)}`}
                  </div>
                  {slot.currentBidder && (
                    <div className="text-gray-500 text-xs mt-1">
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
                  const showButton = auctionEnded && account && slot.currentBidder && !slot.finalized;

                  return showButton ? (
                    <button
                      onClick={() => handleFinalizeAuction(slot)}
                      disabled={isFinalizingAuction}
                      className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 hover:text-white text-xs font-semibold py-2 rounded transition duration-200 border border-gray-600"
                    >
                      {isFinalizingAuction ? "FINALIZING..." : "⚡ FINALIZE AUCTION"}
                    </button>
                  ) : null;
                })()}

                {canSetInstructions(slot) && (
                  <button
                    onClick={() => setSelectedSlot(slot)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 rounded transition duration-200"
                  >
                    SET INSTRUCTIONS
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
            step="1.00"
            min="1.00"
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

      {/* Instructions Modal */}
      {selectedSlot && canSetInstructions(selectedSlot) && (
        <div className="border-t border-gray-800 p-4 bg-gray-950">
          <h3 className="text-white font-bold mb-2">Set Instructions</h3>
          <div className="text-gray-400 text-xs mb-3">
            Tell the streamer what to do during your slot
          </div>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Your instructions..."
            rows={3}
            className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 mb-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleSetInstructions(selectedSlot)}
              disabled={isSettingInstructions}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm font-bold py-2 rounded transition duration-200"
            >
              {isSettingInstructions ? "Setting..." : "Set Instructions"}
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
