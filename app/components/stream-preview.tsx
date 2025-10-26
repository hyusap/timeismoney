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
        className={`absolute inset-0 bg-gray-700 flex items-center justify-center ${className}`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <div className="text-white text-xs">Connecting...</div>
        </div>
      </div>
    );
  }

  if (!hasVideo) {
    return (
      <div
        className={`absolute inset-0 bg-gray-700 flex items-center justify-center ${className}`}
      >
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-white text-lg">📹</span>
          </div>
          <div className="text-white text-xs">No Video</div>
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
          <VideoTrack trackRef={track} className="absolute inset-0 w-full h-full object-cover" />

          {/* CCTV Overlays */}
          {/* Top left: timestamp */}
          <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 font-mono text-xs">
            {new Date().toLocaleString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false
            })}
          </div>

          {/* Top right: live indicator */}
          <div className="absolute top-2 right-2 flex items-center space-x-1 bg-black/60 px-2 py-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-500 font-mono text-xs font-bold">REC</span>
          </div>

          {/* Bottom left: camera label */}
          <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 font-mono text-xs">
            CAM: {track.participant.identity.slice(0, 8)}
          </div>

          {/* Scan line effect */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-white/5 to-transparent animate-pulse"></div>
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
        className={`absolute inset-0 bg-gray-700 flex items-center justify-center ${className}`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <div className="text-white text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div
        className={`absolute inset-0 bg-gray-700 flex items-center justify-center ${className}`}
      >
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-white text-lg">❌</span>
          </div>
          <div className="text-white text-xs">Preview Unavailable</div>
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
