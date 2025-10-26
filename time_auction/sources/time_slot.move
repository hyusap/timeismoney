module time_auction::time_slot {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock};

    // ====== Error Codes ======
    const EAuctionEnded: u64 = 1;
    const EBidTooLow: u64 = 2;
    const ENotWinner: u64 = 3;
    const ESlotNotActive: u64 = 5;
    const EAuctionNotEnded: u64 = 6;

    // ====== Constants ======
    const SLOT_DURATION_MS: u64 = 60000; // 1 minute in milliseconds (for testing)

    // ====== Structs ======

    /// Represents a 1-minute time slot that can be auctioned
    public struct TimeSlot has key, store {
        id: UID,
        /// Unix timestamp (ms) when this slot starts
        start_time: u64,
        /// Duration in milliseconds (always 1 min for testing)
        duration_ms: u64,
        /// Address of the person selling their time
        time_owner: address,
        /// Current highest bidder (if any)
        current_bidder: Option<address>,
        /// Current highest bid amount
        current_bid: u64,
        /// Minimum bid to start auction
        min_bid: u64,
        /// When the auction ends (timestamp ms)
        auction_end: u64,
        /// Escrowed funds from current highest bid
        escrow: Balance<SUI>,
        /// Instructions from winner (set after auction ends)
        instructions: Option<vector<u8>>,
        /// Whether the slot has been claimed by winner
        claimed: bool,
    }

    // ====== Events ======

    public struct SlotCreated has copy, drop {
        slot_id: ID,
        time_owner: address,
        start_time: u64,
        min_bid: u64,
        auction_end: u64,
    }

    public struct BidPlaced has copy, drop {
        slot_id: ID,
        bidder: address,
        amount: u64,
        timestamp: u64,
    }

    public struct AuctionEnded has copy, drop {
        slot_id: ID,
        winner: address,
        final_bid: u64,
    }

    public struct SlotClaimed has copy, drop {
        slot_id: ID,
        winner: address,
    }

    // ====== Initialization ======

    /// Module initializer - no special initialization needed
    fun init(_ctx: &mut TxContext) {
        // Pure permissionless system - no caps needed
    }

    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init(ctx);
    }

    // ====== Core Functions ======

    /// Create a new time slot auction
    /// ANYONE can create slots - no cap required (pure dystopia)
    /// Auction ends when the slot starts (can't bid after time begins)
    public fun create_time_slot(
        start_time: u64,
        min_bid: u64,
        _auction_duration_ms: u64, // Ignored - auction always ends at start_time
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let slot_id = object::new(ctx);
        let _current_time = clock::timestamp_ms(clock);

        let slot = TimeSlot {
            id: slot_id,
            start_time,
            duration_ms: SLOT_DURATION_MS,
            time_owner: ctx.sender(),
            current_bidder: option::none(),
            current_bid: 0,
            min_bid,
            auction_end: start_time, // Auction ends when slot starts
            escrow: balance::zero(),
            instructions: option::none(),
            claimed: false,
        };

        let slot_id_copy = object::uid_to_inner(&slot.id);

        sui::event::emit(SlotCreated {
            slot_id: slot_id_copy,
            time_owner: ctx.sender(),
            start_time,
            min_bid,
            auction_end: slot.auction_end,
        });

        // Share the object so anyone can bid
        transfer::share_object(slot);
    }


    /// Place a bid on a time slot
    public fun place_bid(
        slot: &mut TimeSlot,
        bid_coin: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);

        // Check auction is still active
        assert!(current_time < slot.auction_end, EAuctionEnded);

        let bid_amount = coin::value(&bid_coin);

        // Check bid is higher than current bid or min bid
        let required_bid = if (slot.current_bid == 0) {
            slot.min_bid
        } else {
            slot.current_bid + 1 // Must be at least 1 higher
        };

        assert!(bid_amount >= required_bid, EBidTooLow);

        // Return previous bidder's funds if exists
        if (option::is_some(&slot.current_bidder)) {
            let previous_bid_value = balance::value(&slot.escrow);
            let previous_bid_coin = coin::from_balance(
                balance::split(&mut slot.escrow, previous_bid_value),
                ctx
            );
            transfer::public_transfer(
                previous_bid_coin,
                *option::borrow(&slot.current_bidder)
            );
        };

        // Update slot with new bid
        slot.current_bidder = option::some(ctx.sender());
        slot.current_bid = bid_amount;
        balance::join(&mut slot.escrow, coin::into_balance(bid_coin));

        sui::event::emit(BidPlaced {
            slot_id: object::uid_to_inner(&slot.id),
            bidder: ctx.sender(),
            amount: bid_amount,
            timestamp: current_time,
        });
    }

    /// End the auction and finalize the winner
    /// Anyone can call this after auction_end time
    public fun end_auction(
        slot: &mut TimeSlot,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);

        // Check auction has ended
        assert!(current_time >= slot.auction_end, EAuctionNotEnded);

        // Check it hasn't been finalized already
        assert!(!slot.claimed, ESlotNotActive);

        // If there's a winner, transfer funds to time owner
        if (option::is_some(&slot.current_bidder)) {
            let payment_value = balance::value(&slot.escrow);
            let payment = coin::from_balance(
                balance::split(&mut slot.escrow, payment_value),
                ctx
            );
            transfer::public_transfer(payment, slot.time_owner);

            sui::event::emit(AuctionEnded {
                slot_id: object::uid_to_inner(&slot.id),
                winner: *option::borrow(&slot.current_bidder),
                final_bid: slot.current_bid,
            });
        };
    }

    /// Winner sets instructions for their time slot
    public fun set_instructions(
        slot: &mut TimeSlot,
        instructions: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);

        // Check auction has ended
        assert!(current_time >= slot.auction_end, EAuctionNotEnded);

        // Check caller is the winner
        assert!(option::is_some(&slot.current_bidder), ENotWinner);
        assert!(*option::borrow(&slot.current_bidder) == ctx.sender(), ENotWinner);

        slot.instructions = option::some(instructions);
    }

    /// Mark slot as claimed (called when time slot is being used)
    public fun claim_slot(
        slot: &mut TimeSlot,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);

        // Check auction has ended
        assert!(current_time >= slot.auction_end, EAuctionNotEnded);

        // Check caller is the winner
        assert!(option::is_some(&slot.current_bidder), ENotWinner);
        let winner = *option::borrow(&slot.current_bidder);
        assert!(winner == ctx.sender(), ENotWinner);

        // Check we're within the time slot window
        assert!(
            current_time >= slot.start_time &&
            current_time < slot.start_time + slot.duration_ms,
            ESlotNotActive
        );

        slot.claimed = true;

        sui::event::emit(SlotClaimed {
            slot_id: object::uid_to_inner(&slot.id),
            winner,
        });
    }

    // ====== View Functions ======

    /// Check if caller has control over the time slot right now
    public fun has_control(slot: &TimeSlot, caller: address, clock: &Clock): bool {
        let current_time = clock::timestamp_ms(clock);

        // Must be within the time slot window
        if (current_time < slot.start_time ||
            current_time >= slot.start_time + slot.duration_ms) {
            return false
        };

        // Must be the winner and auction must have ended
        if (option::is_none(&slot.current_bidder)) {
            return false
        };

        let winner = *option::borrow(&slot.current_bidder);
        let auction_ended = current_time >= slot.auction_end;

        winner == caller && auction_ended
    }

    /// Get slot details
    public fun get_slot_info(slot: &TimeSlot): (u64, u64, Option<address>, u64, u64, bool) {
        (
            slot.start_time,
            slot.duration_ms,
            slot.current_bidder,
            slot.current_bid,
            slot.auction_end,
            slot.claimed
        )
    }

    /// Get instructions if they exist
    public fun get_instructions(slot: &TimeSlot): &Option<vector<u8>> {
        &slot.instructions
    }

}
