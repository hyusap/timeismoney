"use client";

import { useEffect, useState } from "react";

export default function CameraFeed({ url, index }: { url: string; index: number }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full flex justify-center items-center bg-black overflow-hidden">
      {/* Main video feed */}
      <img
        src={url}
        alt="Live feed"
        className="max-w-full max-h-full object-contain"
        style={{
          filter: "contrast(1.1) brightness(0.95)",
        }}
      />

      {/* Scan line effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.15) 0px, transparent 1px, transparent 2px, rgba(0, 0, 0, 0.15) 3px)",
          animation: "scan 8s linear infinite",
        }}
      />

      {/* Vignette effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      {/* Noise overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Corner timestamp */}
      <div className="absolute top-2 left-2 text-white font-mono text-xs bg-black/70 px-2 py-1 border border-white/20">
        {time.toLocaleString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })}
      </div>

      {/* Camera label */}
      <div className="absolute bottom-2 left-2 text-white font-mono text-xs bg-black/70 px-2 py-1 border border-white/20">
        CAM {String(index + 1).padStart(2, "0")}
      </div>

      {/* Recording indicator (active) */}
      <div className="absolute top-2 right-2 flex items-center space-x-1 bg-black/70 px-2 py-1 border border-red-600/30">
        <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
        <span className="text-red-600 font-mono text-xs font-bold">REC</span>
      </div>

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
  );
}
