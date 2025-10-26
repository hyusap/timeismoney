#[test_only]
module time_auction::time_slot_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::test_utils;
    use time_auction::time_slot::{Self, TimeSlot};

    const OWNER: address = @0xA;
    const BIDDER1: address = @0xB;
    const BIDDER2: address = @0xC;

    const MIN_BID: u64 = 1000000; // 1 SUI
    const AUCTION_DURATION: u64 = 3600000; // 1 hour
    const SLOT_START: u64 = 1000000000; // Future timestamp

    // Helper to create a test clock
    fun setup_clock(scenario: &mut Scenario): Clock {
        let clock = clock::create_for_testing(ts::ctx(scenario));
        clock
    }

    #[test]
    fun test_create_time_slot() {
        let mut scenario = ts::begin(OWNER);
        let clock = setup_clock(&mut scenario);

        ts::next_tx(&mut scenario, OWNER);
        {
            time_slot::test_init(ts::ctx(&mut scenario));
        };

        // Create a time slot
        ts::next_tx(&mut scenario, OWNER);
        {
            
            time_slot::create_time_slot(
                
                SLOT_START,
                MIN_BID,
                AUCTION_DURATION,
                &clock,
                ts::ctx(&mut scenario)
            );
            
        };

        // Verify slot was created and shared
        ts::next_tx(&mut scenario, BIDDER1);
        {
            let slot = ts::take_shared<TimeSlot>(&scenario);
            let (start, duration, bidder, bid, _auction_end, claimed) =
                time_slot::get_slot_info(&slot);

            assert!(start == SLOT_START, 0);
            assert!(duration == 900000, 1); // 15 mins
            assert!(option::is_none(&bidder), 2);
            assert!(bid == 0, 3);
            assert!(!claimed, 4);

            ts::return_shared(slot);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_place_bid() {
        let mut scenario = ts::begin(OWNER);
        let clock = setup_clock(&mut scenario);

        // Init and create slot
        ts::next_tx(&mut scenario, OWNER);
        {
            time_slot::test_init(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, OWNER);
        {
            
            time_slot::create_time_slot(
                
                SLOT_START,
                MIN_BID,
                AUCTION_DURATION,
                &clock,
                ts::ctx(&mut scenario)
            );
            
        };

        // Place a bid
        ts::next_tx(&mut scenario, BIDDER1);
        {
            let mut slot = ts::take_shared<TimeSlot>(&scenario);
            let bid_coin = coin::mint_for_testing<SUI>(MIN_BID, ts::ctx(&mut scenario));

            time_slot::place_bid(
                &mut slot,
                bid_coin,
                &clock,
                ts::ctx(&mut scenario)
            );

            let (_, _, bidder, bid, _, _) = time_slot::get_slot_info(&slot);
            assert!(option::is_some(&bidder), 0);
            assert!(*option::borrow(&bidder) == BIDDER1, 1);
            assert!(bid == MIN_BID, 2);

            ts::return_shared(slot);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_outbid() {
        let mut scenario = ts::begin(OWNER);
        let clock = setup_clock(&mut scenario);

        // Init and create slot
        ts::next_tx(&mut scenario, OWNER);
        {
            time_slot::test_init(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, OWNER);
        {
            
            time_slot::create_time_slot(
                
                SLOT_START,
                MIN_BID,
                AUCTION_DURATION,
                &clock,
                ts::ctx(&mut scenario)
            );
            
        };

        // BIDDER1 places first bid
        ts::next_tx(&mut scenario, BIDDER1);
        {
            let mut slot = ts::take_shared<TimeSlot>(&scenario);
            let bid_coin = coin::mint_for_testing<SUI>(MIN_BID, ts::ctx(&mut scenario));

            time_slot::place_bid(&mut slot, bid_coin, &clock, ts::ctx(&mut scenario));
            ts::return_shared(slot);
        };

        // BIDDER2 outbids BIDDER1
        ts::next_tx(&mut scenario, BIDDER2);
        {
            let mut slot = ts::take_shared<TimeSlot>(&scenario);
            let higher_bid = MIN_BID + 500000;
            let bid_coin = coin::mint_for_testing<SUI>(higher_bid, ts::ctx(&mut scenario));

            time_slot::place_bid(&mut slot, bid_coin, &clock, ts::ctx(&mut scenario));

            let (_, _, bidder, bid, _, _) = time_slot::get_slot_info(&slot);
            assert!(*option::borrow(&bidder) == BIDDER2, 0);
            assert!(bid == higher_bid, 1);

            ts::return_shared(slot);
        };

        // BIDDER1 should have received refund
        ts::next_tx(&mut scenario, BIDDER1);
        {
            let refund = ts::take_from_sender<Coin<SUI>>(&scenario);
            assert!(coin::value(&refund) == MIN_BID, 0);
            test_utils::destroy(refund);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_end_auction_and_pay_owner() {
        let mut scenario = ts::begin(OWNER);
        let mut clock = setup_clock(&mut scenario);

        // Init and create slot
        ts::next_tx(&mut scenario, OWNER);
        {
            time_slot::test_init(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, OWNER);
        {
            
            time_slot::create_time_slot(
                
                SLOT_START,
                MIN_BID,
                AUCTION_DURATION,
                &clock,
                ts::ctx(&mut scenario)
            );
            
        };

        // Place bid
        ts::next_tx(&mut scenario, BIDDER1);
        {
            let mut slot = ts::take_shared<TimeSlot>(&scenario);
            let bid_coin = coin::mint_for_testing<SUI>(MIN_BID, ts::ctx(&mut scenario));
            time_slot::place_bid(&mut slot, bid_coin, &clock, ts::ctx(&mut scenario));
            ts::return_shared(slot);
        };

        // Advance time past auction end
        clock::increment_for_testing(&mut clock, AUCTION_DURATION + 1);

        // End auction
        ts::next_tx(&mut scenario, BIDDER2); // Anyone can call
        {
            let mut slot = ts::take_shared<TimeSlot>(&scenario);
            time_slot::end_auction(&mut slot, &clock, ts::ctx(&mut scenario));
            ts::return_shared(slot);
        };

        // Owner should receive payment
        ts::next_tx(&mut scenario, OWNER);
        {
            let payment = ts::take_from_sender<Coin<SUI>>(&scenario);
            assert!(coin::value(&payment) == MIN_BID, 0);
            test_utils::destroy(payment);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_winner_can_set_instructions() {
        let mut scenario = ts::begin(OWNER);
        let mut clock = setup_clock(&mut scenario);

        // Init and create slot
        ts::next_tx(&mut scenario, OWNER);
        {
            time_slot::test_init(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, OWNER);
        {
            
            time_slot::create_time_slot(
                
                SLOT_START,
                MIN_BID,
                AUCTION_DURATION,
                &clock,
                ts::ctx(&mut scenario)
            );
            
        };

        // Place bid
        ts::next_tx(&mut scenario, BIDDER1);
        {
            let mut slot = ts::take_shared<TimeSlot>(&scenario);
            let bid_coin = coin::mint_for_testing<SUI>(MIN_BID, ts::ctx(&mut scenario));
            time_slot::place_bid(&mut slot, bid_coin, &clock, ts::ctx(&mut scenario));
            ts::return_shared(slot);
        };

        // Advance time past auction end
        clock::increment_for_testing(&mut clock, AUCTION_DURATION + 1);

        // Winner sets instructions
        ts::next_tx(&mut scenario, BIDDER1);
        {
            let mut slot = ts::take_shared<TimeSlot>(&scenario);
            let instructions = b"Dance for me!";
            time_slot::set_instructions(&mut slot, instructions, &clock, ts::ctx(&mut scenario));

            let inst = time_slot::get_instructions(&slot);
            assert!(option::is_some(inst), 0);

            ts::return_shared(slot);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_has_control_during_time_slot() {
        let mut scenario = ts::begin(OWNER);
        let mut clock = setup_clock(&mut scenario);

        // Init and create slot
        ts::next_tx(&mut scenario, OWNER);
        {
            time_slot::test_init(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, OWNER);
        {
            
            time_slot::create_time_slot(
                
                SLOT_START,
                MIN_BID,
                AUCTION_DURATION,
                &clock,
                ts::ctx(&mut scenario)
            );
            
        };

        // Place bid
        ts::next_tx(&mut scenario, BIDDER1);
        {
            let mut slot = ts::take_shared<TimeSlot>(&scenario);
            let bid_coin = coin::mint_for_testing<SUI>(MIN_BID, ts::ctx(&mut scenario));
            time_slot::place_bid(&mut slot, bid_coin, &clock, ts::ctx(&mut scenario));
            ts::return_shared(slot);
        };

        // Advance past auction end to slot start time
        clock::set_for_testing(&mut clock, SLOT_START + 100); // During slot

        // Check winner has control
        ts::next_tx(&mut scenario, BIDDER1);
        {
            let slot = ts::take_shared<TimeSlot>(&scenario);
            assert!(time_slot::has_control(&slot, BIDDER1, &clock), 0);
            assert!(!time_slot::has_control(&slot, BIDDER2, &clock), 1);
            ts::return_shared(slot);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = time_slot::EBidTooLow)]
    fun test_bid_too_low_fails() {
        let mut scenario = ts::begin(OWNER);
        let clock = setup_clock(&mut scenario);

        // Init and create slot
        ts::next_tx(&mut scenario, OWNER);
        {
            time_slot::test_init(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, OWNER);
        {
            
            time_slot::create_time_slot(
                
                SLOT_START,
                MIN_BID,
                AUCTION_DURATION,
                &clock,
                ts::ctx(&mut scenario)
            );
            
        };

        // Try to bid below minimum
        ts::next_tx(&mut scenario, BIDDER1);
        {
            let mut slot = ts::take_shared<TimeSlot>(&scenario);
            let bid_coin = coin::mint_for_testing<SUI>(MIN_BID - 1, ts::ctx(&mut scenario));

            time_slot::place_bid(&mut slot, bid_coin, &clock, ts::ctx(&mut scenario));
            ts::return_shared(slot);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = time_slot::EAuctionEnded)]
    fun test_bid_after_auction_ends_fails() {
        let mut scenario = ts::begin(OWNER);
        let mut clock = setup_clock(&mut scenario);

        // Init and create slot
        ts::next_tx(&mut scenario, OWNER);
        {
            time_slot::test_init(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, OWNER);
        {
            
            time_slot::create_time_slot(
                
                SLOT_START,
                MIN_BID,
                AUCTION_DURATION,
                &clock,
                ts::ctx(&mut scenario)
            );
            
        };

        // Advance past auction end
        clock::increment_for_testing(&mut clock, AUCTION_DURATION + 1);

        // Try to bid after auction ended
        ts::next_tx(&mut scenario, BIDDER1);
        {
            let mut slot = ts::take_shared<TimeSlot>(&scenario);
            let bid_coin = coin::mint_for_testing<SUI>(MIN_BID, ts::ctx(&mut scenario));

            time_slot::place_bid(&mut slot, bid_coin, &clock, ts::ctx(&mut scenario));
            ts::return_shared(slot);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }
}
