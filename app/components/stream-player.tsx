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

export function StreamPlayer() {
  const { name: roomName, state: roomState } = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();

  const remoteVideoTracks = useTracks([Track.Source.Camera]);
  console.log("remoteVideoTracks", remoteVideoTracks);

  const remoteAudioTracks = useTracks([Track.Source.Microphone]);

  const [adminView, setAdminView] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const handleToggleAdminView = () => {
    setAdminView(!adminView);
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim() || !localParticipant) return;

    try {
      // Use room's data channel to send message to streamer
      const encoder = new TextEncoder();
      const messageData = JSON.stringify({
        type: "admin-message",
        message: chatMessage,
        timestamp: Date.now(),
      });
      const data = encoder.encode(messageData);

      // Send to the room - will be received by all participants including the streamer
      localParticipant.publishData(data, { reliable: true });

      setSentMessages([...sentMessages, chatMessage]);
      setChatMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Make sure the streamer is connected.");
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
      {/* Admin View Toggle Button */}
      <button
        onClick={handleToggleAdminView}
        className="absolute top-4 right-4 z-50 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
      >
        {adminView ? "Exit Admin View" : "Admin View"}
      </button>
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

      {/* Admin View Panel */}
      {adminView && (
        <div className="absolute top-16 right-4 w-80 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 p-4 z-50">
          <h3 className="text-white font-bold mb-3 text-lg border-b border-gray-700 pb-2">
            Admin Chat
          </h3>

          <div className="mb-3">
            <p className="text-gray-400 text-sm mb-2">
              Send messages to the streamer:
            </p>
            <div className="flex gap-2">
              <input
                ref={chatInputRef}
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition"
              >
                Send
              </button>
            </div>
          </div>

          {sentMessages.length > 0 && (
            <div className="mt-4 max-h-60 overflow-y-auto">
              <p className="text-gray-400 text-sm mb-2">Sent Messages:</p>
              <div className="space-y-2">
                {sentMessages.map((msg, index) => (
                  <div
                    key={index}
                    className="bg-gray-700 px-3 py-2 rounded text-sm text-white"
                  >
                    {msg}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-gray-700">
            <p className="text-gray-500 text-xs">
              💡 Messages are sent directly to the streamer via data channel
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
