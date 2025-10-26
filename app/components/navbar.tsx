"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useCurrentAccount, useWallets } from "@mysten/dapp-kit";

interface ActiveRoom {
  name: string;
  numParticipants: number;
  creationTime: number;
}

export function Navbar() {
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const account = useCurrentAccount();
  const wallets = useWallets();
  const currentWallet = wallets[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".wallet-dropdown")) {
        setShowWalletDropdown(false);
      }
    };

    if (showWalletDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showWalletDropdown]);

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
            className="text-3xl flex items-center space-x-3 tracking-tighter"
          >
            <img
              src="/a.svg"
              className="w-8 h-8 bg-white rounded-full flex items-center justify-center"
            />

            <p className="font-cormorant italic">Human Capital</p>
          </Link>

          {/* <Link
            href="/stream"
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition duration-200"
          >
            Start Streaming
          </Link> */}
        </div>

        {/* Search Bar in Middle */}
        <div className="flex items-center space-x-2 flex-1 max-w-md mx-8">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search..."
              className="w-full px-6  font-medium tracking-tighter text-lg py-2 bg-transparent border border-slate-700 rounded-full text-white placeholder-gray-500 focus:outline-none"
            />
          </div>
          <button
            className="p-2 rounded-full hover:bg-slate-800 transition"
            title="Info"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-slate-500"
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
          {/* Wallet Button or Start Stream */}
          {account ? (
            <Link
              href="/stream"
              className="flex items-center justify-center bg-white text-gray-900 p-2 rounded-full hover:bg-gray-100 transition"
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
          ) : (
            <button
              onClick={async () => {
                if (currentWallet?.features["standard:connect"]) {
                  await currentWallet.features["standard:connect"].connect();
                }
              }}
              className="flex items-center space-x-2 rounded-md border border-gray-600 px-3 py-2 hover:bg-gray-800 transition"
            >
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>Connect Wallet</span>
            </button>
          )}

          {/* Hamburger Menu */}
          <button
            className="flex flex-col space-y-1 p-2 rounded-md hover:bg-gray-800 transition"
            onClick={() => {
              // Add hamburger menu functionality here
              console.log("Hamburger menu clicked");
            }}
          >
            <div className="w-5 h-0.5 bg-white"></div>
            <div className="w-5 h-0.5 bg-white"></div>
            <div className="w-5 h-0.5 bg-white"></div>
          </button>
        </div>
      </div>
    </nav>
  );
}
