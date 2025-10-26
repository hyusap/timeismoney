import { RoomServiceClient } from "livekit-server-sdk";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomname: string }> }
) {
  try {
    const resolvedParams = await params;
    const roomName = decodeURIComponent(resolvedParams.roomname);

    const httpUrl = process.env
      .LIVEKIT_WS_URL!.replace("wss://", "https://")
      .replace("ws://", "http://");

    const roomService = new RoomServiceClient(
      httpUrl,
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!
    );

    // Get room information
    const rooms = await roomService.listRooms([roomName]);

    if (!rooms || rooms.length === 0 || rooms[0].numParticipants === 0) {
      return new Response("Room not found or no participants", { status: 404 });
    }

    const room = rooms[0];

    // Get participants in the room
    const participants = await roomService.listParticipants(roomName);

    // Find a participant with video track
    const videoParticipant = participants.find((p) =>
      p.tracks.some(
        (track) => track.type === "video" && track.source === "camera"
      )
    );

    if (!videoParticipant) {
      return new Response("No video stream available", { status: 404 });
    }

    // Get the video track
    const videoTrack = videoParticipant.tracks.find(
      (track) => track.type === "video" && track.source === "camera"
    );

    if (!videoTrack) {
      return new Response("No video track found", { status: 404 });
    }

    // For now, return a placeholder response
    // In a real implementation, you would:
    // 1. Get the actual video frame from LiveKit
    // 2. Convert it to a thumbnail image
    // 3. Return the image data

    return new Response(
      JSON.stringify({
        hasVideo: true,
        participantName: videoParticipant.identity,
        trackId: videoTrack.sid,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error getting room thumbnail:", error);
    return new Response("Error getting thumbnail", { status: 500 });
  }
}
