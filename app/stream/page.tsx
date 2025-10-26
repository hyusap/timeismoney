"use client";

import { TokenContext } from "../components/token-context";
import { LiveKitRoom, useLocalParticipant } from "@livekit/components-react";
import { createLocalTracks, Track } from "livekit-client";
import { useEffect, useState, useRef } from "react";
import { VLMMonitor } from "../components/vlm-monitor";

// Mock wallet connection - replace with your actual wallet integration
const useWallet = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connectWallet = async () => {
    // Mock wallet connection - replace with actual wallet logic
    // For now, we'll simulate a wallet connection
    const mockAddress = "0x" + Math.random().toString(16).substr(2, 40);
    setWalletAddress(mockAddress);
    setIsConnected(true);
    console.log("Mock wallet connected:", mockAddress);
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setIsConnected(false);
  };

  return {
    walletAddress,
    isConnected,
    connectWallet,
    disconnectWallet,
  };
};

export default function StreamPage() {
  const [participantName, setParticipantName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingStarted = useRef(false);

  // Wallet connection
  const { walletAddress, isConnected, connectWallet, disconnectWallet } =
    useWallet();

  // Generate room name - use wallet address if connected, otherwise random UUID
  const generateRoomId = () => {
    if (isConnected && walletAddress) {
      return walletAddress;
    }
    return "room-" + crypto.randomUUID();
  };

  const connectToRoom = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    // Use wallet address as room name and participant name
    const finalRoomName = walletAddress!;
    const participantName = walletAddress!.slice(0, 8) + "..."; // Short version for display
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

  if (!authToken || !roomToken) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-8 text-center">
            Start Streaming
          </h1>

          {!isConnected ? (
            <div className="space-y-4">
              <div className="text-center text-gray-300 mb-6">
                Connect your wallet to start streaming
              </div>
              <button
                onClick={connectWallet}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-md transition duration-200"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center text-gray-300 mb-2">
                Wallet Connected
              </div>
              <div className="bg-black text-white font-mono text-sm p-3 rounded border border-gray-600 text-center">
                {walletAddress}
              </div>
              <button
                onClick={connectToRoom}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition duration-200"
              >
                Start Stream
              </button>
              <button
                onClick={disconnectWallet}
                className="w-full text-gray-400 hover:text-gray-300 text-sm py-2 transition duration-200"
              >
                Disconnect Wallet
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <TokenContext.Provider value={authToken}>
      <LiveKitRoom serverUrl={serverUrl} token={roomToken}>
        <StreamingContent
          roomName={roomName}
          isStreaming={isStreaming}
          setIsStreaming={setIsStreaming}
          streamingStarted={streamingStarted}
        />
        {roomName && <VLMMonitor roomName={roomName} />}
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
  const [orientation, setOrientation] = useState(0);

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
      </div>
    </div>
  );
}
