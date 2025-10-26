"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { getTimeSlotInfo, TimeSlotInfo, mistToDollars, dollarsToMist, placeBidTx, getBidHistory, BidPlacedEvent } from "@/lib/sui/time-auction";

export default function AuctionPage() {
  const params = useParams();
  const router = useRouter();
  const slotId = params.slotId as string;

  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [slot, setSlot] = useState<TimeSlotInfo | null>(null);
  const [bidHistory, setBidHistory] = useState<BidPlacedEvent[]>([]);
  const [bidAmount, setBidAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isBidding, setIsBidding] = useState(false);

  const fetchSlotInfo = async () => {
    const info = await getTimeSlotInfo(client, slotId);
    setSlot(info);
    setIsLoading(false);

    if (info) {
      // Set default bid to min or current + tiny increment
      const minBid = info.currentBid > 0n
        ? mistToDollars(info.currentBid) + 0.00001
        : mistToDollars(info.minBid);
      setBidAmount(minBid.toFixed(2));
    }
  };

  const fetchBidHistory = async () => {
    const history = await getBidHistory(client, slotId, 20);
    setBidHistory(history);
  };

  useEffect(() => {
    fetchSlotInfo();
    fetchBidHistory();

    const interval = setInterval(() => {
      fetchSlotInfo();
      fetchBidHistory();
    }, 5000);

    return () => clearInterval(interval);
  }, [slotId]);

  const handlePlaceBid = async () => {
    if (!account) {
      alert("Please connect your wallet");
      return;
    }

    const bidAmountNum = parseFloat(bidAmount);
    if (isNaN(bidAmountNum) || bidAmountNum <= 0) {
      alert("Please enter a valid bid amount");
      return;
    }

    setIsBidding(true);

    try {
      const bidMist = dollarsToMist(bidAmountNum);
      const tx = placeBidTx(slotId, bidMist);

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log("Bid placed successfully:", result);
            alert(`Bid of $${bidAmountNum} placed successfully!`);
            fetchSlotInfo();
            fetchBidHistory();
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
    return new Date(Number(timestamp)).toLocaleString();
  };

  const getTimeUntil = (timestamp: bigint) => {
    const now = Date.now();
    const diff = Number(timestamp) - now;
    if (diff <= 0) return "Started";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading auction...</div>
      </div>
    );
  }

  if (!slot) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-red-500 font-bold mb-4">Auction Not Found</h1>
          <button
            onClick={() => router.push("/")}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded"
          >
            Back to Auctions
          </button>
        </div>
      </div>
    );
  }

  const auctionEnded = BigInt(Date.now()) >= slot.auctionEnd;
  const isCurrentBidder = account?.address === slot.currentBidder;

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto p-6">
        <button
          onClick={() => router.push("/")}
          className="text-gray-400 hover:text-white mb-6"
        >
          ← Back to Auctions
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Auction Details */}
          <div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
              <h1 className="text-3xl font-bold text-white mb-4">
                15-Minute Time Slot
              </h1>

              <div className="space-y-4">
                <div>
                  <div className="text-gray-400 text-sm">Slot Start Time</div>
                  <div className="text-white font-bold text-lg">
                    {formatTime(slot.startTime)}
                  </div>
                  <div className="text-gray-500 text-sm">
                    in {getTimeUntil(slot.startTime)}
                  </div>
                </div>

                <div>
                  <div className="text-gray-400 text-sm">Duration</div>
                  <div className="text-white">15 minutes</div>
                </div>

                <div>
                  <div className="text-gray-400 text-sm">Time Owner</div>
                  <div className="text-white font-mono text-sm">
                    {slot.timeOwner}
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <div className="text-gray-400 text-sm">Auction Status</div>
                  <div className={`text-lg font-bold ${auctionEnded ? "text-red-500" : "text-green-500"}`}>
                    {auctionEnded ? "ENDED" : "ACTIVE"}
                  </div>
                  {!auctionEnded && (
                    <div className="text-gray-500 text-sm">
                      Ends in {getTimeUntil(slot.auctionEnd)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* What You Get */}
            <div className="bg-gray-900 border border-yellow-600 rounded-lg p-6">
              <h2 className="text-xl font-bold text-yellow-500 mb-4">
                What You're Buying
              </h2>
              <ul className="space-y-2 text-gray-300">
                <li>✓ 15 minutes of someone's life</li>
                <li>✓ Give them instructions to follow</li>
                <li>✓ Watch them via live camera feed</li>
                <li>✓ Complete control during the time slot</li>
              </ul>
            </div>
          </div>

          {/* Right: Bidding */}
          <div>
            <div className="bg-gray-900 border-2 border-red-600 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                {auctionEnded ? "Auction Ended" : "Place Your Bid"}
              </h2>

              <div className="bg-gray-800 rounded p-6 mb-6">
                <div className="text-gray-400 text-sm mb-2">Current Highest Bid</div>
                <div className="text-4xl font-bold text-green-400 mb-2">
                  {slot.currentBid > 0n
                    ? `$${mistToDollars(slot.currentBid).toFixed(2)}`
                    : "No bids yet"}
                </div>
                {slot.currentBidder && (
                  <div className="text-gray-500 text-sm">
                    by {slot.currentBidder.slice(0, 16)}...
                  </div>
                )}
                {slot.currentBid === 0n && (
                  <div className="text-gray-500 text-sm">
                    Minimum bid: ${mistToDollars(slot.minBid).toFixed(2)}
                  </div>
                )}
              </div>

              {!auctionEnded ? (
                <>
                  {isCurrentBidder && (
                    <div className="bg-green-900 border border-green-600 rounded p-4 mb-4">
                      <div className="text-green-400 font-bold">
                        🎉 You are the current highest bidder!
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-gray-300 mb-2 font-semibold">
                      Your Bid ($)
                    </label>
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      step="0.00001"
                      className="w-full bg-gray-800 text-white text-xl border border-gray-700 rounded px-4 py-3 focus:outline-none focus:border-red-500"
                      disabled={!account || isBidding}
                    />
                  </div>

                  {!account ? (
                    <div className="bg-yellow-900 border border-yellow-600 rounded p-4 mb-4 text-yellow-400">
                      Connect your wallet to place a bid
                    </div>
                  ) : null}

                  <button
                    onClick={handlePlaceBid}
                    disabled={!account || isBidding}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white font-bold py-4 rounded-lg text-xl transition duration-200"
                  >
                    {isBidding ? "PLACING BID..." : "PLACE BID"}
                  </button>
                </>
              ) : (
                <div className="bg-red-900 border border-red-600 rounded p-4 text-red-400">
                  This auction has ended.
                  {slot.currentBidder && (
                    <div className="mt-2">
                      Winner: {slot.currentBidder === account?.address ? "YOU!" : slot.currentBidder}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bid History */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Bid History ({bidHistory.length})
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {bidHistory.length === 0 ? (
                  <div className="text-gray-500 text-center py-4">
                    No bids yet. Be the first!
                  </div>
                ) : (
                  bidHistory.map((bid, idx) => (
                    <div key={idx} className="bg-gray-800 rounded p-3">
                      <div className="flex justify-between items-start mb-1">
                        <div className="text-white font-bold">
                          ${mistToDollars(bid.amount).toFixed(2)}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {formatTime(bid.timestamp)}
                        </div>
                      </div>
                      <div className="text-gray-400 text-sm font-mono">
                        {bid.bidder.slice(0, 16)}...
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
