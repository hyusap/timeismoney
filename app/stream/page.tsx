"use client";

import { TokenContext } from "../components/token-context";
import { LiveKitRoom, useLocalParticipant } from "@livekit/components-react";
import { createLocalTracks, Track } from "livekit-client";
import { useEffect, useState, useRef } from "react";
import { VLMMonitor } from "../components/vlm-monitor";
import { InstructionsOverlay } from "../components/instructions-overlay";
import { DebugOverlay } from "../components/debug-overlay";
import { NFTAuctionSidebar } from "../components/nft-auction-sidebar";
import {
  ConnectButton,
  useCurrentAccount,
  useSuiClient,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import {
  queryTimeSlotsByOwner,
  PACKAGE_ID,
  CLOCK_OBJECT_ID,
} from "@/lib/sui/time-auction";
import { Transaction } from "@mysten/sui/transactions";

interface TimeSlotMonitorResponse {
  hasActiveSlot: boolean;
  instructions: string | null;
  winner: string | null;
  slotStartTime: number | null;
  slotEndTime: number | null;
  currentTime: number;
}

export default function StreamPage() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [roomName, setRoomName] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingStarted = useRef(false);

  // Pre-stream NFT minting flow
  const [hasMinedNFTs, setHasMintedNFTs] = useState(false);
  const [isCheckingNFTs, setIsCheckingNFTs] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [nftCount, setNftCount] = useState(0);
  const [streamDurationHours, setStreamDurationHours] = useState(4);

  // Time slot monitoring
  const [currentInstructions, setCurrentInstructions] = useState<string | null>(
    null
  );
  const [currentWinner, setCurrentWinner] = useState<string | null>(null);
  const [slotEndTime, setSlotEndTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const walletAddress = account?.address || null;
  const isConnected = !!account;

  const checkForNFTs = async (retryCount = 0): Promise<boolean> => {
    if (!isConnected || !walletAddress) {
      return false;
    }

    setIsCheckingNFTs(true);

    try {
      const slots = await queryTimeSlotsByOwner(client, walletAddress);

      // Filter for upcoming/future slots (not completed)
      const now = Date.now();

      console.log("🔍 [NFT CHECK] Total slots:", slots.length);
      console.log("🔍 [NFT CHECK] Current time:", new Date(now).toISOString());

      const upcomingSlots = slots.filter((slot) => {
        const startTime = Number(slot.startTime);
        const endTime = startTime + Number(slot.durationMs);
        const hasStarted = startTime <= now;
        const hasEnded = endTime <= now;

        console.log(
          `  Slot: ${new Date(startTime).toISOString()} - ${new Date(
            endTime
          ).toISOString()} | Started: ${hasStarted} | Ended: ${hasEnded}`
        );

        // Only count slots that haven't started yet (truly upcoming)
        return startTime > now;
      });

      console.log("🔍 [NFT CHECK] Upcoming slots:", upcomingSlots.length);

      setNftCount(upcomingSlots.length);

      if (upcomingSlots.length > 0) {
        setHasMintedNFTs(true);
        setIsCheckingNFTs(false);
        return true;
      } else {
        setHasMintedNFTs(false);
        setIsCheckingNFTs(false);
        return false;
      }
    } catch (error) {
      console.error("Error checking NFTs:", error);
      setHasMintedNFTs(false);
      setNftCount(0);
      setIsCheckingNFTs(false);
      return false;
    }
  };

  const checkForNFTsWithRetry = async (): Promise<boolean> => {
    const MAX_RETRIES = 10;
    const INITIAL_DELAY = 1000; // Start with 1 second

    for (let i = 0; i < MAX_RETRIES; i++) {
      console.log(`🔄 Checking for NFTs (attempt ${i + 1}/${MAX_RETRIES})...`);

      const found = await checkForNFTs();

      if (found) {
        console.log("✅ NFTs found!");
        return true;
      }

      if (i < MAX_RETRIES - 1) {
        // Exponential backoff: 1s, 2s, 4s, 8s, then cap at 8s
        const delay = Math.min(INITIAL_DELAY * Math.pow(2, i), 8000);
        console.log(
          `⏳ NFTs not found yet, waiting ${delay}ms before retry...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    console.error("❌ Failed to find NFTs after all retries");
    return false;
  };

  // Check for NFTs when wallet connects and auto-start stream if found
  useEffect(() => {
    if (isConnected && walletAddress) {
      checkForNFTs().then((found) => {
        if (found) {
          // Auto-start stream if NFTs are found
          connectToRoom();
        }
      });
    } else {
      setHasMintedNFTs(false);
      setNftCount(0);
    }
  }, [isConnected, walletAddress]);

  const mintNFTsAndStartStream = async () => {
    if (!account || !walletAddress) {
      alert("Please connect your wallet");
      return;
    }

    setIsMinting(true);

    try {
      const SLOT_DURATION_MS = 60 * 1000; // 1 minute for testing
      const MIN_BID_DOLLARS = 1.0; // $1.00 in UI = 10,000 MIST on-chain
      const AUCTION_DURATION_HOURS = 24;

      const numSlots = (streamDurationHours * 60) / 1; // 1-minute slots
      const now = Date.now();

      console.log("🕐 MINTING DEBUG:");
      console.log("Current time (Date.now()):", now);
      console.log("Current time (formatted):", new Date(now).toISOString());
      console.log("First slot will start at:", new Date(now).toISOString());

      const auctionDurationMs = AUCTION_DURATION_HOURS * 60 * 60 * 1000;
      const minBidMist = BigInt(Math.floor(MIN_BID_DOLLARS * 10_000)); // Convert UI dollars to MIST

      const tx = new Transaction();

      for (let i = 0; i < numSlots; i++) {
        // Start immediately, no offset
        const slotStartTime = now + i * SLOT_DURATION_MS;

        if (i === 0) {
          console.log("First slot start time:", slotStartTime);
          console.log(
            "First slot formatted:",
            new Date(slotStartTime).toISOString()
          );
        }

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

      console.log("📝 Transaction object:", tx);
      console.log("📝 About to submit transaction...");

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            console.log("✅ Slots created successfully:", result);
            console.log("✅ Transaction digest:", result.digest);

            // Immediately connect to room - NFTs are confirmed by transaction success
            await connectToRoom();
          },
          onError: (error) => {
            console.error("Failed to create slots:", error);
            alert(`Failed to mint NFTs: ${error.message}`);
            setIsMinting(false);
          },
        }
      );
    } catch (error) {
      console.error("Error minting NFTs:", error);
      alert("Failed to mint NFTs");
      setIsMinting(false);
    }
  };

  const connectToRoom = async () => {
    if (!isConnected || !walletAddress) {
      alert("Please connect your wallet first");
      return;
    }

    // Use wallet address as room name and participant name
    const finalRoomName = walletAddress;
    const participantName = walletAddress.slice(0, 8) + "...";
    setRoomName(finalRoomName);

    try {
      const res = await fetch("/api/create_stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_name: finalRoomName,
          metadata: {
            creator_identity: participantName,
            enable_chat: true,
            allow_participation: true,
          },
        }),
      });
      const { auth_token, connection_details } = await res.json();

      setAuthToken(auth_token);
      setRoomToken(connection_details.token);
      setServerUrl(connection_details.ws_url);
    } catch (e) {
      console.error(e);
    }
  };

  // Poll time-slot monitor API when streaming
  useEffect(() => {
    if (!isStreaming || !walletAddress) return;

    const fetchTimeSlot = async () => {
      try {
        const res = await fetch(
          `/api/time-slot-monitor?streamerAddress=${walletAddress}`
        );
        const data: TimeSlotMonitorResponse = await res.json();

        if (data.hasActiveSlot) {
          setCurrentInstructions(data.instructions);
          setCurrentWinner(data.winner);
          setSlotEndTime(data.slotEndTime);
          setCurrentTime(data.currentTime);
        } else {
          setCurrentInstructions(null);
          setCurrentWinner(null);
          setSlotEndTime(null);
        }
      } catch (error) {
        console.error("Failed to fetch time slot:", error);
      }
    };

    // Fetch immediately
    fetchTimeSlot();

    // Poll every 30 seconds
    const interval = setInterval(fetchTimeSlot, 30000);

    return () => clearInterval(interval);
  }, [isStreaming, walletAddress]);

  if (!authToken || !roomToken) {
    return (
      <div className=" bg-black flex items-center justify-center p-6">
        <div className=" max-w-2xl w-full">
          <h1 className="text-4xl font-medium tracking-tight font-cormorant italic text-red-500 mb-2 text-center">
            Start Streaming
          </h1>
          <p className="text-gray-400 text-center mb-8 font-cormorant font-medium italic tracking-tight">
            &quot;Sell your time, live on camera&quot;
          </p>

          {!isConnected ? (
            <div className="space-y-6">
              <div className="text-center text-gray-300 mb-6">
                Connect your Sui wallet to begin
              </div>
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            </div>
          ) : !hasMinedNFTs ? (
            <div className="space-y-6">
              <div className="text-center text-gray-300 mb-2">
                Wallet Connected
              </div>
              <div className="bg-black text-white font-mono text-xs p-3 rounded border border-gray-600 text-center break-all">
                {walletAddress}
              </div>

              {isCheckingNFTs ? (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-3"></div>
                  <p className="text-gray-300">Checking for minted NFTs...</p>
                </div>
              ) : (
                <>
                  <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 text-center">
                    <h3 className="text-red-400 font-bold mb-2">
                      ❌ NO UPCOMING TIME SLOTS
                    </h3>
                    <p className="text-gray-300 text-sm">
                      You have {nftCount} upcoming time slots. Mint new slots to
                      continue streaming.
                    </p>
                  </div>

                  <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4">
                    <h3 className="text-yellow-400 font-bold mb-2">
                      ⚠️ STEP 1: MINT TIME SLOTS
                    </h3>
                    <p className="text-gray-300 text-sm mb-4">
                      Each slot is 15 minutes. Viewers will bid on your time,
                      and the highest bidder controls what you do.
                    </p>

                    <div className="mb-4">
                      <label className="block text-gray-300 mb-2 font-semibold">
                        Stream Duration (hours)
                      </label>
                      <input
                        type="number"
                        value={streamDurationHours}
                        onChange={(e) =>
                          setStreamDurationHours(Number(e.target.value))
                        }
                        min="1"
                        max="12"
                        className="w-full bg-gray-800 text-white border border-gray-700 rounded px-4 py-3 focus:outline-none focus:border-red-500"
                      />
                      <p className="text-gray-500 text-sm mt-1">
                        Will create {streamDurationHours * 60} time slots (1 min
                        each)
                      </p>
                    </div>

                    <div className="bg-red-900/30 border border-red-600 rounded p-3 mb-4">
                      <p className="text-red-300 text-xs">
                        <strong>Warning:</strong> Once minted, these slots will
                        be auctioned immediately. Winners can watch you and give
                        you instructions during their time slot.
                      </p>
                    </div>

                    <button
                      onClick={mintNFTsAndStartStream}
                      disabled={isMinting}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white font-bold py-3 rounded-lg transition duration-200 mb-3"
                    >
                      {isMinting
                        ? "Minting NFTs & Starting Stream..."
                        : "MINT NFTs & START STREAM"}
                    </button>

                    <button
                      onClick={checkForNFTs}
                      disabled={isCheckingNFTs}
                      className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white text-sm font-medium py-2 rounded transition duration-200"
                    >
                      {isCheckingNFTs
                        ? "Checking..."
                        : "🔄 Already Minted? Check Again"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : hasMinedNFTs ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="bg-green-900/30 border border-green-600 rounded-lg p-4 mb-6">
                  <p className="text-green-400 font-bold text-lg">
                    ✅ {nftCount} TIME SLOTS FOUND
                  </p>
                  <p className="text-gray-300 text-sm mt-1">
                    Your time slots are ready for auction
                  </p>
                </div>

                <div className="bg-black text-white font-mono text-xs p-3 rounded border border-gray-600 mb-6 break-all">
                  {walletAddress}
                </div>

                <button
                  onClick={connectToRoom}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg text-xl transition duration-200"
                >
                  🎥 START STREAMING NOW
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <TokenContext.Provider value={authToken}>
      <LiveKitRoom serverUrl={serverUrl} token={roomToken}>
        <div className="w-full h-screen flex">
          {/* Main streaming area */}
          <div className="flex-1 relative overflow-hidden">
            {/* Your address at the very top */}
            <div className="absolute top-0 left-0 right-0 z-50 bg-black/90 border-b border-gray-700 px-4 py-2">
              <div className="text-yellow-400 text-xs font-semibold">
                Your Address:
              </div>
              <div className="text-white text-xs font-mono mt-1">
                {walletAddress?.slice(0, 12)}...{walletAddress?.slice(-8)}
              </div>
            </div>

            {/* Instructions overlay below address bar */}
            <div className="mt-16">
              <InstructionsOverlay
                instructions={currentInstructions}
                winner={currentWinner}
                slotEndTime={slotEndTime}
                currentTime={currentTime}
              />
            </div>

            <StreamingContent
              roomName={roomName}
              isStreaming={isStreaming}
              setIsStreaming={setIsStreaming}
              streamingStarted={streamingStarted}
              walletAddress={walletAddress}
              account={account}
              signAndExecuteTransaction={signAndExecuteTransaction}
              client={client}
            />

            {roomName && (
              <VLMMonitor
                roomName={roomName}
                mainTaskPrompt={
                  currentInstructions ||
                  "Monitor the stream and describe what you see"
                }
                chunkTimeMinutes={1}
              />
            )}

            {/* Debug Overlay */}
            <DebugOverlay
              roomName={roomName}
              currentInstructions={currentInstructions}
              currentWinner={currentWinner}
              slotEndTime={slotEndTime}
              isStreaming={isStreaming}
            />
          </div>

          {/* NFT Auction Sidebar */}
          {walletAddress && (
            <NFTAuctionSidebar streamerAddress={walletAddress} />
          )}
        </div>
      </LiveKitRoom>
    </TokenContext.Provider>
  );
}

function StreamingContent({
  roomName,
  isStreaming,
  setIsStreaming,
  streamingStarted,
  walletAddress,
  account,
  signAndExecuteTransaction,
  client,
}: {
  roomName: string;
  isStreaming: boolean;
  setIsStreaming: (value: boolean) => void;
  streamingStarted: React.MutableRefObject<boolean>;
  walletAddress: string | null;
  account: any;
  signAndExecuteTransaction: any;
  client: any;
}) {
  const { localParticipant } = useLocalParticipant();
  const [orientation, setOrientation] = useState(0);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpHours, setTopUpHours] = useState(1);
  const [isMintingTopUp, setIsMintingTopUp] = useState(false);

  // Device orientation detection
  useEffect(() => {
    const handleOrientationChange = () => {
      if (screen.orientation) {
        setOrientation(screen.orientation.angle);
      } else if (window.orientation !== undefined) {
        setOrientation(window.orientation);
      }
    };

    // Initial orientation
    handleOrientationChange();

    // Listen for orientation changes
    if (screen.orientation) {
      screen.orientation.addEventListener("change", handleOrientationChange);
    } else {
      window.addEventListener("orientationchange", handleOrientationChange);
    }

    return () => {
      if (screen.orientation) {
        screen.orientation.removeEventListener(
          "change",
          handleOrientationChange
        );
      } else {
        window.removeEventListener(
          "orientationchange",
          handleOrientationChange
        );
      }
    };
  }, []);

  useEffect(() => {
    const startStreaming = async () => {
      // Check if tracks from same source are already published
      const existingVideoTracks = Array.from(
        localParticipant.videoTrackPublications.values()
      );
      const existingAudioTracks = Array.from(
        localParticipant.audioTrackPublications.values()
      );

      const hasVideoTrack = existingVideoTracks.some(
        (track) => track.source === Track.Source.Camera
      );
      const hasAudioTrack = existingAudioTracks.some(
        (track) => track.source === Track.Source.Microphone
      );

      if (hasVideoTrack && hasAudioTrack) {
        console.log("Tracks already published, skipping track creation");

        setIsStreaming(true);
        return;
      }

      try {
        streamingStarted.current = true; // Set this BEFORE creating tracks

        const tracks = await createLocalTracks({
          audio: true,
          video: {
            facingMode: "environment" as const, // Prefer back camera
          },
        });

        const camTrack = tracks.find((t) => t.kind === Track.Kind.Video);
        const micTrack = tracks.find((t) => t.kind === Track.Kind.Audio);

        // Only publish tracks if they don't already exist from the same source
        if (camTrack && !hasVideoTrack) {
          console.log("Publishing new video track");
          await localParticipant.publishTrack(camTrack);
        }
        if (micTrack && !hasAudioTrack) {
          console.log("Publishing new audio track");
          await localParticipant.publishTrack(micTrack);
        }

        setIsStreaming(true);
      } catch (error) {
        console.error("Error starting stream:", error);
        streamingStarted.current = false; // Reset on error
      }
    };

    if (localParticipant && !streamingStarted.current) {
      startStreaming();
    }
  }, [localParticipant, streamingStarted, setIsStreaming]);

  // Top-up minting function
  const mintTopUpSlots = async () => {
    if (!account || !walletAddress) {
      alert("Wallet not connected");
      return;
    }

    setIsMintingTopUp(true);

    try {
      const SLOT_DURATION_MS = 60 * 1000; // 1 minute for testing
      const MIN_BID_DOLLARS = 1.0; // $1.00 in UI = 10,000 MIST on-chain
      const AUCTION_DURATION_HOURS = 24;

      const numSlots = (topUpHours * 60) / 1; // 1-minute slots

      // Find the latest existing slot end time to avoid overlaps
      const existingSlots = await queryTimeSlotsByOwner(client, walletAddress);
      let startFromTime = Date.now();

      if (existingSlots.length > 0) {
        // Find the slot with the latest end time
        const latestSlot = existingSlots.reduce((latest, slot) => {
          const slotEnd = Number(slot.startTime) + Number(slot.durationMs);
          const latestEnd =
            Number(latest.startTime) + Number(latest.durationMs);
          return slotEnd > latestEnd ? slot : latest;
        });

        const latestEndTime =
          Number(latestSlot.startTime) + Number(latestSlot.durationMs);
        startFromTime = Math.max(Date.now(), latestEndTime); // Start from whichever is later
      }

      console.log("🔄 TOP-UP MINTING:");
      console.log(
        "Adding",
        numSlots,
        "new slots starting from",
        new Date(startFromTime).toISOString()
      );

      const auctionDurationMs = AUCTION_DURATION_HOURS * 60 * 60 * 1000;
      const minBidMist = BigInt(Math.floor(MIN_BID_DOLLARS * 10_000));

      const tx = new Transaction();

      for (let i = 0; i < numSlots; i++) {
        const slotStartTime = startFromTime + i * SLOT_DURATION_MS;

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
        { transaction: tx },
        {
          onSuccess: async (result: any) => {
            console.log("✅ Top-up slots created successfully:", result);
            console.log("✅ Transaction digest:", result.digest);
            setShowTopUpModal(false);
            setIsMintingTopUp(false);
            alert(`Successfully added ${numSlots} time slots!`);
          },
          onError: (error: any) => {
            console.error("Failed to create top-up slots:", error);
            alert(`Failed to add slots: ${error.message}`);
            setIsMintingTopUp(false);
          },
        }
      );
    } catch (error) {
      console.error("Error minting top-up slots:", error);
      alert("Failed to add slots");
      setIsMintingTopUp(false);
    }
  };

  // Calculate rotation based on orientation
  const getRotation = () => {
    // 0° = normal, 90° = landscape right, 180° = upside down, 270° = landscape left
    if (orientation === 180) {
      return "rotate-180"; // Upside down
    } else if (orientation === 90) {
      return "rotate-90"; // Landscape right
    } else if (orientation === 270) {
      return "-rotate-90"; // Landscape left
    }
    return ""; // Normal orientation
  };

  return (
    <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
      <div
        className={`text-center text-white transition-transform duration-300 ${getRotation()}`}
      >
        <h1 className="text-2xl font-bold mb-4">Streaming Live</h1>
        <p className="text-gray-300">
          {isStreaming ? "Your stream is now live!" : "Starting stream..."}
        </p>
        <p className="text-gray-400 text-sm mt-2">
          Share this room with viewers:
        </p>
        <div className="bg-black text-white font-mono text-sm p-2 rounded mt-2 border border-gray-600">
          {roomName}
        </div>
        <p className="text-gray-500 text-xs mt-1">
          Orientation: {orientation}°
        </p>

        {/* Top-up button */}
        <button
          onClick={() => setShowTopUpModal(true)}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
        >
          + Add More Time Slots
        </button>
      </div>

      {/* Top-up modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-white mb-4">
              Add More Time Slots
            </h2>
            <p className="text-gray-300 text-sm mb-4">
              Add additional time slots to your stream. Each slot is 1 minute.
            </p>

            <div className="mb-4">
              <label className="block text-gray-300 mb-2 font-semibold">
                Hours to Add
              </label>
              <input
                type="number"
                value={topUpHours}
                onChange={(e) => setTopUpHours(Number(e.target.value))}
                min="1"
                max="12"
                className="w-full bg-gray-900 text-white border border-gray-700 rounded px-4 py-3 focus:outline-none focus:border-blue-500"
              />
              <p className="text-gray-500 text-sm mt-1">
                Will create {topUpHours * 60} new time slots
              </p>
            </div>

            <div className="bg-blue-900/30 border border-blue-600 rounded p-3 mb-4">
              <p className="text-blue-300 text-xs">
                <strong>Note:</strong> New slots will be added starting from now
                and will appear in your auction sidebar immediately after
                minting.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={mintTopUpSlots}
                disabled={isMintingTopUp}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-bold py-3 rounded transition duration-200"
              >
                {isMintingTopUp ? "Minting..." : "Mint Slots"}
              </button>
              <button
                onClick={() => setShowTopUpModal(false)}
                disabled={isMintingTopUp}
                className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-bold py-3 rounded transition duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
