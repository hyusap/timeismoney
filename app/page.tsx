"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StreamPreview } from "./components/stream-preview";

import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";

interface ActiveRoom {
  name: string;
  numParticipants: number;
  creationTime: number;
}

export default function Home() {
  const account = useCurrentAccount();
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActiveRooms = async () => {
    try {
      console.log("Fetching active rooms...");
      const response = await fetch("/api/active_rooms");
      console.log("Response status:", response.status);

      if (response.ok) {
        const rooms = await response.json();
        //console.log("Fetched rooms:", rooms);
        setActiveRooms(rooms);
      } else {
        console.error("Failed to fetch rooms, status:", response.status);
      }
    } catch (error) {
      console.error("Failed to fetch active rooms:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveRooms();
    // Refresh every 5 seconds for live updates
    const interval = setInterval(fetchActiveRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Live Streams</h1>
          <p className="text-xl text-gray-300">
            {isLoading
              ? "Loading streams..."
              : `${activeRooms.length} active streams`}
          </p>
          {account && (
            <div className="text-white">
              <p>Connected to {account.address}</p>
            </div>
          )}
          <ConnectButton />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-white text-xl">Loading live streams...</div>
          </div>
        ) : activeRooms.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📺</div>
            <h2 className="text-2xl font-bold text-white mb-4">
              No Live Streams
            </h2>
            <p className="text-gray-300 mb-8">
              Be the first to start streaming!
            </p>
            <Link
              href="/stream"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition duration-200"
            >
              Start Streaming
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeRooms.map((room) => (
              <Link
                key={room.name}
                href={`/view/${encodeURIComponent(room.name)}`}
                className="group bg-gray-800 hover:bg-gray-700 rounded-lg overflow-hidden transition-all duration-200 hover:scale-105"
              >
                <div className="aspect-video bg-gray-700 relative">
                  {/* Actual video preview */}
                  <StreamPreview
                    roomName={room.name}
                    className="w-full h-full"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="mt-12 text-center">
          <div className="flex justify-center space-x-4">
            <Link
              href="/stream"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition duration-200"
            >
              Start Your Stream
            </Link>
            <Link
              href="/viewer"
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-md font-medium transition duration-200"
            >
              Browse All Streams
            </Link>
            <Link
              href="/auctions"
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md font-medium transition duration-200"
            >
              Time Auctions
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
