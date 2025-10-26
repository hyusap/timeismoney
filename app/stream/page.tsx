"use client";

import { TokenContext } from "../components/token-context";
import {
  LiveKitRoom,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { createLocalTracks, Track } from "livekit-client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { speakWithDeepgram, speakWithWebSpeech } from "../../lib/deepgram-tts";
import { VLMMonitor } from "../components/vlm-monitor";
import { InstructionsOverlay } from "../components/instructions-overlay";
import { DebugOverlay } from "../components/debug-overlay";
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

  const checkForNFTs = async () => {
    if (!isConnected || !walletAddress) {
      return;
    }

    setIsCheckingNFTs(true);

    try {
      const slots = await queryTimeSlotsByOwner(client, walletAddress);

      // Filter for upcoming/future slots (not completed)
      const now = Date.now();
      const upcomingSlots = slots.filter((slot) => {
        const endTime = Number(slot.startTime) + Number(slot.durationMs);
        return endTime > now; // Slot hasn't ended yet
      });

      setNftCount(upcomingSlots.length);

      if (upcomingSlots.length > 0) {
        setHasMintedNFTs(true);
      } else {
        setHasMintedNFTs(false);
      }
    } catch (error) {
      console.error("Error checking NFTs:", error);
      setHasMintedNFTs(false);
      setNftCount(0);
    } finally {
      setIsCheckingNFTs(false);
    }
  };

  // Check for NFTs when wallet connects
  useEffect(() => {
    if (isConnected && walletAddress) {
      checkForNFTs();
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
      const MIN_BID_DOLLARS = 0.01; // $0.01 in UI = 100 MIST on-chain
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

            // Wait a moment for blockchain to update
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Check for NFTs
            await checkForNFTs();

            // Auto-start stream
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

    if (!hasMinedNFTs) {
      alert("You must mint time slot NFTs first!");
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
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="bg-gray-900 border-2 border-red-600 rounded-lg p-8 max-w-2xl w-full">
          <h1 className="text-4xl font-bold text-red-500 mb-2 text-center">
            START STREAMING
          </h1>
          <p className="text-gray-400 text-center mb-8 italic">
            Sell your time, live on camera
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
                      ❌ NO TIME SLOTS FOUND
                    </h3>
                    <p className="text-gray-300 text-sm">
                      You have {nftCount} upcoming time slots. You must mint
                      NFTs before streaming.
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
          ) : (
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

                <button
                  onClick={checkForNFTs}
                  disabled={isCheckingNFTs}
                  className="w-full mt-2 text-gray-400 hover:text-gray-200 text-sm py-2 transition duration-200"
                >
                  {isCheckingNFTs ? "Checking..." : "🔄 Refresh NFT Count"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <TokenContext.Provider value={authToken}>
      <LiveKitRoom serverUrl={serverUrl} token={roomToken}>
        {/* Instructions overlay at the very top */}
        <InstructionsOverlay
          instructions={currentInstructions}
          winner={currentWinner}
          slotEndTime={slotEndTime}
          currentTime={currentTime}
        />

        <StreamingContent
          roomName={roomName}
          isStreaming={isStreaming}
          setIsStreaming={setIsStreaming}
          streamingStarted={streamingStarted}
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
      </LiveKitRoom>
    </TokenContext.Provider>
  );
}

function StreamingContent({
  roomName,
  isStreaming,
  setIsStreaming,
  streamingStarted,
}: {
  roomName: string;
  isStreaming: boolean;
  setIsStreaming: (value: boolean) => void;
  streamingStarted: React.MutableRefObject<boolean>;
}) {
  const { localParticipant } = useLocalParticipant();
  const roomContext = useRoomContext();
  const [orientation, setOrientation] = useState(0);
  const [receivedMessages, setReceivedMessages] = useState<
    Array<{ message: string; sender: string; timestamp: number }>
  >([]);
  const [showMessages, setShowMessages] = useState(false);
  const [readAloudEnabled, setReadAloudEnabled] = useState(true);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for data channel messages from viewers
  useEffect(() => {
    if (!localParticipant) return;

    const handleDataReceived = (payload: Uint8Array, _kind?: unknown) => {
      try {
        const decoder = new TextDecoder();
        const message = JSON.parse(decoder.decode(payload));

        if (message.type === "admin-message") {
          console.log(
            "📨 Admin message received from viewer:",
            message.message
          );

          // Add to received messages
          setReceivedMessages((prev) => [
            ...prev,
            {
              message: message.message,
              sender: "Viewer",
              timestamp: message.timestamp || Date.now(),
            },
          ]);

          // Read message aloud if enabled
          if (readAloudEnabled) {
            // Try Deepgram first, fallback to Web Speech API
            speakWithDeepgram({ text: message.message }).catch(() => {
              console.log("Deepgram failed, using Web Speech API");
              speakWithWebSpeech(message.message);
            });
          }

          // Auto-hide after 5 seconds
          if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
          }

          setShowMessages(true);
          messageTimeoutRef.current = setTimeout(() => {
            setShowMessages(false);
          }, 5000);
        }
      } catch (error) {
        console.error("Error parsing admin message:", error);
      }
    };

    // Listen on the room object - roomContext IS the room
    if (roomContext) {
      roomContext.on("dataReceived", handleDataReceived);

      return () => {
        roomContext.off("dataReceived", handleDataReceived);
        if (messageTimeoutRef.current) {
          clearTimeout(messageTimeoutRef.current);
        }
      };
    }
  }, [localParticipant, roomContext]);

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
    <div className="w-full h-screen bg-gray-900 flex items-center justify-center relative">
      {/* Admin Messages Display */}
      {showMessages && receivedMessages.length > 0 && (
        <div className="absolute top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-in">
          <div className="bg-blue-600 text-white rounded-lg p-4 shadow-2xl border-2 border-blue-400">
            <div className="flex items-start gap-2">
              <div className="text-2xl">💬</div>
              <div className="flex-1">
                <div className="font-bold text-sm mb-1">
                  Message from Viewer:
                </div>
                <div className="text-base">
                  {receivedMessages[receivedMessages.length - 1].message}
                </div>
              </div>
              <button
                onClick={() => setShowMessages(false)}
                className="text-white hover:text-gray-200 text-xl"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Read Aloud Toggle */}
      <div className="absolute bottom-4 left-4 bg-gray-800/90 rounded-lg p-3 z-50">
        <label className="flex items-center gap-2 text-white cursor-pointer">
          <input
            type="checkbox"
            checked={readAloudEnabled}
            onChange={(e) => setReadAloudEnabled(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">🔊 Read Messages Aloud</span>
        </label>
      </div>

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
        {receivedMessages.length > 0 && (
          <p className="text-green-400 text-xs mt-1">
            {receivedMessages.length} message
            {receivedMessages.length !== 1 ? "s" : ""} received
          </p>
        )}
        <div className="mt-6">
          <Link
            href={`/stream/viewer/${encodeURIComponent(roomName)}`}
            className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition duration-200"
          >
            Open Fullscreen Viewer
          </Link>
        </div>
      </div>
    </div>
  );
}
