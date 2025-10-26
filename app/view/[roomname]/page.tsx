"use client";

import { StreamPlayer } from "../../components/stream-player";
import { TokenContext } from "../../components/token-context";
import { NFTAuctionSidebar } from "../../components/nft-auction-sidebar";
import { DebugOverlay } from "../../components/debug-overlay";
import { UserHistoryModal } from "../../components/user-history-modal";
import { LiveKitRoom } from "@livekit/components-react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useState, useEffect, use } from "react";

interface ViewerPageProps {
  params: Promise<{
    roomname: string;
  }>;
}

export default function ViewerPage({ params }: ViewerPageProps) {
  const account = useCurrentAccount();
  const [roomName, setRoomName] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const viewerAddress = account?.address || null;

  // Unwrap the params Promise
  const resolvedParams = use(params);

  // Set room name from URL parameter
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

  // Auto-connect when room name is available
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
            Joining Stream
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
        <div className="w-full h-screen flex">
          {/* Main video area */}
          <div className="flex-1 relative">
            <StreamPlayer viewerAddress={viewerAddress} />

            {/* History Search Button - Floating over video */}
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="absolute top-4 right-4 flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition shadow-lg z-10"
              title="Search User History"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <span className="font-mono font-bold text-sm">HISTORY</span>
            </button>
          </div>

          {/* NFT Auction Sidebar */}
          <NFTAuctionSidebar streamerAddress={roomName} viewerMode={true} />
        </div>

        {/* Debug Overlay */}
        <DebugOverlay roomName={roomName} />

        {/* User History Modal - searches the streamer's history */}
        <UserHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          walletAddress={roomName}
        />
      </LiveKitRoom>
    </TokenContext.Provider>
  );
}
