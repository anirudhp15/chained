"use client";

import React from "react";

interface SimpleBeamsProps {
  beamWidth?: number;
  beamHeight?: number;
  beamNumber?: number;
  lightColor?: string;
  speed?: number;
  noiseIntensity?: number;
  scale?: number;
  rotation?: number;
}

const SimpleBeams: React.FC<SimpleBeamsProps> = ({
  beamNumber = 20,
  lightColor = "#8b5cf6",
  speed = 5,
  rotation = 20,
}) => {
  const beams = Array.from({ length: beamNumber }, (_, i) => i);

  return (
    <div className="absolute inset-0 overflow-hidden opacity-30">
      <div
        className="absolute inset-0"
        style={{
          transform: `rotate(${rotation}deg)`,
          background: `linear-gradient(90deg, transparent 0%, ${lightColor}22 20%, transparent 40%, ${lightColor}11 60%, transparent 80%, ${lightColor}22 100%)`,
          animation: `beam-slide ${30 / speed}s linear infinite`,
        }}
      >
        {beams.map((beam) => (
          <div
            key={beam}
            className="absolute h-full opacity-60"
            style={{
              left: `${(beam / beamNumber) * 100}%`,
              width: "2px",
              background: `linear-gradient(to bottom, transparent 0%, ${lightColor} 20%, ${lightColor} 80%, transparent 100%)`,
              animation: `beam-glow ${2 + (beam % 3)}s ease-in-out infinite alternate`,
              animationDelay: `${beam * 0.1}s`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes beam-slide {
          0% {
            transform: translateX(-100%) rotate(${rotation}deg);
          }
          100% {
            transform: translateX(100vw) rotate(${rotation}deg);
          }
        }

        @keyframes beam-glow {
          0% {
            opacity: 0.3;
            filter: blur(0px);
          }
          100% {
            opacity: 0.8;
            filter: blur(1px);
          }
        }
      `}</style>
    </div>
  );
};

export default SimpleBeams;
