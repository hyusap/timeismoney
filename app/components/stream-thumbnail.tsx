"use client";

import { useState, useEffect, useRef } from "react";
import { LiveKitRoom, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";

interface StreamThumbnailProps {
  roomName: string;
  className?: string;
}

export function StreamThumbnail({
  roomName,
  className = "",
}: StreamThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasVideo, setHasVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get video tracks from the room
  const videoTracks = useTracks([Track.Source.Camera]);

  useEffect(() => {
    if (videoTracks.length > 0) {
      setHasVideo(true);
      setIsLoading(false);

      // Capture thumbnail from video track
      const captureThumbnail = () => {
        if (videoRef.current && canvasRef.current) {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          const ctx = canvas.getContext("2d");

          if (ctx) {
            canvas.width = video.videoWidth || 320;
            canvas.height = video.videoHeight || 240;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
            setThumbnailUrl(dataUrl);
          }
        }
      };

      // Capture thumbnail after video loads
      const timer = setTimeout(captureThumbnail, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
      setHasVideo(false);
    }
  }, [videoTracks]);

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

  // Attach video track to video element
  useEffect(() => {
    if (videoRef.current && videoTracks.length > 0) {
      const trackRef = videoTracks[0];
      const mediaTrack = trackRef.publication?.track;
      if (mediaTrack) {
        videoRef.current.srcObject = new MediaStream([mediaTrack.mediaStreamTrack]);
      }
    }
  }, [videoTracks]);

  return (
    <div className={`relative ${className}`}>
      {/* Hidden video element for capturing frames */}
      <video ref={videoRef} className="hidden" autoPlay muted playsInline />

      {/* Hidden canvas for capturing thumbnails */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Display thumbnail or live video */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={`Stream thumbnail for ${roomName}`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            </div>
            <div className="text-white text-xs">LIVE</div>
          </div>
        </div>
      )}
    </div>
  );
}
