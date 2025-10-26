"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useCurrentAccount, ConnectButton } from "@mysten/dapp-kit";

interface ActiveRoom {
  name: string;
  numParticipants: number;
  creationTime: number;
}

export function Navbar() {
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const account = useCurrentAccount();

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
    <nav className="text-white py-6 p-4 bg-black">
      <div className="mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <Link
            href="/"
            className="text-3xl font-semibold flex items-center space-x-3 tracking-tighter"
          >
            <img
              src="/a.svg"
              className="w-10 h-10 -rotate-15 bg-white rounded-full flex items-center justify-center"
            />

            <p className="font-[family-name:var(--font-geist-sans)]">
              Human Capital
            </p>
          </Link>
        </div>

        {/* Search Bar in Middle */}
        <div className="flex items-center space-x-2 flex-1 max-w-md mx-8">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search..."
              className="w-full px-4 py-2 bg-transparent border border-gray-700 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
            />
          </div>
          <button
            className="p-2 rounded-full hover:bg-gray-800 transition"
            title="Info"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {/* Start Streaming Button - Only show when connected */}
          {account && (
            <Link
              href="/stream"
              className="flex items-center space-x-2 justify-center bg-white text-gray-900 px-4 py-2 rounded-full hover:bg-gray-100 transition"
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
                  d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
              <span className="tracking-tighter font-bold">Clock In</span>
            </Link>
          )}

          {/* Wallet Connect Button */}
          <ConnectButton />

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
