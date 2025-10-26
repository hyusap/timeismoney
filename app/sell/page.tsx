"use client";

import { useState, useEffect } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, CLOCK_OBJECT_ID } from "@/lib/sui/time-auction";

const SHIFT_HOURS = 4; // Default shift length
const SLOT_DURATION_MS = 60 * 1000; // 1 minute for testing
const MIN_BID_DOLLARS = 1.00; // $1 in UI = 10,000 MIST on-chain
const AUCTION_DURATION_HOURS = 24; // Auction runs for 24 hours before slot starts

export default function SellTimePage() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [isCreatingSlots, setIsCreatingSlots] = useState(false);
  const [shiftHours, setShiftHours] = useState(SHIFT_HOURS);
  const [minBidPerSlot, setMinBidPerSlot] = useState(MIN_BID_DOLLARS);

  const handleClockIn = async () => {
    if (!account) {
      alert("Please connect wallet");
      return;
    }

    if (!PACKAGE_ID) {
      alert("Smart contract not deployed. Please set NEXT_PUBLIC_TIME_AUCTION_PACKAGE_ID environment variable.");
      return;
    }

    setIsCreatingSlots(true);

    try {
      // Calculate how many 1-min slots in the shift
      const numSlots = shiftHours * 60;
      const now = Date.now();

      const auctionDurationMs = AUCTION_DURATION_HOURS * 60 * 60 * 1000;
      const minBidMist = BigInt(Math.floor(minBidPerSlot * 10_000)); // Convert UI dollars to MIST

      // Create a transaction to batch-create all slots
      const tx = new Transaction();

      for (let i = 0; i < numSlots; i++) {
        // Slots start immediately, no offset
        const slotStartTime = now + (i * SLOT_DURATION_MS);

        tx.moveCall({
          target: `${PACKAGE_ID}::time_slot::create_time_slot`,
          arguments: [
            tx.pure.u64(slotStartTime),
            tx.pure.u64(minBidMist),
            tx.pure.u64(auctionDurationMs),
            tx.object(CLOCK_OBJECT_ID),
          ],
        });
      }

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log("Slots created successfully:", result);
            alert(`Successfully clocked in! Created ${numSlots} time slots for your ${shiftHours}-hour shift. Go to the home page to see them.`);
          },
          onError: (error) => {
            console.error("Failed to create slots:", error);
            alert(`Failed to clock in: ${error.message}`);
          },
        }
      );
    } catch (error) {
      console.error("Error creating time slots:", error);
      alert("Failed to create time slots");
    } finally {
      setIsCreatingSlots(false);
    }
  };


  if (!account) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-500 mb-4">
            SELL YOUR TIME
          </h1>
          <p className="text-gray-300 mb-8">
            Connect your wallet to commodify your existence
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-red-500 mb-4">
            SELL YOUR TIME
          </h1>
          <p className="text-xl text-gray-400 italic">
            "Time is money. Your time is someone else's money."
          </p>
        </div>

        <div className="bg-gray-900 border-2 border-red-600 rounded-lg p-8">
          <h2 className="text-3xl font-bold text-white mb-6">
            CLOCK IN TO START YOUR SHIFT
          </h2>

          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Shift Duration (hours)
              </label>
              <input
                type="number"
                value={shiftHours}
                onChange={(e) => setShiftHours(Number(e.target.value))}
                min="1"
                max="12"
                className="w-full bg-gray-800 text-white border border-gray-700 rounded px-4 py-3 focus:outline-none focus:border-red-500"
              />
              <p className="text-gray-500 text-sm mt-1">
                Will create {shiftHours * 60} time slots (1 min each)
              </p>
            </div>
          </div>

          <div className="bg-gray-800 border border-yellow-600 rounded p-4 mb-6">
            <h3 className="text-yellow-500 font-bold mb-2">⚠️ WARNING</h3>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• By clocking in, you agree to sell your time</li>
              <li>• Highest bidder controls each 15-minute slot</li>
              <li>• They can watch you via camera and give instructions</li>
              <li>• All slots will be auctioned immediately</li>
              <li>• This is irreversible</li>
            </ul>
          </div>

          <button
            onClick={handleClockIn}
            disabled={isCreatingSlots}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white font-bold py-4 rounded-lg text-xl transition duration-200"
          >
            {isCreatingSlots ? "CLOCKING IN..." : "CLOCK IN"}
          </button>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/auctions"
            className="text-gray-500 hover:text-gray-300 underline"
          >
            View active auctions
          </a>
        </div>
      </div>
    </div>
  );
}
