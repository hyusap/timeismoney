import {
  AudioTrack,
  StartAudio,
  VideoTrack,
  useParticipants,
  useRoomContext,
  useTracks,
  useLocalParticipant,
  useDataChannel,
} from "@livekit/components-react";
import { ConnectionState, Track, RemoteParticipant } from "livekit-client";
import { useState, useEffect, useRef } from "react";

interface StreamPlayerProps {
  viewerAddress?: string | null;
}

export function StreamPlayer({ viewerAddress }: StreamPlayerProps = {}) {
  const { name: roomName, state: roomState } = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();

  const remoteVideoTracks = useTracks([Track.Source.Camera]);
  const remoteAudioTracks = useTracks([Track.Source.Microphone]);

  const [chatMessage, setChatMessage] = useState("");
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Slot owner check state
  const [isCurrentSlotOwner, setIsCurrentSlotOwner] = useState(false);
  const [currentSlotWinner, setCurrentSlotWinner] = useState<string | null>(null);
  const [isCheckingSlot, setIsCheckingSlot] = useState(false);
  const [time, setTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if viewer is the current slot owner
  useEffect(() => {
    if (!viewerAddress || !roomName) return;

    const checkSlotOwnership = async () => {
      setIsCheckingSlot(true);
      try {
        const res = await fetch(`/api/time-slot-monitor?streamerAddress=${roomName}`);
        const data = await res.json();

        if (data.hasActiveSlot && data.winner) {
          setCurrentSlotWinner(data.winner);
          setIsCurrentSlotOwner(
            data.winner.toLowerCase() === viewerAddress.toLowerCase()
          );
        } else {
          setCurrentSlotWinner(null);
          setIsCurrentSlotOwner(false);
        }
      } catch (error) {
        console.error("Failed to check slot ownership:", error);
        setIsCurrentSlotOwner(false);
      } finally {
        setIsCheckingSlot(false);
      }
    };

    // Check immediately
    checkSlotOwnership();

    // Re-check every 2 seconds
    const interval = setInterval(checkSlotOwnership, 2000);
    return () => clearInterval(interval);
  }, [viewerAddress, roomName]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !localParticipant) return;

    try {
      // Use room's data channel to send message to streamer
      const encoder = new TextEncoder();
      const messageData = JSON.stringify({
        type: "command-message",
        message: chatMessage,
        timestamp: Date.now(),
        sender: viewerAddress,
      });
      const data = encoder.encode(messageData);

      // Send to the room
      localParticipant.publishData(data, { reliable: true });

      // Trigger TTS via Deepgram for audio announcement
      fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chatMessage }),
      })
        .then(async res => {
          if (res.ok) {
            const audioBlob = await res.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play();
          }
        })
        .catch(err => {});

      setChatMessage("");
    } catch (error) {
      console.error("❌ [Command] Error sending message:", error);
      alert("Failed to send command.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="relative h-full w-full bg-black">
      {/* Full screen video - preserve aspect ratio, full height */}
      {remoteVideoTracks.length > 0 ? (
        <div className="w-full h-full flex items-center justify-center">
          {remoteVideoTracks.map((t) => (
            <div
              key={t.participant.identity}
              className="relative w-full h-full flex items-center justify-center"
            >
              <VideoTrack
                trackRef={t}
                className="h-full w-auto object-contain"
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
                {t.participant.identity.slice(0, 12).toUpperCase()}
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
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-white text-xl">No stream available</div>
        </div>
      )}

      {/* Audio tracks (hidden) */}
      {remoteAudioTracks.map((t) => (
        <AudioTrack trackRef={t} key={t.participant.identity} />
      ))}

      {/* Start audio overlay (minimal) */}
      <StartAudio
        label=""
        className="absolute top-0 h-full w-full bg-transparent"
      />

      {/* Command Chat Box - Bottom of screen */}
      <div className="absolute bottom-4 left-4 right-4 z-50">
        <div className="max-w-md">
          {isCurrentSlotOwner && (
            <div className="bg-green-900/90 border border-green-500 rounded-t px-3 py-1">
              <p className="text-green-400 text-xs font-bold">⚡ You control this time slot</p>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={chatInputRef}
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isCurrentSlotOwner ? "Send a command..." : "You need to win a slot to send commands"}
              disabled={!isCurrentSlotOwner}
              className={`flex-1 px-4 py-3 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 ${
                isCurrentSlotOwner
                  ? "bg-gray-900/90 border border-green-500 focus:ring-green-500"
                  : "bg-gray-800/50 border border-gray-600 cursor-not-allowed"
              }`}
            />
            <button
              onClick={handleSendMessage}
              disabled={!isCurrentSlotOwner || !chatMessage.trim()}
              className={`px-6 py-3 rounded font-bold transition ${
                isCurrentSlotOwner && chatMessage.trim()
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
