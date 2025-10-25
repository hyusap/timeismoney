import jwt from "jsonwebtoken";
import {
  AccessToken,
  ParticipantPermission,
  RoomServiceClient,
} from "livekit-server-sdk";

export type RoomMetadata = {
  creator_identity: string;
  enable_chat: boolean;
  allow_participation: boolean;
};

export type ParticipantMetadata = {
  hand_raised: boolean;
  invited_to_stage: boolean;
  avatar_image: string;
};

export type Session = {
  identity: string;
  room_name: string;
};

export type ConnectionDetails = {
  token: string;
  ws_url: string;
};

export type CreateStreamParams = {
  room_name?: string;
  metadata: RoomMetadata;
};

export type CreateStreamResponse = {
  auth_token: string;
  connection_details: ConnectionDetails;
};

export type JoinStreamParams = {
  room_name: string;
  identity: string;
};

export type JoinStreamResponse = {
  auth_token: string;
  connection_details: ConnectionDetails;
};

export function getSessionFromReq(req: Request): Session {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  if (!token) {
    throw new Error("No authorization header found");
  }
  const verified = jwt.verify(token, process.env.LIVEKIT_API_SECRET!);
  if (!verified) {
    throw new Error("Invalid token");
  }
  const decoded = jwt.decode(token) as Session;
  return decoded;
}

export class Controller {
  private roomService: RoomServiceClient;

  constructor() {
    const httpUrl = process.env
      .LIVEKIT_WS_URL!.replace("wss://", "https://")
      .replace("ws://", "http://");
    this.roomService = new RoomServiceClient(
      httpUrl,
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!
    );
  }

  async createStream({
    metadata,
    room_name: roomName,
  }: CreateStreamParams): Promise<CreateStreamResponse> {
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      {
        identity: metadata.creator_identity,
      }
    );

    if (!roomName) {
      roomName = generateRoomId();
    }
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    await this.roomService.createRoom({
      name: roomName,
      metadata: JSON.stringify(metadata),
    });

    const connection_details = {
      ws_url: process.env.LIVEKIT_WS_URL!,
      token: await at.toJwt(),
    };

    const authToken = this.createAuthToken(roomName, metadata.creator_identity);

    return {
      auth_token: authToken,
      connection_details,
    };
  }

  async joinStream({
    identity,
    room_name,
  }: JoinStreamParams): Promise<JoinStreamResponse> {
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      {
        identity,
      }
    );

    at.addGrant({
      room: room_name,
      roomJoin: true,
      canPublish: false,
      canSubscribe: true,
      canPublishData: true,
    });

    const authToken = this.createAuthToken(room_name, identity);

    return {
      auth_token: authToken,
      connection_details: {
        ws_url: process.env.LIVEKIT_WS_URL!,
        token: await at.toJwt(),
      },
    };
  }

  createAuthToken(room_name: string, identity: string) {
    return jwt.sign(
      JSON.stringify({ room_name, identity }),
      process.env.LIVEKIT_API_SECRET!
    );
  }
}

function generateRoomId(): string {
  return `${randomString(4)}-${randomString(4)}`;
}

function randomString(length: number): string {
  let result = "";
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
