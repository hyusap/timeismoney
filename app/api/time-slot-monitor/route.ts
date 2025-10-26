import { NextRequest, NextResponse } from 'next/server';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { queryTimeSlotsByOwner, getTimeSlotInfo } from '@/lib/sui/time-auction';

/**
 * Backend Time Slot Monitor API
 *
 * Purpose: Check if there's an active time slot for a given streamer right now
 * and return the winner's instructions if any.
 *
 * Query Params:
 * - streamerAddress: The Sui wallet address of the streamer (required)
 *
 * Response:
 * {
 *   hasActiveSlot: boolean,
 *   instructions: string | null,
 *   winner: string | null,
 *   slotStartTime: number | null,
 *   slotEndTime: number | null,
 *   currentTime: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const streamerAddress = searchParams.get('streamerAddress');

    if (!streamerAddress) {
      return NextResponse.json(
        { error: 'streamerAddress is required' },
        { status: 400 }
      );
    }

    // Initialize Sui client
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    const currentTime = Date.now();

    console.log("🔍 [API] time-slot-monitor called for:", streamerAddress);
    console.log("🔍 [API] Current time:", new Date(currentTime).toLocaleTimeString());

    // Query all time slots owned by this streamer
    const allSlots = await queryTimeSlotsByOwner(client, streamerAddress);
    console.log("🔍 [API] Total slots found:", allSlots.length);

    // Find the active slot (current time is within slot window)
    const activeSlot = allSlots.find(slot => {
      const startTime = Number(slot.startTime);
      const endTime = startTime + Number(slot.durationMs);
      const isActive = currentTime >= startTime && currentTime < endTime;

      if (isActive) {
        console.log("🔍 [API] Active slot found:", {
          slotId: slot.objectId.slice(0, 8),
          startTime: new Date(startTime).toLocaleTimeString(),
          endTime: new Date(endTime).toLocaleTimeString(),
          currentBidder: slot.currentBidder,
        });
      }

      return isActive;
    });

    if (!activeSlot) {
      console.log("🔍 [API] No active slot found");
      // No active slot right now
      return NextResponse.json({
        hasActiveSlot: false,
        instructions: null,
        winner: null,
        slotStartTime: null,
        slotEndTime: null,
        currentTime,
      });
    }

    // Active slot found - extract instructions
    let instructionsText: string | null = null;
    if (activeSlot.instructions) {
      try {
        // Decode UTF-8 bytes to string
        instructionsText = new TextDecoder().decode(activeSlot.instructions);
      } catch (e) {
        console.error('Failed to decode instructions:', e);
        instructionsText = null;
      }
    }

    const slotStartTime = Number(activeSlot.startTime);
    const slotEndTime = slotStartTime + Number(activeSlot.durationMs);

    const response = {
      hasActiveSlot: true,
      instructions: instructionsText,
      winner: activeSlot.currentBidder,
      slotStartTime,
      slotEndTime,
      currentTime,
      slotId: activeSlot.objectId,
    };

    console.log("🔍 [API] Returning response:", response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in time-slot-monitor API:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch time slot data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
