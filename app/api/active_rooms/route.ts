import { RoomServiceClient } from "livekit-server-sdk";

export async function GET() {
  try {
    const httpUrl = process.env
      .LIVEKIT_WS_URL!.replace("wss://", "https://")
      .replace("ws://", "http://");

    const roomService = new RoomServiceClient(
      httpUrl,
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!
    );

    // List all active rooms
    const rooms = await roomService.listRooms();

    console.log("rooms", rooms);

    // Transform room data
    const activeRooms = rooms.map((room) => ({
      name: room.name,
      numParticipants: room.numParticipants,
    }));

    return Response.json(activeRooms);
  } catch (error) {
    console.error("Error fetching active rooms:", error);
    return Response.json([], { status: 500 });
  }
}
