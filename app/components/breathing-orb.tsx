"use client";

interface BreathingOrbProps {
  size?: "sm" | "md" | "lg" | "xl";
}

export function BreathingOrb({ size = "lg" }: BreathingOrbProps) {
  const sizeClasses = {
    sm: "w-32 h-32",
    md: "w-48 h-48",
    lg: "w-64 h-64",
    xl: "w-96 h-96",
  };

  return (
    <div
      className={`${sizeClasses[size]} relative flex items-center justify-center`}
    >
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse" />

      {/* Mid glow */}
      <div
        className="absolute inset-[25%] rounded-full bg-red-500/30 animate-ping"
        style={{ animationDuration: "3s" }}
      />

      {/* Main orb */}
      <div
        className="absolute inset-[40%] rounded-full bg-red-500 animate-pulse"
        style={{ animationDuration: "2s" }}
      />

      {/* Inner core */}
      <div className="absolute inset-[55%] rounded-full bg-red-600/80" />
    </div>
  );
}
