"use client";

import { TokenContext } from "../components/token-context";
import { LiveKitRoom, useLocalParticipant } from "@livekit/components-react";
import { createLocalTracks, Track } from "livekit-client";
import { useEffect, useState, useRef } from "react";

export default function StreamPage() {
  const [participantName, setParticipantName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingStarted = useRef(false);

  // Generate a random UUID for room name
  const generateRoomId = () => {
    return "room-" + crypto.randomUUID();
  };

  const connectToRoom = async () => {
    if (!participantName.trim()) {
      alert("Please enter your name");
      return;
    }

    // Generate room ID if not provided
    const finalRoomName = roomName.trim() || generateRoomId();
    setRoomName(finalRoomName);

    try {
      const res = await fetch("/api/create_stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_name: finalRoomName,
          metadata: {
            creator_identity: participantName.trim(),
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
          <h1 className="text-2xl font-bold text-white mb-6 text-center">
            Streaming Setup
          </h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Room Name (Optional)
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Leave empty for random room ID"
              />
              <p className="text-xs text-gray-400 mt-1">
                If empty, a random room ID will be generated
              </p>
            </div>
            <button
              onClick={connectToRoom}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
            >
              Start Streaming
            </button>
          </div>
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
          Share this room with viewers:{" "}
          <span className="font-mono text-blue-400">{roomName}</span>
        </p>
        <p className="text-gray-500 text-xs mt-1">
          Orientation: {orientation}°
        </p>
      </div>
    </div>
  );
}
