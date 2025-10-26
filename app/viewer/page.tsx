"use client";

import { StreamPlayer } from "../components/stream-player";
import { TokenContext } from "../components/token-context";
import { LiveKitRoom } from "@livekit/components-react";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ViewerContent() {
  const searchParams = useSearchParams();
  const [roomName, setRoomName] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");

  // Read room name from URL parameter
  useEffect(() => {
    const roomParam = searchParams.get("room");
    if (roomParam) {
      setRoomName(roomParam);
    }
  }, [searchParams]);

  const connectToRoom = async () => {
    try {
      const res = await fetch("/api/join_stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_name: roomName,
          identity: `viewer-${Date.now()}`,
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">
            Join Stream
          </h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Room Name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter room ID (e.g., room-abc123...)"
              />
              <p className="text-xs text-gray-400 mt-1">
                Get the room ID from the streamer
              </p>
            </div>
            <button
              onClick={connectToRoom}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
            >
              Join Stream
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TokenContext.Provider value={authToken}>
      <LiveKitRoom serverUrl={serverUrl} token={roomToken}>
        <div className="w-full h-screen">
          <StreamPlayer />
        </div>
      </LiveKitRoom>
    </TokenContext.Provider>
  );
}

export default function ViewerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <ViewerContent />
    </Suspense>
  );
}
