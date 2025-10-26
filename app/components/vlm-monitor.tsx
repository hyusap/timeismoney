"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant } from "livekit-client";

interface VLMMonitorProps {
  roomName: string;
  walletAddress?: string; // Wallet address of the streamer
  // Configuration parameters
  chunkTimeMinutes?: number; // Duration of each chunk in minutes (triggers auto-summary)
  sampleRateSeconds?: number; // How often to capture frames (in seconds)
  samplingPrompt?: string; // Prompt for individual frame analysis
  mainTaskPrompt?: string; // Main task/goal being tracked
}

interface VLMConfig {
  chunkTimeMinutes: number;
  sampleRateSeconds: number;
  samplingPrompt: string;
  mainTaskPrompt: string;
}

interface FrameMemory {
  frameNumber: number;
  timestamp: number;
  image: string; // base64
  description: string;
  participantIdentity: string;
}

interface BatchSummary {
  batchNumber: number;
  summary: string;
  frameRange: string;
  timestamp: number;
}

export function VLMMonitor({
  roomName,
  walletAddress,
  chunkTimeMinutes = 1, // Default: 2 minutes per chunk
  sampleRateSeconds = 5, // Default: capture every 5 seconds
  samplingPrompt = "What do you see in this image? Provide a detailed concise description",
  mainTaskPrompt = "Did the person close the cap on their marker",
}: VLMMonitorProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [watching, setWatching] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<string>("");
  const [frameCount, setFrameCount] = useState(0);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [chunkSummary, setChunkSummary] = useState<string>("");
  const [taskCompleted, setTaskCompleted] = useState<boolean | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(chunkTimeMinutes * 60);

  const roomRef = useRef<Room | null>(null);
  const intervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const frameCountersRef = useRef<Map<string, number>>(new Map());

  // Memory storage
  const currentChunkFramesRef = useRef<FrameMemory[]>([]);
  const chunkStartTimeRef = useRef<number>(Date.now());
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const config: VLMConfig = {
    chunkTimeMinutes,
    sampleRateSeconds,
    samplingPrompt,
    mainTaskPrompt,
  };

  // Chunk timer countdown
  useEffect(() => {
    if (!isConnected) return;

    countdownTimerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          return config.chunkTimeMinutes * 60; // Reset
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [isConnected, config.chunkTimeMinutes]);

  // Auto-trigger chunk summary
  useEffect(() => {
    if (!isConnected) return;

    const triggerChunkSummary = () => {
      console.log(`⏰ [VLM] Chunk time reached (${config.chunkTimeMinutes} minutes)`);
      generateChunkSummary();
    };

    // Set timer for chunk duration
    chunkTimerRef.current = setInterval(
      triggerChunkSummary,
      config.chunkTimeMinutes * 60 * 1000
    );

    return () => {
      if (chunkTimerRef.current) {
        clearInterval(chunkTimerRef.current);
      }
    };
  }, [isConnected, config.chunkTimeMinutes]);

  useEffect(() => {
    if (!roomName) {
      console.log("⚠️  [VLM] No room name provided, skipping connection");
      return;
    }

    const connectToRoom = async () => {
      try {
        console.log("🔌 [VLM] Connecting to room:", roomName);

        // Get token for VLM bot
        const response = await fetch("/api/join_stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_name: roomName,
            identity: `vlm-bot-${Date.now()}`,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ [VLM] Failed to get token:", errorText);
          return;
        }

        const data = await response.json();

        // Extract from connection_details
        const wsUrl = data.connection_details?.ws_url;
        const livekitToken = data.connection_details?.token;

        if (!wsUrl || !livekitToken) {
          console.error("❌ [VLM] Missing connection details:", data);
          return;
        }

        const room = new Room();
        roomRef.current = room;

        // Connect to room
        await room.connect(wsUrl, livekitToken);
        setIsConnected(true);
        console.log("🤖 [VLM] Connected to room:", roomName);

        // Set up event listeners
        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
          if (track.kind === Track.Kind.Video) {
            console.log("📹 [VLM] Now watching:", participant.identity);
            setWatching((prev) => [...new Set([...prev, participant.identity])]);
            startFrameCapture(participant, track);
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
          if (track.kind === Track.Kind.Video) {
            stopFrameCapture(participant.identity);
            setWatching((prev) => prev.filter((id) => id !== participant.identity));
          }
        });

        room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
          participant.videoTrackPublications.forEach((publication) => {
            if (publication.track) {
              console.log("📹 [VLM] Now watching:", participant.identity);
              setWatching((prev) => [...new Set([...prev, participant.identity])]);
              startFrameCapture(participant, publication.track as RemoteTrack);
            }
          });
        });

        // Process existing participants
        room.remoteParticipants.forEach((participant) => {
          participant.videoTrackPublications.forEach((publication) => {
            if (publication.track) {
              console.log("📹 [VLM] Now watching:", participant.identity);
              setWatching((prev) => [...new Set([...prev, participant.identity])]);
              startFrameCapture(participant, publication.track as RemoteTrack);
            }
          });
        });
      } catch (error) {
        console.error("❌ [VLM] Failed to connect:", error);
      }
    };

    connectToRoom();

    return () => {
      // Cleanup
      intervalsRef.current.forEach((interval) => clearInterval(interval));
      intervalsRef.current.clear();
      frameCountersRef.current.clear();
      if (roomRef.current) {
        roomRef.current.disconnect();
        console.log("🛑 [VLM] Disconnected from room");
      }
    };
  }, [roomName]);

  const startFrameCapture = (participant: RemoteParticipant, track: RemoteTrack) => {
    const identity = participant.identity;

    // Stop existing if any
    stopFrameCapture(identity);

    // Initialize counter
    frameCountersRef.current.set(identity, 0);

    // Use configured sample rate
    const interval = setInterval(async () => {
      await captureAndAnalyze(participant, track);
    }, config.sampleRateSeconds * 1000);

    intervalsRef.current.set(identity, interval);
  };

  const stopFrameCapture = (identity: string) => {
    const interval = intervalsRef.current.get(identity);
    if (interval) {
      clearInterval(interval);
      intervalsRef.current.delete(identity);
      frameCountersRef.current.delete(identity);
    }
  };

  const captureAndAnalyze = async (participant: RemoteParticipant, track: RemoteTrack) => {
    try {
      const identity = participant.identity;
      const frameNumber = (frameCountersRef.current.get(identity) || 0) + 1;
      frameCountersRef.current.set(identity, frameNumber);

      // Extract frame
      const frameBase64 = await extractFrame(track);
      if (!frameBase64) return;

      // Send to OpenRouter API with configured sampling prompt
      const response = await fetch("/api/vlm-worker/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: frameBase64,
          prompt: config.samplingPrompt,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`\n${"=".repeat(80)}`);
        console.log(`👁️  [VLM VISION] Frame #${frameNumber} | ${identity} | ${timestamp}`);
        console.log(`${"=".repeat(80)}`);
        console.log(result.content);
        console.log(`${"-".repeat(80)}\n`);

        setLastResult(result.content);
        setFrameCount(frameNumber);

        // Store in chunk memory
        const frameMemory: FrameMemory = {
          frameNumber,
          timestamp: Date.now(),
          image: frameBase64,
          description: result.content,
          participantIdentity: identity,
        };

        currentChunkFramesRef.current.push(frameMemory);
      } else {
        console.error(`❌ [VLM] Error:`, result.error);
      }
    } catch (error) {
      console.error("❌ [VLM] Error:", error);
    }
  };

  const extractFrame = async (track: RemoteTrack): Promise<string | null> => {
    try {
      const videoElement = track.attach() as HTMLVideoElement;

      // Wait for video ready
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
      if (!ctx) return null;

      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL("image/jpeg", 0.8);

      track.detach(videoElement);
      return base64;
    } catch (error) {
      return null;
    }
  };

  const generateChunkSummary = async () => {
    if (currentChunkFramesRef.current.length === 0) {
      console.log("⚠️  [VLM] No frames captured in this chunk");
      return;
    }

    setIsGeneratingSummary(true);

    try {
      const allFrames = currentChunkFramesRef.current;
      const totalFrames = allFrames.length;

      console.log(`📊 [VLM] Generating chunk summary for ${totalFrames} frames`);

      // Step 1: Generate batch summaries (10 images each)
      const batchSummaries: BatchSummary[] = [];
      const IMAGES_PER_BATCH = 10;
      const numBatches = Math.ceil(totalFrames / IMAGES_PER_BATCH);

      for (let i = 0; i < numBatches; i++) {
        const startIdx = i * IMAGES_PER_BATCH;
        const endIdx = Math.min(startIdx + IMAGES_PER_BATCH, totalFrames);
        const batchFrames = allFrames.slice(startIdx, endIdx);

        console.log(`  📦 [VLM] Processing batch ${i + 1}/${numBatches} (${batchFrames.length} images)`);

        // Call batch summary API
        const response = await fetch("/api/vlm-worker/batch-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            images: batchFrames.map((f) => ({
              image: f.image,
              description: f.description,
              frameNumber: f.frameNumber,
            })),
            mainTaskPrompt: config.mainTaskPrompt,
          }),
        });

        const result = await response.json();

        if (result.success) {
          batchSummaries.push({
            batchNumber: i + 1,
            summary: result.summary,
            frameRange: `${batchFrames[0].frameNumber}-${batchFrames[batchFrames.length - 1].frameNumber}`,
            timestamp: Date.now(),
          });
          console.log(`  ✅ [VLM] Batch ${i + 1} summary generated`);
        } else {
          console.error(`  ❌ [VLM] Batch ${i + 1} failed:`, result.error);
        }
      }

      // Step 2: Sample 7 images evenly throughout chunk
      const sampleImages: FrameMemory[] = [];
      const step = Math.max(1, Math.floor(totalFrames / 7));
      for (let i = 0; i < 7 && i * step < totalFrames; i++) {
        sampleImages.push(allFrames[i * step]);
      }

      console.log(`📊 [VLM] Generating final chunk summary with ${sampleImages.length} sampled images and ${batchSummaries.length} batch summaries`);

      // Step 3: Final summary with completion detection
      const finalResponse = await fetch("/api/vlm-worker/chunk-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sampleImages: sampleImages.map((f) => ({
            image: f.image,
            description: f.description,
            frameNumber: f.frameNumber,
          })),
          batchSummaries: batchSummaries.map((b) => ({
            batchNumber: b.batchNumber,
            summary: b.summary,
            frameRange: b.frameRange,
          })),
          mainTaskPrompt: config.mainTaskPrompt,
          chunkDuration: config.chunkTimeMinutes,
          walletAddress: walletAddress,
          roomName: roomName,
        }),
      });

      const finalResult = await finalResponse.json();

      if (finalResult.success) {
        setChunkSummary(finalResult.summary);
        setTaskCompleted(finalResult.taskCompleted);

        console.log(`\n${"=".repeat(80)}`);
        console.log(`📊 [CHUNK SUMMARY] (${config.chunkTimeMinutes} min chunk)`);
        console.log(`${"=".repeat(80)}`);
        console.log(finalResult.summary);
        console.log(`\n✅ Task Completed: ${finalResult.taskCompleted ? "YES" : "NO"}`);
        console.log(`${"-".repeat(80)}\n`);
      } else {
        console.error("❌ [VLM] Failed to generate chunk summary:", finalResult.error);
      }

      // Reset chunk memory
      currentChunkFramesRef.current = [];
      chunkStartTimeRef.current = Date.now();
      setTimeRemaining(config.chunkTimeMinutes * 60);
    } catch (error) {
      console.error("❌ [VLM] Error generating chunk summary:", error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg max-w-md shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
        <h3 className="font-semibold">VLM Monitor</h3>
      </div>

      <div className="text-sm space-y-1 mb-3">
        <p>Room: {roomName}</p>
        <p>Watching: {watching.length > 0 ? watching.join(", ") : "None"}</p>
        <p>Frames captured: {currentChunkFramesRef.current.length}</p>
        <p className="text-xs text-gray-400">Sample rate: every {config.sampleRateSeconds}s</p>
        <p className="text-xs text-yellow-400">Next auto-summary: {formatTime(timeRemaining)}</p>
      </div>

      <div className="text-xs bg-blue-900/30 p-2 rounded mb-3 border border-blue-500/30">
        <p className="text-blue-300 font-semibold mb-1">Task:</p>
        <p className="text-gray-300">{config.mainTaskPrompt}</p>
      </div>

      <button
        onClick={generateChunkSummary}
        disabled={isGeneratingSummary || currentChunkFramesRef.current.length === 0}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-3 rounded transition duration-200 mb-3"
      >
        {isGeneratingSummary ? "Generating..." : "📊 Generate Chunk Summary Now"}
      </button>

      {taskCompleted !== null && (
        <div className={`text-xs p-3 rounded mb-3 border ${
          taskCompleted
            ? "bg-green-900/50 border-green-500/30"
            : "bg-orange-900/50 border-orange-500/30"
        }`}>
          <p className={`font-semibold mb-1 ${
            taskCompleted ? "text-green-300" : "text-orange-300"
          }`}>
            Task Status: {taskCompleted ? "✅ COMPLETED" : "⏳ IN PROGRESS"}
          </p>
        </div>
      )}

      {chunkSummary && (
        <div className="text-xs bg-purple-900/50 p-3 rounded mb-3 border border-purple-500/30">
          <p className="text-purple-300 font-semibold mb-1">Latest Chunk Summary:</p>
          <p className="text-gray-200 max-h-40 overflow-y-auto">{chunkSummary}</p>
        </div>
      )}

      {lastResult && (
        <div className="text-xs bg-gray-900 p-2 rounded max-h-32 overflow-y-auto">
          <p className="text-gray-400 mb-1">Latest Frame:</p>
          <p>{lastResult}</p>
        </div>
      )}
    </div>
  );
}
