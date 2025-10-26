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
  console.log("remoteVideoTracks", remoteVideoTracks);

  const remoteAudioTracks = useTracks([Track.Source.Microphone]);

  const [chatMessage, setChatMessage] = useState("");
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Slot owner check state
  const [isCurrentSlotOwner, setIsCurrentSlotOwner] = useState(false);
  const [currentSlotWinner, setCurrentSlotWinner] = useState<string | null>(null);
  const [isCheckingSlot, setIsCheckingSlot] = useState(false);

  // Check if viewer is the current slot owner
  useEffect(() => {
    if (!viewerAddress || !roomName) return;

    const checkSlotOwnership = async () => {
      setIsCheckingSlot(true);
      try {
        const res = await fetch(`/api/time-slot-monitor?streamerAddress=${roomName}`);
        const data = await res.json();

        console.log("🎫 [Chat Access Check]", {
          viewerAddress,
          hasActiveSlot: data.hasActiveSlot,
          winner: data.winner,
          isOwner: data.winner?.toLowerCase() === viewerAddress.toLowerCase(),
        });

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

    // Re-check every 15 seconds
    const interval = setInterval(checkSlotOwnership, 15000);
    return () => clearInterval(interval);
  }, [viewerAddress, roomName]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !localParticipant) return;

    console.log("💬 [Command] Sending command:", chatMessage);

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
      console.log("✅ [Command] Data sent via LiveKit");

      // Trigger TTS via Deepgram for audio announcement
      fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chatMessage }),
      })
        .then(async res => {
          if (res.ok) {
            console.log("✅ [Command] TTS request successful, playing audio...");
            const audioBlob = await res.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play().catch(err => console.error("❌ [Command] Audio playback error:", err));
          } else {
            console.error("❌ [Command] TTS request failed:", res.status);
          }
        })
        .catch(err => console.error("❌ [Command] TTS error:", err));

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
