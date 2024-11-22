"use client"
import React from 'react';
import { useEffect, useRef } from "react";

interface DotMatrixOverlayProps {
  dotSize?: number; // Size of each dot in pixels
  dotSpacing?: number; // Spacing between dots in pixels
  dotColor?: string; // Color of the dots
}

const DotMatrixBackground: React.FC<DotMatrixOverlayProps> = ({
 dotSize = 1,
 dotSpacing = 20,
 dotColor = "#d2d2d2",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawDots();
    };

    const drawDots = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = dotColor;

      for (let y = 0; y < canvas.height; y += dotSpacing) {
        for (let x = 0; x < canvas.width; x += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    // Initial setup
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Cleanup on unmount
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [dotSize, dotSpacing, dotColor]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[-1]" // Tailwind classes for positioning
    />
  );
};

export default DotMatrixBackground;
