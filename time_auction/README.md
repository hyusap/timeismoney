# Time Slot Auction Smart Contract

A Sui Move smart contract that enables auctioning 15-minute time slots of human time, where the highest bidder gains control and can issue instructions during their purchased slot.

## Concept

This contract implements a **dystopian time commodification system** where:
- Time owners can auction off 15-minute chunks of their day
- Anyone can bid on these slots via blockchain
- Highest bidder gets control for that 15 minutes
- Winners can set instructions and verify control via the blockchain
- Perfect for integration with streaming/surveillance systems (LiveKit)

## Architecture

### Core Objects

**TimeOwnerCap**
- Capability proving ownership of time being sold
- Required to create new time slot auctions
- Can be minted by existing cap holders

**TimeSlot (Shared Object)**
- Represents one 15-minute auctionable time slot
- Contains auction state (bids, winner, timing)
- Shared so anyone can bid
- Immutable slot duration (15 minutes)

### Key Functions

#### Creating Auctions
```move
public fun create_time_slot(
    cap: &TimeOwnerCap,
    start_time: u64,           // Unix timestamp (ms) when slot starts
    min_bid: u64,              // Minimum bid in MIST
    auction_duration_ms: u64,  // How long auction runs
    clock: &Clock,
    ctx: &mut TxContext
)
```

#### Bidding
```move
public fun place_bid(
    slot: &mut TimeSlot,
    bid_coin: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext
)
```
- Automatically refunds previous bidder
- Must exceed current bid (or min_bid if first)
- Fails if auction has ended

#### Finalizing
```move
public fun end_auction(
    slot: &mut TimeSlot,
    clock: &Clock,
    ctx: &mut TxContext
)
```
- Anyone can call after `auction_end` time
- Transfers escrowed funds to time owner
- Emits `AuctionEnded` event

#### Control & Instructions
```move
public fun set_instructions(
    slot: &mut TimeSlot,
    instructions: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext
)
```
- Only winner can set after auction ends
- Instructions are arbitrary bytes (UTF-8 text, JSON, etc.)

```move
public fun has_control(
    slot: &TimeSlot,
    caller: address,
    clock: &Clock
): bool
```
- Returns `true` if caller is the winner AND current time is within the slot window
- Use this to gate access to streaming/control systems

## Events

- `SlotCreated` - New auction created
- `BidPlaced` - New bid submitted
- `AuctionEnded` - Auction finalized with winner
- `SlotClaimed` - Winner claimed their slot

## Deployment

### Prerequisites
- [Sui CLI](https://docs.sui.io/build/install) installed
- Active Sui wallet with testnet/mainnet SUI

### Build & Test
```bash
cd time_auction

# Build
sui move build

# Test
sui move test

# Publish to testnet
sui client publish --gas-budget 100000000
```

### After Publishing
1. Save the Package ID from publish output
2. Set environment variable:
   ```bash
   export NEXT_PUBLIC_TIME_AUCTION_PACKAGE_ID="0x..."
   ```
3. Save your `TimeOwnerCap` object ID (emitted during init)

## TypeScript SDK Usage

The TypeScript SDK is located at `lib/sui/time-auction.ts`.

### Example: Create Time Slot

```typescript
import { createTimeSlotTx, suiToMist } from '@/lib/sui/time-auction';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';

const { mutate: signAndExecute } = useSignAndExecuteTransaction();

// Create auction for a slot starting 1 hour from now
const startTime = Date.now() + 3600000;
const minBid = suiToMist(10); // 10 SUI minimum
const auctionDuration = 3600000; // Auction runs for 1 hour

const tx = createTimeSlotTx(
  ownerCapId,
  startTime,
  minBid,
  auctionDuration
);

signAndExecute({ transaction: tx });
```

### Example: Place Bid

```typescript
import { placeBidTx, suiToMist } from '@/lib/sui/time-auction';

const bidAmount = suiToMist(15); // Bid 15 SUI

const tx = placeBidTx(slotId, bidAmount);

signAndExecute({ transaction: tx });
```

### Example: Check Control

```typescript
import { hasControl } from '@/lib/sui/time-auction';
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });

const isInControl = await hasControl(client, slotId, userAddress);

if (isInControl) {
  // Grant access to LiveKit room
  // Enable camera feed
  // Allow instruction sending
}
```

### Example: Query Active Auctions

```typescript
import { queryTimeSlots, mistToSui } from '@/lib/sui/time-auction';

const slots = await queryTimeSlots(client);

slots.forEach(slot => {
  console.log(`Slot starts: ${new Date(Number(slot.startTime))}`);
  console.log(`Current bid: ${mistToSui(slot.currentBid)} SUI`);
  console.log(`Auction ends: ${new Date(Number(slot.auctionEnd))}`);
});
```

### Example: Subscribe to Bids

```typescript
import { subscribeToBids, mistToSui } from '@/lib/sui/time-auction';

const unsubscribe = await subscribeToBids(
  client,
  slotId,
  (event) => {
    console.log(`New bid: ${mistToSui(event.amount)} SUI from ${event.bidder}`);
    // Update UI with new highest bid
  }
);

// Clean up subscription
unsubscribe();
```

## Integration Patterns

### With LiveKit (Surveillance/Control)

```typescript
import { hasControl } from '@/lib/sui/time-auction';
import { AccessToken } from 'livekit-server-sdk';

// API route: /api/livekit-token
export async function POST(req: Request) {
  const { slotId, participantAddress } = await req.json();

  // Check blockchain control
  const isController = await hasControl(client, slotId, participantAddress);

  if (!isController) {
    return Response.json({ error: 'Not in control' }, { status: 403 });
  }

  // Grant LiveKit access
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_SECRET_KEY,
    {
      identity: participantAddress,
      metadata: JSON.stringify({ slotId, role: 'controller' })
    }
  );

  token.addGrant({
    roomJoin: true,
    room: slotId,
    canPublish: false,
    canSubscribe: true, // Can watch video
  });

  return Response.json({ token: await token.toJwt() });
}
```

### Recurring Slot Generation

```typescript
// Generate slots for next 24 hours in 15-min increments
async function generateDailySlots(ownerCapId: string) {
  const now = Date.now();
  const oneDayFromNow = now + 86400000;
  const slots = [];

  for (let time = now; time < oneDayFromNow; time += 900000) {
    const tx = createTimeSlotTx(
      ownerCapId,
      time,
      suiToMist(1), // 1 SUI minimum
      3600000 // 1 hour auction before slot
    );

    slots.push(tx);
  }

  // Batch execute (use PTB)
  return slots;
}
```

## Security Considerations

1. **Time Owner Authentication**: Only `TimeOwnerCap` holders can create slots
2. **Automatic Refunds**: Outbid participants get immediate refunds
3. **Time-Based Access**: `has_control()` enforces slot boundaries
4. **Shared Object Consensus**: All bids require Sui consensus
5. **Escrow Safety**: Funds locked in contract until auction ends

## Gas Estimates (Testnet)

- Create Time Slot: ~0.01 SUI
- Place Bid: ~0.005 SUI
- End Auction: ~0.005 SUI
- Set Instructions: ~0.003 SUI

## Testing

Run the comprehensive test suite:

```bash
sui move test
```

Tests cover:
- ✅ Slot creation
- ✅ Bidding mechanics
- ✅ Outbidding & refunds
- ✅ Auction finalization
- ✅ Winner instructions
- ✅ Time-based control checks
- ✅ Error cases (low bids, expired auctions)

## Dystopian Use Case

This contract is designed as **social commentary** on labor commodification. Integration ideas:

- **Live streaming** where winners watch you work
- **Task assignment** via blockchain instructions
- **Real-time control** of your schedule
- **Bid wars** for your time during peak hours
- **NFT receipts** of completed time slots

The goal is to make the commodification of human time **viscerally uncomfortable** through technological realization.

## License

MIT (but please use responsibly and consider the ethical implications)
