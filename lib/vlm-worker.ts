/**
 * VLM Worker - Subscribes to LiveKit streams and runs VLM inference on frames
 */

import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant } from "livekit-client";
import { OpenRouterClient, VLMInferenceOptions } from "./openrouter-client";

export interface VLMWorkerConfig {
  roomName: string;
  serverUrl: string;
  token: string;
  openRouterApiKey: string;
  frameInterval?: number; // Capture frame every N milliseconds (default: 2000 = 2 seconds)
  vlmOptions?: VLMInferenceOptions;
  onInference?: (result: VLMInferenceResult) => void;
}

export interface VLMInferenceResult {
  timestamp: number;
  participantIdentity: string;
  content?: string;
  error?: string;
  frameNumber: number;
}

export class VLMWorker {
  private room: Room;
  private openRouter: OpenRouterClient;
  private config: VLMWorkerConfig;
  private frameIntervals: Map<string, NodeJS.Timeout> = new Map();
  private frameCounters: Map<string, number> = new Map();
  private isRunning = false;

  constructor(config: VLMWorkerConfig) {
    this.config = {
      frameInterval: 2000, // Default: 2 seconds (30 frames/minute)
      ...config,
    };
    this.room = new Room();
    this.openRouter = new OpenRouterClient(config.openRouterApiKey);
  }

  /**
   * Start the VLM worker - connect to room and subscribe to video tracks
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      console.log("Starting VLM worker for room:", this.config.roomName);
      // Connect to LiveKit room
      await this.room.connect(this.config.serverUrl, this.config.token);
      this.isRunning = true;

      // Set up event listeners
      this.setupEventListeners();

      // Process existing participants
      this.room.remoteParticipants.forEach((participant) => {
        this.handleParticipantConnected(participant);
      });

      console.log(`🤖 [VLM] Started monitoring room: ${this.config.roomName}`);
    } catch (error) {
      console.error("❌ [VLM] Failed to start:", error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the VLM worker and disconnect
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Clear all frame intervals
    this.frameIntervals.forEach((interval) => clearInterval(interval));
    this.frameIntervals.clear();
    this.frameCounters.clear();

    // Disconnect from room
    await this.room.disconnect();
    this.isRunning = false;

    console.log(`🛑 [VLM] Stopped monitoring room: ${this.config.roomName}`);
  }

  /**
   * Set up room event listeners
   */
  private setupEventListeners(): void {
    // Listen for new participants joining
    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      this.handleParticipantConnected(participant);
    });

    // Listen for participants leaving
    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      this.handleParticipantDisconnected(participant);
    });

    // Listen for new track subscriptions
    this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video) {
        console.log(`📹 [VLM] Now watching: ${participant.identity}`);
        this.startFrameCapture(participant, track);
      }
    });

    // Listen for track unsubscriptions
    this.room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video) {
        this.stopFrameCapture(participant.identity);
      }
    });

    // Listen for disconnection
    this.room.on(RoomEvent.Disconnected, () => {
      this.isRunning = false;
    });
  }

  /**
   * Handle new participant connection
   */
  private handleParticipantConnected(participant: RemoteParticipant): void {
    // Check if participant has video tracks
    participant.videoTrackPublications.forEach((publication) => {
      if (publication.track) {
        console.log(`📹 [VLM] Now watching: ${participant.identity}`);
        this.startFrameCapture(participant, publication.track as RemoteTrack);
      }
    });
  }

  /**
   * Handle participant disconnection
   */
  private handleParticipantDisconnected(participant: RemoteParticipant): void {
    this.stopFrameCapture(participant.identity);
  }

  /**
   * Start capturing frames from a video track
   */
  private startFrameCapture(participant: RemoteParticipant, track: RemoteTrack): void {
    const identity = participant.identity;

    // Stop existing capture if any
    this.stopFrameCapture(identity);

    // Initialize frame counter
    this.frameCounters.set(identity, 0);

    const interval = setInterval(async () => {
      await this.captureAndAnalyzeFrame(participant, track);
    }, this.config.frameInterval);

    this.frameIntervals.set(identity, interval);
  }

  /**
   * Stop capturing frames for a participant
   */
  private stopFrameCapture(identity: string): void {
    const interval = this.frameIntervals.get(identity);
    if (interval) {
      clearInterval(interval);
      this.frameIntervals.delete(identity);
      this.frameCounters.delete(identity);
    }
  }

  /**
   * Capture a frame from video track and run VLM inference
   */
  private async captureAndAnalyzeFrame(participant: RemoteParticipant, track: RemoteTrack): Promise<void> {
    try {
      const identity = participant.identity;
      const frameNumber = (this.frameCounters.get(identity) || 0) + 1;
      this.frameCounters.set(identity, frameNumber);

      // Extract frame as base64 image
      const frameBase64 = await this.extractFrameAsBase64(track);

      if (!frameBase64) {
        if (frameNumber === 1) {
          console.warn(`⚠️  [VLM] Frame extraction not available (browser APIs required)`);
        }
        return;
      }

      // Run VLM inference
      const inferenceResult = await this.openRouter.analyzeImage(frameBase64, this.config.vlmOptions);

      const result: VLMInferenceResult = {
        timestamp: Date.now(),
        participantIdentity: identity,
        content: inferenceResult.content,
        error: inferenceResult.error,
        frameNumber,
      };

      // Log result with clear formatting
      if (inferenceResult.success) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`👁️  [VLM VISION] Frame #${frameNumber} | ${identity} | ${new Date().toLocaleTimeString()}`);
        console.log(`${'='.repeat(80)}`);
        console.log(`${inferenceResult.content}`);
        console.log(`${'-'.repeat(80)}\n`);
      } else {
        console.error(`❌ [VLM] Error on frame #${frameNumber}: ${inferenceResult.error}`);
      }

      // Call callback if provided
      if (this.config.onInference) {
        this.config.onInference(result);
      }
    } catch (error) {
      console.error(`❌ [VLM] Error:`, error);
    }
  }

  /**
   * Extract a video frame as base64 encoded image
   * Note: This requires browser APIs (canvas). For server-side, we need a different approach.
   * We'll use a workaround with canvas package or skip implementation for Node.js environment.
   */
  private async extractFrameAsBase64(track: RemoteTrack): Promise<string | null> {
    try {
      // Check if we're in a browser environment
      if (typeof document === "undefined") {
        // Server-side: requires canvas library
        return null;
      }

      // Browser environment: use canvas
      const videoElement = track.attach() as HTMLVideoElement;

      // Wait for video to be ready
      await new Promise((resolve) => {
        if (videoElement.readyState >= 2) {
          resolve(true);
        } else {
          videoElement.onloadeddata = () => resolve(true);
        }
      });

      const canvas = document.createElement("canvas");
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return null;
      }

      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      const base64 = canvas.toDataURL("image/jpeg", 0.8);

      // Clean up
      track.detach(videoElement);

      return base64;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      roomName: this.config.roomName,
      connectedParticipants: Array.from(this.frameCounters.keys()),
      activeCaptures: this.frameIntervals.size,
    };
  }
}
