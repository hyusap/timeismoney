"use client";

import { useState, useEffect } from "react";
import {
  LiveKitRoom,
  useTracks,
  useRoomContext,
  VideoTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";

interface StreamPreviewProps {
  roomName: string;
  className?: string;
}

function PreviewContent({ roomName, className }: StreamPreviewProps) {
  const videoTracks = useTracks([Track.Source.Camera]);
  const { state: roomState } = useRoomContext();
  const [hasVideo, setHasVideo] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    console.log(
      `Room ${roomName} - videoTracks:`,
      videoTracks.length,
      videoTracks
    );
    if (videoTracks.length > 0) {
      setHasVideo(true);
    } else {
      setHasVideo(false);
    }
  }, [videoTracks, roomName]);

  if (roomState !== "connected") {
    return (
      <div
        className={`absolute inset-0 bg-gray-200 flex items-center justify-center ${className}`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
          <div className="text-gray-600 text-xs">Connecting...</div>
        </div>
      </div>
    );
  }

  if (!hasVideo) {
    return (
      <div
        className={`absolute inset-0 bg-gray-200 flex items-center justify-center ${className}`}
      >
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-gray-600 text-lg">📹</span>
          </div>
          <div className="text-gray-600 text-xs">No Video</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 ${className}`}>
      {/* Show first video track as preview */}
      {videoTracks.slice(0, 1).map((track) => (
        <div
          key={track.participant.identity}
          className="absolute inset-0"
        >
          <VideoTrack
            trackRef={track}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: "contrast(1.15) brightness(0.9) saturate(0.9)",
            }}
          />

          {/* Scan line effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.2) 0px, transparent 1px, transparent 2px, rgba(0, 0, 0, 0.2) 3px)",
              animation: "scan 10s linear infinite",
            }}
          />

          {/* Vignette effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.5) 100%)",
            }}
          />

          {/* Noise overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-15"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
              mixBlendMode: "overlay",
            }}
          />

          {/* Chromatic aberration effect (subtle) */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              background: "linear-gradient(90deg, rgba(255,0,0,0.1) 0%, transparent 2%, transparent 98%, rgba(0,0,255,0.1) 100%)",
            }}
          />

          {/* CCTV Overlays */}
          {/* Top left: timestamp */}
          <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 font-mono text-xs border border-white/20">
            {time.toLocaleString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false
            })}
          </div>

          {/* Top right: live indicator */}
          <div className="absolute top-2 right-2 flex items-center space-x-1 bg-black/70 px-2 py-1 border border-red-600/30">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            <span className="text-red-600 font-mono text-xs font-bold">REC</span>
          </div>

          {/* Bottom left: camera label */}
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 font-mono text-xs border border-white/20">
            {track.participant.identity.slice(0, 12).toUpperCase()}
          </div>

          {/* Corner markers (security cam style) */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-600/40"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-600/40"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red-600/40"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-600/40"></div>

          <style jsx>{`
            @keyframes scan {
              0% {
                transform: translateY(-100%);
              }
              100% {
                transform: translateY(100%);
              }
            }
          `}</style>
        </div>
      ))}
    </div>
  );
}

export function StreamPreview({
  roomName,
  className = "",
}: StreamPreviewProps) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getPreviewToken = async () => {
      try {
        console.log(`Getting preview token for room: ${roomName}`);
        const res = await fetch("/api/join_stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_name: roomName,
            identity: `preview-${Date.now()}`,
          }),
        });

        if (!res.ok) {
          console.error(`Failed to join room ${roomName}, status:`, res.status);
          setIsLoading(false);
          return;
        }

        const { connection_details } = await res.json();
        console.log(`Got token for room ${roomName}:`, connection_details);

        setToken(connection_details.token);
        setServerUrl(connection_details.ws_url);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to get preview token:", error);
        setIsLoading(false);
      }
    };

    getPreviewToken();
  }, [roomName]);

  if (isLoading) {
    return (
      <div
        className={`absolute inset-0 bg-gray-200 flex items-center justify-center ${className}`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
          <div className="text-gray-600 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div
        className={`absolute inset-0 bg-gray-200 flex items-center justify-center ${className}`}
      >
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-gray-600 text-lg">❌</span>
          </div>
          <div className="text-gray-600 text-xs">Preview Unavailable</div>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom serverUrl={serverUrl} token={token}>
      <PreviewContent roomName={roomName} className={className} />
    </LiveKitRoom>
  );
}
