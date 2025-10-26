/**
 * TypeScript SDK for Time Slot Auction smart contract
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { bcs } from '@mysten/sui/bcs';

// Will be set after deployment
export const PACKAGE_ID = process.env.NEXT_PUBLIC_TIME_AUCTION_PACKAGE_ID || '';
export const CLOCK_OBJECT_ID = '0x6'; // Sui's shared clock object

export interface TimeSlotInfo {
  objectId: string;
  startTime: bigint;
  durationMs: bigint;
  timeOwner: string;
  currentBidder: string | null;
  currentBid: bigint;
  minBid: bigint;
  auctionEnd: bigint;
  instructions: Uint8Array | null;
  finalized: boolean;
  claimed: boolean;
}

export interface BidPlacedEvent {
  slotId: string;
  bidder: string;
  amount: bigint;
  timestamp: bigint;
}

export interface AuctionEndedEvent {
  slotId: string;
  winner: string;
  finalBid: bigint;
}

/**
 * Create a new time slot auction (NO CAP REQUIRED - anyone can sell their time!)
 * @param startTime - Unix timestamp (ms) when slot starts
 * @param minBid - Minimum bid in MIST (1 SUI = 1_000_000_000 MIST)
 * @param auctionDurationMs - How long the auction runs
 */
export function createTimeSlotTx(
  startTime: number,
  minBid: bigint,
  auctionDurationMs: number
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::time_slot::create_time_slot`,
    arguments: [
      tx.pure.u64(startTime),
      tx.pure.u64(minBid),
      tx.pure.u64(auctionDurationMs),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

/**
 * Place a bid on a time slot
 * @param slotId - TimeSlot object ID
 * @param bidAmount - Bid amount in MIST
 */
export function placeBidTx(
  slotId: string,
  bidAmount: bigint
): Transaction {
  const tx = new Transaction();

  const [coin] = tx.splitCoins(tx.gas, [bidAmount]);

  tx.moveCall({
    target: `${PACKAGE_ID}::time_slot::place_bid`,
    arguments: [
      tx.object(slotId),
      coin,
      tx.object(CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

/**
 * End an auction (anyone can call after auction_end time)
 * @param slotId - TimeSlot object ID
 */
export function endAuctionTx(slotId: string): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::time_slot::end_auction`,
    arguments: [
      tx.object(slotId),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

/**
 * Winner sets instructions for their time slot
 * @param slotId - TimeSlot object ID
 * @param instructions - UTF-8 encoded instructions
 */
export function setInstructionsTx(
  slotId: string,
  instructions: string
): Transaction {
  const tx = new Transaction();

  const instructionsBytes = new TextEncoder().encode(instructions);

  tx.moveCall({
    target: `${PACKAGE_ID}::time_slot::set_instructions`,
    arguments: [
      tx.object(slotId),
      tx.pure(bcs.vector(bcs.u8()).serialize(instructionsBytes)),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

/**
 * Claim control of a time slot (winner must call during their slot)
 * @param slotId - TimeSlot object ID
 */
export function claimSlotTx(slotId: string): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::time_slot::claim_slot`,
    arguments: [
      tx.object(slotId),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

/**
 * Check if an address has control over a time slot right now
 * @param client - Sui client
 * @param slotId - TimeSlot object ID
 * @param address - Address to check
 * @returns true if address has control
 */
export async function hasControl(
  client: SuiClient,
  slotId: string,
  address: string
): Promise<boolean> {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::time_slot::has_control`,
    arguments: [
      tx.object(slotId),
      tx.pure.address(address),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });

  const result = await client.devInspectTransactionBlock({
    transactionBlock: tx,
    sender: address,
  });

  if (result.results?.[0]?.returnValues?.[0]) {
    const [bytes] = result.results[0].returnValues[0];
    return bytes[0] === 1;
  }

  return false;
}

/**
 * Get info about a time slot
 * @param client - Sui client
 * @param slotId - TimeSlot object ID
 */
export async function getTimeSlotInfo(
  client: SuiClient,
  slotId: string
): Promise<TimeSlotInfo | null> {
  try {
    const object = await client.getObject({
      id: slotId,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (!object.data || object.data.content?.dataType !== 'moveObject') {
      return null;
    }

    const fields = object.data.content.fields as any;

    // Debug logging for current_bidder parsing
    if (fields.current_bid && BigInt(fields.current_bid) > 0n) {
      console.log('Slot with bid - RAW fields:', fields);
    }

    // Parse current_bidder - Sui represents Option<address> as a direct string when Some, or empty when None
    const currentBidder = typeof fields.current_bidder === 'string' && fields.current_bidder.length > 0
      ? fields.current_bidder
      : null;

    if (fields.current_bid && BigInt(fields.current_bid) > 0n) {
      console.log('Parsed currentBidder:', currentBidder, 'from raw:', fields.current_bidder);
    }

    return {
      objectId: slotId,
      startTime: BigInt(fields.start_time),
      durationMs: BigInt(fields.duration_ms),
      timeOwner: fields.time_owner,
      currentBidder,
      currentBid: BigInt(fields.current_bid),
      minBid: BigInt(fields.min_bid),
      auctionEnd: BigInt(fields.auction_end),
      instructions: fields.instructions?.vec?.[0]
        ? new Uint8Array(fields.instructions.vec[0])
        : null,
      finalized: fields.finalized ?? false,
      claimed: fields.claimed ?? false,
    };
  } catch (error) {
    console.error('Error fetching time slot:', error);
    return null;
  }
}

/**
 * Query time slots by listening to SlotCreated events
 * This is the recommended approach for querying shared objects
 * @param client - Sui client
 * @param limit - Max number of slots to fetch
 */
export async function queryTimeSlots(
  client: SuiClient,
  limit: number = 100
): Promise<TimeSlotInfo[]> {
  if (!PACKAGE_ID) {
    throw new Error('NEXT_PUBLIC_TIME_AUCTION_PACKAGE_ID environment variable is not set. Please deploy the smart contract first.');
  }

  try {
    // Query SlotCreated events to find all time slot IDs
    const events = await client.queryEvents({
      query: {
        MoveEventType: `${PACKAGE_ID}::time_slot::SlotCreated`,
      },
      limit,
      order: 'descending',
    });

    const slots: TimeSlotInfo[] = [];

    // Fetch details for each slot
    for (const event of events.data) {
      const fields = event.parsedJson as any;
      if (fields.slot_id) {
        const slotInfo = await getTimeSlotInfo(client, fields.slot_id);
        if (slotInfo) {
          slots.push(slotInfo);
        }
      }
    }

    // Sort by start time
    slots.sort((a, b) => Number(a.startTime - b.startTime));

    return slots;
  } catch (error) {
    console.error('Error querying time slots:', error);
    return [];
  }
}

/**
 * Query time slots by owner address
 * @param client - Sui client
 * @param owner - Time owner address
 * @param limit - Max number of slots to fetch
 */
export async function queryTimeSlotsByOwner(
  client: SuiClient,
  owner: string,
  limit: number = 100
): Promise<TimeSlotInfo[]> {
  try {
    // Query SlotCreated events filtered by owner
    const events = await client.queryEvents({
      query: {
        MoveEventType: `${PACKAGE_ID}::time_slot::SlotCreated`,
      },
      limit,
      order: 'descending',
    });

    const slots: TimeSlotInfo[] = [];

    // Fetch details for each slot and filter by owner
    for (const event of events.data) {
      const fields = event.parsedJson as any;
      if (fields.slot_id && fields.time_owner === owner) {
        const slotInfo = await getTimeSlotInfo(client, fields.slot_id);
        if (slotInfo) {
          slots.push(slotInfo);
        }
      }
    }

    // Sort by start time
    slots.sort((a, b) => Number(a.startTime - b.startTime));

    return slots;
  } catch (error) {
    console.error('Error querying time slots by owner:', error);
    return [];
  }
}

/**
 * Subscribe to bid events for a time slot
 * @param client - Sui client
 * @param slotId - TimeSlot object ID
 * @param onBidPlaced - Callback for new bids
 */
export async function subscribeToBids(
  client: SuiClient,
  slotId: string,
  onBidPlaced: (event: BidPlacedEvent) => void
): Promise<() => void> {
  const unsubscribe = await client.subscribeEvent({
    filter: {
      MoveEventType: `${PACKAGE_ID}::time_slot::BidPlaced`,
    },
    onMessage: (event) => {
      const fields = event.parsedJson as any;
      if (fields.slot_id === slotId) {
        onBidPlaced({
          slotId: fields.slot_id,
          bidder: fields.bidder,
          amount: BigInt(fields.amount),
          timestamp: BigInt(fields.timestamp),
        });
      }
    },
  });

  return unsubscribe;
}

/**
 * Get recent bid events for a time slot
 * @param client - Sui client
 * @param slotId - TimeSlot object ID
 * @param limit - Max number of events to fetch
 */
export async function getBidHistory(
  client: SuiClient,
  slotId: string,
  limit: number = 50
): Promise<BidPlacedEvent[]> {
  try {
    const events = await client.queryEvents({
      query: {
        MoveEventType: `${PACKAGE_ID}::time_slot::BidPlaced`,
      },
      limit,
      order: 'descending',
    });

    const bids: BidPlacedEvent[] = [];

    for (const event of events.data) {
      const fields = event.parsedJson as any;
      if (fields.slot_id === slotId) {
        bids.push({
          slotId: fields.slot_id,
          bidder: fields.bidder,
          amount: BigInt(fields.amount),
          timestamp: BigInt(fields.timestamp),
        });
      }
    }

    return bids;
  } catch (error) {
    console.error('Error fetching bid history:', error);
    return [];
  }
}

// Utility: Convert MIST to dollars
// $1 in UI = 0.00001 SUI on-chain = 10,000 MIST
// So 1 MIST = $0.0001
export function mistToDollars(mist: bigint): number {
  return Number(mist) / 10_000;
}

// Utility: Convert dollars to MIST
// $1 in UI = 10,000 MIST on-chain
export function dollarsToMist(dollars: number): bigint {
  return BigInt(Math.floor(dollars * 10_000));
}

// Legacy exports for backwards compatibility
export const mistToSui = mistToDollars;
export const suiToMist = dollarsToMist;
