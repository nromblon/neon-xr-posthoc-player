import React, { useEffect, useRef } from 'react';

interface CircleConfig {
  stroke: number;
  radius: number;
  color: string;
}

interface VideoPlayerProps {
  gazeDataFile: File;
  videoFile: File;
  circleConfig: CircleConfig;
}

interface GazeDataPoint {
  sectionId: string;
  recordingId: string;
  timestampNs: number;
  gazeX: number;
  gazeY: number;
  worn: string;
  fixationId: number | null;
  blinkId: number | null;
  azimuthDeg: number;
  elevationDeg: number;
}
const defaultCircleConfig: CircleConfig = {
  stroke: 2,
  radius: 5,
  color: '#FF0000', // Default color
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  gazeDataFile,
  videoFile,
  circleConfig = defaultCircleConfig,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gazeDataRef = useRef<GazeDataPoint[]>([]);
  const gazeStartRef = useRef<number | null>(null);
  const gazeIndexRef = useRef(0);
  const gazeSourceSizeRef = useRef({ width: 1600, height: 1200 });
  const circleConfigRef = useRef(circleConfig);
  const drawFrameRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    circleConfigRef.current = circleConfig;
    drawFrameRef.current?.();
  }, [circleConfig]);

  useEffect(() => {
    const loadGazeData = async () => {
      const text = await gazeDataFile.text();
      const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const dataLines =
        lines[0]?.toLowerCase().includes('section id') ? lines.slice(1) : lines;
      const parseOptionalNumber = (value: string) => {
        if (value === '') return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const gazeData = dataLines
        .map((line) => {
          const cols = line.split(',').map((col) => col.trim());
          if (cols.length < 10) return null;
          const [
            sectionId,
            recordingId,
            timestampNs,
            gazeX,
            gazeY,
            worn,
            fixationId,
            blinkId,
            azimuthDeg,
            elevationDeg,
          ] = cols;
          const parsedTimestamp = Number(timestampNs);
          const parsedGazeX = Number(gazeX);
          const parsedGazeY = Number(gazeY);
          const parsedAzimuth = Number(azimuthDeg);
          const parsedElevation = Number(elevationDeg);
          if (
            !Number.isFinite(parsedTimestamp) ||
            !Number.isFinite(parsedGazeX) ||
            !Number.isFinite(parsedGazeY) ||
            !Number.isFinite(parsedAzimuth) ||
            !Number.isFinite(parsedElevation)
          ) {
            return null;
          }
          return {
            sectionId,
            recordingId,
            timestampNs: parsedTimestamp,
            gazeX: parsedGazeX,
            gazeY: parsedGazeY,
            worn,
            fixationId: parseOptionalNumber(fixationId),
            blinkId: parseOptionalNumber(blinkId),
            azimuthDeg: parsedAzimuth,
            elevationDeg: parsedElevation,
          };
        })
        .filter((point): point is GazeDataPoint => !!point);
      
      console.log('decoded gaze data:');
      console.log(gazeData);
      gazeData.sort((a, b) => a.timestampNs - b.timestampNs);
      gazeDataRef.current = gazeData;
      gazeStartRef.current = gazeData[0]?.timestampNs ?? null;
      gazeIndexRef.current = 0;
      gazeSourceSizeRef.current = { width: 1600, height: 1200 };
    };

    loadGazeData();
  }, [gazeDataFile]);

  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    if (videoRef.current) {
      videoRef.current.src = url;
    }
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoFile]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let rafId: number | null = null;

    const syncCanvasSize = () => {
      if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    };

    const drawFrame = () => {
      const gazeData = gazeDataRef.current;
      const gazeStart = gazeStartRef.current;
      if (!gazeData.length || gazeStart === null) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const videoTimeNs = gazeStart + video.currentTime * 1_000_000_000;
      let i = gazeIndexRef.current;
      while (i + 1 < gazeData.length && gazeData[i + 1].timestampNs <= videoTimeNs) {
        i += 1;
      }
      gazeIndexRef.current = i;

      const point = gazeData[i];
      const { width, height } = gazeSourceSizeRef.current;
      const scaleX = width > 0 ? canvas.width / width : 1;
      const scaleY = height > 0 ? canvas.height / height : 1;
      const scaledX = point.gazeX * scaleX;
      const scaledY = point.gazeY * scaleY;
      const currentConfig = circleConfigRef.current;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.beginPath();
      context.arc(
        scaledX,
        scaledY,
        currentConfig.radius,
        0,
        2 * Math.PI
      );
      context.strokeStyle = currentConfig.color;
      context.lineWidth = currentConfig.stroke;
      context.stroke();
    };
    drawFrameRef.current = drawFrame;

    const loop = () => {
      drawFrame();
      rafId = requestAnimationFrame(loop);
    };

    const handlePlay = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(loop);
      }
    };

    const handlePause = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const handleSeeked = () => {
      gazeIndexRef.current = 0;
      drawFrame();
    };

    video.addEventListener('loadedmetadata', syncCanvasSize);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handlePause);
    video.addEventListener('seeked', handleSeeked);

    syncCanvasSize();

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      video.removeEventListener('loadedmetadata', syncCanvasSize);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handlePause);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <video ref={videoRef} controls />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      />
    </div>
  );
};

export default VideoPlayer;
