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

    // Query all time slots owned by this streamer
    const allSlots = await queryTimeSlotsByOwner(client, streamerAddress);

    // Find the active slot (current time is within slot window)
    const activeSlot = allSlots.find(slot => {
      const startTime = Number(slot.startTime);
      const endTime = startTime + Number(slot.durationMs);

      return currentTime >= startTime && currentTime < endTime;
    });

    if (!activeSlot) {
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

    return NextResponse.json({
      hasActiveSlot: true,
      instructions: instructionsText,
      winner: activeSlot.currentBidder,
      slotStartTime,
      slotEndTime,
      currentTime,
      slotId: activeSlot.objectId,
    });

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
