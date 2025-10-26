"use client";

import { useState, useRef, useEffect } from "react";

interface RadialSelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  unit?: string;
  description?: string;
}

export function RadialSelector({
  value,
  onChange,
  min = 1,
  max = 12,
  label = "Duration",
  unit = "hours",
  description,
}: RadialSelectorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);

  // Calculate angle based on value (0 degrees = top)
  const getAngleFromValue = (val: number) => {
    const range = max - min;
    const percentage = (val - min) / range;
    // Full circle (0 to 360 degrees)
    return percentage * 360;
  };

  // Calculate value from angle
  const getValueFromAngle = (angle: number) => {
    // Normalize angle to 0-360
    const normalizedAngle = ((angle % 360) + 360) % 360;
    const range = max - min;
    const percentage = normalizedAngle / 360;
    const newValue = Math.round(min + percentage * range);
    return Math.max(min, Math.min(max, newValue));
  };

  // Calculate angle from mouse position
  const getAngleFromEvent = (e: MouseEvent | TouchEvent) => {
    if (!knobRef.current) return 0;

    const rect = knobRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;

    // Calculate angle in degrees (0 = top)
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    angle = angle + 90; // Adjust so 0 is at top
    if (angle < 0) angle += 360;

    return angle;
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const angle = getAngleFromEvent(e);
    const newValue = getValueFromAngle(angle);
    onChange(newValue);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      const handleMove = (e: MouseEvent | TouchEvent) => handleMouseMove(e);
      const handleUp = () => handleMouseUp();

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
      document.addEventListener("touchmove", handleMove);
      document.addEventListener("touchend", handleUp);

      return () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
        document.removeEventListener("touchmove", handleMove);
        document.removeEventListener("touchend", handleUp);
      };
    }
  }, [isDragging]);

  const angle = getAngleFromValue(value);

  // Calculate dot position on the circle - positioned at border of knob
  const dotRadius = 70; // Distance from center to edge of knob (160px diameter / 2 - small offset)
  const angleRad = ((angle - 90) * Math.PI) / 180; // Convert to radians, adjust for 0° at top
  const dotX = dotRadius * Math.cos(angleRad);
  const dotY = dotRadius * Math.sin(angleRad);

  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-gray-700 text-center font-semibold">
          {label}
        </label>
      )}

      <div className="flex justify-center">
        <div className="relative" style={{ width: '280px', height: '280px' }}>
          {/* Hour readings OUTSIDE the knob */}
          {Array.from({ length: max - min + 1 }).map((_, i) => {
            const tickValue = min + i;
            const tickAngle = getAngleFromValue(tickValue);
            const tickAngleRad = ((tickAngle - 90) * Math.PI) / 180;
            const labelRadius = 120; // Distance from center for labels
            const labelX = labelRadius * Math.cos(tickAngleRad);
            const labelY = labelRadius * Math.sin(tickAngleRad);

            return (
              <div
                key={i}
                className="absolute text-sm text-gray-600 font-medium"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `translate(calc(-50% + ${labelX}px), calc(-50% + ${labelY}px))`,
                }}
              >
                {tickValue}
              </div>
            );
          })}

          {/* Neumorphic Knob - STICKING OUT prominently */}
          <div
            ref={knobRef}
            className="absolute rounded-full flex items-center justify-center cursor-pointer select-none transition-all duration-100"
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '160px',
              height: '160px',
              background: '#e0e5ec',
              boxShadow: `
                14px 14px 28px #b8bcc4,
                -14px -14px 28px #ffffff,
                inset 2px 2px 4px rgba(255, 255, 255, 0.5),
                inset -2px -2px 4px rgba(184, 188, 196, 0.2)
              `,
            }}
          >
            {/* Value display */}
            <div className="text-center z-10">
              <div className="text-3xl font-bold text-gray-700">{value}</div>
              <div className="text-xs text-gray-500 uppercase">{unit}</div>
            </div>

            {/* Dot indicator ON the knob border */}
            <div
              className="absolute w-3 h-3 rounded-full transition-all duration-100"
              style={{
                top: '50%',
                left: '50%',
                transform: `translate(calc(-50% + ${dotX}px), calc(-50% + ${dotY}px))`,
                background: '#6b7280',
                boxShadow: `
                  2px 2px 4px rgba(184, 188, 196, 0.8),
                  -1px -1px 2px rgba(255, 255, 255, 0.5)
                `,
              }}
            />
          </div>
        </div>
      </div>

      {description && (
        <p className="text-gray-600 text-sm text-center">{description}</p>
      )}
    </div>
  );
}
