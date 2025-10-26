"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface ActiveRoom {
  name: string;
  numParticipants: number;
  creationTime: number;
}

export function Navbar() {
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchActiveRooms = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/active_rooms");
      if (response.ok) {
        const rooms = await response.json();
        setActiveRooms(rooms);
      }
    } catch (error) {
      console.error("Failed to fetch active rooms:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveRooms();
    // Refresh every 10 seconds
    const interval = setInterval(fetchActiveRooms, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-xl font-bold">
            TimeIsMoney
          </Link>

          <Link
            href="/stream"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition duration-200"
          >
            Start Streaming
          </Link>

          <Link
            href="/viewer"
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md transition duration-200"
          >
            Browse Streams
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm">
            <span className="text-gray-300">Active Rooms:</span>
            {isLoading ? (
              <span className="ml-2 text-gray-400">Loading...</span>
            ) : (
              <span className="ml-2 text-green-400 font-semibold">
                {activeRooms.length}
              </span>
            )}
          </div>

          {activeRooms.length > 0 && (
            <div className="relative group">
              <button className="text-gray-300 hover:text-white text-sm">
                View Rooms ↓
              </button>
              <div className="absolute right-0 mt-2 w-64 bg-gray-700 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-2">
                  {activeRooms.map((room) => (
                    <Link
                      key={room.name}
                      href={`/view/${encodeURIComponent(room.name)}`}
                      className="block p-2 hover:bg-gray-600 rounded transition duration-200"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{room.name}</span>
                        <span className="text-xs text-gray-400">
                          {room.numParticipants} viewers
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Started{" "}
                        {new Date(room.creationTime).toLocaleTimeString()}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
