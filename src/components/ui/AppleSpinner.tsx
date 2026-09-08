import React from "react";

interface AppleSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-7 h-7",
  xl: "w-10 h-10",
};

/**
 * Apple-style Cupertino 12-segment radial tick activity indicator.
 * Features the signature staggered opacity decay for authentic macOS/iOS feel.
 */
export function AppleSpinner({
  size = "md",
  className = "",
}: AppleSpinnerProps) {
  const sizeClass = sizeMap[size] || sizeMap.md;

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`relative inline-flex items-center justify-center shrink-0 ${sizeClass} ${className}`}
    >
      {[...Array(12)].map((_, i) => (
        <span
          key={i}
          className="absolute inset-0 flex justify-center origin-center"
          style={{
            transform: `rotate(${i * 30}deg)`,
          }}
        >
          <span
            className="w-[9%] h-[28%] rounded-full bg-current"
            style={{
              animation: "appleSpinnerFade 1s linear infinite",
              animationDelay: `${(i - 12) * 0.0833}s`,
            }}
          />
        </span>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
