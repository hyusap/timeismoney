import {
  AudioTrack,
  StartAudio,
  VideoTrack,
  useParticipants,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { useState, useEffect } from "react";
import Link from "next/link";

export function StreamPlayerAdmin() {
  const { name: roomName, state: roomState } = useRoomContext();
  const participants = useParticipants();
  const remoteVideoTracks = useTracks([Track.Source.Camera]);
  const remoteAudioTracks = useTracks([Track.Source.Microphone]);

  const [showControls, setShowControls] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [orientation, setOrientation] = useState(0);

  // Device orientation detection
  useEffect(() => {
    const handleOrientationChange = () => {
      if (screen.orientation) {
        setOrientation(screen.orientation.angle);
      } else if (window.orientation !== undefined) {
        setOrientation(window.orientation);
      }
    };

    handleOrientationChange();

    if (screen.orientation) {
      screen.orientation.addEventListener("change", handleOrientationChange);
    } else {
      window.addEventListener("orientationchange", handleOrientationChange);
    }

    return () => {
      if (screen.orientation) {
        screen.orientation.removeEventListener(
          "change",
          handleOrientationChange
        );
      } else {
        window.removeEventListener(
          "orientationchange",
          handleOrientationChange
        );
      }
    };
  }, []);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (showControls) {
      const timer = setTimeout(() => setShowControls(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showControls]);

  const getRotation = () => {
    if (orientation === 180) return "rotate-180";
    if (orientation === 90) return "rotate-90";
    if (orientation === 270) return "-rotate-90";
    return "";
  };

  return (
    <div className="relative h-full w-full bg-black">
      {/* Full screen video */}
      {remoteVideoTracks.length > 0 ? (
        <div className="w-full h-full flex items-center justify-center">
          {remoteVideoTracks.map((t) => (
            <div
              key={t.participant.identity}
              className="w-full h-full flex items-center justify-center"
            >
              <VideoTrack
                trackRef={t}
                className="h-full w-auto object-contain"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-white text-xl">No stream available</div>
        </div>
      )}

      {/* Audio tracks (hidden) */}
      {remoteAudioTracks.map((t) => (
        <AudioTrack trackRef={t} key={t.participant.identity} />
      ))}

      {/* Start audio overlay */}
      <StartAudio
        label=""
        className="absolute top-0 h-full w-full bg-transparent"
      />

      {/* Admin Controls Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        onClick={() => setShowControls(!showControls)}
      >
        {showControls && (
          <div className="pointer-events-auto">
            {/* Top bar with room info and back button */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between">
                <Link
                  href="/stream"
                  className="px-4 py-2 bg-gray-800/90 hover:bg-gray-700 rounded-lg text-white font-medium transition"
                >
                  ← Back to Stream
                </Link>
                <div className="text-white text-sm font-mono bg-gray-800/90 px-3 py-2 rounded">
                  {roomName}
                </div>
              </div>
            </div>

            {/* Bottom stats and info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-white text-sm">
                  {participants.length} participant
                  {participants.length !== 1 ? "s" : ""}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowStats(!showStats);
                  }}
                  className="px-3 py-1 bg-gray-800/90 hover:bg-gray-700 rounded text-white text-sm transition"
                >
                  {showStats ? "Hide" : "Show"} Stats
                </button>
              </div>

              {showStats && (
                <div className="bg-gray-800/90 rounded p-3 text-white text-sm space-y-1">
                  <div>
                    Room State: <span className="font-mono">{roomState}</span>
                  </div>
                  <div>
                    Video Tracks:{" "}
                    <span className="font-mono">
                      {remoteVideoTracks.length}
                    </span>
                  </div>
                  <div>
                    Audio Tracks:{" "}
                    <span className="font-mono">
                      {remoteAudioTracks.length}
                    </span>
                  </div>
                  <div>
                    Orientation:{" "}
                    <span className="font-mono">{orientation}°</span>
                  </div>
                </div>
              )}
            </div>

            {/* Center rotation indicator */}
            <div
              className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 ${getRotation()}`}
            >
              <div className="text-white text-center">
                <div className="text-4xl mb-2">📱</div>
                <div className="text-sm text-gray-300">{orientation}°</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
