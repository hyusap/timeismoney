"use client";

import { useState, useEffect } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { queryTimeSlotsByOwner } from "@/lib/sui/time-auction";

export default function DebugTimePage() {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const account = useCurrentAccount();
  const client = useSuiClient();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchSlots = async () => {
    if (!account) return;
    const slots = await queryTimeSlotsByOwner(client, account.address);
    setTimeSlots(slots);
  };

  useEffect(() => {
    if (account) {
      fetchSlots();
      const interval = setInterval(fetchSlots, 5000);
      return () => clearInterval(interval);
    }
  }, [account]);

  const formatTimestamp = (ts: number | bigint) => {
    const num = Number(ts);
    const date = new Date(num);
    return {
      raw: num,
      utc: date.toUTCString(),
      local: date.toLocaleString(),
      iso: date.toISOString(),
    };
  };

  const calculateDiff = (slotTime: bigint) => {
    const diff = Number(slotTime) - currentTime;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    return {
      ms: diff,
      seconds: seconds % 60,
      minutes: minutes % 60,
      hours,
      total_seconds: seconds,
    };
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-purple-500 mb-8">🕐 Time Debug Page</h1>

        {/* Current Time */}
        <div className="bg-gray-900 border border-purple-500 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Current Time (Frontend)</h2>
          <div className="grid grid-cols-2 gap-4 font-mono text-sm">
            <div>
              <div className="text-gray-400">Date.now() (ms)</div>
              <div className="text-green-400 text-lg">{currentTime}</div>
            </div>
            <div>
              <div className="text-gray-400">UTC String</div>
              <div className="text-white">{new Date(currentTime).toUTCString()}</div>
            </div>
            <div>
              <div className="text-gray-400">Local String</div>
              <div className="text-white">{new Date(currentTime).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-400">ISO String</div>
              <div className="text-white">{new Date(currentTime).toISOString()}</div>
            </div>
          </div>
        </div>

        {/* Timezone Info */}
        <div className="bg-gray-900 border border-blue-500 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Browser Timezone Info</h2>
          <div className="grid grid-cols-2 gap-4 font-mono text-sm">
            <div>
              <div className="text-gray-400">Timezone</div>
              <div className="text-white">{Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
            </div>
            <div>
              <div className="text-gray-400">Timezone Offset (minutes)</div>
              <div className="text-white">{new Date().getTimezoneOffset()}</div>
            </div>
            <div>
              <div className="text-gray-400">Timezone Offset (hours)</div>
              <div className="text-white">{new Date().getTimezoneOffset() / 60}</div>
            </div>
          </div>
        </div>

        {/* Time Slots */}
        <div className="bg-gray-900 border border-yellow-500 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Time Slots from Blockchain</h2>
            <button
              onClick={fetchSlots}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold"
            >
              Refresh
            </button>
          </div>

          {!account ? (
            <div className="text-gray-400 text-center py-8">Connect wallet to see slots</div>
          ) : timeSlots.length === 0 ? (
            <div className="text-gray-400 text-center py-8">No time slots found</div>
          ) : (
            <div className="space-y-4">
              {timeSlots.slice(0, 5).map((slot, index) => {
                const startInfo = formatTimestamp(slot.startTime);
                const diff = calculateDiff(slot.startTime);
                const isActive = currentTime >= Number(slot.startTime) &&
                                currentTime < Number(slot.startTime) + Number(slot.durationMs);

                return (
                  <div
                    key={slot.objectId}
                    className={`border ${isActive ? 'border-red-500 bg-red-900/20' : 'border-gray-700'} rounded-lg p-4`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-bold text-lg">
                        Slot #{index + 1} {isActive && <span className="text-red-500">🔴 ACTIVE</span>}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {slot.objectId.slice(0, 16)}...
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                      <div>
                        <div className="text-gray-400">Start Time (Raw)</div>
                        <div className="text-green-400">{startInfo.raw}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">UTC</div>
                        <div className="text-white">{startInfo.utc}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Local</div>
                        <div className="text-white">{startInfo.local}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">ISO</div>
                        <div className="text-white">{startInfo.iso}</div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="text-gray-400 mb-2">Time Difference (Slot Start - Current)</div>
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div>
                          <div className="text-gray-500">Hours</div>
                          <div className={`font-bold ${diff.hours < 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {diff.hours}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Minutes</div>
                          <div className={`font-bold ${diff.total_seconds < 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {diff.minutes}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Seconds</div>
                          <div className={`font-bold ${diff.total_seconds < 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {diff.seconds}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Total Seconds</div>
                          <div className={`font-bold ${diff.total_seconds < 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {diff.total_seconds}
                          </div>
                        </div>
                      </div>
                      {Math.abs(diff.hours) >= 1 && (
                        <div className="mt-2 bg-red-900/50 border border-red-500 rounded p-2 text-red-300 text-sm">
                          ⚠️ WARNING: Time difference is {Math.abs(diff.hours)} hours! This might indicate a timezone issue.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
