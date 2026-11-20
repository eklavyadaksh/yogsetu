import React, { useEffect, useRef } from 'react';
import { LandmarkPoint } from '../lib/angles';

interface SkeletonOverlayProps {
  landmarks: LandmarkPoint[] | null;
  width: number;
  height: number;
  isCorrect: boolean;
}

// MediaPipe Pose Connections
const POSE_CONNECTIONS: [number, number][] = [
  // Upper body
  [11, 12], // shoulders
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  // Torso
  [11, 23], [12, 24], [23, 24], // shoulders to hips
  // Lower body
  [23, 25], [25, 27], [27, 29], [27, 31], // left leg
  [24, 26], [26, 28], [28, 30], [28, 32], // right leg
];

export const SkeletonOverlay: React.FC<SkeletonOverlayProps> = ({
  landmarks,
  width,
  height,
  isCorrect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (!landmarks || landmarks.length < 33) return;

    const strokeColor = isCorrect ? '#10B981' : '#F59E0B';
    const jointColor = isCorrect ? '#34D399' : '#FBBF24';

    // 1. Draw connecting lines
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = strokeColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const [startIndex, endIndex] of POSE_CONNECTIONS) {
      const start = landmarks[startIndex];
      const end = landmarks[endIndex];
      if (!start || !end) continue;
      if ((start.visibility || 1) < 0.3 || (end.visibility || 1) < 0.3) continue;

      ctx.beginPath();
      // Mirror X if using front webcam
      ctx.moveTo(start.x * width, start.y * height);
      ctx.lineTo(end.x * width, end.y * height);
      ctx.stroke();
    }

    // 2. Draw joint dots
    for (let i = 11; i <= 32; i++) {
      const pt = landmarks[i];
      if (!pt || (pt.visibility || 1) < 0.3) continue;

      ctx.beginPath();
      ctx.arc(pt.x * width, pt.y * height, 4.5, 0, 2 * Math.PI);
      ctx.fillStyle = jointColor;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
    }
  }, [landmarks, width, height, isCorrect]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none w-full h-full object-cover"
    />
  );
};
