"use client";

import { StreamPlayerAdmin } from "../../components/stream-player-admin";
import { TokenContext } from "../../components/token-context";
import { LiveKitRoom } from "@livekit/components-react";
import { useState, useEffect, use } from "react";

interface AdminViewerPageProps {
  params: Promise<{
    roomname: string;
  }>;
}

export default function AdminViewerPage({ params }: AdminViewerPageProps) {
  const [roomName, setRoomName] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");

  const resolvedParams = use(params);

  useEffect(() => {
    if (resolvedParams.roomname) {
      setRoomName(decodeURIComponent(resolvedParams.roomname));
    }
  }, [resolvedParams.roomname]);

  const connectToRoom = async () => {
    if (!roomName.trim()) {
      alert("Please enter a room name");
      return;
    }

    try {
      const res = await fetch("/api/create_stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_name: roomName,
          metadata: {
            creator_identity: "admin-viewer",
            enable_chat: true,
            allow_participation: false,
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

  useEffect(() => {
    if (roomName && !authToken) {
      connectToRoom();
    }
  }, [roomName, authToken]);

  if (!roomName) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading room...</div>
      </div>
    );
  }

  if (!authToken || !roomToken) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">
            Admin Viewer
          </h1>
          <div className="text-center">
            <div className="text-gray-300 mb-4">
              Connecting to room:{" "}
              <span className="font-semibold text-white">{roomName}</span>
            </div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TokenContext.Provider value={authToken}>
      <LiveKitRoom serverUrl={serverUrl} token={roomToken}>
        <div className="w-full h-screen">
          <StreamPlayerAdmin />
        </div>
      </LiveKitRoom>
    </TokenContext.Provider>
  );
}
