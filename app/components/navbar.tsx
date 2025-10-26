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
    <nav className="text-black p-4" style={{ background: '#e0e5ec' }}>
      <div className="mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <Link
            href="/"
            className="text-2xl font-semibold flex items-center space-x-2"
          >
            <div className="w-7 h-7 bg-black rounded-full"></div>
            <p>Human Capital</p>
          </Link>

          <Link
            href="/stream"
            className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md transition duration-200"
          >
            Start Streaming
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {/* Wallet Dropdown */}
          <div className="relative wallet-dropdown">
            <button
              onClick={() => setShowWalletDropdown(!showWalletDropdown)}
              className="flex items-center space-x-2 rounded-md border border-gray-400 px-3 py-2 hover:bg-gray-200 transition"
            >
              {account ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Connected</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Connect Wallet</span>
                </>
              )}
            </button>

            {/* Dropdown Menu */}
            {showWalletDropdown && (
              <div className="absolute right-0 mt-2 w-80 border border-gray-300 rounded-lg shadow-lg z-50" style={{ background: '#e0e5ec' }}>
                {account ? (
                  <>
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-semibold">Connected</span>
                      </div>
                      <div className="text-sm text-gray-600 break-all">
                        {account.address}
                      </div>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={async () => {
                          if (currentWallet?.features["standard:disconnect"]) {
                            await currentWallet.features[
                              "standard:disconnect"
                            ].disconnect();
                          }
                          setShowWalletDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition"
                      >
                        Disconnect Wallet
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-4">
                    <p className="text-sm text-gray-600 mb-3">
                      Connect your wallet to start streaming
                    </p>
                    <button
                      onClick={async () => {
                        if (currentWallet?.features["standard:connect"]) {
                          await currentWallet.features[
                            "standard:connect"
                          ].connect();
                        }
                        setShowWalletDropdown(false);
                      }}
                      className="w-full bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition"
                    >
                      Connect Wallet
                    </button>
                  </div>
                )}
              </div>
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
