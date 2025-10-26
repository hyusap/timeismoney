"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StreamPreview } from "./components/stream-preview";
import CameraFeed from "./components/camera-feed";
import { useCurrentAccount } from "@mysten/dapp-kit";

interface ActiveRoom {
  name: string;
  numParticipants: number;
  creationTime: number;
}

// CCTV placeholder component for empty grid slots
function CCTVPlaceholder({ index }: { index: number }) {
  return (
    <div className="relative w-full h-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center overflow-hidden">
      {/* Scan line effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-300/20 to-transparent animate-pulse"></div>

      {/* Camera icon and text */}
      <div className="relative z-10 flex flex-col items-center justify-center opacity-40">
        <svg
          className="w-16 h-16 text-gray-400 mb-2"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
        </svg>
        <div className="text-gray-400 font-mono text-xs">CAM {index + 1}</div>
        <div className="text-gray-300 font-mono text-xs mt-1">OFFLINE</div>
      </div>

      {/* Corner timestamp */}
      <div className="absolute top-2 left-2 text-gray-400 font-mono text-xs">
        {new Date().toLocaleString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </div>

      {/* Recording indicator (inactive) */}
      <div className="absolute top-2 right-2 flex items-center space-x-1">
        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
        <span className="text-gray-400 font-mono text-xs">●</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const account = useCurrentAccount();

  // Netcam feed URLs
  const cameraUrls = [
    "http://190.210.250.149:91/mjpg/video.mjpg",
    "http://158.58.130.148/mjpg/video.mjpg",
    "http://181.133.80.199:89/mjpg/video.mjpg",
    "http://109.228.134.144:81/mjpg/video.mjpg",
    "http://88.209.215.194:8801/mjpg/video.mjpg",
  ];

  const fetchActiveRooms = async () => {
    try {
      console.log("Fetching active rooms...");
      const response = await fetch("/api/active_rooms");
      console.log("Response status:", response.status);

      if (response.ok) {
        const rooms = await response.json();
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

  // Total grid slots - adjust based on screen size
  // For a 4x3 grid = 12 slots minimum
  const TOTAL_GRID_SLOTS = 12;

  // Prepare grid items - live streams first, then placeholders
  const gridItems = [...activeRooms];
  const placeholdersNeeded = Math.max(0, TOTAL_GRID_SLOTS - activeRooms.length);
  const placeholders = Array.from({ length: placeholdersNeeded }, (_, i) => i);

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* CCTV Grid - Full Screen */}
      <div className="flex-1 grid grid-cols-4 grid-rows-3 gap-1 p-1 bg-black overflow-hidden">
        {/* Live streams first */}
        {gridItems.map((room) => (
          <Link
            key={room.name}
            href={`/view/${encodeURIComponent(room.name)}`}
            className="relative w-full h-full bg-black hover:opacity-80 transition-all overflow-hidden group"
          >
            <StreamPreview roomName={room.name} className="w-full h-full" />
          </Link>
        ))}

        {/* Netcam feeds */}
        {placeholders.map((_, index) => (
          <div key={`placeholder-${index}`} className="w-full h-full">
            <CameraFeed
              url={cameraUrls[index % cameraUrls.length]}
              index={activeRooms.length + index}
            />
          </div>
        ))}
      </div>

      {/* Quick Actions Footer */}
    </div>
  );
}
