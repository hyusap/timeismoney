import {
  AudioTrack,
  StartAudio,
  VideoTrack,
  useParticipants,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";

export function StreamPlayer() {
  const { name: roomName, state: roomState } = useRoomContext();

  const participants = useParticipants();

  const remoteVideoTracks = useTracks([Track.Source.Camera]);

  console.log("remoteVideoTracks", remoteVideoTracks);

  const remoteAudioTracks = useTracks([Track.Source.Microphone]);

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
    </div>
  );
}
