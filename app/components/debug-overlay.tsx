"use client";

import { useState, useEffect } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { queryTimeSlotsByOwner, TimeSlotInfo, mistToDollars, PACKAGE_ID } from "@/lib/sui/time-auction";

interface DebugOverlayProps {
  roomName?: string;
  currentInstructions?: string | null;
  currentWinner?: string | null;
  slotEndTime?: number | null;
  isStreaming?: boolean;
}

export function DebugOverlay({
  roomName,
  currentInstructions,
  currentWinner,
  slotEndTime,
  isStreaming,
}: DebugOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlotInfo[]>([]);
  const [activeSlot, setActiveSlot] = useState<TimeSlotInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const account = useCurrentAccount();
  const client = useSuiClient();

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut: ESC to close, D to open
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      } else if ((e.key === "d" || e.key === "D") && !isOpen && e.ctrlKey) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isOpen]);

  // Fetch time slots when opened
  useEffect(() => {
    if (isOpen && roomName) {
      fetchDebugData();
      const interval = setInterval(fetchDebugData, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, roomName]);

  const fetchDebugData = async () => {
    if (!roomName) return;

    setIsLoading(true);
    try {
      const slots = await queryTimeSlotsByOwner(client, roomName);
      setTimeSlots(slots);

      // Find active slot
      const now = Date.now();
      const active = slots.find(slot => {
        const startTime = Number(slot.startTime);
        const endTime = startTime + Number(slot.durationMs);
        return now >= startTime && now < endTime;
      });
      setActiveSlot(active || null);
    } catch (error) {
      console.error("Debug fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: bigint | number) => {
    const date = new Date(Number(timestamp));
    return date.toLocaleTimeString();
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getSlotStatus = (slot: TimeSlotInfo) => {
    const now = currentTime;
    const startTime = Number(slot.startTime);
    const endTime = startTime + Number(slot.durationMs);
    const auctionEnd = Number(slot.auctionEnd);

    if (now >= startTime && now < endTime) return "🔴 LIVE";
    if (now < auctionEnd) return "🟢 BIDDING";
    if (now >= auctionEnd && now < startTime) return "🟡 CLOSED";
    if (now >= endTime) return "⚫ DONE";
    return "❓ UNKNOWN";
  };

  const getTimeUntilSlot = (slot: TimeSlotInfo) => {
    const now = currentTime;
    const startTime = Number(slot.startTime);
    const diff = startTime - now;

    if (diff <= 0) return "Started";
    return formatDuration(diff);
  };

  const getBlockchainHealth = () => {
    if (!account) return "🔴 Not Connected";
    if (timeSlots.length === 0) return "🟡 No Slots";
    return "🟢 Connected";
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full shadow-lg font-mono text-sm z-50 transition-all duration-200"
      >
        🐛 DEBUG
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-auto">
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-purple-900 border-2 border-purple-500 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🐛</span>
                <div>
                  <h1 className="text-2xl font-bold text-white">DEBUG MODE</h1>
                  <p className="text-purple-300 text-sm font-mono">Real-time blockchain & system status</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold transition-colors"
              >
                ✕ CLOSE
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Blockchain</div>
              <div className="text-2xl font-bold text-white">{getBlockchainHealth()}</div>
              <div className="text-xs text-gray-500 mt-1">Package: {PACKAGE_ID.slice(0, 8)}...</div>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Wallet</div>
              <div className="text-lg font-bold text-white font-mono">
                {account ? `${account.address.slice(0, 8)}...` : "Not Connected"}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {account ? "Connected" : "Disconnected"}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Current Time</div>
              <div className="text-lg font-bold text-white font-mono">{formatTime(currentTime)}</div>
              <div className="text-xs text-gray-500 mt-1">{currentTime}</div>
            </div>
          </div>

          {/* Active Slot Info */}
          {activeSlot && (
            <div className="bg-red-900/30 border-2 border-red-500 rounded-lg p-4 mb-4">
              <h2 className="text-xl font-bold text-red-400 mb-3">🔴 ACTIVE SLOT RIGHT NOW</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-400 text-sm">Slot ID</div>
                  <div className="text-white font-mono text-sm">{activeSlot.objectId.slice(0, 16)}...</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Winner</div>
                  <div className="text-white font-mono text-sm">
                    {activeSlot.currentBidder ? `${activeSlot.currentBidder.slice(0, 8)}...` : "None"}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Started</div>
                  <div className="text-white font-mono text-sm">{formatTime(activeSlot.startTime)}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Time Remaining</div>
                  <div className="text-white font-mono text-sm">
                    {formatDuration(Number(activeSlot.startTime) + Number(activeSlot.durationMs) - currentTime)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-gray-400 text-sm mb-1">Instructions</div>
                  <div className="bg-black/50 text-yellow-400 font-mono text-sm p-2 rounded">
                    {currentInstructions || "No instructions set"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Streaming Status */}
          {isStreaming !== undefined && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-4">
              <h2 className="text-xl font-bold text-white mb-3">📹 Streaming Status</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-400 text-sm">Status</div>
                  <div className="text-white font-bold">
                    {isStreaming ? "🟢 LIVE" : "⚫ OFFLINE"}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Room Name</div>
                  <div className="text-white font-mono text-sm">{roomName || "N/A"}</div>
                </div>
              </div>
            </div>
          )}

          {/* Time Slots List */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white">⏰ Time Slots ({timeSlots.length})</h2>
              <button
                onClick={fetchDebugData}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white px-3 py-1 rounded text-sm font-bold transition-colors"
              >
                {isLoading ? "Loading..." : "🔄 Refresh"}
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {timeSlots.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No time slots found</div>
              ) : (
                timeSlots.map((slot, index) => {
                  const status = getSlotStatus(slot);
                  const isActive = activeSlot?.objectId === slot.objectId;

                  return (
                    <div
                      key={slot.objectId}
                      className={`bg-gray-800 border ${
                        isActive ? "border-red-500" : "border-gray-700"
                      } rounded p-3 hover:border-purple-500 transition-colors`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-gray-400 text-sm">#{index + 1}</span>
                          <span className="text-sm font-bold">{status}</span>
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {slot.objectId.slice(0, 12)}...
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-gray-500">Start</div>
                          <div className="text-white font-mono">{formatTime(slot.startTime)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Bid</div>
                          <div className="text-green-400 font-bold">
                            {slot.currentBid > 0n
                              ? `$${mistToDollars(slot.currentBid).toFixed(2)}`
                              : `$${mistToDollars(slot.minBid).toFixed(2)}`}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Starts In</div>
                          <div className="text-white font-mono">{getTimeUntilSlot(slot)}</div>
                        </div>
                      </div>

                      {slot.currentBidder && (
                        <div className="mt-2 text-xs">
                          <span className="text-gray-500">Winner: </span>
                          <span className="text-white font-mono">{slot.currentBidder.slice(0, 12)}...</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 text-center text-gray-500 text-sm">
            <p>Auto-refreshes every 5 seconds when open</p>
            <p className="text-xs mt-1">Press <kbd className="bg-gray-800 px-2 py-1 rounded">ESC</kbd> to close • <kbd className="bg-gray-800 px-2 py-1 rounded">Ctrl+D</kbd> to open</p>
          </div>
        </div>
      </div>
    </div>
  );
}
