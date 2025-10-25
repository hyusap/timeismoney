"use client";

import { StreamPlayer } from "../components/stream-player";
import { TokenContext } from "../components/token-context";
import { LiveKitRoom } from "@livekit/components-react";
import { useState } from "react";

export default function ViewerPage() {
  const [roomName, setRoomName] = useState("main-room");
  const [authToken, setAuthToken] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");

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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">
            Watch Streams
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
                placeholder="Room name"
              />
            </div>
            <button
              onClick={connectToRoom}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
            >
              Watch Stream
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
