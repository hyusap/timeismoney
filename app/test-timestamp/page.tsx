"use client";

import { useState, useEffect } from "react";

export default function TestTimestampPage() {
  const [browserTime, setBrowserTime] = useState<number>(0);
  const [serverTime, setServerTime] = useState<number | null>(null);

  useEffect(() => {
    // Update browser time every second
    const updateTime = () => setBrowserTime(Date.now());
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Fetch server time
    fetch('/api/server-time')
      .then(res => res.json())
      .then(data => setServerTime(data.timestamp))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-8">🕐 Timestamp Test</h1>

      <div className="space-y-6">
        {/* Browser Time */}
        <div className="bg-gray-900 border border-green-500 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-green-400 mb-4">Browser Time (Date.now())</h2>
          <div className="space-y-2 font-mono">
            <div className="text-3xl text-green-400">{browserTime}</div>
            <div className="text-gray-400">ISO: {new Date(browserTime).toISOString()}</div>
            <div className="text-gray-400">Local: {new Date(browserTime).toLocaleString()}</div>
            <div className="text-gray-400">UTC: {new Date(browserTime).toUTCString()}</div>
          </div>
        </div>

        {/* Server Time */}
        <div className="bg-gray-900 border border-blue-500 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-blue-400 mb-4">Server Time (Next.js API)</h2>
          {serverTime ? (
            <div className="space-y-2 font-mono">
              <div className="text-3xl text-blue-400">{serverTime}</div>
              <div className="text-gray-400">ISO: {new Date(serverTime).toISOString()}</div>
              <div className="text-gray-400">Local: {new Date(serverTime).toLocaleString()}</div>
              <div className="text-gray-400">UTC: {new Date(serverTime).toUTCString()}</div>
            </div>
          ) : (
            <div className="text-gray-400">Loading...</div>
          )}
        </div>

        {/* Difference */}
        {serverTime && (
          <div className="bg-gray-900 border border-yellow-500 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Difference</h2>
            <div className="space-y-2 font-mono">
              <div className="text-xl">
                {Math.abs(browserTime - serverTime)} ms
              </div>
              <div className="text-gray-400">
                {browserTime > serverTime ? 'Browser is ahead' : 'Server is ahead'}
              </div>
            </div>
          </div>
        )}

        {/* What will be sent to blockchain */}
        <div className="bg-gray-900 border border-purple-500 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-purple-400 mb-4">What Would Be Sent to Blockchain</h2>
          <div className="space-y-2 font-mono">
            <div className="text-sm text-gray-400">If we called create_time_slot right now:</div>
            <div className="text-xl text-purple-400">start_time: {browserTime}</div>
            <div className="text-gray-400">Which is: {new Date(browserTime).toISOString()}</div>
            <div className="text-sm text-gray-400 mt-4">First slot would start at:</div>
            <div className="text-xl text-purple-400">{new Date(browserTime).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
