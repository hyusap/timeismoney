"use client";

import { useState, useEffect } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, CLOCK_OBJECT_ID } from "@/lib/sui/time-auction";
import { RadialSelector } from "../components/radial-selector";

const SHIFT_HOURS = 4; // Default shift length
const SLOT_DURATION_MS = 60 * 1000; // 1 minute for testing
const MIN_BID_DOLLARS = 0.01; // $0.01 in UI = 100 MIST on-chain
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#e0e5ec' }}>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-700 mb-4">
            SELL YOUR TIME
          </h1>
          <p className="text-gray-500 mb-8">
            Connect your wallet to commodify your existence
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#e0e5ec' }}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-700 mb-4">
            SELL YOUR TIME
          </h1>
          <p className="text-xl text-gray-500">
            "Time is money. Your time is someone else's money."
          </p>
        </div>

        <div className="p-8">
          <h2 className="text-3xl font-medium text-gray-700 mb-8 text-center">
            CLOCK IN TO START YOUR SHIFT
          </h2>

          <div className="space-y-6 mb-8">
            <RadialSelector
              value={shiftHours}
              onChange={setShiftHours}
              min={1}
              max={12}
              label="Shift Duration"
              unit="hours"
              description={`Will create ${shiftHours * 60} time slots (1 min each)`}
            />
          </div>

          <div className="mb-8">
            <p className="text-gray-500 text-sm text-center">
              By clocking in, you agree to sell your time. Highest bidder controls each 15-minute slot. They can watch you via camera and give instructions. All slots will be auctioned immediately. This is irreversible.
            </p>
          </div>

          <button
            onClick={handleClockIn}
            disabled={isCreatingSlots}
            className="w-full font-medium py-4 rounded text-xl transition duration-200 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400"
          >
            {isCreatingSlots ? "CLOCKING IN..." : "CLOCK IN"}
          </button>
        </div>

      </div>
    </div>
  );
}
