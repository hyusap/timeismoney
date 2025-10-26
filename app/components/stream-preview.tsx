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
        className={`bg-gray-700 flex items-center justify-center ${className}`}
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
        className={`bg-gray-700 flex items-center justify-center ${className}`}
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
    <div className={`relative ${className}`}>
      {/* Show first video track as preview */}
      {videoTracks.slice(0, 1).map((track) => (
        <div
          key={track.participant.identity}
          className="w-full h-full relative"
        >
          <VideoTrack trackRef={track} className="w-full h-full object-cover" />
          {/* Live indicator overlay */}
          <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1"></div>
            LIVE
          </div>
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
        className={`bg-gray-700 flex items-center justify-center ${className}`}
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
        className={`bg-gray-700 flex items-center justify-center ${className}`}
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
